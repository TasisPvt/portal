import { Roles, type Role } from "@/src/lib/constants";
import { relations } from "drizzle-orm";
import {
  mysqlTable,
  mysqlEnum,
  varchar,
  text,
  timestamp,
  datetime,
  boolean,
  index,
} from "drizzle-orm/mysql-core";

export const userTypeEnum = mysqlEnum("user_type", ["client", "admin"]);
export const adminRoleEnum = mysqlEnum("admin_role", [
  Roles.SUPER_ADMIN,
  Roles.ADMIN,
  Roles.MANAGER
]);

export const user = mysqlTable("user", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { fsp: 3 })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
  // Type discriminator — present on every user
  userType: mysqlEnum("user_type", ["client", "admin"]).notNull().default("client"),
  // Only populated for admin-type users; null for clients
  adminRole: mysqlEnum("admin_role", [
    Roles.SUPER_ADMIN,
    Roles.ADMIN,
    Roles.MANAGER
  ]),
  // True when the account was created with an auto-generated password.
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
  // False = account is suspended / deactivated.
  isActive: boolean("is_active").default(true).notNull(),
});

export const session = mysqlTable(
  "session",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    expiresAt: timestamp("expires_at", { fsp: 3 }).notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)],
);

export const account = mysqlTable(
  "account",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: datetime("access_token_expires_at", { fsp: 3 }),
    refreshTokenExpiresAt: datetime("refresh_token_expires_at", { fsp: 3 }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)],
);

export const verification = mysqlTable(
  "verification",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { fsp: 3 }).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

// Stores KYC fields mandatory for client-type users only.
// Created immediately after a client registers.
export const clientProfile = mysqlTable("client_profile", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 })
    .notNull()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  username: varchar("username", { length: 30 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  phoneVerified: boolean("phone_verified").default(false).notNull(),
  aadharNumber: varchar("aadhar_number", { length: 12 }).notNull().unique(),
  panNumber: varchar("pan_number", { length: 10 }).notNull().unique(),
  state: varchar("state", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { fsp: 3 })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ─── Relations ───────────────────────────────────────────────────────────────

export const userRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  clientProfile: one(clientProfile, {
    fields: [user.id],
    references: [clientProfile.userId],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const clientProfileRelations = relations(clientProfile, ({ one }) => ({
  user: one(user, {
    fields: [clientProfile.userId],
    references: [user.id],
  }),
}));

// ─── Exported types ───────────────────────────────────────────────────────────

export type UserType = "client" | "admin";
export type AdminRole = Role;

export type User = typeof user.$inferSelect;
export type ClientProfile = typeof clientProfile.$inferSelect;
