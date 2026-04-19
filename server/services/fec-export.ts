import { prisma } from "@/lib/db"

/**
 * Generate a FEC (Fichier des Écritures Comptables) — DGFiP BOI-CF-IOR-60-40-20
 * 18-column tab-delimited, UTF-8.
 */
export async function generateFec(organizationId: string) {
  const fy = await prisma.fiscalYear.findFirst({
    where: { organizationId, status: "OPEN" },
    orderBy: { startDate: "desc" },
  })
  if (!fy) throw new Error("Aucun exercice ouvert")

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  })
  const entries = await prisma.journalEntry.findMany({
    where: { fiscalYearId: fy.id },
    include: {
      lines: { include: { account: true } },
      journal: true,
    },
    orderBy: { entryDate: "asc" },
  })

  const HEADERS = [
    "JournalCode",
    "JournalLib",
    "EcritureNum",
    "EcritureDate",
    "CompteNum",
    "CompteLib",
    "CompAuxNum",
    "CompAuxLib",
    "PieceRef",
    "PieceDate",
    "EcritureLib",
    "Debit",
    "Credit",
    "EcritureLet",
    "DateLet",
    "ValidDate",
    "Montantdevise",
    "Idevise",
  ]

  const rows: string[] = [HEADERS.join("\t")]

  const d = (date: Date) => date.toISOString().slice(0, 10).replace(/-/g, "")
  const n = (v: number) => (Math.round(v * 100) / 100).toFixed(2).replace(".", ",")

  for (const e of entries) {
    for (const l of e.lines) {
      rows.push(
        [
          e.journal.code,
          e.journal.label,
          `${e.journal.code}${String(e.entryNumber).padStart(6, "0")}`,
          d(e.entryDate),
          l.account.code,
          l.account.label.replace(/\t/g, " "),
          "", // CompAuxNum
          "", // CompAuxLib
          e.sourceTxId?.slice(0, 12) || e.id.slice(0, 12),
          d(e.entryDate),
          l.label.replace(/\t/g, " "),
          n(l.debit),
          n(l.credit),
          "", // EcritureLet
          "", // DateLet
          d(e.createdAt),
          "", // Montantdevise
          "", // Idevise
        ].join("\t")
      )
    }
  }

  const content = rows.join("\r\n") + "\r\n"
  const siren = (org?.siret || "OPENINDY").slice(0, 9).padEnd(9, "0")
  const fyEnd = d(fy.endDate)
  const filename = `FEC_${siren}FEC${fyEnd}.txt`
  return { content, filename }
}

export async function generateGrandLivre(organizationId: string) {
  const fy = await prisma.fiscalYear.findFirst({
    where: { organizationId, status: "OPEN" },
    orderBy: { startDate: "desc" },
  })
  if (!fy) throw new Error("Aucun exercice ouvert")

  const accounts = await prisma.account.findMany({
    where: { organizationId },
    orderBy: { code: "asc" },
    include: {
      lines: {
        include: { entry: true },
        orderBy: { entry: { entryDate: "asc" } },
      },
    },
  })

  const rows: string[] = [
    ["Compte", "Libellé", "Date", "Écriture", "Débit", "Crédit", "Solde"].join(
      ";"
    ),
  ]

  for (const acc of accounts) {
    const entries = acc.lines.filter(
      (l) => l.entry.fiscalYearId === fy.id
    )
    if (entries.length === 0) continue
    let solde = 0
    for (const l of entries) {
      solde += l.debit - l.credit
      rows.push(
        [
          acc.code,
          `"${acc.label.replace(/"/g, '""')}"`,
          l.entry.entryDate.toISOString().slice(0, 10),
          `"${l.label.replace(/"/g, '""')}"`,
          l.debit.toFixed(2).replace(".", ","),
          l.credit.toFixed(2).replace(".", ","),
          solde.toFixed(2).replace(".", ","),
        ].join(";")
      )
    }
  }

  const content = rows.join("\r\n") + "\r\n"
  const filename = `Grand-livre_${new Date().toISOString().slice(0, 10)}.csv`
  return { content, filename }
}
