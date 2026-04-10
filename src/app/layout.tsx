import { Inter, Open_Sans } from "next/font/google"

import "@/src/app/globals.css"
import { ThemeProvider } from "@/src/components/theme-provider"
import { TooltipProvider } from "@/src/components/ui/tooltip";
import { cn } from "@/src/lib/utils";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

const openSans = Open_Sans({ subsets: ["latin"], variable: "--font-sans", weight: "400" })

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", openSans.variable, inter.variable)}
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
