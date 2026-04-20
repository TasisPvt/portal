"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
   UploadIcon,
   FileTextIcon,
   AlertCircleIcon,
   CheckCircle2Icon,
   XCircleIcon,
   DownloadIcon,
   AlertTriangleIcon,
   RefreshCwIcon,
   MinusIcon,
   PlusCircleIcon,
} from "lucide-react"

import { bulkUpsertCompanies, getCompaniesForBulkValidation, type CompanyForBulkValidation } from "../_actions"
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

type ExistingCompany = CompanyForBulkValidation

type IndustryGroupOption = { id: string; name: string }

type RowStatus =
   | "valid"
   | "will_update"
   | "no_change"
   | "duplicate_in_file"
   | "missing_required"

type FieldChange = {
   field: string
   from: string | null
   to: string | null
}

type PreviewRow = {
   index: number
   prowessId: string
   companyName: string
   isinCode: string
   serviceGroup: string
   bseScripCode?: string
   bseScripId?: string
   bseGroup?: string
   nseSymbol?: string
   nseListingDate?: string
   nseDelistingDate?: string
   bseListingDate?: string
   bseDelistingDate?: string
   industryGroupId?: string
   // set for will_update rows
   existingId?: string
   changes?: FieldChange[]
   status: RowStatus
   errorDetail?: string
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<RowStatus, { label: string; className: string; icon: React.ReactNode }> = {
   valid: {
      label: "New",
      className:
         "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
      icon: <PlusCircleIcon className="size-3" />,
   },
   will_update: {
      label: "Will update",
      className:
         "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400",
      icon: <RefreshCwIcon className="size-3" />,
   },
   no_change: {
      label: "No changes",
      className:
         "border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
      icon: <MinusIcon className="size-3" />,
   },
   duplicate_in_file: {
      label: "Duplicate in file",
      className:
         "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
      icon: <AlertCircleIcon className="size-3" />,
   },
   missing_required: {
      label: "Missing fields",
      className:
         "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
      icon: <XCircleIcon className="size-3" />,
   },
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

function parseCSVLine(line: string): string[] {
   const values: string[] = []
   let current = ""
   let inQuotes = false
   for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
         if (inQuotes && line[i + 1] === '"') {
            current += '"'
            i++
         } else {
            inQuotes = !inQuotes
         }
      } else if (ch === "," && !inQuotes) {
         values.push(current.trim())
         current = ""
      } else {
         current += ch
      }
   }
   values.push(current.trim())
   return values
}

function parseCSVtoRecords(text: string): Record<string, string>[] {
   const lines = text.split(/\r?\n/).filter((l) => l.trim())
   if (lines.length < 2) return []
   const rawHeaders = parseCSVLine(lines[0])
   const headers = rawHeaders.map((h) =>
      h
         .toLowerCase()
         .replace(/^["']|["']$/g, "")
         .trim(),
   )
   return lines.slice(1).map((line) => {
      const values = parseCSVLine(line)
      const obj: Record<string, string> = {}
      headers.forEach((h, i) => {
         obj[h] = values[i] ?? ""
      })
      return obj
   })
}

function col(row: Record<string, string>, ...keys: string[]): string {
   for (const k of keys) if (row[k]) return row[k].trim()
   return ""
}

function norm(v: string | null | undefined): string {
   return v?.trim() ?? ""
}

// Normalise any date representation to "YYYY-MM-DD".
// Handles:
//   "YYYY-MM-DD"              — DB format, pass through
//   "YYYY-MM-DDTHH:mm:ss..."  — ISO timestamp, strip time
//   "DD-MM-YYYY"              — CSV input format, reorder parts
//   "DD-Mon-YY"               — e.g. "06-Oct-08" → "2008-10-06"
//   empty / null              — return ""
const MONTH_MAP: Record<string, string> = {
   jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
   jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
}

function normDate(v: string | null | undefined): string {
   const s = v?.trim()
   if (!s) return ""
   // DD-Mon-YY (e.g. "06-Oct-08")
   const monYY = s.match(/^(\d{2})-([A-Za-z]{3})-(\d{2})$/)
   if (monYY) {
      const mm = MONTH_MAP[monYY[2].toLowerCase()]
      if (mm) {
         const yy = parseInt(monYY[3], 10)
         const yyyy = yy <= 30 ? `20${monYY[3].padStart(2, "0")}` : `19${monYY[3].padStart(2, "0")}`
         return `${yyyy}-${mm}-${monYY[1]}`
      }
   }
   // DD-MM-YYYY
   const dmy = s.match(/^(\d{2})-(\d{2})-(\d{4})$/)
   if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`
   // YYYY-MM-DD or ISO timestamp — take first 10 chars
   const ymd = s.match(/^(\d{4}-\d{2}-\d{2})/)
   if (ymd) return ymd[1]
   return s
}

function getChanges(
   existing: ExistingCompany,
   csv: Omit<PreviewRow, "index" | "status" | "existingId" | "changes" | "errorDetail">,
   igById: Map<string, string>,
): FieldChange[] {
   const changes: FieldChange[] = []

   const check = (
      field: string,
      fromRaw: string | null | undefined,
      toRaw: string | null | undefined,
   ) => {
      if (norm(fromRaw) !== norm(toRaw)) {
         changes.push({
            field,
            from: norm(fromRaw) || null,
            to: norm(toRaw) || null,
         })
      }
   }

   const checkDate = (
      field: string,
      fromRaw: string | null | undefined,
      toRaw: string | null | undefined,
   ) => {
      if (normDate(fromRaw) !== normDate(toRaw)) {
         changes.push({
            field,
            from: normDate(fromRaw) || null,
            to: normDate(toRaw) || null,
         })
      }
   }

   check("Company Name", existing.companyName, csv.companyName)
   check("ISIN Code", existing.isinCode, csv.isinCode)
   check("Service Group", existing.serviceGroup, csv.serviceGroup)
   check("BSE Scrip Code", existing.bseScripCode, csv.bseScripCode)
   check("BSE Scrip ID", existing.bseScripId, csv.bseScripId)
   check("BSE Group", existing.bseGroup, csv.bseGroup)
   check("NSE Symbol", existing.nseSymbol, csv.nseSymbol)
   checkDate("NSE Listing Date", existing.nseListingDate, csv.nseListingDate)
   checkDate("NSE Delisting Date", existing.nseDelistingDate, csv.nseDelistingDate)
   checkDate("BSE Listing Date", existing.bseListingDate, csv.bseListingDate)
   checkDate("BSE Delisting Date", existing.bseDelistingDate, csv.bseDelistingDate)

   // Industry group: compare by ID
   const existingIgId = norm(existing.industryGroupId)
   const csvIgId = norm(csv.industryGroupId)
   if (existingIgId !== csvIgId) {
      const fromName = existing.industryGroupName
      const toName = csv.industryGroupId ? igById.get(csv.industryGroupId) ?? csv.industryGroupId : null
      changes.push({ field: "Industry Group", from: fromName, to: toName ?? null })
   }

   return changes
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateRows(
   records: Record<string, string>[],
   existingMap: Map<string, ExistingCompany>,
   industryGroups: IndustryGroupOption[],
): PreviewRow[] {
   const seenInFile = new Set<string>()
   const igByName = new Map(industryGroups.map((g) => [g.name.toLowerCase(), g.id]))
   const igById = new Map(industryGroups.map((g) => [g.id, g.name]))

   return records.map((row, i) => {
      const prowessId = col(row, "prowess_id", "prowessid", "prowess id")
      const companyName = col(row, "company_name", "companyname", "company name", "name")
      const isinCode = col(row, "isin_code", "isincode", "isin code", "isin").toUpperCase()
      const serviceGroup = col(row, "service_group", "servicegroup", "service group")
      const igName = col(row, "industry_group_name", "industry_group", "industrygroupname", "industry group")

      const bseScripCode = col(row, "bse_scrip_code", "bsescripcode") || undefined
      const bseScripId = col(row, "bse_scrip_id", "bsescripid") || undefined
      const bseGroup = col(row, "bse_group", "bsegroup") || undefined
      const nseSymbol = col(row, "nse_symbol", "nsesymbol") || undefined
      const nseListingDate = normDate(col(row, "nse_listing_date", "nselistingdate")) || undefined
      const nseDelistingDate = normDate(col(row, "nse_delisting_date", "nsedelistingdate")) || undefined
      const bseListingDate = normDate(col(row, "bse_listing_date", "bselistingdate")) || undefined
      const bseDelistingDate = normDate(col(row, "bse_delisting_date", "bsedelistingdate")) || undefined
      const industryGroupId = igName ? igByName.get(igName.toLowerCase()) : undefined

      const csvFields = {
         prowessId,
         companyName,
         isinCode,
         serviceGroup,
         bseScripCode,
         bseScripId,
         bseGroup,
         nseSymbol,
         nseListingDate,
         nseDelistingDate,
         bseListingDate,
         bseDelistingDate,
         industryGroupId,
      }

      let status: RowStatus = "valid"
      let errorDetail: string | undefined
      let existingId: string | undefined
      let changes: FieldChange[] | undefined

      if (!prowessId || !companyName) {
         status = "missing_required"
         const missing = [
            !prowessId && "prowess_id",
            !companyName && "company_name",
         ]
            .filter(Boolean)
            .join(", ")
         errorDetail = `Missing: ${missing}`
      } else if (seenInFile.has(prowessId.toLowerCase())) {
         status = "duplicate_in_file"
      } else {
         seenInFile.add(prowessId.toLowerCase())
         const existing = existingMap.get(prowessId)
         if (existing) {
            existingId = existing.id
            changes = getChanges(existing, csvFields, igById)
            status = changes.length > 0 ? "will_update" : "no_change"
         } else {
            status = "valid"
         }
      }

      return {
         index: i + 1,
         ...csvFields,
         existingId,
         changes,
         status,
         errorDetail,
      }
   })
}

// ---------------------------------------------------------------------------
// Template download
// ---------------------------------------------------------------------------

function downloadTemplate() {
   const csv = [
      "prowess_id,company_name,isin_code,service_group,bse_scrip_code,bse_scrip_id,bse_group,nse_symbol,nse_listing_date,nse_delisting_date,bse_listing_date,bse_delisting_date,industry_group_name",
      "10001,Infosys Ltd,INE009A01021,IT Services,500209,INFY,A,INFY,1993-06-01,,1993-06-01,,Information Technology",
      "10002,TCS Ltd,INE467B01029,IT Services,532540,TCS,A,TCS,2004-08-25,,2004-08-25,,Information Technology",
   ].join("\n")
   const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
   const url = URL.createObjectURL(blob)
   const a = document.createElement("a")
   a.href = url
   a.download = "company-template.csv"
   a.click()
   URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BulkUploadCompanyDialog({
   industryGroups,
}: {
   industryGroups: IndustryGroupOption[]
}) {
   const [open, setOpen] = React.useState(false)
   const [preview, setPreview] = React.useState<PreviewRow[] | null>(null)
   const [fileName, setFileName] = React.useState<string | null>(null)
   const [activeTab, setActiveTab] = React.useState("new")
   const [existingData, setExistingData] = React.useState<ExistingCompany[]>([])
   const [isFetchingExisting, setIsFetchingExisting] = React.useState(false)
   const [isPending, startTransition] = React.useTransition()
   const fileInputRef = React.useRef<HTMLInputElement>(null)
   const router = useRouter()

   const existingMap = React.useMemo(
      () => new Map(existingData.map((c) => [c.prowessId, c])),
      [existingData],
   )

   React.useEffect(() => {
      if (!open) return
      setIsFetchingExisting(true)
      getCompaniesForBulkValidation()
         .then(setExistingData)
         .finally(() => setIsFetchingExisting(false))
   }, [open])

   function handleOpenChange(val: boolean) {
      if (!val) {
         setPreview(null)
         setFileName(null)
         setActiveTab("new")
         setExistingData([])
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
         const records = parseCSVtoRecords(text)
         setPreview(validateRows(records, existingMap, industryGroups))
         setActiveTab("new")
      }
      reader.readAsText(file)
   }

   const newRows = preview?.filter((r) => r.status === "valid") ?? []
   const updateRows = preview?.filter((r) => r.status === "will_update") ?? []
   const noChangeRows = preview?.filter((r) => r.status === "no_change") ?? []
   const skippedRows = preview?.filter((r) =>
      r.status === "duplicate_in_file" || r.status === "missing_required"
   ) ?? []

   const canImport = newRows.length > 0 || updateRows.length > 0

   function importLabel() {
      const parts: string[] = []
      if (newRows.length > 0)
         parts.push(`${newRows.length} new`)
      if (updateRows.length > 0)
         parts.push(`update ${updateRows.length}`)
      if (parts.length === 0) return "Nothing to import"
      return `Import — ${parts.join(", ")}`
   }

   const BATCH_SIZE = 500

   function toInsertInput(r: PreviewRow) {
      return {
         prowessId: r.prowessId,
         companyName: r.companyName,
         isinCode: r.isinCode,
         serviceGroup: r.serviceGroup,
         bseScripCode: r.bseScripCode,
         bseScripId: r.bseScripId,
         bseGroup: r.bseGroup,
         nseSymbol: r.nseSymbol,
         nseListingDate: r.nseListingDate,
         nseDelistingDate: r.nseDelistingDate,
         bseListingDate: r.bseListingDate,
         bseDelistingDate: r.bseDelistingDate,
         industryGroupId: r.industryGroupId,
      }
   }

   function toUpdateInput(r: PreviewRow) {
      return { id: r.existingId!, input: toInsertInput(r) }
   }

   function chunk<T>(arr: T[], size: number): T[][] {
      const out: T[][] = []
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
      return out
   }

   function handleImport() {
      if (!canImport) return
      startTransition(async () => {
         const insertBatches = chunk(newRows.map(toInsertInput), BATCH_SIZE)
         const updateBatches = chunk(updateRows.map(toUpdateInput), BATCH_SIZE)

         let totalInserted = 0
         let totalUpdated = 0
         let totalSkipped = 0

         // Process insert batches
         for (const batch of insertBatches) {
            const result = await bulkUpsertCompanies(batch, [])
            totalInserted += result.inserted
            totalSkipped += result.skipped.length
         }

         // Process update batches
         for (const batch of updateBatches) {
            const result = await bulkUpsertCompanies([], batch)
            totalUpdated += result.updated
            totalSkipped += result.skipped.length
         }

         const parts: string[] = []
         if (totalInserted > 0) parts.push(`${totalInserted} inserted`)
         if (totalUpdated > 0) parts.push(`${totalUpdated} updated`)
         toast.success(parts.join(", ") + ".", {
            description: totalSkipped > 0 ? `${totalSkipped} skipped on server.` : undefined,
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
               Bulk Upload
            </Button>
         </DialogTrigger>

         <DialogContent className="flex max-h-[90dvh] w-full flex-col overflow-hidden sm:max-w-4xl">
            <DialogHeader>
               <DialogTitle>Bulk Upload Companies</DialogTitle>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-4">
               {/* File picker */}
               <div className="flex flex-col gap-2">
                  <Empty
                     className={cn(
                        "gap-1 border p-4 transition-colors",
                        isFetchingExisting
                           ? "cursor-wait opacity-60"
                           : "cursor-pointer hover:bg-muted/40",
                        fileName ? "border-primary/40 bg-muted/20" : "",
                     )}
                     onClick={() => !isFetchingExisting && fileInputRef.current?.click()}
                  >
                     <EmptyMedia variant="icon">
                        {fileName ? <FileTextIcon className="text-primary" /> : <UploadIcon />}
                     </EmptyMedia>
                     <EmptyTitle className="text-sm">
                        {fileName ? fileName : "Click to upload CSV"}
                     </EmptyTitle>
                     <EmptyDescription>
                        {isFetchingExisting
                           ? "Loading existing data…"
                           : fileName
                           ? "Click to change file"
                           : "Required columns: prowess_id, company_name"}
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
                     <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{preview.length} rows parsed</span>
                        {newRows.length > 0 && (
                           <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <PlusCircleIcon className="size-3.5" />
                              {newRows.length} new
                           </span>
                        )}
                        {updateRows.length > 0 && (
                           <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                              <RefreshCwIcon className="size-3.5" />
                              {updateRows.length} will update
                           </span>
                        )}
                        {noChangeRows.length > 0 && (
                           <span className="flex items-center gap-1">
                              <MinusIcon className="size-3.5" />
                              {noChangeRows.length} no changes
                           </span>
                        )}
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
                              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{newRows.length}</span>
                           </TabsTrigger>
                           <TabsTrigger value="update" className="gap-1.5">
                              Will Update
                              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{updateRows.length}</span>
                           </TabsTrigger>
                           <TabsTrigger value="no-change" className="gap-1.5">
                              No Changes
                              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{noChangeRows.length}</span>
                           </TabsTrigger>
                           <TabsTrigger value="skipped" className="gap-1.5">
                              Skipped
                              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{skippedRows.length}</span>
                           </TabsTrigger>
                        </TabsList>

                        {/* New */}
                        <TabsContent value="new" className="min-h-0 flex-1 overflow-auto rounded-xl border">
                           <Table>
                              <TableHeader className="bg-muted/60 sticky top-0 z-10">
                                 <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-10 pl-4 text-muted-foreground">#</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Prowess ID</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Company</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">ISIN</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Service Group</TableHead>
                                 </TableRow>
                              </TableHeader>
                              <TableBody>
                                 {newRows.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">No new rows.</TableCell></TableRow>
                                 ) : newRows.map((row) => (
                                    <TableRow key={row.index}>
                                       <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">{row.index}</TableCell>
                                       <TableCell className="pl-4"><span className="font-mono text-xs">{row.prowessId}</span></TableCell>
                                       <TableCell className="pl-4 max-w-44"><span className="text-sm font-medium truncate block">{row.companyName}</span></TableCell>
                                       <TableCell className="pl-4"><span className="font-mono text-xs">{row.isinCode || <span className="italic text-muted-foreground">—</span>}</span></TableCell>
                                       <TableCell className="pl-4"><span className="text-sm">{row.serviceGroup || <span className="italic text-muted-foreground">—</span>}</span></TableCell>
                                    </TableRow>
                                 ))}
                              </TableBody>
                           </Table>
                        </TabsContent>

                        {/* Will Update */}
                        <TabsContent value="update" className="min-h-0 flex-1 overflow-auto rounded-xl border">
                           <Table>
                              <TableHeader className="bg-muted/60 sticky top-0 z-10">
                                 <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-10 pl-4 text-muted-foreground">#</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Prowess ID</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Company</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">ISIN</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Service Group</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Changed Fields</TableHead>
                                 </TableRow>
                              </TableHeader>
                              <TableBody>
                                 {updateRows.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center text-sm text-muted-foreground">No rows to update.</TableCell></TableRow>
                                 ) : updateRows.map((row) => (
                                    <TableRow key={row.index}>
                                       <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">{row.index}</TableCell>
                                       <TableCell className="pl-4"><span className="font-mono text-xs">{row.prowessId}</span></TableCell>
                                       <TableCell className="pl-4 max-w-44"><span className="text-sm font-medium truncate block">{row.companyName}</span></TableCell>
                                       <TableCell className="pl-4"><span className="font-mono text-xs">{row.isinCode || <span className="italic text-muted-foreground">—</span>}</span></TableCell>
                                       <TableCell className="pl-4"><span className="text-sm">{row.serviceGroup || <span className="italic text-muted-foreground">—</span>}</span></TableCell>
                                       <TableCell className="pl-4">
                                          <span className="text-xs text-muted-foreground">
                                             {row.changes?.map((c) => c.field).join(", ") ?? "—"}
                                          </span>
                                       </TableCell>
                                    </TableRow>
                                 ))}
                              </TableBody>
                           </Table>
                        </TabsContent>

                        {/* No Changes */}
                        <TabsContent value="no-change" className="min-h-0 flex-1 overflow-auto rounded-xl border">
                           <Table>
                              <TableHeader className="bg-muted/60 sticky top-0 z-10">
                                 <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-10 pl-4 text-muted-foreground">#</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Prowess ID</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Company</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">ISIN</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Service Group</TableHead>
                                 </TableRow>
                              </TableHeader>
                              <TableBody>
                                 {noChangeRows.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">No unchanged rows.</TableCell></TableRow>
                                 ) : noChangeRows.map((row) => (
                                    <TableRow key={row.index} className="opacity-50">
                                       <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">{row.index}</TableCell>
                                       <TableCell className="pl-4"><span className="font-mono text-xs">{row.prowessId}</span></TableCell>
                                       <TableCell className="pl-4 max-w-44"><span className="text-sm font-medium truncate block">{row.companyName}</span></TableCell>
                                       <TableCell className="pl-4"><span className="font-mono text-xs">{row.isinCode || <span className="italic text-muted-foreground">—</span>}</span></TableCell>
                                       <TableCell className="pl-4"><span className="text-sm">{row.serviceGroup || <span className="italic text-muted-foreground">—</span>}</span></TableCell>
                                    </TableRow>
                                 ))}
                              </TableBody>
                           </Table>
                        </TabsContent>

                        {/* Skipped */}
                        <TabsContent value="skipped" className="min-h-0 flex-1 overflow-auto rounded-xl border">
                           <Table>
                              <TableHeader className="bg-muted/60 sticky top-0 z-10">
                                 <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-10 pl-4 text-muted-foreground">#</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Prowess ID</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Company</TableHead>
                                    <TableHead className="pl-4 text-muted-foreground">Reason</TableHead>
                                 </TableRow>
                              </TableHeader>
                              <TableBody>
                                 {skippedRows.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">No skipped rows.</TableCell></TableRow>
                                 ) : skippedRows.map((row) => {
                                    const cfg = STATUS_CONFIG[row.status]
                                    return (
                                       <TableRow key={row.index} className="opacity-60">
                                          <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">{row.index}</TableCell>
                                          <TableCell className="pl-4"><span className="font-mono text-xs">{row.prowessId || <span className="italic">—</span>}</span></TableCell>
                                          <TableCell className="pl-4 max-w-44"><span className="text-sm font-medium truncate block line-through decoration-muted-foreground/40">{row.companyName || <span className="italic">—</span>}</span></TableCell>
                                          <TableCell className="pl-4">
                                             <div className="flex flex-col gap-0.5">
                                                <Badge variant="outline" className={cn("gap-1 text-xs font-medium w-fit", cfg.className)}>
                                                   {cfg.icon}
                                                   {cfg.label}
                                                </Badge>
                                                {row.errorDetail && <span className="text-xs text-muted-foreground">{row.errorDetail}</span>}
                                             </div>
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
               <Button onClick={handleImport} disabled={!preview || !canImport || isPending}>
                  {isPending ? "Importing…" : importLabel()}
                  {isPending && <Spinner className="ml-2" />}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   )
}
