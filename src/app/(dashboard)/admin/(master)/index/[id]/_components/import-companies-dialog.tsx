"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
   UploadIcon,
   FileTextIcon,
   DownloadIcon,
   AlertCircleIcon,
   PlusCircleIcon,
   MinusCircleIcon,
   MinusIcon,
} from "lucide-react"

import { syncIndexCompanies, getAllCompanyNames } from "../../_actions"
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RowStatus = "add" | "no_change" | "remove" | "not_found"

type PreviewRow = {
   index: number
   name: string
   status: RowStatus
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

function parseCSV(text: string): string[] {
   return text
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/^["']|["']$/g, "").trim())
      .filter(Boolean)
}

function downloadTemplate() {
   const csv = ["company_name", "Infosys Ltd", "TCS Ltd", "HDFC Bank Ltd"].join("\n")
   const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
   const url = URL.createObjectURL(blob)
   const a = document.createElement("a")
   a.href = url
   a.download = "index-companies-template.csv"
   a.click()
   URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportCompaniesDialog({
   indexId,
   existingCompanies,
}: {
   indexId: string
   existingCompanies: { companyName: string }[]
}) {
   const [open, setOpen] = React.useState(false)
   const [fileName, setFileName] = React.useState<string | null>(null)
   const [preview, setPreview] = React.useState<PreviewRow[] | null>(null)
   const [activeTab, setActiveTab] = React.useState("add")
   const [allCompanyNames, setAllCompanyNames] = React.useState<Set<string>>(new Set())
   const [isFetching, setIsFetching] = React.useState(false)
   const [isPending, startTransition] = React.useTransition()
   const fileInputRef = React.useRef<HTMLInputElement>(null)
   const router = useRouter()

   // Fetch all company names from DB when dialog opens
   React.useEffect(() => {
      if (!open) return
      setIsFetching(true)
      getAllCompanyNames()
         .then((names) => setAllCompanyNames(new Set(names.map((n) => n.toLowerCase()))))
         .finally(() => setIsFetching(false))
   }, [open])

   function handleOpenChange(val: boolean) {
      if (!val) {
         setPreview(null)
         setFileName(null)
         setActiveTab("add")
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
         // Skip header row if it looks like a header
         const csvNames = lines[0]?.toLowerCase() === "company_name" ? lines.slice(1) : lines

         const existingInIndex = new Map(
            existingCompanies.map((c) => [c.companyName.toLowerCase(), c.companyName])
         )
         const seenInFile = new Set<string>()
         const rows: PreviewRow[] = []

         csvNames.forEach((name, i) => {
            const key = name.toLowerCase()
            // Skip file-level duplicates (first occurrence wins)
            if (seenInFile.has(key)) return
            seenInFile.add(key)

            let status: RowStatus
            if (existingInIndex.has(key)) {
               status = "no_change"
            } else if (allCompanyNames.has(key)) {
               status = "add"
            } else {
               status = "not_found"
            }
            rows.push({ index: i + 1, name, status })
         })

         // Companies currently in index but absent from CSV → will be removed
         existingCompanies.forEach((c, i) => {
            const key = c.companyName.toLowerCase()
            if (!seenInFile.has(key)) {
               rows.push({ index: csvNames.length + i + 1, name: c.companyName, status: "remove" })
            }
         })

         setPreview(rows)
         setActiveTab("add")
      }
      reader.readAsText(file)
   }

   const addRows = preview?.filter((r) => r.status === "add") ?? []
   const noChangeRows = preview?.filter((r) => r.status === "no_change") ?? []
   const removeRows = preview?.filter((r) => r.status === "remove") ?? []
   const notFoundRows = preview?.filter((r) => r.status === "not_found") ?? []

   const canSync = preview !== null && (addRows.length > 0 || removeRows.length > 0)

   function syncLabel() {
      if (!canSync) return "No Changes"
      const parts: string[] = []
      if (addRows.length > 0) parts.push(`Add ${addRows.length}`)
      if (removeRows.length > 0) parts.push(`Remove ${removeRows.length}`)
      return `Sync — ${parts.join(", ")}`
   }

   function handleSync() {
      if (!canSync) return
      // Send only valid CSV names (add + no_change); server removes the rest
      const namesToSync = [...addRows, ...noChangeRows].map((r) => r.name)
      startTransition(async () => {
         const result = await syncIndexCompanies(indexId, namesToSync)
         const parts: string[] = []
         if (result.added > 0) parts.push(`${result.added} added`)
         if (result.removed > 0) parts.push(`${result.removed} removed`)
         if (result.unchanged > 0) parts.push(`${result.unchanged} unchanged`)
         toast.success(parts.join(", ") + ".", {
            description: result.notFound.length > 0
               ? `${result.notFound.length} name(s) not found in company master.`
               : undefined,
         })
         handleOpenChange(false)
         router.refresh()
      })
   }

   return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
         <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1.5">
               <UploadIcon className="size-3.5" />
               Sync Companies
            </Button>
         </DialogTrigger>

         <DialogContent className="flex max-h-[90dvh] w-full flex-col overflow-hidden sm:max-w-2xl">
            <DialogHeader>
               <DialogTitle>Sync Index Companies</DialogTitle>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-4">
               <p className="text-xs text-muted-foreground">
                  Upload a CSV of company names. Companies in the file will be added; companies currently in the index but missing from the file will be removed.
               </p>

               {/* File picker */}
               <div className="flex flex-col gap-2">
                  <Empty
                     className={cn(
                        "gap-1 border p-4 transition-colors",
                        isFetching
                           ? "cursor-wait opacity-60"
                           : "cursor-pointer hover:bg-muted/40",
                        fileName ? "border-primary/40 bg-muted/20" : "",
                     )}
                     onClick={() => !isFetching && fileInputRef.current?.click()}
                  >
                     <EmptyMedia variant="icon">
                        {fileName ? <FileTextIcon className="text-primary" /> : <UploadIcon />}
                     </EmptyMedia>
                     <EmptyTitle className="text-sm">{fileName ?? "Click to upload CSV"}</EmptyTitle>
                     <EmptyDescription>
                        {isFetching
                           ? "Loading company data…"
                           : fileName
                           ? "Click to change file"
                           : "One company name per row"}
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
                     <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {addRows.length > 0 && (
                           <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <PlusCircleIcon className="size-3.5" />
                              {addRows.length} will be added
                           </span>
                        )}
                        {noChangeRows.length > 0 && (
                           <span className="flex items-center gap-1">
                              <MinusIcon className="size-3.5" />
                              {noChangeRows.length} no change
                           </span>
                        )}
                        {removeRows.length > 0 && (
                           <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                              <MinusCircleIcon className="size-3.5" />
                              {removeRows.length} will be removed
                           </span>
                        )}
                        {notFoundRows.length > 0 && (
                           <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                              <AlertCircleIcon className="size-3.5" />
                              {notFoundRows.length} not found in DB
                           </span>
                        )}
                     </div>

                     <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
                        <TabsList className="w-fit shrink-0">
                           <TabsTrigger value="add" className="gap-1.5">
                              Will Add
                              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{addRows.length}</span>
                           </TabsTrigger>
                           <TabsTrigger value="no-change" className="gap-1.5">
                              No Change
                              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{noChangeRows.length}</span>
                           </TabsTrigger>
                           <TabsTrigger value="remove" className="gap-1.5">
                              Will Remove
                              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{removeRows.length}</span>
                           </TabsTrigger>
                           <TabsTrigger value="not-found" className="gap-1.5">
                              Not Found
                              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{notFoundRows.length}</span>
                           </TabsTrigger>
                        </TabsList>

                        {/* Will Add */}
                        <TabsContent value="add" className="min-h-0 flex-1 overflow-auto rounded-xl border">
                           <Table>
                              <TableHeader className="bg-muted/60 sticky top-0 z-10">
                                 <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-10 pl-4 text-muted-foreground">#</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Company Name</TableHead>
                                 </TableRow>
                              </TableHeader>
                              <TableBody>
                                 {addRows.length === 0 ? (
                                    <TableRow><TableCell colSpan={2} className="h-24 text-center text-sm text-muted-foreground">No new companies to add.</TableCell></TableRow>
                                 ) : addRows.map((row) => (
                                    <TableRow key={row.index}>
                                       <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">{row.index}</TableCell>
                                       <TableCell className="pl-4 text-sm font-medium text-emerald-700 dark:text-emerald-400">{row.name}</TableCell>
                                    </TableRow>
                                 ))}
                              </TableBody>
                           </Table>
                        </TabsContent>

                        {/* No Change */}
                        <TabsContent value="no-change" className="min-h-0 flex-1 overflow-auto rounded-xl border">
                           <Table>
                              <TableHeader className="bg-muted/60 sticky top-0 z-10">
                                 <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-10 pl-4 text-muted-foreground">#</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Company Name</TableHead>
                                 </TableRow>
                              </TableHeader>
                              <TableBody>
                                 {noChangeRows.length === 0 ? (
                                    <TableRow><TableCell colSpan={2} className="h-24 text-center text-sm text-muted-foreground">None.</TableCell></TableRow>
                                 ) : noChangeRows.map((row) => (
                                    <TableRow key={row.index} className="opacity-50">
                                       <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">{row.index}</TableCell>
                                       <TableCell className="pl-4 text-sm">{row.name}</TableCell>
                                    </TableRow>
                                 ))}
                              </TableBody>
                           </Table>
                        </TabsContent>

                        {/* Will Remove */}
                        <TabsContent value="remove" className="min-h-0 flex-1 overflow-auto rounded-xl border">
                           <Table>
                              <TableHeader className="bg-muted/60 sticky top-0 z-10">
                                 <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-10 pl-4 text-muted-foreground">#</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Company Name</TableHead>
                                 </TableRow>
                              </TableHeader>
                              <TableBody>
                                 {removeRows.length === 0 ? (
                                    <TableRow><TableCell colSpan={2} className="h-24 text-center text-sm text-muted-foreground">No companies will be removed.</TableCell></TableRow>
                                 ) : removeRows.map((row) => (
                                    <TableRow key={row.index}>
                                       <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">{row.index}</TableCell>
                                       <TableCell className="pl-4 text-sm line-through text-red-600 dark:text-red-400 decoration-red-400/60">{row.name}</TableCell>
                                    </TableRow>
                                 ))}
                              </TableBody>
                           </Table>
                        </TabsContent>

                        {/* Not Found in DB */}
                        <TabsContent value="not-found" className="min-h-0 flex-1 overflow-auto rounded-xl border">
                           <Table>
                              <TableHeader className="bg-muted/60 sticky top-0 z-10">
                                 <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-10 pl-4 text-muted-foreground">#</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Company Name</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Status</TableHead>
                                 </TableRow>
                              </TableHeader>
                              <TableBody>
                                 {notFoundRows.length === 0 ? (
                                    <TableRow><TableCell colSpan={3} className="h-24 text-center text-sm text-muted-foreground">All names matched.</TableCell></TableRow>
                                 ) : notFoundRows.map((row) => (
                                    <TableRow key={row.index} className="opacity-70">
                                       <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">{row.index}</TableCell>
                                       <TableCell className="pl-4 text-sm text-amber-700 dark:text-amber-400">{row.name}</TableCell>
                                       <TableCell className="pl-4">
                                          <Badge variant="outline" className="gap-1 text-xs border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                                             <AlertCircleIcon className="size-3" />
                                             Not in company master
                                          </Badge>
                                       </TableCell>
                                    </TableRow>
                                 ))}
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
                  onClick={handleSync}
                  disabled={!canSync || isPending}
                  variant={removeRows.length > 0 ? "destructive" : "default"}
               >
                  {isPending ? "Syncing…" : syncLabel()}
                  {isPending && <Spinner className="ml-2" />}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   )
}
