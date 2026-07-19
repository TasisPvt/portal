"use client"

import * as React from "react"

import { Progress } from "@/src/components/ui/progress"
import { cn } from "@/src/lib/utils"

// Progress that sweeps from 0 to `value` once after mount. The small delay lets
// the first paint land at 0 so the indicator's CSS transition animates the fill.
export function AnimatedProgress({
   value,
   indicatorClassName,
   ...props
}: Omit<React.ComponentProps<typeof Progress>, "value"> & { value: number }) {
   const [current, setCurrent] = React.useState(0)

   React.useEffect(() => {
      const id = setTimeout(() => setCurrent(value), 100)
      return () => clearTimeout(id)
   }, [value])

   return (
      <Progress
         {...props}
         value={current}
         indicatorClassName={cn(
            "duration-1000 ease-out motion-reduce:transition-none",
            indicatorClassName,
         )}
      />
   )
}
