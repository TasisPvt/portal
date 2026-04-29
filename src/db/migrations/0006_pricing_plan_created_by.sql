ALTER TABLE "pricing_plan" ADD COLUMN "created_by_id" varchar(36);--> statement-breakpoint
ALTER TABLE "pricing_plan" ADD CONSTRAINT "pricing_plan_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pricing_plan_created_by_idx" ON "pricing_plan" USING btree ("created_by_id");
