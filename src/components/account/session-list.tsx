"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ClockIcon, GlobeIcon, LogOutIcon, MonitorIcon, SmartphoneIcon, TabletIcon } from "lucide-react"

import { Button } from "@/src/components/ui/button"
import { cn } from "@/src/lib/utils"
import { describeUserAgent } from "@/src/lib/user-agent"

export type SessionItem = {
   id: string
   ipAddress: string | null
   userAgent: string | null
   createdAt: Date
   updatedAt: Date
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

export function SessionList({
   sessions,
   currentSessionId,
   canRevoke = false,
   onRevokeAction: onRevoke,
   onRevokeOthersAction: onRevokeOthers,
   emptyText = "No active sessions.",
}: {
   sessions: SessionItem[]
   currentSessionId?: string | null
   canRevoke?: boolean
   onRevokeAction?: (sessionId: string) => Promise<void>
   onRevokeOthersAction?: () => Promise<void>
   emptyText?: string
}) {
   const [pendingId, setPendingId] = React.useState<string | null>(null)
   const [revokingOthers, setRevokingOthers] = React.useState(false)
   const router = useRouter()

   async function handleRevokeOthers() {
      if (!onRevokeOthers) return
      setRevokingOthers(true)
      try {
         await onRevokeOthers()
         toast.success("Logged out of all other devices.")
         router.refresh()
      } catch (err) {
         toast.error(err instanceof Error ? err.message : "Failed to log out other devices.")
      } finally {
         setRevokingOthers(false)
      }
   }

   const hasOthers = sessions.some((s) => s.id !== currentSessionId)

   async function handleRevoke(id: string) {
      if (!onRevoke) return
      setPendingId(id)
      try {
         await onRevoke(id)
         if (id === currentSessionId) {
            // Revoked our own session → the cookie is now dead; hard-redirect out.
            window.location.href = "/login"
            return
         }
         toast.success("Session logged out.")
         router.refresh()
      } catch (err) {
         toast.error(err instanceof Error ? err.message : "Failed to log out session.")
         setPendingId(null)
      }
   }

   if (sessions.length === 0) {
      return <p className="text-sm text-muted-foreground">{emptyText}</p>
   }

   return (
      <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2.5">
         {sessions.map((s) => {
            const ua = describeUserAgent(s.userAgent)
            const isCurrent = s.id === currentSessionId
            const DeviceIcon =
               ua.device === "Mobile" ? SmartphoneIcon : ua.device === "Tablet" ? TabletIcon : MonitorIcon
            return (
               <li
                  key={s.id}
                  className={cn(
                     "flex items-center gap-3 rounded-xl border p-3",
                     isCurrent && "border-primary/40 bg-primary/5",
                  )}
               >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                     <DeviceIcon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                     <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium">{ua.label}</span>
                        {isCurrent && (
                           <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              This device
                           </span>
                        )}
                     </div>
                     <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                           <GlobeIcon className="size-3" />
                           {s.ipAddress || "Unknown IP"}
                        </span>
                        <span className="flex items-center gap-1">
                           <ClockIcon className="size-3" />
                           Active {formatWhen(s.updatedAt)}
                        </span>
                     </div>
                  </div>
                  {canRevoke && onRevoke && (
                     <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={pendingId === s.id}
                        onClick={() => handleRevoke(s.id)}
                     >
                        <LogOutIcon className="size-3.5" />
                        {isCurrent ? "Log out" : "Revoke"}
                     </Button>
                  )}
               </li>
            )
         })}
      </ul>
      {onRevokeOthers && hasOthers && (
         <Button
            variant="outline"
            size="sm"
            className="self-start gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={revokingOthers}
            onClick={handleRevokeOthers}
         >
            <LogOutIcon className="size-3.5" />
            Log out all other devices
         </Button>
      )}
      </div>
   )
}
