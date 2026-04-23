import { db } from "@/src/db/client"
import { companyMaster, industryGroup } from "@/src/db/schema"
import { eq } from "drizzle-orm"
import { Building2Icon, LayersIcon, ListIcon } from "lucide-react"

import { SiteHeader } from "@/src/components/site-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { CompanyTable } from "./_components/company-table"
import { AddCompanyDialog } from "./_components/company-dialogs"

export default async function CompanyPage() {
   const [companies, industryGroups] = await Promise.all([
      db
         .select({
            id: companyMaster.id,
            prowessId: companyMaster.prowessId,
            companyName: companyMaster.companyName,
            isinCode: companyMaster.isinCode,
            bseScripCode: companyMaster.bseScripCode,
            bseScripId: companyMaster.bseScripId,
            bseGroup: companyMaster.bseGroup,
            nseSymbol: companyMaster.nseSymbol,
            serviceGroup: companyMaster.serviceGroup,
            nseListingDate: companyMaster.nseListingDate,
            nseDelistingDate: companyMaster.nseDelistingDate,
            bseListingDate: companyMaster.bseListingDate,
            bseDelistingDate: companyMaster.bseDelistingDate,
            industryGroupId: companyMaster.industryGroupId,
            industryGroupName: industryGroup.name,
            isActive: companyMaster.isActive,
            createdAt: companyMaster.createdAt,
         })
         .from(companyMaster)
         .leftJoin(industryGroup, eq(companyMaster.industryGroupId, industryGroup.id))
         .orderBy(companyMaster.companyName),
      db
         .select({ id: industryGroup.id, name: industryGroup.name })
         .from(industryGroup)
         .orderBy(industryGroup.name),
   ])

   const total = companies.length
   const withGroup = companies.filter((c) => c.industryGroupId).length
   const uniqueServiceGroups = new Set(companies.map((c) => c.serviceGroup)).size

   const stats = [
      {
         label: "Total Companies",
         value: total,
         icon: Building2Icon,
         iconClass: "text-primary bg-primary/10",
      },
      {
         label: "Linked to Industry",
         value: withGroup,
         icon: LayersIcon,
         iconClass: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950",
      },
      {
         label: "Service Groups",
         value: uniqueServiceGroups,
         icon: ListIcon,
         iconClass: "text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-950",
      },
   ]

   return (
      <>
         <SiteHeader title="Companies" breadcrumb="Master" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
               <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

                  <div className="flex items-center justify-between px-4 lg:px-6">
                     <h2 className="text-xl font-semibold tracking-tight">Companies</h2>
                     <AddCompanyDialog industryGroups={industryGroups} />
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
                     <CompanyTable data={companies} industryGroups={industryGroups} />
                  </div>

               </div>
            </div>
         </div>
      </>
   )
}
