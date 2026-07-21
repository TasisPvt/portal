import Link from "next/link"
import { ArrowRightIcon, BadgeCheckIcon, ListChecksIcon, TrendingUpIcon } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { SiteHeader } from "@/src/components/site-header"
import { getListSubscriptions } from "./_actions"
import { ListClient } from "./_components/list-client"

export default async function ListPage() {
   const subscriptions = await getListSubscriptions()

   if (!subscriptions.length) {
      return (
         <>
            <SiteHeader breadcrumb="Stocks" title="List" />
            <div className="flex flex-1 items-center justify-center px-6 py-16">
               <div className="w-full max-w-xl text-center">
                  {/* ── Icon cluster ── */}
                  <div className="relative mx-auto flex size-48 items-center justify-center">
                     {/* Soft background rings */}
                     <div className="absolute inset-0 animate-pulse rounded-full bg-primary/5" />
                     <div className="absolute inset-4 rounded-full bg-primary/10" />
                     {/* Main card */}
                     <div className="relative flex size-24 items-center justify-center rounded-2xl border border-primary/10 bg-card shadow-lg transition-all duration-300 hover:border-primary/30">
                        <ListChecksIcon className="size-11 text-primary" strokeWidth={1.5} />
                     </div>
                     {/* Floating accents */}
                     <div className="absolute right-4 top-0 flex size-12 rotate-12 items-center justify-center rounded-lg border bg-card shadow-md transition-transform duration-500 hover:rotate-0">
                        <TrendingUpIcon className="size-6 text-indigo-500" />
                     </div>
                     <div className="absolute bottom-4 left-0 flex size-10 -rotate-12 items-center justify-center rounded-lg border bg-card shadow-md transition-transform duration-500 hover:rotate-0">
                        <BadgeCheckIcon className="size-5 text-blue-600" />
                     </div>
                  </div>

                  {/* ── Text ── */}
                  <div className="mt-8 flex flex-col gap-3">
                     <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-[28px]">
                        No Active List Subscription
                     </h1>
                     <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
                        You need an active List plan to access shariah-screened company lists.
                        Unlock complete index-wise lists with compliance status for every company.
                     </p>
                  </div>

                  {/* ── CTA ── */}
                  <div className="mt-8">
                     <Button
                        asChild
                        size="lg"
                        className="rounded-xl shadow-lg transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
                     >
                        <Link href="/plans">
                           Browse Plans
                           <ArrowRightIcon className="size-4" />
                        </Link>
                     </Button>
                  </div>
               </div>
            </div>
         </>
      )
   }

   return (
      <>
         <SiteHeader breadcrumb="Stocks" title="List" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main ">
               <ListClient subscriptions={subscriptions} />
            </div>
         </div>
      </>
   )
}
