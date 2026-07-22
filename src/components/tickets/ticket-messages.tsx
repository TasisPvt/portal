import { ShieldCheckIcon } from "lucide-react"

import { Avatar, AvatarFallback } from "@/src/components/ui/avatar"
import { Bubble, BubbleContent } from "@/src/components/ui/bubble"
import {
   Message,
   MessageAvatar,
   MessageContent,
   MessageFooter,
   MessageGroup,
   MessageHeader,
} from "@/src/components/ui/message"

export type TicketMessageItem = {
   id: string
   senderRole: string // "client" | "admin"
   senderName: string | null
   body: string
   createdAt: Date
}

export function fmtDateTime(d: Date): string {
   return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
   })
}

function getInitials(name: string): string {
   return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
}

// Chat-style thread built on the Message/Bubble primitives: the original
// description is the first bubble, followed by replies. Client messages align
// left (muted), admin replies align right (primary) — same orientation on both
// the client and admin screens.
export function TicketMessages({
   description,
   createdAt,
   clientName,
   messages,
}: {
   description: string
   createdAt: Date
   clientName: string | null
   messages: TicketMessageItem[]
}) {
   const bubbles: TicketMessageItem[] = [
      {
         id: "__description__",
         senderRole: "client",
         senderName: clientName,
         body: description,
         createdAt,
      },
      ...messages,
   ]

   return (
      <MessageGroup className="gap-5">
         {bubbles.map((m) => {
            const isAdmin = m.senderRole === "admin"
            const name = isAdmin ? (m.senderName ?? "Support Team") : (m.senderName ?? "You")
            return (
               <Message key={m.id} align={isAdmin ? "end" : "start"}>
                  <MessageAvatar>
                     <Avatar size="sm">
                        <AvatarFallback
                           className={isAdmin ? "bg-primary/10 text-primary" : undefined}
                        >
                           {isAdmin ? <ShieldCheckIcon className="size-4" /> : getInitials(name)}
                        </AvatarFallback>
                     </Avatar>
                  </MessageAvatar>
                  <MessageContent>
                     <MessageHeader className="gap-1.5">
                        {name}
                        {isAdmin && (
                           <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                              Admin
                           </span>
                        )}
                     </MessageHeader>
                     <Bubble variant={isAdmin ? "default" : "muted"}>
                        <BubbleContent className="whitespace-pre-wrap">{m.body}</BubbleContent>
                     </Bubble>
                     <MessageFooter>{fmtDateTime(m.createdAt)}</MessageFooter>
                  </MessageContent>
               </Message>
            )
         })}
      </MessageGroup>
   )
}
