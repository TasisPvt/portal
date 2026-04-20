import { relations } from "drizzle-orm"
import {
   pgTable,
   varchar,
   timestamp,
   date,
   index,
} from "drizzle-orm/pg-core"

export const industryGroup = pgTable("industry_group", {
   id: varchar("id", { length: 36 }).primaryKey(),
   name: varchar("name", { length: 255 }).notNull().unique(),
   createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
   updatedAt: timestamp("updated_at", { precision: 3 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
})

export const companyMaster = pgTable(
   "company_master",
   {
      id: varchar("id", { length: 36 }).primaryKey(),
      prowessId: varchar("prowess_id", { length: 100 }).notNull().unique(),
      companyName: varchar("company_name", { length: 255 }).notNull(),
      isinCode: varchar("isin_code", { length: 20 }).unique(),
      bseScripCode: varchar("bse_scrip_code", { length: 20 }),
      bseScripId: varchar("bse_scrip_id", { length: 50 }),
      bseGroup: varchar("bse_group", { length: 50 }),
      nseSymbol: varchar("nse_symbol", { length: 50 }),
      serviceGroup: varchar("service_group", { length: 100 }),
      nseListingDate: date("nse_listing_date"),
      nseDelistingDate: date("nse_delisting_date"),
      bseListingDate: date("bse_listing_date"),
      bseDelistingDate: date("bse_delisting_date"),
      industryGroupId: varchar("industry_group_id", { length: 36 }).references(
         () => industryGroup.id,
         { onDelete: "set null" },
      ),
      createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { precision: 3 })
         .defaultNow()
         .$onUpdate(() => new Date())
         .notNull(),
   },
   (table) => [
      index("company_master_industry_group_idx").on(table.industryGroupId),
      index("company_master_prowess_id_idx").on(table.prowessId),
      index("company_master_isin_idx").on(table.isinCode),
   ],
)

export const industryGroupRelations = relations(industryGroup, ({ many }) => ({
   companies: many(companyMaster),
}))

export const companyMasterRelations = relations(companyMaster, ({ one }) => ({
   industryGroup: one(industryGroup, {
      fields: [companyMaster.industryGroupId],
      references: [industryGroup.id],
   }),
}))

export type IndustryGroup = typeof industryGroup.$inferSelect
export type CompanyMaster = typeof companyMaster.$inferSelect
