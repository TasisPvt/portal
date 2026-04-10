import { AppSidebar } from "@/src/components/sidebar/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/src/components/ui/sidebar"

export default async function DashboardLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   return (
      <SidebarProvider
         style={
            {
               "--sidebar-width": "calc(var(--spacing) * 72)",
               "--header-height": "calc(var(--spacing) * 12)",
            } as React.CSSProperties
         }
      >
         <AppSidebar variant="inset" />
         <SidebarInset>
            {children}
         </SidebarInset>
      </SidebarProvider>
   )
}
