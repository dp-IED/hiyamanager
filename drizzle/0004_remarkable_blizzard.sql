ALTER TABLE `calls` ADD `generation_status` text;--> statement-breakpoint
ALTER TABLE `calls` ADD `generation_attempts` integer DEFAULT 0;