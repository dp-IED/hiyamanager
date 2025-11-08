-- Remove Vapi references and add ElevenLabs support
DROP TABLE IF EXISTS `vapi_call_mappings`;--> statement-breakpoint
ALTER TABLE `agents` DROP COLUMN `vapi_assistant_id`;--> statement-breakpoint
ALTER TABLE `calls` DROP COLUMN `vapi_call_id`;--> statement-breakpoint
ALTER TABLE `calls` ADD `elevenlabs_conversation_id` text;

