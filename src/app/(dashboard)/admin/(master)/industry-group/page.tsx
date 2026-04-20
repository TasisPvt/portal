import { db } from "@/src/db/client"
import { industryGroup, companyMaster } from "@/src/db/schema"
import { eq, sql } from "drizzle-orm"
import { LayersIcon, BuildingIcon, CheckCircle2Icon } from "lucide-react"

import { SiteHeader } from "@/src/components/site-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { IndustryGroupTable } from "./_components/industry-group-table"
import { AddIndustryGroupDialog } from "./_components/industry-group-dialogs"

export default async function IndustryGroupPage() {
   const groups = await db
      .select({
         id: industryGroup.id,
         name: industryGroup.name,
         createdAt: industryGroup.createdAt,
         companyCount: sql<number>`cast(count(${companyMaster.id}) as int)`,
      })
      .from(industryGroup)
      .leftJoin(companyMaster, eq(companyMaster.industryGroupId, industryGroup.id))
      .groupBy(industryGroup.id)
      .orderBy(industryGroup.name)

   const total = groups.length
   const withCompanies = groups.filter((g) => g.companyCount > 0).length
   const empty = total - withCompanies

   const stats = [
      {
         label: "Total Groups",
         value: total,
         icon: LayersIcon,
         iconClass: "text-primary bg-primary/10",
      },
      {
         label: "With Companies",
         value: withCompanies,
         icon: BuildingIcon,
         iconClass: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950",
      },
      {
         label: "Empty Groups",
         value: empty,
         icon: CheckCircle2Icon,
         iconClass: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950",
      },
   ]

   return (
      <>
         <SiteHeader title="Industry Groups" breadcrumb="Master" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
               <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

                  <div className="flex items-center justify-between px-4 lg:px-6">
                     <h2 className="text-xl font-semibold tracking-tight">Industry Groups</h2>
                     <AddIndustryGroupDialog />
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
                     <IndustryGroupTable data={groups} />
                  </div>

               </div>
            </div>
         </div>
      </>
   )
}
