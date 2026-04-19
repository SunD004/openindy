import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

// Minimal PCG (French Chart of Accounts). Extend with the full list in production.
// Source: Autorité des Normes Comptables (ANC) — règlement 2022-06, public domain.
const PCG_ACCOUNTS: Array<{ code: string; label: string; classNum: number }> = [
  // Class 1 — Capital
  { code: "101000", label: "Capital", classNum: 1 },
  { code: "108000", label: "Compte de l'exploitant", classNum: 1 },
  // Class 2 — Fixed assets
  { code: "213000", label: "Constructions", classNum: 2 },
  { code: "215400", label: "Matériel industriel", classNum: 2 },
  { code: "218300", label: "Matériel de bureau et informatique", classNum: 2 },
  // Class 4 — Third parties
  { code: "401000", label: "Fournisseurs", classNum: 4 },
  { code: "411000", label: "Clients", classNum: 4 },
  { code: "445660", label: "TVA déductible sur autres biens et services", classNum: 4 },
  { code: "445710", label: "TVA collectée", classNum: 4 },
  { code: "445800", label: "Taxes sur le chiffre d'affaires à régulariser", classNum: 4 },
  { code: "447000", label: "Autres impôts, taxes et versements assimilés", classNum: 4 },
  // Class 5 — Financial accounts
  { code: "512000", label: "Banques", classNum: 5 },
  { code: "530000", label: "Caisse", classNum: 5 },
  { code: "580000", label: "Virements internes", classNum: 5 },
  // Class 6 — Expenses
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
  { code: "626200", label: "Frais de télécommunications", classNum: 6 },
  { code: "627000", label: "Services bancaires et assimilés", classNum: 6 },
  { code: "635100", label: "Contribution économique territoriale", classNum: 6 },
  { code: "641000", label: "Rémunérations du personnel", classNum: 6 },
  { code: "645100", label: "Cotisations à l'URSSAF", classNum: 6 },
  { code: "661000", label: "Charges d'intérêts", classNum: 6 },
  // Class 7 — Revenue
  { code: "706000", label: "Prestations de services", classNum: 7 },
  { code: "707000", label: "Ventes de marchandises", classNum: 7 },
  { code: "708000", label: "Produits des activités annexes", classNum: 7 },
  { code: "740000", label: "Subventions d'exploitation", classNum: 7 },
  { code: "758000", label: "Produits divers de gestion courante", classNum: 7 },
  { code: "764000", label: "Revenus des valeurs mobilières de placement", classNum: 7 },
]

// User-facing categories, mapped to PCG accounts
const CATEGORIES: Array<{
  key: string
  label: string
  family: string
  defaultPcgCode: string
  defaultVatRate: number | null
  direction: "IN" | "OUT" | "BOTH"
}> = [
  // REVENUS
  { key: "prestation_service", label: "Prestation de service", family: "REVENUS", defaultPcgCode: "706000", defaultVatRate: 20, direction: "IN" },
  { key: "vente_marchandise", label: "Vente de marchandise", family: "REVENUS", defaultPcgCode: "707000", defaultVatRate: 20, direction: "IN" },
  { key: "honoraires", label: "Honoraires", family: "REVENUS", defaultPcgCode: "706000", defaultVatRate: 20, direction: "IN" },
  { key: "subvention", label: "Subvention d'exploitation", family: "REVENUS", defaultPcgCode: "740000", defaultVatRate: 0, direction: "IN" },
  { key: "autres_produits", label: "Autres produits", family: "REVENUS", defaultPcgCode: "758000", defaultVatRate: null, direction: "IN" },

  // REMUNERATIONS
  { key: "salaires", label: "Salaires et traitements", family: "REMUNERATIONS", defaultPcgCode: "641000", defaultVatRate: null, direction: "OUT" },
  { key: "cotisations_urssaf", label: "Cotisations URSSAF", family: "REMUNERATIONS", defaultPcgCode: "645100", defaultVatRate: null, direction: "OUT" },
  { key: "honoraires_tiers", label: "Honoraires versés", family: "REMUNERATIONS", defaultPcgCode: "622600", defaultVatRate: 20, direction: "OUT" },

  // FONCTIONNEMENT
  { key: "fournitures_bureau", label: "Fournitures de bureau", family: "FONCTIONNEMENT", defaultPcgCode: "606400", defaultVatRate: 20, direction: "OUT" },
  { key: "petit_equipement", label: "Petit équipement", family: "FONCTIONNEMENT", defaultPcgCode: "606300", defaultVatRate: 20, direction: "OUT" },
  { key: "sous_traitance", label: "Sous-traitance / personnel extérieur", family: "FONCTIONNEMENT", defaultPcgCode: "621000", defaultVatRate: 20, direction: "OUT" },
  { key: "publicite", label: "Publicité, marketing", family: "FONCTIONNEMENT", defaultPcgCode: "623000", defaultVatRate: 20, direction: "OUT" },
  { key: "abonnement_logiciel", label: "Abonnement logiciel / SaaS", family: "FONCTIONNEMENT", defaultPcgCode: "606400", defaultVatRate: 20, direction: "OUT" },

  // DEPLACEMENTS
  { key: "voyage_deplacement", label: "Voyages et déplacements", family: "DEPLACEMENTS", defaultPcgCode: "625100", defaultVatRate: 10, direction: "OUT" },
  { key: "repas_affaires", label: "Repas d'affaires / missions", family: "DEPLACEMENTS", defaultPcgCode: "625600", defaultVatRate: 10, direction: "OUT" },
  { key: "carburant", label: "Carburant", family: "DEPLACEMENTS", defaultPcgCode: "606100", defaultVatRate: 20, direction: "OUT" },

  // FRAIS_FIXES
  { key: "loyer", label: "Loyer", family: "FRAIS_FIXES", defaultPcgCode: "613200", defaultVatRate: 20, direction: "OUT" },
  { key: "electricite", label: "Eau, gaz, électricité", family: "FRAIS_FIXES", defaultPcgCode: "606100", defaultVatRate: 20, direction: "OUT" },
  { key: "internet_telephone", label: "Internet et téléphone", family: "FRAIS_FIXES", defaultPcgCode: "626100", defaultVatRate: 20, direction: "OUT" },
  { key: "assurance", label: "Assurance professionnelle", family: "FRAIS_FIXES", defaultPcgCode: "616000", defaultVatRate: 0, direction: "OUT" },
  { key: "frais_bancaires", label: "Frais bancaires", family: "FRAIS_FIXES", defaultPcgCode: "627000", defaultVatRate: 0, direction: "OUT" },
  { key: "entretien", label: "Entretien et réparations", family: "FRAIS_FIXES", defaultPcgCode: "615500", defaultVatRate: 20, direction: "OUT" },

  // TAXES
  { key: "cfe", label: "Contribution économique territoriale (CFE)", family: "TAXES", defaultPcgCode: "635100", defaultVatRate: null, direction: "OUT" },
  { key: "autres_taxes", label: "Autres impôts et taxes", family: "TAXES", defaultPcgCode: "447000", defaultVatRate: null, direction: "OUT" },
]

async function main() {
  console.log("Seeding OpenIndy database...")

  // 1. Global (system) categories
  for (const c of CATEGORIES) {
    await prisma.category.upsert({
      where: {
        organizationId_key: { organizationId: null as unknown as string, key: c.key },
      },
      // SQLite with nullable compound unique needs a workaround: use findFirst + create
      create: {
        key: c.key,
        label: c.label,
        family: c.family,
        defaultPcgCode: c.defaultPcgCode,
        defaultVatRate: c.defaultVatRate,
        direction: c.direction,
        organizationId: null,
      },
      update: {
        label: c.label,
        defaultPcgCode: c.defaultPcgCode,
        defaultVatRate: c.defaultVatRate,
      },
    }).catch(async () => {
      // Fallback if the upsert fails on SQLite (null in composite unique)
      const existing = await prisma.category.findFirst({
        where: { organizationId: null, key: c.key },
      })
      if (!existing) {
        await prisma.category.create({
          data: {
            key: c.key,
            label: c.label,
            family: c.family,
            defaultPcgCode: c.defaultPcgCode,
            defaultVatRate: c.defaultVatRate,
            direction: c.direction,
          },
        })
      }
    })
  }

  // 2. Demo user + organization (for quick start)
  const demoEmail = "demo@openindy.local"
  const existingUser = await prisma.user.findUnique({ where: { email: demoEmail } })

  if (!existingUser) {
    const passwordHash = await hash("demo1234", 10)
    const user = await prisma.user.create({
      data: {
        email: demoEmail,
        name: "Utilisateur démo",
        passwordHash,
      },
    })

    const org = await prisma.organization.create({
      data: {
        name: "Mon Activité Freelance",
        legalForm: "EI",
        taxRegime: "BNC_DC",
        vatRegime: "FRANCHISE",
        fiscalYearStart: 1,
      },
    })

    await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role: "OWNER",
      },
    })

    // Seed PCG for this org
    for (const acc of PCG_ACCOUNTS) {
      await prisma.account.create({
        data: {
          organizationId: org.id,
          code: acc.code,
          label: acc.label,
          classNum: acc.classNum,
        },
      })
    }

    // Seed journals
    const journals = [
      { code: "BQ", label: "Banque" },
      { code: "VE", label: "Ventes" },
      { code: "AC", label: "Achats" },
      { code: "OD", label: "Opérations diverses" },
    ]
    for (const j of journals) {
      await prisma.journal.create({
        data: { organizationId: org.id, code: j.code, label: j.label },
      })
    }

    // Seed fiscal year (current year)
    const now = new Date()
    await prisma.fiscalYear.create({
      data: {
        organizationId: org.id,
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate: new Date(now.getFullYear(), 11, 31),
        status: "OPEN",
      },
    })

    // Seed a bank account (manual)
    await prisma.bankAccount.create({
      data: {
        organizationId: org.id,
        name: "Compte principal (démo)",
        provider: "MANUAL",
        iban: "FR7600000000000000000000000",
        linkedPcgCode: "512000",
      },
    })

    console.log(`✓ Demo user created: ${demoEmail} / demo1234`)
    console.log(`✓ Organization: ${org.name}`)
  } else {
    console.log("✓ Demo user already exists, skipping")
  }

  console.log("Seeding complete.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
