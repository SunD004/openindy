import { NextRequest, NextResponse } from "next/server"
import { compare } from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { getSession } from "@/lib/auth"

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: "Données invalides" }, { status: 400 })
  }
  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: true },
  })
  if (!user) {
    return NextResponse.json({ message: "Identifiants invalides" }, { status: 401 })
  }
  const ok = await compare(password, user.passwordHash)
  if (!ok) {
    return NextResponse.json({ message: "Identifiants invalides" }, { status: 401 })
  }

  const session = await getSession()
  session.userId = user.id
  session.organizationId = user.memberships[0]?.organizationId
  await session.save()

  return NextResponse.json({ ok: true })
}
