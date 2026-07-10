import Link from "next/link"
import {
   ArrowRightIcon,
   EyeIcon,
   AlertTriangleIcon,
   Building2Icon,
   CheckCircle2Icon,
   LockIcon,
   PackageIcon,
   BookmarkIcon,
   TrendingUpIcon,
   TrophyIcon,
} from "lucide-react"

import { SiteHeader } from "@/src/components/site-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Badge } from "@/src/components/ui/badge"
import { cn } from "@/src/lib/utils"
import { formatDate } from "@/src/lib/format"
import { DURATION_LABELS } from "@/src/lib/constants"
import {
   getClientDashboard,
   type DashboardSubscription,
   type DashboardWatchItem,
   type DashboardStock,
   type DashboardList,
} from "./_actions"

export default async function ClientDashboardPage() {
   const data = await getClientDashboard()

   if (!data) {
      return (
         <>
            <SiteHeader title="Dashboard" />
            <div className="p-6 text-sm text-muted-foreground">Please sign in to view your dashboard.</div>
         </>
      )
   }

   const hour = new Date().getHours()
   const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

   return (
      <>
         <SiteHeader title="Dashboard" />
         <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            <CompaniesBanner count={data.companiesScreened} greeting={greeting} firstName={data.firstName} />

            <div className="grid grid-cols-1 gap-4 @4xl/main:grid-cols-3">
               <SubscriptionsWidget subscriptions={data.subscriptions} className="@4xl/main:col-span-2" />
               <MostPurchasedWidget lists={data.mostPurchasedLists} />
            </div>

            <div className="grid grid-cols-1 gap-4 @4xl/main:grid-cols-3">
               <WatchlistWidget items={data.watchlist} className="@4xl/main:col-span-2" />
               <MostViewedWidget stocks={data.mostViewed} hasActiveSnapshot={data.hasActiveSnapshot} />
            </div>
         </div>
      </>
   )
}

// ─── Shared bits ────────────────────────────────────────────────────────────────

// Compact compliance dot — status is never conveyed by color alone (shape + label).
function StatusPill({ status }: { status: number | null }) {
   if (status === null) return <span className="text-xs text-muted-foreground">Unrated</span>
   const compliant = status === 1
   return (
      <span
         className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            compliant
               ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
               : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
         )}
      >
         <span
            className={cn("size-1.5 rounded-full", compliant ? "bg-green-600 dark:bg-green-400" : "bg-red-600 dark:bg-red-400")}
            aria-hidden="true"
         />
         {compliant ? "Compliant" : "Non-compliant"}
      </span>
   )
}

// Icon tile + title/description, matching the admin dashboard widget headers.
function WidgetTitle({ icon, tone, title, description }: { icon: React.ReactNode; tone: string; title: string; description: string }) {
   return (
      <div className="flex items-center gap-2.5">
         <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", tone)}>{icon}</span>
         <div className="space-y-0.5">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
         </div>
      </div>
   )
}

function RankBadge({ n }: { n: number }) {
   return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground tabular-nums">
         {n}
      </span>
   )
}

function EmptyInline({ icon, title, desc, href, cta }: { icon: React.ReactNode; title: string; desc: string; href: string; cta: string }) {
   return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-8 text-center">
         <div className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">{icon}</div>
         <div>
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
         </div>
         <Button asChild size="sm">
            <Link href={href}>{cta}</Link>
         </Button>
      </div>
   )
}

// ─── ① Banner ───────────────────────────────────────────────────────────────────

function CompaniesBanner({ count, greeting, firstName }: { count: number; greeting: string; firstName: string }) {
   return (
      <div
         style={{ background: "linear-gradient(160deg, #0d1f3c 0%, #1a3a6e 100%)" }}
         className="relative overflow-hidden rounded-2xl px-6 py-8 shadow-lg sm:px-8"
      >
         <Building2Icon className="pointer-events-none absolute -top-8 -right-6 size-44 text-white/[0.04]" aria-hidden="true" />
         <div className="relative z-10 flex flex-col gap-6 @2xl/main:flex-row @2xl/main:items-end @2xl/main:justify-between">
            <div>
               <p className="text-sm text-blue-100/80">
                  {greeting}, <span className="font-bold">{firstName}</span> 👋
               </p>
               <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-blue-300/70">
                  Shariah-screened universe
               </p>
               <h1 className="mt-1 text-4xl font-bold tabular-nums text-white sm:text-5xl">
                  {count.toLocaleString("en-IN")}
               </h1>
               <p className="mt-2 max-w-md text-sm text-blue-100/70">
                  companies screened for Shariah compliance across Indian equity markets, refreshed every month.
               </p>
            </div>
            <Button asChild variant="secondary" className="w-fit shrink-0">
               <Link href="/stock/list">
                  Explore companies <ArrowRightIcon className="ml-1 size-4" />
               </Link>
            </Button>
         </div>
      </div>
   )
}

// ─── ② Active subscriptions ─────────────────────────────────────────────────────

function SubscriptionsWidget({ subscriptions, className }: { subscriptions: DashboardSubscription[]; className?: string }) {
   return (
      <Card className={className}>
         <CardHeader>
            <div className="flex items-center justify-between gap-2">
               <WidgetTitle
                  icon={<PackageIcon className="size-4" />}
                  tone="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
                  title="Active Subscriptions"
                  description="Your current plans and renewals"
               />
               <Button asChild variant="ghost" size="sm" className="shrink-0 text-xs text-muted-foreground">
                  <Link href="/subscriptions">
                     View all <ArrowRightIcon className="ml-1 size-3" />
                  </Link>
               </Button>
            </div>
         </CardHeader>
         <CardContent>
            {subscriptions.length === 0 ? (
               <EmptyInline
                  icon={<PackageIcon className="size-5" />}
                  title="No active subscriptions"
                  desc="Subscribe to a plan to access company lists and snapshots."
                  href="/plans"
                  cta="Browse plans"
               />
            ) : (
               <ul className="flex flex-col gap-2.5">
                  {subscriptions.map((s) => (
                     <SubscriptionRow key={s.id} sub={s} />
                  ))}
               </ul>
            )}
         </CardContent>
      </Card>
   )
}

function SubscriptionRow({ sub }: { sub: DashboardSubscription }) {
   return (
      <li
         className={cn(
            "flex items-center gap-3 rounded-xl border p-3",
            sub.soonExpiring && "border-amber-300 bg-amber-50 dark:border-amber-800/70 dark:bg-amber-950/30",
         )}
      >
         <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{sub.planName ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
               {DURATION_LABELS[sub.durationType] ?? sub.durationType} · until {formatDate(sub.endDate)}
            </p>
         </div>
         {sub.soonExpiring ? (
            <Badge
               variant="outline"
               className="shrink-0 gap-1 border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
            >
               <AlertTriangleIcon className="size-3" aria-hidden="true" />
               {sub.daysLeft === 0 ? "Expires today" : `${sub.daysLeft}d left`}
            </Badge>
         ) : (
            <Badge
               variant="outline"
               className="shrink-0 gap-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400"
            >
               <CheckCircle2Icon className="size-3" aria-hidden="true" />
               Active
            </Badge>
         )}
      </li>
   )
}

// ─── ③ Watchlist ────────────────────────────────────────────────────────────────

function WatchlistWidget({ items, className }: { items: DashboardWatchItem[]; className?: string }) {
   return (
      <Card className={className}>
         <CardHeader>
            <div className="flex items-center justify-between gap-2">
               <WidgetTitle
                  icon={<BookmarkIcon className="size-4" />}
                  tone="bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400"
                  title="Watchlist"
                  description="Recently bookmarked companies"
               />
               <Button asChild variant="ghost" size="sm" className="shrink-0 text-xs text-muted-foreground">
                  <Link href="/stock/watchlist">
                     View all <ArrowRightIcon className="ml-1 size-3" />
                  </Link>
               </Button>
            </div>
         </CardHeader>
         <CardContent>
            {items.length === 0 ? (
               <EmptyInline
                  icon={<BookmarkIcon className="size-5" />}
                  title="Your watchlist is empty"
                  desc="Bookmark companies from the list to track them here."
                  href="/stock/list"
                  cta="Browse companies"
               />
            ) : (
               <ul className="flex flex-col gap-2.5">
                  {items.map((it) => (
                     <li key={it.id} className="flex items-center gap-3 rounded-xl border p-3">
                        <div className="min-w-0 flex-1">
                           <p className="truncate text-sm font-medium">{it.companyName}</p>
                           <p className="text-xs text-muted-foreground">
                              {it.nseSymbol ? `NSE: ${it.nseSymbol}` : "NSE: —"}
                           </p>
                        </div>
                        <StatusPill status={it.shariahStatus} />
                     </li>
                  ))}
               </ul>
            )}
         </CardContent>
      </Card>
   )
}

// ─── ④ Most viewed (trending) ───────────────────────────────────────────────────

function MostViewedWidget({ stocks, hasActiveSnapshot }: { stocks: DashboardStock[]; hasActiveSnapshot: boolean }) {
   return (
      <Card>
         <CardHeader>
            <WidgetTitle
               icon={<TrendingUpIcon className="size-4" />}
               tone="bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400"
               title="Most Viewed Stocks"
               description="Trending across TASIS clients"
            />
         </CardHeader>
         <CardContent className="flex flex-col gap-2.5">
            {stocks.length === 0 ? (
               <p className="py-6 text-center text-sm text-muted-foreground">No view activity yet.</p>
            ) : (
               <>
                  {stocks.map((s) =>
                     hasActiveSnapshot ? (
                        <Link
                           key={s.id}
                           href={`/stock/snapshot?company=${s.id}`}
                           className="group flex items-center gap-3 rounded-xl border p-3 transition-all hover:border-primary/50 hover:bg-muted/40"
                        >
                           <p className="min-w-0 flex-1 truncate text-sm font-medium">{s.companyName}</p>
                           <EyeIcon
                              className="size-4 shrink-0 text-primary opacity-0 transition-opacity group-hover:opacity-100"
                              aria-hidden="true"
                           />
                        </Link>
                     ) : (
                        <div
                           key={s.id}
                           className="group flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40"
                        >
                           <p className="min-w-0 flex-1 truncate text-sm font-medium">{s.companyName}</p>
                           <LockIcon
                              className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                              aria-hidden="true"
                           />
                        </div>
                     ),
                  )}
                  {!hasActiveSnapshot && (
                     <Button asChild size="sm" className="mt-1 w-full">
                        <Link href="/plans">
                           <LockIcon className="mr-1 size-3.5" /> Unlock snapshots
                        </Link>
                     </Button>
                  )}
               </>
            )}
         </CardContent>
      </Card>
   )
}

// ─── ⑤ Most purchased lists ─────────────────────────────────────────────────────

function MostPurchasedWidget({ lists }: { lists: DashboardList[] }) {
   return (
      <Card>
         <CardHeader>
            <WidgetTitle
               icon={<TrophyIcon className="size-4" />}
               tone="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
               title="Most Purchased Lists"
               description="Popular with TASIS clients"
            />
         </CardHeader>
         <CardContent className="flex flex-col gap-2.5">
            {lists.length === 0 ? (
               <p className="py-6 text-center text-sm text-muted-foreground">No purchases yet.</p>
            ) : (
               <>
                  {lists.map((l, i) => (
                     <div key={l.planId} className="flex items-center gap-3 rounded-xl border p-3">
                        <RankBadge n={i + 1} />
                        <div className="min-w-0 flex-1">
                           <p className="truncate text-sm font-medium">{l.name}</p>
                           <p className="text-xs text-muted-foreground tabular-nums">
                              {l.purchases.toLocaleString("en-IN")} purchase{l.purchases === 1 ? "" : "s"}
                           </p>
                        </div>
                        <TrendingUpIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                     </div>
                  ))}
                  <Button asChild variant="outline" size="sm" className="mt-1 w-full">
                     <Link href="/plans">Browse all plans</Link>
                  </Button>
               </>
            )}
         </CardContent>
      </Card>
   )
}
