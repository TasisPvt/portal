import { relations } from "drizzle-orm"
import { pgTable, varchar, text, timestamp, boolean, index } from "drizzle-orm/pg-core"
import { user } from "./auth"
import { subscription } from "./subscriptions"

// Support tickets raised by clients, optionally tied to one of their
// subscriptions (null = general issue). Status is admin-controlled only.
// Clients may post follow-up messages only while `allowClientReplies` is on
// (toggled per-ticket by an admin) and the ticket isn't closed.
export const ticket = pgTable(
   "ticket",
   {
      id: varchar("id", { length: 36 }).primaryKey(),
      clientId: varchar("client_id", { length: 36 })
         .notNull()
         .references(() => user.id, { onDelete: "cascade" }),
      subscriptionId: varchar("subscription_id", { length: 36 }).references(
         () => subscription.id,
         { onDelete: "set null" },
      ),
      subject: varchar("subject", { length: 255 }).notNull(),
      description: text("description").notNull(),
      status: varchar("status", { length: 20 }).notNull().default("open"), // "open" | "resolved" | "closed"
      allowClientReplies: boolean("allow_client_replies").notNull().default(false),
      createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { precision: 3 })
         .defaultNow()
         .$onUpdate(() => new Date())
         .notNull(),
   },
   (table) => [
      index("ticket_client_idx").on(table.clientId),
      index("ticket_status_idx").on(table.status),
   ],
)

export const ticketMessage = pgTable(
   "ticket_message",
   {
      id: varchar("id", { length: 36 }).primaryKey(),
      ticketId: varchar("ticket_id", { length: 36 })
         .notNull()
         .references(() => ticket.id, { onDelete: "cascade" }),
      // set null (not cascade) so admin replies survive if the admin account is
      // removed; client deletion removes the whole ticket via ticket.clientId.
      senderId: varchar("sender_id", { length: 36 }).references(() => user.id, {
         onDelete: "set null",
      }),
      senderRole: varchar("sender_role", { length: 10 }).notNull(), // "client" | "admin"
      body: text("body").notNull(),
      createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
   },
   (table) => [index("ticket_message_ticket_idx").on(table.ticketId)],
)

export const ticketRelations = relations(ticket, ({ one, many }) => ({
   client: one(user, { fields: [ticket.clientId], references: [user.id] }),
   subscription: one(subscription, {
      fields: [ticket.subscriptionId],
      references: [subscription.id],
   }),
   messages: many(ticketMessage),
}))

export const ticketMessageRelations = relations(ticketMessage, ({ one }) => ({
   ticket: one(ticket, { fields: [ticketMessage.ticketId], references: [ticket.id] }),
   sender: one(user, { fields: [ticketMessage.senderId], references: [user.id] }),
}))

export type Ticket = typeof ticket.$inferSelect
export type TicketMessage = typeof ticketMessage.$inferSelect
