import { notFound } from "next/navigation"
import Link from "next/link"
import { headers } from "next/headers"
import { db } from "@/src/db/client"
import { user } from "@/src/db/schema"
import { eq } from "drizzle-orm"
import { auth } from "@/src/lib/auth"
import { SiteHeader } from "@/src/components/site-header"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { StatusToggle } from "./_components/status-toggle"
import { RoleSelect } from "./_components/role-select"
import { StatusHistorySheet } from "@/src/components/account/status-history-sheet"
import { SessionList } from "@/src/components/account/session-list"
import { getUserStatusHistory, getUserSessions, revokeUserSession } from "./_actions"
import {
  ArrowLeftIcon,
  MailIcon,
  CalendarIcon,
  ShieldCheckIcon,
  CheckCircle2Icon,
  ClockIcon,
  MonitorSmartphoneIcon,
} from "lucide-react"
import { cn } from "@/src/lib/utils"
import type { Role } from "@/src/lib/constants"

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  manager: "Manager",
}

const ROLE_COLORS: Record<string, string> = {
  super_admin:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-400",
  admin:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400",
  manager:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400",
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]?.toUpperCase() ?? "").join("")
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

function Field({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: React.ReactNode
  icon?: React.ElementType
}) {
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

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      isActive: user.isActive,
      adminRole: user.adminRole,
    })
    .from(user)
    .where(eq(user.id, id))
    .limit(1)

  const u = rows[0]
  if (!u || u.id === undefined) notFound()

  const [session, statusHistory, userSessions] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getUserStatusHistory(u.id),
    getUserSessions(u.id),
  ])

  // An admin cannot activate/deactivate, change the role of, or revoke sessions
  // for their own account from here.
  const isSelf = session?.user?.id === u.id

  const joinedDate = u.createdAt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  const userId = u.id.slice(0, 8).toUpperCase()

  return (
    <>
      <SiteHeader title="User Detail" breadcrumb="Users" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-6 py-4 md:py-6">

            {/* Top action bar */}
            <div className="flex flex-wrap items-start gap-3 px-4 lg:px-6">
              <Button variant="outline" size="icon" className="size-9 shrink-0 rounded-full" asChild>
                <Link href="/admin/users">
                  <ArrowLeftIcon className="size-4" />
                </Link>
              </Button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl font-bold leading-tight">{u.name}</h1>
                  <StatusPill active={u.isActive} />
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {u.email} · User ID{" "}
                  <span className="font-medium text-foreground/70">#{userId}</span>
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <StatusHistorySheet history={statusHistory} />
                {!isSelf && <StatusToggle id={u.id} name={u.name} isActive={u.isActive} />}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 px-4 @4xl/main:grid-cols-3 lg:px-6">

              {/* Profile card - sticks alongside the scrolling details column on wide screens */}
              <Card size="sm" className="h-fit @4xl/main:sticky @4xl/main:top-6 @4xl/main:col-span-1 @4xl/main:self-start">
                <CardContent className="flex flex-col gap-5">
                  <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-2xl font-bold text-white">
                    {getInitials(u.name)}
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-lg font-semibold">{u.name}</p>
                    {u.adminRole && (
                      <Badge variant="outline" className={cn("w-fit rounded-full text-xs", ROLE_COLORS[u.adminRole])}>
                        {ROLE_LABELS[u.adminRole]}
                      </Badge>
                    )}
                  </div>
                  <div className="border-t" />
                  <div className="flex flex-col gap-3.5">
                    <StatRow icon={CalendarIcon} label="Joined" value={joinedDate} />
                    <StatRow
                      icon={ShieldCheckIcon}
                      label="Status"
                      value={
                        <span className={u.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                          {u.isActive ? "Active" : "Inactive"}
                        </span>
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Details */}
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
                            {u.email}
                            <VerifiedPill verified={u.emailVerified} />
                          </span>
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Role & access */}
                <Card size="sm">
                  <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-2.5 text-sm">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <ShieldCheckIcon className="size-4" />
                      </span>
                      Role & Access
                    </CardTitle>
                    <CardAction>
                      <StatusPill active={u.isActive} />
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-5 @2xl/main:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          <ShieldCheckIcon className="size-3.5" />
                          Admin Role
                        </span>
                        {isSelf ? (
                          <span className="text-sm font-semibold">
                            {u.adminRole ? ROLE_LABELS[u.adminRole] : "-"}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">(your account)</span>
                          </span>
                        ) : (
                          <RoleSelect id={u.id} currentRole={u.adminRole as Role | null} />
                        )}
                      </div>
                      <Field
                        label="Account Status"
                        value={<StatusPill active={u.isActive} />}
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
                        {userSessions.length} device{userSessions.length === 1 ? "" : "s"}
                      </span>
                    </CardAction>
                  </CardHeader>
                  <CardContent>
                    <SessionList
                      sessions={userSessions}
                      canRevoke={!isSelf}
                      onRevokeAction={revokeUserSession.bind(null, u.id)}
                      emptyText="This user has no active login sessions."
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
