-- Add assessment_year to company_shariah
ALTER TABLE "company_shariah" ADD COLUMN "assessment_year" date;

-- Create tasis_screening_standard table
CREATE TABLE "tasis_screening_standard" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"shariah_status" smallint NOT NULL,
	"remark" varchar(2000),
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "tasis_screening_standard_shariah_status_unique" UNIQUE("shariah_status")
);

-- Create stock_view_log table
CREATE TABLE "stock_view_log" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"subscription_id" varchar(36) NOT NULL,
	"company_id" varchar(36) NOT NULL,
	"viewed_date" date NOT NULL,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "stock_view_log_sub_company_date_unique" UNIQUE("subscription_id","company_id","viewed_date")
);

CREATE INDEX "stock_view_log_subscription_idx" ON "stock_view_log" ("subscription_id");
CREATE INDEX "stock_view_log_viewed_date_idx" ON "stock_view_log" ("viewed_date");

DO $$ BEGIN
 ALTER TABLE "stock_view_log" ADD CONSTRAINT "stock_view_log_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "stock_view_log" ADD CONSTRAINT "stock_view_log_company_id_company_master_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_master"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
