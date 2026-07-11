import * as React from "react"
import {
   Document,
   Page,
   View,
   Text,
   Image as PdfImage,
   StyleSheet,
   Font,
} from "@react-pdf/renderer"
import { SELLER } from "./seller"

// Disable react-pdf's default hyphenation so long words (e.g. "SOLUTION") wrap
// whole to the next line instead of breaking with a dash ("SOLU-TION").
Font.registerHyphenationCallback((word) => [word])

export type InvoiceData = {
   logoSrc?: string
   sealSrc?: string
   invoiceNumber: string
   date: string
   buyer: {
      name: string
      addressLines: string[]
      gstin?: string | null
      stateName: string
      stateCode: string
      placeOfSupply: string
   }
   item: { title: string; subtitle?: string; hsn: string }
   amounts: {
      taxable: string
      cgst: string
      sgst: string
      igst: string
      total: string
      gstRate: string
      isIntraState: boolean
   }
   amountInWords: string
   taxInWords: string
}

const BORDER = "#000000"

const s = StyleSheet.create({
   page: { padding: 24, fontSize: 9, fontFamily: "Helvetica", color: "#111827" },
   outer: { borderWidth: 1, borderColor: BORDER },
   row: { flexDirection: "row" },
   // Header
   headerLeft: { width: "62%", borderRightWidth: 1, borderColor: BORDER, padding: 8, flexDirection: "row", gap: 8 },
   headerRight: { width: "38%" },
   logo: { width: 46, height: 52, objectFit: "contain" },
   sellerName: { fontFamily: "Helvetica-Bold", fontSize: 10 },
   muted: { color: "#374151" },
   metaCell: { borderBottomWidth: 1, borderColor: BORDER, padding: 6, flexDirection: "row" },
   metaLabel: { width: "55%", color: "#6b7280" },
   metaValue: { width: "45%", fontFamily: "Helvetica-Bold" },
   // Bill to
   billTo: { borderTopWidth: 1, borderColor: BORDER, padding: 8 },
   label: { color: "#6b7280", fontSize: 8 },
   bold: { fontFamily: "Helvetica-Bold" },
   // Items table
   th: { flexDirection: "row", borderTopWidth: 1, borderColor: BORDER, backgroundColor: "#f3f4f6" },
   cSr: { width: "8%", padding: 6, borderRightWidth: 1, borderColor: BORDER },
   cParticulars: { width: "62%", padding: 6, borderRightWidth: 1, borderColor: BORDER },
   cHsn: { width: "15%", padding: 6, borderRightWidth: 1, borderColor: BORDER, textAlign: "center" },
   cAmt: { width: "15%", padding: 6, textAlign: "right" },
   itemBody: { flexDirection: "row", borderTopWidth: 1, borderColor: BORDER, minHeight: 150 },
   taxLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 1 },
   totalRow: { flexDirection: "row", borderTopWidth: 1, borderColor: BORDER, backgroundColor: "#f9fafb" },
   // words
   wordsRow: { flexDirection: "row", borderTopWidth: 1, borderColor: BORDER, padding: 6, justifyContent: "space-between" },
   // tax summary
   sumRowWrap: { flexDirection: "row", borderTopWidth: 1, borderColor: BORDER },
   sumCellV: { borderRightWidth: 1, borderColor: BORDER, padding: 3, justifyContent: "center", alignItems: "center" },
   sumGroup: { borderRightWidth: 1, borderColor: BORDER },
   sumGroupHead: { textAlign: "center", paddingVertical: 3, borderBottomWidth: 1, borderColor: BORDER, fontFamily: "Helvetica-Bold", backgroundColor: "#f3f4f6" },
   sumLeaf: { paddingVertical: 3, paddingHorizontal: 2, borderRightWidth: 1, borderColor: BORDER, textAlign: "center" },
   sumLeafLast: { paddingVertical: 3, paddingHorizontal: 2, textAlign: "center" },
   // bank / footer
   footer: { flexDirection: "row", borderTopWidth: 1, borderColor: BORDER },
   bankBox: { width: "60%", padding: 8, borderRightWidth: 1, borderColor: BORDER },
   signBox: { width: "40%", padding: 8, alignItems: "flex-end" },
   declRow: { flexDirection: "row", borderTopWidth: 1, borderColor: BORDER },
})

function money(v: string | number): string {
   const n = typeof v === "string" ? parseFloat(v) : v
   if (!Number.isFinite(n)) return "-"
   return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function InvoiceDocument({ data }: { data: InvoiceData }) {
   const { buyer, item, amounts } = data
   const half = (parseFloat(amounts.gstRate || "18") / 2).toFixed(2)
   const intra = amounts.isIntraState
   const totalTax = intra
      ? parseFloat(amounts.cgst) + parseFloat(amounts.sgst)
      : parseFloat(amounts.igst)

   return (
      <Document>
         <Page size="A4" style={s.page}>
            <View style={s.outer}>

               {/* ── Header ── */}
               <View style={s.row}>
                  <View style={s.headerLeft}>
                     {data.logoSrc ? <PdfImage src={data.logoSrc} style={s.logo} /> : null}
                     <View style={{ flex: 1 }}>
                        <Text style={s.sellerName}>{SELLER.name}</Text>
                        {SELLER.addressLines.map((l) => (
                           <Text key={l} style={s.muted}>{l}</Text>
                        ))}
                        <Text style={s.muted}>GSTIN/UIN : {SELLER.gstin}</Text>
                        <Text style={s.muted}>State Name : {SELLER.stateName}, Code : {SELLER.stateCode}</Text>
                        <Text style={s.muted}>CIN : {SELLER.cin}</Text>
                        <Text style={s.muted}>E-Mail : {SELLER.email}</Text>
                     </View>
                  </View>
                  <View style={s.headerRight}>
                     <View style={s.metaCell}>
                        <Text style={s.metaLabel}>Invoice No.</Text>
                        <Text style={s.metaValue}>{data.invoiceNumber}</Text>
                     </View>
                     <View style={[s.metaCell, { borderBottomWidth: 0 }]}>
                        <Text style={s.metaLabel}>Dated</Text>
                        <Text style={s.metaValue}>{data.date}</Text>
                     </View>
                  </View>
               </View>

               {/* ── Bill to ── */}
               <View style={s.billTo}>
                  <Text style={s.label}>Bill to:</Text>
                  <Text style={s.bold}>{buyer.name}</Text>
                  {buyer.addressLines.map((l, i) => (
                     <Text key={i} style={s.muted}>{l}</Text>
                  ))}
                  {buyer.gstin ? <Text style={s.muted}>GSTIN/UIN : {buyer.gstin}</Text> : null}
                  <Text style={s.muted}>
                     State Name : {buyer.stateName}{buyer.stateCode ? `, Code : ${buyer.stateCode}` : ""}
                  </Text>
                  <Text style={s.muted}>Place of Supply : {buyer.placeOfSupply}</Text>
               </View>

               {/* ── Items table header ── */}
               <View style={s.th}>
                  <Text style={[s.cSr, s.bold]}>Sr. No.</Text>
                  <Text style={[s.cParticulars, s.bold]}>Particulars</Text>
                  <Text style={[s.cHsn, s.bold]}>HSN/SAC</Text>
                  <Text style={[s.cAmt, s.bold]}>Amount</Text>
               </View>

               {/* ── Item body (tax labels in Particulars, values in Amount) ── */}
               <View style={s.itemBody}>
                  <Text style={s.cSr}>1</Text>
                  <View style={[s.cParticulars, { justifyContent: "space-between" }]}>
                     <View>
                        <Text style={s.bold}>{item.title}</Text>
                        {item.subtitle ? <Text style={[s.muted, { fontSize: 8 }]}>{item.subtitle}</Text> : null}
                     </View>
                     <View style={{ marginTop: "auto", alignItems: "flex-end" }}>
                        <Text style={s.bold}>Taxable Amount</Text>
                        <Text>SGST {half} %</Text>
                        <Text>CGST {half} %</Text>
                        <Text>IGST {amounts.gstRate} %</Text>
                     </View>
                  </View>
                  <Text style={s.cHsn}>{item.hsn}</Text>
                  <View style={s.cAmt}>
                     <Text>{money(amounts.taxable)}</Text>
                     <View style={{ marginTop: "auto" }}>
                        <Text style={s.bold}>{money(amounts.taxable)}</Text>
                        <Text>{intra ? money(amounts.sgst) : "-"}</Text>
                        <Text>{intra ? money(amounts.cgst) : "-"}</Text>
                        <Text>{intra ? "-" : money(amounts.igst)}</Text>
                     </View>
                  </View>
               </View>

               {/* ── Total ── */}
               <View style={s.totalRow}>
                  <Text style={[s.cSr, s.bold]}></Text>
                  <Text style={[s.cParticulars, s.bold, { textAlign: "right" }]}>Total</Text>
                  <Text style={[s.cHsn]}></Text>
                  <Text style={[s.cAmt, s.bold]}>{money(amounts.total)}</Text>
               </View>

               {/* ── Amount in words ── */}
               <View style={s.wordsRow}>
                  <Text><Text style={s.label}>Amount Chargeable (in words) : </Text><Text style={s.bold}>{data.amountInWords}</Text></Text>
                  <Text style={s.label}>E. & O.E.</Text>
               </View>

               {/* ── Tax summary table ── */}
               <View style={s.sumRowWrap}>
                  <View style={[s.sumCellV, { width: "16%" }]}><Text style={s.bold}>HSN/SAC</Text></View>
                  <View style={[s.sumCellV, { width: "16%" }]}><Text style={s.bold}>Taxable Value</Text></View>
                  <View style={[s.sumGroup, { width: "18%" }]}>
                     <Text style={s.sumGroupHead}>CGST</Text>
                     <View style={s.row}>
                        <Text style={[s.sumLeaf, s.bold, { width: "44.44%" }]}>Rate</Text>
                        <Text style={[s.sumLeafLast, s.bold, { width: "55.56%" }]}>Amount</Text>
                     </View>
                  </View>
                  <View style={[s.sumGroup, { width: "18%" }]}>
                     <Text style={s.sumGroupHead}>SGST</Text>
                     <View style={s.row}>
                        <Text style={[s.sumLeaf, s.bold, { width: "44.44%" }]}>Rate</Text>
                        <Text style={[s.sumLeafLast, s.bold, { width: "55.56%" }]}>Amount</Text>
                     </View>
                  </View>
                  <View style={[s.sumGroup, { width: "18%" }]}>
                     <Text style={s.sumGroupHead}>IGST</Text>
                     <View style={s.row}>
                        <Text style={[s.sumLeaf, s.bold, { width: "44.44%" }]}>Rate</Text>
                        <Text style={[s.sumLeafLast, s.bold, { width: "55.56%" }]}>Amount</Text>
                     </View>
                  </View>
                  <View style={[s.sumCellV, { width: "14%", borderRightWidth: 0 }]}><Text style={s.bold}>Total Tax Amount</Text></View>
               </View>

               {/* data row */}
               <View style={s.sumRowWrap}>
                  <Text style={[s.sumLeaf, { width: "16%" }]}>{item.hsn}</Text>
                  <Text style={[s.sumLeaf, { width: "16%", textAlign: "right" }]}>{money(amounts.taxable)}</Text>
                  <Text style={[s.sumLeaf, { width: "8%" }]}>{intra ? `${half}%` : "-"}</Text>
                  <Text style={[s.sumLeaf, { width: "10%", textAlign: "right" }]}>{intra ? money(amounts.cgst) : "-"}</Text>
                  <Text style={[s.sumLeaf, { width: "8%" }]}>{intra ? `${half}%` : "-"}</Text>
                  <Text style={[s.sumLeaf, { width: "10%", textAlign: "right" }]}>{intra ? money(amounts.sgst) : "-"}</Text>
                  <Text style={[s.sumLeaf, { width: "8%" }]}>{intra ? "-" : `${amounts.gstRate}%`}</Text>
                  <Text style={[s.sumLeaf, { width: "10%", textAlign: "right" }]}>{intra ? "-" : money(amounts.igst)}</Text>
                  <Text style={[s.sumLeafLast, { width: "14%", textAlign: "right" }]}>{money(totalTax)}</Text>
               </View>

               {/* total row */}
               <View style={s.sumRowWrap}>
                  <Text style={[s.sumLeaf, s.bold, { width: "16%", textAlign: "right" }]}>Total</Text>
                  <Text style={[s.sumLeaf, s.bold, { width: "16%", textAlign: "right" }]}>{money(amounts.taxable)}</Text>
                  <Text style={[s.sumLeaf, { width: "8%" }]}></Text>
                  <Text style={[s.sumLeaf, s.bold, { width: "10%", textAlign: "right" }]}>{intra ? money(amounts.cgst) : ""}</Text>
                  <Text style={[s.sumLeaf, { width: "8%" }]}></Text>
                  <Text style={[s.sumLeaf, s.bold, { width: "10%", textAlign: "right" }]}>{intra ? money(amounts.sgst) : ""}</Text>
                  <Text style={[s.sumLeaf, { width: "8%" }]}></Text>
                  <Text style={[s.sumLeaf, s.bold, { width: "10%", textAlign: "right" }]}>{intra ? "" : money(amounts.igst)}</Text>
                  <Text style={[s.sumLeafLast, s.bold, { width: "14%", textAlign: "right" }]}>{money(totalTax)}</Text>
               </View>
               <View style={s.wordsRow}>
                  <Text><Text style={s.label}>Tax Amount (in words) : </Text><Text style={s.bold}>{data.taxInWords}</Text></Text>
               </View>

               {/* ── Bank + signature ── */}
               <View style={s.footer}>
                  <View style={s.bankBox}>
                     <Text style={s.bold}>Company&apos;s Bank Details</Text>
                     <Text style={s.muted}>A/c Holder&apos;s Name : {SELLER.bank.holder}</Text>
                     <Text style={s.muted}>Bank Name : {SELLER.bank.bankName}</Text>
                     <Text style={s.muted}>A/c No. : {SELLER.bank.accountNo}</Text>
                     <Text style={s.muted}>Branch & IFS Code : {SELLER.bank.branchIfsc}</Text>
                  </View>
                  <View style={s.signBox}>
                     {data.sealSrc ? <PdfImage src={data.sealSrc} style={{ width: 56, height: 56, objectFit: "contain" }} /> : <Text> </Text>}
                     <Text style={[s.muted, { fontSize: 8, textAlign: "left", marginTop: 12, width: "100%" }]}>For {SELLER.name}</Text>
                  </View>
               </View>

               {/* ── Declaration ── */}
               <View style={s.declRow}>
                  <View style={{ width: "60%", padding: 8, borderRightWidth: 1, borderColor: BORDER }}>
                     <Text style={s.label}>Note:</Text>
                  </View>
                  <View style={{ width: "40%", padding: 8 }}>
                     <Text style={s.bold}>Declaration:</Text>
                     <Text style={s.muted}>Company&apos;s PAN {SELLER.pan}</Text>
                     <Text style={s.muted}>MSME Regn No / UAM No. {SELLER.msme}</Text>
                  </View>
               </View>
            </View>

            <Text style={{ textAlign: "center", marginTop: 8, fontSize: 8, color: "#6b7280" }}>
               SUBJECT TO {SELLER.jurisdiction.toUpperCase()} JURISDICTION — This is a Computer Generated invoice
            </Text>
         </Page>
      </Document>
   )
}
