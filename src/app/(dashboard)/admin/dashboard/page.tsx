import Link from "next/link"
import { ShieldCheckIcon, ArrowRightIcon } from "lucide-react"

import { SiteHeader } from "@/src/components/site-header"
import { Button } from "@/src/components/ui/button"
import { Card, CardContent } from "@/src/components/ui/card"
import { getAdminDashboardData } from "./_actions"
import { ClientsTrendCard } from "./_components/clients-trend-card"
import { TopClients } from "./_components/top-clients"
import { PlansDonut } from "./_components/plans-donut"
import { RevenueBar } from "./_components/revenue-bar"

export default async function AdminDashboardPage() {
   const data = await getAdminDashboardData()

   return (
      <>
         <SiteHeader title="Dashboard" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
               <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">

                  {/* ── Stat cards ── */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                     <ClientsTrendCard
                        total={data.totalClients}
                        growth={data.clientsGrowth}
                        trend={data.clientsTrend}
                     />
                     <StatCard
                        label="Admin Panel Users"
                        value={data.adminUsers}
                        icon={ShieldCheckIcon}
                        iconClass="text-violet-600 bg-violet-100 dark:text-violet-400 dark:bg-violet-950"
                        href="/admin/users"
                        actionLabel="View Users"
                     />
                  </div>

                  {/* ── Charts ── */}
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                     <PlansDonut data={data.subscriptionsThisMonth} />
                     <RevenueBar data={data.revenueThisMonth} />
                  </div>

                  {/* ── Top clients ── */}
                  <TopClients data={data.topClients} />

               </div>
            </div>
         </div>
      </>
   )
}

function StatCard({
   label,
   value,
   icon: Icon,
   iconClass,
   href,
   actionLabel,
}: {
   label: string
   value: number
   icon: React.ElementType
   iconClass: string
   href: string
   actionLabel: string
}) {
   return (
      <Card className="flex flex-col">
         <CardContent className="flex flex-1 flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
               <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
               <span className={`inline-flex size-8 items-center justify-center rounded-lg ${iconClass}`}>
                  <Icon className="size-4" />
               </span>
            </div>
            <p className="text-3xl font-bold tracking-tight tabular-nums text-foreground">
               {value.toLocaleString("en-IN")}
            </p>
            <Button asChild variant="outline" size="sm" className="mt-auto w-full">
               <Link href={href}>
                  {actionLabel}
                  <ArrowRightIcon className="size-3.5" />
               </Link>
            </Button>
         </CardContent>
      </Card>
   )
}
