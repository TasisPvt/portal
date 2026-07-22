"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LockIcon, SendIcon } from "lucide-react"

import { Button } from "@/src/components/ui/button"
import { Spinner } from "@/src/components/ui/spinner"
import { addMyTicketMessage } from "../../_actions"

export function ClientReplyBox({
   ticketId,
   status,
   allowClientReplies,
}: {
   ticketId: string
   status: string
   allowClientReplies: boolean
}) {
   const router = useRouter()
   const [body, setBody] = React.useState("")
   const [isPending, startTransition] = React.useTransition()

   if (status === "closed") {
      return (
         <p className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed py-4 text-center text-sm text-muted-foreground">
            <LockIcon className="size-3.5" />
            This ticket is closed.
         </p>
      )
   }

   if (!allowClientReplies) {
      return (
         <p className="rounded-xl border border-dashed py-4 text-center text-sm text-muted-foreground">
            Our team will get back to you on this ticket. Replies are enabled by the support team
            when more information is needed.
         </p>
      )
   }

   function handleSubmit(e: React.FormEvent) {
      e.preventDefault()
      startTransition(async () => {
         const res = await addMyTicketMessage(ticketId, body)
         if (res.success) {
            setBody("")
            router.refresh()
         } else {
            toast.error(res.message)
         }
      })
   }

   return (
      <form
         onSubmit={handleSubmit}
         className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-primary/20"
      >
         <textarea
            placeholder="Write a reply…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            className="min-h-30 w-full resize-none border-none bg-transparent p-4 text-sm text-foreground outline-none placeholder:text-muted-foreground"
         />
         <div className="flex justify-end border-t bg-muted/30 px-4 py-2.5">
            <Button type="submit" size="sm" disabled={isPending || !body.trim()}>
               {isPending ? "Sending…" : "Send Reply"}
               {isPending ? <Spinner className="ml-1.5" /> : <SendIcon className="ml-1.5 size-3.5" />}
            </Button>
         </div>
      </form>
   )
}
