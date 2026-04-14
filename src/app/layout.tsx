import { Noto_Sans, Inter } from "next/font/google"

import "@/src/app/globals.css"
import { Providers } from "@/src/components/providers"
import { cn } from "@/src/lib/utils"

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', weight: "400"  })

const sans = Noto_Sans({ subsets: ["latin"], variable: "--font-sans"})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", sans.variable, inter.variable)}
    >
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
