import { prisma } from "@/lib/db"
import { round2, splitVat } from "@/lib/money"

/**
 * Generates (or refreshes) the double-entry ledger entry corresponding to a
 * reviewed bank transaction.
 *
 * Inflow (amount > 0):
 *   DEBIT  512000 (bank)               TTC
 *   CREDIT 706000/707000/...           HT
 *   CREDIT 445710 (VAT collected)      VAT
 *
 * Outflow (amount < 0):
 *   DEBIT  6xxxxx (expense)            HT
 *   DEBIT  445660 (VAT deductible)     VAT
 *   CREDIT 512000 (bank)               TTC
 */
export async function upsertEntryForTransaction(transactionId: string) {
  const tx = await prisma.bankTransaction.findUnique({
    where: { id: transactionId },
    include: {
      category: true,
      bankAccount: true,
    },
  })
  if (!tx) throw new Error("Transaction introuvable")
  if (!tx.category) throw new Error("Transaction sans catégorie")

  const orgId = tx.organizationId
  const direction: "IN" | "OUT" = tx.amount >= 0 ? "IN" : "OUT"
  const absAmount = Math.abs(tx.amount)
  const { ht, vat, ttc } = splitVat(absAmount, tx.vatRate)

  // Resolve accounts
  const bankAccount = await prisma.account.findUnique({
    where: {
      organizationId_code: {
        organizationId: orgId,
        code: tx.bankAccount.linkedPcgCode,
      },
    },
  })
  const pcgAccount = await prisma.account.findUnique({
    where: {
      organizationId_code: {
        organizationId: orgId,
        code: tx.category.defaultPcgCode,
      },
    },
  })
  if (!bankAccount || !pcgAccount) {
    throw new Error("Compte PCG manquant (lancer le bootstrap)")
  }
  let vatAccount = null
  if (vat > 0) {
    const vatCode = direction === "IN" ? "445710" : "445660"
    vatAccount = await prisma.account.findUnique({
      where: {
        organizationId_code: { organizationId: orgId, code: vatCode },
      },
    })
    if (!vatAccount) throw new Error(`Compte TVA manquant : ${vatCode}`)
  }

  // Fiscal year for entry date
  const fy = await prisma.fiscalYear.findFirst({
    where: {
      organizationId: orgId,
      startDate: { lte: tx.bookedAt },
      endDate: { gte: tx.bookedAt },
    },
  })
  if (!fy) throw new Error("Aucun exercice ouvert pour cette date")
  if (fy.status === "CLOSED") throw new Error("Exercice clôturé")

  // Journal : always "BQ" for bank-triggered entries in v1
  const journal = await prisma.journal.findUnique({
    where: { organizationId_code: { organizationId: orgId, code: "BQ" } },
  })
  if (!journal) throw new Error("Journal BQ manquant")

  // Determine next entry number
  const lastEntry = await prisma.journalEntry.findFirst({
    where: { journalId: journal.id, fiscalYearId: fy.id },
    orderBy: { entryNumber: "desc" },
  })
  const nextNumber = (lastEntry?.entryNumber || 0) + 1

  // Build lines
  const lines: Array<{
    accountId: string
    debit: number
    credit: number
    label: string
    vatCode?: string | null
  }> = []

  const label = `${tx.counterparty} — ${tx.category.label}`

  if (direction === "IN") {
    lines.push({ accountId: bankAccount.id, debit: round2(ttc), credit: 0, label })
    lines.push({ accountId: pcgAccount.id, debit: 0, credit: round2(ht), label })
    if (vatAccount && vat > 0) {
      lines.push({
        accountId: vatAccount.id,
        debit: 0,
        credit: round2(vat),
        label,
        vatCode: tx.vatRate ? `TVA${tx.vatRate}` : null,
      })
    }
  } else {
    lines.push({ accountId: pcgAccount.id, debit: round2(ht), credit: 0, label })
    if (vatAccount && vat > 0) {
      lines.push({
        accountId: vatAccount.id,
        debit: round2(vat),
        credit: 0,
        label,
        vatCode: tx.vatRate ? `TVA${tx.vatRate}` : null,
      })
    }
    lines.push({ accountId: bankAccount.id, debit: 0, credit: round2(ttc), label })
  }

  // Sanity: balance check (abs difference < 1 cent)
  const totalDebit = lines.reduce((s, l) => s + l.debit, 0)
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0)
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `Entrée non équilibrée: ${totalDebit.toFixed(2)} != ${totalCredit.toFixed(2)}`
    )
  }

  // Upsert: delete the previous linked entry if any
  const existing = await prisma.journalEntry.findUnique({
    where: { sourceTxId: tx.id },
  })
  if (existing) {
    if (existing.isLocked) {
      throw new Error("Écriture verrouillée — exercice clôturé")
    }
    await prisma.journalEntry.delete({ where: { id: existing.id } })
  }

  // Create fresh entry
  await prisma.$transaction(async (db) => {
    const entry = await db.journalEntry.create({
      data: {
        fiscalYearId: fy.id,
        journalId: journal.id,
        entryDate: tx.bookedAt,
        entryNumber: nextNumber,
        label,
        sourceTxId: tx.id,
      },
    })
    for (const l of lines) {
      await db.journalLine.create({
        data: {
          entryId: entry.id,
          accountId: l.accountId,
          debit: l.debit,
          credit: l.credit,
          label: l.label,
          vatCode: l.vatCode,
        },
      })
    }
    // Update transaction VAT amount snapshot
    await db.bankTransaction.update({
      where: { id: tx.id },
      data: { vatAmount: round2(vat) },
    })
  })
}
