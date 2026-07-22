CREATE TABLE "ticket" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"client_id" varchar(36) NOT NULL,
	"subscription_id" varchar(36),
	"subject" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"status" varchar(20) DEFAULT 'open' NOT NULL,
	"allow_client_replies" boolean DEFAULT false NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_message" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"ticket_id" varchar(36) NOT NULL,
	"sender_id" varchar(36),
	"sender_role" varchar(10) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_client_id_user_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_subscription_id_subscription_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscription"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_ticket_id_ticket_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_message" ADD CONSTRAINT "ticket_message_sender_id_user_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ticket_client_idx" ON "ticket" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "ticket_status_idx" ON "ticket" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ticket_message_ticket_idx" ON "ticket_message" USING btree ("ticket_id");