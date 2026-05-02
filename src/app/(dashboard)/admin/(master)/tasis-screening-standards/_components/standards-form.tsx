"use client"

import * as React from "react"
import { toast } from "sonner"
import { CheckIcon, PencilIcon, XIcon } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Spinner } from "@/src/components/ui/spinner"
import { RichTextEditor } from "@/src/components/ui/rich-text-editor"
import { upsertScreeningStandard, upsertCommonRemark, type ScreeningStandardRow } from "../_actions"

function RemarkPreview({ html }: { html: string | null }) {
   if (!html) return <span className="italic text-muted-foreground">No remark set.</span>
   return (
      <div
         className="prose prose-sm max-w-none text-sm text-muted-foreground [&_ol]:ml-4 [&_ol]:list-decimal [&_ul]:ml-4 [&_ul]:list-disc"
         dangerouslySetInnerHTML={{ __html: html }}
      />
   )
}

function CommonRemarkSection({ initialValue }: { initialValue: string | null }) {
   const [editing, setEditing] = React.useState(false)
   const [value, setValue] = React.useState(initialValue ?? "")
   const [isPending, startTransition] = React.useTransition()

   function handleSave() {
      startTransition(async () => {
         const result = await upsertCommonRemark(value)
         if (result.success) {
            toast.success("Common note saved.")
            setEditing(false)
         } else {
            toast.error(result.message ?? "Failed to save.")
         }
      })
   }

   function handleCancel() {
      setValue(initialValue ?? "")
      setEditing(false)
   }

   return (
      <div className="flex flex-col gap-3 rounded-xl border p-4">
         <div className="flex items-center justify-between gap-3">
            <div>
               <span className="text-sm font-medium">Common Note</span>
               <p className="text-xs text-muted-foreground">
                  Shown to clients on the snapshot page as a general methodology note.
               </p>
            </div>
            {!editing && (
               <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground"
                  onClick={() => setEditing(true)}
               >
                  <PencilIcon className="size-3" />
                  {initialValue ? "Edit" : "Add"}
               </Button>
            )}
         </div>

         {editing ? (
            <div className="flex flex-col gap-3">
               <RichTextEditor
                  value={value}
                  onChange={setValue}
                  placeholder="Write a general methodology note shown on all snapshots…"
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
            <RemarkPreview html={initialValue} />
         )}
      </div>
   )
}

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
                     <RichTextEditor
                        value={passValue}
                        onChange={setPassValue}
                        placeholder="Text shown when this parameter passes…"
                     />
                  </div>
                  <div className="flex flex-col gap-1.5">
                     <label className="text-xs font-medium text-red-600">FAIL Remark</label>
                     <RichTextEditor
                        value={failValue}
                        onChange={setFailValue}
                        placeholder="Text shown when this parameter fails…"
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
                  <RemarkPreview html={row.passRemark} />
               </div>
               <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-red-600">FAIL</span>
                  <RemarkPreview html={row.failRemark} />
               </div>
            </div>
         )}
      </div>
   )
}

export function StandardsForm({
   data,
   commonRemark,
}: {
   data: ScreeningStandardRow[]
   commonRemark: string | null
}) {
   return (
      <div className="flex flex-col gap-3">
         <div />
         {data.map((row) => (
            <ParameterRow key={row.key} row={row} />
         ))}
         <hr/>
         <CommonRemarkSection initialValue={commonRemark} />
      </div>
   )
}
