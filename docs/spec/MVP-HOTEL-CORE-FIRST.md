# Backend MVP — Hotel Core Slice (H12 PO directive)

> **Audience**: backend engineer(s) building Hotel Core after Auth-first lands. This is the **second coherent slice** to implement — ship Hotel Core CRUD end-to-end so the FE flips from MSW to real backend on tickets/guests/visits/settings/notifications.
>
> **Authority**: derived from `02-hotel-core.md` (full HC surface) + `docs/API-CONTRACT.md` §2.2 / §2.3 / §2.4 / §2.5 / §2.6 / §2.8 / §2.9 / §2.12. Where this brief abbreviates, those are canonical.
>
> **Why Hotel Core second**: once Auth ships (per `MVP-AUTH-FIRST.md`), GMs can log in but every operational page (`/dashboard`, `/tickets`, `/guests`, `/settings/*`) still 404s against real backend. Hotel Core is the **operational meat** — landing it unlocks the entire CRM workflow against real data. AI and Integration follow.

---

## 1. What's in scope (Hotel Core MVP)

Endpoints grouped by capability. Each row is a discrete deliverable a single executor can ship in one PR.

### 1.1 Foundation (Slot A — Nathan, ships first)

| #   | Capability                                                  | Endpoint(s) / artifact                                                 |
| --- | ----------------------------------------------------------- | ---------------------------------------------------------------------- |
| F1  | Prisma schema + initial migration (13 HC tables + indexes)  | `prisma/schema.prisma` + first migration                               |
| F2  | Tenant-guard middleware (`hotel_id` from session everywhere) | `src/common/tenant-guard.ts`                                           |
| F3  | RBAC middleware (gm_admin / dept_head / super_admin)        | `src/common/rbac.ts`                                                   |
| F4  | Seed scripts (1 demo hotel + 5 depts + sample menu + KB)    | `prisma/seeds/hotel-core.seed.ts`                                      |
| F5  | Ticket state-machine helper (validates transitions)         | `src/modules/tickets/state-machine.ts`                                 |
| F6  | Common error handlers (canonical envelope + HC codes)       | `src/common/errors.ts`                                                 |
| F7  | Multipart upload utility (image to object storage)          | `src/common/upload.ts`                                                 |
| F8  | CSV import utility (used by menu + knowledge)               | `src/common/csv-import.ts`                                             |

### 1.2 Core CRM (Slot B — Nanak)

| #   | Capability                              | Endpoint(s)                                                                                 | Roles                    |
| --- | --------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------ |
| B1  | Tickets list + detail                   | `GET /api/tickets` · `GET /api/tickets/:id`                                                 | `gm_admin`, `dept_head`  |
| B2  | Ticket status transition + reroute      | `PATCH /api/tickets/:id/status` · `PATCH /api/tickets/:id/department`                       | `gm_admin`, `dept_head`  |
| B3  | Ticket stats + overdue                  | `GET /api/tickets/stats` · `GET /api/tickets/overdue`                                       | `gm_admin`, `dept_head`  |
| B4  | Guests CRUD + preferences               | `GET /api/guests` · `GET /api/guests/:id` · `PATCH /api/guests/:id` · `POST .../preferences`| `gm_admin`               |
| B5  | Guest messages history                  | `GET /api/guests/:id/messages`                                                              | `gm_admin`               |
| B6  | Visits list + pending verification flow | `GET /api/visits` · `PATCH /api/visits/:id/verify-manual`                                   | `gm_admin`               |
| B7  | Visit reject + failed_3x override       | `PATCH /api/visits/:id/reject` · `PATCH /api/visits/:id/approve-manual`                     | `gm_admin`               |
| B8  | Manual visit create                     | `POST /api/visits`                                                                          | `gm_admin`               |
| B9  | Notifications CRUD                      | `GET /api/notifications` · `GET .../unread-count` · `PATCH .../:id/read` · `POST .../mark-all-read` | all authenticated  |
| B10 | Socket emitters                         | `ticket:created` · `ticket:updated` · `ticket:escalated` · `ticket:rerouted` · `verification:*` · `notification:new` | n/a |

### 1.3 Settings + Analytics (Slot C — Satrio)

| #   | Capability                              | Endpoint(s)                                                                                          | Roles                   |
| --- | --------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------- |
| C1  | Departments CRUD                        | `GET, POST /api/settings/departments` · `PATCH, DELETE /api/settings/departments/:id`                | `gm_admin`              |
| C2  | Menu CRUD + categories                  | `GET, POST /api/settings/menu` · `PATCH, DELETE /api/settings/menu/:id` · `POST /categories` · `PATCH, DELETE /categories/:id` | `gm_admin`, `dept_head` |
| C3  | Menu bulk ops                           | `POST /api/settings/menu/import-csv` · `POST /api/settings/menu/bulk-availability`                   | `gm_admin`              |
| C4  | Knowledge CRUD + import                 | `GET, POST /api/settings/knowledge` · `PATCH, DELETE /api/settings/knowledge/:id` · `POST .../import`| `gm_admin`, `dept_head` |
| C5  | WA templates lifecycle                  | `GET, POST /api/wa-templates` · `PATCH, DELETE /api/wa-templates/:id` · `POST .../:id/resubmit`     | `gm_admin`              |
| C6  | Feature flags                           | `GET /api/feature-flags` · `PATCH /api/feature-flags/:flag`                                          | `gm_admin`              |
| C7  | Billing (overview + upgrade + invoice)  | `GET /api/settings/billing` · `POST /api/billing/upgrade-package` · `GET /api/billing/invoices/:id/download` · `GET /api/billing/daily-brief/latest.pdf` | `gm_admin` |
| C8  | Settings/agents config                  | `GET /api/settings/agents` · `PATCH /api/settings/agents/:id`                                        | `gm_admin`              |
| C9  | Settings/voice groundwork               | `GET, PUT /api/settings/voice` · `POST /api/settings/voice/test`                                     | `gm_admin`              |
| C10 | Analytics (8 endpoints, Luxury-gated)   | `/api/analytics/{overview,tickets,departments,peak-hours,top-requests,satisfaction,high-alert,export}` | `gm_admin`, `dept_head` (own-dept slice) |

### 1.4 Workers (Slot A — Nathan, after F1-F8)

| #   | Worker                                  | Trigger                                                                |
| --- | --------------------------------------- | ---------------------------------------------------------------------- |
| W1  | Auto-close `done_pending` → `closed`    | Per-ticket timer (15 min idle)                                         |
| W2  | Escalation L1 → L2 → L3                 | Per-ticket timer; reads `departments.escalation_chain`                 |
| W3  | Daily brief PDF generation              | Cron per hotel timezone                                                |
| W4  | Quota meter check (80% / 100%)          | Event-driven via Integration RPC                                       |
| W5  | Monthly quota reset                     | Cron, first of month                                                   |

**Workers may be deferred to a post-MVP wave** if the team prefers shipping the CRUD surface first. Tickets work without them (just no auto-close + no escalation timer); FE shows them via socket events when they fire.

---

## 2. Out of MVP Hotel Core slice (subsequent waves)

- **Promo campaigns** full lifecycle (status workflow, test-send, preview) — wave 2. MVP keeps the read-only list stub at `GET /api/settings/promos`.
- **Upsell rules** trigger engine — wave 2 / P2. MVP keeps the read-only list stub at `GET /api/settings/upsells`.
- **Pending verification reminder cron** — nice-to-have; manual review on dashboard card is enough for MVP.
- **Failed-3x detection worker** — the FE shows visits the AI marked failed via its own attempts counter. The worker that auto-marks `failed_verification` after the 3rd attempt can land later; until then, AI service marks the status directly via internal RPC.
- **Analytics export `application/octet-stream`** — if PDF/Excel generation is a heavy infra lift, ship the 7 read endpoints first and export later. FE shows a "Export coming soon" if `/export` 501s.
- **`menu_items.image_url` upload to object storage** — if S3/R2 isn't wired yet, accept multipart but store inline base64 in a JSONB column temporarily; swap to object-storage URLs later without FE change (FE just renders `<img src={url}>`).
- **`GET /api/billing/daily-brief/latest.pdf`** — the PDF generator can land after the core billing endpoint. FE renders the "Daily brief belum tersedia" empty state if missing.
- **`voice_configs`** persistence — keep the stub endpoint (always returns empty + `pbx_type: null`); real PBX config is wave 2a per ADD-23.7.
- **AI service integration** for ticket creation from inbound WA — until AI ships, seed tickets manually via fixtures + admin endpoint. The shape stays the same.
- **Integration service** for outbound WA + escalation Telegram pings — workers W2 / W4 / W5 stub the RPC and log instead of dispatching. Real wire-up when Integration ships.

---

## 3. DB migration order (greenfield, Hotel Core slice)

> Assumes Auth-first slice has already shipped: `tiers`, `hotels`, `users`, `sessions`, `password_reset_tokens` exist in the same Postgres DB. HC migrations FK to those tables.

1. **`departments`** — needed first because `users.dept_id` FK from Auth's schema can finally resolve (was nullable until now).
2. **`guests`** + **`guest_preferences`** (preferences depends on guests).
3. **`visits`** (depends on guests).
4. **`tickets`** (depends on guests, departments, users).
5. **`ticket_updates`** + **`ticket_messages`** (depend on tickets, users).
6. **`notifications`** (depends on users).
7. **`menu_categories`** + **`menu_items`** (items depends on categories).
8. **`knowledge_entries`**.
9. **`wa_templates`**.
10. **`feature_flags`** + seed default flags off for each existing hotel (Lite-tier-aware).
11. **`billing_quotas`** + **`billing_invoices`** + **`billing_extras`** + seed current-month quota row per hotel.
12. **`ai_agent_configs`** + seed 3 default agents per hotel (min-3 rule).
13. **`voice_configs`** (stub).

Each migration is forward-only. Indexes per DDL in `02-hotel-core.md` §2.

---

## 4. Critical correctness checks (don't skip)

**4.1 Tenant guard everywhere** — every read/write goes through `WHERE hotel_id = :sessionHotelId`. Super_admin bypass is an explicit branch. NEVER trust `hotel_id` from URL/body.

**4.2 Ticket state machine** — only valid transitions per `02-hotel-core.md` §1.2 diagram. Reject everything else with `422 INVALID_TICKET_TRANSITION`. Centralize in `state-machine.ts`; don't sprinkle if/else in handlers.

**4.3 Min-3 active agents** — `PATCH /api/settings/agents/:id` that would drop active count < 3 → `422 MIN_AGENTS_VIOLATION`. Compute in a transaction (`SELECT FOR UPDATE`) to avoid race.

**4.4 Tier-gated analytics** — every `/api/analytics/*` checks `hotel.tier === 'luxury'` (via the join pattern). FE has a guard but backend MUST 403 independently.

**4.5 PII masking on serialization** — wa_phone, name, email masked when `guest.privacy_mode = 'vvip' AND viewer.role !== 'gm_admin'` (super_admin counts as gm_admin via all-access). Compound predicate per Q-CONTRACT-16. Format: `+62812***6789`, `B***`, `b***@example.com`. Apply at the response serializer layer, not handler-by-handler.

**4.6 dept_head scoping** — list endpoints (tickets, knowledge, menu where dept-relevant) auto-filter to `WHERE department_id = session.dept_id` for dept_head. Mutating endpoints (PATCH/DELETE) check ownership before write — return `404 NOT_FOUND` (not 403) on cross-dept access attempt to avoid resource enumeration.

**4.7 Feature flag dependencies** — disabling `menu_ordering` when active campaigns reference it → `422 FEATURE_FLAG_DEPENDENCY_VIOLATION`. Compute `depends_on_active_data` at read time so FE can show "3 campaigns using this" preview.

**4.8 WA template approved lock** — `PATCH /api/wa-templates/:id` on `status = 'approved'` row → `422 WA_TEMPLATE_LOCKED`. Only `pending` and `rejected` are editable. `archived` is read-only.

**4.9 Atomic visit verification** — `verify-manual` updates `visits.status` AND emits `verification:resolved` in the SAME transaction as the audit log entry. No partial state visible to readers.

**4.10 Ticket number generation** — `ticket_number` is `<DEPT_CODE>-<YYMM>-<SEQ>` (e.g. `HSK-2606-048`). Sequence resets monthly per dept. Use a per-dept `nextval()`-style counter, NOT a global one (otherwise dept_head sees weird gaps).

**4.11 Cascade discipline on department delete** — `DELETE /api/settings/departments/:id` MUST refuse with `409 DEPARTMENT_IN_USE` if any user has that `dept_id` or any open ticket has `department_id = :id`. Soft-delete via `is_active = false` if you want a "hide but keep history" path; never hard-delete a dept that has tickets in its audit trail.

---

## 5. Acceptance criteria (when Hotel Core MVP is "done")

A test pass per role:

- [ ] **GM creates a department** — `POST /api/settings/departments` with valid body returns `201 { department }`. The dept appears in `GET /api/settings/departments`. The `users.dept_id` FK can now reference it.
- [ ] **GM creates a guest manually** — implicit via inbound WA OR via test fixture. `GET /api/guests/:id` returns profile + empty preferences + empty visits.
- [ ] **GM creates a manual visit** — `POST /api/visits` returns `Guest` with the new visit appended; status `pending_verification`.
- [ ] **GM approves the visit** — `PATCH /api/visits/:id/verify-manual { guest_name, room_number, nights }` returns the visit with status `checked_in`. Socket emit observed by FE (or test client).
- [ ] **AI service creates a ticket** (mock via direct insert or RPC stub) — `GET /api/tickets/:id` returns full detail with empty updates + empty messages. `ticket_messages.conversation_id` can be NULL OR a UUID (FE handles both).
- [ ] **GM transitions ticket** — `PATCH /api/tickets/:id/status { status: 'in_progress' }` succeeds. Invalid transition (e.g. `open → closed`) returns `422 INVALID_TICKET_TRANSITION`.
- [ ] **GM reroutes ticket** — `PATCH /api/tickets/:id/department { department_id: <other-dept> }` succeeds; `ticket_updates` shows `type: 'reroute'`. dept_head trying the same → `403 FORBIDDEN`.
- [ ] **dept_head scope enforced** — log in as dept_head of dept A. `GET /api/tickets` returns ONLY dept-A tickets. Direct GET of a dept-B ticket → `404 NOT_FOUND` (not 403).
- [ ] **PII masking** — log in as dept_head. Guest with `privacy_mode='vvip'` shows masked wa_phone + name + email. Log in as gm_admin (or super_admin), same guest shows unmasked values.
- [ ] **Min-3 agent guard** — try toggling a 3rd active agent to `is_active: false` → `422 MIN_AGENTS_VIOLATION`. Add a 4th first, then toggling works.
- [ ] **Tier gate on analytics** — gm_admin of a `professional`-tier hotel calls `GET /api/analytics/overview` → `403 TIER_GATE`. Same call on a `luxury`-tier hotel → 200 with data.
- [ ] **Menu CSV import** — upload a CSV with 10 items via `POST /api/settings/menu/import-csv` → response summary `{ imported: 10, skipped: 0, errors: [] }`. Items appear in `GET /api/settings/menu`.
- [ ] **WA template lifecycle** — POST a template → `status: 'pending'`. (Mock) Meta webhook → status flips to `approved`. PATCH attempt → `422 WA_TEMPLATE_LOCKED`. DELETE archives it.
- [ ] **Notifications optimistic update** — FE marks-all-read; backend persists; subsequent `GET /api/notifications/unread-count` returns `{ count: 0 }`.
- [ ] **Socket emits observed** — connect a socket client, perform each mutation, verify the corresponding event arrives (`ticket:updated`, `verification:resolved`, etc.).

---

## 6. How to verify against the FE

The FE has been running on MSW since H1. Once HC MVP ships, the FE can flip `VITE_USE_MOCKS=false VITE_API_BASE_URL=<your-backend>` and exercise these endpoints against real data:

**Pages that should work after HC MVP**:

- `/dashboard` (tickets stats, overdue, pending verification, failed_3x, notifications rail)
- `/tickets` (list + filters + cursor pagination)
- `/tickets/:id` (detail with messages + updates + status transitions + reroute)
- `/guests` (list + search)
- `/guests/:id` (profile + preferences + visits + ticket history)
- `/settings/departments` (CRUD with escalation tree)
- `/settings/menu` (CRUD + categories + CSV)
- `/settings/knowledge` (CRUD + import)
- `/settings/wa-templates` (CRUD + Meta lifecycle)
- `/settings/agents` (config toggles with min-3 enforcement)
- `/settings/billing` (overview + quota + invoices + daily brief download)
- `/settings/voice` (stub)
- `/analytics` (Luxury hotels only, all 8 endpoints)
- Notifications dropdown in TopBar

**Pages that will still 404** (need AI + Integration):

- `/settings/integrations` (Integration service — see `04-integration-channels.md`)
- AI handover banner on ticket detail (AI service)

The FE MSW handlers (`src/mocks/handlers/*.ts`) are the authoritative shape reference for everything in this slice. If your real backend response differs in shape, FE breaks — match the MSW handler exactly (or coordinate the shape change via `shared/open-questions.md`).

---

## 7. Hand-off checklist (when this slice is ready for FE integration)

- [ ] All endpoints in §1 implemented and respond per `02-hotel-core.md` shapes.
- [ ] Prisma migrations applied (Auth + HC tables in the same DB).
- [ ] Seed scripts create demo hotel + 5 depts + sample menu + 3 default agents.
- [ ] Tenant-guard + RBAC middleware on every route.
- [ ] PII masking middleware enforced (test via dept_head + vvip guest).
- [ ] Ticket state machine validated (negative-test invalid transitions).
- [ ] Socket gateway wired; emissions verified via test client.
- [ ] Worker for auto-close + escalation either implemented OR explicitly deferred (with FE notified — they will fall back to manual close).
- [ ] CORS origin + cookie domain compatible with Auth slice's setup.
- [ ] `shared/open-questions.md` ratifications for Q-CONTRACT-08/09/10/11/12/15/17/19/20/21 + new Q-CONTRACT-25 (integration CRUD moved).
- [ ] Object storage configured for menu images + invoice PDFs + daily brief PDFs (or a documented fallback path).

Once these are green, the FE integration window opens — flip `VITE_USE_MOCKS=false` and run through the AC checklist with the real backend.

---

## 8. Reading order for the implementing engineer

If you're picking this up fresh:

1. **`README.md`** (this folder) — §2 cross-service contracts + §2.1a service ownership table.
2. **`MVP-AUTH-FIRST.md`** — Auth must ship first; understand its surface so HC can FK to it correctly.
3. **This file** — for the scope + AC.
4. **`02-hotel-core.md`** — full HC surface with DDL + indexes + RBAC + socket catalog.
5. **`docs/API-CONTRACT.md`** §2.2 / §2.3 / §2.4 / §2.5 / §2.6 / §2.8 / §2.9 / §2.12 — canonical contract; FE's MSW is built against this.
6. **`shared/data-model.md`** — ERD + table ownership matrix + FK rules.
7. **`shared/open-questions.md`** — Q-CONTRACT-08..21 ratifications + new Q-25.
8. **`src/mocks/handlers/*.ts`** in the FE repo — the literal shape reference. Match it.

---

## 9. Slot routing recap

| Slot       | Owner   | Deliverables in this MVP                                                                                              |
| ---------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| A (Nathan) | Nathan  | F1–F8 foundation, W1–W5 workers (or deferred)                                                                         |
| B (Nanak)  | Nanak   | B1–B10 core CRM                                                                                                       |
| C (Satrio) | Satrio  | C1–C10 settings + analytics                                                                                           |

A ships first (1–2 weeks). B and C run in parallel (2–3 weeks). Workers can land in a follow-up if time-boxed.
