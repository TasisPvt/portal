CREATE TABLE "company_name_history" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"company_id" varchar(36) NOT NULL,
	"name" varchar(255) NOT NULL,
	"changed_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_master" ALTER COLUMN "isin_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "company_master" ALTER COLUMN "service_group" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "company_name_history" ADD CONSTRAINT "company_name_history_company_id_company_master_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "company_name_history_company_idx" ON "company_name_history" USING btree ("company_id");