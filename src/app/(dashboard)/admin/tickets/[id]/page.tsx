import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@/src/components/ui/button"
import { SiteHeader } from "@/src/components/site-header"
import { TicketMessages, fmtDateTime } from "@/src/components/tickets/ticket-messages"
import { getAdminTicket } from "../_actions"
import { AdminTicketControls, AdminReplyBox } from "./_components/admin-ticket-detail"

export default async function AdminTicketPage({ params }: { params: Promise<{ id: string }> }) {
   const { id } = await params
   const ticket = await getAdminTicket(id)
   if (!ticket) notFound()

   return (
      <>
         <SiteHeader breadcrumb="Admin" title="Ticket" />
         <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-4 sm:p-6">
            <div>
               <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
                  <Link href="/admin/tickets">
                     <ArrowLeftIcon className="size-4" />
                     All tickets
                  </Link>
               </Button>
            </div>

            {/* Ticket header + admin controls */}
            <div className="rounded-2xl border bg-card p-5">
               <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                     <h1 className="text-lg font-semibold leading-snug">{ticket.subject}</h1>
                     <p className="mt-1 text-xs text-muted-foreground">
                        {ticket.clientName ?? "—"}
                        {ticket.clientEmail ? ` · ${ticket.clientEmail}` : ""}
                     </p>
                     <p className="mt-0.5 text-xs text-muted-foreground">
                        {ticket.planName ?? "General"} · Raised {fmtDateTime(ticket.createdAt)}
                     </p>
                  </div>
               </div>
               <AdminTicketControls
                  ticketId={ticket.id}
                  status={ticket.status}
                  allowClientReplies={ticket.allowClientReplies}
               />
            </div>

            {/* Thread */}
            <TicketMessages
               description={ticket.description}
               createdAt={ticket.createdAt}
               clientName={ticket.clientName}
               messages={ticket.messages}
            />

            {/* Admin reply */}
            <AdminReplyBox ticketId={ticket.id} status={ticket.status} />
         </div>
      </>
   )
}
