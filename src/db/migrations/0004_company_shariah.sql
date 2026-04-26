CREATE TABLE "company_shariah" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"company_id" varchar(36) NOT NULL,
	"month" varchar(7) NOT NULL,
	"market_cap" numeric(20, 2),
	"company_status" varchar(20),
	"shariah_status" smallint,
	"last_financial_data" boolean,
	"primary_business" boolean,
	"secondary_business" boolean,
	"compliant_on_investment" boolean,
	"sufficient_financial_info" boolean,
	"total_debt_total_asset_value" numeric(20, 4),
	"total_debt_total_asset_status" boolean,
	"total_interest_income_total_income_value" numeric(20, 4),
	"total_interest_income_total_income_status" boolean,
	"cash_bank_receivables_total_asset_value" numeric(20, 4),
	"cash_bank_receivables_total_asset_status" boolean,
	"remark" varchar(1000),
	"last_updated_at" timestamp (3),
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "company_shariah_company_month_unique" UNIQUE("company_id","month")
);
--> statement-breakpoint
ALTER TABLE "company_shariah" ADD CONSTRAINT "company_shariah_company_id_company_master_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_shariah_company_idx" ON "company_shariah" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "company_shariah_month_idx" ON "company_shariah" USING btree ("month");
