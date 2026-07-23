export const Roles = {
   SUPER_ADMIN: "super_admin",
   ADMIN: "admin",
   MANAGER: "manager",
} as const
export type Role = (typeof Roles)[keyof typeof Roles]

export const UserType = {
   ADMIN: "admin",
   CLIENT: "client",
} as const

export const SUPPORT_EMAIL = "support@tasis.in"

// Shown whenever a deactivated (isActive = false) account tries to authenticate.
// Single source of truth so the sign-in hook, login route, and OTP route stay in
// sync. This is the plain-text form used in API responses; the auth UIs render it
// with a clickable "TASIS support" mailto link via renderAuthError().
export const ACCOUNT_BLOCKED_MESSAGE =
   `Your account has been blocked. Contact the TASIS support (${SUPPORT_EMAIL}) for further details.`

export const DURATION_LABELS: Record<string, string> = {
   one_time: "One-Time",
   monthly: "Monthly",
   quarterly: "Quarterly",
   annual: "Annual",
   trial: "Free Trial",
}

export const TRIAL_PLAN_ID = "snapshot-free-trial"
export const TRIAL_PLAN_NAME = "Snapshot Free Trial"
export const TRIAL_DAYS = 7
export const TRIAL_STOCKS_PER_DAY = 5

// Max companies a user may keep bookmarked at once. Enforced server-side in the
// watchlist toggle action; surfaced in the add-bookmark UI when reached.
export const WATCHLIST_LIMIT = 100

// Month views included in an annual list subscription. The subscriber picks
// which months to view (current month only, recorded on first view); once used
// up, no further months can be unlocked for that subscription.
export const ANNUAL_LIST_MONTH_VIEWS = 4