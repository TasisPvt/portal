import { ReceiptIcon, CheckCircle2Icon, XCircleIcon, UsersIcon } from "lucide-react"
import { SiteHeader } from "@/src/components/site-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { getAllSubscriptions } from "./_actions"
import { AdminSubscriptionsTable } from "./_components/admin-subscriptions-table"

export default async function AdminSubscriptionsPage() {
   const subscriptions = await getAllSubscriptions()

   const total = subscriptions.length
   const active = subscriptions.filter((s) => s.status === "active").length
   const cancelled = subscriptions.filter((s) => s.status === "cancelled").length
   const uniqueClients = new Set(subscriptions.map((s) => s.clientId)).size

   const stats = [
      {
         label: "Total",
         value: total,
         icon: ReceiptIcon,
         iconClass: "text-primary bg-primary/10",
      },
      {
         label: "Active",
         value: active,
         icon: CheckCircle2Icon,
         iconClass: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950",
      },
      {
         label: "Cancelled",
         value: cancelled,
         icon: XCircleIcon,
         iconClass: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-950",
      },
      {
         label: "Clients",
         value: uniqueClients,
         icon: UsersIcon,
         iconClass: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-950",
      },
   ]

   return (
      <>
         <SiteHeader title="Subscriptions" breadcrumb="Admin" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
               <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                  <div className="px-4 lg:px-6">
                     <h2 className="text-xl font-semibold tracking-tight">Subscriptions</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4 px-4 sm:grid-cols-4 lg:px-6">
                     {stats.map(({ label, value, icon: Icon, iconClass }) => (
                        <Card key={label} size="sm">
                           <CardHeader>
                              <div className="flex items-center justify-between">
                                 <CardTitle className="text-sm font-medium text-muted-foreground">
                                    {label}
                                 </CardTitle>
                                 <span
                                    className={`inline-flex size-8 items-center justify-center rounded-lg ${iconClass}`}
                                 >
                                    <Icon className="size-4" />
                                 </span>
                              </div>
                           </CardHeader>
                           <CardContent>
                              <p className="text-3xl font-bold tracking-tight">{value}</p>
                           </CardContent>
                        </Card>
                     ))}
                  </div>

                  <div className="px-4 lg:px-6">
                     <AdminSubscriptionsTable data={subscriptions} />
                  </div>
               </div>
            </div>
         </div>
      </>
   )
}
