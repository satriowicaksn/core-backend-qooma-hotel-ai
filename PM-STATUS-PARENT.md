# PM-STATUS-PARENT — Qooma Backend (cross-dev roll-up)

> **Parent PM tracker.** Read-only buat Executor & PM A/B/C kecuali bagian roll-up yang explicit dipost oleh PM A/B/C. Parent PM authority untuk section §1, §3, §4, §5, §6, §7, §8. PM A/B/C append baris short ke §2 setelah tiap APPROVE (per `PM-AGENT.md §0.8`).
>
> Detail per-dev assignment (ASSIGNMENT → PLAN → SUBMIT → VERDICT) tinggal di **`PM-STATUS-A.md`** (Nathan), **`PM-STATUS-B.md`** (Nanak), **`PM-STATUS-C.md`** (Satrio).
>
> Komunikasi PO ↔ Parent PM ↔ PM A/B/C ↔ Executor semua via git-synced markdown. Tidak ada DM kecuali eskalasi formal (lihat §9).
>
> **Identity check**: setiap session WAJIB sebut role + slot di response pertama (lihat `KICKOFF.md §4`).

---

## 0. Current focus (global)

- **Day**: H12+ (post-Auth bootstrap; Hotel Core handover landed 2026-06-29)
- **Phase**: Bootstrap / pre-T01 — authoritative spec live di [`docs/spec/MVP-HOTEL-CORE-FIRST.md`](./docs/spec/MVP-HOTEL-CORE-FIRST.md) (Slice 2 of 3 backend MVP slices)
- **Active gate**: G1 — Boilerplate + Prisma schema ready (kriteria default `PM-AGENT.md §5`; PO konfirmasi)
- **Active devs**: Nanak covering slot A (T01–T03 unblocker chain) + slot B eventually. Nathan + Satrio not yet onboard — Nanak drives foundation until they join.
- **Progress (global)**: 0 / 30 task assigned (T01–T03 + T11 + T21 active per below; T04–T10, T12–T20, T22–T30 backlog — Parent PM release per gate)
- **Reading order untuk fresh dev**: `KICKOFF.md` → `docs/SERVICE-CHARTER.md` → `docs/spec/MVP-HOTEL-CORE-FIRST.md` → `docs/spec/02-hotel-core.md` (full DDL + RBAC) → `docs/spec/data-model.md` → `docs/spec/open-questions.md` → claim task di §8 / §1a

> **H12 PO rulings baked in (2026-06-29)**: integrations CRUD MOVED → Integration repo (Q-OPS-03 resolved); Satrio's bucket retains WA-template Meta-callback only. Q-CONTRACT-25 + Q-OPS-06 NEW (Telegram per-dept write-through — see `docs/spec/open-questions.md`).

---

## 1. Global task tracker (Parent PM authority)

> Otoritas Parent PM untuk edit row in-place. Status: `backlog` | `assigned` | `wip` | `submit-pending` | `approved` | `rejected` | `escalated`.
>
> Setiap task **wajib** punya kolom **Slot** untuk routing ke PM A/B/C. ID `T##` di-issue oleh PO atau Parent PM dari §1a pre-G1 queue.

| T## | Title                                                                            | Slot | Owner   | Status   | Verified by | Notes                                              |
| --- | -------------------------------------------------------------------------------- | ---- | ------- | -------- | ----------- | -------------------------------------------------- |
| T01 | `make check` green dari boilerplate (lint + typecheck + format)                  | A    | Nanak (covering) | approved | PM A (Nanak covering) | Fixed via env upgrade (Node 20+pnpm 9), ts-node@10 dep, tsconfig ts-node override — see PM-STATUS-A.md §2 |
| T02 | Prisma schema initial migration (13 HC tables + indexes per §2 DDL)              | A    | Nanak (covering) | approved | PM A (Nanak covering) | Applied via 2 migrations (init + CHECK/partial-idx). DEV deviation: fresh `hotel_core_dev` DB (Opsi C) instead of shared `app` DB — see §4. UNBLOCKS T04–T30 impl (except tier-gated T26/T30 pending shared-DB restore) |
| T03 | Tenant-guard middleware (`hotel_id` from session everywhere)                     | A    | Nanak (covering) | assigned | —           | After T02; Nanak covers                            |
| T04 | RBAC middleware (gm_admin / dept_head / super_admin all-access)                  | A    | Nathan  | backlog  | —           | After T03                                          |
| T05 | Seed scripts (1 demo hotel via Auth API + 5 depts + sample menu + KB)            | A    | Nathan  | backlog  | —           | After T04                                          |
| T06 | Ticket state-machine helper + unit-test the transition table                     | A    | Nathan  | backlog  | —           | Parallel-friendly after T01                        |
| T07 | Common error handlers (HC-specific codes per spec §7)                            | A    | Nathan  | backlog  | —           | After T01                                          |
| T08 | Multipart upload utility (S3 / R2 abstraction)                                   | A    | Nathan  | backlog  | —           | After T01                                          |
| T09 | CSV import utility (used by menu + knowledge)                                    | A    | Nathan  | backlog  | —           | After T01                                          |
| T10 | Workers harness (cron + queue) — actual workers wired per B/C tasks              | A    | Nathan  | backlog  | —           | After T02                                          |
| T11 | Tickets list + detail (GET endpoints + filters + cursor pagination)              | B    | Nanak   | assigned | —           | Spec reading + module skeleton OK; impl blocked on T02 |
| T12 | Ticket status transition + reroute (state-machine-validated)                     | B    | Nanak   | backlog  | —           | After T11 + T06                                    |
| T13 | Ticket stats + overdue                                                           | B    | Nanak   | backlog  | —           | After T11                                          |
| T14 | Guests CRUD + preferences                                                        | B    | Nanak   | backlog  | —           | After T02                                          |
| T15 | Guest messages history                                                           | B    | Nanak   | backlog  | —           | After T14                                          |
| T16 | Visits list + pending verification flow                                          | B    | Nanak   | backlog  | —           | After T02                                          |
| T17 | Visit reject + failed_3x override                                                | B    | Nanak   | backlog  | —           | After T16                                          |
| T18 | Manual visit create                                                              | B    | Nanak   | backlog  | —           | After T16                                          |
| T19 | Notifications CRUD + optimistic ops                                              | B    | Nanak   | backlog  | —           | After T02                                          |
| T20 | Socket emitters (`ticket:*` + `verification:*` + `notification:new`)             | B    | Nanak   | backlog  | —           | After T11 + T16 + T19                              |
| T21 | Departments CRUD (escalation tree + operating hours)                             | C    | Satrio  | assigned | —           | Spec reading + module skeleton OK; impl blocked on T02 |
| T22 | Menu CRUD + categories + multipart image                                         | C    | Satrio  | backlog  | —           | After T02 + T08                                    |
| T23 | Menu bulk ops (CSV + bulk availability)                                          | C    | Satrio  | backlog  | —           | After T22 + T09                                    |
| T24 | Knowledge CRUD + CSV import                                                      | C    | Satrio  | backlog  | —           | After T02 + T09                                    |
| T25 | WA templates lifecycle + Meta-callback ingest                                    | C    | Satrio  | backlog  | —           | After T02                                          |
| T26 | Feature flags (tier-gated, dependency check)                                     | C    | Satrio  | backlog  | —           | After T02; needs Auth `hotels.tier_id` join        |
| T27 | Billing (overview + upgrade + invoice + daily brief)                             | C    | Satrio  | backlog  | —           | After T02                                          |
| T28 | Settings/agents config (min-3 enforcement)                                       | C    | Satrio  | backlog  | —           | After T02                                          |
| T29 | Settings/voice groundwork stub                                                   | C    | Satrio  | backlog  | —           | After T02                                          |
| T30 | Analytics 8 endpoints (Luxury-gated + export)                                    | C    | Satrio  | backlog  | —           | After T02; tier-join required                      |

### 1a. Pre-G1 bootstrap queue (MIRRORED into §1 on 2026-06-29 — kept here as spec-driven reference; §1 is the live tracker)

| Suggested T## | Title                                                                    | Slot | Spec ref                                          |
| ------------- | ------------------------------------------------------------------------ | ---- | ------------------------------------------------- |
| T01           | `make check` green dari boilerplate (lint + typecheck + format)          | A    | F1 prep                                           |
| T02           | Prisma schema initial migration (13 HC tables + indexes)                 | A    | F1 — `docs/spec/02-hotel-core.md` §2 DDL          |
| T03           | Tenant-guard middleware (`hotel_id` from session everywhere)             | A    | F2                                                |
| T04           | RBAC middleware (gm_admin / dept_head / super_admin all-access)          | A    | F3                                                |
| T05           | Seed scripts (1 demo hotel via Auth API + 5 depts + sample menu + KB)    | A    | F4                                                |
| T06           | Ticket state-machine helper + unit-test the transition table             | A    | F5                                                |
| T07           | Common error handlers (HC-specific codes per spec §7)                    | A    | F6                                                |
| T08           | Multipart upload utility (S3 / R2 abstraction)                           | A    | F7                                                |
| T09           | CSV import utility (used by menu + knowledge)                            | A    | F8                                                |
| T10           | Workers harness (cron + queue) — actual workers wired per B/C tasks      | A    | F8 follow-up                                      |
| T11           | Tickets list + detail (GET endpoints + filters + cursor pagination)      | B    | B1                                                |
| T12           | Ticket status transition + reroute (state-machine-validated)             | B    | B2                                                |
| T13           | Ticket stats + overdue                                                   | B    | B3                                                |
| T14           | Guests CRUD + preferences                                                | B    | B4                                                |
| T15           | Guest messages history                                                   | B    | B5                                                |
| T16           | Visits list + pending verification flow                                  | B    | B6                                                |
| T17           | Visit reject + failed_3x override                                        | B    | B7                                                |
| T18           | Manual visit create                                                      | B    | B8                                                |
| T19           | Notifications CRUD + optimistic ops                                      | B    | B9                                                |
| T20           | Socket emitters (`ticket:*` + `verification:*` + `notification:new`)     | B    | B10                                               |
| T21           | Departments CRUD (escalation tree + operating hours)                     | C    | C1                                                |
| T22           | Menu CRUD + categories + multipart image                                 | C    | C2                                                |
| T23           | Menu bulk ops (CSV + bulk availability)                                  | C    | C3                                                |
| T24           | Knowledge CRUD + CSV import                                              | C    | C4                                                |
| T25           | WA templates lifecycle + Meta-callback ingest                            | C    | C5                                                |
| T26           | Feature flags (tier-gated, dependency check)                             | C    | C6                                                |
| T27           | Billing (overview + upgrade + invoice + daily brief)                     | C    | C7                                                |
| T28           | Settings/agents config (min-3 enforcement)                               | C    | C8                                                |
| T29           | Settings/voice groundwork stub                                           | C    | C9                                                |
| T30           | Analytics 8 endpoints (Luxury-gated + export)                            | C    | C10                                               |

---

## 2. Per-dev short-status roll-up (PM A/B/C append, latest di atas)

> Setiap PM A/B/C post **1-2 baris** summary ke sini setelah tiap VERDICT atau end-of-session. Parent PM scan ini untuk daily report. JANGAN paste full SUBMIT/VERDICT di sini — itu tetap di PM-STATUS-{slot}.md.
>
> Format:
> ```
> [YYYY-MM-DD H{N}] [PM <SLOT> <NAME>] <T## status — 1 liner>
> ```

[2026-07-01 H0] [PM A Nanak covering] T02 Prisma init migration APPROVED (attempt 1) — 18 HC tables + 19 CHECK + 11 partial/GIN indexes applied. DEV Opsi C deviation (fresh `hotel_core_dev` DB) logged in §4. UNBLOCKS T03–T30 impl chain (except T26/T30 tier-gated features pending Opsi A restore).
[2026-07-01 H0] [PM A Nanak covering] T01 boilerplate `make check` APPROVED (attempt 1) — env upgraded Node 20/pnpm 9, ts-node@10 added, tsconfig ts-node override for jest config parser. All 4 gates green.

<!-- TEMPLATE:
[2026-06-25 H3] [PM A Nathan] T01 boilerplate scaffold APPROVED (attempt 2) — make check green, 0 drift hits.
[2026-06-25 H3] [PM B Nanak]  T02 auth module wip — PLAN ACK'd, executor implementing JWT issuance.
[2026-06-25 H3] [PM C Satrio] T03 webhook plugin REJECT (attempt 1) — HMAC verify di middle of handler, harus plugin-level.
-->

---

## 3. Open questions register (consolidated)

> Parent PM consolidate dari PM A/B/C. PM A/B/C juga boleh edit row mereka sendiri (status update). Resolve = PO action.

### 3a. Contract questions (target: resolved sebelum G2; frozen setelah G3)

| ID            | Question | Raised by | Source         | Status | Resolution |
| ------------- | -------- | --------- | -------------- | ------ | ---------- |
| —             | —        | —         | —              | —      | —          |

### 3b. Package / tooling questions

| ID            | Question | Raised by | Source         | Status | Resolution |
| ------------- | -------- | --------- | -------------- | ------ | ---------- |
| —             | —        | —         | —              | —      | —          |

### 3c. Architecture / planning questions

| ID            | Question | Raised by | Source         | Status | Resolution |
| ------------- | -------- | --------- | -------------- | ------ | ---------- |
| —             | —        | —         | —              | —      | —          |

---

## 4. Approved deviations & planning updates (PO-approved)

> Parent PM mencatat tiap perubahan ke planning docs yang dilakukan untuk sync (per `PM-AGENT.md §0.6`), serta deviasi one-off yang di-approve PO. PM A/B/C tidak edit row di sini — propose via §3 atau direct ke Parent PM.

| Tanggal    | Doc / lokasi                                                       | Perubahan singkat                                                                                 | Driver task    | Disetujui oleh |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| 2026-06-12 | docker-compose.yml, .env.example, README.md, .claude/settings.json | Shift host port Postgres 5432→5433 & Redis 6379→6380 untuk hindari bentrok dengan service lokal | (pre-T01 fix)  | PO             |
| 2026-07-01 | PARENT §1 T01–T03 Owner column                                     | Temporary reassign Nathan→Nanak (foundation unblocker chain — Nathan+Satrio not yet onboard, verbal consent from all devs) | T01, T02, T03  | Parent PM (solo Nanak) |
| 2026-07-01 | `.env` DATABASE_URL (dev-only)                                     | Opsi C: HC DEV uses fresh `hotel_core_dev` DB instead of shared `app` DB (which contains Auth+AI data). Reason: avoid destructive `prisma migrate reset` on Auth data when HC's schema.prisma reference stubs (Hotel/User with id-only) conflict with actual Auth tables. Trade-off: cross-DB FK impossible → HC's `tickets.hotelId` points to id-only stub, not real Auth `hotels`. Tier-gated features (T26/T30) blocked at DEV until shared-DB restored. **MUST revisit before staging/prod** — recommendation: Prisma multi-schema (previewFeatures=["multiSchema"]) with HC in `hotel_core` schema + Auth in `public` schema, in shared DB. | T02 | Parent PM (solo Nanak) |
| —          | —                                                                  | —                                                                                                 | —              | —              |

---

## 5. Gates (Parent PM enforce, PO define)

> Default kriteria di `PM-AGENT.md §5`. PO override di sini bila perlu.

| Gate | Target H | Criteria (recap)                                                                                       | Status      | Notes |
| ---- | -------- | ------------------------------------------------------------------------------------------------------ | ----------- | ----- |
| G1   | TBD      | Boilerplate ready: `make check` hijau, `make start` jalan, `_template` jalan, ADR lengkap              | not started | PO konfirmasi timeline |
| G2   | TBD      | Modul auth + 1 modul business jalan (CRUD lengkap + 1 external integration). Coverage ≥ 80%            | not started | —     |
| G3   | TBD      | Semua endpoint kontrak terimplementasi. Webhook HMAC tervalidasi. CI hijau                             | not started | —     |
| G4   | TBD      | Feature freeze — hanya bugfix                                                                          | not started | —     |
| G5   | TBD      | UAT pass. AC P0 = 100%. Migrasi prod siap. Runbook lengkap di `docs/runbooks/`                          | not started | —     |

---

## 6. Parent standup log (latest di atas)

> Parent PM consolidate dari 3 standup PM A/B/C (yang masing-masing tinggal di PM-STATUS-{slot}.md §6).
>
> Format:
> ```
> QOOMA BE PARENT — Standup — H{N}/{total}
>
> Dev A (Nathan) — <1-2 baris ringkas dari PM A standup>
> Dev B (Nanak)  — <1-2 baris ringkas dari PM B standup>
> Dev C (Satrio) — <1-2 baris ringkas dari PM C standup>
>
> 📅 Gate status
> - Next gate: G{N} di H{X} — <on track | at risk | slipping>
>
> 🚨 Eskalasi ke PO
> - <satu baris ask>
>
> 🎯 Fokus besok (cross-dev)
> - <re-balance / dependency unblock / shared-infra ship>
> ```

### H0 — 2026-06-12 (bootstrap, pre-multi-dev kickoff)

```
QOOMA BE PARENT — Standup — H0 (bootstrap)

Dev A (Nathan) — belum onboard, awaiting kickoff
Dev B (Nanak)  — belum onboard, awaiting kickoff
Dev C (Satrio) — belum onboard, awaiting kickoff

📅 Gate status
- Next gate: G1 (Boilerplate ready) — kriteria default; PO konfirmasi timeline
- Open contract questions: 0
- Open package questions: 0

🚨 Eskalasi ke PO
- Konfirmasi timeline + gate definition (G1..G5 default vs custom)
- Konfirmasi roadmap awal (T01–T##) untuk distribute ke 3 dev

🎯 Fokus besok / next session
- Setelah PO konfirmasi: Parent PM post first ASSIGNMENT batch,
  PM A/B/C onboard + identitas confirmed, executor session start.
```

---

## 7. Cross-dev incidents / lessons (Parent PM scope — affects >1 dev)

### 2026-06-12 — Docker port collision (pre-T01)

**What happened**: `make start` gagal — port 5432 host sudah dipakai service Postgres lokal user. Error: `Bind for 0.0.0.0:5432 failed: port is already allocated`.

**Fix**: Shift host port di `docker-compose.yml` — Postgres 5432→5433, Redis 6379→6380. Container internal port tetap default (5432/6379) supaya service di compose network tidak butuh perubahan. Updated: `docker-compose.yml`, `.env.example`, `.env` user, `README.md` quick-start note, `.claude/settings.json` MCP postgres DATABASE_URL.

**Tidak diubah**: `.github/workflows/ci.yml` (CI runner fresh, no collision), `docs/TESTING.md` (testcontainers pakai `getMappedPort()` random ephemeral).

**Lesson for tim**: bila task touch local dev port, cek dulu via `lsof -i :<port>` apakah ada bentrok sebelum tetap pakai default.

---

## 8. Next-up queue (Parent PM authority)

> Parent PM rewrite list ini ketika roadmap berubah. Each task **wajib** kolom Slot (A/B/C) untuk routing. PM A/B/C baca queue ini untuk lihat upcoming work — PM A/B/C tidak edit queue.

_(belum ada — tunggu PO post task / roadmap awal)_

<!-- TEMPLATE — copy untuk task baru di queue:

### T## — <Title>

- **Slot**: A | B | C (Parent PM assign)
- **Owner**: TBD (PM <SLOT> pick up via PM-STATUS-<SLOT>.md §2 ASSIGNMENT)
- **Started**: —
- **Status**: queued

#### Scope (dari roadmap / DEVELOPMENT-PLAN bila ada)
- ...

#### Files yang harus dibuat
- ...

#### Files yang akan dimodifikasi
- ...

#### T## DoD
- [ ] ...
- [ ] ...

#### Parent PM notes untuk PM <SLOT>
- Rasionalisasi slot pick: <kenapa A/B/C>
- Dependency: T## (slot X, status)
- Shared-infra risk: <none | flags file/folder shared dengan slot lain>
- Coordination needed with: <slot> for <reason>

-->

---

## 9. Eskalasi rules (recap)

DM PO langsung HANYA bila:

1. Gate (G1..G5) akan miss dalam 24 jam — Parent PM call
2. Open contract Q blocking > 48 jam — consolidated
3. Executor (via PM A/B/C) propose scope/architecture change — Parent PM ratify dulu
4. Forbidden package / pattern muncul di PR (CLAUDE.md §6 / §11)
5. Drift sistemik (>5 hits sejenis di banyak file lintas dev)
6. Security WAJIB (CLAUDE.md §6) tersentuh — Parent PM eskalasi instan

Routine miss / single drift / daily standup → PM-STATUS-{slot} → roll-up
ke §2 / §6 di sini, **bukan** ke PO langsung.

---

## 10. Cross-dev coordination notes

> Parent PM catat hal yang affect > 1 dev: file collision, shared-infra ship sequence, re-balance proposal, dependency unblocking. PM A/B/C boleh propose via §3c (architecture Q).

| Tanggal | Topic                                         | Affects        | Action / decision                         |
| ------- | --------------------------------------------- | -------------- | ----------------------------------------- |
| —       | —                                             | —              | —                                         |

<!-- Contoh:
2026-06-30 | core/queue/ Bull factory pattern decision | B, C | A ship dulu (T05), B & C unblocked H+1
2026-07-02 | shared/utils/crypto.ts signature change | A, B          | A coord with B; B re-test webhook (T11)
-->

---

## 11. Quick reference — file ownership matrix

| File / Folder                                            | Edit authority                                                                                             |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `PM-STATUS-PARENT.md`                                    | Parent PM (full) · PM A/B/C (only append to §2 roll-up & §6 standup; status update for own row in §1)      |
| `PM-STATUS-A.md`                                         | PM A (Nathan) + Executor A (assignment/PLAN/CHECKPOINT/SUBMIT only — append-only)                          |
| `PM-STATUS-B.md`                                         | PM B (Nanak) + Executor B (same)                                                                           |
| `PM-STATUS-C.md`                                         | PM C (Satrio) + Executor C (same)                                                                          |
| `CLAUDE.md`, `PM-AGENT.md`, `EXECUTOR-PROTOCOL.md`, `KICKOFF.md`, `README.md`, `docs/*`, `docs/decisions/*` | Planning agent (with PO ack) · Parent PM (sync update per `PM-AGENT.md §0.6`)                              |
| `src/`, `prisma/migrations/`                             | Executor A/B/C (each in own task scope) — never PM/Parent PM                                               |
| `prisma/schema.prisma`                                   | Executor (in task that touches schema) — never PM (kecuali typo non-semantik)                              |
| `package.json` deps                                      | PO approval via Parent PM eskalasi — no executor adds deps unilaterally                                    |
| `docker-compose.yml`, `Makefile`, env templates          | Executor (in task that touches them); Parent PM consolidate via §4 deviation log                           |
