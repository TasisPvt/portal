import { notFound } from "next/navigation"
import Link from "next/link"
import {
   BadgeCheckIcon,
   CheckIcon,
   ChevronLeftIcon,
   ChevronRightIcon,
   ClockIcon,
   HashIcon,
   HistoryIcon,
   ListOrderedIcon,
   TrendingUpIcon,
} from "lucide-react"

import { getCompanyDetail } from "../_actions"
import { db } from "@/src/db/client"
import { industryGroup } from "@/src/db/schema"
import { SiteHeader } from "@/src/components/site-header"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { cn } from "@/src/lib/utils"
import { EditCompanyDialog } from "../_components/company-dialogs"

const DASH = <span className="text-muted-foreground/50">—</span>

// Card header: primary icon + title with an underline, matching the reference.
function SectionHeader({
   icon: Icon,
   title,
   action,
}: {
   icon: React.ElementType
   title: string
   action?: React.ReactNode
}) {
   return (
      <CardHeader className="border-b">
         <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Icon className="size-4.5 text-primary" />
            {title}
         </CardTitle>
         {action && <CardAction>{action}</CardAction>}
      </CardHeader>
   )
}

// Stacked label/value pair (Identifiers grid).
function KV({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
   return (
      <div className={cn("flex flex-col gap-1", className)}>
         <span className="text-xs font-medium text-muted-foreground">{label}</span>
         <span className="text-sm font-semibold text-foreground">{value ?? DASH}</span>
      </div>
   )
}

// Label ↔ value on one line with an underline (Record Info).
function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
   return (
      <div className="flex items-center justify-between gap-2 border-b border-border/50 py-3 last:border-0">
         <span className="text-sm text-muted-foreground">{label}</span>
         <span className="text-sm font-semibold text-foreground">{value}</span>
      </div>
   )
}

// A label + value pair rendered as two grid cells (Exchange Details).
function ExField({ label, value }: { label: string; value: React.ReactNode }) {
   return (
      <>
         <dt className="text-muted-foreground">{label}</dt>
         <dd className="font-semibold text-foreground">{value ?? DASH}</dd>
      </>
   )
}

function formatDate(d: string | null | undefined) {
   if (!d) return null
   return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

const fmtLong = (d: Date) =>
   d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })

export default async function CompanyDetailPage({
   params,
   searchParams,
}: {
   params: Promise<{ id: string }>
   searchParams: Promise<{ from?: string }>
}) {
   const [{ id }, { from }] = await Promise.all([params, searchParams])

   const [company, industryGroups] = await Promise.all([
      getCompanyDetail(id),
      db.select({ id: industryGroup.id, name: industryGroup.name }).from(industryGroup).orderBy(industryGroup.name),
   ])

   if (!company) notFound()

   // Determine back link: use ?from= if provided and starts with /admin/, else default to company list
   const backHref = from?.startsWith("/admin/") ? from : "/admin/company"
   const backLabel = from?.startsWith("/admin/index/") ? "Index" : "Companies"

   // nameHistory stores old names in ascending order; show newest-first
   const oldNames = [...company.nameHistory].reverse()

   return (
      <>
         <SiteHeader title={company.companyName} breadcrumb="Companies" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-4 md:py-6 lg:px-6">

               {/* Back */}
               <Button variant="ghost" size="sm" className="-ml-2 w-fit gap-1.5 text-muted-foreground" asChild>
                  <Link href={backHref}>
                     <ChevronLeftIcon className="size-4" />
                     {backLabel}
                  </Link>
               </Button>

               {/* Page header */}
               <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                     <h1 className="text-3xl font-bold tracking-tight">{company.companyName}</h1>
                     {company.industryGroupName && (
                        <Badge
                           variant="outline"
                           className="rounded-lg border-primary/15 bg-primary/5 text-xs font-semibold text-primary"
                        >
                           {company.industryGroupName}
                        </Badge>
                     )}
                     <EditCompanyDialog company={company} industryGroups={industryGroups} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                     Prowess ID: <span className="font-mono font-semibold text-foreground/80">{company.prowessId}</span>
                  </p>
               </div>

               {/* Bento grid */}
               <div className="grid grid-cols-1 gap-4 @4xl/main:grid-cols-3">

                  {/* Identifiers */}
                  <Card className="@4xl/main:col-span-2">
                     <SectionHeader icon={HashIcon} title="Identifiers" />
                     <CardContent>
                        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 @2xl/main:grid-cols-2">
                           <KV label="Company Name" value={company.companyName} />
                           <KV
                              label="ISIN Code"
                              value={company.isinCode ? <span className="font-mono">{company.isinCode}</span> : null}
                           />
                           <KV label="Prowess ID" value={<span className="font-mono">{company.prowessId}</span>} />
                           <KV label="Service Group" value={company.serviceGroup} />
                           <KV
                              label="Industry Group"
                              value={company.industryGroupName}
                              className="@2xl/main:col-span-2"
                           />
                        </dl>
                     </CardContent>
                  </Card>

                  {/* Record Info */}
                  <Card>
                     <SectionHeader icon={ClockIcon} title="Record Info" />
                     <CardContent className="flex flex-col">
                        <InfoRow label="Created" value={fmtLong(company.createdAt)} />
                        <InfoRow label="Last Updated" value={fmtLong(company.updatedAt)} />
                        <InfoRow
                           label="Name Changes"
                           value={
                              company.nameHistory.length > 0 ? (
                                 <span className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                                    {company.nameHistory.length}
                                 </span>
                              ) : (
                                 <span className="text-muted-foreground">None</span>
                              )
                           }
                        />
                     </CardContent>
                  </Card>

                  {/* Exchange Details */}
                  <Card className="@4xl/main:col-span-2">
                     <SectionHeader icon={TrendingUpIcon} title="Exchange Details" />
                     <CardContent className="grid grid-cols-1 gap-6 divide-y divide-border/60 @2xl/main:grid-cols-2 @2xl/main:divide-x @2xl/main:divide-y-0">
                        <div className="@2xl/main:pr-6">
                           <h4 className="text-xs font-bold uppercase tracking-widest text-primary">BSE</h4>
                           <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                              <ExField
                                 label="Scrip Code"
                                 value={company.bseScripCode ? <span className="font-mono">{company.bseScripCode}</span> : null}
                              />
                              <ExField
                                 label="Scrip ID"
                                 value={company.bseScripId ? <span className="font-mono">{company.bseScripId}</span> : null}
                              />
                              <ExField label="Group" value={company.bseGroup} />
                              <ExField label="Listing Date" value={formatDate(company.bseListingDate)} />
                              <ExField label="Delisting Date" value={formatDate(company.bseDelistingDate)} />
                           </dl>
                        </div>
                        <div className="pt-6 @2xl/main:pl-6 @2xl/main:pt-0">
                           <h4 className="text-xs font-bold uppercase tracking-widest text-primary">NSE</h4>
                           <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                              <ExField
                                 label="Symbol"
                                 value={company.nseSymbol ? <span className="font-mono">{company.nseSymbol}</span> : null}
                              />
                              <ExField label="Listing Date" value={formatDate(company.nseListingDate)} />
                              <ExField label="Delisting Date" value={formatDate(company.nseDelistingDate)} />
                           </dl>
                        </div>
                     </CardContent>
                  </Card>

                  {/* Name History */}
                  <Card>
                     <SectionHeader icon={HistoryIcon} title="Name History" />
                     <CardContent>
                        <div className="relative flex flex-col before:absolute before:bottom-3 before:left-3 before:top-1.5 before:w-px before:bg-border">
                           {/* Current name */}
                           <div className="relative flex flex-col gap-0.5 pb-5 pl-9">
                              <span className="absolute left-0 top-0 flex size-6 items-center justify-center rounded-full bg-primary ring-4 ring-primary/15">
                                 <CheckIcon className="size-3.5 text-primary-foreground" />
                              </span>
                              <span className="text-sm font-semibold">{company.companyName}</span>
                              {oldNames[0] && (
                                 <span className="text-xs text-muted-foreground">Since {fmtLong(oldNames[0].changedAt)}</span>
                              )}
                              <Badge className="mt-1 w-fit rounded border-transparent bg-emerald-50 text-[10px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                                 Current
                              </Badge>
                           </div>

                           {/* Previous names - newest first */}
                           {oldNames.length === 0 ? (
                              <p className="pl-9 text-sm text-muted-foreground">No previous names.</p>
                           ) : (
                              oldNames.map((h) => (
                                 <div key={h.id} className="relative flex flex-col gap-0.5 pb-5 pl-9 last:pb-0">
                                    <span className="absolute left-[7px] top-1.5 size-2.5 rounded-full bg-muted-foreground/40 ring-4 ring-card" />
                                    <span className="text-sm text-muted-foreground">{h.name}</span>
                                    <span className="text-xs text-muted-foreground/70">Renamed {fmtLong(h.changedAt)}</span>
                                 </div>
                              ))
                           )}
                        </div>
                     </CardContent>
                  </Card>

                  {/* Indexes */}
                  <Card className="@4xl/main:col-span-3">
                     <SectionHeader
                        icon={ListOrderedIcon}
                        title="Indexes"
                        action={
                           company.indexes.length > 0 ? (
                              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                 {company.indexes.length} Associated
                              </span>
                           ) : undefined
                        }
                     />
                     <CardContent>
                        {company.indexes.length === 0 ? (
                           <p className="text-sm text-muted-foreground">Not part of any index.</p>
                        ) : (
                           <div className="grid grid-cols-1 gap-3 @2xl/main:grid-cols-2">
                              {company.indexes.map((idx) => (
                                 <Link
                                    key={idx.id}
                                    href={`/admin/index/${idx.id}`}
                                    className="group flex items-center gap-3 rounded-lg border bg-muted/30 p-3 transition-colors hover:border-primary/30 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                 >
                                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-sm transition-transform group-hover:scale-105">
                                       <BadgeCheckIcon className="size-5" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                       <p className="text-sm font-semibold leading-snug">{idx.name}</p>
                                       <span className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                                          <span className="size-1.5 rounded-full bg-emerald-500" />
                                          Included
                                       </span>
                                    </div>
                                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                                 </Link>
                              ))}
                           </div>
                        )}
                     </CardContent>
                  </Card>

               </div>
            </div>
         </div>
      </>
   )
}
