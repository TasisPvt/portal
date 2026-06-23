// Indian-format number → words, used for "Amount Chargeable (in words)".

const ONES = [
   "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
   "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
   "Seventeen", "Eighteen", "Nineteen",
]
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]

function twoDigit(n: number): string {
   if (n < 20) return ONES[n]
   const t = Math.floor(n / 10)
   const o = n % 10
   return TENS[t] + (o ? " " + ONES[o] : "")
}

function threeDigit(n: number): string {
   const h = Math.floor(n / 100)
   const r = n % 100
   const head = h ? ONES[h] + " Hundred" : ""
   if (head && r) return head + " " + twoDigit(r)
   return head || twoDigit(r)
}

// Convert a non-negative integer to Indian-system words (crore/lakh/thousand).
function integerToWords(n: number): string {
   if (n === 0) return "Zero"
   const crore = Math.floor(n / 10000000)
   n %= 10000000
   const lakh = Math.floor(n / 100000)
   n %= 100000
   const thousand = Math.floor(n / 1000)
   n %= 1000
   const hundred = n

   const parts: string[] = []
   if (crore) parts.push(threeDigit(crore) + " Crore")
   if (lakh) parts.push(threeDigit(lakh) + " Lakh")
   if (thousand) parts.push(threeDigit(thousand) + " Thousand")
   if (hundred) parts.push(threeDigit(hundred))
   return parts.join(" ").trim()
}

// e.g. 9971 → "Nine Thousand Nine Hundred Seventy One Only"
//      1234.50 → "One Thousand Two Hundred Thirty Four and Fifty Paise Only"
export function rupeesInWords(amount: number | string): string {
   const value = typeof amount === "string" ? parseFloat(amount) : amount
   if (!Number.isFinite(value)) return ""
   const rupees = Math.floor(value)
   const paise = Math.round((value - rupees) * 100)
   const rupeeWords = integerToWords(rupees)
   const paiseWords = paise > 0 ? ` and ${integerToWords(paise)} Paise` : ""
   return `${rupeeWords}${paiseWords} Only`
}
