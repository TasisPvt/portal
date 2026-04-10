export const Roles = {
   SUPER_ADMIN: "super_admin",
   ADMIN: "admin",
   MANAGER: "manager",
} as const

export type Role = (typeof Roles)[keyof typeof Roles]