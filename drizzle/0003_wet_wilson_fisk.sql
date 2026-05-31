CREATE INDEX "idx_attendees_reg_id" ON "event_attendees" USING btree ("registration_id");--> statement-breakpoint
CREATE INDEX "idx_notice_items_event_id" ON "event_notice_items" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_items_event_id" ON "event_purchase_items" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_erpi_reg_id" ON "event_registration_purchase_items" USING btree ("registration_id");--> statement-breakpoint
CREATE INDEX "idx_erpi_item_id" ON "event_registration_purchase_items" USING btree ("purchase_item_id");--> statement-breakpoint
CREATE INDEX "idx_reg_event_id" ON "event_registrations" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_reg_reg_key" ON "event_registrations" USING btree ("registration_key");--> statement-breakpoint
CREATE INDEX "idx_events_team_id" ON "events" USING btree ("team_id");