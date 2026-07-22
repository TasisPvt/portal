"use client"

import * as React from "react"
import {
   LayoutDashboardIcon,
   TrendingUpIcon,
   RocketIcon,
   LayersIcon,
   PieChartIcon,
   Building2Icon,
   GanttChartIcon,
   InfoIcon,
   BarChart3Icon,
   UsersIcon,
   ListOrderedIcon,
   MoonStarIcon,
   TagIcon,
   PackageIcon,
   CreditCardIcon,
   ReceiptIcon,
   BookTextIcon,
   PercentIcon,
   BookmarkIcon,
   IndianRupeeIcon,
   FileSpreadsheetIcon,
   LifeBuoyIcon,
} from "lucide-react"
import { NavCollapsible } from "@/src/components/sidebar/nav-collapsible"
import { NavMain } from "@/src/components/sidebar/nav-main"
import { NavSecondary } from "@/src/components/sidebar/nav-secondary"
import {
   Sidebar,
   SidebarContent,
   SidebarFooter,
   SidebarHeader,
   SidebarMenu,
   SidebarMenuButton,
   SidebarMenuItem,
   SidebarRail,
   useSidebar,
} from "@/src/components/ui/sidebar"
import Logo from "@/src/components/logo"
import type { User } from "@/src/lib/auth"
import { Roles, UserType } from "@/src/lib/constants"
import { NavUser } from "@/src/components/sidebar/nav-user"

const clientNav = {
   navMain: [
      { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon /> },
      { title: "Watchlist", url: "/stock/watchlist", icon: <BookmarkIcon /> },
      { title: "Plans", url: "/plans", icon: <PackageIcon /> },
      { title: "My Subscriptions", url: "/subscriptions", icon: <CreditCardIcon /> },
      { title: "Payment History", url: "/payments", icon: <ReceiptIcon /> },
      { title: "Support", url: "/feedback", icon: <LifeBuoyIcon /> },
   ],
   navScreening: [
      {
         title: "Stocks",
         url: "#",
         icon: TrendingUpIcon,
         isActive: false,
         items: [{ title: "Snapshot", url: "/stock/snapshot" }, { title: "List", url: "/stock/list" }],
      },
      {
         title: "IPO",
         url: "#",
         icon: RocketIcon,
         isActive: false,
         comingSoon: true,
         items: [{ title: "Snapshot", url: "#" }, { title: "List", url: "#" }],
      },
      {
         title: "ETFs & FOFs",
         url: "#",
         icon: LayersIcon,
         isActive: false,
         comingSoon: true,
         items: [{ title: "Snapshot", url: "#" }, { title: "List", url: "#" }],
      },
      {
         title: "Mutual Funds",
         url: "#",
         icon: PieChartIcon,
         isActive: false,
         comingSoon: true,
         items: [{ title: "Snapshot", url: "#" }, { title: "List", url: "#" }],
      },
   ],
     navSecondary: [
      { title: "About TASIS", url: "https://tasis.in/", icon: <InfoIcon /> },
   ],
}

const adminNav = {
   navMain: [
      { title: "Dashboard", url: "/admin/dashboard", icon: <LayoutDashboardIcon /> },
      { title: "Clients", url: "/admin/clients", icon: <UsersIcon /> },
      { title: "Users", url: "/admin/users", icon: <BarChart3Icon /> },
   ],
   navReports: [
      { title: "Revenue", url: "/admin/reports/revenue", icon: IndianRupeeIcon },
      { title: "Suspense", url: "/admin/reports/suspense", icon: FileSpreadsheetIcon },
   ],
   navMaster: [
      {
         title: "Company",
         url: "/admin/company",
         icon: Building2Icon,
      },
      {
         title: "Industry Group",
         url: "/admin/industry-group",
         icon: GanttChartIcon,
      },
      {
         title: "Index",
         url: "/admin/index",
         icon: ListOrderedIcon,
      },
      {
         title: "Shariah Status",
         url: "/admin/company-shariah-status",
         icon: MoonStarIcon,
      },
      {
         title: "Pricing Plans",
         url: "/admin/pricing-plans",
         icon: TagIcon,
      },
      {
         title: "TASIS Standards",
         url: "/admin/tasis-screening-standards",
         icon: BookTextIcon,
      },
      {
         title: "Financial Thresholds",
         url: "/admin/financial-thresholds",
         icon: PercentIcon,
      },
   ],
}

export function AppSidebar({
   user,
   ...props
}: React.ComponentProps<typeof Sidebar> & { user: User | null }) {
   const userType = user?.userType ?? UserType.CLIENT
   const isManager = user?.adminRole === Roles.MANAGER
   const { isMobile, setOpenMobile } = useSidebar()

   const adminMainNav = isManager
      ? adminNav.navMain.filter((item) => item.url !== "/admin/users")
      : adminNav.navMain

   return (
      <Sidebar collapsible="icon" {...props}>
         <SidebarHeader className="p-0">
            <SidebarMenu>
               <SidebarMenuItem>
                  <SidebarMenuButton
                     asChild
                     className="h-auto justify-center overflow-visible py-2 hover:bg-transparent group-data-[collapsible=icon]:size-10! group-data-[collapsible=icon]:p-1!"
                  >
                     <a
                        href={userType === UserType.ADMIN ? "/admin/dashboard" : "/dashboard"}
                        onClick={() => isMobile && setOpenMobile(false)}
                     >
                        <Logo
                           width={50}
                           height={70}
                           imgClassName="h-15 w-auto object-contain group-data-[collapsible=icon]:h-8"
                        />
                     </a>
                  </SidebarMenuButton>
               </SidebarMenuItem>
            </SidebarMenu>
         </SidebarHeader>

         <SidebarContent className="gap-0">
            <NavMain items={userType === UserType.ADMIN ? adminMainNav : clientNav.navMain} />
            {userType === UserType.CLIENT && (
               <NavCollapsible title="Screening" items={clientNav.navScreening} />
            )}
            {userType === UserType.ADMIN && (
               <NavCollapsible title="Master" items={adminNav.navMaster} />
            )}
            {userType === UserType.ADMIN && (
               <NavCollapsible title="Reports" items={adminNav.navReports} />
            )}
            <NavSecondary items={userType === UserType.ADMIN ? [] : clientNav.navSecondary} className="mt-auto" />
         </SidebarContent>

         <SidebarFooter>
            <NavUser user={user} />
         </SidebarFooter>
         <SidebarRail />
      </Sidebar>
   )
}
