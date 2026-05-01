CREATE TABLE "subscription" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"client_id" varchar(36) NOT NULL,
	"plan_id" varchar(36) NOT NULL,
	"duration_type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"start_date" timestamp(3) NOT NULL,
	"end_date" timestamp(3),
	"price_snapshot" numeric(12, 2) NOT NULL,
	"stocks_per_day_snapshot" integer,
	"stocks_in_duration_snapshot" integer,
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_client_id_user_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_plan_id_pricing_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."pricing_plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "subscription_client_idx" ON "subscription" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "subscription_plan_idx" ON "subscription" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "subscription_status_idx" ON "subscription" USING btree ("status");
