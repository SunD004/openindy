"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, CheckCircle2, AlertTriangle } from "lucide-react"

export function ImportForm({
  bankAccounts,
}: {
  bankAccounts: Array<{ id: string; name: string }>
}) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id || "")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{
    ok: boolean
    inserted?: number
    skipped?: number
    error?: string
  } | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !bankAccountId) return
    setBusy(true)
    setResult(null)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("bankAccountId", bankAccountId)
    const res = await fetch("/api/transactions/import", {
      method: "POST",
      body: fd,
    })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) {
      setResult({ ok: false, error: data?.message || "Erreur d'import" })
      return
    }
    setResult({ ok: true, inserted: data.inserted, skipped: data.skipped })
    setTimeout(() => router.push("/transactions"), 1200)
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label>Compte bancaire de destination</Label>
        <select
          value={bankAccountId}
          onChange={(e) => setBankAccountId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        >
          {bankAccounts.length === 0 && <option value="">Aucun compte</option>}
          {bankAccounts.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label>Fichier CSV</Label>
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:bg-muted/40 transition">
          <Upload className="h-6 w-6 text-muted-foreground mb-2" />
          {file ? (
            <span className="text-sm font-medium">{file.name}</span>
          ) : (
            <span className="text-sm text-muted-foreground">
              Cliquer pour sélectionner un fichier .csv
            </span>
          )}
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      {result && result.ok && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 p-3 rounded-md">
          <CheckCircle2 className="h-4 w-4" />
          {result.inserted} transaction(s) importée(s), {result.skipped} doublon(s) ignoré(s).
        </div>
      )}
      {result && !result.ok && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
          <AlertTriangle className="h-4 w-4" />
          {result.error}
        </div>
      )}

      <Button type="submit" disabled={!file || !bankAccountId || busy}>
        {busy ? "Import en cours…" : "Importer"}
      </Button>
    </form>
  )
}
