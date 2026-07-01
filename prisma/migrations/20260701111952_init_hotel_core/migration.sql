-- CreateTable
CREATE TABLE "hotels" (
    "id" UUID NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "code" VARCHAR(8) NOT NULL,
    "operating_hours" JSONB NOT NULL DEFAULT '{}',
    "escalation_chain" JSONB NOT NULL DEFAULT '{}',
    "telegram_chat_id" VARCHAR(64),
    "supervisor_telegram_id" VARCHAR(64),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "wa_phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "privacy_mode" VARCHAR(20) NOT NULL DEFAULT 'standard',
    "is_vip" BOOLEAN NOT NULL DEFAULT false,
    "vip_level" VARCHAR(20),
    "total_stays" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_preferences" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "preference_type" VARCHAR(40) NOT NULL,
    "preference_value" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "guest_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "guest_id" UUID NOT NULL,
    "check_in" TIMESTAMPTZ NOT NULL,
    "check_out" TIMESTAMPTZ,
    "nights" INTEGER,
    "room_number" VARCHAR(16),
    "status" VARCHAR(30) NOT NULL DEFAULT 'pending_verification',
    "booking_source" VARCHAR(20),
    "verification_attempts" INTEGER NOT NULL DEFAULT 0,
    "special_request" TEXT,
    "satisfaction_score" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "ticket_number" VARCHAR(32) NOT NULL,
    "guest_id" UUID NOT NULL,
    "department_id" UUID NOT NULL,
    "assigned_user_id" UUID,
    "created_by" UUID,
    "status" VARCHAR(30) NOT NULL DEFAULT 'open',
    "priority" VARCHAR(10) NOT NULL DEFAULT 'normal',
    "complaint_type" VARCHAR(30),
    "complaint_detail" TEXT,
    "subject" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "is_high_alert" BOOLEAN NOT NULL DEFAULT false,
    "is_overdue" BOOLEAN NOT NULL DEFAULT false,
    "resolved_satisfaction" INTEGER,
    "sla_due_at" TIMESTAMPTZ,
    "closed_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_updates" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "type" VARCHAR(40) NOT NULL,
    "from_status" VARCHAR(30),
    "to_status" VARCHAR(30),
    "from_department_id" UUID,
    "to_department_id" UUID,
    "note" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "conversation_id" UUID,
    "sender" VARCHAR(20) NOT NULL,
    "sender_user_id" UUID,
    "body" TEXT,
    "media" JSONB,
    "external_id" VARCHAR(80),
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMPTZ,
    "read_at" TIMESTAMPTZ,

    CONSTRAINT "ticket_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "body" TEXT,
    "link" VARCHAR(500),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_categories" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "menu_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_items" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "price_idr" DECIMAL(12,2) NOT NULL,
    "image_url" VARCHAR(500),
    "prep_minutes" INTEGER,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "available_window_from" TIME,
    "available_window_to" TIME,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_entries" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content" TEXT NOT NULL,
    "category" VARCHAR(80),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "knowledge_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wa_templates" (
    "id" UUID NOT NULL,
    "hotel_id" UUID,
    "name" VARCHAR(80) NOT NULL,
    "body" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "language" VARCHAR(8) NOT NULL DEFAULT 'id',
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "template_id_meta" VARCHAR(80),
    "rejection_reason" TEXT,
    "is_global" BOOLEAN NOT NULL DEFAULT false,
    "approved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "wa_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "flag" VARCHAR(80) NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ NOT NULL,
    "updated_by" UUID,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_quotas" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "outbound_quota_total" INTEGER NOT NULL,
    "outbound_used" INTEGER NOT NULL DEFAULT 0,
    "threshold_80_emitted_at" TIMESTAMPTZ,
    "threshold_100_emitted_at" TIMESTAMPTZ,
    "reset_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "billing_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_invoices" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "invoice_number" VARCHAR(40) NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "amount_idr" DECIMAL(14,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'issued',
    "pdf_url" VARCHAR(500),
    "issued_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_extras" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "qty" INTEGER NOT NULL,
    "amount_idr" DECIMAL(14,2) NOT NULL,
    "purchased_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,

    CONSTRAINT "billing_extras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_agent_configs" (
    "id" UUID NOT NULL,
    "hotel_id" UUID NOT NULL,
    "agent_type" VARCHAR(40) NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "capacity" INTEGER NOT NULL DEFAULT 1,
    "config" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ai_agent_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_configs" (
    "hotel_id" UUID NOT NULL,
    "pbx_type" VARCHAR(40),
    "config" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "voice_configs_pkey" PRIMARY KEY ("hotel_id")
);

-- CreateIndex
CREATE INDEX "departments_hotel_id_idx" ON "departments"("hotel_id");

-- CreateIndex
CREATE INDEX "departments_hotel_id_is_active_idx" ON "departments"("hotel_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "departments_hotel_code_unique" ON "departments"("hotel_id", "code");

-- CreateIndex
CREATE INDEX "guests_hotel_id_idx" ON "guests"("hotel_id");

-- CreateIndex
CREATE INDEX "guests_hotel_id_wa_phone_idx" ON "guests"("hotel_id", "wa_phone");

-- CreateIndex
CREATE INDEX "guests_hotel_id_is_vip_idx" ON "guests"("hotel_id", "is_vip");

-- CreateIndex
CREATE INDEX "guests_hotel_id_created_at_idx" ON "guests"("hotel_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "guests_hotel_wa_unique" ON "guests"("hotel_id", "wa_phone");

-- CreateIndex
CREATE INDEX "guest_preferences_hotel_id_idx" ON "guest_preferences"("hotel_id");

-- CreateIndex
CREATE INDEX "guest_preferences_guest_id_idx" ON "guest_preferences"("guest_id");

-- CreateIndex
CREATE UNIQUE INDEX "guest_preferences_unique" ON "guest_preferences"("guest_id", "preference_type");

-- CreateIndex
CREATE INDEX "visits_hotel_id_idx" ON "visits"("hotel_id");

-- CreateIndex
CREATE INDEX "visits_hotel_id_status_idx" ON "visits"("hotel_id", "status");

-- CreateIndex
CREATE INDEX "visits_guest_id_check_in_idx" ON "visits"("guest_id", "check_in" DESC);

-- CreateIndex
CREATE INDEX "visits_hotel_id_check_in_idx" ON "visits"("hotel_id", "check_in" DESC);

-- CreateIndex
CREATE INDEX "tickets_hotel_id_idx" ON "tickets"("hotel_id");

-- CreateIndex
CREATE INDEX "tickets_hotel_id_created_at_idx" ON "tickets"("hotel_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tickets_hotel_id_status_department_id_idx" ON "tickets"("hotel_id", "status", "department_id");

-- CreateIndex
CREATE INDEX "tickets_department_id_status_idx" ON "tickets"("department_id", "status");

-- CreateIndex
CREATE INDEX "tickets_guest_id_created_at_idx" ON "tickets"("guest_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "tickets_assigned_user_id_idx" ON "tickets"("assigned_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_hotel_ticket_number_unique" ON "tickets"("hotel_id", "ticket_number");

-- CreateIndex
CREATE INDEX "ticket_updates_hotel_id_idx" ON "ticket_updates"("hotel_id");

-- CreateIndex
CREATE INDEX "ticket_updates_ticket_id_created_at_idx" ON "ticket_updates"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "ticket_messages_hotel_id_idx" ON "ticket_messages"("hotel_id");

-- CreateIndex
CREATE INDEX "ticket_messages_ticket_id_sent_at_idx" ON "ticket_messages"("ticket_id", "sent_at");

-- CreateIndex
CREATE INDEX "ticket_messages_conversation_id_idx" ON "ticket_messages"("conversation_id");

-- CreateIndex
CREATE INDEX "notifications_hotel_id_idx" ON "notifications"("hotel_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "menu_categories_hotel_id_idx" ON "menu_categories"("hotel_id");

-- CreateIndex
CREATE UNIQUE INDEX "menu_categories_hotel_name_unique" ON "menu_categories"("hotel_id", "name");

-- CreateIndex
CREATE INDEX "menu_items_hotel_id_idx" ON "menu_items"("hotel_id");

-- CreateIndex
CREATE INDEX "menu_items_category_id_idx" ON "menu_items"("category_id");

-- CreateIndex
CREATE INDEX "menu_items_hotel_id_is_available_idx" ON "menu_items"("hotel_id", "is_available");

-- CreateIndex
CREATE INDEX "knowledge_entries_hotel_id_idx" ON "knowledge_entries"("hotel_id");

-- CreateIndex
CREATE INDEX "knowledge_entries_hotel_id_is_active_idx" ON "knowledge_entries"("hotel_id", "is_active");

-- CreateIndex
CREATE INDEX "wa_templates_hotel_id_idx" ON "wa_templates"("hotel_id");

-- CreateIndex
CREATE INDEX "wa_templates_hotel_id_status_idx" ON "wa_templates"("hotel_id", "status");

-- CreateIndex
CREATE INDEX "feature_flags_hotel_id_idx" ON "feature_flags"("hotel_id");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_hotel_flag_unique" ON "feature_flags"("hotel_id", "flag");

-- CreateIndex
CREATE INDEX "billing_quotas_hotel_id_idx" ON "billing_quotas"("hotel_id");

-- CreateIndex
CREATE INDEX "billing_quotas_hotel_id_period_start_idx" ON "billing_quotas"("hotel_id", "period_start" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "billing_quotas_hotel_period_unique" ON "billing_quotas"("hotel_id", "period_start");

-- CreateIndex
CREATE INDEX "billing_invoices_hotel_id_issued_at_idx" ON "billing_invoices"("hotel_id", "issued_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "billing_invoices_number_unique" ON "billing_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "billing_extras_hotel_id_purchased_at_idx" ON "billing_extras"("hotel_id", "purchased_at" DESC);

-- CreateIndex
CREATE INDEX "ai_agent_configs_hotel_id_idx" ON "ai_agent_configs"("hotel_id");

-- CreateIndex
CREATE INDEX "ai_agent_configs_hotel_id_is_active_idx" ON "ai_agent_configs"("hotel_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "ai_agent_configs_hotel_type_unique" ON "ai_agent_configs"("hotel_id", "agent_type");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guests" ADD CONSTRAINT "guests_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_preferences" ADD CONSTRAINT "guest_preferences_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_preferences" ADD CONSTRAINT "guest_preferences_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_updates" ADD CONSTRAINT "ticket_updates_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_updates" ADD CONSTRAINT "ticket_updates_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_updates" ADD CONSTRAINT "ticket_updates_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_categories" ADD CONSTRAINT "menu_categories_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "menu_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_entries" ADD CONSTRAINT "knowledge_entries_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wa_templates" ADD CONSTRAINT "wa_templates_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_quotas" ADD CONSTRAINT "billing_quotas_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_extras" ADD CONSTRAINT "billing_extras_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_agent_configs" ADD CONSTRAINT "ai_agent_configs_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_configs" ADD CONSTRAINT "voice_configs_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
