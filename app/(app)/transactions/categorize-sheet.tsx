"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatEUR, formatDate } from "@/lib/money"

export type CategoryLite = {
  id: string
  key: string
  label: string
  family: string
  defaultVatRate: number | null
}

export type TransactionLite = {
  id: string
  counterparty: string
  rawLabel: string
  amount: number
  bookedAt: string
  categoryId: string | null
  vatRate: number | null
  notes: string | null
  isReviewed: boolean
}

export function CategorizeSheet({
  transaction,
  categories,
  children,
}: {
  transaction: TransactionLite
  categories: CategoryLite[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [categoryId, setCategoryId] = useState(transaction.categoryId || "")
  const [vatRate, setVatRate] = useState(
    transaction.vatRate != null ? String(transaction.vatRate) : ""
  )
  const [notes, setNotes] = useState(transaction.notes || "")
  const [saving, setSaving] = useState(false)

  const grouped = categories.reduce<Record<string, CategoryLite[]>>(
    (acc, c) => {
      acc[c.family] = acc[c.family] || []
      acc[c.family].push(c)
      return acc
    },
    {}
  )

  async function save(markReviewed: boolean) {
    setSaving(true)
    await fetch(`/api/transactions/${transaction.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        categoryId: categoryId || null,
        vatRate: vatRate === "" ? null : Number(vatRate),
        notes: notes || null,
        isReviewed: markReviewed,
      }),
    })
    setSaving(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{transaction.counterparty}</SheetTitle>
          <SheetDescription>
            {formatDate(transaction.bookedAt)} ·{" "}
            <span className={`font-semibold tabular-nums ${transaction.amount >= 0 ? "text-emerald-700" : ""}`}>
              {transaction.amount >= 0 ? "+" : ""}
              {formatEUR(transaction.amount)}
            </span>
          </SheetDescription>
          <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded mt-2">
            {transaction.rawLabel}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-auto py-6 space-y-4">
          <div className="space-y-2">
            <Label>Catégorie</Label>
            <select
              value={categoryId}
              onChange={(e) => {
                const next = e.target.value
                setCategoryId(next)
                const match = categories.find((c) => c.id === next)
                if (match && match.defaultVatRate != null) {
                  setVatRate(String(match.defaultVatRate))
                }
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">— Choisir —</option>
              {Object.entries(grouped).map(([family, cats]) => (
                <optgroup key={family} label={family}>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vat">Taux de TVA (%)</Label>
            <Input
              id="vat"
              type="number"
              step="0.1"
              min="0"
              max="30"
              value={vatRate}
              onChange={(e) => setVatRate(e.target.value)}
              placeholder="20"
            />
            <p className="text-xs text-muted-foreground">
              Laisser vide si opération hors-champ TVA.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Note</Label>
            <Input
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex : facture #42, client Dupont…"
            />
          </div>

          <div className="pt-2">
            {transaction.isReviewed ? (
              <Badge variant="success">Validée</Badge>
            ) : (
              <Badge variant="warning">À valider</Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <Button onClick={() => save(true)} disabled={saving}>
            Valider la catégorisation
          </Button>
          <Button
            variant="outline"
            onClick={() => save(false)}
            disabled={saving}
          >
            Enregistrer sans valider
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
