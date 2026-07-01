-- Post-migration SQL — CHECK constraints + partial/GIN indexes for Hotel Core.
-- Source of truth: comments at end of prisma/schema.prisma (spec §2 DDL).
-- Applied after 20260701111952_init_hotel_core.

-- ============================================================================
-- CHECK constraints (enforce enum values + numeric ranges at DB layer).
-- ============================================================================

ALTER TABLE departments
  ADD CONSTRAINT departments_code_check
  CHECK (code ~ '^[A-Z]{2,8}$');

ALTER TABLE guests
  ADD CONSTRAINT guests_privacy_mode_check
  CHECK (privacy_mode IN ('standard','vvip'));

ALTER TABLE guests
  ADD CONSTRAINT guests_vip_level_check
  CHECK (vip_level IS NULL OR vip_level IN ('silver','gold','platinum'));

ALTER TABLE visits
  ADD CONSTRAINT visits_status_check
  CHECK (status IN ('pending_verification','checked_in','checked_out','rejected','failed_verification','cancelled'));

ALTER TABLE visits
  ADD CONSTRAINT visits_nights_check
  CHECK (nights IS NULL OR (nights >= 1 AND nights <= 30));

ALTER TABLE visits
  ADD CONSTRAINT visits_satisfaction_check
  CHECK (satisfaction_score IS NULL OR (satisfaction_score BETWEEN 1 AND 5));

ALTER TABLE visits
  ADD CONSTRAINT visits_booking_source_check
  CHECK (booking_source IS NULL OR booking_source IN ('ota_email','direct','walk-in','pms'));

ALTER TABLE tickets
  ADD CONSTRAINT tickets_status_check
  CHECK (status IN ('open','in_progress','awaiting_late_reason','done_pending','closed','high_alert','escalated','cancelled'));

ALTER TABLE tickets
  ADD CONSTRAINT tickets_priority_check
  CHECK (priority IN ('low','normal','high','urgent'));

ALTER TABLE tickets
  ADD CONSTRAINT tickets_complaint_type_check
  CHECK (complaint_type IS NULL OR complaint_type IN ('staff_attitude','facility','fnb','general','vvip'));

ALTER TABLE tickets
  ADD CONSTRAINT tickets_satisfaction_check
  CHECK (resolved_satisfaction IS NULL OR (resolved_satisfaction BETWEEN 1 AND 5));

ALTER TABLE ticket_updates
  ADD CONSTRAINT ticket_updates_type_check
  CHECK (type IN ('status_change','reroute','assignment','escalation','note','handover','system'));

ALTER TABLE ticket_messages
  ADD CONSTRAINT ticket_messages_sender_check
  CHECK (sender IN ('guest','staff','ai','system'));

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('ticket_created','ticket_escalated','ticket_assigned','message_new','high_alert','verification_pending','verification_failed_3x','billing_threshold','system'));

ALTER TABLE menu_items
  ADD CONSTRAINT menu_items_price_check
  CHECK (price_idr >= 0);

ALTER TABLE menu_items
  ADD CONSTRAINT menu_items_prep_check
  CHECK (prep_minutes IS NULL OR prep_minutes >= 0);

ALTER TABLE wa_templates
  ADD CONSTRAINT wa_templates_status_check
  CHECK (status IN ('pending','approved','rejected','archived'));

ALTER TABLE wa_templates
  ADD CONSTRAINT wa_templates_scope_check
  CHECK ((is_global = true AND hotel_id IS NULL) OR (is_global = false AND hotel_id IS NOT NULL));

ALTER TABLE billing_invoices
  ADD CONSTRAINT billing_invoices_status_check
  CHECK (status IN ('issued','paid','overdue','void'));

-- ============================================================================
-- Partial / GIN indexes (Prisma's `where:` on @@index is limited — raw SQL).
-- ============================================================================

CREATE INDEX idx_guests_hotel_vip
  ON guests(hotel_id, is_vip)
  WHERE is_vip = true;

CREATE INDEX idx_visits_pending
  ON visits(hotel_id, created_at DESC)
  WHERE status = 'pending_verification';

CREATE INDEX idx_visits_failed
  ON visits(hotel_id, created_at DESC)
  WHERE status = 'failed_verification';

CREATE INDEX idx_tickets_overdue
  ON tickets(hotel_id, sla_due_at)
  WHERE is_overdue = true OR sla_due_at IS NOT NULL;

CREATE INDEX idx_tickets_high_alert
  ON tickets(hotel_id, created_at DESC)
  WHERE is_high_alert = true;

CREATE INDEX idx_tickets_open
  ON tickets(hotel_id, status)
  WHERE status NOT IN ('closed','cancelled');

CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE is_read = false;

CREATE INDEX idx_ticket_messages_conversation
  ON ticket_messages(conversation_id)
  WHERE conversation_id IS NOT NULL;

CREATE INDEX idx_knowledge_tags
  ON knowledge_entries
  USING GIN(tags);

CREATE INDEX idx_knowledge_search
  ON knowledge_entries
  USING GIN(to_tsvector('english', title || ' ' || content));

CREATE INDEX idx_wa_templates_global
  ON wa_templates(is_global)
  WHERE is_global = true;
