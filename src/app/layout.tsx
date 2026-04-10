import { Geist, Geist_Mono, Inter } from "next/font/google"

import "@/src/app/globals.css"
import { ThemeProvider } from "@/src/components/theme-provider"
import { TooltipProvider } from "@/src/components/ui/tooltip";
import { cn } from "@/src/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <ThemeProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
