CREATE TABLE `counters` (
	`object` text PRIMARY KEY NOT NULL,
	`n` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`file_name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`data` text NOT NULL,
	`user_name` text,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `files_record_idx` ON `files` (`record_id`);--> statement-breakpoint
CREATE TABLE `history` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`object` text NOT NULL,
	`field` text NOT NULL,
	`old_value` text,
	`new_value` text,
	`user_id` text,
	`user_name` text,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `history_record_idx` ON `history` (`record_id`,`at`);--> statement-breakpoint
CREATE TABLE `meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`record_id` text NOT NULL,
	`kind` text DEFAULT 'note' NOT NULL,
	`title` text,
	`body` text,
	`user_id` text,
	`user_name` text,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `notes_record_idx` ON `notes` (`record_id`,`at`);--> statement-breakpoint
CREATE TABLE `prefs` (
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `prefs_user_key_idx` ON `prefs` (`user_id`,`key`);--> statement-breakpoint
CREATE TABLE `records` (
	`id` text PRIMARY KEY NOT NULL,
	`object` text NOT NULL,
	`name` text NOT NULL,
	`status` text,
	`owner_id` text,
	`parent_id` text,
	`approval_id` text,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	`created_by` text,
	`updated_at` text NOT NULL,
	`updated_by` text
);
--> statement-breakpoint
CREATE INDEX `records_object_idx` ON `records` (`object`,`name`);--> statement-breakpoint
CREATE INDEX `records_parent_idx` ON `records` (`parent_id`);--> statement-breakpoint
CREATE INDEX `records_approval_idx` ON `records` (`approval_id`,`object`);--> statement-breakpoint
CREATE INDEX `records_owner_idx` ON `records` (`owner_id`,`object`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'officer' NOT NULL,
	`email` text,
	`status` text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);