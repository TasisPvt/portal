ALTER TABLE "pricing_plan" DROP COLUMN "one_time_stocks_in_duration";--> statement-breakpoint
ALTER TABLE "pricing_plan" DROP COLUMN "monthly_stocks_in_duration";--> statement-breakpoint
ALTER TABLE "pricing_plan" DROP COLUMN "quarterly_stocks_in_duration";--> statement-breakpoint
ALTER TABLE "pricing_plan" DROP COLUMN "annual_stocks_in_duration";--> statement-breakpoint
ALTER TABLE "payment" DROP COLUMN "stocks_in_duration_snapshot";--> statement-breakpoint
ALTER TABLE "subscription" DROP COLUMN "stocks_in_duration_snapshot";