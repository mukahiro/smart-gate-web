CREATE TABLE `admin_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text NOT NULL,
	`action` text NOT NULL,
	`target_user_id` text NOT NULL,
	`occurred_at` text NOT NULL,
	`changed_fields` text NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`target_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `admin_audit_logs_occurred_at_id_index` ON `admin_audit_logs` (`occurred_at`,`id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`student_number` text NOT NULL,
	`name` text NOT NULL,
	`lcd_display_name` text NOT NULL,
	`email` text NOT NULL,
	`email_normalized` text NOT NULL,
	`role` text DEFAULT 'member' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "users_student_number_format_check" CHECK(length("__new_users"."student_number") = 10 AND "__new_users"."student_number" NOT GLOB '*[^0-9]*'),
	CONSTRAINT "users_lcd_display_name_length_check" CHECK(length("__new_users"."lcd_display_name") BETWEEN 1 AND 20),
	CONSTRAINT "users_role_check" CHECK("__new_users"."role" IN ('member', 'admin'))
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "student_number", "name", "lcd_display_name", "email", "email_normalized", "role", "is_active", "created_at", "updated_at") SELECT "id", "student_number", "name", "lcd_display_name", "email", "email_normalized", 'member', "is_active", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_student_number_unique` ON `users` (`student_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_normalized_unique` ON `users` (`email_normalized`);
