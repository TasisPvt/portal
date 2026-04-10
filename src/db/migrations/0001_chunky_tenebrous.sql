ALTER TABLE `account` MODIFY COLUMN `access_token_expires_at` datetime(3);--> statement-breakpoint
ALTER TABLE `account` MODIFY COLUMN `refresh_token_expires_at` datetime(3);--> statement-breakpoint
ALTER TABLE `account` MODIFY COLUMN `updated_at` timestamp(3) NOT NULL DEFAULT (now());