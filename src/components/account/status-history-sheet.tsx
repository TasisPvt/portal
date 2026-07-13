"use client"

import * as React from "react"
import { HistoryIcon, PowerIcon, PowerOffIcon } from "lucide-react"

import { Button } from "@/src/components/ui/button"
import {
   Sheet,
   SheetContent,
   SheetDescription,
   SheetHeader,
   SheetTitle,
   SheetTrigger,
} from "@/src/components/ui/sheet"
import { cn } from "@/src/lib/utils"

export type StatusHistoryEntry = {
   id: string
   action: "activated" | "deactivated"
   reason: string
   performedByName: string
   createdAt: Date
}

function formatWhen(d: Date) {
   return new Date(d).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
   })
}

export function StatusHistorySheet({
   history,
   title = "Account Status History",
}: {
   history: StatusHistoryEntry[]
   title?: string
}) {
   return (
      <Sheet>
         <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
               <HistoryIcon className="size-3.5" />
               History
            </Button>
         </SheetTrigger>
         <SheetContent className="w-full gap-0 sm:max-w-md">
            <SheetHeader className="border-b">
               <SheetTitle>{title}</SheetTitle>
               <SheetDescription>Every activation and deactivation, most recent first.</SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-5">
               {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                     <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <HistoryIcon className="size-6" />
                     </span>
                     <p className="text-sm font-medium">No status changes yet</p>
                     <p className="text-xs text-muted-foreground">
                        Activation and deactivation events will appear here.
                     </p>
                  </div>
               ) : (
                  <ol className="relative">
                     {history.map((entry, i) => {
                        const activated = entry.action === "activated"
                        const Icon = activated ? PowerIcon : PowerOffIcon
                        const isLast = i === history.length - 1
                        return (
                           <li key={entry.id} className="relative flex gap-3 pb-6 last:pb-0">
                              {!isLast && (
                                 <span className="absolute left-3 top-8 bottom-0 w-px -translate-x-1/2 bg-border" />
                              )}
                              <span
                                 className={cn(
                                    "relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full",
                                    activated
                                       ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                                       : "bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400",
                                 )}
                              >
                                 <Icon className="size-3.5" />
                              </span>

                              <div className="flex min-w-0 flex-col gap-1 pt-0.5">
                                 <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                    <span className="text-sm font-semibold">
                                       {activated ? "Activated" : "Deactivated"}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{formatWhen(entry.createdAt)}</span>
                                 </div>
                                 <p className="text-sm text-foreground/90 break-words">{entry.reason}</p>
                                 <p className="text-xs text-muted-foreground">by {entry.performedByName}</p>
                              </div>
                           </li>
                        )
                     })}
                  </ol>
               )}
            </div>
         </SheetContent>
      </Sheet>
   )
}
