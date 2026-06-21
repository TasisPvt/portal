import { relations } from "drizzle-orm"
import { pgTable, varchar, timestamp, numeric, integer, index, unique } from "drizzle-orm/pg-core"
import { user } from "./auth"
import { pricingPlan } from "./pricing"
import { companyMaster } from "./masters"

export const subscription = pgTable(
   "subscription",
   {
      id: varchar("id", { length: 36 }).primaryKey(),
      clientId: varchar("client_id", { length: 36 })
         .notNull()
         .references(() => user.id, { onDelete: "cascade" }),
      planId: varchar("plan_id", { length: 36 })
         .notNull()
         .references(() => pricingPlan.id, { onDelete: "restrict" }),
      durationType: varchar("duration_type", { length: 20 }).notNull(), // "one_time" | "monthly" | "quarterly" | "annual"
      status: varchar("status", { length: 20 }).notNull().default("active"), // "active" | "expired" | "cancelled"
      startDate: timestamp("start_date", { precision: 3 }).notNull(),
      endDate: timestamp("end_date", { precision: 3 }).notNull(),
      // Snapshots taken at the time of subscription
      priceSnapshot: numeric("price_snapshot", { precision: 12, scale: 2 }).notNull(),
      // GST breakdown (price is GST-inclusive; GST is 18% of the gross price)
      taxableAmount: numeric("taxable_amount", { precision: 12, scale: 2 }).notNull().default("0"),
      cgst: numeric("cgst", { precision: 12, scale: 2 }).notNull().default("0"),
      sgst: numeric("sgst", { precision: 12, scale: 2 }).notNull().default("0"),
      igst: numeric("igst", { precision: 12, scale: 2 }).notNull().default("0"),
      gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("18"),
      placeOfSupply: varchar("place_of_supply", { length: 100 }).notNull().default(""),
      stocksPerDaySnapshot: integer("stocks_per_day_snapshot"),
      stocksInDurationSnapshot: integer("stocks_in_duration_snapshot"),
      createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { precision: 3 })
         .defaultNow()
         .$onUpdate(() => new Date())
         .notNull(),
   },
   (table) => [
      index("subscription_client_idx").on(table.clientId),
      index("subscription_plan_idx").on(table.planId),
      index("subscription_status_idx").on(table.status),
   ],
)

export const subscriptionRelations = relations(subscription, ({ one }) => ({
   client: one(user, { fields: [subscription.clientId], references: [user.id] }),
   plan: one(pricingPlan, { fields: [subscription.planId], references: [pricingPlan.id] }),
}))

export type Subscription = typeof subscription.$inferSelect

// One row per (subscription, company, month).
// Written once at subscription creation (startMonth) and once per monthly
// shariah import for active quarterly/annual subscriptions.
// The client list page reads from here instead of the live indexCompany table,
// so each subscriber's company list is frozen to what existed when they joined
// and updated only when new monthly data is officially published.
export const subscriptionListSnapshot = pgTable(
   "subscription_list_snapshot",
   {
      id: varchar("id", { length: 36 }).primaryKey(),
      subscriptionId: varchar("subscription_id", { length: 36 })
         .notNull()
         .references(() => subscription.id, { onDelete: "cascade" }),
      companyId: varchar("company_id", { length: 36 })
         .notNull()
         .references(() => companyMaster.id, { onDelete: "restrict" }),
      month: varchar("month", { length: 7 }).notNull(), // YYYY-MM
      createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
   },
   (table) => [
      index("scs_sub_month_idx").on(table.subscriptionId, table.month),
      unique("scs_sub_company_month_uq").on(table.subscriptionId, table.companyId, table.month),
   ],
)

export type SubscriptionListSnapshot = typeof subscriptionListSnapshot.$inferSelect

// One row per checkout attempt. Created when a Razorpay order is generated and
// updated after the browser returns + server-side signature verification.
// On successful verification a subscription is created and linked back here.
export const payment = pgTable(
   "payment",
   {
      id: varchar("id", { length: 36 }).primaryKey(),
      clientId: varchar("client_id", { length: 36 })
         .notNull()
         .references(() => user.id, { onDelete: "cascade" }),
      planId: varchar("plan_id", { length: 36 })
         .notNull()
         .references(() => pricingPlan.id, { onDelete: "restrict" }),
      durationType: varchar("duration_type", { length: 20 }).notNull(),
      // Amount charged, in paise (Razorpay's smallest currency unit).
      amount: integer("amount").notNull(),
      currency: varchar("currency", { length: 3 }).notNull().default("INR"),
      // Price/limits locked at order time, mirrored onto the subscription on success.
      priceSnapshot: numeric("price_snapshot", { precision: 12, scale: 2 }).notNull(),
      // GST breakdown (price is GST-inclusive; GST is 18% of the gross price)
      taxableAmount: numeric("taxable_amount", { precision: 12, scale: 2 }).notNull().default("0"),
      cgst: numeric("cgst", { precision: 12, scale: 2 }).notNull().default("0"),
      sgst: numeric("sgst", { precision: 12, scale: 2 }).notNull().default("0"),
      igst: numeric("igst", { precision: 12, scale: 2 }).notNull().default("0"),
      gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("18"),
      placeOfSupply: varchar("place_of_supply", { length: 100 }).notNull().default(""),
      stocksPerDaySnapshot: integer("stocks_per_day_snapshot"),
      stocksInDurationSnapshot: integer("stocks_in_duration_snapshot"),
      razorpayOrderId: varchar("razorpay_order_id", { length: 255 }).notNull().unique(),
      razorpayPaymentId: varchar("razorpay_payment_id", { length: 255 }),
      razorpaySignature: varchar("razorpay_signature", { length: 255 }),
      status: varchar("status", { length: 20 }).notNull().default("created"), // "created" | "paid" | "failed" | "cancelled"
      subscriptionId: varchar("subscription_id", { length: 36 })
         .references(() => subscription.id, { onDelete: "set null" }),
      createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { precision: 3 })
         .defaultNow()
         .$onUpdate(() => new Date())
         .notNull(),
   },
   (table) => [
      index("payment_client_idx").on(table.clientId),
      index("payment_status_idx").on(table.status),
      index("payment_order_idx").on(table.razorpayOrderId),
   ],
)

export type Payment = typeof payment.$inferSelect
