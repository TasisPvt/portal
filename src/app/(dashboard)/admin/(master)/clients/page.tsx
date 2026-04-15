import { db } from "@/src/db/client"
import { user, clientProfile } from "@/src/db/schema"
import { eq } from "drizzle-orm"
import { SiteHeader } from "@/src/components/site-header"
import { ClientsTable } from "./_components/clients-table"
import { AddClientDialog } from "./_components/add-client-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { UsersIcon, UserCheckIcon, UserXIcon } from "lucide-react"

export default async function ClientsPage() {
  const clients = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      username: clientProfile.username,
      phone: clientProfile.phone,
      phoneVerified: clientProfile.phoneVerified,
      state: clientProfile.state,
      panNumber: clientProfile.panNumber,
      isActive: user.isActive,
    })
    .from(user)
    .leftJoin(clientProfile, eq(user.id, clientProfile.userId))
    .where(eq(user.userType, "client"))
    .orderBy(user.createdAt)

  const total = clients.length
  const active = clients.filter((c) => c.isActive).length
  const inactive = total - active

  const stats = [
    {
      label: "Total Clients",
      value: total,
      icon: UsersIcon,
      iconClass: "text-primary bg-primary/10",
    },
    {
      label: "Active",
      value: active,
      icon: UserCheckIcon,
      iconClass: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-950",
    },
    {
      label: "Inactive",
      value: inactive,
      icon: UserXIcon,
      iconClass: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950",
    },
  ]

  return (
    <>
      <SiteHeader title="Clients" breadcrumb="Master" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

            {/* Page heading */}
            <div className="flex items-center justify-between px-4 lg:px-6">
              <h2 className="text-xl font-semibold tracking-tight">Clients</h2>
              <AddClientDialog />
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-3 lg:px-6">
              {stats.map(({ label, value, icon: Icon, iconClass }) => (
                <Card key={label} size="sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                      <span className={`inline-flex size-8 items-center justify-center rounded-lg ${iconClass}`}>
                        <Icon className="size-4" />
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold tracking-tight">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Table */}
            <div className="px-4 lg:px-6">
              <ClientsTable data={clients} />
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
