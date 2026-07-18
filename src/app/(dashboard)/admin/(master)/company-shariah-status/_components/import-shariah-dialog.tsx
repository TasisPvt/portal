"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
   UploadIcon,
   FileTextIcon,
   DownloadIcon,
   AlertCircleIcon,
   AlertTriangleIcon,
   PlusCircleIcon,
   RefreshCwIcon,
   XCircleIcon,
   MinusCircleIcon,
} from "lucide-react"

import { getImportContext, importShariahData, type ShariahImportRow, type ExistingShariahEntry } from "../_actions"
import { formatMonthLabel } from "../_utils"
import { Button } from "@/src/components/ui/button"
import { MonthYearPicker } from "@/src/components/month-year-picker"
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
import { SHARIAH_STATUS_LABELS } from "./shariah-table"

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

const PAGE_SIZE = 100

function usePagination<T>(rows: T[]) {
   const [page, setPage] = React.useState(0)
   React.useEffect(() => setPage(0), [rows])
   const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
   const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
   return { page, setPage, totalPages, pageRows }
}

function PaginationBar({
   page,
   totalPages,
   count,
   total,
   onPrev,
   onNext,
}: {
   page: number
   totalPages: number
   count: number
   total: number
   onPrev: () => void
   onNext: () => void
}) {
   if (total <= PAGE_SIZE) return null
   const from = page * PAGE_SIZE + 1
   const to = from + count - 1
   return (
      <div className="flex shrink-0 items-center justify-between border-t bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
         <span>
            Showing {from}–{to} of {total}
         </span>
         <div className="flex items-center gap-2">
            <button
               onClick={onPrev}
               disabled={page === 0}
               className="rounded px-2 py-1 hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            >
               ← Prev
            </button>
            <span className="tabular-nums">
               {page + 1} / {totalPages}
            </span>
            <button
               onClick={onNext}
               disabled={page >= totalPages - 1}
               className="rounded px-2 py-1 hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
            >
               Next →
            </button>
         </div>
      </div>
   )
}

// ---------------------------------------------------------------------------
// CSV parsing helpers
// ---------------------------------------------------------------------------

function parseBool(v: string | undefined): boolean | null {
   if (!v) return null
   const s = v.trim().toLowerCase()
   if (s === "na" || s === "n/a") return null
   if (s === "true" || s === "1" || s === "yes") return true
   if (s === "false" || s === "0" || s === "no") return false
   return null
}

// Normalise a raw numeric string: strip thousands-commas and convert
// accounting-negative "(1,234.56)" → "-1234.56".
function normaliseNumStr(raw: string): string {
   let s = raw.trim()
   // Accounting-negative: (1,234.56) → -1234.56
   if (s.startsWith("(") && s.endsWith(")")) {
      s = "-" + s.slice(1, -1)
   }
   // Remove thousands separators (commas not used as decimal point here)
   s = s.replace(/,/g, "")
   return s
}

function parseNum(v: string | undefined): string | null {
   if (!v) return null
   const s = normaliseNumStr(v)
   if (s === "" || s === "-") return null
   const n = parseFloat(s)
   return isNaN(n) ? null : s
}

// Blank or "-" counts as 0 (not missing) for ratio fields.
function parseNumOrZero(v: string | undefined): string {
   if (!v) return "0"
   const s = normaliseNumStr(v)
   if (s === "" || s === "-") return "0"
   const n = parseFloat(s)
   return isNaN(n) ? "0" : s
}

const MONTH_ABBR: Record<string, string> = {
   jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
   jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
}

// Accepts YYYY-MM-DD (ISO), D-Mon-YY, DD-Mon-YYYY, DD/MM/YYYY, DD-MM-YYYY. Returns null for invalid/placeholder dates.
function parseDate(v: string | undefined): string | null {
   if (!v) return null
   const s = v.trim()
   if (!s) return null
   // Zero or all-zero strings ("0", "00", "0000") → treat as empty
   if (/^0+$/.test(s)) return null
   // ISO YYYY-MM-DD
   if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [, m, d] = s.split("-").map(Number)
      if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return s
      return null
   }
   // D-Mon-YY or DD-Mon-YYYY (e.g. "25-Jan-23", "0-Jan-00" placeholder → null)
   const monMatch = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/)
   if (monMatch) {
      const day = parseInt(monMatch[1], 10)
      const mon = MONTH_ABBR[monMatch[2].toLowerCase()]
      if (!mon || day < 1 || day > 31) return null
      const yr = parseInt(monMatch[3], 10)
      const year = monMatch[3].length === 2 ? (yr >= 50 ? 1900 + yr : 2000 + yr) : yr
      return `${String(year).padStart(4, "0")}-${mon}-${String(day).padStart(2, "0")}`
   }
   // DD/MM/YYYY
   const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
   if (slashMatch) {
      const day = parseInt(slashMatch[1], 10)
      const mon = parseInt(slashMatch[2], 10)
      const year = parseInt(slashMatch[3], 10)
      if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31)
         return `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      return null
   }
   // DD-MM-YYYY (numeric month with dashes, e.g. "21-05-2026")
   const dashNumMatch = s.match(/^(\d{1,2})-(\d{2})-(\d{4})$/)
   if (dashNumMatch) {
      const day = parseInt(dashNumMatch[1], 10)
      const mon = parseInt(dashNumMatch[2], 10)
      const year = parseInt(dashNumMatch[3], 10)
      if (mon >= 1 && mon <= 12 && day >= 1 && day <= 31)
         return `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`
      return null
   }
   return null
}

function parseShariahStatus(v: string | undefined): number | null {
   if (!v) return null
   const n = parseInt(v.trim(), 10)
   if (isNaN(n) || n < 1 || n > 9) return null
   return n
}

function parseCSVLine(line: string): string[] {
   const result: string[] = []
   let current = ""
   let inQuotes = false
   for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
         inQuotes = !inQuotes
      } else if (ch === "," && !inQuotes) {
         result.push(current.trim())
         current = ""
      } else {
         current += ch
      }
   }
   result.push(current.trim())
   return result
}

type ParseIssue = { field: string; rawValue: string }
type RawParsedRow = ShariahImportRow & { _parseIssues?: ParseIssue[] }

function parseCSV(text: string): RawParsedRow[] {
   const lines = text.split(/\r?\n/).filter((l) => l.trim())
   if (lines.length < 2) return []

   const headers = parseCSVLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"))

   const col = (row: string[], name: string) => {
      const idx = headers.indexOf(name)
      return idx >= 0 ? row[idx] : undefined
   }

   return lines.slice(1).map((line) => {
      const row = parseCSVLine(line)
      const issues: ParseIssue[] = []

      // assessment_year is optional - empty or placeholder ("00-Jan-00") are valid nulls
      const assessmentYear = parseDate(col(row, "assessment_year"))

      // last_updated_at is required - flag if a value exists but can't be parsed
      const rawLastUpdatedAt = col(row, "last_updated_at")?.trim()
      const lastUpdatedAt = parseDate(rawLastUpdatedAt)
      if (rawLastUpdatedAt && !lastUpdatedAt) {
         issues.push({ field: "Last Updated At", rawValue: rawLastUpdatedAt })
      }

      return {
         prowessId: col(row, "prowess_id")?.trim() ?? "",
         assessmentYear,
         marketCap: parseNum(col(row, "market_cap")),
         companyStatus: col(row, "company_status")?.trim() || null,
         shariahStatus: parseShariahStatus(col(row, "shariah_status")),
         lastFinancialData: parseBool(col(row, "last_financial_data")),
         primaryBusiness: parseBool(col(row, "primary_business")),
         secondaryBusiness: parseBool(col(row, "secondary_business")),
         compliantOnInvestment: parseBool(col(row, "compliant_on_investment")),
         incompleteBusInfo: parseBool(col(row, "incomplete_bus_info")),
         totalDebtTotalAssetValue: parseNumOrZero(col(row, "total_debt_total_asset_value")),
         totalDebtTotalAssetStatus: parseBool(col(row, "total_debt_total_asset_status")),
         totalInterestIncomeTotalIncomeValue: parseNumOrZero(col(row, "total_interest_income_total_income_value")),
         totalInterestIncomeTotalIncomeStatus: parseBool(col(row, "total_interest_income_total_income_status")),
         cashBankReceivablesTotalAssetValue: parseNumOrZero(col(row, "cash_bank_receivables_total_asset_value")),
         cashBankReceivablesTotalAssetStatus: parseBool(col(row, "cash_bank_receivables_total_asset_status")),
         remark: col(row, "remark")?.trim() || null,
         lastUpdatedAt,
         ...(issues.length > 0 ? { _parseIssues: issues } : {}),
      }
   }).filter((r) => r.prowessId)
}

function downloadTemplate() {
   const headers = [
      "prowess_id", "assessment_year", "market_cap", "company_status", "shariah_status",
      "last_financial_data", "primary_business", "secondary_business",
      "compliant_on_investment", "incomplete_bus_info",
      "total_debt_total_asset_value", "total_debt_total_asset_status",
      "total_interest_income_total_income_value", "total_interest_income_total_income_status",
      "cash_bank_receivables_total_asset_value", "cash_bank_receivables_total_asset_status",
      "remark", "last_updated_at",
   ]
   const sample = [
      "10001", "2022-03-31", "2608204.55", "Consolidated", "1",
      "true", "true", "false",
      "true", "true",
      "5.35", "true",
      "16.5", "true",
      "56.48", "false",
      "", "2026-04-25",
   ]
   const csv = [headers.join(","), sample.join(",")].join("\n")
   const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
   const url = URL.createObjectURL(blob)
   const a = document.createElement("a")
   a.href = url
   a.download = "shariah-status-template.csv"
   a.click()
   URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Compliance cascade
// ---------------------------------------------------------------------------

const CASCADE_CHAIN = [
   "lastFinancialData",
   "incompleteBusInfo",
   "primaryBusiness",
   "secondaryBusiness",
   "compliantOnInvestment",
] as const satisfies readonly (keyof ShariahImportRow)[]

// Mirrors the server-action cascade: once a step is not `true`, all subsequent steps → null.
function applyComplianceCascade(row: ShariahImportRow): ShariahImportRow {
   const result = { ...row }
   let cascadeNull = false
   for (const field of CASCADE_CHAIN) {
      if (cascadeNull) {
         result[field] = null
      } else if (result[field] !== true) {
         cascadeNull = true
      }
   }
   return result
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const REQUIRED_FIELDS: { key: keyof ShariahImportRow; label: string }[] = [
   { key: "companyStatus", label: "Company Status" },
   { key: "shariahStatus", label: "Shariah Status" },
   { key: "lastFinancialData", label: "Last Financial Data" },
   { key: "incompleteBusInfo", label: "Incomplete Bus. Info" },
   { key: "primaryBusiness", label: "Primary Business" },
   { key: "secondaryBusiness", label: "Secondary Business" },
   { key: "compliantOnInvestment", label: "Compliant on Investment" },
   { key: "totalDebtTotalAssetValue", label: "Total Debt/Asset Value" },
   { key: "totalDebtTotalAssetStatus", label: "Total Debt/Asset Status" },
   { key: "totalInterestIncomeTotalIncomeValue", label: "Interest Income/Total Income Value" },
   { key: "totalInterestIncomeTotalIncomeStatus", label: "Interest Income/Total Income Status" },
   { key: "cashBankReceivablesTotalAssetValue", label: "Cash+Receivables/Asset Value" },
   { key: "cashBankReceivablesTotalAssetStatus", label: "Cash+Receivables/Asset Status" },
   { key: "lastUpdatedAt", label: "Last Updated At" },
]

// Returns missing required fields, skipping cascade chain fields that are
// downstream of the first failing step (those are intentionally NA, not missing).
function getMissingFields(row: ShariahImportRow): string[] {
   // Find the index of the first cascade step that is not `true`
   const breakIdx = CASCADE_CHAIN.findIndex((f) => row[f] !== true)
   // breakIdx === -1 means all steps pass; otherwise steps after breakIdx are cascaded out

   return REQUIRED_FIELDS.filter(({ key }) => {
      const chainIdx = CASCADE_CHAIN.indexOf(key as (typeof CASCADE_CHAIN)[number])
      // Cascade chain fields beyond the failing step are NA - not required
      if (chainIdx !== -1 && breakIdx !== -1 && chainIdx > breakIdx) return false
      const v = row[key]
      return v === null || v === undefined || v === ""
   }).map(({ label }) => label)
}

// ---------------------------------------------------------------------------
// Field-change detection
// ---------------------------------------------------------------------------

const COMPARE_FIELDS: { key: keyof ShariahImportRow; dbKey: keyof ExistingShariahEntry; label: string }[] = [
   { key: "shariahStatus", dbKey: "shariahStatus", label: "Shariah Status" },
   { key: "companyStatus", dbKey: "companyStatus", label: "Comp. Status" },
   { key: "lastFinancialData", dbKey: "lastFinancialData", label: "Fin. Data" },
   { key: "incompleteBusInfo", dbKey: "incompleteBusInfo", label: "Inc. Bus. Info" },
   { key: "primaryBusiness", dbKey: "primaryBusiness", label: "Primary Bus." },
   { key: "secondaryBusiness", dbKey: "secondaryBusiness", label: "Secondary Bus." },
   { key: "compliantOnInvestment", dbKey: "compliantOnInvestment", label: "Inv. Comp." },
   { key: "totalDebtTotalAssetValue", dbKey: "totalDebtTotalAssetValue", label: "Debt/Asset Val." },
   { key: "totalDebtTotalAssetStatus", dbKey: "totalDebtTotalAssetStatus", label: "Debt/Asset Status" },
   { key: "totalInterestIncomeTotalIncomeValue", dbKey: "totalInterestIncomeTotalIncomeValue", label: "Int/Income Val." },
   { key: "totalInterestIncomeTotalIncomeStatus", dbKey: "totalInterestIncomeTotalIncomeStatus", label: "Int/Income Status" },
   { key: "cashBankReceivablesTotalAssetValue", dbKey: "cashBankReceivablesTotalAssetValue", label: "Cash/Asset Val." },
   { key: "cashBankReceivablesTotalAssetStatus", dbKey: "cashBankReceivablesTotalAssetStatus", label: "Cash/Asset Status" },
   { key: "marketCap", dbKey: "marketCap", label: "Market Cap" },
   { key: "remark", dbKey: "remark", label: "Remark" },
]

function getChangedFields(row: ShariahImportRow, existing: ExistingShariahEntry): string[] {
   return COMPARE_FIELDS.filter(({ key, dbKey }) => {
      const nv = row[key]
      const ov = existing[dbKey]
      // Numeric strings: compare as floats (ignore precision noise)
      if (typeof nv === "string" && typeof ov === "string") {
         const fn = parseFloat(nv)
         const fo = parseFloat(ov)
         if (!isNaN(fn) && !isNaN(fo)) return Math.abs(fn - fo) > 0.001
      }
      return nv !== ov
   }).map(({ label }) => label)
}

// ---------------------------------------------------------------------------
// Preview row types
// ---------------------------------------------------------------------------

type PreviewStatus = "new" | "update" | "no_change" | "not_found" | "invalid"

type PreviewRow = ShariahImportRow & {
   _status: PreviewStatus
   _missingFields?: string[]
   _changedFields?: string[]
   _parseIssues?: ParseIssue[]
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportShariahDialog({
   currentMonth,
   monthsWithData,
   canBackdate,
}: {
   currentMonth: string
   monthsWithData: string[]
   canBackdate: boolean
}) {
   const [open, setOpen] = React.useState(false)
   const [fileName, setFileName] = React.useState<string | null>(null)
   const [rawRows, setRawRows] = React.useState<RawParsedRow[] | null>(null)
   const [activeTab, setActiveTab] = React.useState("new")
   const [targetMonth, setTargetMonth] = React.useState(currentMonth)
   const [existingProwessIds, setExistingProwessIds] = React.useState<Set<string>>(new Set())
   const [companyNames, setCompanyNames] = React.useState<Record<string, string>>({})
   const [existingShariahData, setExistingShariahData] = React.useState<Record<string, ExistingShariahEntry>>({})
   const [isFetching, setIsFetching] = React.useState(false)
   const [isPending, startTransition] = React.useTransition()
   const fileInputRef = React.useRef<HTMLInputElement>(null)
   const router = useRouter()

   const monthsWithDataSet = React.useMemo(() => new Set(monthsWithData), [monthsWithData])

   // Re-fetch the existing-data context whenever the dialog opens or the target
   // month changes, so New/Update/No-change diffing reflects the chosen month.
   React.useEffect(() => {
      if (!open) return
      setIsFetching(true)
      getImportContext(targetMonth)
         .then(({ existingProwessIds, companyNames, existingShariahData }) => {
            setExistingProwessIds(existingProwessIds)
            setCompanyNames(companyNames)
            setExistingShariahData(existingShariahData)
         })
         .finally(() => setIsFetching(false))
   }, [open, targetMonth])

   function handleOpenChange(val: boolean) {
      if (!val) {
         setRawRows(null)
         setFileName(null)
         setActiveTab("new")
         setTargetMonth(currentMonth)
         if (fileInputRef.current) fileInputRef.current.value = ""
      }
      setOpen(val)
   }

   function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
      const file = e.target.files?.[0]
      if (!file) return
      setFileName(file.name)
      setRawRows(null)
      setActiveTab("new")
      const reader = new FileReader()
      reader.onload = (ev) => {
         const text = ev.target?.result as string
         const parsed = parseCSV(text)

         const parseIssueCount = parsed.filter((r) => r._parseIssues && r._parseIssues.length > 0).length
         if (parseIssueCount > 0) {
            toast.warning(`${parseIssueCount} row${parseIssueCount > 1 ? "s" : ""} have unrecognised field values`, {
               description: "Check the Invalid tab for details. Affected rows won't be imported.",
            })
         }

         setRawRows(parsed)
         setActiveTab("new")
      }
      reader.readAsText(file)
   }

   function openFilePicker() {
      if (isFetching) return
      if (fileInputRef.current) {
         fileInputRef.current.value = ""
         fileInputRef.current.click()
      }
   }

   // Classify parsed rows against the selected month's existing data. Derived so
   // switching months re-evaluates the same file without a re-upload.
   const preview = React.useMemo<PreviewRow[] | null>(() => {
      if (!rawRows) return null
      return rawRows.map((raw) => {
         const { _parseIssues, ...rawRow } = raw
         // Apply cascade first so downstream NA fields are already null
         const r = applyComplianceCascade(rawRow)
         if (!r.prowessId || !companyNames[r.prowessId]) {
            return { ...r, _status: "not_found" as const, _parseIssues }
         }
         const missingFields = getMissingFields(r)
         if (missingFields.length > 0 || (_parseIssues && _parseIssues.length > 0)) {
            return { ...r, _status: "invalid" as const, _missingFields: missingFields, _parseIssues }
         }
         if (existingProwessIds.has(r.prowessId)) {
            const existing = existingShariahData[r.prowessId]
            const changedFields = existing ? getChangedFields(r, existing) : []
            if (changedFields.length === 0) return { ...r, _status: "no_change" as const }
            return { ...r, _status: "update" as const, _changedFields: changedFields }
         }
         return { ...r, _status: "new" as const }
      })
   }, [rawRows, companyNames, existingProwessIds, existingShariahData])

   const isPastMonth = targetMonth < currentMonth
   const isPastMonthWithData = isPastMonth && existingProwessIds.size > 0

   const newRows = preview?.filter((r) => r._status === "new") ?? []
   const updateRows = preview?.filter((r) => r._status === "update") ?? []
   const noChangeRows = preview?.filter((r) => r._status === "no_change") ?? []
   const notFoundRows = preview?.filter((r) => r._status === "not_found") ?? []
   const invalidRows = preview?.filter((r) => r._status === "invalid") ?? []

   const canImport = preview !== null && (newRows.length > 0 || updateRows.length > 0)

   function handleImport() {
      if (!canImport) return
      const toImport = [...newRows, ...updateRows]
      startTransition(async () => {
         try {
            const result = await importShariahData(toImport, targetMonth)
            const parts: string[] = []
            if (result.inserted > 0) parts.push(`${result.inserted} added`)
            if (result.updated > 0) parts.push(`${result.updated} updated`)
            toast.success(parts.join(", ") + ".", {
               description: result.skipped.length > 0
                  ? `${result.skipped.length} row(s) skipped.`
                  : undefined,
            })
            handleOpenChange(false)
            router.refresh()
         } catch (err) {
            toast.error("Import failed", {
               description: err instanceof Error ? err.message : "Please try again.",
            })
         }
      })
   }

   function importLabel() {
      if (!canImport) return "Nothing to Import"
      const parts: string[] = []
      if (newRows.length > 0) parts.push(`Add ${newRows.length}`)
      if (updateRows.length > 0) parts.push(`Update ${updateRows.length}`)
      return `Import - ${parts.join(", ")}`
   }

   return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
         <DialogTrigger asChild>
            <Button size="sm" className="gap-1.5">
               <UploadIcon className="size-3.5" />
               Import Data
            </Button>
         </DialogTrigger>

         <DialogContent className="flex max-h-[90dvh] w-full flex-col overflow-hidden sm:max-w-3xl">
            <DialogHeader>
               <DialogTitle>Import Shariah Status Data</DialogTitle>
            </DialogHeader>

            <div className="flex min-h-0 flex-1 flex-col gap-4">
               {/* Target month selector */}
               <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Import data for</span>
                  <MonthYearPicker
                     value={targetMonth}
                     onChange={setTargetMonth}
                     maxMonth={currentMonth}
                     monthsWithData={monthsWithDataSet}
                     disabled={isPending || !canBackdate}
                  />
                  {!canBackdate && (
                     <span className="text-xs text-muted-foreground">
                        Only the current month can be edited with your role.
                     </span>
                  )}
                  {isPastMonth ? (
                     <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                        Back-dated month
                     </span>
                  ) : (
                     <span className="ml-auto rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                        Current month
                     </span>
                  )}
               </div>

               {/* Warning when editing an already-published past month */}
               {isPastMonthWithData ? (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300">
                     <AlertTriangleIcon className="mt-0.5 size-4 shrink-0" />
                     <span>
                        You&apos;re editing already-published data for{" "}
                        <span className="font-semibold">{formatMonthLabel(targetMonth)}</span>. Matching records will be
                        overwritten and the previous values <span className="font-semibold">cannot be recovered</span>.
                     </span>
                  </div>
               ) : (
                  <p className="text-xs text-muted-foreground">
                     Upload a CSV file with shariah status data. Existing records for{" "}
                     <span className="font-medium text-foreground">{formatMonthLabel(targetMonth)}</span> will be overwritten.
                  </p>
               )}

               {/* File picker - full dropzone before upload, compact bar after */}
               {fileName ? (
                  <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-muted/20 px-3 py-2">
                     <FileTextIcon className="size-4 shrink-0 text-primary" />
                     <span className="min-w-0 flex-1 truncate text-sm font-medium">{fileName}</span>
                     <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground"
                        onClick={downloadTemplate}
                     >
                        <DownloadIcon className="size-3.5" />
                        Template
                     </Button>
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={openFilePicker}
                        disabled={isFetching}
                     >
                        <UploadIcon className="size-3.5" />
                        Change
                     </Button>
                  </div>
               ) : (
                  <div className="flex flex-col gap-2">
                     <Empty
                        className={cn(
                           "gap-1 border p-4 transition-colors",
                           isFetching ? "cursor-wait opacity-60" : "cursor-pointer hover:bg-muted/40",
                        )}
                        onClick={openFilePicker}
                     >
                        <EmptyMedia variant="icon">
                           <UploadIcon />
                        </EmptyMedia>
                        <EmptyTitle className="text-sm">Click to upload CSV</EmptyTitle>
                        <EmptyDescription>
                           {isFetching ? "Loading context…" : "CSV with prowess_id and shariah fields"}
                        </EmptyDescription>
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
               )}

               {/* Kept mounted in both states so the ref survives the swap */}
               <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={handleFileChange}
               />

               {/* Preview */}
               {preview !== null && (
                  <div className="flex min-h-0 flex-1 flex-col gap-2">
                     {/* Summary bar */}
                     <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
                           <span className="flex items-center gap-1 text-muted-foreground">
                              <MinusCircleIcon className="size-3.5" />
                              {noChangeRows.length} no change
                           </span>
                        )}
                        {invalidRows.length > 0 && (
                           <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                              <XCircleIcon className="size-3.5" />
                              {invalidRows.length} invalid
                           </span>
                        )}
                        {notFoundRows.length > 0 && (
                           <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                              <AlertCircleIcon className="size-3.5" />
                              {notFoundRows.length} not found
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
                              Update
                              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{updateRows.length}</span>
                           </TabsTrigger>
                           <TabsTrigger value="no-change" className="gap-1.5">
                              No Change
                              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{noChangeRows.length}</span>
                           </TabsTrigger>
                           <TabsTrigger value="invalid" className="gap-1.5">
                              Invalid
                              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{invalidRows.length}</span>
                           </TabsTrigger>
                           <TabsTrigger value="not-found" className="gap-1.5">
                              Not Found
                              <span className="rounded-full bg-muted px-1.5 text-xs tabular-nums">{notFoundRows.length}</span>
                           </TabsTrigger>
                        </TabsList>

                        {/* New */}
                        <TabsContent value="new" className="min-h-0 flex-1 flex flex-col overflow-hidden rounded-xl border">
                           <PreviewTable rows={newRows} companyNames={companyNames} emptyText="No new records." />
                        </TabsContent>

                        {/* Update */}
                        <TabsContent value="update" className="min-h-0 flex-1 flex flex-col overflow-hidden rounded-xl border">
                           <UpdatedPreviewTable rows={updateRows} companyNames={companyNames} />
                        </TabsContent>

                        {/* No Change */}
                        <TabsContent value="no-change" className="min-h-0 flex-1 flex flex-col overflow-hidden rounded-xl border">
                           <PreviewTable rows={noChangeRows} companyNames={companyNames} emptyText="No unchanged records." highlight="muted" />
                        </TabsContent>

                        {/* Invalid */}
                        <TabsContent value="invalid" className="min-h-0 flex-1 flex flex-col overflow-hidden rounded-xl border">
                           <InvalidTable rows={invalidRows} companyNames={companyNames} />
                        </TabsContent>

                        {/* Not Found */}
                        <TabsContent value="not-found" className="min-h-0 flex-1 flex flex-col overflow-hidden rounded-xl border">
                           <NotFoundTable rows={notFoundRows} />
                        </TabsContent>
                     </Tabs>
                  </div>
               )}
            </div>

            <DialogFooter className="shrink-0">
               <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
                  Cancel
               </Button>
               <Button onClick={handleImport} disabled={!canImport || isPending}>
                  {isPending ? "Importing…" : importLabel()}
                  {isPending && <Spinner className="ml-2" />}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   )
}

// ---------------------------------------------------------------------------
// Shared preview table for New / Update tabs (paginated)
// ---------------------------------------------------------------------------

function PreviewTable({
   rows,
   companyNames,
   emptyText,
   highlight,
}: {
   rows: PreviewRow[]
   companyNames: Record<string, string>
   emptyText: string
   highlight?: "blue" | "muted"
}) {
   const { page, setPage, totalPages, pageRows } = usePagination(rows)
   const idClass = highlight === "blue"
      ? "text-blue-700 dark:text-blue-400"
      : highlight === "muted"
      ? "text-muted-foreground"
      : "text-emerald-700 dark:text-emerald-400"

   return (
      <>
         <div className="flex-1 overflow-auto">
            <Table>
               <TableHeader className="bg-muted/60 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent">
                     <TableHead className="w-10 pl-4 text-muted-foreground">#</TableHead>
                     <TableHead className="pl-4 text-muted-foreground">Prowess ID</TableHead>
                     <TableHead className="pl-4 text-muted-foreground">Company Name</TableHead>
                     <TableHead className="pl-4 text-muted-foreground">Shariah Status</TableHead>
                     <TableHead className="pl-4 text-muted-foreground">Company Status</TableHead>
                     <TableHead className="pl-4 text-muted-foreground">Assmt. Year</TableHead>
                     <TableHead className="pl-4 text-muted-foreground">Market Cap</TableHead>
                     <TableHead className="pl-4 text-muted-foreground">Last Updated</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {rows.length === 0 ? (
                     <TableRow>
                        <TableCell colSpan={8} className="h-24 text-center text-sm text-muted-foreground">
                           {emptyText}
                        </TableCell>
                     </TableRow>
                  ) : pageRows.map((row, i) => (
                     <TableRow key={row.prowessId}>
                        <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">{page * PAGE_SIZE + i + 1}</TableCell>
                        <TableCell className={cn("pl-4 font-mono text-xs font-medium", idClass)}>{row.prowessId}</TableCell>
                        <TableCell className="pl-4 text-sm">
                           {companyNames[row.prowessId]
                              ? <span className="font-medium">{companyNames[row.prowessId]}</span>
                              : <span className="text-muted-foreground opacity-40">-</span>}
                        </TableCell>
                        <TableCell className="pl-4 text-xs">
                           {row.shariahStatus
                              ? <span>{row.shariahStatus}. {SHARIAH_STATUS_LABELS[row.shariahStatus]}</span>
                              : <span className="text-muted-foreground opacity-40">-</span>}
                        </TableCell>
                        <TableCell className="pl-4 text-xs">{row.companyStatus ?? <span className="text-muted-foreground opacity-40">-</span>}</TableCell>
                        <TableCell className="pl-4 text-xs text-muted-foreground whitespace-nowrap">{row.assessmentYear ?? <span className="opacity-40">-</span>}</TableCell>
                        <TableCell className="pl-4 text-xs tabular-nums">
                           {row.marketCap ? parseFloat(row.marketCap).toLocaleString("en-IN") : <span className="text-muted-foreground opacity-40">-</span>}
                        </TableCell>
                        <TableCell className="pl-4 text-xs text-muted-foreground">{row.lastUpdatedAt ?? <span className="opacity-40">-</span>}</TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
         </div>
         <PaginationBar
            page={page}
            totalPages={totalPages}
            count={pageRows.length}
            total={rows.length}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
         />
      </>
   )
}

// ---------------------------------------------------------------------------
// Update tab table - shows changed field names as badges (paginated)
// ---------------------------------------------------------------------------

function UpdatedPreviewTable({
   rows,
   companyNames,
}: {
   rows: PreviewRow[]
   companyNames: Record<string, string>
}) {
   const { page, setPage, totalPages, pageRows } = usePagination(rows)

   return (
      <>
         <div className="flex-1 overflow-auto">
            <Table>
               <TableHeader className="bg-muted/60 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent">
                     <TableHead className="w-8 pl-4 text-muted-foreground">#</TableHead>
                     <TableHead className="pl-4 text-muted-foreground">Prowess ID</TableHead>
                     <TableHead className="pl-4 text-muted-foreground">Company</TableHead>
                     <TableHead className="pl-4 text-muted-foreground whitespace-nowrap">Shariah Status</TableHead>
                     <TableHead className="pl-4 text-muted-foreground">Changed Fields</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {rows.length === 0 ? (
                     <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-sm text-muted-foreground">
                           No records to update.
                        </TableCell>
                     </TableRow>
                  ) : pageRows.map((row, i) => (
                     <TableRow key={row.prowessId}>
                        <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">{page * PAGE_SIZE + i + 1}</TableCell>
                        <TableCell className="pl-4 font-mono text-xs font-medium text-blue-700 dark:text-blue-400">{row.prowessId}</TableCell>
                        <TableCell className="pl-4 text-sm">
                           {companyNames[row.prowessId]
                              ? <span className="font-medium whitespace-nowrap">{companyNames[row.prowessId]}</span>
                              : <span className="text-muted-foreground opacity-40">-</span>}
                        </TableCell>
                        <TableCell className="pl-4 text-xs whitespace-nowrap">
                           {row.shariahStatus
                              ? <span>{row.shariahStatus}. {SHARIAH_STATUS_LABELS[row.shariahStatus]}</span>
                              : <span className="text-muted-foreground opacity-40">-</span>}
                        </TableCell>
                        <TableCell className="pl-4">
                           <div className="flex flex-wrap gap-1">
                              {row._changedFields?.map((f) => (
                                 <Badge
                                    key={f}
                                    variant="outline"
                                    className="text-xs border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400"
                                 >
                                    {f}
                                 </Badge>
                              ))}
                           </div>
                        </TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
         </div>
         <PaginationBar
            page={page}
            totalPages={totalPages}
            count={pageRows.length}
            total={rows.length}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
         />
      </>
   )
}

// ---------------------------------------------------------------------------
// Invalid tab table (paginated)
// ---------------------------------------------------------------------------

function InvalidTable({
   rows,
   companyNames,
}: {
   rows: PreviewRow[]
   companyNames: Record<string, string>
}) {
   const { page, setPage, totalPages, pageRows } = usePagination(rows)

   return (
      <>
         <div className="flex-1 overflow-auto">
            <Table>
               <TableHeader className="bg-muted/60 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent">
                     <TableHead className="w-10 pl-4 text-muted-foreground">#</TableHead>
                     <TableHead className="pl-4 text-muted-foreground">Prowess ID</TableHead>
                     <TableHead className="pl-4 text-muted-foreground">Company Name</TableHead>
                     <TableHead className="pl-4 text-muted-foreground">Issues</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {rows.length === 0 ? (
                     <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center text-sm text-muted-foreground">
                           All rows have complete data.
                        </TableCell>
                     </TableRow>
                  ) : pageRows.map((row, i) => (
                     <TableRow key={row.prowessId}>
                        <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">{page * PAGE_SIZE + i + 1}</TableCell>
                        <TableCell className="pl-4 font-mono text-xs text-red-700 dark:text-red-400">{row.prowessId}</TableCell>
                        <TableCell className="pl-4 text-sm">
                           {companyNames[row.prowessId]
                              ? <span className="font-medium">{companyNames[row.prowessId]}</span>
                              : <span className="text-muted-foreground opacity-40">-</span>}
                        </TableCell>
                        <TableCell className="pl-4">
                           <div className="flex flex-wrap gap-1">
                              {row._missingFields?.map((f) => (
                                 <Badge
                                    key={f}
                                    variant="outline"
                                    className="text-xs border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
                                 >
                                    Missing: {f}
                                 </Badge>
                              ))}
                              {row._parseIssues?.map((issue) => (
                                 <Badge
                                    key={issue.field}
                                    variant="outline"
                                    className="text-xs border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
                                    title={`Raw value: "${issue.rawValue}"`}
                                 >
                                    Unreadable: {issue.field} ({issue.rawValue})
                                 </Badge>
                              ))}
                           </div>
                        </TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
         </div>
         <PaginationBar
            page={page}
            totalPages={totalPages}
            count={pageRows.length}
            total={rows.length}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
         />
      </>
   )
}

// ---------------------------------------------------------------------------
// Not Found tab table (paginated)
// ---------------------------------------------------------------------------

function NotFoundTable({ rows }: { rows: PreviewRow[] }) {
   const { page, setPage, totalPages, pageRows } = usePagination(rows)

   return (
      <>
         <div className="flex-1 overflow-auto">
            <Table>
               <TableHeader className="bg-muted/60 sticky top-0 z-10">
                  <TableRow className="hover:bg-transparent">
                     <TableHead className="w-10 pl-4 text-muted-foreground">#</TableHead>
                     <TableHead className="pl-4 text-muted-foreground">Prowess ID</TableHead>
                     <TableHead className="pl-4 text-muted-foreground">Status</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {rows.length === 0 ? (
                     <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center text-sm text-muted-foreground">
                           All Prowess IDs matched.
                        </TableCell>
                     </TableRow>
                  ) : pageRows.map((row, i) => (
                     <TableRow key={row.prowessId} className="opacity-70">
                        <TableCell className="pl-4 text-xs text-muted-foreground tabular-nums">{page * PAGE_SIZE + i + 1}</TableCell>
                        <TableCell className="pl-4">
                           <span className="font-mono text-xs text-amber-700 dark:text-amber-400">{row.prowessId}</span>
                        </TableCell>
                        <TableCell className="pl-4">
                           <Badge variant="outline" className="gap-1 text-xs border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                              <XCircleIcon className="size-3" />
                              Not in company master
                           </Badge>
                        </TableCell>
                     </TableRow>
                  ))}
               </TableBody>
            </Table>
         </div>
         <PaginationBar
            page={page}
            totalPages={totalPages}
            count={pageRows.length}
            total={rows.length}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
         />
      </>
   )
}
