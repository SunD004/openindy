import Link from "next/link"
import { ArrowRight, Banknote, FileSpreadsheet, Sparkles } from "lucide-react"

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-accent/30">
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary grid place-items-center text-primary-foreground font-bold">
            O
          </div>
          <span className="font-semibold text-lg">OpenIndy</span>
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground font-medium">
            open source
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium hover:text-primary transition"
          >
            Se connecter
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-1 text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 transition"
          >
            Créer un compte
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="container mx-auto px-6 pt-16 pb-24 max-w-4xl text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-balance">
          La compta des indépendants,{" "}
          <span className="text-primary">libre et gratuite.</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground text-balance max-w-2xl mx-auto">
          Synchronisez vos comptes bancaires, catégorisez vos transactions
          automatiquement, exportez votre FEC et déclarez votre TVA — sans
          abonnement, sans dépendance.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition"
          >
            Essayer en local
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="https://github.com"
            className="inline-flex items-center gap-2 border border-border px-6 py-3 rounded-lg font-medium hover:bg-muted transition"
          >
            Voir sur GitHub
          </a>
        </div>
      </section>

      <section className="container mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6 max-w-5xl">
        <Feature
          icon={<Banknote className="h-5 w-5" />}
          title="Synchro bancaire"
          desc="Importez en CSV ou connectez Qonto, Bridge, Powens, GoCardless via PSD2."
        />
        <Feature
          icon={<Sparkles className="h-5 w-5" />}
          title="Catégorisation auto"
          desc="Règles + historique + dictionnaire. Chaque transaction reçoit un compte PCG et un taux de TVA."
        />
        <Feature
          icon={<FileSpreadsheet className="h-5 w-5" />}
          title="Export FEC, 2035, CA3"
          desc="Formats DGFiP conformes, générés en un clic depuis votre livre d'écritures."
        />
      </section>

      <footer className="border-t border-border">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            © {new Date().getFullYear()} OpenIndy — AGPL-3.0
          </span>
          <span>Sans affiliation avec Indy SAS.</span>
        </div>
      </footer>
    </main>
  )
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  )
}
