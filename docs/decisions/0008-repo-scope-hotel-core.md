# ADR-0008: Repo scope = Hotel Core service (CRM operational surface)

- **Status**: accepted
- **Tanggal**: 2026-06-26 (orig) · **Updated**: 2026-06-27 (H11 hotels/tiers move) · 2026-06-29 (H12 integrations CRUD move)
- **Pengambil keputusan**: PO + Planning agent
- **Authoritative spec**: [`docs/spec/02-hotel-core.md`](../spec/02-hotel-core.md) + [`docs/spec/MVP-HOTEL-CORE-FIRST.md`](../spec/MVP-HOTEL-CORE-FIRST.md)

## Konteks

ADR-0001..0007 (2026-06-11) ditulis dengan asumsi repo ini = boilerplate generic untuk semua service Qooma. Service split berikutnya menelurkan Service 02 (Hotel Core / CRM) sebagai service terbesar.

Spec Service 02 awalnya menyertakan **hotels table** + **tiers table** + **integrations config CRUD**. Dua PO ruling subsequent merampingkan scope:

- **H11 2026-06-27 PO ruling**: `hotels` + new `tiers` lookup + cross-hotel admin user CRUD MOVED to Auth service. HC reads via cross-table join (`hotels h JOIN tiers t ON h.tier_id = t.id`) but does NOT write.
- **H12 2026-06-29 PO ruling**: integration config CRUD (`wa_configs`, `telegram_configs`, `qr_state`) + all `/api/integrations/*` action endpoints MOVED to Integration service (`integration-backend-qooma-hotel-ai`). HC retains `departments.telegram_chat_id` + `supervisor_telegram_id` columns (dept-scoped data); Integration reads them on dispatch.

Net effect: HC is now **operational CRM only** — tickets, guests, visits, departments, menu, knowledge, WA templates (table + Meta-callback ingest only — relay lives in Integration), feature flags, billing, notifications, AI agent configs (config-only), analytics, voice stub.

## Opsi yang dipertimbangkan

### Opsi A: Tetap boilerplate generic; Hotel Core fork ke repo lain

- **Pros**: Pattern tetap reusable untuk sibling service
- **Cons**: Branch divergence cepat, drift planning lintas repo

### Opsi B (pilihan): Repo ini = service Hotel Core spesifik

- **Pros**: Tim 3 dev fokus 1 bounded context, planning corpus konsisten
- **Cons**: Sibling service butuh repo terpisah (Auth + Integration sudah live; AI TBD)

### Opsi C: Monorepo multi-service

- **Pros**: 1 repo, 1 PR review surface
- **Cons**: Off-spec ADR-0004 (1 service = 1 DB) dan ADR-0002 (pnpm strict + 1 schema). Tidak diambil.

## Keputusan

**Opsi B.** Repo ini = service **Hotel Core (CRM)**, operational surface only.

### H11 trim (2026-06-27)

Hotels + tiers + admin users moved to Auth (`auth-backend-qooma-hotel-ai`). HC migration sequence depends on Auth tables existing first (FK to `hotels(id)` + `users(id)` + `users.dept_id` nullable until depts seed).

### H12 trim (2026-06-29)

Integrations config CRUD moved to Integration (`integration-backend-qooma-hotel-ai`). Outbound dispatch ownership ratified to Integration (Q-OPS-03 RESOLVED). Cross-service write for per-dept Telegram routing introduces Q-CONTRACT-25 + Q-OPS-06 (shared DB vs RPC; recommend shared DB for MVP).

### Resolve ADR-0004 tension (cross-service identifier)

ADR-0004 (1 service = 1 DB) tetap berlaku **secara konseptual** tapi dilonggarkan operasionalnya: Auth + HC + Integration co-locate di 1 Postgres untuk MVP (Q-OPS-06 ratification). AI runs in own DB. Pola eksplisit:

> Kolom yang merujuk entity milik sibling service:
> - **Same DB (Auth/HC/Integration)**: FK Postgres OK (cross-table join allowed).
> - **Different DB (AI)**: opaque `uuid` tanpa `REFERENCES`. Contoh: `ticket_messages.conversation_id` (nullable, points to AI's `conversations.id`).

## Konsekuensi

### Positif

- Bounded context jelas untuk 3 dev paralel (Nathan / Nanak / Satrio)
- Slot routing di `KICKOFF.md` + `SERVICE-CHARTER.md` reflects H12 trim
- HC tidak lagi care soal channel adapters, BSP quirks, webhook signature verification — semua Integration
- Tier-gating sederhana via SQL join (no RPC to Auth)

### Negatif (yang kami terima)

- Cross-service write coupling untuk per-dept Telegram (Integration writes HC's `departments` table) — terselesaikan via shared-DB (MVP) atau RPC (later if scaling demands split)
- AI repo masih TBD → wave 2 dependency
- Single-Postgres untuk Auth + HC + Integration berarti operational coupling (one DB down = three services down). Acceptable trade-off untuk MVP scope.

## Trigger untuk revisit

- Saat AI service launch & cross-service joins HC→AI bikin overhead → AI cache table di HC
- Saat operational coupling jadi masalah (HC outage blocks Integration outbound) → split DBs
- Saat cross-service write (Integration → HC departments) frequency tinggi → migrate to event-sourced outbox pattern
