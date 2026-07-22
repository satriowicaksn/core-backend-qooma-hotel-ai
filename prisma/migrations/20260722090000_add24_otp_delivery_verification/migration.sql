-- ADD-24: OTP delivery verification. A 2-digit code (00–99) is generated at
-- ticket creation for guest-present hand-over tickets, sent to the guest in
-- the WA acknowledgment, and verified server-side when staff replies the code
-- in the dept Telegram group. The code NEVER appears in any public /api
-- response or log line — internal RPC only. Grace-close (no code within
-- otp_grace_minutes after DONE) closes the ticket flagged, never high alert.

-- AlterTable: ADD-24 ticket columns
ALTER TABLE "tickets"
  ADD COLUMN "requires_otp" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "otp_code" VARCHAR(2),
  ADD COLUMN "otp_delivered_at" TIMESTAMPTZ,
  ADD COLUMN "telegram_message_id" BIGINT,
  ADD COLUMN "otp_generated_at" TIMESTAMPTZ,
  ADD COLUMN "otp_verified" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "otp_verified_at" TIMESTAMPTZ,
  ADD COLUMN "otp_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "otp_resend_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "otp_skipped" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "otp_skip_flagged" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "otp_skip_reason" VARCHAR(20),
  ADD COLUMN "review_status" VARCHAR(20) NOT NULL DEFAULT 'none',
  ADD COLUMN "review_outcome" VARCHAR(20),
  ADD COLUMN "reviewed_by" VARCHAR(255),
  ADD COLUMN "reviewed_at" TIMESTAMPTZ,
  ADD COLUMN "confirmed_by_guest" BOOLEAN,
  ADD COLUMN "confirmed_at" TIMESTAMPTZ,
  ADD COLUMN "channel" VARCHAR(10) NOT NULL DEFAULT 'wa';

-- CHECK constraints (string-varchar enums, mirroring tickets_status_check)
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_otp_skip_reason_check"
  CHECK (otp_skip_reason IS NULL OR otp_skip_reason IN ('grace_timeout','guest_declined','wrong_code_3x','other'));
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_review_status_check"
  CHECK (review_status IN ('none','pending_supervisor','reviewed'));
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_review_outcome_check"
  CHECK (review_outcome IS NULL OR review_outcome IN ('staff_fault','wrong_dept','guest_unreasonable','other'));
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_channel_check"
  CHECK (channel IN ('wa','voice'));

-- Partial indexes: supervisor review queue + complaint-window lookup +
-- Telegram reply→ticket resolution
CREATE INDEX "idx_tickets_pending_review" ON "tickets"("hotel_id", "review_status")
  WHERE review_status = 'pending_supervisor';
CREATE INDEX "idx_tickets_otp_skipped" ON "tickets"("hotel_id", "otp_skipped", "closed_at")
  WHERE otp_skipped = true;
CREATE INDEX "idx_tickets_telegram_message" ON "tickets"("hotel_id", "telegram_message_id")
  WHERE telegram_message_id IS NOT NULL;

-- CreateTable: per-hotel OTP settings (absent row = defaults)
CREATE TABLE "hotel_otp_settings" (
  "hotel_id" UUID NOT NULL,
  "otp_grace_minutes" INTEGER NOT NULL DEFAULT 10,
  "otp_complaint_window" INTEGER NOT NULL DEFAULT 180,
  "otp_enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL,

  CONSTRAINT "hotel_otp_settings_pkey" PRIMARY KEY ("hotel_id")
);

-- AddForeignKey
ALTER TABLE "hotel_otp_settings" ADD CONSTRAINT "hotel_otp_settings_hotel_id_fkey"
  FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
