import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"
import { bootstrapOrganization } from "@/server/services/bootstrap"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  organizationName: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Données invalides (mot de passe >= 8 caractères)" },
      { status: 400 }
    )
  }
  const { email, password, name, organizationName } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { message: "Un compte existe déjà avec cet email" },
      { status: 409 }
    )
  }

  const passwordHash = await hash(password, 10)
  const user = await prisma.user.create({
    data: { email, name, passwordHash },
  })

  const org = await prisma.organization.create({
    data: { name: organizationName },
  })

  await prisma.membership.create({
    data: { userId: user.id, organizationId: org.id, role: "OWNER" },
  })

  await bootstrapOrganization(org.id)

  const session = await getSession()
  session.userId = user.id
  session.organizationId = org.id
  await session.save()

  return NextResponse.json({ ok: true })
}
