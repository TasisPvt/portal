import Link from "next/link"
import {
   ArrowRightIcon,
   ArrowUpRightIcon,
   AwardIcon,
   EyeIcon,
   AlertTriangleIcon,
   Building2Icon,
   CheckCircle2Icon,
   FlameIcon,
   LockIcon,
   PackageIcon,
   BookmarkIcon,
   TrendingUpIcon,
   TrophyIcon,
   UsersIcon,
   ZapIcon,
} from "lucide-react"

import { SiteHeader } from "@/src/components/site-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { Badge } from "@/src/components/ui/badge"
import {
   Empty,
   EmptyHeader,
   EmptyMedia,
   EmptyTitle,
   EmptyDescription,
   EmptyContent,
} from "@/src/components/ui/empty"
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

            <div className="grid grid-cols-1 gap-4 @3xl/main:grid-cols-2 @4xl/main:grid-cols-3">
               <SubscriptionsWidget subscriptions={data.subscriptions} className="@4xl/main:col-span-2" />
               <MostPurchasedWidget lists={data.mostPurchasedLists} />
            </div>

            <div className="grid grid-cols-1 gap-4 @3xl/main:grid-cols-2 @4xl/main:grid-cols-3">
               <WatchlistWidget items={data.watchlist} hasWatchlistAccess={data.hasWatchlistAccess} hasActiveSnapshot={data.hasActiveSnapshot} className="@4xl/main:col-span-2" />
               <MostViewedWidget stocks={data.mostViewed} hasActiveSnapshot={data.hasActiveSnapshot} universe={data.companiesScreened} />
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
      <div className="flex items-start gap-2.5">
         <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", tone)}>{icon}</span>
         <div className="space-y-0.5">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
         </div>
      </div>
   )
}

// Rank medal — #1 gets an amber "hot" treatment with a flame flag.
function RankMedal({ n }: { n: number }) {
   const top = n === 1
   return (
      <span
         className={cn(
            "relative flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums",
            top
               ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
               : "bg-muted text-muted-foreground",
         )}
      >
         {n}
         {top && (
            <FlameIcon className="absolute -top-1.5 -right-1.5 size-3.5 fill-amber-500 text-amber-500" aria-hidden="true" />
         )}
      </span>
   )
}

// Compact count, e.g. 12400 → "12.4k".
function compactCount(n: number): string {
   if (n >= 1000) {
      const v = n / 1000
      return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}k`
   }
   return String(n)
}

// Shared spotlight tint for the #1 row in a ranked widget.
const spotlight = "border-amber-200 bg-amber-50/60 dark:border-amber-900/50 dark:bg-amber-950/20"

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

function WatchlistWidget({
   items,
   hasWatchlistAccess,
   hasActiveSnapshot,
   className,
}: {
   items: DashboardWatchItem[]
   hasWatchlistAccess: boolean
   hasActiveSnapshot: boolean
   className?: string
}) {
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
            {!hasWatchlistAccess ? (
               // No active subscription — bookmarks can't be loaded, so don't
               // mislead the user with "empty"; nudge them to subscribe instead.
               <EmptyInline
                  icon={<LockIcon className="size-5" />}
                  title="No active subscriptions"
                  desc="Subscribe to a plan to view and track your bookmarked companies."
                  href="/plans"
                  cta="Browse plans"
               />
            ) : items.length === 0 ? (
               <EmptyInline
                  icon={<BookmarkIcon className="size-5" />}
                  title="Your watchlist is empty"
                  desc="Bookmark companies from the list to track them here."
                  href="/stock/list"
                  cta="Browse companies"
               />
            ) : hasActiveSnapshot ? (
               <div className="flex flex-col gap-2.5">
                  {items.map((it) => (
                     <WatchRow key={it.id} item={it} />
                  ))}
               </div>
            ) : (
               // Locked: rows are inert; hovering the whole list reveals a single
               // lock overlay nudging the user to a Snapshot plan. The min-height
               // guarantees the absolutely-positioned overlay has room to render
               // even with 1–2 bookmarks (otherwise its content overflows).
               <div className="group relative flex min-h-64 flex-col gap-2.5">
                  {items.map((it) => (
                     <div key={it.id} className="flex items-center gap-3 rounded-xl border p-3">
                        <WatchRowContent item={it} />
                     </div>
                  ))}
                  <div className="pointer-events-none absolute inset-0 z-20 flex opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100 motion-reduce:transition-none">
                     <Empty className="justify-center rounded-xl border bg-card/85 p-6 backdrop-blur-[2px]">
                        <EmptyHeader>
                           <EmptyMedia
                              variant="icon"
                              className="size-12 rounded-full bg-muted text-muted-foreground [&_svg:not([class*='size-'])]:size-5"
                           >
                              <LockIcon />
                           </EmptyMedia>
                           <EmptyTitle className="text-base">Snapshots locked</EmptyTitle>
                           <EmptyDescription className="text-xs">
                              A Snapshot plan unlocks detailed Shariah screening for your watchlist.
                           </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                           <Button asChild size="sm">
                              <Link href="/plans">Unlock snapshots</Link>
                           </Button>
                        </EmptyContent>
                     </Empty>
                  </div>
               </div>
            )}
         </CardContent>
      </Card>
   )
}

function WatchRowContent({ item }: { item: DashboardWatchItem }) {
   return (
      <>
         <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.companyName}</p>
            <p className="text-xs text-muted-foreground">{item.nseSymbol ? `NSE: ${item.nseSymbol}` : "NSE: —"}</p>
         </div>
         <StatusPill status={item.shariahStatus} />
      </>
   )
}

// Unlocked watchlist row — the whole row links to the company's snapshot.
function WatchRow({ item }: { item: DashboardWatchItem }) {
   return (
      <Link
         href={`/stock/snapshot?company=${item.id}`}
         aria-label={`View snapshot for ${item.companyName}`}
         className="group flex items-center gap-3 rounded-xl border p-3 transition-all hover:border-primary/50 hover:bg-muted/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
         <WatchRowContent item={item} />
         <ArrowUpRightIcon
            className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden="true"
         />
      </Link>
   )
}

// ─── ④ Most viewed (trending) ───────────────────────────────────────────────────

function MostViewedWidget({
   stocks,
   hasActiveSnapshot,
   universe,
}: {
   stocks: DashboardStock[]
   hasActiveSnapshot: boolean
   universe: number
}) {
   return (
      <Card className="overflow-hidden">
         <CardHeader>
            <WidgetTitle
               icon={<TrendingUpIcon className="size-4" />}
               tone="bg-sky-100 text-sky-600 dark:bg-sky-950 dark:text-sky-400"
               title="Most Viewed Stocks"
               description="Most-opened snapshots by TASIS clients"
            />
         </CardHeader>
         <CardContent className="flex flex-col gap-2.5">
            {stocks.length === 0 ? (
               <p className="py-6 text-center text-sm text-muted-foreground">No view activity yet.</p>
            ) : (
               <>
                  {stocks.map((s, i) => (
                     <ViewedRow key={s.id} stock={s} rank={i + 1} hasActiveSnapshot={hasActiveSnapshot} />
                  ))}
                  {!hasActiveSnapshot && (
                     <Button
                        asChild
                        className="mt-1 h-11 w-full bg-gradient-to-r from-primary to-blue-600 text-white shadow-sm hover:opacity-95"
                     >
                        <Link href="/plans">
                           <ZapIcon className="mr-1.5 size-4 fill-current" />
                           Unlock all {universe.toLocaleString("en-IN")} snapshots
                        </Link>
                     </Button>
                  )}
               </>
            )}
         </CardContent>
      </Card>
   )
}

function ViewedRow({
   stock,
   rank,
   hasActiveSnapshot,
}: {
   stock: DashboardStock
   rank: number
   hasActiveSnapshot: boolean
}) {
   const inner = (
      <>
         <RankMedal n={rank} />
         <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{stock.companyName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
               {stock.nseSymbol && (
                  <span className="text-xs font-medium text-muted-foreground">{stock.nseSymbol}</span>
               )}
               <span className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                  <EyeIcon className="size-3" aria-hidden="true" />
                  {compactCount(stock.views)}
               </span>
            </div>
         </div>
         {hasActiveSnapshot ? (
            <ArrowRightIcon
               className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
               aria-hidden="true"
            />
         ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
               <LockIcon className="size-3.5" aria-hidden="true" />
            </span>
         )}
      </>
   )

   const base = cn(
      "flex items-center gap-3 rounded-xl border p-3 transition-all",
      rank === 1 && spotlight,
   )

   return hasActiveSnapshot ? (
      <Link
         href={`/stock/snapshot?company=${stock.id}`}
         className={cn(
            "group hover:border-primary/50 hover:bg-muted/40 hover:shadow-sm",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            base,
         )}
      >
         {inner}
      </Link>
   ) : (
      <div className={base}>{inner}</div>
   )
}

// ─── ⑤ Most purchased lists ─────────────────────────────────────────────────────

function MostPurchasedWidget({ lists }: { lists: DashboardList[] }) {
   return (
      <Card className="overflow-hidden">
         <CardHeader>
            <WidgetTitle
               icon={<TrophyIcon className="size-4" />}
               tone="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
               title="Most Purchased Lists"
               description="Top-selling screens on TASIS"
            />
         </CardHeader>
         <CardContent className="flex flex-col gap-2.5">
            {lists.length === 0 ? (
               <p className="py-6 text-center text-sm text-muted-foreground">No purchases yet.</p>
            ) : (
               <>
                  {lists.map((l, i) =>
                     i === 0 ? (
                        <BestsellerCard key={l.planId} list={l} />
                     ) : (
                        <PurchasedRow key={l.planId} list={l} rank={i + 1} />
                     ),
                  )}
                  <Button asChild variant="outline" className="mt-1 h-11 w-full">
                     <Link href="/plans">
                        Browse all plans <ArrowRightIcon className="ml-1 size-3.5" />
                     </Link>
                  </Button>
               </>
            )}
         </CardContent>
      </Card>
   )
}

// #1 seller — premium "award" spotlight, echoing the brand gradient banner.
function BestsellerCard({ list }: { list: DashboardList }) {
   return (
      <div
         style={{ background: "linear-gradient(150deg, #0d1f3c 0%, #1a3a6e 100%)" }}
         className="relative overflow-hidden rounded-xl p-4 shadow-md"
      >
         <TrophyIcon className="pointer-events-none absolute -top-4 -right-3 size-24 text-white/[0.05]" aria-hidden="true" />
         <div className="relative z-10 flex flex-col gap-3">
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
               <AwardIcon className="size-3" aria-hidden="true" />
               Bestseller
            </span>
            <h3 className="text-base font-bold leading-snug text-white text-balance">{list.name}</h3>
            <div className="flex items-center justify-between gap-3 pt-1">
               <span className="flex items-center gap-1.5 text-sm tabular-nums text-blue-100/80">
                  <UsersIcon className="size-4" aria-hidden="true" />
                  {list.purchases.toLocaleString("en-IN")}
               </span>
               <Button asChild variant="secondary" className="h-11 shrink-0">
                  <Link href="/plans">
                     {list.priceFrom != null ? `Plans from ₹${list.priceFrom.toLocaleString("en-IN")}` : "View plans"}
                     <ArrowRightIcon className="ml-1 size-3.5" />
                  </Link>
               </Button>
            </div>
         </div>
      </div>
   )
}

function PurchasedRow({ list, rank }: { list: DashboardList; rank: number }) {
   return (
      <Link
         href="/plans"
         className="group flex items-center gap-3 rounded-xl border p-3 transition-all hover:border-primary/50 hover:bg-muted/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
         <RankMedal n={rank} />
         <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug">{list.name}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
               <span className="flex items-center gap-1 tabular-nums">
                  <UsersIcon className="size-3" aria-hidden="true" />
                  {list.purchases.toLocaleString("en-IN")}
               </span>
            </div>
         </div>
         <ArrowRightIcon
            className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary"
            aria-hidden="true"
         />
      </Link>
   )
}
