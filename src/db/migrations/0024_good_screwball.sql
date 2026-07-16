CREATE TABLE "otp_request" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"purpose" varchar(32) NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "otp_request_email_created_idx" ON "otp_request" USING btree ("email","created_at");