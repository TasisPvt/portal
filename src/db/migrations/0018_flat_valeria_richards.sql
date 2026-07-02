CREATE TABLE "watchlist" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"company_id" varchar(36) NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "watchlist_user_company_uq" UNIQUE("user_id","company_id")
);
--> statement-breakpoint
ALTER TABLE "client_profile" DROP CONSTRAINT "client_profile_username_unique";--> statement-breakpoint
ALTER TABLE "client_profile" ADD COLUMN "address" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "client_profile" ADD COLUMN "gst_number" varchar(15);--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "taxable_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "cgst" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "sgst" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "igst" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "gst_rate" numeric(5, 2) DEFAULT '18' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment" ADD COLUMN "place_of_supply" varchar(100) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "taxable_amount" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "cgst" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "sgst" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "igst" numeric(12, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "gst_rate" numeric(5, 2) DEFAULT '18' NOT NULL;--> statement-breakpoint
ALTER TABLE "subscription" ADD COLUMN "place_of_supply" varchar(100) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_company_id_company_master_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "watchlist_user_idx" ON "watchlist" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "client_profile" DROP COLUMN "username";