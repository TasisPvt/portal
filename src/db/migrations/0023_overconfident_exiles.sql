CREATE TABLE "subscription_month_unlock" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"subscription_id" varchar(36) NOT NULL,
	"month" varchar(7) NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "smu_sub_month_uq" UNIQUE("subscription_id","month")
);
--> statement-breakpoint
ALTER TABLE "subscription_month_unlock" ADD CONSTRAINT "subscription_month_unlock_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "smu_sub_idx" ON "subscription_month_unlock" USING btree ("subscription_id");--> statement-breakpoint
INSERT INTO "subscription_month_unlock" ("id", "subscription_id", "month")
SELECT gen_random_uuid(), sls."subscription_id", sls."month"
FROM (SELECT DISTINCT "subscription_id", "month" FROM "subscription_list_snapshot") sls
JOIN "subscription" s ON s."id" = sls."subscription_id"
JOIN "pricing_plan" p ON p."id" = s."plan_id"
WHERE s."duration_type" = 'annual' AND p."type" = 'list'
ON CONFLICT DO NOTHING;