CREATE TABLE `client_profile` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`aadhar_number` varchar(12) NOT NULL,
	`pan_number` varchar(10) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `client_profile_id` PRIMARY KEY(`id`),
	CONSTRAINT `client_profile_user_id_unique` UNIQUE(`user_id`),
	CONSTRAINT `client_profile_aadhar_number_unique` UNIQUE(`aadhar_number`),
	CONSTRAINT `client_profile_pan_number_unique` UNIQUE(`pan_number`)
);
--> statement-breakpoint
ALTER TABLE `user` ADD `user_type` enum('client','admin') DEFAULT 'client' NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `admin_role` enum('super_admin','admin','manager','support');--> statement-breakpoint
ALTER TABLE `client_profile` ADD CONSTRAINT `client_profile_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;