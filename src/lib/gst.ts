// ─── GST calculation ────────────────────────────────────────────────────────
// Plan prices are GST-INCLUSIVE. The taxable (base) price is the gross backed
// out at the GST rate: base = gross / 1.18, and GST = gross − base.
//   gross 100 → base 84.75, GST 15.25
// Place of supply decides the split:
//   Maharashtra (intra-state) → CGST 9% + SGST 9%
//   anywhere else (inter-state) → IGST 18%
// Pure functions only - safe to import on client and server.

export const GST_RATE = 18
export const HOME_STATE = "Maharashtra"

export type GstBreakdownPaise = {
   amount: number // gross, in paise
   taxable: number
   cgst: number
   sgst: number
   igst: number
   isIntraState: boolean
}

function isHomeState(state: string | null | undefined): boolean {
   return (state ?? "").trim() === HOME_STATE
}

// Compute the breakdown in paise so components always sum back to the gross.
export function computeGstPaise(
   amountPaise: number,
   state: string | null | undefined,
): GstBreakdownPaise {
   // Back out the GST-inclusive amount: base = gross / (1 + rate).
   const taxable = Math.round(amountPaise / (1 + GST_RATE / 100))
   const totalGst = amountPaise - taxable
   const intra = isHomeState(state)

   let cgst = 0
   let sgst = 0
   let igst = 0
   if (intra) {
      cgst = Math.floor(totalGst / 2)
      sgst = totalGst - cgst // keeps cgst + sgst === totalGst on odd paise
   } else {
      igst = totalGst
   }

   return { amount: amountPaise, taxable, cgst, sgst, igst, isIntraState: intra }
}

// Convenience: take a rupee price (string or number) → breakdown in paise.
export function computeGstFromPrice(
   price: string | number,
   state: string | null | undefined,
): GstBreakdownPaise {
   const amountPaise = Math.round(Number(price) * 100)
   return computeGstPaise(amountPaise, state)
}

// paise → "82.00" string, for numeric(12,2) DB columns and display parsing.
export function paiseToAmount(paise: number): string {
   return (paise / 100).toFixed(2)
}
