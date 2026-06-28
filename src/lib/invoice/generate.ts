import "server-only"

import fs from "node:fs"
import path from "node:path"
import { and, eq, gte, lt } from "drizzle-orm"
import { renderToBuffer } from "@react-pdf/renderer"

import { db } from "@/src/db/client"
import { payment, pricingPlan, user, clientProfile } from "@/src/db/schema"
import { DURATION_LABELS } from "@/src/lib/constants"
import { sendInvoiceEmail } from "@/src/lib/mailer"
import { InvoiceDocument, type InvoiceData } from "./document"
import { SELLER, HSN_SAC } from "./seller"
import { getStateCode } from "@/src/lib/data/stateData"
import { rupeesInWords } from "./words"

// ─── Financial year (India: Apr 1 – Mar 31) ──────────────────────────────────
function financialYear(date: Date) {
   const y = date.getFullYear()
   const startYear = date.getMonth() >= 3 ? y : y - 1
   const endYear = startYear + 1
   return {
      start: new Date(startYear, 3, 1), // 1 Apr
      end: new Date(endYear, 3, 1), // 1 Apr next year (exclusive)
      code: `${startYear}${String(endYear).slice(2)}`, // 2026-27 → "202627"
   }
}

// Invoice number: <S|L><FYcode><5-digit seq>, e.g. S20262700001.
// Derived from the payment's position among paid payments in the same FY, so it
// can be regenerated on demand without being stored.
async function computeInvoiceNumber(
   pay: { id: string; createdAt: Date },
   planType: string,
): Promise<string> {
   const fy = financialYear(pay.createdAt)
   const paid = await db
      .select({ id: payment.id, createdAt: payment.createdAt })
      .from(payment)
      .where(and(eq(payment.status, "paid"), gte(payment.createdAt, fy.start), lt(payment.createdAt, fy.end)))
      .orderBy(payment.createdAt, payment.id)

   const idx = paid.findIndex((p) => p.id === pay.id)
   const seq = (idx >= 0 ? idx : paid.length) + 1
   const letter = planType === "snapshot" ? "S" : "L"
   return `${letter}${fy.code}${String(seq).padStart(5, "0")}`
}

function formatInvoiceDate(d: Date): string {
   const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
   return `${String(d.getDate()).padStart(2, "0")}-${months[d.getMonth()]}-${d.getFullYear()}`
}

let cachedLogo: string | null | undefined
function logoDataUri(): string | undefined {
   if (cachedLogo !== undefined) return cachedLogo ?? undefined
   try {
      const file = path.join(process.cwd(), "public", "assets", "images", "logo.png")
      cachedLogo = `data:image/png;base64,${fs.readFileSync(file).toString("base64")}`
   } catch {
      cachedLogo = null
   }
   return cachedLogo ?? undefined
}

// Builds the invoice PDF for a paid payment and emails it to the client.
// Idempotent-safe to call once on successful verification; failures are thrown
// so the caller can log them (and must NOT let them fail the payment).
export async function sendInvoiceForPayment(razorpayOrderId: string): Promise<void> {
   const [row] = await db
      .select({
         payId: payment.id,
         status: payment.status,
         createdAt: payment.createdAt,
         durationType: payment.durationType,
         priceSnapshot: payment.priceSnapshot,
         taxableAmount: payment.taxableAmount,
         cgst: payment.cgst,
         sgst: payment.sgst,
         igst: payment.igst,
         gstRate: payment.gstRate,
         placeOfSupply: payment.placeOfSupply,
         planType: pricingPlan.type,
         planName: pricingPlan.name,
         clientName: user.name,
         clientEmail: user.email,
         address: clientProfile.address,
         gstNumber: clientProfile.gstNumber,
      })
      .from(payment)
      .leftJoin(pricingPlan, eq(payment.planId, pricingPlan.id))
      .leftJoin(user, eq(payment.clientId, user.id))
      .leftJoin(clientProfile, eq(payment.clientId, clientProfile.userId))
      .where(eq(payment.razorpayOrderId, razorpayOrderId))
      .limit(1)

   if (!row || row.status !== "paid" || !row.clientEmail) return

   const planType = row.planType ?? "list"
   const invoiceNumber = await computeInvoiceNumber({ id: row.payId, createdAt: row.createdAt }, planType)

   const placeOfSupply = row.placeOfSupply || ""
   const isIntraState = placeOfSupply === SELLER.stateName
   const totalTax = isIntraState
      ? parseFloat(row.cgst) + parseFloat(row.sgst)
      : parseFloat(row.igst)

   const data: InvoiceData = {
      logoSrc: logoDataUri(),
      invoiceNumber,
      date: formatInvoiceDate(row.createdAt),
      buyer: {
         name: row.clientName ?? "—",
         addressLines: row.address ? [row.address] : [],
         gstin: row.gstNumber,
         stateName: placeOfSupply || "—",
         stateCode: getStateCode(placeOfSupply),
         placeOfSupply: placeOfSupply || "—",
      },
      item: {
         title: row.planName ?? "Subscription",
         subtitle: DURATION_LABELS[row.durationType as keyof typeof DURATION_LABELS] ?? row.durationType,
         hsn: HSN_SAC,
      },
      amounts: {
         taxable: row.taxableAmount,
         cgst: row.cgst,
         sgst: row.sgst,
         igst: row.igst,
         total: row.priceSnapshot,
         gstRate: row.gstRate,
         isIntraState,
      },
      amountInWords: rupeesInWords(row.priceSnapshot),
      taxInWords: rupeesInWords(totalTax),
   }

   // Call the component directly so the root element is a <Document>, which is
   // what renderToBuffer expects.
   const pdf = await renderToBuffer(InvoiceDocument({ data }))

   await sendInvoiceEmail({
      to: row.clientEmail,
      name: row.clientName ?? "",
      invoiceNumber,
      planName: data.item.title,
      pdf,
   })
}
