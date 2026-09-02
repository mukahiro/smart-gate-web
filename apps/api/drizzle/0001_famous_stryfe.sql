ALTER TABLE `attendance_events` RENAME COLUMN "person_id" TO "student_number_snapshot";--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`idle_expires_at` text NOT NULL,
	`absolute_expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_index` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_idle_expires_at_index` ON `sessions` (`idle_expires_at`);--> statement-breakpoint
CREATE TABLE `user_credentials` (
	`user_id` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`failed_login_count` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`password_changed_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "user_credentials_failed_login_count_check" CHECK("user_credentials"."failed_login_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`student_number` text NOT NULL,
	`name` text NOT NULL,
	`lcd_display_name` text NOT NULL,
	`email` text NOT NULL,
	`email_normalized` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "users_student_number_format_check" CHECK(length("users"."student_number") = 10 AND "users"."student_number" NOT GLOB '*[^0-9]*'),
	CONSTRAINT "users_lcd_display_name_length_check" CHECK(length("users"."lcd_display_name") BETWEEN 1 AND 20)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_student_number_unique` ON `users` (`student_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_normalized_unique` ON `users` (`email_normalized`);--> statement-breakpoint
DROP INDEX `attendance_events_person_authenticated_at_index`;--> statement-breakpoint
ALTER TABLE `attendance_events` ADD `user_id` text REFERENCES users(id);--> statement-breakpoint
CREATE INDEX `attendance_events_student_number_authenticated_at_index` ON `attendance_events` (`student_number_snapshot`,`authenticated_at`);--> statement-breakpoint
CREATE INDEX `attendance_events_user_authenticated_at_index` ON `attendance_events` (`user_id`,`authenticated_at`);