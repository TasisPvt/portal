"use client"

import * as React from "react"
import { CalendarIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

import { Button } from "@/src/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover"

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// "YYYY-MM" → "January 2025".
function formatMonthLabel(month: string): string {
   const [year, m] = month.split("-")
   return new Date(Number(year), Number(m) - 1).toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
   })
}

// Compact "YYYY-MM" picker: year stepper + 12-month grid. Caps at maxMonth
// (no future). Months present in `monthsWithData` are marked with a dot.
export function MonthYearPicker({
   value,
   onChange,
   maxMonth,
   monthsWithData,
   disabled,
}: {
   value: string
   onChange: (month: string) => void
   maxMonth: string
   monthsWithData?: Set<string>
   disabled?: boolean
}) {
   const [open, setOpen] = React.useState(false)
   const [viewYear, setViewYear] = React.useState(() => Number(value.slice(0, 4)))

   // Re-centre the year view on the selected month whenever the picker opens.
   React.useEffect(() => {
      if (open) setViewYear(Number(value.slice(0, 4)))
   }, [open, value])

   const maxYear = Number(maxMonth.slice(0, 4))
   const maxMon = Number(maxMonth.slice(5, 7))
   const selYear = Number(value.slice(0, 4))
   const selMon = Number(value.slice(5, 7))

   return (
      <Popover open={open} onOpenChange={setOpen}>
         <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
               <CalendarIcon className="size-3.5" />
               {formatMonthLabel(value)}
               <ChevronDownIcon className="size-3.5 opacity-60" />
            </Button>
         </PopoverTrigger>
         <PopoverContent align="start" className="w-64 gap-3">
            <div className="flex items-center justify-between">
               <Button variant="ghost" size="icon" className="size-7" onClick={() => setViewYear((y) => y - 1)}>
                  <ChevronLeftIcon className="size-4" />
               </Button>
               <span className="text-sm font-semibold tabular-nums">{viewYear}</span>
               <Button
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  disabled={viewYear >= maxYear}
                  onClick={() => setViewYear((y) => y + 1)}
               >
                  <ChevronRightIcon className="size-4" />
               </Button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
               {MONTH_LABELS.map((label, i) => {
                  const m = i + 1
                  const key = `${viewYear}-${String(m).padStart(2, "0")}`
                  const isFuture = viewYear > maxYear || (viewYear === maxYear && m > maxMon)
                  const isSelected = viewYear === selYear && m === selMon
                  const hasData = monthsWithData?.has(key) ?? false
                  return (
                     <Button
                        key={key}
                        variant={isSelected ? "default" : "ghost"}
                        size="sm"
                        disabled={isFuture}
                        onClick={() => {
                           onChange(key)
                           setOpen(false)
                        }}
                        className="relative"
                     >
                        {label}
                        {hasData && !isSelected && (
                           <span className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary" />
                        )}
                     </Button>
                  )
               })}
            </div>
         </PopoverContent>
      </Popover>
   )
}
