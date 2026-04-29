import { TagIcon, CameraIcon, ListIcon, ZapIcon } from "lucide-react"

import { SiteHeader } from "@/src/components/site-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { getPricingPlans, getAvailableIndexes } from "./_actions"
import { PricingPlansTable } from "./_components/pricing-plans-table"
import { AddPricingPlanDialog } from "./_components/pricing-plan-dialogs"

export default async function PricingPlansPage() {
   const [plans, indexes] = await Promise.all([getPricingPlans(), getAvailableIndexes()])

   const total = plans.length
   const active = plans.filter((p) => p.isActive).length
   const snapshots = plans.filter((p) => p.type === "snapshot").length
   const lists = plans.filter((p) => p.type === "list").length

   const stats = [
      {
         label: "Total Plans",
         value: total,
         icon: TagIcon,
         iconClass: "text-primary bg-primary/10",
      },
      {
         label: "Active",
         value: active,
         icon: ZapIcon,
         iconClass: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950",
      },
      {
         label: "Snapshot",
         value: snapshots,
         icon: CameraIcon,
         iconClass: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950",
      },
      {
         label: "List",
         value: lists,
         icon: ListIcon,
         iconClass: "text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-950",
      },
   ]

   return (
      <>
         <SiteHeader title="Pricing Plans" breadcrumb="Master" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
               <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

                  <div className="flex items-center justify-between px-4 lg:px-6">
                     <h2 className="text-xl font-semibold tracking-tight">Pricing Plans</h2>
                     <AddPricingPlanDialog indexes={indexes} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 px-4 sm:grid-cols-4 lg:px-6">
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
                     <PricingPlansTable data={plans} indexes={indexes} />
                  </div>

               </div>
            </div>
         </div>
      </>
   )
}
