import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileDown, FileSpreadsheet } from "lucide-react"

export default function DocumentsPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Documents & exports</h1>
        <p className="text-muted-foreground">
          Générez vos fichiers comptables au format DGFiP.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>FEC — Fichier des Écritures Comptables</CardTitle>
                <CardDescription>Format texte tabulé, conforme DGFiP</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Exporte l&apos;ensemble des écritures de l&apos;exercice ouvert, avec en-tête à 18 colonnes (JournalCode, EcritureNum, CompteNum, Debit, Credit, …).
            </p>
            <Button asChild>
              <a href="/api/export/fec">
                <FileDown className="h-4 w-4" />
                Télécharger le FEC
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Grand livre</CardTitle>
                <CardDescription>Export CSV par compte</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Toutes les écritures regroupées par compte PCG, avec solde progressif.
            </p>
            <Button variant="outline" asChild>
              <a href="/api/export/grand-livre">
                <FileDown className="h-4 w-4" />
                Télécharger
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2035 — BNC déclaration contrôlée</CardTitle>
            <CardDescription>Pré-remplissage (PDF) — à venir</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Le pré-remplissage du formulaire 2035 et de ses annexes sera disponible dans une prochaine version.
            </p>
            <Button variant="outline" disabled>
              Bientôt
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CA3 — Déclaration de TVA</CardTitle>
            <CardDescription>Synthèse mensuelle/trimestrielle — à venir</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Calcul automatique de la TVA collectée, déductible et à reverser sur la période choisie.
            </p>
            <Button variant="outline" disabled>
              Bientôt
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 text-xs text-muted-foreground text-center">
        <Link href="/" className="hover:underline">
          ← Retour au pilotage
        </Link>
      </div>
    </div>
  )
}
