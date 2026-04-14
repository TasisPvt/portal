import { db } from "@/src/db/client"
import { user, clientProfile } from "@/src/db/schema"
import { eq } from "drizzle-orm"
import { SiteHeader } from "@/src/components/site-header"
import { ClientsTable } from "./_components/clients-table"
import { UsersIcon } from "lucide-react"

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
    })
    .from(user)
    .leftJoin(clientProfile, eq(user.id, clientProfile.userId))
    .where(eq(user.userType, "client"))
    .orderBy(user.createdAt)

  return (
    <>
      <SiteHeader title="Clients" breadcrumb="Master" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="flex items-center gap-3 px-4 lg:px-6">
              <h2 className="text-xl font-semibold tracking-tight">Clients</h2>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                <UsersIcon className="size-3" />
                {clients.length} {clients.length === 1 ? "client" : "clients"}
              </span>
            </div>
            <div className="px-4 lg:px-6">
              <ClientsTable data={clients} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
