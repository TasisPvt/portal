"use server"

import { and, eq, gte, lt } from "drizzle-orm"

import { db } from "@/src/db/client"
import { payment, pricingPlan, user, clientProfile } from "@/src/db/schema"
import { requireAdmin } from "@/src/lib/require-admin"
import { DURATION_LABELS } from "@/src/lib/constants"

export type SuspenseRow = {
   // Stable key: one row per (client, package).
   id: string
   clientId: string
   clientName: string
   // A single package the client paid for this month, e.g. "TASIS 500 (Annual)".
   package: string
   pan: string
   aadhar: string
   address: string
   state: string
   mobile: string
   // Total gross collected for this package in the selected month, in rupees.
   amount: number
   // "New Client" when the account was created within the selected month.
   remark: "New Client" | "Existing Client"
}

// One row per (client, package) pair paid for in the given month, with the
// client's KYC details repeated on each package row and the total amount paid for
// that package. Grouping/aggregation is done here rather than client-side so only
// the selected month's PII (PAN, Aadhaar, phone) ever leaves the server.
export async function getSuspenseReport(year: number, month: number): Promise<SuspenseRow[]> {
   await requireAdmin()

   // [start, end) covers the whole selected month (month is 1-12).
   const start = new Date(year, month - 1, 1)
   const end = new Date(year, month, 1)

   const rows = await db
      .select({
         clientId: payment.clientId,
         clientName: user.name,
         userCreatedAt: user.createdAt,
         planName: pricingPlan.name,
         durationType: payment.durationType,
         amount: payment.amount,
         pan: clientProfile.panNumber,
         aadhar: clientProfile.aadharNumber,
         address: clientProfile.address,
         state: clientProfile.state,
         mobile: clientProfile.phone,
      })
      .from(payment)
      .innerJoin(user, eq(payment.clientId, user.id))
      .innerJoin(pricingPlan, eq(payment.planId, pricingPlan.id))
      .leftJoin(clientProfile, eq(clientProfile.userId, user.id))
      .where(
         and(
            eq(payment.status, "paid"),
            gte(payment.createdAt, start),
            lt(payment.createdAt, end),
         ),
      )

   type Acc = {
      clientId: string
      clientName: string
      package: string
      pan: string
      aadhar: string
      address: string
      state: string
      mobile: string
      amount: number
      isNew: boolean
   }

   // Keyed by client + package, so each package the client bought is its own row.
   const byClientPackage = new Map<string, Acc>()

   for (const r of rows) {
      const duration = DURATION_LABELS[r.durationType] ?? r.durationType
      const pkg = `${r.planName} (${duration})`
      const key = `${r.clientId}::${pkg}`

      const acc =
         byClientPackage.get(key) ??
         {
            clientId: r.clientId,
            clientName: r.clientName,
            package: pkg,
            pan: r.pan ?? "",
            aadhar: r.aadhar ?? "",
            address: r.address ?? "",
            state: r.state ?? "",
            mobile: r.mobile ?? "",
            amount: 0,
            // New = account created within the selected month.
            isNew: r.userCreatedAt >= start && r.userCreatedAt < end,
         }

      acc.amount += r.amount / 100
      byClientPackage.set(key, acc)
   }

   return [...byClientPackage.entries()]
      .map(([key, a]) => ({
         id: key,
         clientId: a.clientId,
         clientName: a.clientName,
         package: a.package,
         pan: a.pan,
         aadhar: a.aadhar,
         address: a.address,
         state: a.state,
         mobile: a.mobile,
         amount: a.amount,
         remark: (a.isNew ? "New Client" : "Existing Client") as SuspenseRow["remark"],
      }))
      .sort((a, b) => a.clientName.localeCompare(b.clientName) || a.package.localeCompare(b.package))
}

const MONTH_NAMES = [
   "January", "February", "March", "April", "May", "June",
   "July", "August", "September", "October", "November", "December",
]

// Builds a formatted .xlsx of the given rows (laid out like the
// "suspense report.xlsx" template) and returns it base64-encoded. exceljs runs
// server-side only and is imported lazily so it never touches the client bundle
// or the page-render path.
export async function exportSuspenseXlsx(
   rows: SuspenseRow[],
   year: number,
   month: number,
): Promise<string> {
   await requireAdmin()

   // Brand palette (matches the on-brand TASIS template).
   const NAVY = "FF1F3864"
   const WHITE = "FFFFFFFF"
   const monthName = MONTH_NAMES[month - 1] ?? ""

   const [{ default: ExcelJS }, { readFile }, path] = await Promise.all([
      import("exceljs"),
      import("fs/promises"),
      import("path"),
   ])

   const wb = new ExcelJS.Workbook()
   const ws = wb.addWorksheet(`${monthName} ${year}`.trim())

   // Column widths sized so every value (long Aadhaar/addresses) shows in full.
   ws.columns = [
      { width: 6 },   // Sr.no
      { width: 22 },  // Client Name
      { width: 22 },  // Package
      { width: 16 },  // PAN / TAN No.
      { width: 18 },  // Aadhar / CIN No.
      { width: 34 },  // Address
      { width: 16 },  // State
      { width: 15 },  // Mobile No.
      { width: 12 },  // Amount
      { width: 16 },  // Remark
   ]

   // ── Brand band: TASIS wordmark + subtitle (left), logo (right) ──────────
   const brand = ws.getCell("A2")
   brand.value = "TASIS"
   brand.font = { name: "Times New Roman", bold: true, size: 22, color: { argb: NAVY } }
   const subtitle = ws.getCell("A3")
   subtitle.value = "Opening Vistas of Islamic Finance"
   subtitle.font = { italic: true, size: 10, color: { argb: NAVY } }
   ws.getRow(2).height = 26

   try {
      const logo = await readFile(path.join(process.cwd(), "public", "assets", "images", "logo.png"))
      const logoId = wb.addImage({ base64: logo.toString("base64"), extension: "png" })
      // Anchored top-right, above the last columns.
      ws.addImage(logoId, { tl: { col: 9.2, row: 0.1 }, ext: { width: 58, height: 66 } })
   } catch {
      // Logo is decorative — skip silently if the asset is unavailable.
   }

   // ── Navy title bar (merged across all columns) ──────────────────────────
   ws.mergeCells(5, 1, 5, 10)
   const title = ws.getCell(5, 1)
   title.value = `Suspense Report- ${monthName} ${year}`.trim()
   title.font = { bold: true, size: 12, color: { argb: WHITE } }
   title.alignment = { horizontal: "center", vertical: "middle" }
   title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } }
   ws.getRow(5).height = 24

   // ── Header row ──────────────────────────────────────────────────────────
   const HEADER_ROW = 7
   const headerRow = ws.getRow(HEADER_ROW)
   headerRow.values = [
      "Sr.no", "Client Name", "Package", "PAN / TAN No.", "Aadhar / CIN No.",
      "Address", "State", "Mobile No.", "Amount", "Remark",
   ]
   headerRow.height = 20
   headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: NAVY } }
      cell.border = { bottom: { style: "medium", color: { argb: NAVY } } }
      cell.alignment = { vertical: "middle" }
   })

   // ── Data rows ───────────────────────────────────────────────────────────
   rows.forEach((r, i) => {
      const row = ws.getRow(HEADER_ROW + 1 + i)
      row.values = [
         i + 1,
         r.clientName,
         r.package,
         r.pan || "-",
         r.aadhar || "-",
         r.address || "-",
         r.state || "-",
         r.mobile || "-",
         r.amount,
         r.remark,
      ]
      row.font = { color: { argb: NAVY }, size: 10 }
      row.alignment = { vertical: "middle" }
      row.getCell(1).alignment = { horizontal: "center", vertical: "middle" }
      // Keep long ID numbers as text so Excel never shows scientific notation.
      row.getCell(4).numFmt = "@"
      row.getCell(5).numFmt = "@"
      row.getCell(8).numFmt = "@"
      row.getCell(9).numFmt = "#,##0"
      row.getCell(9).alignment = { horizontal: "right", vertical: "middle" }
      row.getCell(6).alignment = { wrapText: true, vertical: "middle" }
   })

   // Freeze everything above the first data row; filter on the header.
   ws.views = [{ state: "frozen", ySplit: HEADER_ROW }]
   ws.autoFilter = { from: { row: HEADER_ROW, column: 1 }, to: { row: HEADER_ROW, column: 10 } }
   ws.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 }

   const buf = await wb.xlsx.writeBuffer()
   return Buffer.from(buf).toString("base64")
}
