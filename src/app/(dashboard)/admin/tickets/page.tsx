import { TicketIcon, CircleDotIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react"

import { SiteHeader } from "@/src/components/site-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { getAllTickets } from "./_actions"
import { AdminTicketsTable } from "./_components/admin-tickets-table"

export default async function AdminTicketsPage() {
   const tickets = await getAllTickets()

   const open = tickets.filter((t) => t.status === "open").length
   const resolved = tickets.filter((t) => t.status === "resolved").length
   const closed = tickets.filter((t) => t.status === "closed").length

   const stats = [
      {
         label: "Total",
         value: tickets.length,
         icon: TicketIcon,
         iconClass: "text-primary bg-primary/10",
      },
      {
         label: "Open",
         value: open,
         icon: CircleDotIcon,
         iconClass: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950",
      },
      {
         label: "Resolved",
         value: resolved,
         icon: CheckCircle2Icon,
         iconClass: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950",
      },
      {
         label: "Closed",
         value: closed,
         icon: XCircleIcon,
         iconClass: "text-muted-foreground bg-muted",
      },
   ]

   return (
      <>
         <SiteHeader title="Tickets" breadcrumb="Admin" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
               <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                  <div className="px-4 lg:px-6">
                     <h2 className="text-xl font-semibold tracking-tight">Support Tickets</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-4 px-4 @3xl/main:grid-cols-4 lg:px-6">
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
                     <AdminTicketsTable data={tickets} />
                  </div>
               </div>
            </div>
         </div>
      </>
   )
}
