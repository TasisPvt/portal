import { notFound } from "next/navigation"
import Link from "next/link"
import {
   CalendarIcon,
   ChevronLeftIcon,
   ClockIcon,
   HashIcon,
   LayersIcon,
   TrendingUpIcon,
} from "lucide-react"

import { getCompanyDetail } from "../_actions"
import { db } from "@/src/db/client"
import { industryGroup } from "@/src/db/schema"
import { SiteHeader } from "@/src/components/site-header"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { EditCompanyDialog } from "../_components/company-dialogs"

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
   return (
      <div className="flex flex-col gap-0.5 py-2.5">
         <span className="text-xs font-medium text-muted-foreground">{label}</span>
         <span className="text-sm text-foreground">{value ?? <span className="text-muted-foreground/50">—</span>}</span>
      </div>
   )
}

function formatDate(d: string | null | undefined) {
   if (!d) return null
   return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function CompanyDetailPage({
   params,
}: {
   params: Promise<{ id: string }>
}) {
   const { id } = await params
   const [company, industryGroups] = await Promise.all([
      getCompanyDetail(id),
      db.select({ id: industryGroup.id, name: industryGroup.name }).from(industryGroup).orderBy(industryGroup.name),
   ])

   if (!company) notFound()

   // nameHistory stores old names in ascending order; show newest-first
   const oldNames = [...company.nameHistory].reverse()

   return (
      <>
         <SiteHeader title={company.companyName} breadcrumb="Companies" />
         <div className="flex flex-1 flex-col">
            <div className="flex flex-col gap-6 py-6 px-4 lg:px-6 max-w-5xl">

               {/* Back + Actions */}
               <div className="flex items-center justify-between gap-4">
                  <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground" asChild>
                     <Link href="/admin/company">
                        <ChevronLeftIcon className="size-4" />
                        Companies
                     </Link>
                  </Button>
                  <EditCompanyDialog company={company} industryGroups={industryGroups} />
               </div>

               {/* Header */}
               <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                     <h1 className="text-2xl font-bold tracking-tight">{company.companyName}</h1>
                     {company.industryGroupName && (
                        <Badge variant="outline" className="text-xs font-normal">
                           {company.industryGroupName}
                        </Badge>
                     )}
                  </div>
                  <p className="text-sm text-muted-foreground font-mono">Prowess ID: {company.prowessId}</p>
               </div>

               <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

                  {/* Identifiers */}
                  <Card className="lg:col-span-2">
                     <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                           <HashIcon className="size-4 text-muted-foreground" />
                           Identifiers
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="divide-y divide-border/60 px-4 pb-4">
                        <DetailRow label="Company Name" value={company.companyName} />
                        <DetailRow label="ISIN Code" value={company.isinCode
                           ? <span className="font-mono text-sm">{company.isinCode}</span>
                           : null}
                        />
                        <DetailRow label="Prowess ID" value={<span className="font-mono text-sm">{company.prowessId}</span>} />
                        <DetailRow label="Service Group" value={company.serviceGroup} />
                        <DetailRow label="Industry Group" value={company.industryGroupName} />
                     </CardContent>
                  </Card>

                  {/* Timestamps */}
                  <Card>
                     <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                           <ClockIcon className="size-4 text-muted-foreground" />
                           Record Info
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="divide-y divide-border/60 px-4 pb-4">
                        <DetailRow
                           label="Created"
                           value={company.createdAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        />
                        <DetailRow
                           label="Last Updated"
                           value={company.updatedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        />
                        <DetailRow
                           label="Name Changes"
                           value={company.nameHistory.length > 0 ? company.nameHistory.length : "None"}
                        />
                     </CardContent>
                  </Card>

                  {/* Exchange Details */}
                  <Card className="lg:col-span-2">
                     <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                           <TrendingUpIcon className="size-4 text-muted-foreground" />
                           Exchange Details
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/60 px-4 pb-4">
                        <div className="divide-y divide-border/60 sm:pr-4">
                           <div className="pb-1 pt-1">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">BSE</span>
                           </div>
                           <DetailRow label="Scrip Code" value={company.bseScripCode
                              ? <span className="font-mono text-sm">{company.bseScripCode}</span>
                              : null}
                           />
                           <DetailRow label="Scrip ID" value={company.bseScripId
                              ? <span className="font-mono text-sm">{company.bseScripId}</span>
                              : null}
                           />
                           <DetailRow label="Group" value={company.bseGroup} />
                           <DetailRow label="Listing Date" value={formatDate(company.bseListingDate)} />
                           <DetailRow label="Delisting Date" value={formatDate(company.bseDelistingDate)} />
                        </div>
                        <div className="divide-y divide-border/60 sm:pl-4 pt-2 sm:pt-0">
                           <div className="pb-1 pt-1">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">NSE</span>
                           </div>
                           <DetailRow label="Symbol" value={company.nseSymbol
                              ? <span className="font-mono text-sm">{company.nseSymbol}</span>
                              : null}
                           />
                           <DetailRow label="Listing Date" value={formatDate(company.nseListingDate)} />
                           <DetailRow label="Delisting Date" value={formatDate(company.nseDelistingDate)} />
                        </div>
                     </CardContent>
                  </Card>

                  {/* Name History */}
                  <Card className="lg:col-span-3">
                     <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                           <LayersIcon className="size-4 text-muted-foreground" />
                           Name History
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="px-4 pb-4">
                        <ol className="relative border-l border-border/60 ml-2 flex flex-col gap-0">
                           {/* Current name — always at top */}
                           <li className="mb-4 ml-4">
                              <div className="flex flex-col gap-0.5">
                                 <span className="text-sm font-semibold">{company.companyName}</span>
                                 {oldNames[0] && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                       <CalendarIcon className="size-3" />
                                       Since{" "}
                                       {oldNames[0].changedAt.toLocaleDateString("en-IN", {
                                          day: "2-digit", month: "short", year: "numeric",
                                       })}
                                    </span>
                                 )}
                                 <Badge variant="outline" className="w-fit text-xs mt-0.5 border-primary/40 text-primary">Current</Badge>
                              </div>
                           </li>

                           {/* Old names — newest first */}
                           {oldNames.length === 0 ? (
                              <li className="ml-4 text-sm text-muted-foreground">No previous names.</li>
                           ) : oldNames.map((h) => (
                              <li key={h.id} className="mb-4 ml-4">
                                 <div className="flex flex-col gap-0.5">
                                    <span className="text-sm text-muted-foreground line-through decoration-muted-foreground/40">
                                       {h.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                       <CalendarIcon className="size-3" />
                                       Renamed{" "}
                                       {h.changedAt.toLocaleDateString("en-IN", {
                                          day: "2-digit", month: "short", year: "numeric",
                                       })}
                                    </span>
                                 </div>
                              </li>
                           ))}
                        </ol>
                     </CardContent>
                  </Card>

               </div>
            </div>
         </div>
      </>
   )
}
