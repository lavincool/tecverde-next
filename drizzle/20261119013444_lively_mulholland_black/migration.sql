CREATE TABLE `adoption_request` (
	`id` text PRIMARY KEY,
	`pet_id` text NOT NULL,
	`full_name` text,
	`email` text,
	`phone` text,
	`campus_relationship` text NOT NULL,
	`housing_type` text NOT NULL,
	`has_other_pets` integer NOT NULL,
	`has_experience` integer NOT NULL,
	`motivation` text NOT NULL,
	`consent_at` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`email_verified_at` integer,
	`device_hash` text NOT NULL,
	`ip_hash` text NOT NULL,
	`handled_by_user_id` text,
	`staff_notes` text,
	`closed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_adoption_request_pet_id_pet_id_fk` FOREIGN KEY (`pet_id`) REFERENCES `pet`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_adoption_request_handled_by_user_id_user_id_fk` FOREIGN KEY (`handled_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT "adoption_request_status" CHECK("status" in ('pending', 'in_review', 'accepted', 'declined', 'withdrawn')),
	CONSTRAINT "adoption_request_relationship" CHECK("campus_relationship" in ('student', 'teacher', 'staff', 'external')),
	CONSTRAINT "adoption_request_housing" CHECK("housing_type" in ('house', 'apartment', 'other')),
	CONSTRAINT "adoption_request_motivation_length" CHECK(length("motivation") between 1 and 800)
);
--> statement-breakpoint
CREATE TABLE `pet` (
	`id` text PRIMARY KEY,
	`slug` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`species` text NOT NULL,
	`species_other` text,
	`sex` text NOT NULL,
	`age_group` text NOT NULL,
	`size` text NOT NULL,
	`temperament` text NOT NULL,
	`vaccinated` text DEFAULT 'unknown' NOT NULL,
	`sterilized` text DEFAULT 'unknown' NOT NULL,
	`dewormed` text DEFAULT 'unknown' NOT NULL,
	`health_notes` text,
	`building_id` text,
	`area_reference` text,
	`story` text NOT NULL,
	`status` text DEFAULT 'pending_approval' NOT NULL,
	`poster_name` text,
	`poster_email` text,
	`poster_phone` text,
	`poster_email_verified_at` integer,
	`consent_at` integer NOT NULL,
	`manage_token_hash` text NOT NULL UNIQUE,
	`device_hash` text NOT NULL,
	`ip_hash` text NOT NULL,
	`approved_by_user_id` text,
	`approved_at` integer,
	`rejection_reason` text,
	`adopted_at` integer,
	`success_story` text,
	`is_featured` integer DEFAULT false NOT NULL,
	`cover_media_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_pet_building_id_building_id_fk` FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_pet_approved_by_user_id_user_id_fk` FOREIGN KEY (`approved_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT "pet_species" CHECK("species" in ('dog', 'cat', 'other')),
	CONSTRAINT "pet_sex" CHECK("sex" in ('male', 'female', 'unknown')),
	CONSTRAINT "pet_age_group" CHECK("age_group" in ('puppy', 'young', 'adult', 'senior')),
	CONSTRAINT "pet_size" CHECK("size" in ('small', 'medium', 'large')),
	CONSTRAINT "pet_vaccinated" CHECK("vaccinated" in ('yes', 'no', 'unknown')),
	CONSTRAINT "pet_sterilized" CHECK("sterilized" in ('yes', 'no', 'unknown')),
	CONSTRAINT "pet_dewormed" CHECK("dewormed" in ('yes', 'no', 'unknown')),
	CONSTRAINT "pet_status" CHECK("status" in ('pending_approval', 'available', 'in_process', 'adopted', 'archived'))
);
--> statement-breakpoint
CREATE TABLE `pet_status_event` (
	`id` text PRIMARY KEY,
	`pet_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`actor_user_id` text,
	`note` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_pet_status_event_pet_id_pet_id_fk` FOREIGN KEY (`pet_id`) REFERENCES `pet`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_pet_status_event_actor_user_id_user_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT "pet_event_from_status" CHECK("from_status" in ('pending_approval', 'available', 'in_process', 'adopted', 'archived')),
	CONSTRAINT "pet_event_to_status" CHECK("to_status" in ('pending_approval', 'available', 'in_process', 'adopted', 'archived'))
);
--> statement-breakpoint
CREATE TABLE `account` (
	`id` text PRIMARY KEY,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL UNIQUE,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`impersonated_by` text,
	CONSTRAINT `fk_session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `two_factor` (
	`id` text PRIMARY KEY,
	`secret` text NOT NULL,
	`backup_codes` text NOT NULL,
	`user_id` text NOT NULL,
	`verified` integer DEFAULT true,
	`failed_verification_count` integer DEFAULT 0,
	`locked_until` integer,
	CONSTRAINT `fk_two_factor_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`role` text,
	`banned` integer DEFAULT false,
	`ban_reason` text,
	`ban_expires` integer,
	`two_factor_enabled` integer DEFAULT false
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text PRIMARY KEY,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `building` (
	`id` text PRIMARY KEY,
	`slug` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`short_name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE `report_category` (
	`id` text PRIMARY KEY,
	`slug` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`icon_key` text NOT NULL,
	`default_priority` text DEFAULT 'normal' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	CONSTRAINT "report_category_priority" CHECK("default_priority" in ('low', 'normal', 'high', 'urgent'))
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY,
	`bucket` text NOT NULL,
	`key` text NOT NULL UNIQUE,
	`kind` text NOT NULL,
	`draft_id` text NOT NULL,
	`report_id` text,
	`pet_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`width` integer NOT NULL,
	`height` integer NOT NULL,
	`dominant_color` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`device_hash` text,
	`uploaded_by_user_id` text,
	`created_at` integer NOT NULL,
	`attached_at` integer,
	CONSTRAINT `fk_media_report_id_report_id_fk` FOREIGN KEY (`report_id`) REFERENCES `report`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_media_pet_id_pet_id_fk` FOREIGN KEY (`pet_id`) REFERENCES `pet`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_media_uploaded_by_user_id_user_id_fk` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT "media_bucket" CHECK("bucket" in ('public', 'private')),
	CONSTRAINT "media_kind" CHECK("kind" in ('report_before', 'report_after', 'pet_gallery')),
	CONSTRAINT "media_status" CHECK("status" in ('pending', 'attached', 'deleted')),
	CONSTRAINT "media_single_owner" CHECK("report_id" is null or "pet_id" is null)
);
--> statement-breakpoint
CREATE TABLE `report` (
	`id` text PRIMARY KEY,
	`number` integer NOT NULL UNIQUE,
	`category_id` text NOT NULL,
	`building_id` text NOT NULL,
	`location_reference` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`priority` text NOT NULL,
	`assignee_user_id` text,
	`duplicate_of_report_id` text,
	`confirmations_count` integer DEFAULT 0 NOT NULL,
	`reporter_name` text,
	`reporter_email` text,
	`reporter_email_verified_at` integer,
	`device_hash` text NOT NULL,
	`ip_hash` text NOT NULL,
	`tracking_token_hash` text NOT NULL UNIQUE,
	`resolution_note` text,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT `fk_report_category_id_report_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `report_category`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_report_building_id_building_id_fk` FOREIGN KEY (`building_id`) REFERENCES `building`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_report_assignee_user_id_user_id_fk` FOREIGN KEY (`assignee_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT `fk_report_duplicate_of_report_id_report_id_fk` FOREIGN KEY (`duplicate_of_report_id`) REFERENCES `report`(`id`) ON DELETE SET NULL,
	CONSTRAINT "report_status" CHECK("status" in ('open', 'in_review', 'in_progress', 'resolved', 'dismissed', 'duplicate')),
	CONSTRAINT "report_priority" CHECK("priority" in ('low', 'normal', 'high', 'urgent')),
	CONSTRAINT "report_number_positive" CHECK("number" > 0),
	CONSTRAINT "report_confirmations_nonnegative" CHECK("confirmations_count" >= 0),
	CONSTRAINT "report_reference_length" CHECK(length("location_reference") between 1 and 120),
	CONSTRAINT "report_description_length" CHECK(length("description") between 1 and 500),
	CONSTRAINT "report_distinct_duplicate_target" CHECK("id" <> "duplicate_of_report_id")
);
--> statement-breakpoint
CREATE TABLE `report_comment` (
	`id` text PRIMARY KEY,
	`report_id` text NOT NULL,
	`author_user_id` text,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_report_comment_report_id_report_id_fk` FOREIGN KEY (`report_id`) REFERENCES `report`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_report_comment_author_user_id_user_id_fk` FOREIGN KEY (`author_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `report_confirmation` (
	`report_id` text NOT NULL,
	`device_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	CONSTRAINT `report_confirmation_pk` PRIMARY KEY(`report_id`, `device_hash`),
	CONSTRAINT `fk_report_confirmation_report_id_report_id_fk` FOREIGN KEY (`report_id`) REFERENCES `report`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `report_status_event` (
	`id` text PRIMARY KEY,
	`report_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`actor_user_id` text,
	`note` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_report_status_event_report_id_report_id_fk` FOREIGN KEY (`report_id`) REFERENCES `report`(`id`) ON DELETE CASCADE,
	CONSTRAINT `fk_report_status_event_actor_user_id_user_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT "report_event_from_status" CHECK("from_status" in ('open', 'in_review', 'in_progress', 'resolved', 'dismissed', 'duplicate')),
	CONSTRAINT "report_event_to_status" CHECK("to_status" in ('open', 'in_review', 'in_progress', 'resolved', 'dismissed', 'duplicate'))
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` text PRIMARY KEY,
	`actor_user_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_audit_log_actor_user_id_user_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE TABLE `staff_invite` (
	`id` text PRIMARY KEY,
	`email` text NOT NULL,
	`role` text NOT NULL,
	`token_hash` text NOT NULL UNIQUE,
	`invited_by_user_id` text,
	`expires_at` integer NOT NULL,
	`accepted_at` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_staff_invite_invited_by_user_id_user_id_fk` FOREIGN KEY (`invited_by_user_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT "staff_invite_role" CHECK("role" in ('admin', 'maintenance', 'moderator'))
);
--> statement-breakpoint
CREATE TABLE `action_token` (
	`id` text PRIMARY KEY,
	`purpose` text NOT NULL,
	`subject_id` text NOT NULL,
	`token_hash` text NOT NULL UNIQUE,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	CONSTRAINT "action_token_purpose" CHECK("purpose" in ('verify_pet_post', 'verify_adoption_request', 'verify_report_email'))
);
--> statement-breakpoint
CREATE INDEX `adoption_request_pet_status` ON `adoption_request` (`pet_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `adoption_request_active_email` ON `adoption_request` (`pet_id`,lower("email")) WHERE "adoption_request"."status" in ('pending', 'in_review', 'accepted');--> statement-breakpoint
CREATE INDEX `pet_status_created` ON `pet` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `pet_species_status` ON `pet` (`species`,`status`);--> statement-breakpoint
CREATE INDEX `pet_event_pet_created` ON `pet_status_event` (`pet_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `twoFactor_secret_idx` ON `two_factor` (`secret`);--> statement-breakpoint
CREATE INDEX `twoFactor_userId_idx` ON `two_factor` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE INDEX `media_status_created` ON `media` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `media_report` ON `media` (`report_id`);--> statement-breakpoint
CREATE INDEX `media_pet_order` ON `media` (`pet_id`,`sort_order`);--> statement-breakpoint
CREATE INDEX `media_draft` ON `media` (`draft_id`);--> statement-breakpoint
CREATE INDEX `report_status_created` ON `report` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `report_category_building_status` ON `report` (`category_id`,`building_id`,`status`);--> statement-breakpoint
CREATE INDEX `report_assignee_status` ON `report` (`assignee_user_id`,`status`);--> statement-breakpoint
CREATE INDEX `report_device_created` ON `report` (`device_hash`,`created_at`);--> statement-breakpoint
CREATE INDEX `report_comment_report_created` ON `report_comment` (`report_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `report_event_report_created` ON `report_status_event` (`report_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_log_entity` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `staff_invite_email` ON `staff_invite` (`email`);