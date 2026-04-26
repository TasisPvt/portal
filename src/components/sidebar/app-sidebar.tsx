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
   Settings2Icon,
   SearchIcon,
   ShieldCheckIcon,
   BarChart3Icon,
   UsersIcon,
   ListOrderedIcon,
   MoonStarIcon,
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
} from "@/src/components/ui/sidebar"
import Logo from "@/src/components/logo"
import type { User } from "@/src/lib/auth"
import { Roles, UserType } from "@/src/lib/constants"
import { NavUser } from "@/src/components/sidebar/nav-user"

const clientNav = {
   navMain: [
      { title: "Dashboard", url: "/dashboard", icon: <LayoutDashboardIcon /> },
   ],
   navScreening: [
      {
         title: "Stocks",
         url: "#",
         icon: TrendingUpIcon,
         isActive: false,
         items: [{ title: "Snapshot", url: "#" }, { title: "List", url: "#" }],
      },
      {
         title: "IPO",
         url: "#",
         icon: RocketIcon,
         isActive: false,
         items: [{ title: "Snapshot", url: "#" }, { title: "List", url: "#" }],
      },
      {
         title: "ETFs & FOFs",
         url: "#",
         icon: LayersIcon,
         isActive: false,
         items: [{ title: "Snapshot", url: "#" }, { title: "List", url: "#" }],
      },
      {
         title: "Mutual Funds",
         url: "#",
         icon: PieChartIcon,
         isActive: false,
         items: [{ title: "Snapshot", url: "#" }, { title: "List", url: "#" }],
      },
   ],
   navSecondary: [
      { title: "Settings", url: "#", icon: <Settings2Icon /> },
      { title: "Search", url: "#", icon: <SearchIcon /> },
   ],
}

const adminNav = {
   navMain: [
      { title: "Dashboard", url: "/admin/dashboard", icon: <LayoutDashboardIcon /> },
      { title: "Clients", url: "/admin/clients", icon: <UsersIcon /> },
      { title: "Users", url: "/admin/users", icon: <BarChart3Icon /> },
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
   ],
   navSecondary: [
      { title: "Team", url: "/admin/team", icon: <ShieldCheckIcon /> },
      { title: "Settings", url: "/admin/settings", icon: <Settings2Icon /> },
   ],
}

export function AppSidebar({
   user,
   ...props
}: React.ComponentProps<typeof Sidebar> & { user: User | null }) {
   const userType = user?.userType ?? UserType.CLIENT
   const isManager = user?.adminRole === Roles.MANAGER

   const adminMainNav = isManager
      ? adminNav.navMain.filter((item) => item.url !== "/admin/users")
      : adminNav.navMain

   return (
      <Sidebar collapsible="offcanvas" {...props}>
         <SidebarHeader>
            <SidebarMenu>
               <SidebarMenuItem>
                  <SidebarMenuButton
                     asChild
                     className="data-[slot=sidebar-menu-button]:p-2! hover:bg-transparent"
                  >
                     <a href={userType === UserType.ADMIN ? "/admin/dashboard" : "/dashboard"}>
                        <Logo />
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
            <NavSecondary items={userType === UserType.ADMIN ? adminNav.navSecondary : clientNav.navSecondary} className="mt-auto" />
         </SidebarContent>

         <SidebarFooter>
            <NavUser user={user} />
         </SidebarFooter>
      </Sidebar>
   )
}
