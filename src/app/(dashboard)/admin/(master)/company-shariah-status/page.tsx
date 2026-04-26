import { ShieldCheckIcon } from "lucide-react"

import { SiteHeader } from "@/src/components/site-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { getShariahDataForMonth, getAvailableMonths } from "./_actions"
import { getCurrentMonth, formatMonthLabel } from "./_utils"
import { ShariahTable } from "./_components/shariah-table"
import { ImportShariahDialog } from "./_components/import-shariah-dialog"

export default async function CompanyShariahStatusPage({
   searchParams,
}: {
   searchParams: Promise<{ month?: string }>
}) {
   const { month: monthParam } = await searchParams
   const currentMonth = getCurrentMonth()

   const [availableMonths, data] = await Promise.all([
      getAvailableMonths(),
      getShariahDataForMonth(monthParam || currentMonth),
   ])

   const selectedMonth = monthParam || currentMonth

   // Ensure current month always appears in options even if no data yet
   const monthOptions = availableMonths.includes(currentMonth)
      ? availableMonths
      : [currentMonth, ...availableMonths]

   const withData = data.filter((r) => r.shariahId !== null).length
   const compliant = data.filter((r) => r.shariahStatus === 1).length
   const nonCompliant = data.filter(
      (r) => r.shariahStatus !== null && r.shariahStatus !== 1 && r.shariahStatus !== 9,
   ).length

   const stats = [
      {
         label: "With Data",
         value: `${withData} / ${data.length}`,
         icon: ShieldCheckIcon,
         iconClass: "text-primary bg-primary/10",
      },
      {
         label: "Shariah Compliant",
         value: compliant,
         icon: ShieldCheckIcon,
         iconClass: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950",
      },
      {
         label: "Non-Compliant",
         value: nonCompliant,
         icon: ShieldCheckIcon,
         iconClass: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950",
      },
   ]

   return (
      <>
         <SiteHeader title="Shariah Status" breadcrumb="Master" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
               <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

                  <div className="flex items-center justify-between px-4 lg:px-6">
                     <div className="flex flex-col gap-0.5">
                        <h2 className="text-xl font-semibold tracking-tight">Shariah Status</h2>
                        <p className="text-sm text-muted-foreground">{formatMonthLabel(selectedMonth)}</p>
                     </div>
                     <ImportShariahDialog />
                  </div>

                  <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-3 lg:px-6">
                     {stats.map(({ label, value, icon: Icon, iconClass }) => (
                        <Card key={label} size="sm">
                           <CardHeader>
                              <div className="flex items-center justify-between">
                                 <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                                 <span className={`inline-flex size-8 items-center justify-center rounded-lg ${iconClass}`}>
                                    <Icon className="size-4" />
                                 </span>
                              </div>
                           </CardHeader>
                           <CardContent>
                              <p className="text-3xl font-bold tracking-tight">{value}</p>
                           </CardContent>
                        </Card>
                     ))}
                  </div>

                  <div className="px-4 lg:px-6">
                     <ShariahTable
                        data={data}
                        selectedMonth={selectedMonth}
                        monthOptions={monthOptions}
                        currentMonth={currentMonth}
                     />
                  </div>

               </div>
            </div>
         </div>
      </>
   )
}
