"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { SearchIcon, MessageSquareIcon } from "lucide-react"

import { Input } from "@/src/components/ui/input"
import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
} from "@/src/components/ui/table"
import { cn } from "@/src/lib/utils"
import { TicketStatusBadge } from "@/src/components/tickets/ticket-status-badge"
import { fmtDateTime } from "@/src/components/tickets/ticket-messages"
import type { AdminTicketRow } from "../_actions"

type StatusFilter = "all" | "open" | "resolved" | "closed"

const FILTERS: { key: StatusFilter; label: string }[] = [
   { key: "all", label: "All" },
   { key: "open", label: "Open" },
   { key: "resolved", label: "Resolved" },
   { key: "closed", label: "Closed" },
]

export function AdminTicketsTable({ data }: { data: AdminTicketRow[] }) {
   const router = useRouter()
   const [filter, setFilter] = React.useState<StatusFilter>("all")
   const [search, setSearch] = React.useState("")

   const filtered = React.useMemo(() => {
      let rows = data
      if (filter !== "all") rows = rows.filter((t) => t.status === filter)
      const q = search.toLowerCase().trim()
      if (q) {
         rows = rows.filter(
            (t) =>
               t.subject.toLowerCase().includes(q) ||
               (t.clientName?.toLowerCase().includes(q) ?? false) ||
               (t.clientEmail?.toLowerCase().includes(q) ?? false) ||
               (t.planName?.toLowerCase().includes(q) ?? false),
         )
      }
      return rows
   }, [data, filter, search])

   const countFor = (key: StatusFilter) =>
      key === "all" ? data.length : data.filter((t) => t.status === key).length

   return (
      <div className="flex flex-col gap-4">
         {/* Filters + search */}
         <div className="flex flex-col gap-3 @2xl/main:flex-row @2xl/main:items-center">
            <div className="flex items-center gap-2">
               {FILTERS.map(({ key, label }) => (
                  <button
                     key={key}
                     onClick={() => setFilter(key)}
                     className={cn(
                        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                        filter === key
                           ? "bg-primary text-primary-foreground"
                           : "bg-muted/60 text-muted-foreground hover:bg-muted",
                     )}
                  >
                     {label} ({countFor(key)})
                  </button>
               ))}
            </div>
            <div className="relative flex-1 @2xl/main:max-w-sm @2xl/main:ml-auto">
               <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
               <Input
                  aria-label="Search tickets"
                  placeholder="Search by subject, client, or plan…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-9"
               />
            </div>
         </div>

         {/* Table */}
         <div className="overflow-hidden rounded-xl border">
            <Table>
               <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                     <TableHead>Client</TableHead>
                     <TableHead>Subject</TableHead>
                     <TableHead>Plan</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead className="text-center">Replies</TableHead>
                     <TableHead>Last Updated</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {filtered.length === 0 ? (
                     <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center text-sm text-muted-foreground">
                           No tickets found.
                        </TableCell>
                     </TableRow>
                  ) : (
                     filtered.map((t) => (
                        <TableRow
                           key={t.id}
                           className="cursor-pointer"
                           onClick={() => router.push(`/admin/tickets/${t.id}`)}
                        >
                           <TableCell>
                              <div className="flex flex-col">
                                 <span className="text-sm font-medium">{t.clientName ?? "—"}</span>
                                 <span className="text-xs text-muted-foreground">{t.clientEmail}</span>
                              </div>
                           </TableCell>
                           <TableCell className="max-w-64">
                              <span className="block truncate text-sm font-medium">{t.subject}</span>
                           </TableCell>
                           <TableCell className="text-sm text-muted-foreground">
                              {t.planName ?? "General"}
                           </TableCell>
                           <TableCell>
                              <TicketStatusBadge status={t.status} />
                           </TableCell>
                           <TableCell className="text-center">
                              <span className="inline-flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
                                 <MessageSquareIcon className="size-3.5" />
                                 {t.messageCount}
                              </span>
                           </TableCell>
                           <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                              {fmtDateTime(t.updatedAt)}
                           </TableCell>
                        </TableRow>
                     ))
                  )}
               </TableBody>
            </Table>
         </div>
      </div>
   )
}
