ALTER TABLE "pricing_plan" ADD COLUMN "category" varchar(100);--> statement-breakpoint
CREATE INDEX "pricing_plan_category_idx" ON "pricing_plan" USING btree ("category");