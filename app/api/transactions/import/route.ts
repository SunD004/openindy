import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth"
import { importCsv } from "@/server/services/csv-import"

export async function POST(req: NextRequest) {
  const { organization } = await requireUser()

  const form = await req.formData()
  const file = form.get("file") as File | null
  const bankAccountId = form.get("bankAccountId") as string | null

  if (!file || !bankAccountId) {
    return NextResponse.json(
      { message: "Fichier ou compte manquant" },
      { status: 400 }
    )
  }

  try {
    const text = await file.text()
    const { inserted, skipped } = await importCsv({
      organizationId: organization.id,
      bankAccountId,
      csv: text,
    })
    return NextResponse.json({ ok: true, inserted, skipped })
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Import impossible — format CSV non reconnu"
    return NextResponse.json({ message }, { status: 400 })
  }
}
