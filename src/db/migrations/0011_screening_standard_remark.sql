DROP TABLE IF EXISTS "tasis_screening_standard";
--> statement-breakpoint
CREATE TABLE "screening_standard_remark" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"parameter" varchar(50) NOT NULL,
	"pass_remark" varchar(2000),
	"fail_remark" varchar(2000),
	"created_at" timestamp(3) DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) DEFAULT now() NOT NULL,
	CONSTRAINT "screening_standard_remark_parameter_unique" UNIQUE("parameter")
);
