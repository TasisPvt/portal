"use client"

import {
   Avatar,
   AvatarFallback,
   AvatarImage,
} from "@/src/components/ui/avatar"
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu"
import {
   SidebarMenu,
   SidebarMenuButton,
   SidebarMenuItem,
   useSidebar,
} from "@/src/components/ui/sidebar"
import {
   EllipsisVerticalIcon,
   CircleUserRoundIcon,
   CreditCardIcon,
   BellIcon,
   LogOutIcon,
} from "lucide-react"
import { authClient } from "@/src/lib/auth-client"
import type { User } from "@/src/lib/auth"

function getInitials(name: string) {
   return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
}

export function NavUser({ user }: { user: User | null }) {
   const { isMobile } = useSidebar()

   if (!user) return null

   return (
      <SidebarMenu>
         <SidebarMenuItem>
            <DropdownMenu>
               <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                     size="lg"
                     className="border rounded-xl data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                     <Avatar className="h-8 w-8 rounded-xl grayscale">
                        <AvatarImage src={user.image ?? ""} alt={user.name} />
                        <AvatarFallback className="rounded-xl">
                           {getInitials(user.name)}
                        </AvatarFallback>
                     </Avatar>
                     <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{user.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                           {user.email}
                        </span>
                     </div>
                     <EllipsisVerticalIcon className="ml-auto size-4" />
                  </SidebarMenuButton>
               </DropdownMenuTrigger>

               <DropdownMenuContent
                  className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                  sideOffset={4}
               >
                  <DropdownMenuLabel className="p-0 font-normal">
                     <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <Avatar className="h-8 w-8 rounded-xl">
                           <AvatarImage src={user.image ?? ""} alt={user.name} />
                           <AvatarFallback className="rounded-xl">
                              {getInitials(user.name)}
                           </AvatarFallback>
                        </Avatar>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                           <span className="truncate font-medium">{user.name}</span>
                           <span className="truncate text-xs text-muted-foreground">
                              {user.email}
                           </span>
                        </div>
                     </div>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuGroup>
                     <DropdownMenuItem>
                        <CircleUserRoundIcon />
                        Account
                     </DropdownMenuItem>
                     <DropdownMenuItem>
                        <CreditCardIcon />
                        Billing
                     </DropdownMenuItem>
                     <DropdownMenuItem>
                        <BellIcon />
                        Notifications
                     </DropdownMenuItem>
                  </DropdownMenuGroup>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                     className="cursor-pointer text-red-500 hover:bg-[#fb2c362e] hover:text-red-500 focus:bg-[#fb2c362e] focus:text-red-500"
                     onClick={async () => {
                        await authClient.signOut()
                        window.location.href = "/"
                     }}
                  >
                     <LogOutIcon color="red" className="mr-2 size-4" />
                     Log out
                  </DropdownMenuItem>
               </DropdownMenuContent>
            </DropdownMenu>
         </SidebarMenuItem>
      </SidebarMenu>
   )
}
