ALTER TABLE `agendamentos` ADD `google_calendar_event_id` varchar(255);--> statement-breakpoint
ALTER TABLE `agendamentos` ADD `google_calendar_synced_at` timestamp;--> statement-breakpoint
ALTER TABLE `agendamentos` ADD `google_calendar_sync_error` text;--> statement-breakpoint
ALTER TABLE `users` ADD `google_calendar_refresh_token` text;--> statement-breakpoint
ALTER TABLE `users` ADD `google_calendar_connected_at` timestamp;