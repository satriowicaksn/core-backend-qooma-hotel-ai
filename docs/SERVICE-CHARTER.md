# Service Charter — Hotel Core (CRM)

- **Status**: accepted (H12 update 2026-06-29)
- **Tanggal**: 2026-06-26 (orig) · **Updated**: 2026-06-27 (H11 hotels/tiers move) · 2026-06-29 (H12 integrations CRUD move)
- **Ratified by**: [ADR-0008](./decisions/0008-repo-scope-hotel-core.md)
- **Authoritative spec**: [`docs/spec/02-hotel-core.md`](./spec/02-hotel-core.md) + [`docs/spec/MVP-HOTEL-CORE-FIRST.md`](./spec/MVP-HOTEL-CORE-FIRST.md)

## 1. Bounded context

Repo ini = service **Hotel Core (CRM)**. Pattern boilerplate (`_template/`, `MODULE_TEMPLATE.md`, ADR-0001..0007) tetap reusable, tapi scope work-in-flight di repo ini = Hotel Core only.

### Owns (post-H11 + H12 trim)

- **Departments** · tickets (state machine + audit) · guests · guest preferences · visits (manual + auto verification) · notifications (server-persisted; socket fast path)
- **Settings**: departments, menu (+ CSV import + bulk availability), knowledge base (+ CSV import), promos (stub), upsells (stub), WA templates (lifecycle + Meta relay callback), feature flags (19), operating hours, escalation tree
- **Analytics** (Luxury tier only, server-enforced)
- **Billing**: quota meter, invoices, daily brief PDF, package upgrade
- **AI agent configs** (config-only; AI service consumes via internal read)
- **Voice config groundwork** (stub per ADD-23.7)
- **Workers**: auto-close (15m), escalation L1→L2→L3, pending-verification reminder, failed-3x detection, daily brief PDF, quota 80%/100%, monthly reset

### Does NOT own (sibling services — separate repos)

| Sibling                                | Owns                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Auth / Identity** (01) — H11         | Users, sessions, JWT, **hotels** (tenant table), **tiers** (catalog), cross-hotel admin user CRUD, hotel-settings write (`/api/settings/hotel`), PII masking helpers |
| **AI Orchestration** (03)              | Agent prompts, orchestrator, conversations, KB retrieval                                   |
| **Integration / Channels** (04) — H12  | WA / Telegram / channel adapters, **integration config CRUD** (`wa_configs`, `telegram_configs`, `qr_state`), outbound dispatch + retry, webhook ingress, QR generation, OTA email polling, channel health |

> **Sibling repo names**: `auth-backend-qooma-hotel-ai` (live), `integration-backend-qooma-hotel-ai` (bootstrapped H12), AI repo TBD.

## 2. Cross-service contracts

- **Tenant rule**: every multi-tenant table carries `hotel_id` (FK to Auth's `hotels.id` since shared DB per `docs/spec/data-model.md` §1). Middleware filters every read by `hotel_id = session.hotel_id`. Super_admin bypass via explicit branch.
- **Shared DB topology** (recommended; ratified Q-OPS-06 H12): Auth + HC + Integration co-locate in one Postgres. FKs to Auth's `hotels` + `users` work directly. AI runs in own DB; `ticket_messages.conversation_id` is a nullable opaque UUID pointing at AI's `conversations.id`.
- **Tier authority**: `hotels.tier_id → tiers.id` lives in Auth (H11). HC reads via cross-table join (`hotels h JOIN tiers t ON h.tier_id = t.id`) when gating analytics / feature flags / agent caps. HC NEVER writes to `hotels` or `tiers`.
- **DND + quota enforcement**: HC owns `billing_quotas` (the meter). Integration service consults HC via two-phase RPC (`check_and_reserve_outbound_quota` → `commit_outbound_quota_increment`) before/after each outbound dispatch. DND lives on Auth's `hotels.dnd` (read by Integration on dispatch).
- **AI handoff**: HC fires `ticket:created` after AI service RPC creates the ticket (`POST /internal/tickets`) with classified payload. AI never writes to HC's DB; uses internal RPC. HC stores `ticket_messages` itself; AI writes `conversation_id` opaque pointer when it spawns a conversation thread.
- **Integration ↔ HC writes** (NEW H12): `PUT /api/integrations/telegram/departments/:dept_id` is owned by Integration but persists to HC's `departments.telegram_chat_id` + `supervisor_telegram_id`. Implementation: shared-DB direct write OR RPC to HC `updateDepartmentTelegram` — see Q-OPS-06.
- **WA template Meta callback** (NEW H12): Integration relays POST/resubmit to Meta on HC's behalf, then calls HC internal `updateWaTemplateStatus` when Meta webhooks back.

## 3. Slot routing (supersedes KICKOFF.md §1 defaults)

| Slot       | Owner   | Default scope (PO can override per task)                                                                                                              |
| ---------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| A (Nanak) | Nanak  | **Foundation** — Prisma schema + initial migration, tenant-guard + RBAC middleware, seed scripts, ticket-state-machine helper, common error handlers, multipart upload, CSV import utility, workers harness |
| B (Nathan)  | Nathan   | **Core CRM** — tickets (state machine + reroute + stats + overdue), ticket_updates, ticket_messages, guests + preferences, visits (pending + failed_3x + manual + checkin/checkout), notifications, socket emitters |
| C (Satrio) | Satrio  | **Settings + Analytics** — departments, menu (+ CSV + bulk + multipart), knowledge (+ import), WA templates lifecycle (incl. Meta callback ingest), feature flags (tier-gated), billing (quota meter + invoices + upgrade + daily brief), settings/agents config, settings/voice groundwork, all 8 analytics endpoints |

> **H12 change**: Satrio's bucket no longer includes "integrations config CRUD" — that moved to Integration repo. Satrio retains the Meta-callback ingest path for WA templates (because the `wa_templates` table stays HC-owned).

`KICKOFF.md §1` table di-update untuk reflect H12 split.

## 4. Open contract questions

Source of truth: [`docs/spec/open-questions.md`](./spec/open-questions.md). HC-relevant subset (Q-CONTRACT-08, 09, 10, 11, 12, 15, 17, 19, 20, 21) — Parent PM mirror actionable rows ke `PM-STATUS-PARENT.md §3a` setelah PO ratifikasi.

H11/H12 PO-ratified rulings (incorporated):

- **Q-22 / Q-23 / Q-24** → Auth (di luar repo ini)
- **Q-07** → reassigned ke Integration repo H12
- **Q-25 (NEW H12)** → cross-service write for per-dept Telegram (Integration writes HC dept table); HC perlu expose internal `updateDepartmentTelegram` jika opsi B (RPC) dipilih
- **Q-OPS-03** → Resolved H12: Integration owns outbound dispatch
- **Q-OPS-06 (NEW H12)** → shared-DB vs RPC; recommended shared-DB for MVP

## 5. Out-of-scope-by-design

- Identity / hotels / tiers / admin users → Auth's job
- Channel adapters / WA Cloud SDK / Telegram SDK / integration CRUD → Integration's job
- Prompt engineering / Claude API / conversation state → AI's job
- Cross-service Postgres FK to AI's DB (opaque UUIDs only)
- Payment gateway integration (out of MVP)
- PMS direct API integration (Enterprise tier, post-MVP)
