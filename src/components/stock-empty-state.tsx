import { BadgeCheckIcon, TrendingUpIcon, type LucideIcon } from "lucide-react"

import { cn } from "@/src/lib/utils"

// Shared empty / no-access state for the Stocks section (list, snapshot,
// watchlist). Renders a layered icon cluster + title + description, with an
// optional action (e.g. a "Browse Plans" CTA). Presentational only, so it works
// in both server components and the client list view.
export function StockEmptyState({
   icon: Icon,
   accentTop: AccentTop = TrendingUpIcon,
   accentBottom: AccentBottom = BadgeCheckIcon,
   title,
   description,
   action,
   className,
}: {
   icon: LucideIcon
   accentTop?: LucideIcon
   accentBottom?: LucideIcon
   title: string
   description: React.ReactNode
   action?: React.ReactNode
   className?: string
}) {
   return (
      <div className={cn("flex flex-1 items-center justify-center px-6 py-16", className)}>
         <div className="w-full max-w-xl text-center">
            {/* ── Icon cluster ── */}
            <div className="relative mx-auto flex size-48 items-center justify-center">
               {/* Soft background rings */}
               <div className="absolute inset-0 animate-pulse rounded-full bg-primary/5" />
               <div className="absolute inset-4 rounded-full bg-primary/10" />
               {/* Main card */}
               <div className="relative flex size-24 items-center justify-center rounded-2xl border border-primary/10 bg-card shadow-lg transition-all duration-300 hover:border-primary/30">
                  <Icon className="size-11 text-primary" strokeWidth={1.5} />
               </div>
               {/* Floating accents */}
               <div className="absolute right-4 top-0 flex size-12 rotate-12 items-center justify-center rounded-lg border bg-card shadow-md transition-transform duration-500 hover:rotate-0">
                  <AccentTop className="size-6 text-indigo-500" />
               </div>
               <div className="absolute bottom-4 left-0 flex size-10 -rotate-12 items-center justify-center rounded-lg border bg-card shadow-md transition-transform duration-500 hover:rotate-0">
                  <AccentBottom className="size-5 text-blue-600" />
               </div>
            </div>

            {/* ── Text ── */}
            <div className="mt-8 flex flex-col gap-3">
               <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">{title}</h1>
               <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {description}
               </p>
            </div>

            {/* ── Optional action ── */}
            {action && <div className="mt-8">{action}</div>}
         </div>
      </div>
   )
}
