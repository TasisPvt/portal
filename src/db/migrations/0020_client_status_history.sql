CREATE TYPE "public"."client_status_action" AS ENUM('activated', 'deactivated');--> statement-breakpoint
CREATE TABLE "client_status_history" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"client_id" varchar(36) NOT NULL,
	"action" "client_status_action" NOT NULL,
	"reason" text NOT NULL,
	"performed_by_id" varchar(36),
	"performed_by_name" varchar(255) NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_status_history" ADD CONSTRAINT "client_status_history_client_id_user_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_status_history" ADD CONSTRAINT "client_status_history_performed_by_id_user_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_status_history_client_idx" ON "client_status_history" USING btree ("client_id");