"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, type LucideIcon } from "lucide-react"
import {
   Collapsible,
   CollapsibleContent,
   CollapsibleTrigger,
} from "@/src/components/ui/collapsible"
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import {
   SidebarGroup,
   SidebarGroupLabel,
   SidebarMenu,
   SidebarMenuButton,
   SidebarMenuItem,
   SidebarMenuSub,
   SidebarMenuSubButton,
   SidebarMenuSubItem,
   useSidebar,
} from "@/src/components/ui/sidebar"

type NavItem = {
   title: string
   url: string
   icon?: LucideIcon
   isActive?: boolean
   comingSoon?: boolean
   items?: { title: string; url: string }[]
}

export function NavCollapsible({
   title,
   items,
}: {
   title: string
   items: NavItem[]
}) {
   const pathname = usePathname()
   const { state } = useSidebar()
   const isCollapsed = state === "collapsed"

   return (
      <SidebarGroup>
         <SidebarGroupLabel>{title}</SidebarGroupLabel>
         <SidebarMenu>
            {items.map((item) => {
               // Coming soon — non-interactive, no expansion
               if (item.comingSoon) {
                  return (
                     <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                           tooltip="Coming soon"
                           disabled
                           className="cursor-not-allowed opacity-60"
                        >
                           {item.icon && <item.icon />}
                           <span>{item.title}</span>
                           <span className="ml-auto rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 group-data-[collapsible=icon]:hidden dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
                              Coming soon
                           </span>
                        </SidebarMenuButton>
                     </SidebarMenuItem>
                  )
               }

               const hasChildren = item.items && item.items.length > 0
               const isGroupActive = hasChildren
                  ? item.items!.some(
                       (sub) => pathname === sub.url || pathname.startsWith(sub.url + "/"),
                    )
                  : pathname === item.url || pathname.startsWith(item.url + "/")

               // Leaf item (no children) — same in both states
               if (!hasChildren) {
                  return (
                     <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                           tooltip={item.title}
                           isActive={isGroupActive}
                           asChild
                        >
                           <Link href={item.url}>
                              {item.icon && <item.icon />}
                              <span>{item.title}</span>
                           </Link>
                        </SidebarMenuButton>
                     </SidebarMenuItem>
                  )
               }

               // Collapsed sidebar → dropdown appearing to the right
               if (isCollapsed) {
                  return (
                     <SidebarMenuItem key={item.title}>
                        <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                              <SidebarMenuButton tooltip={item.title} isActive={isGroupActive}>
                                 {item.icon && <item.icon />}
                                 <span>{item.title}</span>
                              </SidebarMenuButton>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent side="right" align="start" className="min-w-40">
                              <DropdownMenuLabel>{item.title}</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {item.items!.map((sub) => (
                                 <DropdownMenuItem key={sub.title} asChild>
                                    <Link
                                       href={sub.url}
                                       className={
                                          pathname === sub.url || pathname.startsWith(sub.url + "/")
                                             ? "font-medium"
                                             : ""
                                       }
                                    >
                                       {sub.title}
                                    </Link>
                                 </DropdownMenuItem>
                              ))}
                           </DropdownMenuContent>
                        </DropdownMenu>
                     </SidebarMenuItem>
                  )
               }

               // Expanded sidebar → normal collapsible accordion
               return (
                  <Collapsible
                     key={item.title}
                     asChild
                     defaultOpen={isGroupActive}
                     className="group/collapsible"
                  >
                     <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                           <SidebarMenuButton tooltip={item.title} isActive={isGroupActive}>
                              {item.icon && <item.icon />}
                              <span>{item.title}</span>
                              <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                           </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                           <SidebarMenuSub>
                              {item.items!.map((subItem) => (
                                 <SidebarMenuSubItem key={subItem.title}>
                                    <SidebarMenuSubButton
                                       asChild
                                       isActive={
                                          pathname === subItem.url ||
                                          pathname.startsWith(subItem.url + "/")
                                       }
                                    >
                                       <Link href={subItem.url}>
                                          <span>{subItem.title}</span>
                                       </Link>
                                    </SidebarMenuSubButton>
                                 </SidebarMenuSubItem>
                              ))}
                           </SidebarMenuSub>
                        </CollapsibleContent>
                     </SidebarMenuItem>
                  </Collapsible>
               )
            })}
         </SidebarMenu>
      </SidebarGroup>
   )
}
