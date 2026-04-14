ALTER TABLE `client_profile` ADD `state` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `must_change_password` boolean DEFAULT false NOT NULL;