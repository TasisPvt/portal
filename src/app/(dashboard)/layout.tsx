import { headers } from "next/headers"

import { auth, type User } from "@/src/lib/auth"
import { AppSidebar } from "@/src/components/sidebar/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/src/components/ui/sidebar"

export default async function DashboardLayout({
   children,
}: Readonly<{
   children: React.ReactNode
}>) {
   const session = await auth.api.getSession({ headers: await headers() })
   const user = (session?.user ?? null) as User | null

   return (
      <SidebarProvider
         style={
            {
               "--sidebar-width": "calc(var(--spacing) * 72)",
               "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
         }
      >
         <AppSidebar variant="inset" user={user} />
         <SidebarInset>
            {children}
         </SidebarInset>
      </SidebarProvider>
   )
}
