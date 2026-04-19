# OpenIndy

> **La compta des indépendants, libre et gratuite.**

OpenIndy est un clone open-source d'outils de comptabilité automatisée type Indy,
conçu pour les freelances et TPE françaises. Synchronisez vos comptes bancaires,
catégorisez vos transactions automatiquement, exportez votre FEC et gérez votre
TVA — sans abonnement, sans vendor lock-in.

**Statut : v1 (alpha)** — auth + import CSV + catégorisation + écritures
comptables double-entrée + export FEC + export grand-livre.

Pas d'affiliation avec Indy SAS.

---

## Stack

- **Next.js 14** (App Router, Server Components, Route Handlers)
- **TypeScript 5**
- **Prisma ORM** — SQLite en dev, PostgreSQL pour la prod (changer
  `datasource.provider` dans `prisma/schema.prisma`)
- **Tailwind CSS 3** + composants shadcn-style (Radix UI)
- **iron-session** pour l'auth cookie-based
- **papaparse** pour le parsing CSV
- **bcryptjs** pour le hash des mots de passe
- Licence **AGPL-3.0**

## Architecture

```
openindy/
├── app/
│   ├── (app)/           # zone authentifiée : pilotage, transactions, import, documents, settings
│   ├── (auth)/          # login + signup
│   ├── api/             # route handlers (auth, transactions, import, export)
│   └── layout.tsx       # root
├── components/ui/       # primitives shadcn (button, card, input, sheet, badge…)
├── lib/                 # db, auth, money, utils
├── server/services/     # business logic
│   ├── bootstrap.ts     # init PCG + journaux + exercice + compte
│   ├── csv-import.ts    # parse + dedup + auto-categorize
│   ├── categorize.ts    # règles + historique + dictionnaire
│   ├── accounting.ts    # génération d'écritures double-entrée
│   └── fec-export.ts    # FEC 18-colonnes + grand livre
└── prisma/
    ├── schema.prisma    # modèles : User, Organization, Account, Category,
    │                    # BankAccount, BankTransaction, FiscalYear, Journal,
    │                    # JournalEntry, JournalLine
    └── seed.ts          # PCG + 24 catégories + user démo
```

## Démarrage rapide

Prérequis : Node 20+, npm.

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'environnement
cp .env.example .env
# Générer un SESSION_SECRET aléatoire (>= 32 caractères)
# Ex : openssl rand -hex 32

# 3. Initialiser la base + seed
npx prisma migrate dev --name init
npm run db:seed

# 4. Lancer le serveur
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000), se connecter avec
`demo@openindy.local` / `demo1234`.

### Essayer l'import CSV

1. Exporter un relevé CSV depuis votre banque (Qonto, BNP, Boursorama, Crédit
   Agricole, etc.)
2. Aller dans **Importer**, uploader le fichier.
3. Les transactions arrivent dans **Transactions** avec une catégorie suggérée.
4. Cliquer sur une transaction pour valider la catégorie et le taux de TVA.
5. À la validation, une écriture comptable double-entrée est générée
   automatiquement dans le journal BQ.

### Exporter le FEC

Aller dans **Documents** → **Télécharger le FEC**. Le fichier produit respecte
le format DGFiP (18 colonnes, tabulations, UTF-8).

## Modèle comptable

OpenIndy applique une comptabilité en partie double pour chaque transaction
bancaire validée :

**Inflow (recette, montant > 0)** :
```
DEBIT  512000  (Banque)                TTC
CREDIT 706000  (Prestations de services) HT
CREDIT 445710  (TVA collectée)         VAT
```

**Outflow (dépense, montant < 0)** :
```
DEBIT  6xxxxx  (Charge)                HT
DEBIT  445660  (TVA déductible)        VAT
CREDIT 512000  (Banque)                TTC
```

Le moteur vérifie l'équilibre débit = crédit à 1 centime près et refuse
toute écriture sur un exercice clôturé.

## Catégorisation auto

Ordre de priorité :
1. **Historique** — même contrepartie déjà validée → réutilise la catégorie.
2. **Dictionnaire de mots-clés** — SNCF, EDF, URSSAF, Google Workspace, etc.
3. **Manuel** — sinon l'utilisateur catégorise via le panneau latéral.

Le dictionnaire est dans `server/services/categorize.ts` — contributions
bienvenues.

## Connecteurs bancaires

La v1 supporte l'import CSV (quasi tous les exports bancaires français sont
reconnus automatiquement). Les connecteurs API sont prévus dans `server/
services/providers/` :

- **Qonto** — API officielle, OAuth2
- **Bridge API** — agrégateur PSD2 (300+ banques européennes)
- **Powens (ex-Budget Insight)** — agrégateur AISP
- **GoCardless Bank Account Data** — BAD API (ex-Nordigen)

Seul le stub `MANUAL` (import CSV) est livré en v1.

## Exports DGFiP (roadmap)

- ✅ **FEC** (Fichier des Écritures Comptables) — format BOI-CF-IOR-60-40-20.
- ✅ **Grand-livre** (CSV).
- 🚧 **2035** (BNC déclaration contrôlée) — pré-remplissage PDF.
- 🚧 **CA3 / CA12** (TVA) — calcul à partir des comptes 4457/4456.
- 🚧 **Balance**, **journal détaillé**, **2033-SD** (BIC).

## Ce que la v1 ne fait *pas* encore

- Connecteurs bancaires API (seul le CSV est fonctionnel)
- OCR des factures (roadmap : Tesseract.js local + Mistral OCR en option)
- Chatbot fiscal RAG (roadmap : intégration MCP data.gouv.fr + BOFiP-Impôts)
- Facturation sortante (émission de factures clients)
- Multi-devises
- Comptabilité d'engagement (v1 = trésorerie uniquement)
- Gestion de la paie / DAS2

Ces modules sont documentés dans `../OpenIndy-SPECS.md`,
`../OpenIndy-OPENSOURCE-FEASIBILITY.md` et `../OpenIndy-DATAGOUV-CHATBOT.md`.

## Licence

OpenIndy est distribué sous **AGPL-3.0**. Toute version modifiée et déployée en
SaaS doit être rendue disponible sous la même licence. Voir `LICENSE`.

## Contribuer

Pas de CI / templates d'issue en v1. Ouvrir une PR ou une issue GitHub pour
discuter. Contributions bienvenues notamment sur :
- Règles du dictionnaire de catégorisation (`server/services/categorize.ts`)
- Connecteurs banque (Qonto, Bridge…)
- Formulaires fiscaux (2035, CA3, 2033)
- Tests — aucun n'est livré en v1

## Avertissement

OpenIndy n'est **pas** un logiciel certifié. Pour toute activité soumise à une
obligation de tenue comptable certifiée, consultez un expert-comptable.
