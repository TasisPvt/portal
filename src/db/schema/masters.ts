import { relations } from "drizzle-orm"
import {
   pgTable,
   varchar,
   timestamp,
   date,
   index,
   boolean,
   numeric,
   smallint,
   unique,
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
      isActive: boolean("is_active").notNull().default(true),
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

export const companyNameHistory = pgTable(
   "company_name_history",
   {
      id: varchar("id", { length: 36 }).primaryKey(),
      companyId: varchar("company_id", { length: 36 })
         .notNull()
         .references(() => companyMaster.id, { onDelete: "cascade" }),
      name: varchar("name", { length: 255 }).notNull(),
      changedAt: timestamp("changed_at", { precision: 3 }).defaultNow().notNull(),
   },
   (table) => [
      index("company_name_history_company_idx").on(table.companyId),
   ],
)

export const industryGroupRelations = relations(industryGroup, ({ many }) => ({
   companies: many(companyMaster),
}))

export const companyMasterRelations = relations(companyMaster, ({ one, many }) => ({
   industryGroup: one(industryGroup, {
      fields: [companyMaster.industryGroupId],
      references: [industryGroup.id],
   }),
   nameHistory: many(companyNameHistory),
}))

export const companyNameHistoryRelations = relations(companyNameHistory, ({ one }) => ({
   company: one(companyMaster, {
      fields: [companyNameHistory.companyId],
      references: [companyMaster.id],
   }),
}))

export const indexMaster = pgTable("index_master", {
   id: varchar("id", { length: 36 }).primaryKey(),
   name: varchar("name", { length: 255 }).notNull().unique(),
   description: varchar("description", { length: 1000 }),
   createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
   updatedAt: timestamp("updated_at", { precision: 3 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
})

export const indexCompany = pgTable(
   "index_company",
   {
      id: varchar("id", { length: 36 }).primaryKey(),
      indexId: varchar("index_id", { length: 36 })
         .notNull()
         .references(() => indexMaster.id, { onDelete: "cascade" }),
      companyId: varchar("company_id", { length: 36 })
         .notNull()
         .references(() => companyMaster.id, { onDelete: "cascade" }),
      addedAt: timestamp("added_at", { precision: 3 }).defaultNow().notNull(),
   },
   (table) => [
      index("index_company_index_idx").on(table.indexId),
      index("index_company_company_idx").on(table.companyId),
   ],
)

export const indexMasterRelations = relations(indexMaster, ({ many }) => ({
   companies: many(indexCompany),
}))

export const indexCompanyRelations = relations(indexCompany, ({ one }) => ({
   index: one(indexMaster, { fields: [indexCompany.indexId], references: [indexMaster.id] }),
   company: one(companyMaster, { fields: [indexCompany.companyId], references: [companyMaster.id] }),
}))

export const companyIndexRelations = relations(companyMaster, ({ many }) => ({
   indexes: many(indexCompany),
}))

export const companyShariah = pgTable(
   "company_shariah",
   {
      id: varchar("id", { length: 36 }).primaryKey(),
      companyId: varchar("company_id", { length: 36 })
         .notNull()
         .references(() => companyMaster.id, { onDelete: "cascade" }),
      month: varchar("month", { length: 7 }).notNull(), // "YYYY-MM"
      assessmentYear: date("assessment_year"),
      marketCap: numeric("market_cap", { precision: 20, scale: 2 }),
      companyStatus: varchar("company_status", { length: 20 }), // "Consolidated" | "Standalone"
      shariahStatus: smallint("shariah_status"), // 1-9
      lastFinancialData: boolean("last_financial_data"),
      primaryBusiness: boolean("primary_business"),
      secondaryBusiness: boolean("secondary_business"),
      compliantOnInvestment: boolean("compliant_on_investment"),
      sufficientFinancialInfo: boolean("sufficient_financial_info"),
      totalDebtTotalAssetValue: numeric("total_debt_total_asset_value", { precision: 20, scale: 4 }),
      totalDebtTotalAssetStatus: boolean("total_debt_total_asset_status"),
      totalInterestIncomeTotalIncomeValue: numeric("total_interest_income_total_income_value", { precision: 20, scale: 4 }),
      totalInterestIncomeTotalIncomeStatus: boolean("total_interest_income_total_income_status"),
      cashBankReceivablesTotalAssetValue: numeric("cash_bank_receivables_total_asset_value", { precision: 20, scale: 4 }),
      cashBankReceivablesTotalAssetStatus: boolean("cash_bank_receivables_total_asset_status"),
      remark: varchar("remark", { length: 1000 }),
      lastUpdatedAt: timestamp("last_updated_at", { precision: 3 }),
      createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
      updatedAt: timestamp("updated_at", { precision: 3 })
         .defaultNow()
         .$onUpdate(() => new Date())
         .notNull(),
   },
   (table) => [
      unique("company_shariah_company_month_unique").on(table.companyId, table.month),
      index("company_shariah_company_idx").on(table.companyId),
      index("company_shariah_month_idx").on(table.month),
   ],
)

export const companyShariahRelations = relations(companyShariah, ({ one }) => ({
   company: one(companyMaster, { fields: [companyShariah.companyId], references: [companyMaster.id] }),
}))

export const tasisScreeningStandard = pgTable("tasis_screening_standard", {
   id: varchar("id", { length: 36 }).primaryKey(),
   shariahStatus: smallint("shariah_status").notNull().unique(), // 1-9
   remark: varchar("remark", { length: 2000 }),
   createdAt: timestamp("created_at", { precision: 3 }).defaultNow().notNull(),
   updatedAt: timestamp("updated_at", { precision: 3 })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
})

export type IndustryGroup = typeof industryGroup.$inferSelect
export type CompanyMaster = typeof companyMaster.$inferSelect
export type CompanyNameHistory = typeof companyNameHistory.$inferSelect
export type IndexMaster = typeof indexMaster.$inferSelect
export type IndexCompany = typeof indexCompany.$inferSelect
export type CompanyShariah = typeof companyShariah.$inferSelect
export type TasisScreeningStandard = typeof tasisScreeningStandard.$inferSelect
