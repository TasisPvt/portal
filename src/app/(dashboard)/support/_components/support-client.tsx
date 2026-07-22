"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
   CalendarIcon,
   CheckCircle2Icon,
   ChevronRightIcon,
   CircleDotIcon,
   MessageSquareIcon,
   PlusIcon,
   TicketIcon,
   XCircleIcon,
} from "lucide-react"

import { Button } from "@/src/components/ui/button"
import { Input } from "@/src/components/ui/input"
import { Label } from "@/src/components/ui/label"
import { Textarea } from "@/src/components/ui/textarea"
import { Spinner } from "@/src/components/ui/spinner"
import {
   Dialog,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/src/components/ui/dialog"
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/src/components/ui/select"
import {
   Empty,
   EmptyHeader,
   EmptyMedia,
   EmptyTitle,
   EmptyDescription,
} from "@/src/components/ui/empty"
import { cn } from "@/src/lib/utils"
import { createTicket, type MyTicketRow, type SubscriptionOption } from "../_actions"

const GENERAL = "general"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
   return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

// Short human-friendly reference derived from the ticket UUID.
function ticketRef(id: string): string {
   return `#TKT-${id.slice(0, 6).toUpperCase()}`
}

// Square uppercase status chip — matches the reference design.
function StatusChip({ status }: { status: string }) {
   const styles: Record<string, string> = {
      open: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
      resolved:
         "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900",
      closed: "bg-muted text-muted-foreground border-border",
   }
   return (
      <span
         className={cn(
            "rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
            styles[status] ?? styles.open,
         )}
      >
         {status}
      </span>
   )
}

// ─── Raise ticket dialog ──────────────────────────────────────────────────────

function RaiseTicketDialog({ subscriptionOptions }: { subscriptionOptions: SubscriptionOption[] }) {
   const router = useRouter()
   const [open, setOpen] = React.useState(false)
   const [subject, setSubject] = React.useState("")
   const [subscriptionId, setSubscriptionId] = React.useState<string>(GENERAL)
   const [description, setDescription] = React.useState("")
   const [isPending, startTransition] = React.useTransition()

   function handleOpenChange(val: boolean) {
      setOpen(val)
      if (!val) {
         setSubject("")
         setSubscriptionId(GENERAL)
         setDescription("")
      }
   }

   function handleSubmit(e: React.FormEvent) {
      e.preventDefault()
      startTransition(async () => {
         const res = await createTicket({
            subject,
            description,
            subscriptionId: subscriptionId === GENERAL ? null : subscriptionId,
         })
         if (res.success) {
            toast.success("Ticket raised. We'll get back to you soon.")
            handleOpenChange(false)
            router.refresh()
         } else {
            toast.error(res.message)
         }
      })
   }

   return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
         <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm">
               <PlusIcon className="size-4" />
               Raise Ticket
            </Button>
         </DialogTrigger>
         <DialogContent className="sm:max-w-lg">
            <DialogHeader>
               <DialogTitle>Raise a Ticket</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ticket-subject">Subject</Label>
                  <Input
                     id="ticket-subject"
                     placeholder="Brief summary of the issue"
                     value={subject}
                     onChange={(e) => setSubject(e.target.value)}
                     maxLength={255}
                     required
                     minLength={3}
                  />
               </div>

               <div className="flex flex-col gap-1.5">
                  <Label>Related Subscription</Label>
                  <Select value={subscriptionId} onValueChange={setSubscriptionId}>
                     <SelectTrigger className="w-full">
                        <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                        <SelectItem value={GENERAL}>General / Other</SelectItem>
                        {subscriptionOptions.map((s) => (
                           <SelectItem key={s.id} value={s.id}>
                              {s.label}
                           </SelectItem>
                        ))}
                     </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                     Pick the subscription this issue relates to, or General for anything else.
                  </p>
               </div>

               <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ticket-description">Describe the issue</Label>
                  <Textarea
                     id="ticket-description"
                     placeholder="What happened? Include any details that could help us resolve it faster."
                     value={description}
                     onChange={(e) => setDescription(e.target.value)}
                     rows={5}
                     required
                  />
               </div>

               <DialogFooter>
                  <Button type="submit" disabled={isPending}>
                     {isPending ? "Submitting…" : "Submit Ticket"}
                     {isPending && <Spinner className="ml-2" />}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function SupportClient({
   tickets,
   subscriptionOptions,
}: {
   tickets: MyTicketRow[]
   subscriptionOptions: SubscriptionOption[]
}) {
   const open = tickets.filter((t) => t.status === "open").length
   const resolved = tickets.filter((t) => t.status === "resolved").length
   const closed = tickets.filter((t) => t.status === "closed").length

   const stats = [
      {
         label: "Open Tickets",
         value: open,
         accent: "border-l-amber-500",
         iconClass: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",
         icon: CircleDotIcon,
      },
      {
         label: "Resolved",
         value: resolved,
         accent: "border-l-emerald-500",
         iconClass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400",
         icon: CheckCircle2Icon,
      },
      {
         label: "Closed",
         value: closed,
         accent: "border-l-slate-400",
         iconClass: "bg-muted text-muted-foreground",
         icon: XCircleIcon,
      },
   ]

   return (
      <div className="flex flex-col gap-6 p-4 sm:p-6">
         {/* ── Header row ── */}
         <div className="flex flex-col justify-between gap-4 @2xl/main:flex-row @2xl/main:items-center">
            <p className="text-sm text-muted-foreground">
               Manage your support tickets and inquiries.
            </p>
            <RaiseTicketDialog subscriptionOptions={subscriptionOptions} />
         </div>

         {/* ── Status summary cards ── */}
         <div className="grid grid-cols-1 gap-4 @2xl/main:grid-cols-3">
            {stats.map(({ label, value, accent, iconClass, icon: Icon }) => (
               <div
                  key={label}
                  className={cn(
                     "flex items-center justify-between rounded-xl border border-l-4 bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
                     accent,
                  )}
               >
                  <div>
                     <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {label}
                     </p>
                     <h3 className="text-4xl font-bold tracking-tight text-foreground">{value}</h3>
                  </div>
                  <div className={cn("flex size-12 items-center justify-center rounded-full", iconClass)}>
                     <Icon className="size-5" />
                  </div>
               </div>
            ))}
         </div>

         {/* ── Ticket list ── */}
         <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b bg-muted/20 p-4">
               <h3 className="text-lg font-semibold tracking-tight">Recent Tickets</h3>
            </div>

            {tickets.length === 0 ? (
               <Empty className="py-20">
                  <EmptyHeader>
                     <EmptyMedia variant="icon">
                        <TicketIcon />
                     </EmptyMedia>
                     <EmptyTitle>No tickets yet</EmptyTitle>
                     <EmptyDescription>
                        Facing an issue with a subscription? Raise a ticket and our team will look
                        into it.
                     </EmptyDescription>
                  </EmptyHeader>
               </Empty>
            ) : (
               <div className="divide-y">
                  {tickets.map((t) => (
                     <Link
                        key={t.id}
                        href={`/support/${t.id}`}
                        className={cn(
                           "group flex flex-col justify-between gap-4 p-4 transition-colors hover:bg-muted/40 @2xl/main:flex-row @2xl/main:items-center",
                           t.status === "closed" && "opacity-75",
                        )}
                     >
                        <div className="min-w-0 flex-1">
                           <div className="mb-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                              <StatusChip status={t.status} />
                              <span className="text-xs text-muted-foreground">{ticketRef(t.id)}</span>
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                 <CalendarIcon className="size-3.5" />
                                 Raised {fmtDate(t.createdAt)}
                              </span>
                              <span className="text-xs font-medium text-muted-foreground">
                                 {t.planName ?? "General"}
                              </span>
                           </div>
                           <h4 className="line-clamp-1 text-base font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                              {t.subject}
                           </h4>
                           <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                              {t.description}
                           </p>
                        </div>

                        <div className="flex shrink-0 items-center justify-between gap-4 @2xl/main:justify-end">
                           <span
                              className={cn(
                                 "flex items-center gap-1.5 text-xs",
                                 t.messageCount > 0
                                    ? "font-semibold text-primary"
                                    : "text-muted-foreground",
                              )}
                           >
                              <MessageSquareIcon className="size-4" />
                              {t.messageCount} {t.messageCount === 1 ? "reply" : "replies"}
                           </span>
                           <span className="hidden size-8 items-center justify-center rounded-full text-primary opacity-0 transition-opacity group-hover:opacity-100 @2xl/main:flex">
                              <ChevronRightIcon className="size-5" />
                           </span>
                        </div>
                     </Link>
                  ))}
               </div>
            )}
         </div>
      </div>
   )
}
