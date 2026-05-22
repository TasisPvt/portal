CREATE TABLE "financial_ratio_threshold" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"parameter" varchar(100) NOT NULL,
	"label" varchar(255) NOT NULL,
	"threshold" numeric(10, 4) NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "financial_ratio_threshold_parameter_unique" UNIQUE("parameter")
);
