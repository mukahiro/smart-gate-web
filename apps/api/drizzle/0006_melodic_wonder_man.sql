PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text NOT NULL,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text NOT NULL,
	`occurred_at` text NOT NULL,
	`changed_fields` text NOT NULL,
	`changes` text,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_audit_logs`("id", "actor_user_id", "action", "resource_type", "resource_id", "occurred_at", "changed_fields", "changes") SELECT "id", "actor_user_id", "action", 'user', "target_user_id", "occurred_at", "changed_fields", NULL FROM `admin_audit_logs`;--> statement-breakpoint
DROP TABLE `admin_audit_logs`;--> statement-breakpoint
ALTER TABLE `__new_audit_logs` RENAME TO `audit_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `audit_logs_occurred_at_id_index` ON `audit_logs` (`occurred_at`,`id`);--> statement-breakpoint
CREATE INDEX `audit_logs_resource_occurred_at_id_index` ON `audit_logs` (`resource_type`,`resource_id`,`occurred_at`,`id`);
