'use client'

import { useState } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ThemeProvider } from "@/src/components/theme-provider"
import { TooltipProvider } from "@/src/components/ui/tooltip"

export function Providers({ children }: { children: React.ReactNode }) {
   const [queryClient] = useState(
      () =>
         new QueryClient({
            defaultOptions: {
               queries: { retry: 1, staleTime: 60_000 },
            },
         }),
   )

   return (
      <QueryClientProvider client={queryClient}>
         <ThemeProvider>
            <TooltipProvider>
               {children}
            </TooltipProvider>
         </ThemeProvider>
      </QueryClientProvider>
   )
}
