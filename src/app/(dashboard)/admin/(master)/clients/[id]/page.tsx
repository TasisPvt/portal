import { notFound } from "next/navigation"
import Link from "next/link"
import { headers } from "next/headers"
import { db } from "@/src/db/client"
import { user, clientProfile } from "@/src/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/src/lib/auth"
import { Roles } from "@/src/lib/constants"
import { SiteHeader } from "@/src/components/site-header"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Button } from "@/src/components/ui/button"
import { StatusToggle } from "./_components/status-toggle"
import { StatusHistorySheet } from "@/src/components/account/status-history-sheet"
import { SessionList } from "@/src/components/account/session-list"
import { getClientStatusHistory, getClientSessions, revokeClientSession } from "./_actions"
import {
   ArrowLeftIcon,
   MailIcon,
   PhoneIcon,
   MapPinIcon,
   CalendarIcon,
   CreditCardIcon,
   BadgeIcon,
   ShieldCheckIcon,
   CheckCircle2Icon,
   ClockIcon,
   HomeIcon,
   ReceiptIcon,
   MonitorSmartphoneIcon,
} from "lucide-react"
import { cn } from "@/src/lib/utils"

function getInitials(name: string) {
   return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() ?? "")
      .join("")
}

/** Small pill with a leading dot - green when positive, amber otherwise. */
function StatusPill({ active, trueLabel = "Active", falseLabel = "Inactive" }: { active: boolean; trueLabel?: string; falseLabel?: string }) {
   return (
      <span
         className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            active
               ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
               : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
         )}
      >
         <span className="size-1.5 rounded-full bg-current" />
         {active ? trueLabel : falseLabel}
      </span>
   )
}

/** Inline verification pill for a field value. */
function VerifiedPill({ verified }: { verified: boolean }) {
   return verified ? (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
         <CheckCircle2Icon className="size-3" /> Verified
      </span>
   ) : (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
         <ClockIcon className="size-3" /> Unverified
      </span>
   )
}

function Field({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
   return (
      <div className="flex flex-col gap-1.5">
         <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {Icon && <Icon className="size-3.5" />}
            {label}
         </span>
         <span className="text-sm font-semibold">{value}</span>
      </div>
   )
}

function StatRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: React.ElementType }) {
   return (
      <div className="flex items-center justify-between gap-2 text-sm">
         <span className="flex items-center gap-2 text-muted-foreground">
            <Icon className="size-4" />
            {label}
         </span>
         <span className="font-medium">{value}</span>
      </div>
   )
}

const NOT_PROVIDED = <span className="font-normal text-muted-foreground/60">Not provided</span>

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
         phone: clientProfile.phone,
         phoneVerified: clientProfile.phoneVerified,
         aadharNumber: clientProfile.aadharNumber,
         panNumber: clientProfile.panNumber,
         state: clientProfile.state,
         address: clientProfile.address,
         gstNumber: clientProfile.gstNumber,
      })
      .from(user)
      .leftJoin(clientProfile, eq(user.id, clientProfile.userId))
      .where(eq(user.id, id))
      .limit(1)

   const client = rows[0]
   if (!client || client.id === undefined) notFound()

   const [session, statusHistory, clientSessions] = await Promise.all([
      auth.api.getSession({ headers: await headers() }),
      getClientStatusHistory(client.id),
      getClientSessions(client.id),
   ])

   // Managers may view history/sessions but cannot activate/deactivate or revoke.
   const canManageStatus = session?.user?.adminRole !== Roles.MANAGER

   const joinedDate = client.createdAt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
   })

   // We have no explicit KYC flag - treat KYC as complete once PAN + Aadhaar are on file.
   const kycComplete = !!(client.panNumber && client.aadharNumber)
   const clientId = client.id.slice(0, 8).toUpperCase()

   return (
      <>
         <SiteHeader title="Client Detail" breadcrumb="Clients" />
         <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
               <div className="flex flex-col gap-6 py-4 md:py-6">

                  {/* Top action bar */}
                  <div className="flex flex-wrap items-start gap-3 px-4 lg:px-6">
                     <Button variant="outline" size="icon" className="size-9 shrink-0 rounded-full" asChild>
                        <Link href="/admin/clients">
                           <ArrowLeftIcon className="size-4" />
                        </Link>
                     </Button>
                     <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2.5">
                           <h1 className="text-2xl font-bold leading-tight">{client.name}</h1>
                           <StatusPill active={client.isActive} />
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                           {client.email} · Client ID{" "}
                           <span className="font-medium text-foreground/70">#{clientId}</span>
                        </p>
                     </div>
                     <div className="ml-auto flex items-center gap-2">
                        <StatusHistorySheet history={statusHistory} />
                        {canManageStatus && (
                           <StatusToggle id={client.id} name={client.name} isActive={client.isActive} />
                        )}
                     </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 px-4 @4xl/main:grid-cols-3 lg:px-6">

                     {/* Profile card */}
                     <Card size="sm" className="h-fit @4xl/main:col-span-1">
                        <CardContent className="flex flex-col gap-5">
                           <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-2xl font-bold text-white">
                              {getInitials(client.name)}
                           </div>
                           <p className="text-lg font-semibold">{client.name}</p>
                           <div className="border-t" />
                           <div className="flex flex-col gap-3.5">
                              <StatRow icon={CalendarIcon} label="Joined" value={joinedDate} />
                              <StatRow
                                 icon={ShieldCheckIcon}
                                 label="KYC"
                                 value={
                                    <span className={kycComplete ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                                       {kycComplete ? "Complete" : "Pending"}
                                    </span>
                                 }
                              />
                           </div>
                        </CardContent>
                     </Card>

                     {/* Details cards */}
                     <div className="flex flex-col gap-4 @4xl/main:col-span-2">

                        {/* Contact */}
                        <Card size="sm">
                           <CardHeader className="border-b">
                              <CardTitle className="flex items-center gap-2.5 text-sm">
                                 <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <MailIcon className="size-4" />
                                 </span>
                                 Contact Information
                              </CardTitle>
                           </CardHeader>
                           <CardContent>
                              <div className="grid grid-cols-1 gap-5 @2xl/main:grid-cols-2">
                                 <Field
                                    label="Email Address"
                                    icon={MailIcon}
                                    value={
                                       <span className="flex flex-wrap items-center gap-2">
                                          {client.email}
                                          <VerifiedPill verified={client.emailVerified} />
                                       </span>
                                    }
                                 />
                                 <Field
                                    label="Phone Number"
                                    icon={PhoneIcon}
                                    value={
                                       client.phone ? (
                                          <span className="flex flex-wrap items-center gap-2">
                                             {client.phone}
                                             <VerifiedPill verified={!!client.phoneVerified} />
                                          </span>
                                       ) : NOT_PROVIDED
                                    }
                                 />
                                 <Field
                                    label="State"
                                    icon={MapPinIcon}
                                    value={client.state ?? NOT_PROVIDED}
                                 />
                                 <Field
                                    label="Address"
                                    icon={HomeIcon}
                                    value={client.address ? client.address : NOT_PROVIDED}
                                 />
                              </div>
                           </CardContent>
                        </Card>

                        {/* KYC */}
                        <Card size="sm">
                           <CardHeader className="border-b">
                              <CardTitle className="flex items-center gap-2.5 text-sm">
                                 <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <ShieldCheckIcon className="size-4" />
                                 </span>
                                 KYC Details
                              </CardTitle>
                              <CardAction>
                                 <StatusPill active={kycComplete} trueLabel="Verified" falseLabel="Pending" />
                              </CardAction>
                           </CardHeader>
                           <CardContent>
                              <div className="grid grid-cols-1 gap-5 @2xl/main:grid-cols-2">
                                 <Field
                                    label="PAN Number"
                                    icon={CreditCardIcon}
                                    value={
                                       client.panNumber
                                          ? <span className="font-mono">{client.panNumber}</span>
                                          : NOT_PROVIDED
                                    }
                                 />
                                 <Field
                                    label="Aadhaar Number"
                                    icon={BadgeIcon}
                                    value={
                                       client.aadharNumber
                                          ? <span className="font-mono">{client.aadharNumber.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")}</span>
                                          : NOT_PROVIDED
                                    }
                                 />
                                 <Field
                                    label="GST Number"
                                    icon={ReceiptIcon}
                                    value={
                                       client.gstNumber
                                          ? <span className="font-mono">{client.gstNumber}</span>
                                          : NOT_PROVIDED
                                    }
                                 />
                              </div>
                           </CardContent>
                        </Card>

                        {/* Active logins */}
                        <Card size="sm">
                           <CardHeader className="border-b">
                              <CardTitle className="flex items-center gap-2.5 text-sm">
                                 <span className="flex size-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                    <MonitorSmartphoneIcon className="size-4" />
                                 </span>
                                 Active Logins
                              </CardTitle>
                              <CardAction>
                                 <span className="text-xs text-muted-foreground">
                                    {clientSessions.length} device{clientSessions.length === 1 ? "" : "s"}
                                 </span>
                              </CardAction>
                           </CardHeader>
                           <CardContent>
                              <SessionList
                                 sessions={clientSessions}
                                 canRevoke={canManageStatus}
                                 onRevokeAction={revokeClientSession.bind(null, client.id)}
                                 emptyText="This client has no active login sessions."
                              />
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
