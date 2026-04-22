CREATE TABLE "index_company" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"index_id" varchar(36) NOT NULL,
	"company_id" varchar(36) NOT NULL,
	"added_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "index_master" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(1000),
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "index_master_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "index_company" ADD CONSTRAINT "index_company_index_id_index_master_id_fk" FOREIGN KEY ("index_id") REFERENCES "public"."index_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "index_company" ADD CONSTRAINT "index_company_company_id_company_master_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."company_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "index_company_index_idx" ON "index_company" USING btree ("index_id");--> statement-breakpoint
CREATE INDEX "index_company_company_idx" ON "index_company" USING btree ("company_id");