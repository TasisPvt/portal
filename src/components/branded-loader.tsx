"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { ShieldCheckIcon, type LucideIcon } from "lucide-react"

import { cn } from "@/src/lib/utils"

// Shariah-themed fallbacks - used when no flow-specific messages are given.
const DEFAULT_MESSAGES = [
   "Screening for Shariah compliance…",
   "Aligning your ethical portfolio…",
   "Verifying halal investments…",
   "Almost there…",
]

// Branded loading state for genuinely slow, one-time flows (payment
// confirmation, report/invoice generation). Shows a spinning icon cluster and a
// rotating, reassuring message. Use `overlay` for a full-screen backdrop over an
// in-progress action, or leave it off to render inline (e.g. from a loading.tsx).
export function BrandedLoader({
   icon: Icon = ShieldCheckIcon,
   title,
   messages = DEFAULT_MESSAGES,
   interval = 2200,
   overlay = false,
   className,
}: {
   icon?: LucideIcon
   title?: string
   messages?: string[]
   interval?: number
   overlay?: boolean
   className?: string
}) {
   const [index, setIndex] = React.useState(0)
   const [mounted, setMounted] = React.useState(false)

   React.useEffect(() => setMounted(true), [])

   React.useEffect(() => {
      if (messages.length <= 1) return
      const id = setInterval(() => {
         setIndex((i) => (i + 1) % messages.length)
      }, interval)
      return () => clearInterval(id)
   }, [messages.length, interval])

   const body = (
      <div className="w-full max-w-sm text-center">
         {/* Icon cluster with a spinning progress ring */}
         <div className="relative mx-auto flex size-28 items-center justify-center">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/5 motion-reduce:animate-none" />
            <div className="absolute inset-2 rounded-full bg-primary/10" />
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/15 border-t-primary motion-reduce:animate-none" />
            <div className="relative flex size-16 items-center justify-center rounded-2xl border border-primary/10 bg-card shadow-lg">
               <Icon className="size-8 text-primary" strokeWidth={1.5} />
            </div>
         </div>

         {/* Text */}
         <div className="mt-8 flex flex-col gap-2">
            {title && (
               <h2 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">{title}</h2>
            )}
            {/* key forces a remount on each message so the fade-in replays. */}
            <p
               key={index}
               className="mx-auto min-h-5 max-w-xs text-sm text-muted-foreground duration-500 animate-in fade-in-0 motion-reduce:animate-none sm:text-base"
            >
               {messages[index]}
            </p>
         </div>
      </div>
   )

   if (overlay) {
      // Portal to <body> so `fixed` positioning is viewport-relative even when a
      // transformed ancestor (e.g. an animate-slide-up wrapper) would otherwise
      // become the containing block and trap the overlay inside it.
      if (!mounted) return null
      return createPortal(
         <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-6 backdrop-blur-sm"
            role="status"
            aria-live="polite"
         >
            <div className="rounded-2xl border bg-card px-10 py-10 shadow-xl">{body}</div>
         </div>,
         document.body,
      )
   }

   return (
      <div
         className={cn("flex flex-1 items-center justify-center px-6 py-16", className)}
         role="status"
         aria-live="polite"
      >
         {body}
      </div>
   )
}
