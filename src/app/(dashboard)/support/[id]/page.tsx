import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { SiteHeader } from "@/src/components/site-header"
import { Separator } from "@/src/components/ui/separator"
import { TicketStatusBadge } from "@/src/components/tickets/ticket-status-badge"
import { TicketMessages, fmtDateTime } from "@/src/components/tickets/ticket-messages"
import { getMyTicket } from "../_actions"
import { ClientReplyBox } from "./_components/client-reply-box"

export default async function MyTicketPage({ params }: { params: Promise<{ id: string }> }) {
   const { id } = await params
   const ticket = await getMyTicket(id)
   if (!ticket) notFound()

   return (
      <>
         <SiteHeader breadcrumb="Support" title="Ticket" />
         <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-4 sm:p-6">
            {/* Back link */}
            <div>
               <Link
                  href="/support"
                  className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-primary"
               >
                  <ArrowLeftIcon className="size-4" />
                  All tickets
               </Link>
            </div>

            {/* Ticket header card */}
            <div className="rounded-xl border bg-card p-6 shadow-sm">
               <h1 className="text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
                  {ticket.subject}
               </h1>
               <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
                  <span>{ticket.planName ?? "General"}</span>
                  <span>·</span>
                  <span>Raised {fmtDateTime(ticket.createdAt)}</span>
               </p>

               <Separator className="my-4" />

               <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <TicketStatusBadge status={ticket.status} />
               </div>
            </div>

            {/* Thread */}
            <TicketMessages
               description={ticket.description}
               createdAt={ticket.createdAt}
               clientName={ticket.clientName}
               messages={ticket.messages}
            />

            {/* Reply composer — only when the admin has enabled replies for this ticket */}
            <ClientReplyBox
               ticketId={ticket.id}
               status={ticket.status}
               allowClientReplies={ticket.allowClientReplies}
            />
         </div>
      </>
   )
}
