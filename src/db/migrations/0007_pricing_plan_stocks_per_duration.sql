ALTER TABLE "pricing_plan" DROP COLUMN "stocks_per_day";--> statement-breakpoint
ALTER TABLE "pricing_plan" DROP COLUMN "stocks_in_duration";--> statement-breakpoint
ALTER TABLE "pricing_plan" ADD COLUMN "one_time_stocks_per_day" integer;--> statement-breakpoint
ALTER TABLE "pricing_plan" ADD COLUMN "one_time_stocks_in_duration" integer;--> statement-breakpoint
ALTER TABLE "pricing_plan" ADD COLUMN "monthly_stocks_per_day" integer;--> statement-breakpoint
ALTER TABLE "pricing_plan" ADD COLUMN "monthly_stocks_in_duration" integer;--> statement-breakpoint
ALTER TABLE "pricing_plan" ADD COLUMN "quarterly_stocks_per_day" integer;--> statement-breakpoint
ALTER TABLE "pricing_plan" ADD COLUMN "quarterly_stocks_in_duration" integer;--> statement-breakpoint
ALTER TABLE "pricing_plan" ADD COLUMN "annual_stocks_per_day" integer;--> statement-breakpoint
ALTER TABLE "pricing_plan" ADD COLUMN "annual_stocks_in_duration" integer;
