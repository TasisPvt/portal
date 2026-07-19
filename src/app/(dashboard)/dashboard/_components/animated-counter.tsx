"use client"

import * as React from "react"

// Counts up from 0 to `value` on mount (easeOutCubic), formatted with the Indian
// locale grouping. Respects prefers-reduced-motion by jumping straight to value.
export function AnimatedCounter({
   value,
   durationMs = 1200,
   className,
}: {
   value: number
   durationMs?: number
   className?: string
}) {
   const [display, setDisplay] = React.useState(0)

   React.useEffect(() => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
         setDisplay(value)
         return
      }

      let raf = 0
      const start = performance.now()
      const tick = (now: number) => {
         const t = Math.min(1, (now - start) / durationMs)
         const eased = 1 - Math.pow(1 - t, 3)
         setDisplay(Math.round(value * eased))
         if (t < 1) raf = requestAnimationFrame(tick)
      }
      raf = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(raf)
   }, [value, durationMs])

   return <span className={className}>{display.toLocaleString("en-IN")}</span>
}
