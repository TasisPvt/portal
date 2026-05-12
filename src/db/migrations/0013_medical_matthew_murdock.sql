CREATE TABLE "subscription_list_snapshot" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"subscription_id" varchar(36) NOT NULL,
	"company_id" varchar(36) NOT NULL,
	"month" varchar(7) NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "scs_sub_company_month_uq" UNIQUE("subscription_id","company_id","month")
);
--> statement-breakpoint
ALTER TABLE "subscription_list_snapshot" ADD CONSTRAINT "subscription_list_snapshot_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_list_snapshot" ADD CONSTRAINT "subscription_list_snapshot_company_id_company_master_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_master"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "scs_sub_month_idx" ON "subscription_list_snapshot" USING btree ("subscription_id","month");
