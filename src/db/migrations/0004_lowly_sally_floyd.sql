ALTER TABLE `client_profile` ADD `username` varchar(30) NOT NULL;--> statement-breakpoint
ALTER TABLE `client_profile` ADD `phone` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `client_profile` ADD `phone_verified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `client_profile` ADD CONSTRAINT `client_profile_username_unique` UNIQUE(`username`);--> statement-breakpoint
ALTER TABLE `client_profile` ADD CONSTRAINT `client_profile_phone_unique` UNIQUE(`phone`);