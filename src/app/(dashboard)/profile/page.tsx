import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq, and, gt, desc } from "drizzle-orm"
import { MonitorSmartphoneIcon } from "lucide-react"
import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import { user, clientProfile, account, session as sessionTable } from "@/src/db/schema"
import { SiteHeader } from "@/src/components/site-header"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card"
import { SessionList } from "@/src/components/account/session-list"
import { ProfileForm } from "./_components/profile-form"
import { revokeMySession, revokeMyOtherSessions } from "./_actions"

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) redirect("/login")

  const [profileRows, accountRows, sessionRows] = await Promise.all([
    db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        userType: user.userType,
        adminRole: user.adminRole,
        phone: clientProfile.phone,
        state: clientProfile.state,
        address: clientProfile.address,
        gstNumber: clientProfile.gstNumber,
        aadharNumber: clientProfile.aadharNumber,
        panNumber: clientProfile.panNumber,
      })
      .from(user)
      .leftJoin(clientProfile, eq(user.id, clientProfile.userId))
      .where(eq(user.id, session.user.id))
      .limit(1),

    db
      .select({ updatedAt: account.updatedAt })
      .from(account)
      .where(
        and(
          eq(account.userId, session.user.id),
          eq(account.providerId, "credential"),
        ),
      )
      .limit(1),

    db
      .select({
        id: sessionTable.id,
        ipAddress: sessionTable.ipAddress,
        userAgent: sessionTable.userAgent,
        createdAt: sessionTable.createdAt,
        updatedAt: sessionTable.updatedAt,
      })
      .from(sessionTable)
      .where(and(eq(sessionTable.userId, session.user.id), gt(sessionTable.expiresAt, new Date())))
      .orderBy(desc(sessionTable.updatedAt)),
  ])

  const profile = profileRows[0]
  if (!profile) redirect("/login")

  const currentSessionId = session.session?.id ?? null

  return (
    <>
      <SiteHeader title="My Profile" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-6 py-4 md:py-6">
            <div className="px-4 lg:px-6">
              <ProfileForm
                profile={profile}
                passwordUpdatedAt={accountRows[0]?.updatedAt ?? null}
              />
            </div>

            <div className="px-4 lg:px-6">
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
                      {sessionRows.length} device{sessionRows.length === 1 ? "" : "s"}
                    </span>
                  </CardAction>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">
                    These are the devices currently signed in to your account. Revoke any you don&apos;t recognise.
                  </p>
                  <SessionList
                    sessions={sessionRows}
                    currentSessionId={currentSessionId}
                    canRevoke
                    onRevokeAction={revokeMySession}
                    onRevokeOthersAction={revokeMyOtherSessions}
                    emptyText="No active sessions."
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
