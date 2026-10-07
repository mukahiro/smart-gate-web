PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`student_number` text,
	`name` text NOT NULL,
	`lcd_display_name` text NOT NULL,
	`email` text NOT NULL,
	`email_normalized` text NOT NULL,
	`user_type` text DEFAULT 'student' NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`face_image_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "users_student_number_format_check" CHECK(("__new_users"."user_type" = 'teacher' AND "__new_users"."student_number" IS NULL) OR ("__new_users"."student_number" IS NOT NULL AND length("__new_users"."student_number") = 10 AND "__new_users"."student_number" NOT GLOB '*[^0-9]*')),
	CONSTRAINT "users_lcd_display_name_length_check" CHECK(length("__new_users"."lcd_display_name") BETWEEN 1 AND 20),
	CONSTRAINT "users_user_type_check" CHECK("__new_users"."user_type" IN ('student', 'teacher')),
	CONSTRAINT "users_face_image_count_check" CHECK("__new_users"."face_image_count" BETWEEN 0 AND 10)
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "student_number", "name", "lcd_display_name", "email", "email_normalized", "user_type", "is_admin", "is_active", "face_image_count", "created_at", "updated_at") SELECT "id", "student_number", "name", "lcd_display_name", "email", "email_normalized", 'student', CASE WHEN "role" = 'admin' THEN 1 ELSE 0 END, "is_active", "face_image_count", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_student_number_unique` ON `users` (`student_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_normalized_unique` ON `users` (`email_normalized`);
