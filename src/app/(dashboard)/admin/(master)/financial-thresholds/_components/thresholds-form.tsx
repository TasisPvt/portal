"use client"

import * as React from "react"
import { toast } from "sonner"
import { CheckIcon, PencilIcon, XIcon } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Spinner } from "@/src/components/ui/spinner"
import { upsertFinancialThreshold, type FinancialRatioRow } from "../_actions"

function ThresholdRow({ row }: { row: FinancialRatioRow }) {
   const [editing, setEditing] = React.useState(false)
   const [value, setValue] = React.useState(
      (parseFloat(row.threshold) * 100).toFixed(2),
   )
   const [isPending, startTransition] = React.useTransition()

   function handleSave() {
      const num = parseFloat(value)
      if (isNaN(num) || num < 0 || num > 100) {
         toast.error("Enter a value between 0 and 100.")
         return
      }
      startTransition(async () => {
         const result = await upsertFinancialThreshold(row.key, (num / 100).toFixed(4))
         if (result.success) {
            toast.success("Threshold saved.")
            setEditing(false)
         } else {
            toast.error(result.message ?? "Failed to save.")
         }
      })
   }

   function handleCancel() {
      setValue((parseFloat(row.threshold) * 100).toFixed(2))
      setEditing(false)
   }

   const displayPct = (parseFloat(row.threshold) * 100).toFixed(2)

   return (
      <div className="flex flex-col gap-3 rounded-xl border p-4">
         <div className="flex items-center justify-between gap-3">
            <div>
               <span className="text-sm font-medium">{row.label}</span>
               {!editing && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                     Current threshold: <span className="font-semibold text-foreground">{displayPct}%</span>
                  </p>
               )}
            </div>
            {!editing && (
               <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground"
                  onClick={() => setEditing(true)}
               >
                  <PencilIcon className="size-3" />
                  Edit
               </Button>
            )}
         </div>

         {editing && (
            <div className="flex items-end gap-3">
               <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                     Threshold (%)
                  </label>
                  <div className="flex items-center gap-1.5">
                     <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="h-8 w-28 text-sm"
                        autoFocus
                        onKeyDown={(e) => {
                           if (e.key === "Enter") handleSave()
                           if (e.key === "Escape") handleCancel()
                        }}
                     />
                     <span className="text-sm text-muted-foreground">%</span>
                  </div>
               </div>
               <div className="flex items-center gap-2 pb-0.5">
                  <Button
                     variant="ghost"
                     size="sm"
                     className="h-7 gap-1 text-xs"
                     onClick={handleCancel}
                     disabled={isPending}
                  >
                     <XIcon className="size-3" />
                     Cancel
                  </Button>
                  <Button
                     size="sm"
                     className="h-7 gap-1 text-xs"
                     onClick={handleSave}
                     disabled={isPending}
                  >
                     {isPending ? <Spinner className="size-3" /> : <CheckIcon className="size-3" />}
                     Save
                  </Button>
               </div>
            </div>
         )}
      </div>
   )
}

export function ThresholdsForm({ data }: { data: FinancialRatioRow[] }) {
   return (
      <div className="flex flex-col gap-3">
         {data.map((row) => (
            <ThresholdRow key={row.key} row={row} />
         ))}
      </div>
   )
}
