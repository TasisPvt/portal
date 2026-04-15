import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/src/db/client"
import { user, clientProfile } from "@/src/db/schema"
import { eq } from "drizzle-orm"
import { SiteHeader } from "@/src/components/site-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar"
import { StatusToggle } from "./_components/status-toggle"
import {
   ArrowLeftIcon,
   MailIcon,
   PhoneIcon,
   MapPinIcon,
   CalendarIcon,
   CreditCardIcon,
   BadgeIcon,
   UserIcon,
   ShieldCheckIcon,
   CheckCircle2Icon,
   ClockIcon,
} from "lucide-react"
import { cn } from "@/src/lib/utils"

function getInitials(name: string) {
   return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() ?? "")
      .join("")
}

function Field({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
   return (
      <div className="flex flex-col gap-1">
         <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            {Icon && <Icon className="size-3.5" />}
            {label}
         </span>
         <span className="text-sm font-medium">{value}</span>
      </div>
   )
}

function VerifiedBadge({ verified, trueLabel = "Verified", falseLabel = "Unverified" }: { verified: boolean; trueLabel?: string; falseLabel?: string }) {
   return verified ? (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
         <CheckCircle2Icon className="size-4" /> {trueLabel}
      </span>
   ) : (
      <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400">
         <ClockIcon className="size-4" /> {falseLabel}
      </span>
   )
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
   const { id } = await params

   const rows = await db
      .select({
         id: user.id,
         name: user.name,
         email: user.email,
         emailVerified: user.emailVerified,
         createdAt: user.createdAt,
         isActive: user.isActive,
         username: clientProfile.username,
         phone: clientProfile.phone,
         phoneVerified: clientProfile.phoneVerified,
         aadharNumber: clientProfile.aadharNumber,
         panNumber: clientProfile.panNumber,
         state: clientProfile.state,
      })
      .from(user)
      .leftJoin(clientProfile, eq(user.id, clientProfile.userId))
      .where(eq(user.id, id))
      .limit(1)

   const client = rows[0]
   if (!client || client.id === undefined) notFound()

   const joinedDate = client.createdAt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
   })

   return (
      <>
         <SiteHeader title="Client Detail" breadcrumb="Clients" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
               <div className="flex flex-col gap-6 py-4 md:py-6">

                  {/* Back + heading */}
                  <div className="flex items-center gap-3 px-4 lg:px-6">
                     <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
                        <Link href="/admin/clients">
                           <ArrowLeftIcon className="size-4" />
                        </Link>
                     </Button>
                     <div>
                        <h2 className="text-lg font-semibold leading-tight align-center flex items-center gap-2">
                           {client.name}
                           <Badge
                              variant="outline"
                              className={cn(
                                 "ml-1",
                                 client.isActive
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                                    : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
                              )}
                           >
                              {client.isActive ? "Active" : "Inactive"}
                           </Badge></h2>
                        <p className="text-xs text-muted-foreground">{client.email}</p>
                     </div>
                     <div className="ml-auto flex items-center gap-2">
                        <StatusToggle id={client.id} name={client.name} isActive={client.isActive} />
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">

                     {/* Avatar card */}
                     <Card size="sm" className="flex flex-col items-center gap-4 py-8 lg:col-span-1">
                        <Avatar className="size-20 text-2xl">
                           <AvatarFallback className="bg-primary/10 text-primary font-bold text-2xl">
                              {getInitials(client.name)}
                           </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-center gap-1 text-center">
                           <p className="text-base font-semibold">{client.name}</p>
                           {client.username && (
                              <p className="text-xs text-muted-foreground">@{client.username}</p>
                           )}
                        </div>
                        <div className="flex flex-col items-center gap-1.5 text-xs text-muted-foreground">
                           <span className="flex items-center gap-1">
                              <CalendarIcon className="size-3.5" />
                              Joined {joinedDate}
                           </span>
                        </div>
                     </Card>

                     {/* Details cards */}
                     <div className="flex flex-col gap-4 lg:col-span-2">

                        {/* Contact */}
                        <Card size="sm">
                           <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-sm">
                                 <UserIcon className="size-4 text-muted-foreground" />
                                 Contact Information
                              </CardTitle>
                           </CardHeader>
                           <CardContent>
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                 <Field
                                    label="Email Address"
                                    icon={MailIcon}
                                    value={
                                       <span className="flex items-center gap-2">
                                          {client.email}
                                          <VerifiedBadge verified={client.emailVerified} />
                                       </span>
                                    }
                                 />
                                 <Field
                                    label="Phone Number"
                                    icon={PhoneIcon}
                                    value={
                                       client.phone ? (
                                          <span className="flex items-center gap-2">
                                             {client.phone}
                                             <VerifiedBadge verified={!!client.phoneVerified} />
                                          </span>
                                       ) : (
                                          <span className="text-muted-foreground/50">—</span>
                                       )
                                    }
                                 />
                                 <Field
                                    label="State"
                                    icon={MapPinIcon}
                                    value={client.state ?? <span className="text-muted-foreground/50">—</span>}
                                 />
                              </div>
                           </CardContent>
                        </Card>

                        {/* KYC */}
                        <Card size="sm">
                           <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-sm">
                                 <ShieldCheckIcon className="size-4 text-muted-foreground" />
                                 KYC Details
                              </CardTitle>
                           </CardHeader>
                           <CardContent>
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                 <Field
                                    label="PAN Number"
                                    icon={CreditCardIcon}
                                    value={
                                       client.panNumber
                                          ? <span className="font-mono">{client.panNumber}</span>
                                          : <span className="text-muted-foreground/50">—</span>
                                    }
                                 />
                                 <Field
                                    label="Aadhar Number"
                                    icon={BadgeIcon}
                                    value={
                                       client.aadharNumber
                                          ? <span className="font-mono">{client.aadharNumber.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")}</span>
                                          : <span className="text-muted-foreground/50">—</span>
                                    }
                                 />
                              </div>
                           </CardContent>
                        </Card>

                     </div>
                  </div>

               </div>
            </div>
         </div>
      </>
   )
}
