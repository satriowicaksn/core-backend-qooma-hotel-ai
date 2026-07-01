# Service 02 — Hotel Core (CRM)

> **Bounded context**: the CRM itself. Everything a hotel general manager and department head touch every day — tickets, guests, settings, billing, notifications. This is the largest service by endpoint count.
>
> **Owns**: departments, tickets + ticket_updates + ticket_messages, guests + guest_preferences + visits, menu_categories + menu_items, knowledge_entries, wa_templates, feature_flags, billing_quotas + billing_invoices + billing_extras, notifications, ai_agent_configs (config-only; AI service consumes), per-hotel CRM workers (auto-close, escalation, daily brief, quota meter, monthly reset).
>
> **Does NOT own** (per H11 PO ruling 2026-06-27 → Auth): `hotels` table, `tiers` table, hotel-tenant CRUD (`/api/admin/hotels`), per-hotel hotel-settings write (`/api/settings/hotel`), all user types. Hotel Core **reads** `hotels.tier_id` via cross-table join for tier-gating but never writes.
>
> **Does NOT own** (per H12 PO ruling 2026-06-29 → Integration): integration config CRUD (`/api/integrations/whatsapp`, `/api/integrations/telegram`, `/api/integrations/telegram/departments/:dept_id`). All integration surface — config CRUD AND actions — now lives in Integration service. Hotel Core consumes via internal RPC for outbound dispatch and reads `departments.telegram_chat_id` / `departments.supervisor_telegram_id` which remain HC-owned columns on the departments table (Integration reads them on dispatch).
>
> **Does NOT own** (other siblings): identity / login / sessions (Auth), AI orchestration / agent prompts / conversation state (AI), channel adapters / webhook ingress / retry queues (Integration). Hotel Core **persists** `ticket_messages` and stores `conversation_id` as a nullable opaque UUID — AI service writes that pointer when it claims the conversation; null means no AI conversation has been spawned yet.

---

## 1. Endpoints

Sections below mirror `docs/API-CONTRACT.md`. Section numbers cite the canonical contract.

### 1.1 Hotel context — MOVED to Auth (per H11 PO ruling)

`GET /api/hotels/me` and `GET, PUT /api/settings/hotel` are now Auth-owned (the `hotels` table moved to Auth). Hotel Core **reads** `hotels.tier_id` via cross-table join for tier-gating (analytics access, feature-flag locks, agent-cap enforcement) but does NOT write to the `hotels` table.

**See `01-auth-identity.md` §1.5 (Hotels) + API-CONTRACT §2.1a + §2.5c + §2.14** for the canonical surface.

**Tier-gating pattern for Hotel Core**: when an endpoint needs to know "is this hotel on Luxury?", join with Auth's `hotels` + `tiers` tables (same DB per `shared/data-model.md` §1):

```sql
SELECT t.name AS tier_name, t.features, t.outbound_quota_monthly, t.agent_cap, t.department_cap
FROM hotels h JOIN tiers t ON h.tier_id = t.id
WHERE h.id = $1;
```

Cache the result per-request (the per-hotel tier rarely changes mid-session). Gate per `tier.name` or `tier.features.<flag>`.

### 1.2 Tickets (API-CONTRACT §2.2)

The core of the CRM. WA messages from guests become tickets; staff act on them.

| Method  | Path                          | Purpose                                                             | Roles                                          |
| ------- | ----------------------------- | ------------------------------------------------------------------- | ---------------------------------------------- |
| `GET`   | `/api/tickets`                | List with filter (dept, status, date, priority, complaint_type, search, guest_id), cursor pagination | `gm_admin`, `dept_head` (filtered to own dept) |
| `GET`   | `/api/tickets/:id`            | Detail + updates[] + messages[]                                     | `gm_admin`, `dept_head` (own dept only)        |
| `PATCH` | `/api/tickets/:id/status`     | Update status from CRM (state-machine-validated)                    | `gm_admin`, `dept_head`                        |
| `PATCH` | `/api/tickets/:id/department` | Reroute ticket to another department                                | `gm_admin`                                     |
| `GET`   | `/api/tickets/stats`          | Counts by status (dashboard KPI)                                    | `gm_admin`, `dept_head`                        |
| `GET`   | `/api/tickets/overdue`        | List over SLA                                                       | `gm_admin`, `dept_head`                        |

**Query params on `GET /api/tickets`**: `status` (CSV), `department_id`, `priority`, `complaint_type` (CSV), `date_from`, `date_to`, `q` (search ticket number + guest name + body), `is_high_alert` (bool), `is_overdue` (bool), `guest_id`, `limit` (default 20, max 100), `cursor` (opaque base64).

**Status state machine** (server-enforced per techspec §6.2):

```
open
 ├─→ in_progress
 ├─→ cancelled
in_progress
 ├─→ awaiting_late_reason
 ├─→ done_pending
 ├─→ escalated
 └─→ cancelled
awaiting_late_reason
 └─→ done_pending
done_pending
 ├─→ closed         (auto after 15 min OR via guest "Selesai" reply)
 ├─→ high_alert     (guest replies "Belum ada")
 └─→ cancelled
high_alert
 └─→ in_progress
escalated
 ├─→ in_progress    (after L2/L3 picks up)
 └─→ cancelled
```

Reject any other transition with `422 BUSINESS_RULE` code `INVALID_TICKET_TRANSITION`. FE applies optimistic update + rollback on rejection.

**Auto-close worker**: `done_pending → closed` after 15 minutes idle (no guest reply). This is a background job, scoped per-hotel. When it fires, emit `ticket:updated`.

**Ticket list shape** — exact response in API-CONTRACT §2.2. Key fields: `wa_phone_masked` (already-masked at backend per §PII), `is_overdue`, `is_high_alert`, `priority`, `assigned_to` (staff name; joined from Auth's `users`).

**Ticket detail extras**:

- `updates`: array of audit-trail events (status changes, reroutes, AI handovers, escalations). Each `{ id, ticket_id, type, actor_user_id, actor_name, actor_role, from_status, to_status, note, created_at }`.
- `messages`: conversation thread. Each `{ id, ticket_id, sender, sender_user_id, body, media, conversation_id, sent_at, delivered_at, read_at }`. `sender ∈ 'guest' | 'staff' | 'ai' | 'system'`. `conversation_id` is a nullable opaque UUID pointing at AI service's `conversations.id` when the message is part of an AI-owned thread (H12 ruling — Hotel Core IS the source of truth for `ticket_messages`; AI writes the pointer only).
- `complaint_type` (Q-CONTRACT-17, ASSUMED): `'staff_attitude' | 'facility' | 'fnb' | 'general' | 'vvip'` (one of 5; AI classifies on creation).
- `complaint_detail`: free text.
- `resolved_satisfaction`: `1 | 2 | 3 | 4 | 5 | null` (survey score after close).

### 1.3 Guests + Visits (API-CONTRACT §2.3)

| Method  | Path                             | Purpose                                                                           | Roles      |
| ------- | -------------------------------- | --------------------------------------------------------------------------------- | ---------- |
| `GET`   | `/api/guests`                    | List with search (`q` matches name + wa_phone), page/pageSize pagination          | `gm_admin` |
| `GET`   | `/api/guests/:id`                | Profile + preferences + visit history (nested arrays)                             | `gm_admin` |
| `PATCH` | `/api/guests/:id`                | Update profile, privacy mode, VIP flag                                            | `gm_admin` |
| `POST`  | `/api/guests/:id/preferences`    | Add or update preference (upsert by `preference_type`)                            | `gm_admin` |
| `GET`   | `/api/guests/:id/messages`       | Conversation history (paginated by `limit` + `cursor`)                            | `gm_admin` |
| `GET`   | `/api/visits`                    | List visits (incl. `?status=pending_verification`, `?status=failed_verification`) | `gm_admin` |
| `POST`  | `/api/visits`                    | Manual visit / booking creation (Q-CONTRACT-20, ASSUMED)                          | `gm_admin` |
| `PATCH` | `/api/visits/:id/verify-manual`  | Manual evening verification (approve or reject)                                   | `gm_admin` |
| `PATCH` | `/api/visits/:id/reject`         | Reject pending visit (or via verify-manual `{action:'reject'}` — Q-CONTRACT-15)   | `gm_admin` |
| `PATCH` | `/api/visits/:id/approve-manual` | Approve failed_3x manual override (Q-CONTRACT-19)                                 | `gm_admin` |
| `PATCH` | `/api/visits/:id/checkin`        | System check-in (backend-driven; FE mocks `{}` 200)                               | `gm_admin` |
| `PATCH` | `/api/visits/:id/checkout`       | Check-out + survey (backend-driven; not FE-mocked)                                | `gm_admin` |

**Pending Verification flow** (Dashboard card + T69 scope):

1. Guest WA arrives "I'm checking in tomorrow" → backend creates `Visit { status: 'pending_verification' }` + emits `verification:pending`.
2. GM sees the card on `/dashboard`, opens the verify dialog.
3. Approve: `PATCH /api/visits/:id/verify-manual { guest_name, room_number, nights }` (nights ∈ 1–7). Backend derives checkout = `check_in (13:00) + nights → 11:00`. Status → `checked_in`. Emit `verification:resolved { visit_id, status: 'checked_in' }`.
4. Reject: same endpoint with `{ action: 'reject' }` OR dedicated `PATCH /api/visits/:id/reject`. Q-CONTRACT-15 open — backend's call. Status → `rejected`. Emit `verification:resolved { visit_id, status: 'rejected' }`.

**Failed 3x flow** (T32 + Q-CONTRACT-19):

1. After 3 failed automated verification attempts → `Visit.status = 'failed_verification'`. Emit `verification:failed_3x { visit_id, attempts: 3 }`.
2. Dashboard card shows them; GM picks manual approve via `PATCH /api/visits/:id/approve-manual { guest_name, room_number, nights? }`.

**`Visit` shape**: see API-CONTRACT §2.3 + DDL §2.3 below.

### 1.4 Analytics (API-CONTRACT §2.4 — Luxury tier only)

| Method | Path                          | Purpose                                           |
| ------ | ----------------------------- | ------------------------------------------------- |
| `GET`  | `/api/analytics/overview`     | KPI: response time, completion rate, satisfaction |
| `GET`  | `/api/analytics/tickets`      | Volume per day                                    |
| `GET`  | `/api/analytics/departments`  | Dept performance                                  |
| `GET`  | `/api/analytics/peak-hours`   | Heatmap                                           |
| `GET`  | `/api/analytics/top-requests` | Most-frequent categories                          |
| `GET`  | `/api/analytics/satisfaction` | Satisfaction trend                                |
| `GET`  | `/api/analytics/high-alert`   | High-alert dept analysis (Q-CONTRACT-21, ASSUMED) |
| `GET`  | `/api/analytics/export`       | Download xlsx / pdf                               |

**Common query params**: `from` (ISO date), `to` (ISO date), `period` (`'day' | 'week' | 'month' | 'custom'`).

**Tier gating**: backend MUST 403 every `/api/analytics/*` request when `hotel.tier !== 'luxury'` (joined via §1.1 pattern). FE has a route guard, but never trust the FE.

**`/api/analytics/export`**: returns `application/octet-stream`. Backend generates the file — Excel via openpyxl/SheetJS, PDF via wkhtmltopdf or similar. FE does NOT generate client-side.

**High-alert response shape** (Q-CONTRACT-21):

```json
{
  "data": [
    {
      "department_id": "uuid",
      "current_period_rate": 0.18,
      "prev_period_rate": 0.14,
      "alert_threshold_exceeded": true,
      "salah_kamar_count": 3,
      "trend_7d": [...]
    }
  ],
  "alert_summary": {
    "total_high_alert": 12,
    "threshold_exceeded_count": 2,
    "recommendation_key": "multi_dept_concern"
  }
}
```

`recommendation_key ∈ 'all_departments_healthy' | 'single_dept_spike' | 'multi_dept_concern' | 'cross_dept_pattern' | 'systemic_alert'`. Threshold = strict `current > prev * 1.10`.

### 1.5 Settings (API-CONTRACT §2.5)

| Method          | Path                                | Purpose                                                                                       |
| --------------- | ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `GET, POST`     | `/api/settings/departments`         | List / create                                                                                 |
| `PATCH, DELETE` | `/api/settings/departments/:id`     | Update / delete (409 if users assigned or tickets open)                                        |
| `GET, POST`     | `/api/settings/menu`                | List (categories + items) / create menu item (multipart image upload)                         |
| `PATCH, DELETE` | `/api/settings/menu/:id`            | Update / delete menu item (multipart)                                                         |
| `POST`          | `/api/settings/menu/categories`     | Create category                                                                               |
| `PATCH, DELETE` | `/api/settings/menu/categories/:id` | Update / delete category (409 if items assigned)                                              |
| `POST`          | `/api/settings/menu/import-csv`     | CSV bulk import (multipart `file`)                                                            |
| `POST`          | `/api/settings/menu/bulk-availability` | Bulk-set availability window for N items                                                   |
| `GET, POST`     | `/api/settings/knowledge`           | List / create KB entries                                                                      |
| `PATCH, DELETE` | `/api/settings/knowledge/:id`       | Update / delete                                                                               |
| `POST`          | `/api/settings/knowledge/import`    | CSV bulk import (multipart `file`)                                                            |
| `GET`           | `/api/settings/promos`              | List promos (stub — full flow is wave 2)                                                      |
| `GET`           | `/api/settings/upsells`             | List upsells (stub)                                                                           |
| `GET`           | `/api/settings/agents`              | AI agents — config lives here, AI service consumes                                            |
| `PATCH`         | `/api/settings/agents/:id`          | Update one agent (`is_active`, `capacity`, `config`)                                          |
| `GET, PUT`      | `/api/settings/voice`               | Voice channel config (groundwork only — wave 2a)                                              |
| `POST`          | `/api/settings/voice/test`          | Test voice connection                                                                         |

**`PATCH /api/settings/agents/:id` constraints**:

- **Min 3 active agents** — reject with `422 BUSINESS_RULE` code `MIN_AGENTS_VIOLATION` if toggle would drop below.
- Tier-based agent caps — see Billing §1.10.

**`/api/settings/hotel` MOVED to Auth** per H11 — see §1.1.

**Operating hours + DND** (API-CONTRACT §2.10): operating_hours embedded in dept object (HC-owned); DND embedded in hotel object (Auth-owned — fetched via `/api/hotels/me`). Hotel Core's outbound dispatch worker reads DND through the same cross-table join pattern as tier-gating.

**DND scope reminder**: outbound messages only (so AI doesn't proactively message during quiet hours). Inbound messages always reach AI. `exception_vvip: true` means VVIP-tier guests are exempt from DND outbound block.

**Escalation tree** (API-CONTRACT §2.11): embedded in dept object:

```json
{
  "escalation_chain": {
    "l1_sla_minutes": 5,
    "l2_user_id": "uuid",
    "l2_sla_minutes": 5,
    "l3_user_id": "uuid",
    "skip_to_l3_categories": ["vvip", "urgent", "complaint"]
  }
}
```

- L1 = the staff assigned to the dept ticket. Default SLA = 5 min.
- L2 = a `dept_head` (queried via Auth `/api/users?role=dept_head&dept_id=:dept_id`).
- L3 = a `gm_admin` (queried via Auth `/api/users?role=gm_admin`).
- `skip_to_l3_categories` jumps straight to L3 for VVIP / urgent / complaint tickets.
- **Escalation worker** (HC-owned): timer fires when L1 SLA breached → ticket status → `escalated`, RPC Integration service to send Telegram notification to L2's `telegram_id` (Integration reads `users.telegram_id` from Auth + `departments.supervisor_telegram_id` from HC), then timer for L2 SLA → L3. Emit `ticket:escalated` each step.

### 1.6 Notifications (API-CONTRACT §2.6)

| Method  | Path                               | Purpose                       |
| ------- | ---------------------------------- | ----------------------------- |
| `GET`   | `/api/notifications`               | List, filterable by `is_read` |
| `GET`   | `/api/notifications/unread-count`  | Badge count                   |
| `PATCH` | `/api/notifications/:id/read`      | Mark single read              |
| `POST`  | `/api/notifications/mark-all-read` | Mark all read                 |

`Notification` shape:

```json
{
  "id": "uuid",
  "hotel_id": "uuid",
  "user_id": "uuid",
  "type": "ticket_created | ticket_escalated | message_new | high_alert | verification_pending | billing_threshold",
  "title": "Tiket baru #HSK-2606-048",
  "body": "Handuk tambahan kamar 1204",
  "link": "/tickets/uuid",
  "is_read": false,
  "created_at": "2026-06-11T07:32:14Z"
}
```

Server persists notifications generated by socket events. FE dropdown calls `GET /api/notifications?limit=20` AND consumes the socket — server is the source of truth; socket is the fast path. **Mutations on `mark-all-read` and `:id/read` should be optimistic on the FE side** (already implemented).

### 1.7 Integrations — MOVED to Integration service (per H12 PO ruling 2026-06-29)

The entire `/api/integrations/*` surface — config CRUD AND action endpoints — now lives in Integration service.

**See `04-integration-channels.md` §2 + API-CONTRACT §2.7** for the canonical surface.

**Hotel Core still owns** these columns that Integration reads on dispatch:

- `departments.telegram_chat_id` — group chat for dept staff
- `departments.supervisor_telegram_id` — L2 escalation target

**Cross-service flow**: when a Hotel Core endpoint changes one of those columns (`PATCH /api/settings/departments/:id`), the update is persisted in HC's `departments` table; Integration reads at dispatch time. No RPC needed — same DB, cross-table SELECT.

### 1.8 Feature Flags (API-CONTRACT §2.8)

| Method  | Path                       | Purpose                                     |
| ------- | -------------------------- | ------------------------------------------- |
| `GET`   | `/api/feature-flags`       | List all 19 flags with state + tier minimum |
| `PATCH` | `/api/feature-flags/:flag` | Toggle one                                  |

19 flags total. `is_tier_locked: true` when `hotel.tier < min_tier` — FE renders toggle disabled with upgrade prompt. PATCH validates tier; reject `422 BUSINESS_RULE` code `FEATURE_FLAG_DEPENDENCY_VIOLATION` if toggle would violate active-data dependencies (e.g. "can't disable menu_ordering: 3 active campaigns"). Query param `?force=true` overrides dependency check for super_admin only.

Flags FE expects:

- Core: `multi_language`, `vip_profile`, `privacy_mode`, `outbound_quota_alerts`
- Channels: `menu_ordering`, `wa_templates`, `voice_groundwork`
- AI: `sentiment_detection`, `butler_anticipate`, `loyalty_integration`, `compensation_auto`, `post_stay_relationship`
- Verification: `pending_verification`, `failed_verification_alert`
- (remaining 5 — see fixtures)

Full list in `src/mocks/fixtures/feature-flags.ts`. **Keep the flag set stable** — adding new flags is fine, renaming/removing breaks the FE settings page.

### 1.9 WhatsApp Templates (API-CONTRACT §2.9 — ADD-08)

| Method   | Path                             | Purpose                                     |
| -------- | -------------------------------- | ------------------------------------------- |
| `GET`    | `/api/wa-templates`              | List (global + hotel-specific)              |
| `POST`   | `/api/wa-templates`              | Submit new for Meta approval                |
| `PATCH`  | `/api/wa-templates/:id`          | Edit pending (locked after approved)        |
| `DELETE` | `/api/wa-templates/:id`          | Cancel pending or archive rejected/approved |
| `POST`   | `/api/wa-templates/:id/resubmit` | Resubmit rejected after edit                |

8 standard names (ADD-08.2): `qooma_pre_arrival`, `qooma_welcome`, `qooma_survey`, `qooma_campaign`, `qooma_upsell`, `qooma_daily_brief`, `qooma_outbound_limit`, `qooma_session_expired`.

**Meta approval workflow**:

1. FE submits template (POST) → HC stores `status: 'pending'` + RPCs Integration service which relays to Meta via WA Cloud API.
2. Integration polls Meta or receives webhook → calls HC internal endpoint to update `status` to `approved` or `rejected`.
3. On approve: `approved_at` set; `template_id_meta` filled.
4. On reject: `rejection_reason` filled; FE shows reason; user edits + resubmits.

Global templates (`is_global: true`) are pre-approved by Qooma team — read-only at hotel level.

### 1.10 Billing (API-CONTRACT §2.12 — ADD-13)

| Method | Path                                  | Purpose                                                            |
| ------ | ------------------------------------- | ------------------------------------------------------------------ |
| `GET`  | `/api/settings/billing`               | Full billing overview (tier, quota, agents, invoices, daily brief) |
| `POST` | `/api/billing/upgrade-package`        | Backend confirms with Qooma team                                   |
| `GET`  | `/api/billing/invoices/:id/download`  | Stream invoice PDF                                                 |
| `GET`  | `/api/billing/daily-brief/latest.pdf` | Daily brief PDF (T74 added)                                        |

**Tier matrix** is now stored in Auth's `tiers` table (per H11). Hotel Core joins to read; the matrix values are:

| Tier         | Agents    | Depts  | Outbound/month | Users (GM + DH) |
| ------------ | --------- | ------ | -------------- | --------------- |
| Lite         | 1         | 1      | 2,000          | 1 + 1           |
| Professional | 3 min     | 3      | 4,000          | 1 + 3           |
| Luxury       | 5 include | 5      | 8,000          | 1 + 5           |
| Enterprise   | custom    | custom | custom         | custom          |

**Min 3 agents at onboarding regardless of tier** (techspec §19.2). Server blocks any toggle that would violate this with `422 BUSINESS_RULE` code `MIN_AGENTS_VIOLATION`.

**Outbound quota meter**: every WA outbound from Integration service increments `billing_quotas.used`. At 80% → emit `billing:threshold_reached { percent: 80, type: 'outbound' }` (FE toast warning). At 100% → emit at 100, BLOCK further outbound (Integration service refuses to send), FE toast destructive. Reset on first day of each month UTC (or hotel timezone if you want — flag in open questions).

**Daily brief PDF**: a worker generates one PDF per hotel per day summarizing the day's activity. Stored on object storage (S3 / R2 / equivalent); URL returned via `daily_brief_pdf_url_latest` field on the billing response. The download endpoint streams the file (server-side fetch from storage; no redirect to a presigned URL — keeps the cookie-auth path).

### 1.11 Dashboard

No dedicated endpoint — Dashboard aggregates:

- `GET /api/tickets/stats` for KPI cards
- `GET /api/tickets/overdue` for the overdue list
- `GET /api/visits?status=pending_verification` for the Pending card
- `GET /api/visits?status=failed_verification` for the Failed 3x card
- `GET /api/analytics/overview` for the KPI grid (Luxury only)
- `GET /api/notifications?limit=5` for the recent-activity rail

If you want a Dashboard composite endpoint for performance, fine — flag in `shared/open-questions.md`. FE works either way.

### 1.12 Hotels Admin — MOVED to Auth (per H11 PO ruling)

The `/api/admin/hotels` family + the entire `hotels` table moved to Auth. **See `01-auth-identity.md` §1.5 + API-CONTRACT §2.14** for the canonical surface, including the H11 PO ratifications (atomic GM-user creation, generated-and-returned password, suspend-only soft-delete, tier-FK normalization).

Hotel Core implementations that previously joined directly on `hotels` should keep joining (same DB) but treat the table as read-only — writes are Auth's responsibility.

---

## 2. Data model (this service owns) — DDL

Full ERD in `shared/data-model.md`. Below: full DDL per HC-owned table. Conventions per `shared/data-model.md` §5: UUID PKs via `gen_random_uuid()`, `TIMESTAMPTZ` for timestamps, `VARCHAR + CHECK` over Postgres `ENUM`, JSONB for sub-objects, `(hotel_id)` index on every multi-tenant table + `(hotel_id, created_at DESC)` on list-heavy tables.

> **Standing rule**: every table below carries `hotel_id UUID NOT NULL` and has a `(hotel_id)` index. The tenant-guard middleware filters every read by `hotel_id = session.hotel_id`. No exceptions.

### 2.1 `departments`

```sql
CREATE TABLE departments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id                 UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  name                     VARCHAR(80) NOT NULL,
  code                     VARCHAR(8) NOT NULL,              -- 'HSK' | 'FO' | 'FNB' | 'ENG' | 'CON'
  operating_hours          JSONB NOT NULL DEFAULT '{}'::jsonb,
  escalation_chain         JSONB NOT NULL DEFAULT '{}'::jsonb,
  telegram_chat_id         VARCHAR(64) NULL,                  -- group chat for dept staff
  supervisor_telegram_id   VARCHAR(64) NULL,                  -- L2 escalation target
  is_active                BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT departments_code_check CHECK (code ~ '^[A-Z]{2,8}$'),
  CONSTRAINT departments_hotel_code_unique UNIQUE (hotel_id, code)
);
CREATE INDEX idx_departments_hotel ON departments(hotel_id);
CREATE INDEX idx_departments_hotel_active ON departments(hotel_id, is_active);
```

### 2.2 `guests` + `guest_preferences`

```sql
CREATE TABLE guests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  name            VARCHAR(120) NOT NULL,
  wa_phone        VARCHAR(20) NOT NULL,                          -- raw E.164 (e.g. +6281234567890)
  email           VARCHAR(255) NULL,
  privacy_mode    VARCHAR(20) NOT NULL DEFAULT 'standard',       -- 'standard' | 'vvip'
  is_vip          BOOLEAN NOT NULL DEFAULT false,
  vip_level       VARCHAR(20) NULL,                              -- 'silver' | 'gold' | 'platinum' | NULL
  total_stays     INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT guests_privacy_mode_check CHECK (privacy_mode IN ('standard','vvip')),
  CONSTRAINT guests_vip_level_check CHECK (vip_level IS NULL OR vip_level IN ('silver','gold','platinum')),
  CONSTRAINT guests_hotel_wa_unique UNIQUE (hotel_id, wa_phone)
);
CREATE INDEX idx_guests_hotel ON guests(hotel_id);
CREATE INDEX idx_guests_hotel_wa ON guests(hotel_id, wa_phone);
CREATE INDEX idx_guests_hotel_vip ON guests(hotel_id, is_vip) WHERE is_vip = true;
CREATE INDEX idx_guests_hotel_created ON guests(hotel_id, created_at DESC);

CREATE TABLE guest_preferences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  guest_id          UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  preference_type   VARCHAR(40) NOT NULL,    -- 'pillow' | 'allergy' | 'language' | 'wake_call' | …
  preference_value  TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT guest_preferences_unique UNIQUE (guest_id, preference_type)
);
CREATE INDEX idx_guest_preferences_hotel ON guest_preferences(hotel_id);
CREATE INDEX idx_guest_preferences_guest ON guest_preferences(guest_id);
```

### 2.3 `visits`

```sql
CREATE TABLE visits (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id                 UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  guest_id                 UUID NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  check_in                 TIMESTAMPTZ NOT NULL,
  check_out                TIMESTAMPTZ NULL,
  nights                   INTEGER NULL,                    -- 1–7 typical
  room_number              VARCHAR(16) NULL,
  status                   VARCHAR(30) NOT NULL DEFAULT 'pending_verification',
  booking_source           VARCHAR(20) NULL,                -- 'ota_email' | 'direct' | 'walk-in' | 'pms'
  verification_attempts    INTEGER NOT NULL DEFAULT 0,
  special_request          TEXT NULL,                       -- R13 ephemeral; not always persisted (Q-CONTRACT-20)
  satisfaction_score       INTEGER NULL,                    -- 1–5 captured at checkout
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT visits_status_check CHECK (status IN (
    'pending_verification','checked_in','checked_out','rejected','failed_verification','cancelled'
  )),
  CONSTRAINT visits_nights_check CHECK (nights IS NULL OR (nights >= 1 AND nights <= 30)),
  CONSTRAINT visits_satisfaction_check CHECK (satisfaction_score IS NULL OR (satisfaction_score BETWEEN 1 AND 5)),
  CONSTRAINT visits_booking_source_check CHECK (booking_source IS NULL OR booking_source IN ('ota_email','direct','walk-in','pms'))
);
CREATE INDEX idx_visits_hotel ON visits(hotel_id);
CREATE INDEX idx_visits_hotel_status ON visits(hotel_id, status);
CREATE INDEX idx_visits_guest ON visits(guest_id, check_in DESC);
CREATE INDEX idx_visits_hotel_checkin ON visits(hotel_id, check_in DESC);
CREATE INDEX idx_visits_pending ON visits(hotel_id, created_at DESC) WHERE status = 'pending_verification';
CREATE INDEX idx_visits_failed ON visits(hotel_id, created_at DESC) WHERE status = 'failed_verification';
```

### 2.4 `tickets` + `ticket_updates` + `ticket_messages`

```sql
CREATE TABLE tickets (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id                UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  ticket_number           VARCHAR(32) NOT NULL,                 -- 'HSK-2606-048' (dept-yymm-seq)
  guest_id                UUID NOT NULL REFERENCES guests(id) ON DELETE RESTRICT,
  department_id           UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
  assigned_user_id        UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  created_by              UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  status                  VARCHAR(30) NOT NULL DEFAULT 'open',
  priority                VARCHAR(10) NOT NULL DEFAULT 'normal',
  complaint_type          VARCHAR(30) NULL,                     -- Q-CONTRACT-17: 'staff_attitude'|'facility'|'fnb'|'general'|'vvip'
  complaint_detail        TEXT NULL,
  subject                 VARCHAR(255) NOT NULL,
  body                    TEXT NULL,
  is_high_alert           BOOLEAN NOT NULL DEFAULT false,
  is_overdue              BOOLEAN NOT NULL DEFAULT false,
  resolved_satisfaction   INTEGER NULL,
  sla_due_at              TIMESTAMPTZ NULL,
  closed_at               TIMESTAMPTZ NULL,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tickets_status_check CHECK (status IN (
    'open','in_progress','awaiting_late_reason','done_pending','closed','high_alert','escalated','cancelled'
  )),
  CONSTRAINT tickets_priority_check CHECK (priority IN ('low','normal','high','urgent')),
  CONSTRAINT tickets_complaint_type_check CHECK (complaint_type IS NULL OR complaint_type IN ('staff_attitude','facility','fnb','general','vvip')),
  CONSTRAINT tickets_satisfaction_check CHECK (resolved_satisfaction IS NULL OR (resolved_satisfaction BETWEEN 1 AND 5)),
  CONSTRAINT tickets_hotel_ticket_number_unique UNIQUE (hotel_id, ticket_number)
);
CREATE INDEX idx_tickets_hotel ON tickets(hotel_id);
CREATE INDEX idx_tickets_hotel_created ON tickets(hotel_id, created_at DESC);
CREATE INDEX idx_tickets_hotel_status_dept ON tickets(hotel_id, status, department_id);
CREATE INDEX idx_tickets_dept_status ON tickets(department_id, status);
CREATE INDEX idx_tickets_guest ON tickets(guest_id, created_at DESC);
CREATE INDEX idx_tickets_assigned ON tickets(assigned_user_id) WHERE assigned_user_id IS NOT NULL;
CREATE INDEX idx_tickets_overdue ON tickets(hotel_id, sla_due_at) WHERE is_overdue = true OR sla_due_at IS NOT NULL;
CREATE INDEX idx_tickets_high_alert ON tickets(hotel_id, created_at DESC) WHERE is_high_alert = true;
CREATE INDEX idx_tickets_open ON tickets(hotel_id, status) WHERE status NOT IN ('closed','cancelled');

CREATE TABLE ticket_updates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  ticket_id       UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  actor_user_id   UUID NULL REFERENCES users(id) ON DELETE SET NULL,       -- NULL when actor is 'system' or 'ai'
  type            VARCHAR(40) NOT NULL,                                     -- 'status_change'|'reroute'|'assignment'|'escalation'|'note'|'handover'
  from_status     VARCHAR(30) NULL,
  to_status       VARCHAR(30) NULL,
  from_department_id  UUID NULL,
  to_department_id    UUID NULL,
  note            TEXT NULL,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ticket_updates_type_check CHECK (type IN ('status_change','reroute','assignment','escalation','note','handover','system'))
);
CREATE INDEX idx_ticket_updates_hotel ON ticket_updates(hotel_id);
CREATE INDEX idx_ticket_updates_ticket ON ticket_updates(ticket_id, created_at ASC);

CREATE TABLE ticket_messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id          UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  ticket_id         UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  conversation_id   UUID NULL,                          -- opaque pointer to AI's conversations.id (no FK; AI service may write this later)
  sender            VARCHAR(20) NOT NULL,                -- 'guest' | 'staff' | 'ai' | 'system'
  sender_user_id    UUID NULL REFERENCES users(id) ON DELETE SET NULL,    -- NULL when sender is 'guest'|'ai'|'system'
  body              TEXT NULL,
  media             JSONB NULL,                          -- { url, mime_type, caption?, thumbnail_url? }
  external_id       VARCHAR(80) NULL,                    -- WA message ID for receipt correlation
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at      TIMESTAMPTZ NULL,
  read_at           TIMESTAMPTZ NULL,
  CONSTRAINT ticket_messages_sender_check CHECK (sender IN ('guest','staff','ai','system'))
);
CREATE INDEX idx_ticket_messages_hotel ON ticket_messages(hotel_id);
CREATE INDEX idx_ticket_messages_ticket ON ticket_messages(ticket_id, sent_at ASC);
CREATE INDEX idx_ticket_messages_conversation ON ticket_messages(conversation_id) WHERE conversation_id IS NOT NULL;
```

### 2.5 `notifications`

```sql
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(40) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  body        TEXT NULL,
  link        VARCHAR(500) NULL,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  read_at     TIMESTAMPTZ NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT notifications_type_check CHECK (type IN (
    'ticket_created','ticket_escalated','ticket_assigned','message_new',
    'high_alert','verification_pending','verification_failed_3x','billing_threshold','system'
  ))
);
CREATE INDEX idx_notifications_hotel ON notifications(hotel_id);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE is_read = false;
```

### 2.6 `menu_categories` + `menu_items`

```sql
CREATE TABLE menu_categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  name          VARCHAR(80) NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT menu_categories_hotel_name_unique UNIQUE (hotel_id, name)
);
CREATE INDEX idx_menu_categories_hotel ON menu_categories(hotel_id);

CREATE TABLE menu_items (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id                 UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  category_id              UUID NOT NULL REFERENCES menu_categories(id) ON DELETE RESTRICT,
  name                     VARCHAR(120) NOT NULL,
  description              TEXT NULL,
  price_idr                DECIMAL(12,2) NOT NULL,
  image_url                VARCHAR(500) NULL,
  prep_minutes             INTEGER NULL,
  is_available             BOOLEAN NOT NULL DEFAULT true,
  available_window_from    TIME NULL,                              -- e.g. '06:00' for breakfast-only
  available_window_to      TIME NULL,                              -- e.g. '10:30'
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT menu_items_price_check CHECK (price_idr >= 0),
  CONSTRAINT menu_items_prep_check CHECK (prep_minutes IS NULL OR prep_minutes >= 0)
);
CREATE INDEX idx_menu_items_hotel ON menu_items(hotel_id);
CREATE INDEX idx_menu_items_category ON menu_items(category_id);
CREATE INDEX idx_menu_items_hotel_available ON menu_items(hotel_id, is_available);
```

### 2.7 `knowledge_entries`

```sql
CREATE TABLE knowledge_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  title       VARCHAR(255) NOT NULL,
  content     TEXT NOT NULL,
  category    VARCHAR(80) NULL,
  tags        TEXT[] NOT NULL DEFAULT '{}',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_knowledge_hotel ON knowledge_entries(hotel_id);
CREATE INDEX idx_knowledge_hotel_active ON knowledge_entries(hotel_id, is_active);
CREATE INDEX idx_knowledge_tags ON knowledge_entries USING GIN(tags);
CREATE INDEX idx_knowledge_search ON knowledge_entries USING GIN(to_tsvector('english', title || ' ' || content));
```

### 2.8 `wa_templates`

```sql
CREATE TABLE wa_templates (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id             UUID NULL REFERENCES hotels(id) ON DELETE RESTRICT,    -- NULL when is_global = true
  name                 VARCHAR(80) NOT NULL,                                  -- one of 8 ADD-08.2 names + hotel-specific
  body                 TEXT NOT NULL,
  variables            JSONB NOT NULL DEFAULT '[]'::jsonb,                    -- array of variable names
  language             VARCHAR(8) NOT NULL DEFAULT 'id',
  status               VARCHAR(20) NOT NULL DEFAULT 'pending',
  template_id_meta     VARCHAR(80) NULL,
  rejection_reason     TEXT NULL,
  is_global            BOOLEAN NOT NULL DEFAULT false,
  approved_at          TIMESTAMPTZ NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT wa_templates_status_check CHECK (status IN ('pending','approved','rejected','archived')),
  CONSTRAINT wa_templates_scope_check CHECK (
    (is_global = true AND hotel_id IS NULL) OR
    (is_global = false AND hotel_id IS NOT NULL)
  ),
  CONSTRAINT wa_templates_hotel_name_unique UNIQUE NULLS NOT DISTINCT (hotel_id, name)
);
CREATE INDEX idx_wa_templates_hotel ON wa_templates(hotel_id) WHERE hotel_id IS NOT NULL;
CREATE INDEX idx_wa_templates_global ON wa_templates(is_global) WHERE is_global = true;
CREATE INDEX idx_wa_templates_status ON wa_templates(hotel_id, status);
```

### 2.9 `feature_flags`

```sql
CREATE TABLE feature_flags (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  flag            VARCHAR(80) NOT NULL,            -- e.g. 'sentiment_detection'
  is_enabled      BOOLEAN NOT NULL DEFAULT false,
  config          JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT feature_flags_hotel_flag_unique UNIQUE (hotel_id, flag)
);
CREATE INDEX idx_feature_flags_hotel ON feature_flags(hotel_id);
```

`min_tier` per flag is **migration-managed** (lookup table or hardcoded const) — NOT stored per-hotel. `is_tier_locked` is computed at serialization time by joining with `hotels.tier_id → tiers.id`.

### 2.10 `billing_quotas` + `billing_invoices` + `billing_extras`

```sql
CREATE TABLE billing_quotas (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id                 UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  period_start             DATE NOT NULL,                       -- first day of month
  outbound_quota_total     INTEGER NOT NULL,                    -- snapshot of tier quota at period start
  outbound_used            INTEGER NOT NULL DEFAULT 0,
  threshold_80_emitted_at  TIMESTAMPTZ NULL,
  threshold_100_emitted_at TIMESTAMPTZ NULL,
  reset_at                 TIMESTAMPTZ NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT billing_quotas_hotel_period_unique UNIQUE (hotel_id, period_start)
);
CREATE INDEX idx_billing_quotas_hotel ON billing_quotas(hotel_id);
CREATE INDEX idx_billing_quotas_hotel_period ON billing_quotas(hotel_id, period_start DESC);

CREATE TABLE billing_invoices (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  invoice_number  VARCHAR(40) NOT NULL,
  period_start    DATE NOT NULL,
  period_end      DATE NOT NULL,
  amount_idr      DECIMAL(14,2) NOT NULL,
  status          VARCHAR(20) NOT NULL DEFAULT 'issued',         -- 'issued' | 'paid' | 'overdue' | 'void'
  pdf_url         VARCHAR(500) NULL,
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at         TIMESTAMPTZ NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT billing_invoices_status_check CHECK (status IN ('issued','paid','overdue','void')),
  CONSTRAINT billing_invoices_number_unique UNIQUE (invoice_number)
);
CREATE INDEX idx_billing_invoices_hotel ON billing_invoices(hotel_id, issued_at DESC);

CREATE TABLE billing_extras (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  type            VARCHAR(40) NOT NULL,                          -- 'outbound_pack' | 'extra_agent' | …
  qty             INTEGER NOT NULL,
  amount_idr      DECIMAL(14,2) NOT NULL,
  purchased_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ NULL
);
CREATE INDEX idx_billing_extras_hotel ON billing_extras(hotel_id, purchased_at DESC);
```

### 2.11 `ai_agent_configs`

```sql
CREATE TABLE ai_agent_configs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      UUID NOT NULL REFERENCES hotels(id) ON DELETE RESTRICT,
  agent_type    VARCHAR(40) NOT NULL,                            -- 'concierge'|'fnb'|'housekeeping'|…
  name          VARCHAR(80) NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  capacity      INTEGER NOT NULL DEFAULT 1,                      -- concurrent conversations
  config        JSONB NOT NULL DEFAULT '{}'::jsonb,              -- agent-specific knobs; AI service reads
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ai_agent_configs_hotel_type_unique UNIQUE (hotel_id, agent_type)
);
CREATE INDEX idx_ai_agent_configs_hotel ON ai_agent_configs(hotel_id);
CREATE INDEX idx_ai_agent_configs_hotel_active ON ai_agent_configs(hotel_id, is_active);
```

### 2.12 `voice_configs` (groundwork only — wave 2a per ADD-23)

```sql
CREATE TABLE voice_configs (
  hotel_id        UUID PRIMARY KEY REFERENCES hotels(id) ON DELETE CASCADE,
  pbx_type        VARCHAR(40) NULL,                              -- 'sip'|'twilio'|…
  config          JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT false,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.13 Cross-service FK summary

- **To Auth (same DB, FK enforced)**: `tickets.assigned_user_id`, `tickets.created_by`, `ticket_updates.actor_user_id`, `ticket_messages.sender_user_id`, `notifications.user_id`, `feature_flags.updated_by` all → `users(id)`. Every HC table's `hotel_id` → `hotels(id)`. Joins for tier-gating: `hotels h JOIN tiers t ON h.tier_id = t.id`.
- **To AI (separate DB, opaque)**: `ticket_messages.conversation_id` → AI's `conversations.id`. No DB FK; nullable. AI service writes the pointer when a conversation is spawned.
- **To Integration (separate DB)**: no FK. Integration reads `departments.telegram_chat_id` + `departments.supervisor_telegram_id` cross-DB (or via internal RPC if you keep them in fully separated DBs — see `shared/data-model.md` §1 for the recommended shared-DB option).

---

## 3. Socket events emitted by Hotel Core

Full catalog in `shared/socket-events.md`. Hotel Core emits:

| Event                         | When                                                                                              | Payload sketch                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `ticket:created`              | New ticket inserted (usually from AI service callback after AI classifies an incoming WA message) | `{ ticket: TicketSummary }`                     |
| `ticket:updated`              | Status change, priority change, assignment change                                                 | `{ ticket: TicketSummary, changed: string[] }`  |
| `ticket:escalated`            | Escalation worker promotes status to `escalated` or moves to L2/L3                                | `{ ticket_id, to_level: 'l2'\|'l3' }`           |
| `ticket:rerouted`             | `PATCH /api/tickets/:id/department` succeeds                                                      | `{ ticket_id, from_department_id, to_department_id }` |
| `verification:pending`        | New visit with `status: 'pending_verification'` created                                           | `{ visit_id, guest_id, hotel_id }`              |
| `verification:resolved`       | `verify-manual` or `reject` succeeds                                                              | `{ visit_id, status: 'checked_in'\|'rejected' }` |
| `verification:failed_3x`      | Background job marks visit `failed_verification` after 3 attempts                                 | `{ visit_id, attempts: 3 }`                     |
| `notification:new`            | Server persists a notification row                                                                | `{ notification: AppNotification }`             |
| `billing:threshold_reached`   | Quota meter crosses 80% or 100%                                                                   | `{ percent: 80\|100, type: 'outbound' }`        |
| `message:new` (cross-service) | AI service notifies Hotel Core of a new message; Hotel Core relays to socket                      | `{ ticket_id, message: TicketMessage }`         |

---

## 4. Background workers

| Worker                                  | Purpose                                 | Triggers                      |
| --------------------------------------- | --------------------------------------- | ----------------------------- |
| Auto-close `done_pending` → `closed`    | After 15 min idle                       | Per-ticket timer              |
| Escalation L1 → L2 → L3                 | When SLA breached                       | Per-ticket timer, dept config |
| Pending verification reminder           | Daily evening run                       | Cron                          |
| Failed 3x detection                     | After 3 failed AI verification attempts | Event-driven                  |
| Daily brief PDF generation              | Once per hotel per day                  | Cron, hotel timezone          |
| Quota meter check (outbound 80% / 100%) | On every outbound dispatch              | Event-driven (Integration RPC)|
| Monthly quota reset                     | First of month                          | Cron                          |
| Notification persist + push             | On any socket-event-worthy state change | Event-driven                  |

Place these alongside Hotel Core for simplicity. If your team prefers a separate worker process, fine — same code, separate runtime.

---

## 5. External dependencies

| Dependency                                        | Purpose                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------- |
| Object storage (S3 / R2)                          | menu item images, invoice PDFs, daily brief PDFs                          |
| PDF generator (wkhtmltopdf / Puppeteer / similar) | Invoices, daily brief, analytics export                                    |
| Excel generator (openpyxl / SheetJS)              | Analytics export                                                           |
| Email service (via Auth service, or directly)     | Outbound notifications when GM offline                                     |
| Auth service                                      | Session validation, user lookups for escalation tree, tier-join read       |
| AI service (internal RPC)                         | Trigger AI processing on new inbound message, receive enriched ticket back |
| Integration service (internal RPC)                | Dispatch outbound WA messages, query channel health, WA template relay     |

---

## 6. RBAC & tenant guard summary

Every list endpoint must apply two filters:

1. `WHERE hotel_id = session.hotel_id` (skipped for super_admin)
2. For `dept_head`: additional `WHERE department_id = session.dept_id` on tickets, knowledge, menu

PII masking applied at serialization time (see `01-auth-identity.md` §2.3).

Reject every non-list endpoint that targets a resource outside the session's hotel with `403 FORBIDDEN`.

**Per-endpoint RBAC matrix** (full table in API-CONTRACT §1.3; high-level):

| Endpoint family                     | super_admin | gm_admin | dept_head (own-dept)                  |
| ----------------------------------- | ----------- | -------- | ------------------------------------- |
| `/api/tickets` (read)               | all-access  | yes      | yes (auto-filter)                     |
| `/api/tickets/:id/status`           | yes         | yes      | yes (own-dept tickets)                |
| `/api/tickets/:id/department`       | yes         | yes      | NO (gm_admin only)                    |
| `/api/guests*`                      | yes         | yes      | NO                                    |
| `/api/visits*`                      | yes         | yes      | NO                                    |
| `/api/settings/departments*`        | yes         | yes      | NO                                    |
| `/api/settings/menu*`               | yes         | yes      | yes (dept-relevant content allowed)   |
| `/api/settings/knowledge*`          | yes         | yes      | yes (dept-relevant content allowed)   |
| `/api/wa-templates*`                | yes         | yes      | NO                                    |
| `/api/feature-flags*`               | yes         | yes      | NO                                    |
| `/api/settings/billing*`            | yes         | yes      | NO                                    |
| `/api/analytics/*` (tier=luxury)    | yes         | yes      | yes (own-dept slice)                  |
| `/api/notifications*`               | yes         | yes      | yes (own user only)                   |
| `/api/settings/agents*`             | yes         | yes      | NO                                    |
| `/api/settings/voice*`              | yes         | yes      | NO                                    |

`staff` role NEVER hits any of these — Telegram-only (no CRM session ever issued).

---

## 7. Error catalog (HC-specific extensions to the canonical envelope)

Canonical envelope: `README.md` §2.3. Hotel Core adds these `code` values inside the standard wrapper:

| HTTP | code                                | When                                                                |
| ---- | ----------------------------------- | ------------------------------------------------------------------- |
| 422  | `INVALID_TICKET_TRANSITION`         | State machine rejects requested status                              |
| 422  | `MIN_AGENTS_VIOLATION`              | Toggle would drop active agent count < 3                            |
| 422  | `FEATURE_FLAG_DEPENDENCY_VIOLATION` | Disabling flag would break active data (e.g. running campaign)      |
| 422  | `WA_TEMPLATE_LOCKED`                | Edit attempt on `approved` template                                 |
| 422  | `TIER_GATE`                         | Tier-restricted resource access (e.g. analytics for non-Luxury)     |
| 409  | `DEPARTMENT_IN_USE`                 | DELETE dept that has assigned users or open tickets                 |
| 409  | `CATEGORY_HAS_ITEMS`                | DELETE menu category with items                                     |
| 409  | `MENU_ITEM_OUT_OF_WINDOW`           | Item requested outside `available_window_*` (FE-facing; rare)       |
| 404  | `NOT_FOUND`                         | Cross-tenant access attempt (mask 403 as 404 to avoid enumeration)  |

---

## 8. Open questions

See `shared/open-questions.md`. Hotel Core-relevant:

- **Q-CONTRACT-08**: Feature flags shape
- **Q-CONTRACT-09**: WA templates lifecycle
- **Q-CONTRACT-10**: Operating hours + DND embedding (DND on Hotel — now Auth-owned)
- **Q-CONTRACT-11**: Escalation tree embedding
- **Q-CONTRACT-12**: Billing full shape
- **Q-CONTRACT-15**: Visit reject path (sub-action vs DELETE vs separate endpoint)
- **Q-CONTRACT-17**: Ticket `complaint_type` enum
- **Q-CONTRACT-19**: Failed-3x verification flow
- **Q-CONTRACT-20**: Manual visit create
- **Q-CONTRACT-21**: Analytics high-alert shape
- **Q-CONTRACT-25** (NEW H12): Integration CRUD moved to Integration service — see `04-integration-channels.md` §2.

> Q-CONTRACT-22/23/24 (hotels admin, tiers, admin users) are tracked under Auth — see `01-auth-identity.md` §7.
> Q-CONTRACT-07 (Integrations endpoints) reassigned to Integration service per H12.

---

## 9. Slot routing (3 devs — Nanak / Nathan / Satrio)

Matches `core-backend-qooma-hotel-ai/KICKOFF.md §1` post-H12 update.

| Slot       | Owner   | Scope                                                                                                                                |
| ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| A (Nanak) | Nanak  | **Foundation** — Prisma schema + initial migration, tenant-guard middleware, RBAC middleware, seed scripts, ticket-state-machine helper, common error handlers, multipart upload utility, CSV import utility |
| B (Nathan)  | Nathan   | **Core CRM** — tickets (+state machine + reroute + stats + overdue), ticket_updates, ticket_messages, guests + preferences, visits (pending + failed_3x + manual + checkin/checkout), notifications, socket emitters for `ticket:*` + `verification:*` + `notification:new` |
| C (Satrio) | Satrio  | **Settings + Analytics** — departments, menu + categories (CSV + bulk + multipart), knowledge + import, WA templates (incl. resubmit relay), feature flags (tier-gated), billing (quota meter + invoices + upgrade + daily brief), settings/agents (config), settings/voice (groundwork), all 8 analytics endpoints (Luxury gate) |

**Critical sequencing**: A ships first (foundation unblocks both B and C). B and C can run in parallel after A.

---

## 10. Phase 1 MSW reference

| What          | File                                                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Handlers      | `src/mocks/handlers/{tickets,guests,visits,analytics,settings,notifications,feature-flags,wa-templates,billing}.handlers.ts`              |
| Fixtures      | `src/mocks/fixtures/{tickets,guests,visits,departments,menu,knowledge,...}.ts`                                                            |
| FE services   | `src/services/{tickets,guests,visits,analytics,settings,notifications,...}.api.ts`                                                        |
| Types         | `src/types/api.ts`                                                                                                                        |
| Feature pages | `src/pages/_auth/*` (operational pages; `/admin/hotels` is Auth-owned, `/settings/integrations` is Integration-owned)                     |

When you implement an endpoint, the corresponding `src/mocks/handlers/<x>.handlers.ts` is the exact shape and behavior FE expects. Diff against it.
