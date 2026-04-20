CREATE TYPE "public"."admin_role" AS ENUM('super_admin', 'admin', 'manager');--> statement-breakpoint
CREATE TYPE "public"."user_type" AS ENUM('client', 'admin');--> statement-breakpoint
CREATE TABLE "account" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp (3),
	"refresh_token_expires_at" timestamp (3),
	"scope" text,
	"password" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_profile" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"user_id" varchar(36) NOT NULL,
	"username" varchar(30) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"phone_verified" boolean DEFAULT false NOT NULL,
	"aadhar_number" varchar(12) NOT NULL,
	"pan_number" varchar(10) NOT NULL,
	"state" varchar(100) NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "client_profile_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "client_profile_username_unique" UNIQUE("username"),
	CONSTRAINT "client_profile_phone_unique" UNIQUE("phone"),
	CONSTRAINT "client_profile_aadhar_number_unique" UNIQUE("aadhar_number"),
	CONSTRAINT "client_profile_pan_number_unique" UNIQUE("pan_number")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"expires_at" timestamp (3) NOT NULL,
	"token" varchar(255) NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" varchar(36) NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	"user_type" "user_type" DEFAULT 'client' NOT NULL,
	"admin_role" "admin_role",
	"must_change_password" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"identifier" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp (3) NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_master" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"prowess_id" varchar(100) NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"isin_code" varchar(20) NOT NULL,
	"bse_scrip_code" varchar(20),
	"bse_scrip_id" varchar(50),
	"bse_group" varchar(50),
	"nse_symbol" varchar(50),
	"service_group" varchar(100) NOT NULL,
	"nse_listing_date" date,
	"nse_delisting_date" date,
	"bse_listing_date" date,
	"bse_delisting_date" date,
	"industry_group_id" varchar(36),
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "company_master_prowess_id_unique" UNIQUE("prowess_id"),
	CONSTRAINT "company_master_isin_code_unique" UNIQUE("isin_code")
);
--> statement-breakpoint
CREATE TABLE "industry_group" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL,
	CONSTRAINT "industry_group_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_profile" ADD CONSTRAINT "client_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_master" ADD CONSTRAINT "company_master_industry_group_id_industry_group_id_fk" FOREIGN KEY ("industry_group_id") REFERENCES "public"."industry_group"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "company_master_industry_group_idx" ON "company_master" USING btree ("industry_group_id");--> statement-breakpoint
CREATE INDEX "company_master_prowess_id_idx" ON "company_master" USING btree ("prowess_id");--> statement-breakpoint
CREATE INDEX "company_master_isin_idx" ON "company_master" USING btree ("isin_code");