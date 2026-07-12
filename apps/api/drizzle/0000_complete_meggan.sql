CREATE TABLE `attendance_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`device_id` text NOT NULL,
	`method` text NOT NULL,
	`event_type` text NOT NULL,
	`authenticated_at` text NOT NULL,
	`received_at` text NOT NULL,
	`confidence` real
);
--> statement-breakpoint
CREATE INDEX `attendance_events_person_authenticated_at_index` ON `attendance_events` (`person_id`,`authenticated_at`);