import { headers } from "next/headers"

import { auth } from "@/src/lib/auth"
import { SiteHeader } from "@/src/components/site-header"
import { Card, CardContent, CardHeader } from "@/src/components/ui/card"
import { Skeleton } from "@/src/components/ui/skeleton"

// Rows of muted lines used inside the widget skeletons.
function RowLines({ count = 3 }: { count?: number }) {
   return (
      <div className="flex flex-col gap-3">
         {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
               <Skeleton className="size-9 shrink-0 rounded-lg" />
               <div className="flex flex-1 flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
               </div>
            </div>
         ))}
      </div>
   )
}

function WidgetSkeleton() {
   return (
      <Card className="h-full">
         <CardHeader>
            <div className="flex items-center gap-2">
               <Skeleton className="size-9 rounded-lg" />
               <Skeleton className="h-4 w-32" />
            </div>
         </CardHeader>
         <CardContent>
            <RowLines />
         </CardContent>
      </Card>
   )
}

export default async function DashboardLoading() {
   // The greeting only needs the session (name), not the dashboard queries - so
   // render the real welcome header immediately and skeleton only the data below.
   const session = await auth.api.getSession({ headers: await headers() })
   const firstName = session?.user?.name?.split(" ")[0] ?? "there"

   return (
      <>
         <SiteHeader title="Dashboard" />
         <div className="@container/main flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
            {/* Welcome header - matches the loaded page exactly (no query needed). */}
            <header>
               <h1 className="text-2xl font-bold tracking-tight">
                  Welcome back, <span className="text-primary">{firstName}</span>{" "}
                  <span className="animate-wave motion-reduce:animate-none" role="img" aria-label="waving hand">
                     👋
                  </span>
               </h1>
               <p className="mt-1 text-sm text-muted-foreground">
                  Here&apos;s your Shariah screening snapshot for today.
               </p>
            </header>

            {/* Top summary row (5 / 4 / 3 of 12 at @3xl, 4 / 4 / 4 at @4xl) */}
            <div className="grid grid-cols-1 gap-4 @3xl/main:grid-cols-12">
               {[
                  "@3xl/main:col-span-5 @4xl/main:col-span-4",
                  "@3xl/main:col-span-4 @4xl/main:col-span-4",
                  "@3xl/main:col-span-3 @4xl/main:col-span-4",
               ].map((span, i) => (
                  <div key={i} className={span}>
                     <Card className="h-full">
                        <CardContent className="flex flex-col gap-4">
                           <div className="flex items-center justify-between">
                              <Skeleton className="size-9 rounded-lg" />
                              <Skeleton className="h-8 w-16" />
                           </div>
                           <Skeleton className="h-3 w-28" />
                           <div className="mt-2 flex flex-col gap-2 border-t pt-3">
                              <Skeleton className="h-3.5 w-40" />
                              <Skeleton className="h-3 w-32" />
                           </div>
                        </CardContent>
                     </Card>
                  </div>
               ))}
            </div>

            {/* Middle: trending + popular + watchlist */}
            <div className="grid grid-cols-1 gap-4 @3xl/main:grid-cols-12">
               <div className="@3xl/main:col-span-6 @4xl/main:col-span-4">
                  <WidgetSkeleton />
               </div>
               <div className="@3xl/main:col-span-6 @4xl/main:col-span-4">
                  <WidgetSkeleton />
               </div>
               <div className="@3xl/main:col-span-12 @4xl/main:col-span-4">
                  <WidgetSkeleton />
               </div>
            </div>

            {/* Active subscriptions */}
            <Card>
               <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                     <div className="flex items-center gap-2">
                        <Skeleton className="size-9 rounded-lg" />
                        <Skeleton className="h-4 w-40" />
                     </div>
                     <Skeleton className="h-8 w-20" />
                  </div>
               </CardHeader>
               <CardContent>
                  <div className="grid grid-cols-1 gap-4 @3xl/main:grid-cols-2 @5xl/main:grid-cols-3">
                     {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-28 w-full rounded-xl" />
                     ))}
                  </div>
               </CardContent>
            </Card>

            {/* My invoices */}
            <Card>
               <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                     <div className="flex items-center gap-2">
                        <Skeleton className="size-9 rounded-lg" />
                        <Skeleton className="h-4 w-28" />
                     </div>
                     <Skeleton className="h-8 w-20" />
                  </div>
               </CardHeader>
               <CardContent>
                  <div className="flex flex-col gap-3">
                     {[0, 1, 2].map((i) => (
                        <Skeleton key={i} className="h-12 w-full rounded-lg" />
                     ))}
                  </div>
               </CardContent>
            </Card>
         </div>
      </>
   )
}
