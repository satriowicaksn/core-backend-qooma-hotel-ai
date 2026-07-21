-- ADD-25: outbound quota reshaped from a monthly per-tier allotment to a
-- prepaid top-up balance per hotel. One row per hotel, metered down from
-- `outbound_balance_used` against `outbound_balance_total`, no monthly reset.
-- Low-balance alerts fire at 20% and 5% remaining.

-- DropIndex (monthly-period lookups + per-period uniqueness no longer apply)
DROP INDEX "billing_quotas_hotel_id_period_start_idx";
DROP INDEX "billing_quotas_hotel_period_unique";
DROP INDEX "billing_quotas_hotel_id_idx";

-- AlterTable: drop monthly-allotment columns
ALTER TABLE "billing_quotas"
  DROP COLUMN "period_start",
  DROP COLUMN "outbound_quota_total",
  DROP COLUMN "outbound_used",
  DROP COLUMN "threshold_80_emitted_at",
  DROP COLUMN "threshold_100_emitted_at",
  DROP COLUMN "reset_at";

-- AlterTable: add prepaid-balance columns
ALTER TABLE "billing_quotas"
  ADD COLUMN "outbound_balance_total" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "outbound_balance_used" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "threshold_20_emitted_at" TIMESTAMPTZ,
  ADD COLUMN "threshold_5_emitted_at" TIMESTAMPTZ;

-- CreateIndex: one prepaid balance row per hotel
CREATE UNIQUE INDEX "billing_quotas_hotel_id_key" ON "billing_quotas"("hotel_id");
