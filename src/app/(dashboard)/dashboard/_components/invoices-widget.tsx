"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { DownloadIcon, FileTextIcon, ReceiptTextIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Spinner } from "@/src/components/ui/spinner"
import { BrandedLoader } from "@/src/components/branded-loader"
import { formatPrice as fmtPrice, formatDate as fmtDate } from "@/src/lib/format"
import { DURATION_LABELS } from "@/src/lib/constants"
import type { DashboardInvoice } from "../_actions"

// Fetches a single invoice PDF and triggers a browser download.
async function downloadInvoice(paymentId: string): Promise<void> {
   const res = await fetch(`/api/payments/${paymentId}/invoice`)
   if (!res.ok) throw new Error(String(res.status))
   const blob = await res.blob()
   const cd = res.headers.get("Content-Disposition") ?? ""
   const filename = /filename="([^"]+)"/.exec(cd)?.[1] ?? "invoice.pdf"
   const url = URL.createObjectURL(blob)
   const a = document.createElement("a")
   a.href = url
   a.download = filename
   document.body.appendChild(a)
   a.click()
   a.remove()
   URL.revokeObjectURL(url)
}

export function InvoicesWidget({ invoices, className }: { invoices: DashboardInvoice[]; className?: string }) {
   const [downloadingId, setDownloadingId] = React.useState<string | null>(null)

   async function handleDownload(id: string) {
      if (downloadingId) return
      setDownloadingId(id)
      try {
         await downloadInvoice(id)
      } catch {
         toast.error("Could not download the invoice. Please try again.")
      } finally {
         setDownloadingId(null)
      }
   }

   return (
      <>
      <Card className={className}>
         <CardHeader>
            <div className="flex items-center justify-between gap-2">
               <div className="flex items-center gap-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                     <ReceiptTextIcon className="size-4.5" />
                  </span>
                  <CardTitle className="text-base">My Invoices</CardTitle>
               </div>
               <Button asChild variant="outline" size="sm" className="text-xs font-bold text-primary">
                  <Link href="/payments">View all</Link>
               </Button>
            </div>
         </CardHeader>
         <CardContent>
            {invoices.length === 0 ? (
               <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center">
                  <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
                     <ReceiptTextIcon className="size-5" />
                  </div>
                  <div>
                     <p className="text-sm font-medium text-foreground">No invoices yet</p>
                     <p className="mt-1 text-xs text-muted-foreground">
                        Your paid orders and their tax invoices will appear here.
                     </p>
                  </div>
               </div>
            ) : (
               <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                     <thead>
                        <tr className="border-b text-left text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                           <th className="pb-2.5 font-semibold">Plan name</th>
                           <th className="pb-2.5 font-semibold">Date</th>
                           <th className="pb-2.5 text-right font-semibold">Amount</th>
                           <th className="pb-2.5 text-right font-semibold">Download</th>
                        </tr>
                     </thead>
                     <tbody>
                        {invoices.map((inv) => {
                           const isDownloading = downloadingId === inv.id
                           return (
                              <tr key={inv.id} className="border-b last:border-0">
                                 <td className="py-3 pr-3">
                                    <div className="flex items-center gap-2.5">
                                       <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                                          <FileTextIcon className="size-4" />
                                       </span>
                                       <span className="font-medium leading-tight">
                                          {inv.planName ?? "-"}
                                          <span className="text-muted-foreground">
                                             {" – "}
                                             {DURATION_LABELS[inv.durationType] ?? inv.durationType}
                                          </span>
                                       </span>
                                    </div>
                                 </td>
                                 <td className="whitespace-nowrap py-3 pr-3 text-muted-foreground">
                                    {fmtDate(inv.createdAt)}
                                 </td>
                                 <td className="whitespace-nowrap py-3 pr-3 text-right font-semibold tabular-nums">
                                    {fmtPrice(inv.amount)}
                                 </td>
                                 <td className="py-3 text-right">
                                    <Button
                                       variant="outline"
                                       size="sm"
                                       className="gap-1.5"
                                       onClick={() => handleDownload(inv.id)}
                                       disabled={!!downloadingId}
                                       title="Download invoice"
                                    >
                                       {isDownloading ? (
                                          <Spinner className="size-3.5" />
                                       ) : (
                                          <DownloadIcon className="size-3.5" />
                                       )}
                                       Download
                                    </Button>
                                 </td>
                              </tr>
                           )
                        })}
                     </tbody>
                  </table>
               </div>
            )}
         </CardContent>
      </Card>

      {downloadingId && (
         <BrandedLoader
            overlay
            icon={ReceiptTextIcon}
            title="Preparing your invoice"
            messages={[
               "Generating your tax invoice…",
               "Adding your billing details…",
               "Almost ready…",
            ]}
         />
      )}
      </>
   )
}
