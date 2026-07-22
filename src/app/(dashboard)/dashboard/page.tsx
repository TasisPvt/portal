import Link from "next/link"
import {
   ArrowRightIcon,
   ArrowUpRightIcon,
   BadgeCheckIcon,
   BookmarkIcon,
   CalculatorIcon,
   ChevronRightIcon,
   CreditCardIcon,
   CrownIcon,
   EyeIcon,
   LockIcon,
   MedalIcon,
   PackageIcon,
   StarIcon,
   TrendingUpIcon,
   Trophy
} from "lucide-react"

import { SiteHeader } from "@/src/components/site-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
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
import { AnimatedProgress } from "./_components/animated-progress"
import { AnimatedCounter } from "./_components/animated-counter"
import { formatDate } from "@/src/lib/format"
import { DURATION_LABELS, SUPPORT_EMAIL } from "@/src/lib/constants"
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

   return (
      <>
         <SiteHeader title="Dashboard" />
         <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            {/* ── Welcome header ── */}
            <header>
               <h1 className="text-2xl font-bold tracking-tight">
                  Welcome back, <span className="text-primary">{data.firstName}</span>{" "}
                  <span className="animate-wave motion-reduce:animate-none" role="img" aria-label="waving hand">
                     👋
                  </span>
               </h1>
               <p className="mt-1 text-sm text-muted-foreground">
                  Here&apos;s your Shariah screening snapshot for today.
               </p>
            </header>

            {/* ── Top summary row ── */}
            <div className="grid grid-cols-1 gap-4 @3xl/main:grid-cols-3">
               <div className="animate-slide-up motion-reduce:animate-none" style={{ animationDelay: "0ms" }}>
                  <TotalPlansCard total={data.totalPlansTillDate} subscriptions={data.subscriptions} />
               </div>
               <div className="animate-slide-up motion-reduce:animate-none" style={{ animationDelay: "80ms" }}>
                  <MarketInsightsCard compliant={data.compliantCompanies} screened={data.companiesScreened} />
               </div>
               <div className="animate-slide-up motion-reduce:animate-none" style={{ animationDelay: "160ms" }}>
                  <PurgingCard />
               </div>
            </div>

            {/* ── Middle: watchlist + leaderboards rail ── */}
            <div className="grid grid-cols-1 gap-4 @4xl/main:grid-cols-12">
               <div
                  className="animate-slide-up motion-reduce:animate-none @4xl/main:col-span-7"
                  style={{ animationDelay: "240ms" }}
               >
                  <WatchlistWidget
                     items={data.watchlist}
                     hasWatchlistAccess={data.hasWatchlistAccess}
                     hasActiveSnapshot={data.hasActiveSnapshot}
                     className="h-full"
                  />
               </div>
               <div className="flex flex-col gap-4 @4xl/main:col-span-5">
                  <div className="animate-slide-up motion-reduce:animate-none" style={{ animationDelay: "320ms" }}>
                     <TrendingStocksWidget
                        stocks={data.mostViewed}
                        hasActiveSnapshot={data.hasActiveSnapshot}
                        universe={data.companiesScreened}
                     />
                  </div>
                  <div className="animate-slide-up motion-reduce:animate-none" style={{ animationDelay: "400ms" }}>
                     <PopularListsWidget lists={data.popularLists} />
                  </div>
               </div>
            </div>

            {/* ── Bottom: active subscriptions ── */}
            <div className="animate-slide-up motion-reduce:animate-none" style={{ animationDelay: "480ms" }}>
               <SubscriptionsWidget subscriptions={data.subscriptions} />
            </div>
         </div>
      </>
   )
}

// ─── Shared bits ────────────────────────────────────────────────────────────────

// Compact compliance dot - status is never conveyed by color alone (shape + label).
function StatusPill({ status }: { status: number | null }) {
   if (status === null) return <span className="text-xs text-muted-foreground">Unrated</span>
   const compliant = status === 1
   return (
      <span
         className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
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

// Mock-style widget header: plain colored icon + title (no tile).
function WidgetHeading({ icon, title }: { icon: React.ReactNode; title: string }) {
   return (
      <div className="flex items-center gap-2">
         <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            {/* <CreditCardIcon className="size-4" /> */}
            {icon}
         </span>
         <CardTitle className="text-base">{title}</CardTitle>
      </div>
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

// ─── ① Total plans subscribed ───────────────────────────────────────────────────

function TotalPlansCard({ total, subscriptions }: { total: number; subscriptions: DashboardSubscription[] }) {
   // Soonest-expiring active plan (the action returns them soonest-first).
   const primary = subscriptions[0]

   return (
      <Card className="h-full">
         <CardContent className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-2">
               <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                  <CreditCardIcon className="size-4" />
               </span>
               <span className="text-3xl font-bold tabular-nums">{total.toLocaleString("en-IN")}</span>
            </div>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
               Total Plans Subscribed
            </p>
            <div className="mt-auto border-t pt-3">
               {primary ? (
                  <>
                     <p className="text-[11px] font-bold uppercase tracking-wide text-primary">
                        Active plans ({subscriptions.length})
                     </p>
                     <p className="mt-1 text-sm font-semibold leading-tight">{primary.planName ?? "-"}</p>
                     <p
                        className={cn(
                           "mt-1 text-xs",
                           primary.soonExpiring
                              ? "font-semibold text-red-600 dark:text-red-400"
                              : "text-muted-foreground",
                        )}
                     >
                        Expires: {formatDate(primary.endDate)}
                        {primary.soonExpiring &&
                           ` · ${primary.daysLeft === 0 ? "today" : `${primary.daysLeft}d left`}`}
                     </p>
                  </>
               ) : (
                  <>
                     <p className="text-sm font-semibold">No active plans</p>
                     <Link
                        href="/plans"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                     >
                        Browse plans <ArrowRightIcon className="size-3" aria-hidden="true" />
                     </Link>
                  </>
               )}
            </div>
         </CardContent>
      </Card>
   )
}

// Market insights (compliant companies)

function MarketInsightsCard({ compliant, screened }: { compliant: number; screened: number }) {
   const pct = screened > 0 ? Math.round((compliant / screened) * 100) : 0

   return (
      <Card className="relative h-full overflow-hidden border-transparent bg-primary text-primary-foreground">
         <CardContent className="relative z-10 flex h-full flex-col justify-between gap-6">
            <div>
               <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground/80">
                     Market Insights
                  </p>
                  <BadgeCheckIcon className="size-5 text-primary-foreground/60" aria-hidden="true" />
               </div>
               <AnimatedCounter value={compliant} className="mt-2 block text-4xl font-bold tabular-nums" />
               <p className="mt-1 text-sm font-medium">Shariah Compliant Companies</p>
            </div>
            <div>
               <AnimatedProgress
                  value={pct}
                  aria-label="Share of screened companies that are Shariah compliant"
                  className="h-1.5 bg-primary-foreground/20"
                  indicatorClassName="bg-primary-foreground"
               />
               <p className="mt-2 text-xs text-primary-foreground/80">
                  Screened from {screened.toLocaleString("en-IN")} total entities
               </p>
            </div>
         </CardContent>
      </Card>
   )
}

// ─── ③ Purging service (coming soon) ────────────────────────────────────────────

function PurgingCard() {
   return (
      <Card className="h-full border-dashed">
         <CardContent className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-2">
               <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <CalculatorIcon className="size-4" />
               </span>
               <Badge variant="secondary" className="rounded-full text-[10px] font-bold uppercase tracking-wide">
                  Coming soon
               </Badge>
            </div>
            <h3 className="mt-3 text-base font-semibold">Purging Service</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
               Automated dividend cleansing reports and Shariah calculators tailored for your portfolio.
            </p>
            <a
               href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Notify me when the Purging Service launches")}`}
               className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-bold text-primary hover:underline"
            >
               Notify Me <ArrowRightIcon className="size-3.5" aria-hidden="true" />
            </a>
         </CardContent>
      </Card>
   )
}

// ─── ④ Watchlist ────────────────────────────────────────────────────────────────

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
         <CardHeader className="">
            <div className="flex items-center justify-between gap-2">
               <WidgetHeading icon={<BookmarkIcon className="size-4.5 text-primary" />} title="Watchlist" />
               <Link href="/stock/watchlist" className="text-xs font-bold text-primary hover:underline">
                  View all
               </Link>
            </div>
         </CardHeader>
         <CardContent>
            {!hasWatchlistAccess ? (
               // No active subscription - bookmarks can't be loaded, so don't
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
         {/* Lettered avatar tile, per the reference design. */}
         <span
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted font-bold text-muted-foreground"
            aria-hidden="true"
         >
            {item.companyName.charAt(0).toUpperCase()}
         </span>
         <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{item.companyName}</p>
            <p className="text-xs text-muted-foreground">{item.nseSymbol ? `NSE: ${item.nseSymbol}` : "NSE: -"}</p>
         </div>
         <StatusPill status={item.shariahStatus} />
      </>
   )
}

// Unlocked watchlist row - the whole row links to the company's snapshot.
function WatchRow({ item }: { item: DashboardWatchItem }) {
   return (
      <Link
         href={`/stock/snapshot?company=${item.id}`}
         aria-label={`View snapshot for ${item.companyName}`}
         className="group flex items-center gap-3 rounded-xl border p-3 transition-all hover:border-primary/40 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
         <WatchRowContent item={item} />
         <ArrowUpRightIcon
            className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden="true"
         />
      </Link>
   )
}

// ─── ⑤ Trending stocks ──────────────────────────────────────────────────────────

// Solid podium discs (mock colors) with accessible dark text.
const MEDAL_SOLID = [
   "bg-[#FFD700] text-yellow-950",
   "bg-[#C0C0C0] text-slate-900",
   "bg-[#CD7F32] text-orange-950",
] as const

// Tinted discs holding the medal icon in the Popular Lists rail - gold, silver,
// bronze, podium style.
const MEDAL_TINT = [
   "border-[#FFD700]/50 bg-[#FFD700]/10 text-amber-500",
   "border-[#C0C0C0]/60 bg-[#C0C0C0]/15 text-slate-400 dark:text-slate-300",
   "border-[#CD7F32]/50 bg-[#CD7F32]/10 text-[#CD7F32]",
] as const

const MEDAL_NAMES = ["Gold", "Silver", "Bronze"] as const

function TrendingStocksWidget({
   stocks,
   hasActiveSnapshot,
   universe,
}: {
   stocks: DashboardStock[]
   hasActiveSnapshot: boolean
   universe: number
}) {
   return (
      <Card>
         <CardHeader>
            <WidgetHeading icon={<TrendingUpIcon className="size-4.5 text-primary" />} title="Trending Stocks" />
         </CardHeader>
         <CardContent className="flex flex-col gap-2">
            {stocks.length === 0 ? (
               <p className="py-6 text-center text-sm text-muted-foreground">No view activity yet.</p>
            ) : (
               <>
                  {stocks.map((s, i) => (
                     <TrendingRow key={s.id} stock={s} rank={i + 1} hasActiveSnapshot={hasActiveSnapshot} />
                  ))}
                  {!hasActiveSnapshot && (
                     <Button asChild className="mt-2 w-full">
                        <Link href="/plans">Unlock all {universe.toLocaleString("en-IN")} snapshots</Link>
                     </Button>
                  )}
               </>
            )}
         </CardContent>
      </Card>
   )
}

function TrendingRow({
   stock,
   rank,
   hasActiveSnapshot,
}: {
   stock: DashboardStock
   rank: number
   hasActiveSnapshot: boolean
}) {
   return (
      <div className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted/40">
         <span
            className={cn(
               "flex size-10 shrink-0 items-center justify-center rounded-full border",
               MEDAL_TINT[rank - 1] ?? "border-border bg-muted text-muted-foreground",
            )}
            role="img"
            aria-label={`Rank ${rank}${MEDAL_NAMES[rank - 1] ? ` - ${MEDAL_NAMES[rank - 1]} medal` : ""}`}
         >
            <MedalIcon className="size-5" aria-hidden="true" />
         </span>
         <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{stock.companyName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
               {stock.nseSymbol && <span className="font-medium">{stock.nseSymbol}</span>}
               <span className="inline-flex items-center gap-1 tabular-nums">
                  <EyeIcon className="size-3" aria-hidden="true" />
                  {compactCount(stock.views)}
               </span>
            </p>
         </div>
         {hasActiveSnapshot ? (
            <Link
               href={`/stock/snapshot?company=${stock.id}`}
               className="shrink-0 text-xs font-bold text-primary hover:underline"
               aria-label={`View details for ${stock.companyName}`}
            >
               View Details
            </Link>
         ) : (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
               <LockIcon className="size-3.5" aria-hidden="true" />
            </span>
         )}
      </div>
   )
}

// ─── ⑥ Popular lists ────────────────────────────────────────────────────────────

function PopularListsWidget({ lists }: { lists: DashboardList[] }) {
   return (
      <Card>
         <CardHeader>
            <WidgetHeading icon={<Trophy className="size-4.5 text-primary" />} title="Popular Lists" />
         </CardHeader>
         <CardContent className="flex flex-col gap-2">
            {lists.length === 0 ? (
               <p className="py-6 text-center text-sm text-muted-foreground">No active subscribers yet.</p>
            ) : (
               lists.map((l, i) => <PopularListRow key={l.planId} list={l} rank={i + 1} />)
            )}
            <Button asChild variant="outline" className="mt-2 w-full">
               <Link href="/plans">Browse all plans</Link>
            </Button>
         </CardContent>
      </Card>
   )
}

function PopularListRow({ list, rank }: { list: DashboardList; rank: number }) {
   // #1 is the gold champion: a premium gold-gradient row with a crown badge.
   // Ranks 2 & 3 keep silver/bronze numbered discs.
   const gold = rank === 1

   return (
      <Link
         href="/plans"
         className={cn(
            "group flex items-center gap-3 rounded-lg p-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
            gold
               ? "bg-gradient-to-r from-amber-50 to-yellow-50/50 shadow-sm ring-1 ring-inset ring-amber-300/70 hover:ring-amber-400 dark:from-amber-950/30 dark:to-yellow-950/15 dark:ring-amber-800/50"
               : "hover:bg-muted/40",
         )}
      >
         {gold ? (
            <span
               className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950 shadow-md ring-2 ring-amber-200/80 dark:ring-amber-900"
               role="img"
               aria-label="Rank 1 - gold"
            >
               <CrownIcon className="size-5 fill-amber-950/15" aria-hidden="true" />
            </span>
         ) : (
            <span
               className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold tabular-nums shadow-sm",
                  MEDAL_SOLID[rank - 1] ?? "bg-muted text-muted-foreground",
               )}
               aria-label={`Rank ${rank}${MEDAL_NAMES[rank - 1] ? ` - ${MEDAL_NAMES[rank - 1]}` : ""}`}
            >
               {rank}
            </span>
         )}
         <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-semibold leading-snug", gold && "text-amber-950 dark:text-amber-100")}>
               {list.name}
            </p>
            <p
               className={cn(
                  "mt-0.5 text-xs tabular-nums",
                  gold ? "font-medium text-amber-700 dark:text-amber-400" : "text-muted-foreground",
               )}
            >
               {list.subscribers.toLocaleString("en-IN")} active subscriber{list.subscribers === 1 ? "" : "s"}
            </p>
         </div>
         <ChevronRightIcon
            className={cn(
               "size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
               gold ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
            )}
            aria-hidden="true"
         />
      </Link>
   )
}

// ─── ⑦ Active subscriptions ─────────────────────────────────────────────────────

function SubscriptionsWidget({ subscriptions }: { subscriptions: DashboardSubscription[] }) {
   return (
      <Card>
         <CardHeader>
            <div className="flex items-center justify-between gap-2">
               <WidgetHeading
                  icon={<StarIcon className="size-4.5 fill-primary text-primary" />}
                  title="Active Subscriptions"
               />
               <Button asChild variant="outline" size="sm" className="text-xs font-bold text-primary">
                  <Link href="/subscriptions">View All</Link>
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
               <div className="grid grid-cols-1 gap-4 @3xl/main:grid-cols-2 @5xl/main:grid-cols-3">
                  {subscriptions.map((s) => (
                     <SubscriptionCard key={s.id} sub={s} />
                  ))}
               </div>
            )}
         </CardContent>
      </Card>
   )
}

function SubscriptionCard({ sub }: { sub: DashboardSubscription }) {
   return (
      <div
         className={cn(
            "rounded-xl border p-4 transition-colors hover:border-primary/50",
            sub.soonExpiring && "border-red-300 dark:border-red-900",
         )}
      >
         <div className="flex items-start justify-between gap-2">
            <h3 className="min-w-0 text-sm font-semibold leading-snug">{sub.planName ?? "-"}</h3>
            <div className="flex shrink-0 flex-col items-end gap-1">
               <Badge className="rounded-full border-transparent bg-blue-100 text-[10px] font-bold uppercase text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  Active
               </Badge>
               {sub.soonExpiring && (
                  <Badge className="rounded-full border-transparent bg-red-100 text-[10px] font-bold uppercase text-red-700 dark:bg-red-950 dark:text-red-300">
                     Expiring soon
                  </Badge>
               )}
            </div>
         </div>
         <div className="mt-4 flex items-center gap-4 text-xs">
            <div>
               <p className="text-muted-foreground">Frequency</p>
               <p className="mt-0.5 font-bold">{DURATION_LABELS[sub.durationType] ?? sub.durationType}</p>
            </div>
            <div className="h-8 w-px bg-border" aria-hidden="true" />
            <div>
               <p className="text-muted-foreground">Valid Until</p>
               <p className="mt-0.5 font-bold">{formatDate(sub.endDate)}</p>
            </div>
         </div>
      </div>
   )
}
