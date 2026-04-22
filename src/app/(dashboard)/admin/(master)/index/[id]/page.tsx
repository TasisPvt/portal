import { notFound } from "next/navigation"
import Link from "next/link"
import { Building2Icon, ChevronLeftIcon, ClockIcon, LayersIcon } from "lucide-react"

import { getIndexDetail } from "../_actions"
import { SiteHeader } from "@/src/components/site-header"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { EditIndexDialog } from "../_components/index-dialogs"
import { IndexCompanyTable, type IndexCompanyRow } from "./_components/index-company-table"
import { ImportCompaniesDialog } from "./_components/import-companies-dialog"

export default async function IndexDetailPage({
   params,
}: {
   params: Promise<{ id: string }>
}) {
   const { id } = await params
   const idx = await getIndexDetail(id)
   if (!idx) notFound()

   const companies: IndexCompanyRow[] = idx.companies.map((c) => ({
      indexCompanyId: c.indexCompanyId,
      companyId: c.companyId,
      prowessId: c.prowessId,
      companyName: c.companyName,
      isinCode: c.isinCode,
      bseScripCode: c.bseScripCode,
      nseSymbol: c.nseSymbol,
      addedAt: c.addedAt,
   }))


   return (
      <>
         <SiteHeader title={idx.name} breadcrumb="Indexes" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
               <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

                  {/* Back + Actions */}
                  <div className="flex items-center justify-between gap-4 px-4 lg:px-6">
                     <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground" asChild>
                        <Link href="/admin/index">
                           <ChevronLeftIcon className="size-4" />
                           Indexes
                        </Link>
                     </Button>
                     <div className="flex items-center gap-2">
                        <ImportCompaniesDialog indexId={id} existingCompanies={companies} />
                        <EditIndexDialog index={idx} />
                     </div>
                  </div>

                  {/* Header */}
                  <div className="px-4 lg:px-6">
                     <h1 className="text-2xl font-bold tracking-tight">{idx.name}</h1>
                     {idx.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{idx.description}</p>
                     )}
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-3 lg:px-6">
                     <Card size="sm">
                        <CardHeader>
                           <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-medium text-muted-foreground">Companies</CardTitle>
                              <span className="inline-flex size-8 items-center justify-center rounded-lg text-primary bg-primary/10">
                                 <Building2Icon className="size-4" />
                              </span>
                           </div>
                        </CardHeader>
                        <CardContent>
                           <p className="text-3xl font-bold tracking-tight">{companies.length}</p>
                        </CardContent>
                     </Card>
                     <Card size="sm">
                        <CardHeader>
                           <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-medium text-muted-foreground">Created</CardTitle>
                              <span className="inline-flex size-8 items-center justify-center rounded-lg text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950">
                                 <ClockIcon className="size-4" />
                              </span>
                           </div>
                        </CardHeader>
                        <CardContent>
                           <p className="text-lg font-bold tracking-tight">
                              {idx.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                           </p>
                        </CardContent>
                     </Card>
                     <Card size="sm">
                        <CardHeader>
                           <div className="flex items-center justify-between">
                              <CardTitle className="text-sm font-medium text-muted-foreground">Last Updated</CardTitle>
                              <span className="inline-flex size-8 items-center justify-center rounded-lg text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-950">
                                 <LayersIcon className="size-4" />
                              </span>
                           </div>
                        </CardHeader>
                        <CardContent>
                           <p className="text-lg font-bold tracking-tight">
                              {idx.updatedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                           </p>
                        </CardContent>
                     </Card>
                  </div>

                  {/* Company table */}
                  <div className="px-4 lg:px-6">
                     <IndexCompanyTable data={companies} indexId={id} indexName={idx.name} />
                  </div>

               </div>
            </div>
         </div>
      </>
   )
}
