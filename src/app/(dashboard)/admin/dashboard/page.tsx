import { SiteHeader } from "@/src/components/site-header"
import { getAdminDashboardData } from "./_actions"
import { RevenueWidget } from "./_components/revenue-widget"
import { CustomersCard } from "./_components/customers-card"
import { PlansDonut } from "./_components/plans-donut"
import { TopClients } from "./_components/top-clients"

export default async function AdminDashboardPage() {
   const data = await getAdminDashboardData()

   return (
      <>
         <SiteHeader title="Dashboard" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
               <div className="px-4 py-4 md:py-6 lg:px-6">
                  <div className="@container grid grid-cols-12 gap-4 md:gap-6">
                     <div
                        className="col-span-12 animate-slide-up motion-reduce:animate-none @4xl:col-span-6"
                        style={{ animationDelay: "0ms" }}
                     >
                        <RevenueWidget monthly={data.revenueMonthly} daily={data.revenueDaily} />
                     </div>
                     <div
                        className="col-span-12 animate-slide-up motion-reduce:animate-none @2xl:col-span-6 @4xl:col-span-3"
                        style={{ animationDelay: "80ms" }}
                     >
                        <CustomersCard
                           total={data.totalClients}
                           thisMonth={data.customersThisMonth}
                           lastMonth={data.customersLastMonth}
                           trend={data.clientsTrend}
                        />
                     </div>
                     <div
                        className="col-span-12 animate-slide-up motion-reduce:animate-none @2xl:col-span-6 @4xl:col-span-3"
                        style={{ animationDelay: "160ms" }}
                     >
                        <PlansDonut
                           data={data.subscriptionsThisMonth}
                           lastMonthTotal={data.subscriptionsLastMonthTotal}
                        />
                     </div>
                     <div
                        className="col-span-12 animate-slide-up motion-reduce:animate-none"
                        style={{ animationDelay: "240ms" }}
                     >
                        <TopClients data={data.topClients} />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </>
   )
}
