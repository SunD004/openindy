import { prisma } from "@/lib/db"

/**
 * PCG minimal — classes 1, 2, 4, 5, 6, 7.
 * Mirrors prisma/seed.ts so signups get a usable chart of accounts.
 */
const PCG_ACCOUNTS: Array<{ code: string; label: string; classNum: number }> = [
  { code: "101000", label: "Capital", classNum: 1 },
  { code: "108000", label: "Compte de l'exploitant", classNum: 1 },
  { code: "213000", label: "Constructions", classNum: 2 },
  { code: "215400", label: "Matériel industriel", classNum: 2 },
  { code: "218300", label: "Matériel de bureau et informatique", classNum: 2 },
  { code: "401000", label: "Fournisseurs", classNum: 4 },
  { code: "411000", label: "Clients", classNum: 4 },
  { code: "445660", label: "TVA déductible sur autres biens et services", classNum: 4 },
  { code: "445710", label: "TVA collectée", classNum: 4 },
  { code: "447000", label: "Autres impôts, taxes et versements assimilés", classNum: 4 },
  { code: "512000", label: "Banques", classNum: 5 },
  { code: "530000", label: "Caisse", classNum: 5 },
  { code: "580000", label: "Virements internes", classNum: 5 },
  { code: "606100", label: "Fournitures non stockables (eau, énergie)", classNum: 6 },
  { code: "606300", label: "Fournitures d'entretien et de petit équipement", classNum: 6 },
  { code: "606400", label: "Fournitures administratives", classNum: 6 },
  { code: "613200", label: "Locations immobilières", classNum: 6 },
  { code: "615500", label: "Entretien et réparations", classNum: 6 },
  { code: "616000", label: "Primes d'assurances", classNum: 6 },
  { code: "621000", label: "Personnel extérieur à l'entreprise", classNum: 6 },
  { code: "622600", label: "Honoraires", classNum: 6 },
  { code: "623000", label: "Publicité, publications", classNum: 6 },
  { code: "625100", label: "Voyages et déplacements", classNum: 6 },
  { code: "625600", label: "Missions et réceptions", classNum: 6 },
  { code: "626100", label: "Frais postaux et de télécommunications", classNum: 6 },
  { code: "627000", label: "Services bancaires et assimilés", classNum: 6 },
  { code: "635100", label: "Contribution économique territoriale", classNum: 6 },
  { code: "641000", label: "Rémunérations du personnel", classNum: 6 },
  { code: "645100", label: "Cotisations à l'URSSAF", classNum: 6 },
  { code: "661000", label: "Charges d'intérêts", classNum: 6 },
  { code: "706000", label: "Prestations de services", classNum: 7 },
  { code: "707000", label: "Ventes de marchandises", classNum: 7 },
  { code: "708000", label: "Produits des activités annexes", classNum: 7 },
  { code: "740000", label: "Subventions d'exploitation", classNum: 7 },
  { code: "758000", label: "Produits divers de gestion courante", classNum: 7 },
]

const JOURNALS = [
  { code: "BQ", label: "Banque" },
  { code: "VE", label: "Ventes" },
  { code: "AC", label: "Achats" },
  { code: "OD", label: "Opérations diverses" },
]

export async function bootstrapOrganization(organizationId: string) {
  // PCG
  for (const a of PCG_ACCOUNTS) {
    await prisma.account
      .create({
        data: { ...a, organizationId },
      })
      .catch(() => {})
  }

  // Journals
  for (const j of JOURNALS) {
    await prisma.journal
      .create({
        data: { ...j, organizationId },
      })
      .catch(() => {})
  }

  // Fiscal year (current calendar year)
  const now = new Date()
  await prisma.fiscalYear
    .create({
      data: {
        organizationId,
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear(), 11, 31),
        status: "OPEN",
      },
    })
    .catch(() => {})

  // Default bank account
  const existing = await prisma.bankAccount.findFirst({
    where: { organizationId },
  })
  if (!existing) {
    await prisma.bankAccount.create({
      data: {
        organizationId,
        name: "Compte principal",
        provider: "MANUAL",
        linkedPcgCode: "512000",
      },
    })
  }
}
