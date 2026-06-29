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
                     <div className="col-span-12 @4xl:col-span-6">
                        <RevenueWidget monthly={data.revenueMonthly} />
                     </div>
                     <div className="col-span-12 @2xl:col-span-6 @4xl:col-span-3">
                        <CustomersCard
                           total={data.totalClients}
                           thisMonth={data.customersThisMonth}
                           lastMonth={data.customersLastMonth}
                           trend={data.clientsTrend}
                        />
                     </div>
                     <div className="col-span-12 @2xl:col-span-6 @4xl:col-span-3">
                        <PlansDonut
                           data={data.subscriptionsThisMonth}
                           lastMonthTotal={data.subscriptionsLastMonthTotal}
                        />
                     </div>
                     <div className="col-span-12">
                        <TopClients data={data.topClients} />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </>
   )
}
