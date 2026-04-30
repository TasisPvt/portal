"use client"

import * as React from "react"
import { toast } from "sonner"
import { CheckIcon, PencilIcon, XIcon } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Spinner } from "@/src/components/ui/spinner"
import { Textarea } from "@/src/components/ui/textarea"
import { Badge } from "@/src/components/ui/badge"
import { cn } from "@/src/lib/utils"
import { upsertScreeningStandard } from "../_actions"
import type { TasisScreeningStandard } from "@/src/db/schema"

const STATUS_LABELS: Record<number, string> = {
   1: "Shariah Compliant",
   2: "Primary Bus. Non-compliant",
   3: "Secondary Bus. Non-compliant",
   4: "Financial Non-comp",
   5: "Fail on Investment",
   6: "Incomplete / Old Data",
   7: "Incomplete Bus. Info",
   8: "Status on Hold",
   9: "Not in Universe",
}

const STATUS_COLORS: Record<number, string> = {
   1: "#33cc33",
   2: "#ff0000",
   3: "#ffff00",
   4: "#ffc000",
   5: "#c65911",
   6: "#00b0f0",
   7: "#8497b0",
   8: "#525252",
   9: "#806000",
}

type ExistingMap = Map<number, { id: string; remark: string | null }>

function StandardRow({
   status,
   existing,
}: {
   status: number
   existing: ExistingMap
}) {
   const current = existing.get(status)
   const [editing, setEditing] = React.useState(false)
   const [value, setValue] = React.useState(current?.remark ?? "")
   const [isPending, startTransition] = React.useTransition()

   function handleSave() {
      startTransition(async () => {
         const result = await upsertScreeningStandard(status, value)
         if (result.success) {
            toast.success("Standard saved.")
            setEditing(false)
         } else {
            toast.error(result.message ?? "Failed to save.")
         }
      })
   }

   function handleCancel() {
      setValue(current?.remark ?? "")
      setEditing(false)
   }

   const color = STATUS_COLORS[status]

   return (
      <div className="flex flex-col gap-3 rounded-xl border p-4">
         <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
               <div
                  className="size-6 shrink-0 rounded-full border border-black/10"
                  style={{ backgroundColor: color }}
               />
               <div>
                  <span className="text-sm font-medium">{status}. {STATUS_LABELS[status]}</span>
               </div>
            </div>
            {!editing && (
               <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground"
                  onClick={() => setEditing(true)}
               >
                  <PencilIcon className="size-3" />
                  {current?.remark ? "Edit" : "Add"}
               </Button>
            )}
         </div>

         {editing ? (
            <div className="flex flex-col gap-2">
               <Textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="Enter the TASIS screening standard text for this status…"
                  className="min-h-24 text-sm resize-y"
                  autoFocus
               />
               <div className="flex items-center justify-end gap-2">
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
         ) : (
            <p className={cn("text-sm leading-relaxed", current?.remark ? "text-foreground" : "text-muted-foreground italic")}>
               {current?.remark ?? "No standard text set."}
            </p>
         )}
      </div>
   )
}

export function StandardsForm({ data }: { data: TasisScreeningStandard[] }) {
   const existing: ExistingMap = new Map(data.map((r) => [Number(r.shariahStatus), r]))

   return (
      <div className="flex flex-col gap-3">
         {Array.from({ length: 9 }, (_, i) => i + 1).map((status) => (
            <StandardRow key={status} status={status} existing={existing} />
         ))}
      </div>
   )
}
