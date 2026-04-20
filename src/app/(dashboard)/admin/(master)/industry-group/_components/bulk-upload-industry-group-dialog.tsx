"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { UploadIcon, FileTextIcon, AlertCircleIcon, CheckCircle2Icon, XCircleIcon, DownloadIcon } from "lucide-react"

import { bulkCreateIndustryGroups } from "../_actions"
import { Button } from "@/src/components/ui/button"
import { Spinner } from "@/src/components/ui/spinner"
import { Badge } from "@/src/components/ui/badge"
import {
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/src/components/ui/dialog"
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/src/components/ui/table"
import {
   Empty,
   EmptyMedia,
   EmptyTitle,
   EmptyDescription,
} from "@/src/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs"
import { cn } from "@/src/lib/utils"

type RowStatus = "valid" | "duplicate_in_file" | "already_exists"

type PreviewRow = {
   index: number
   name: string
   status: RowStatus
}

function parseCSV(text: string): string[] {
   return text
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/^["']|["']$/g, "").trim())
      .filter(Boolean)
}

function validateRows(names: string[], existingNames: Set<string>): PreviewRow[] {
   const seenInFile = new Set<string>()
   return names.map((name, i) => {
      const lower = name.toLowerCase()
      let status: RowStatus = "valid"
      if (seenInFile.has(lower)) {
         status = "duplicate_in_file"
      } else if (existingNames.has(lower)) {
         status = "already_exists"
      }
      seenInFile.add(lower)
      return { index: i + 1, name, status }
   })
}

const STATUS_CONFIG: Record<RowStatus, { label: string; className: string; icon: React.ReactNode }> = {
   valid: {
      label: "Valid",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
      icon: <CheckCircle2Icon className="size-3" />,
   },
   duplicate_in_file: {
      label: "Duplicate in file",
      className: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
      icon: <AlertCircleIcon className="size-3" />,
   },
   already_exists: {
      label: "Already exists",
      className: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
      icon: <XCircleIcon className="size-3" />,
   },
}

function downloadTemplate() {
   const csv = "name\nTechnology\nHealthcare\nFinance"
   const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
   const url = URL.createObjectURL(blob)
   const a = document.createElement("a")
   a.href = url
   a.download = "industry-group-template.csv"
   a.click()
   URL.revokeObjectURL(url)
}

export function BulkUploadIndustryGroupDialog({
   existingNames,
}: {
   existingNames: string[]
}) {
   const [open, setOpen] = React.useState(false)
   const [preview, setPreview] = React.useState<PreviewRow[] | null>(null)
   const [fileName, setFileName] = React.useState<string | null>(null)
   const [activeTab, setActiveTab] = React.useState("new")
   const [isPending, startTransition] = React.useTransition()
   const fileInputRef = React.useRef<HTMLInputElement>(null)
   const router = useRouter()

   const existingSet = React.useMemo(
      () => new Set(existingNames.map((n) => n.toLowerCase())),
      [existingNames],
   )

   function handleOpenChange(val: boolean) {
      if (!val) {
         setPreview(null)
         setFileName(null)
         setActiveTab("new")
         if (fileInputRef.current) fileInputRef.current.value = ""
      }
      setOpen(val)
   }

   function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0]
      if (!file) return
      setFileName(file.name)
      const reader = new FileReader()
      reader.onload = (ev) => {
         const text = ev.target?.result as string
         const lines = parseCSV(text)
         // Skip a header row that literally says "name"
         const dataLines = lines[0]?.toLowerCase() === "name" ? lines.slice(1) : lines
         setPreview(validateRows(dataLines, existingSet))
         setActiveTab("new")
      }
      reader.readAsText(file)
   }

   const validRows = preview?.filter((r) => r.status === "valid") ?? []
   const skippedRows = preview?.filter((r) => r.status !== "valid") ?? []

   function handleImport() {
      if (validRows.length === 0) return
      startTransition(async () => {
         const result = await bulkCreateIndustryGroups(validRows.map((r) => r.name))
         toast.success(
            `${result.inserted.length} industry group${result.inserted.length !== 1 ? "s" : ""} imported.`,
            result.skipped.length > 0
               ? { description: `${result.skipped.length} skipped (already existed on server).` }
               : undefined,
         )
         handleOpenChange(false)
         router.refresh()
      })
   }

   return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
         <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
               <UploadIcon className="size-3.5" />
               Bulk Upload
            </Button>
         </DialogTrigger>

         <DialogContent className="flex max-h-[90dvh] w-full flex-col overflow-hidden sm:max-w-2xl">
            <DialogHeader>
               <DialogTitle>Bulk Upload Industry Groups</DialogTitle>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-4">
               {/* File picker area */}
               <div className="flex flex-col gap-2">
                  <Empty
                     className={cn(
                        "gap-1 cursor-pointer border p-4 transition-colors hover:bg-muted/40",
                        fileName ? "border-primary/40 bg-muted/20" : "",
                     )}
                     onClick={() => fileInputRef.current?.click()}
                  >
                     <EmptyMedia variant="icon">
                        {fileName ? <FileTextIcon className="text-primary" /> : <UploadIcon />}
                     </EmptyMedia>
                     <EmptyTitle className="text-sm">
                        {fileName ? fileName : "Click to upload CSV"}
                     </EmptyTitle>
                     <EmptyDescription>
                        {fileName ? "Click to change file" : "One industry group name per row. First column used."}
                     </EmptyDescription>
                     <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={handleFileChange}
                     />
                  </Empty>

                  <Button
                     type="button"
                     variant="ghost"
                     size="sm"
                     className="self-start gap-1.5 text-muted-foreground"
                     onClick={downloadTemplate}
                  >
                     <DownloadIcon className="size-3.5" />
                     Download template
                  </Button>
               </div>

               {/* Preview */}
               {preview !== null && (
                  <div className="flex min-h-0 flex-1 flex-col gap-2">
                     {/* Summary */}
                     <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{preview.length} rows parsed</span>
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                           <CheckCircle2Icon className="size-3.5" />
                           {validRows.length} new
                        </span>
                        {skippedRows.length > 0 && (
                           <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                              <XCircleIcon className="size-3.5" />
                              {skippedRows.length} will be skipped
                           </span>
                        )}
                     </div>

                     <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
                        <TabsList className="w-fit shrink-0">
                           <TabsTrigger value="new" className="gap-1.5">
                              New
                              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{validRows.length}</span>
                           </TabsTrigger>
                           <TabsTrigger value="skipped" className="gap-1.5">
                              Skipped
                              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{skippedRows.length}</span>
                           </TabsTrigger>
                        </TabsList>

                        <TabsContent value="new" className="min-h-0 flex-1 overflow-y-auto rounded-xl border">
                           <Table>
                              <TableHeader className="bg-muted/60 sticky top-0 z-10">
                                 <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-12 pl-4 text-muted-foreground">#</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Name</TableHead>
                                 </TableRow>
                              </TableHeader>
                              <TableBody>
                                 {validRows.length === 0 ? (
                                    <TableRow>
                                       <TableCell colSpan={2} className="h-24 text-center text-sm text-muted-foreground">
                                          No new rows.
                                       </TableCell>
                                    </TableRow>
                                 ) : validRows.map((row) => (
                                    <TableRow key={row.index}>
                                       <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">{row.index}</TableCell>
                                       <TableCell className="pl-4 text-sm font-medium">{row.name}</TableCell>
                                    </TableRow>
                                 ))}
                              </TableBody>
                           </Table>
                        </TabsContent>

                        <TabsContent value="skipped" className="min-h-0 flex-1 overflow-y-auto rounded-xl border">
                           <Table>
                              <TableHeader className="bg-muted/60 sticky top-0 z-10">
                                 <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-12 pl-4 text-muted-foreground">#</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Name</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Reason</TableHead>
                                 </TableRow>
                              </TableHeader>
                              <TableBody>
                                 {skippedRows.length === 0 ? (
                                    <TableRow>
                                       <TableCell colSpan={3} className="h-24 text-center text-sm text-muted-foreground">
                                          No skipped rows.
                                       </TableCell>
                                    </TableRow>
                                 ) : skippedRows.map((row) => {
                                    const cfg = STATUS_CONFIG[row.status]
                                    return (
                                       <TableRow key={row.index} className="opacity-60">
                                          <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">{row.index}</TableCell>
                                          <TableCell className="pl-4">
                                             <span className="text-sm font-medium line-through decoration-muted-foreground/40">{row.name}</span>
                                          </TableCell>
                                          <TableCell className="pl-4">
                                             <Badge variant="outline" className={cn("gap-1 text-xs font-medium", cfg.className)}>
                                                {cfg.icon}
                                                {cfg.label}
                                             </Badge>
                                          </TableCell>
                                       </TableRow>
                                    )
                                 })}
                              </TableBody>
                           </Table>
                        </TabsContent>
                     </Tabs>
                  </div>
               )}
            </div>

            <DialogFooter className="shrink-0">
               <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
                  Cancel
               </Button>
               <Button
                  onClick={handleImport}
                  disabled={!preview || validRows.length === 0 || isPending}
               >
                  {isPending ? "Importing…" : `Import ${validRows.length} group${validRows.length !== 1 ? "s" : ""}`}
                  {isPending && <Spinner className="ml-2" />}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   )
}
