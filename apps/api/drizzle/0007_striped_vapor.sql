CREATE TABLE `attendance_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`starts_at` text NOT NULL,
	`ends_at` text NOT NULL,
	`created_by_user_id` text NOT NULL,
	`cancelled_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "attendance_sessions_title_length_check" CHECK(length("attendance_sessions"."title") BETWEEN 1 AND 100),
	CONSTRAINT "attendance_sessions_period_check" CHECK("attendance_sessions"."starts_at" < "attendance_sessions"."ends_at")
);
--> statement-breakpoint
CREATE INDEX `attendance_sessions_starts_at_index` ON `attendance_sessions` (`starts_at`);