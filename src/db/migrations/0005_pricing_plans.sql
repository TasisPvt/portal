CREATE TABLE "pricing_plan" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"stocks_per_day" integer,
	"stocks_in_duration" integer,
	"index_id" varchar(36),
	"one_time_price" numeric(12, 2),
	"monthly_price" numeric(12, 2),
	"quarterly_price" numeric(12, 2),
	"annual_price" numeric(12, 2),
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "pricing_plan_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "pricing_plan" ADD CONSTRAINT "pricing_plan_index_id_index_master_id_fk" FOREIGN KEY ("index_id") REFERENCES "public"."index_master"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pricing_plan_type_idx" ON "pricing_plan" USING btree ("type");--> statement-breakpoint
CREATE INDEX "pricing_plan_index_idx" ON "pricing_plan" USING btree ("index_id");
