import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { requireUser } from "@/lib/auth"
import { upsertEntryForTransaction } from "@/server/services/accounting"

const schema = z.object({
  categoryId: z.string().nullable().optional(),
  vatRate: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  isReviewed: z.boolean().optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { organization } = await requireUser()
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ message: "Données invalides" }, { status: 400 })
  }

  const tx = await prisma.bankTransaction.findFirst({
    where: { id: params.id, organizationId: organization.id },
  })
  if (!tx) return NextResponse.json({ message: "Introuvable" }, { status: 404 })

  const updated = await prisma.bankTransaction.update({
    where: { id: tx.id },
    data: parsed.data,
  })

  // If validated, generate/refresh the accounting entry
  if (updated.isReviewed && updated.categoryId) {
    try {
      await upsertEntryForTransaction(updated.id)
    } catch (e) {
      console.error("accounting error", e)
    }
  }

  return NextResponse.json({ ok: true, transaction: updated })
}
