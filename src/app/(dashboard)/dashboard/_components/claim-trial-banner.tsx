"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { GiftIcon, SparklesIcon } from "lucide-react"

import { Button } from "@/src/components/ui/button"
import { Spinner } from "@/src/components/ui/spinner"
import { TRIAL_DAYS, TRIAL_STOCKS_PER_DAY } from "@/src/lib/constants"
import { claimSnapshotTrial } from "../_actions"

export function ClaimTrialBanner() {
   const router = useRouter()
   const [isPending, startTransition] = React.useTransition()

   function handleClaim() {
      startTransition(async () => {
         const res = await claimSnapshotTrial()
         if (res.success) {
            toast.success(`Your ${TRIAL_DAYS}-day free Snapshot trial is now active!`)
            router.refresh()
         } else {
            toast.error(res.message)
         }
      })
   }

   return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-blue-600 text-primary-foreground shadow-lg">
         {/* Decorative glow */}
         <div className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />

         <div className="relative flex flex-col gap-4 px-5 py-4 @2xl/main:flex-row @2xl/main:items-center @2xl/main:justify-between">
            <div className="flex items-start gap-3.5 @2xl/main:items-center">
               <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <GiftIcon className="size-5.5" aria-hidden="true" />
               </span>
               <div>
                  <p className="flex items-center gap-1.5 text-base font-bold leading-tight">
                     Claim your {TRIAL_DAYS}-day free Snapshot trial
                     <SparklesIcon className="size-4 shrink-0" aria-hidden="true" />
                  </p>
                  <p className="mt-0.5 text-sm text-primary-foreground/85">
                     Try full Shariah screening free — view {TRIAL_STOCKS_PER_DAY} company snapshots
                     per day for {TRIAL_DAYS} days. No payment needed.
                  </p>
               </div>
            </div>

            <Button
               onClick={handleClaim}
               disabled={isPending}
               className="shrink-0 bg-white font-bold text-primary shadow-sm hover:bg-white/90"
            >
               {isPending ? "Activating…" : "Claim Free Trial"}
               {isPending && <Spinner className="ml-2" />}
            </Button>
         </div>
      </div>
   )
}
