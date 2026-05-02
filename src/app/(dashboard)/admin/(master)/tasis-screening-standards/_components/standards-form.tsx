"use client"

import * as React from "react"
import { toast } from "sonner"
import { CheckIcon, PencilIcon, XIcon } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Spinner } from "@/src/components/ui/spinner"
import { Textarea } from "@/src/components/ui/textarea"
import { upsertScreeningStandard, type ScreeningStandardRow } from "../_actions"

function ParameterRow({ row }: { row: ScreeningStandardRow }) {
   const [editing, setEditing] = React.useState(false)
   const [passValue, setPassValue] = React.useState(row.passRemark ?? "")
   const [failValue, setFailValue] = React.useState(row.failRemark ?? "")
   const [isPending, startTransition] = React.useTransition()

   function handleSave() {
      startTransition(async () => {
         const result = await upsertScreeningStandard(row.key, passValue, failValue)
         if (result.success) {
            toast.success("Standard saved.")
            setEditing(false)
         } else {
            toast.error(result.message ?? "Failed to save.")
         }
      })
   }

   function handleCancel() {
      setPassValue(row.passRemark ?? "")
      setFailValue(row.failRemark ?? "")
      setEditing(false)
   }

   return (
      <div className="flex flex-col gap-3 rounded-xl border p-4">
         <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{row.label}</span>
            {!editing && (
               <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground"
                  onClick={() => setEditing(true)}
               >
                  <PencilIcon className="size-3" />
                  {row.passRemark || row.failRemark ? "Edit" : "Add"}
               </Button>
            )}
         </div>

         {editing ? (
            <div className="flex flex-col gap-3">
               <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                     <label className="text-xs font-medium text-emerald-600">PASS Remark</label>
                     <Textarea
                        value={passValue}
                        onChange={(e) => setPassValue(e.target.value)}
                        placeholder="Text shown when this parameter passes…"
                        className="min-h-24 resize-y text-sm"
                     />
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <label className="text-xs font-medium text-red-600">FAIL Remark</label>
                     <Textarea
                        value={failValue}
                        onChange={(e) => setFailValue(e.target.value)}
                        placeholder="Text shown when this parameter fails…"
                        className="min-h-24 resize-y text-sm"
                     />
                  </div>
               </div>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
               <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-emerald-600">PASS</span>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                     {row.passRemark ?? <span className="italic">No remark set.</span>}
                  </p>
               </div>
               <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-red-600">FAIL</span>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                     {row.failRemark ?? <span className="italic">No remark set.</span>}
                  </p>
               </div>
            </div>
         )}
      </div>
   )
}

export function StandardsForm({ data }: { data: ScreeningStandardRow[] }) {
   return (
      <div className="flex flex-col gap-3">
         {data.map((row) => (
            <ParameterRow key={row.key} row={row} />
         ))}
      </div>
   )
}
