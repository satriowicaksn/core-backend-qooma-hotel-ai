# PM-STATUS-C — Qooma Backend · Dev C (Satrio)

> **Per-dev tracker untuk slot C (Satrio).** PM C + Executor C komunikasi **hanya** via file ini. Roll-up short summary ke `PM-STATUS-PARENT.md §2` setelah tiap VERDICT atau end-of-session.
>
> **PM A, PM B, Executor A, Executor B — JANGAN edit file ini.** File ini private ke slot C.
>
> **Identity check**: di response pertama session WAJIB confirm `Role: PM | Executor`, `Slot: C (Satrio)`. Bila user belum sebut slot — STOP, tanya dulu (lihat `KICKOFF.md §4`).
>
> Format block di §2 Active assignments **append-only** (lihat `EXECUTOR-PROTOCOL.md §0.5` & `PM-AGENT.md §0.4`).

---

## 0. Current focus (slot C)

- **Day**: H0 (2026-07-03) — first Slot C activity
- **Active task**: **T21 Departments CRUD** — ASSIGNMENT issued 2026-07-03 H0, awaiting Executor C PLAN
- **Branch**: `feat/settings-departments-crud` (executor to create on claim)
- **Next gate (global)**: G1 — lihat `PM-STATUS-PARENT.md §5`
- **My queue (preview)**: T21 active; T22–T30 backlog (see §8 note) — T26 + T30 hard-blocked at DEV by Opsi C DB deviation (PARENT §4)

---

## 1. Task tracker (slot C — PM C authority)

> Mirror dari `PM-STATUS-PARENT.md §1` di mana Slot=C. PM C update status row di sini + push status update ke PARENT §1 setelah verdict.

| T## | Title                              | Status   | Verified by PM | Notes                                 |
| --- | ---------------------------------- | -------- | -------------- | ------------------------------------- |
| T21 | Departments CRUD (escalation tree + operating hours) | assigned (PLAN pending) | — | ASSIGNMENT issued 2026-07-03 H0 (PM C → Exec C). All impl deps green post foundation: T02 (schema) merged; T04 RBAC + tenant-guard hooks (approved awaiting PO merge); T07-slice-1 `BusinessRuleError` merged; T-INFRA-01/-02/-03 merged/approved. DEP-4 api.ts bootstrap NOT blocking impl — follow Slot B convention (build + testcontainers, routes 401 until DEP-4 lands). |

---

## 2. Active assignments (append-only)

> **Executor C** append `ASSIGNMENT` block saat claim task. **PM C** append `ACK` / `VERDICT` sub-block di bawah block executor — JANGAN edit block lama.

### ASSIGNMENT T21 — Departments CRUD — issued by PM C at 2026-07-03 H0

- **Routed from**: `PM-STATUS-PARENT.md §1` T21 (Parent PM assigned earlier; foundation unblocked as of 2026-07-02 H0).
- **Branch (to create on claim)**: `feat/settings-departments-crud`
- **Spec source of truth**: `docs/spec/02-hotel-core.md` §1.5 (endpoints) + §2.1 (DDL) + §6 (RBAC) + §7 (error catalog); `docs/spec/MVP-HOTEL-CORE-FIRST.md` §C1.
- **Module template**: `docs/MODULE_TEMPLATE.md`.

**Scope (4 endpoints — settings/departments)**

| Method   | Path                                | Purpose                                                       |
| -------- | ----------------------------------- | ------------------------------------------------------------- |
| `GET`    | `/api/settings/departments`         | List depts for `req.tenant.hotelId` (include is_active filter) |
| `POST`   | `/api/settings/departments`         | Create dept                                                    |
| `PATCH`  | `/api/settings/departments/:id`     | Update dept (partial body; escalation_chain + operating_hours) |
| `DELETE` | `/api/settings/departments/:id`     | Delete — **409 CONFLICT** if any user assigned OR any open ticket references dept |

**Data model** (already migrated via T02 — do NOT touch schema):
- Table `departments` at `docs/spec/02-hotel-core.md:346-368`. Key fields: `hotel_id`, `name`, `code (^[A-Z]{2,8}$)`, `operating_hours JSONB`, `escalation_chain JSONB`, `telegram_chat_id`, `supervisor_telegram_id`, `is_active`.
- CHECKs: `departments_code_check` + `departments_hotel_code_unique (hotel_id, code)` — already in DDL.
- Escalation-chain JSONB shape per spec §1.5:191-207 (`l1_sla_minutes`, `l2_user_id`, `l2_sla_minutes`, `l3_user_id`, `skip_to_l3_categories[]`). Cross-service refs (l2/l3 user_id) live in Auth — **format-only UUID validation, no existence check** (cross-DB per PARENT §4 Opsi C).

**RBAC** (spec §6:802):
- `super_admin`: yes · `gm_admin`: yes · `dept_head`: **NO (gm_admin only)**.
- Wire via `@plugins/rbac.js` (T04) + `@plugins/tenant-guard.js` (T03). `hotel_id` from `req.tenant` — NEVER body/query.

**Files to create** (per `docs/MODULE_TEMPLATE.md`)
```
src/modules/departments/
├── departments.schema.ts             (zod: create body + update body + JSONB shapes)
├── departments.types.ts              (DomainDepartment, DTO types)
├── departments.repository.ts         (Prisma direct — ADR-0001, no port wrap)
├── departments.service.ts            (business rules: delete-conflict, code UNIQUE handling)
├── departments.routes.ts             (Fastify plugin: 4 handlers, thin)
├── index.ts                          (barrel — public API: route plugin + types + factory only)
└── __tests__/
    ├── departments.service.test.ts             (unit; mock repo)
    └── departments.repository.integration.test.ts   (testcontainers; real Postgres)
```

**Files to modify**
- `src/entrypoints/api.ts` — register `departmentsRoutes` in the route registration block (mirror Slot B's T11 pattern). ⚠ `api.ts` is currently a stub (DEP-4 open) — follow Slot B convention: wire route registration hook; runtime returns 401 until foundation DEP-4 ships live Fastify bootstrap. Testcontainers give end-to-end confidence meanwhile.

**T21 DoD**
- [ ] 4 endpoints wired: GET list, POST create, PATCH update, DELETE
- [ ] Zod schemas: create body + partial update body + `operatingHoursSchema` + `escalationChainSchema` (l1_sla_minutes required; l2/l3 UUID format; `skip_to_l3_categories` string[])
- [ ] Tenant scope: `hotel_id` sourced from `req.tenant.hotelId` in every handler; cross-tenant 404 (not 403 — leak-safe) proven via test
- [ ] RBAC: `super_admin` + `gm_admin` allowed; `dept_head` gets 403 on all 4 endpoints (test coverage)
- [ ] Delete conflict: 409 CONFLICT (via `ConflictError`) when `users.department_id = :id` count > 0 OR `tickets.department_id = :id AND status IN ('pending','assigned','in_progress','escalated')` count > 0. Envelope `code = 'CONFLICT'`, `details.reason IN ('DEPARTMENT_HAS_USERS', 'DEPARTMENT_HAS_OPEN_TICKETS')`. Note: `users` table cross-DB (Opsi C) — for DEV, skip the users check OR mock via env flag; raise as GAP T21-#N in PLAN.
- [ ] UNIQUE(hotel_id, code) violation → 409 CONFLICT `details.reason = 'DEPARTMENT_CODE_TAKEN'`. Catch Prisma P2002.
- [ ] Zod validation → 400 VALIDATION (auto via error-handler plugin from T07).
- [ ] Response envelope: list = `{data: DomainDepartment[]}` (no cursor needed — small N per hotel); single = `{data: DomainDepartment}` per Q-B-01 canonical (PARENT §3a).
- [ ] Winston logger scoped to handler via `req.log` (correlationId propagated).
- [ ] Unit tests (service): branch coverage on delete-conflict, code-unique, tenant scope, RBAC.
- [ ] Integration test (repository): testcontainers real Postgres; CRUD + UNIQUE constraint + CHECK code regex + tenant isolation.
- [ ] Line coverage ≥ 80% on new files.
- [ ] `make check` (unit only, Docker-free post T-INFRA-03) PASS.
- [ ] `pnpm test:integration` PASS.
- [ ] Drift scans clean: no `any`, no `console.log`, no `throw new Error(`, no default export (except entrypoints), no `express`/`typeorm`/`moment`/`node-fetch` imports, no hardcoded URL/token, no `.skip`.
- [ ] Named exports only; barrel `index.ts` exposes public API (types + `departmentsRoutes` plugin + optional factory) — NO service/repo internal leak.

**PM notes for Executor C**
- **Session-context**: import `SessionUser`, `SessionRole`, `TenantContext` from `@plugins/tenant-guard.js` (Slot-A authoritative per Q-B-02 resolution). Do NOT define your own.
- **Error envelope**: use hierarchy at `@core/errors` — `ConflictError` (409), `NotFoundError` (404), `ForbiddenError` (403), `ValidationError` (400). `BusinessRuleError` (422 T07-slice-1) is available if a rule case comes up but delete-conflict is CONFLICT not BUSINESS_RULE.
- **No port + adapter**: dept CRUD = pure DB access, no external IO. Prisma direct per ADR-0001. Do NOT wrap Prisma in a `IDepartmentRepository` interface.
- **Cross-DB reality (Opsi C)**: `hotels` and `users` are Auth-service tables (not in `hotel_core_dev`). `departments.hotel_id` FKs to id-only Prisma stub; `users.department_id` join is cross-DB. Reflect this in delete-conflict check design and raise as GAP T21-#N if approach unclear.
- **DEP-4 (`api.ts` bootstrap) NOT blocking**: build + wire route registration; testcontainers cover integration. Slot B shipped 10/10 the same way. No end-to-end HTTP proof required until DEP-4 lands.
- **pnpm-store note**: fresh `pnpm install --frozen-lockfile`; if `@prisma/client` missing types, run `pnpm prisma:generate` (post T-INFRA-01 merge `make check` handles it). Do NOT `pnpm rebuild @prisma/client` (pollutes store per PARENT §10).
- **Fixture alignment**: T05 seed uses dept codes CON/HSK/FNB/ENG/FO — mirror in integration test fixtures for cross-slot friction reduction (matches Slot B testcontainer convention).
- **Branch + commit**: `feat/settings-departments-crud` · `feat(departments): T21 CRUD + escalation-tree/operating-hours`.
- **PLAN expectations**: session-start gate + files list + approach paragraph + GAPs surfaced early. Q-B-01/Q-B-02 already resolved — no need to re-raise.

**Expected GAPs — surface in PLAN before coding**
- **T21-#1** — operating_hours JSONB shape not fully specified in spec §1.5 (cross-refs API-CONTRACT §2.10 not in repo). Proposal: permissive `z.object({}).catchall(z.unknown())` for MVP, tighten in FE-driven follow-up.
- **T21-#2** — delete-conflict `users.department_id` check impossible under Opsi C dev DB. Proposal: skip `users` check for DEV (only ticket check active); document behind `SKIP_CROSS_DB_CHECKS` env flag; PO ratify before staging.

Awaiting PM C ACK of PLAN before coding begins.

<!--
TEMPLATE — copy untuk task baru:

### ASSIGNMENT T## — claimed by exec-C (Satrio) at H{N} HH:MM
- Branch: feat/<modul>-<short>
- Routed from: PM-STATUS-PARENT.md §1 T## (Parent PM assigned)

#### PLAN T## — exec-C (Satrio) at H{N} HH:MM

**Scope recap**
- ...

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity confirmed: Executor, Slot C (Satrio) ✓
- CLAUDE.md loaded ✓
- Task spec read: <doc:section>
- Parent docs spot-read: <list>
- Dependencies: T## ✓
- `make typecheck` clean ✓ ; `make lint` clean ✓
- Scaffolder risk: none / <tool>

**Files to create**
```
src/modules/<name>/...
```

**Files to modify**
- src/entrypoints/api.ts — ...

**Approach**
<1 paragraf>

**GAPs / questions**
- (none) / GAP T##-#1 — ...

Awaiting PM C ACK.

##### PM C ACK — T## PLAN APPROVED, proceed to coding (H{N})
- (atau) PM C REJECT-PLAN — fix sebelum mulai: <list>

#### SUBMIT T## — exec-C (Satrio) at H{N} HH:MM (attempt 1)

Task: <title>
Files changed: <count>
  - ...

DoD self-check
- [x] ...

Quality gate
- `make check`: PASS
- ...

Drift scans
- ...

Security check
- ...

Test evidence
- Unit: <n>
- Integration: <n>

Notes
- ...

Requesting PM C VERDICT.

##### VERDICT T## — APPROVED (H{N}, revisi N) by PM C
- All DoD verified ✓
- Drift scans clean ✓
- `make check` PASS confirmed by PM rerun
- → §1 task tracker updated; row mirrored to PARENT §1
- → Short roll-up posted to PARENT §2

(atau)

##### VERDICT T## — REJECT (revisi N) by PM C

⛔ Items to fix:

**Item #1 — <kategori>** `src/.../<file>.ts:<line>`
- **Violation**: <pelanggaran>
- **Fix**: <satu kalimat fix-path>

**Item #2 — ...**
- ...

Re-run `make check` after fix, confirm pass, resubmit (attempt N+1).

(atau)

##### VERDICT T## — ESCALATE by PM C
- Reason: <gap planning / open Q PO>
- Escalated to Parent PM at H{N} HH:MM (will reach PO via PARENT §3)
- Executor C: pick task lain dari §8 sementara

-->

---

## 3. Slot C open questions (mirror to PARENT §3)

> PM C catat di sini ketika executor C raise `GAP` atau `BLOCKED`. Setelah resolve atau eskalasi ke Parent PM, update status. Parent PM consolidate ke `PM-STATUS-PARENT.md §3`.

| ID            | Question | Source         | Status | Resolution |
| ------------- | -------- | -------------- | ------ | ---------- |
| —             | —        | —              | —      | —          |

---

## 4. Drift baseline (slot C files only, end of each day)

| Run | Touched files | `any` | console.log | `throw new Error(` | forbidden imports | default export (di luar entry) | `.skip` | hardcoded URL | webhook tanpa HMAC | wrap-Prisma interface |
| --- | ------------- | ----- | ----------- | ------------------ | ----------------- | ------------------------------ | ------- | ------------- | ------------------ | --------------------- |
| H0 baseline | (no src/ touched) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

> PM C jalankan drift scan per `PM-AGENT.md §3 Step 2` setiap SUBMIT + end-of-day full scan untuk slot C's touched files.

---

## 5. Standup log slot C (latest di atas)

> PM C post daily standup di sini, lalu post 1-2 baris ringkas ke `PM-STATUS-PARENT.md §6` (yang Parent PM consolidate jadi cross-team report).
>
> Format: per `PM-AGENT.md §7`.

### H0 — TBD (Satrio onboard, awaiting first assignment)

```
QOOMA BE C (Satrio) — Standup — H{N}/{total}

✅ Approved hari ini
- (none — belum start)

🔄 In progress
- (none)

⛔ Rejected
- (none)

🚨 Eskalasi ke Parent PM
- (none)

📅 Gate status (global)
- Next gate: G1 — lihat PARENT §5

📈 Progress slot C
- 0 / TBD task

🎯 Fokus besok
- Awaiting Parent PM first assignment.
```

---

## 6. Slot C incidents / lessons (own-scope only)

> Hal yang affect cuma slot C. Bila affect > 1 dev, escalate ke `PM-STATUS-PARENT.md §7` lewat Parent PM.

_(kosong)_

---

## 7. PM C operating notes (untuk Executor C)

- PM C baca `PM-AGENT.md` (full) + `PM-STATUS-C.md` + scan `PM-STATUS-PARENT.md` (§1 mine, §3, §5, §8).
- PM C **TIDAK** edit `src/`, `prisma/schema.prisma` (kecuali typo non-semantik), `package.json` deps — read-only di area itu.
- PM C **BOLEH** update planning docs untuk sync (per `PM-AGENT.md §0.6`) — TAPI escalation ke Parent PM dulu bila perubahan affect dev lain. Tiap edit planning docs dicatat di `PM-STATUS-PARENT.md §4`.
- PM C **TIDAK** edit `PM-STATUS-A.md` / `PM-STATUS-B.md` — strict per-slot ownership.
- PM C **TIDAK** jawab open contract / package question — hanya PO via Parent PM.
- PM C **TIDAK** negosiasi scope. Descope adalah otoritas PO via Parent PM.
- On REJECT: fix exactly the listed items (file:line). Re-run `make check` self-validate. Resubmit per `EXECUTOR-PROTOCOL §4.5`, sebut item mana yang sudah di-address.
- Rebuttal: bila Executor C yakin PM C flag salah, post one-sentence rebuttal + evidence di sub-block `REBUTTAL T## item-#N`. PM C re-check dalam session yang sama.
- Untuk CLI command apapun yang touch root repo (scaffolder, generator, dll.): tulis exact command di PLAN supaya PM C bisa flag risiko overwrite sebelum executor run.
- Branch naming: `feat/<modul>-<short>`, `fix/<modul>-<short>`, `chore/<short>`, `docs/<short>` (per `CLAUDE.md §12`).
- Commit message: conventional commits — `feat(modul): X`, `fix(modul): Y`.
- Gunakan `make commit MSG="..."` — auto lint + typecheck + format-check sebelum commit.

---

## 8. Slot C queue (filter dari PARENT §8 di mana Slot=C)

> Parent PM authority untuk rewrite — PM C baca only. Executor C self-select dari sini bila tidak ada explicit ASSIGNMENT.

_(belum ada — tunggu Parent PM assign task ke slot C)_

<!-- Mirror format dari PM-STATUS-PARENT.md §8 template. -->

---

## 9. Roll-up reminder

Setiap kali PM C:

- **APPROVE** task → post 1 line ke `PM-STATUS-PARENT.md §2` (latest di atas) + update row status di PARENT §1
- **REJECT** task → tidak perlu PARENT roll-up (internal to slot C)
- **ESCALATE** task → post status `escalated` ke PARENT §1 + raise di PARENT §3 (Q register)
- **End-of-day** → post 3-line standup summary ke PARENT §6 di bawah Parent PM's daily roll-up block

Jangan paste full SUBMIT/VERDICT ke PARENT — itu tetap di sini.
