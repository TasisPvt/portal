"use client"

import { SiteHeader } from "@/src/components/site-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { authClient } from "@/src/lib/auth-client"
import {
   ArrowRightIcon,
   FileTextIcon,
   FolderOpenIcon,
   CalendarIcon,
   ClockIcon,
   CheckCircle2Icon,
   AlertCircleIcon,
   CircleDotIcon,
} from "lucide-react"

const recentActivity = [
   {
      id: 1,
      title: "Proposal #PR-2041 submitted",
      time: "2 hours ago",
      status: "success" as const,
      description: "Your proposal was submitted for review.",
   },
   {
      id: 2,
      title: "Document verification pending",
      time: "Yesterday",
      status: "warning" as const,
      description: "Aadhar verification is awaiting approval.",
   },
   {
      id: 3,
      title: "Account activated",
      time: "3 days ago",
      status: "success" as const,
      description: "Your portal account was successfully activated.",
   },
   {
      id: 4,
      title: "Profile update required",
      time: "4 days ago",
      status: "info" as const,
      description: "Please complete your profile to unlock all features.",
   },
]

const quickActions = [
   {
      icon: FileTextIcon,
      label: "New Proposal",
      description: "Draft and submit a new proposal",
      href: "#",
      iconBg: "bg-blue-100 dark:bg-blue-950",
      iconColor: "text-blue-600 dark:text-blue-400",
   },
   {
      icon: FolderOpenIcon,
      label: "My Documents",
      description: "View and manage your files",
      href: "#",
      iconBg: "bg-violet-100 dark:bg-violet-950",
      iconColor: "text-violet-600 dark:text-violet-400",
   },
   {
      icon: CalendarIcon,
      label: "Schedule",
      description: "View upcoming meetings",
      href: "#",
      iconBg: "bg-emerald-100 dark:bg-emerald-950",
      iconColor: "text-emerald-600 dark:text-emerald-400",
   },
]

const statusIcon = {
   success: <CheckCircle2Icon className="size-4 text-emerald-500" />,
   warning: <AlertCircleIcon className="size-4 text-amber-500" />,
   info: <CircleDotIcon className="size-4 text-blue-500" />,
}

const statusBadge = {
   success: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400",
   warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-400",
   info: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-400",
}

function Greeting() {
   const { data: session } = authClient.useSession()
   const firstName = session?.user?.name?.split(" ")[0] ?? "there"

   const hour = new Date().getHours()
   const greeting =
      hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

   return (
      <div className="px-4 pt-6 lg:px-6">
         <h2 className="text-2xl font-bold text-foreground">
            {greeting}, {firstName} 👋
         </h2>
         <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening with your account today.
         </p>
      </div>
   )
}

export default function ClientDashboardPage() {
   return (
      <>
         <SiteHeader title="Dashboard" />

         <div className="flex flex-1 flex-col gap-6 py-4 md:py-6">
            {/* Greeting */}
            <Greeting />

            {/* Quick actions */}
            <div className="px-4 lg:px-6">
               <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick Actions
               </h3>
               <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {quickActions.map((action) => (
                     <a
                        key={action.label}
                        href={action.href}
                        className="group flex items-center gap-4 rounded-xl border bg-card p-4 shadow-xs transition-all hover:border-primary/30 hover:shadow-sm"
                     >
                        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${action.iconBg}`}>
                           <action.icon className={`size-5 ${action.iconColor}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                           <p className="text-sm font-semibold text-foreground">{action.label}</p>
                           <p className="truncate text-xs text-muted-foreground">{action.description}</p>
                        </div>
                        <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                     </a>
                  ))}
               </div>
            </div>

            {/* Main content row */}
            <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">
               {/* Recent activity */}
               <Card className="lg:col-span-2">
                  <CardHeader className="pb-3">
                     <div className="flex items-center justify-between">
                        <div>
                           <CardTitle className="text-base">Recent Activity</CardTitle>
                           <CardDescription>Your latest account events</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                           View all
                           <ArrowRightIcon className="ml-1 size-3" />
                        </Button>
                     </div>
                  </CardHeader>
                  <CardContent className="p-0">
                     <div className="divide-y">
                        {recentActivity.map((item) => (
                           <div key={item.id} className="flex items-start gap-3 px-6 py-3.5">
                              <div className="mt-0.5 shrink-0">{statusIcon[item.status]}</div>
                              <div className="min-w-0 flex-1">
                                 <p className="text-sm font-medium text-foreground">{item.title}</p>
                                 <p className="text-xs text-muted-foreground">{item.description}</p>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                 <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {item.time}
                                 </span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </CardContent>
               </Card>

               {/* Status card */}
               <Card>
                  <CardHeader className="pb-3">
                     <CardTitle className="text-base">Account Status</CardTitle>
                     <CardDescription>Your verification checklist</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                     {[
                        { label: "Email verified", done: true },
                        { label: "Profile complete", done: true },
                        { label: "Aadhar verified", done: false },
                        { label: "PAN verified", done: false },
                        { label: "KYC approved", done: false },
                     ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between gap-2">
                           <div className="flex items-center gap-2">
                              {item.done
                                 ? <CheckCircle2Icon className="size-4 text-emerald-500" />
                                 : <div className="size-4 rounded-full border-2 border-muted-foreground/30" />
                              }
                              <span className={`text-sm ${item.done ? "text-foreground" : "text-muted-foreground"}`}>
                                 {item.label}
                              </span>
                           </div>
                           <Badge
                              variant="outline"
                              className={`text-xs ${item.done ? statusBadge.success : "border-muted text-muted-foreground"}`}
                           >
                              {item.done ? "Done" : "Pending"}
                           </Badge>
                        </div>
                     ))}

                     <div className="mt-4 rounded-xl bg-muted/50 p-3">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                           <ClockIcon className="size-3.5" />
                           <span>2 of 5 steps complete</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                           <div className="h-full w-2/5 rounded-full bg-primary transition-all" />
                        </div>
                     </div>
                  </CardContent>
               </Card>
            </div>
         </div>
      </>
   )
}
