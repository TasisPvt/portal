import { notFound } from "next/navigation"
import Link from "next/link"
import { db } from "@/src/db/client"
import { user } from "@/src/db/schema"
import { eq } from "drizzle-orm"
import { SiteHeader } from "@/src/components/site-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { Badge } from "@/src/components/ui/badge"
import { Button } from "@/src/components/ui/button"
import { Avatar, AvatarFallback } from "@/src/components/ui/avatar"
import { StatusToggle } from "./_components/status-toggle"
import { RoleSelect } from "./_components/role-select"
import {
  ArrowLeftIcon,
  MailIcon,
  CalendarIcon,
  UserIcon,
  ShieldCheckIcon,
  CheckCircle2Icon,
  ClockIcon,
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
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400">
      <CheckCircle2Icon className="size-4" /> Verified
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400">
      <ClockIcon className="size-4" /> Unverified
    </span>
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

  const joinedDate = u.createdAt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })

  return (
    <>
      <SiteHeader title="User Detail" breadcrumb="Users" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-6 py-4 md:py-6">

            {/* Back + heading */}
            <div className="flex items-center gap-3 px-4 lg:px-6">
              <Button variant="ghost" size="icon" className="size-8 shrink-0" asChild>
                <Link href="/admin/users">
                  <ArrowLeftIcon className="size-4" />
                </Link>
              </Button>
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold leading-tight">
                  {u.name}
                  <Badge
                    variant="outline"
                    className={cn(
                      "ml-1",
                      u.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                        : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
                    )}
                  >
                    {u.isActive ? "Active" : "Inactive"}
                  </Badge>
                </h2>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <StatusToggle id={u.id} name={u.name} isActive={u.isActive} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 px-4 lg:grid-cols-3 lg:px-6">

              {/* Avatar card */}
              <Card size="sm" className="flex flex-col items-center gap-4 py-8! lg:col-span-1">
                <Avatar className="size-20">
                  <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                    {getInitials(u.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-center gap-2 text-center">
                  <p className="text-base font-semibold">{u.name}</p>
                  {u.adminRole && (
                    <Badge
                      variant="outline"
                      className={cn("text-xs", ROLE_COLORS[u.adminRole])}
                    >
                      {ROLE_LABELS[u.adminRole]}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="size-3.5" />
                  Joined {joinedDate}
                </div>
              </Card>

              {/* Details */}
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
                            {u.email}
                            <VerifiedBadge verified={u.emailVerified} />
                          </span>
                        }
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Role & access */}
                <Card size="sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <ShieldCheckIcon className="size-4 text-muted-foreground" />
                      Role & Access
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <ShieldCheckIcon className="size-3.5" />
                          Admin Role
                        </span>
                        <RoleSelect
                          id={u.id}
                          currentRole={u.adminRole as Role | null}
                        />
                      </div>
                      <Field
                        label="Account Status"
                        value={
                          <Badge
                            variant="outline"
                            className={cn(
                              u.isActive
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-400"
                                : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400",
                            )}
                          >
                            {u.isActive ? "Active" : "Inactive"}
                          </Badge>
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
