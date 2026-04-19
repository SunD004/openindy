export function formatEUR(amount: number, opts?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...opts,
  }).format(amount)
}

export function formatDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

export function centsToEuros(cents: number) {
  return cents / 100
}

export function eurosToCents(euros: number) {
  return Math.round(euros * 100)
}

/**
 * Given a TTC (tax-included) amount and a VAT rate (e.g. 20 for 20%),
 * returns { ht, vat, ttc } components.
 */
export function splitVat(amountTtc: number, rate: number | null | undefined) {
  if (!rate) return { ht: amountTtc, vat: 0, ttc: amountTtc }
  const ht = amountTtc / (1 + rate / 100)
  const vat = amountTtc - ht
  return { ht: round2(ht), vat: round2(vat), ttc: round2(amountTtc) }
}

export function round2(n: number) {
  return Math.round(n * 100) / 100
}
