import Papa from "papaparse"
import crypto from "crypto"
import { prisma } from "@/lib/db"
import { autoCategorize } from "./categorize"

type Row = Record<string, string | undefined>

const DATE_COLS = ["date", "date opération", "date_operation", "operation date", "booking date", "valeur"]
const LABEL_COLS = ["libellé", "libelle", "description", "label", "wording", "intitulé", "memo", "détails", "details", "narrative"]
const AMOUNT_COLS = ["montant", "amount", "valeur", "value"]
const DEBIT_COLS = ["débit", "debit"]
const CREDIT_COLS = ["crédit", "credit"]

function findCol(row: Row, candidates: string[]): string | null {
  const keys = Object.keys(row)
  for (const c of candidates) {
    const match = keys.find((k) => k.toLowerCase().trim() === c)
    if (match) return match
  }
  // partial match fallback
  for (const c of candidates) {
    const match = keys.find((k) => k.toLowerCase().includes(c))
    if (match) return match
  }
  return null
}

function parseEuro(value: string | undefined): number | null {
  if (!value) return null
  const cleaned = value.trim().replace(/\u00A0/g, "").replace(/\s/g, "")
  // Handle "1.234,56" (FR) and "1,234.56" (EN)
  let normalized = cleaned
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // Both — assume the rightmost is the decimal
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      normalized = cleaned.replace(/\./g, "").replace(",", ".")
    } else {
      normalized = cleaned.replace(/,/g, "")
    }
  } else if (cleaned.includes(",")) {
    normalized = cleaned.replace(",", ".")
  }
  const n = parseFloat(normalized.replace(/[^\d.\-]/g, ""))
  return isFinite(n) ? n : null
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null
  const v = value.trim()
  // ISO YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})/
  if (iso.test(v)) return new Date(v.slice(0, 10) + "T00:00:00Z")
  // FR DD/MM/YYYY
  const fr = /^(\d{2})\/(\d{2})\/(\d{4})/
  const m = v.match(fr)
  if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00Z`)
  // FR DD-MM-YYYY
  const fr2 = /^(\d{2})-(\d{2})-(\d{4})/
  const m2 = v.match(fr2)
  if (m2) return new Date(`${m2[3]}-${m2[2]}-${m2[1]}T00:00:00Z`)
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d
}

function dedupHash(input: {
  bankAccountId: string
  date: Date
  amount: number
  rawLabel: string
}) {
  return crypto
    .createHash("sha1")
    .update(
      `${input.bankAccountId}|${input.date.toISOString().slice(0, 10)}|${input.amount.toFixed(2)}|${input.rawLabel}`
    )
    .digest("hex")
}

export async function importCsv(opts: {
  organizationId: string
  bankAccountId: string
  csv: string
}) {
  // Auto-detect delimiter
  const parsed = Papa.parse<Row>(opts.csv, {
    header: true,
    skipEmptyLines: "greedy",
    delimiter: "",
    transformHeader: (h) => h.trim(),
  })
  if (parsed.errors.length && parsed.data.length === 0) {
    throw new Error("CSV invalide : " + parsed.errors[0].message)
  }
  const sample = parsed.data[0] || {}
  const dateCol = findCol(sample, DATE_COLS)
  const labelCol = findCol(sample, LABEL_COLS)
  const amountCol = findCol(sample, AMOUNT_COLS)
  const debitCol = findCol(sample, DEBIT_COLS)
  const creditCol = findCol(sample, CREDIT_COLS)

  if (!dateCol || !labelCol) {
    throw new Error(
      "Colonnes 'date' et 'libellé' introuvables. En-têtes détectés : " +
        Object.keys(sample).join(", ")
    )
  }
  if (!amountCol && !(debitCol && creditCol)) {
    throw new Error(
      "Colonne 'montant' (ou 'débit'+'crédit') introuvable. En-têtes : " +
        Object.keys(sample).join(", ")
    )
  }

  let inserted = 0
  let skipped = 0

  for (const row of parsed.data) {
    const date = parseDate(row[dateCol])
    const rawLabel = (row[labelCol] || "").trim()
    if (!date || !rawLabel) {
      skipped++
      continue
    }
    let amount: number | null = null
    if (amountCol) {
      amount = parseEuro(row[amountCol])
    } else if (debitCol && creditCol) {
      const d = parseEuro(row[debitCol]) || 0
      const c = parseEuro(row[creditCol]) || 0
      amount = c - d
    }
    if (amount == null) {
      skipped++
      continue
    }

    const counterparty = rawLabel.split(/[—–-]|REF:|REF\s|CARTE\s|VIR\s|PRLV\s/i)[0].trim().slice(0, 80)

    const providerTxId = dedupHash({
      bankAccountId: opts.bankAccountId,
      date,
      amount,
      rawLabel,
    })

    const exists = await prisma.bankTransaction.findFirst({
      where: { bankAccountId: opts.bankAccountId, providerTxId },
    })
    if (exists) {
      skipped++
      continue
    }

    // Try to auto-categorize from history + global dictionary
    const suggestion = await autoCategorize({
      organizationId: opts.organizationId,
      counterparty,
      rawLabel,
      amount,
    })

    await prisma.bankTransaction.create({
      data: {
        organizationId: opts.organizationId,
        bankAccountId: opts.bankAccountId,
        providerTxId,
        bookedAt: date,
        amount,
        counterparty,
        rawLabel,
        categoryId: suggestion?.categoryId,
        vatRate: suggestion?.vatRate ?? null,
        isReviewed: false,
      },
    })
    inserted++
  }

  // Recompute bank account balance
  const agg = await prisma.bankTransaction.aggregate({
    where: { bankAccountId: opts.bankAccountId },
    _sum: { amount: true },
  })
  await prisma.bankAccount.update({
    where: { id: opts.bankAccountId },
    data: { balance: agg._sum.amount || 0, lastSyncAt: new Date() },
  })

  return { inserted, skipped }
}
