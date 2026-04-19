import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ImportForm } from "./import-form"

export default async function ImportPage() {
  const { organization } = await requireUser()
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { organizationId: organization.id },
  })

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Importer un CSV</h1>
        <p className="text-muted-foreground">
          Importez un relevé bancaire au format CSV. OpenIndy détecte automatiquement les colonnes courantes.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Nouveau relevé</CardTitle>
          <CardDescription>
            Format attendu : date, libellé, montant (négatif = sortie). La plupart des exports (Qonto, BNP, Boursorama, Crédit Agricole…) fonctionnent.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImportForm
            bankAccounts={bankAccounts.map((b) => ({ id: b.id, name: b.name }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}
