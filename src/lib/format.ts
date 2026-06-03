// Shared formatting helpers. Indian locale conventions throughout.

export const MONTHS_SHORT = [
   "Jan", "Feb", "Mar", "Apr", "May", "Jun",
   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const

/** Numeric string → "₹1,23,456" (Indian-grouped rupees, no decimals). */
export function formatPrice(price: string): string {
   return "₹" + new Intl.NumberFormat("en-IN").format(parseFloat(price))
}

/** Date → "03 Jan 2024" (en-IN, two-digit day). */
export function formatDate(d: Date): string {
   return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

/** "YYYY-MM-DD" → "3 Jan 2024"; null/empty → fallback. */
export function formatDateStr(dateStr: string | null | undefined, fallback = "—"): string {
   if (!dateStr) return fallback
   const [y, m, d] = dateStr.split("-")
   return `${parseInt(d)} ${MONTHS_SHORT[parseInt(m) - 1]} ${y}`
}

/** "YYYY-MM" → "Jan '24"; null/empty → fallback. */
export function formatMonth(month: string | null | undefined, fallback = "—"): string {
   if (!month) return fallback
   const [y, m] = month.split("-")
   return `${MONTHS_SHORT[parseInt(m) - 1]} '${y.slice(2)}`
}
