import { requireUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatEUR } from "@/lib/money"

export default async function SettingsPage() {
  const { user, organization } = await requireUser()
  const [accounts, journals, fiscalYears, bankAccounts] = await Promise.all([
    prisma.account.count({ where: { organizationId: organization.id } }),
    prisma.journal.findMany({ where: { organizationId: organization.id } }),
    prisma.fiscalYear.findMany({ where: { organizationId: organization.id } }),
    prisma.bankAccount.findMany({ where: { organizationId: organization.id } }),
  ])

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">Configuration de votre activité</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Identité de l&apos;activité</CardTitle>
          <CardDescription>Informations légales et fiscales</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <Field label="Nom" value={organization.name} />
          <Field label="Forme juridique" value={organization.legalForm} />
          <Field label="Régime fiscal" value={organization.taxRegime} />
          <Field label="Régime TVA" value={organization.vatRegime} />
          <Field label="SIRET" value={organization.siret || "—"} />
          <Field label="Code APE" value={organization.apeCode || "—"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan comptable & journaux</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>{accounts} comptes du PCG initialisés.</p>
          <p>
            Journaux :{" "}
            {journals.map((j) => `${j.code} (${j.label})`).join(" · ")}
          </p>
          <p>
            Exercice ouvert :{" "}
            {fiscalYears
              .map(
                (f) =>
                  `${f.startDate.toLocaleDateString("fr-FR")} → ${f.endDate.toLocaleDateString("fr-FR")} (${f.status})`
              )
              .join(", ")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comptes bancaires</CardTitle>
          <CardDescription>
            Connexion via API tierce ou import CSV
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {bankAccounts.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between border-b border-border pb-2 last:border-0"
            >
              <div>
                <p className="font-medium text-sm">{b.name}</p>
                <p className="text-xs text-muted-foreground">
                  {b.provider} · IBAN {b.iban || "—"} · Compte PCG {b.linkedPcgCode}
                </p>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {formatEUR(b.balance)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compte utilisateur</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <Field label="Nom" value={user.name || "—"} />
          <Field label="Email" value={user.email} />
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  )
}
