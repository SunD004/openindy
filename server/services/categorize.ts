import { prisma } from "@/lib/db"

/**
 * Heuristic categorization: keyword-based global dictionary, then
 * fall back to same-organization history on similar counterparties.
 */
const DICT: Array<{ match: RegExp; categoryKey: string; direction: "IN" | "OUT" }> = [
  { match: /url?ssaf|cotisations|sécurité sociale indépendants/i, categoryKey: "cotisations_urssaf", direction: "OUT" },
  { match: /sncf|ouigo|ratp|uber|bolt|trainline|taxi|flixbus/i, categoryKey: "voyage_deplacement", direction: "OUT" },
  { match: /total|esso|shell|bp\s|carburant|station/i, categoryKey: "carburant", direction: "OUT" },
  { match: /restaurant|brasserie|bistro|café|pizza|sushi|kfc|mcdo|mcdonald|starbucks|burger/i, categoryKey: "repas_affaires", direction: "OUT" },
  { match: /amazon|fnac|darty|boulanger|office\s?depot|bureau\s?vallée/i, categoryKey: "fournitures_bureau", direction: "OUT" },
  { match: /orange|sfr|bouygues|free|internet|fibre|adsl/i, categoryKey: "internet_telephone", direction: "OUT" },
  { match: /loyer|bailleur|sci\s/i, categoryKey: "loyer", direction: "OUT" },
  { match: /edf|engie|electricite|gaz|total\s?energies/i, categoryKey: "electricite", direction: "OUT" },
  { match: /assurance|allianz|maif|maaf|axa|groupama/i, categoryKey: "assurance", direction: "OUT" },
  { match: /frais\s+bancaires|commission|agios|cotisation\s+carte/i, categoryKey: "frais_bancaires", direction: "OUT" },
  { match: /google\s?(workspace|cloud|ads)|github|figma|notion|slack|linear|stripe|openai|anthropic|claude|mistral|adobe|microsoft/i, categoryKey: "abonnement_logiciel", direction: "OUT" },
  { match: /pub(licité)?|google\s?ads|meta\s?ads|linkedin\s?ads|facebook/i, categoryKey: "publicite", direction: "OUT" },
  { match: /virement\s+salaire|paie|paye/i, categoryKey: "salaires", direction: "OUT" },
  { match: /honoraires|expert[-\s]?comptable|avocat|notaire/i, categoryKey: "honoraires_tiers", direction: "OUT" },
  { match: /cfe|impôt|impot|direction\s+générale\s+des\s+finances/i, categoryKey: "cfe", direction: "OUT" },
  // Inflows
  { match: /virement\s+reçu|remise\s+chèque|facture|client/i, categoryKey: "prestation_service", direction: "IN" },
]

export async function autoCategorize(opts: {
  organizationId: string
  counterparty: string
  rawLabel: string
  amount: number
}): Promise<{ categoryId: string; vatRate: number | null } | null> {
  const direction: "IN" | "OUT" = opts.amount >= 0 ? "IN" : "OUT"
  const haystack = `${opts.counterparty} ${opts.rawLabel}`

  // 1. Same-org history: pick category used most often for the same counterparty
  const historic = await prisma.bankTransaction.findMany({
    where: {
      organizationId: opts.organizationId,
      counterparty: opts.counterparty,
      categoryId: { not: null },
      isReviewed: true,
    },
    select: { categoryId: true, vatRate: true },
    take: 10,
  })
  if (historic.length > 0) {
    const counts = new Map<string, number>()
    for (const h of historic) {
      if (!h.categoryId) continue
      counts.set(h.categoryId, (counts.get(h.categoryId) || 0) + 1)
    }
    const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]
    if (best) {
      const lastVat = historic.find((h) => h.categoryId === best[0])?.vatRate ?? null
      return { categoryId: best[0], vatRate: lastVat }
    }
  }

  // 2. Keyword dictionary
  for (const rule of DICT) {
    if (rule.direction !== direction && rule.direction !== "IN" && rule.direction !== "OUT") continue
    if (rule.direction !== direction) continue
    if (rule.match.test(haystack)) {
      const cat = await prisma.category.findFirst({
        where: {
          key: rule.categoryKey,
          OR: [{ organizationId: null }, { organizationId: opts.organizationId }],
        },
      })
      if (cat) {
        return { categoryId: cat.id, vatRate: cat.defaultVatRate }
      }
    }
  }

  return null
}
