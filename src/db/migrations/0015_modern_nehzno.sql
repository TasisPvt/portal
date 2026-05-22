ALTER TABLE "financial_ratio_threshold" RENAME TO "screening_financial_ratio_threshold";--> statement-breakpoint
ALTER TABLE "screening_financial_ratio_threshold" DROP CONSTRAINT "financial_ratio_threshold_parameter_unique";--> statement-breakpoint
ALTER TABLE "screening_financial_ratio_threshold" ADD CONSTRAINT "screening_financial_ratio_threshold_parameter_unique" UNIQUE("parameter");