import Link from "next/link"
import { ArrowRight, TrendingUp, TrendingDown, Wallet, AlertCircle } from "lucide-react"
import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { formatEUR, formatDate } from "@/lib/money"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default async function Dashboard() {
  const { organization } = await requireUser()
  const orgId = organization.id

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [transactions, monthTxs, unreviewed, bankAccounts] = await Promise.all([
    prisma.bankTransaction.findMany({
      where: { organizationId: orgId },
      orderBy: { bookedAt: "desc" },
      take: 5,
      include: { category: true, bankAccount: true },
    }),
    prisma.bankTransaction.findMany({
      where: { organizationId: orgId, bookedAt: { gte: startOfMonth } },
    }),
    prisma.bankTransaction.count({
      where: { organizationId: orgId, isReviewed: false },
    }),
    prisma.bankAccount.findMany({
      where: { organizationId: orgId },
    }),
  ])

  const monthIn = monthTxs
    .filter((t) => t.amount > 0)
    .reduce((s, t) => s + t.amount, 0)
  const monthOut = monthTxs
    .filter((t) => t.amount < 0)
    .reduce((s, t) => s + t.amount, 0)
  const monthNet = monthIn + monthOut
  const totalBalance = bankAccounts.reduce((s, a) => s + a.balance, 0)

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Pilotage</h1>
        <p className="text-muted-foreground">
          Vue d&apos;ensemble de votre activité — {now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Kpi
          label="Solde total"
          value={formatEUR(totalBalance)}
          icon={<Wallet className="h-4 w-4 text-primary" />}
        />
        <Kpi
          label="Recettes du mois"
          value={formatEUR(monthIn)}
          icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
        />
        <Kpi
          label="Dépenses du mois"
          value={formatEUR(Math.abs(monthOut))}
          icon={<TrendingDown className="h-4 w-4 text-red-600" />}
        />
        <Kpi
          label="Résultat du mois"
          value={formatEUR(monthNet)}
          icon={<TrendingUp className={`h-4 w-4 ${monthNet >= 0 ? "text-emerald-600" : "text-red-600"}`} />}
        />
      </div>

      {unreviewed > 0 && (
        <Card className="mb-6 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-700 dark:text-amber-300" />
              <div>
                <p className="font-medium text-sm">
                  {unreviewed} transaction{unreviewed > 1 ? "s" : ""} à catégoriser
                </p>
                <p className="text-xs text-muted-foreground">
                  Vérifiez et validez la catégorisation pour générer vos écritures comptables.
                </p>
              </div>
            </div>
            <Link
              href="/transactions"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Voir
              <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Dernières transactions</CardTitle>
            <CardDescription>5 plus récentes</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="divide-y divide-border">
                {transactions.map((t) => (
                  <div key={t.id} className="py-3 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{t.counterparty}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.bookedAt)} · {t.bankAccount.name}
                        {t.category && (
                          <>
                            {" · "}
                            <span className="text-foreground">{t.category.label}</span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {!t.isReviewed && <Badge variant="warning">À valider</Badge>}
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          t.amount >= 0 ? "text-emerald-700" : "text-foreground"
                        }`}
                      >
                        {t.amount >= 0 ? "+" : ""}
                        {formatEUR(t.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="pt-4">
              <Link
                href="/transactions"
                className="text-sm text-primary font-medium inline-flex items-center gap-1 hover:underline"
              >
                Toutes les transactions <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comptes bancaires</CardTitle>
            <CardDescription>Soldes synchronisés</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {bankAccounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.provider} · {a.iban?.slice(0, 8)}…
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatEUR(a.balance)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Kpi({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
          {icon}
        </div>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-12">
      <p className="text-sm text-muted-foreground">
        Aucune transaction pour l&apos;instant.
      </p>
      <Link
        href="/import"
        className="mt-3 inline-flex items-center gap-1 text-sm text-primary font-medium hover:underline"
      >
        Importer un CSV <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
