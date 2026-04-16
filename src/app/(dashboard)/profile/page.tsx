import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { eq, and } from "drizzle-orm"
import { auth } from "@/src/lib/auth"
import { db } from "@/src/db/client"
import { user, clientProfile, account } from "@/src/db/schema"
import { SiteHeader } from "@/src/components/site-header"
import { ProfileForm } from "./_components/profile-form"

export default async function ProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.id) redirect("/login")

  const [profileRows, accountRows] = await Promise.all([
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
        username: clientProfile.username,
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
  ])

  const profile = profileRows[0]
  if (!profile) redirect("/login")

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
          </div>
        </div>
      </div>
    </>
  )
}
