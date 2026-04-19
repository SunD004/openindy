import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { formatEUR, formatDate } from "@/lib/money"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CategorizeSheet } from "./categorize-sheet"

export default async function TransactionsPage() {
  const { organization } = await requireUser()
  const orgId = organization.id

  const [transactions, categories] = await Promise.all([
    prisma.bankTransaction.findMany({
      where: { organizationId: orgId },
      orderBy: { bookedAt: "desc" },
      include: { category: true, bankAccount: true },
      take: 200,
    }),
    prisma.category.findMany({
      where: { OR: [{ organizationId: null }, { organizationId: orgId }] },
      orderBy: [{ family: "asc" }, { label: "asc" }],
    }),
  ])

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            {transactions.length} opérations · cliquez pour catégoriser
          </p>
        </div>
      </header>

      <Card>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">
                Aucune transaction. Importez un CSV depuis la page{" "}
                <a href="/import" className="text-primary underline">
                  Importer
                </a>
                .
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-muted-foreground uppercase border-b border-border">
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Libellé</th>
                  <th className="text-left p-3 font-medium">Catégorie</th>
                  <th className="text-left p-3 font-medium">Compte</th>
                  <th className="text-right p-3 font-medium">Montant</th>
                  <th className="text-right p-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <CategorizeSheet
                    key={t.id}
                    transaction={{
                      id: t.id,
                      counterparty: t.counterparty,
                      rawLabel: t.rawLabel,
                      amount: t.amount,
                      bookedAt: t.bookedAt.toISOString(),
                      categoryId: t.categoryId,
                      vatRate: t.vatRate,
                      notes: t.notes,
                      isReviewed: t.isReviewed,
                    }}
                    categories={categories.map((c) => ({
                      id: c.id,
                      key: c.key,
                      label: c.label,
                      family: c.family,
                      defaultVatRate: c.defaultVatRate,
                    }))}
                  >
                    <tr className="border-b border-border hover:bg-muted/40 transition cursor-pointer">
                      <td className="p-3 text-sm tabular-nums">
                        {formatDate(t.bookedAt)}
                      </td>
                      <td className="p-3 text-sm min-w-[200px]">
                        <div className="font-medium truncate max-w-[300px]">
                          {t.counterparty}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {t.rawLabel}
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        {t.category ? (
                          <Badge variant="outline" className="font-normal">
                            {t.category.label}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Non catégorisée
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {t.bankAccount.name}
                      </td>
                      <td
                        className={`p-3 text-sm text-right tabular-nums font-semibold ${
                          t.amount >= 0 ? "text-emerald-700" : ""
                        }`}
                      >
                        {t.amount >= 0 ? "+" : ""}
                        {formatEUR(t.amount)}
                      </td>
                      <td className="p-3 text-right">
                        {t.isReviewed ? (
                          <Badge variant="success">Validée</Badge>
                        ) : (
                          <Badge variant="warning">À valider</Badge>
                        )}
                      </td>
                    </tr>
                  </CategorizeSheet>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
