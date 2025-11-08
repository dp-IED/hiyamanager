CREATE TABLE `call_conversation_turns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`call_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`turn_order` integer NOT NULL,
	`estimated_duration` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`call_id`) REFERENCES `calls`(`id`) ON UPDATE no action ON DELETE no action
);
