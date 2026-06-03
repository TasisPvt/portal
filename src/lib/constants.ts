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

export const DURATION_LABELS: Record<string, string> = {
   one_time: "One-Time",
   monthly: "Monthly",
   quarterly: "Quarterly",
   annual: "Annual",
}