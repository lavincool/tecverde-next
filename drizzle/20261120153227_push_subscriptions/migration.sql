CREATE TABLE `push_subscription` (
	`id` text PRIMARY KEY,
	`endpoint` text NOT NULL UNIQUE,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`user_id` text,
	`device_hash` text,
	`topics` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_push_subscription_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE INDEX `push_subscription_device` ON `push_subscription` (`device_hash`);--> statement-breakpoint
CREATE INDEX `push_subscription_user` ON `push_subscription` (`user_id`);