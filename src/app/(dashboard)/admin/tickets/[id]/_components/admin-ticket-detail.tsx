"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LockIcon, SendIcon } from "lucide-react"

import { Button } from "@/src/components/ui/button"
import { Label } from "@/src/components/ui/label"
import { Switch } from "@/src/components/ui/switch"
import { Textarea } from "@/src/components/ui/textarea"
import { Spinner } from "@/src/components/ui/spinner"
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/src/components/ui/select"
import { TicketStatusBadge } from "@/src/components/tickets/ticket-status-badge"
import {
   addAdminTicketMessage,
   setTicketClientReplies,
   updateTicketStatus,
   type TicketStatusValue,
} from "../../_actions"

export function AdminTicketControls({
   ticketId,
   status,
   allowClientReplies,
}: {
   ticketId: string
   status: string
   allowClientReplies: boolean
}) {
   const router = useRouter()
   const [isPending, startTransition] = React.useTransition()

   function handleStatusChange(next: string) {
      startTransition(async () => {
         const res = await updateTicketStatus(ticketId, next as TicketStatusValue)
         if (res.success) {
            toast.success(`Ticket marked ${next}.`)
            router.refresh()
         } else {
            toast.error(res.message)
         }
      })
   }

   function handleRepliesToggle(allow: boolean) {
      startTransition(async () => {
         const res = await setTicketClientReplies(ticketId, allow)
         if (res.success) {
            toast.success(allow ? "Client replies enabled." : "Client replies disabled.")
            router.refresh()
         } else {
            toast.error(res.message)
         }
      })
   }

   return (
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 border-t pt-4">
         <div className="flex items-center gap-2.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select value={status} onValueChange={handleStatusChange} disabled={isPending}>
               <SelectTrigger size="sm" className="w-32">
                  <SelectValue>
                     <TicketStatusBadge status={status} />
                  </SelectValue>
               </SelectTrigger>
               <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
               </SelectContent>
            </Select>
         </div>

         <div className="flex items-center gap-2.5">
            <Switch
               id="allow-replies"
               checked={allowClientReplies}
               onCheckedChange={handleRepliesToggle}
               disabled={isPending || status === "closed"}
            />
            <Label htmlFor="allow-replies" className="cursor-pointer text-sm">
               Allow client replies
            </Label>
         </div>
      </div>
   )
}

export function AdminReplyBox({ ticketId, status }: { ticketId: string; status: string }) {
   const router = useRouter()
   const [body, setBody] = React.useState("")
   const [isPending, startTransition] = React.useTransition()

   if (status === "closed") {
      return (
         <p className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed py-4 text-center text-sm text-muted-foreground">
            <LockIcon className="size-3.5" />
            This ticket is closed. Reopen it to reply.
         </p>
      )
   }

   function handleSubmit(e: React.FormEvent) {
      e.preventDefault()
      startTransition(async () => {
         const res = await addAdminTicketMessage(ticketId, body)
         if (res.success) {
            setBody("")
            router.refresh()
         } else {
            toast.error(res.message)
         }
      })
   }

   return (
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
         <Textarea
            placeholder="Reply to the client…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            required
         />
         <div className="flex justify-end">
            <Button type="submit" size="sm" disabled={isPending || !body.trim()}>
               {isPending ? "Sending…" : "Send Reply"}
               {isPending ? <Spinner className="ml-1.5" /> : <SendIcon className="ml-1.5 size-3.5" />}
            </Button>
         </div>
      </form>
   )
}
