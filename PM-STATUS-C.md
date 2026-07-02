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

- **Day**: H0 (2026-07-03) — Slot C **1/10 approved+merged**; **T25-slice-1 wip**
- **Active tasks**:
  - **T21 Departments CRUD** — **MERGED to main** 2026-07-03 (PR #11 `bbf4bd7`) ✓
  - **T25 WA templates lifecycle (slice-1)** — PLAN ACK'd 2026-07-03 H0 with 3 code-level tightenings; Executor C coding on `feat/wa-templates-lifecycle`. Q-T25-#5 escalates to PARENT §3b + §10 (foundation UNIQUE constraint gap; Slot C ships Option B; Slot A fix).
- **Branches**: `feat/wa-templates-lifecycle` (T25, wip)
- **Next gate (global)**: G1 — lihat `PM-STATUS-PARENT.md §5`
- **My queue (preview)**: T21 merged; T25 wip; T22/T23/T24 merge-gated on T08/T09 PO merges; T27/T28/T29 fully unblocked; T26+T30 hard-blocked at DEV by Opsi C

---

## 1. Task tracker (slot C — PM C authority)

> Mirror dari `PM-STATUS-PARENT.md §1` di mana Slot=C. PM C update status row di sini + push status update ke PARENT §1 setelah verdict.

| T## | Title                              | Status   | Verified by PM | Notes                                 |
| --- | ---------------------------------- | -------- | -------------- | ------------------------------------- |
| T21 | Departments CRUD (escalation tree + operating hours) | **approved+merged** | PM C (Satrio) | ✅ APPROVED attempt 1 + **MERGED to main 2026-07-03 (PR #11 `bbf4bd7`)**. 11 files (10 module + `env.ts` additive `SKIP_CROSS_DB_CHECKS`). `make check` **312/1/313** (+34 net); coverage **96.07%**. Q-C-02 open at PARENT §3b (PO ratify pre-staging). |
| T25 | WA templates lifecycle + Meta-callback ingest (**slice-1 wip**) | wip (PLAN ACK'd with 3 tightenings) | — | PLAN ACK'd 2026-07-03 H0. Scope: **5 public endpoints + IntegrationRelayPort + LogOnly adapter** (Meta-callback deferred to slice-2). GAP responses #1–#4 all accept PM leans (403 global-write, permissive name, 409 archived-conflict, single port method + intent). **Q-T25-#5 escalates to PARENT §3b + §10** (foundation gap: `wa_templates_hotel_name_unique` UNIQUE constraint missing from T02 migration; Slot C ships Option B pre-check + P2002 catch belt-and-suspenders; Slot A fix). 3 tightenings held: `variables: string[]` typing, `language` zod bounded, adapter log payload discipline. Zero touch on `api.ts` / `prisma/migrations/`. Awaiting Executor C SUBMIT. |

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

#### PLAN T21 — exec-C (Satrio) at 2026-07-03 H0

**Scope recap**
Settings/Departments CRUD (4 endpoints) — greenfield module `src/modules/departments/`. Prisma `Department` model already migrated by T02 (schema.prisma L82–102 with CHECK + UNIQUE(hotel_id, code)). Delivery: zod schemas → repository (Prisma direct, ADR-0001) → service (tenant scope + RBAC + delete-conflict + P2002 → CONFLICT) → thin routes → barrel `index.ts`. Session context via `@plugins/tenant-guard.js` (`SessionUser`, `TenantContext`, `assertHotelOwnership`). RBAC via `@plugins/rbac.js` `requireRole([super_admin, gm_admin])` — dept_head 403 on all 4. Response envelopes: `{data: DomainDepartment}` singular, `{data: DomainDepartment[]}` list (Q-B-01 canonical, no cursor — small N).

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity confirmed: Executor, Slot C (Satrio) ✓
- CLAUDE.md loaded ✓
- Task spec read: `docs/spec/02-hotel-core.md` §1.5 (endpoints), §2.1 (DDL), §6 (RBAC), §7 (error catalog); `docs/spec/MVP-HOTEL-CORE-FIRST.md` §C1 ✓
- Parent docs spot-read: `docs/MODULE_TEMPLATE.md`, `src/modules/_template/` structure, `src/modules/notifications/` + `src/modules/tickets/` as living reference (barrel, service+repo split, route thin pattern, serializer snake_case), `src/plugins/tenant-guard.ts` (SessionUser/TenantContext/assertHotelOwnership), `src/plugins/rbac.ts` (requireRole), `src/core/errors/app-errors.ts` (ConflictError/NotFoundError/ForbiddenError/ValidationError) ✓
- Dependencies: T02 (schema + migration) ✓ · T03 (tenant-guard) ✓ · T04 (rbac) ✓ · T05 (seed for dept-code fixtures) ✓ · T07 (error-handler + BusinessRuleError) ✓ — all approved per PM notes
- `make typecheck` clean ✓ (post `rm -rf node_modules && pnpm install --frozen-lockfile && pnpm prisma:generate` per PM note); `make lint` clean ✓; `make test-unit` 278/1/279 baseline (matches T09 SUBMIT) ✓
- Scaffolder risk: **none** — no `pnpm create`/`pnpm dlx`; no schema.prisma edit; no new package (unless zod-existing already covers JSONB shape validation — expected yes)

**Files to create**
```
src/modules/departments/
├── departments.schema.ts             (zod: OperatingHoursSchema, EscalationChainSchema,
│                                       CreateDepartmentSchema, UpdateDepartmentSchema,
│                                       DepartmentIdParamSchema, ListDepartmentsQuerySchema)
├── departments.types.ts              (DomainDepartment, DepartmentRow, CreateDepartmentInput,
│                                       UpdateDepartmentInput, DepartmentListResponse,
│                                       DepartmentResponse, wire snake_case DTO)
├── departments.repository.ts         (Prisma direct — findMany/findById/create/update/delete,
│                                       plus countAssignedUsers + countOpenTickets for
│                                       delete-conflict)
├── departments.service.ts            (business rules: tenant scope,
│                                       RBAC-not-here [route-level], delete-conflict,
│                                       P2002 code-unique → CONFLICT, escalation JSONB
│                                       shape validation via zod at boundary)
├── departments.serializer.ts         (Prisma row → snake_case wire — mirrors notifications
│                                       serializer)
├── departments.routes.ts             (Fastify plugin: 4 handlers,
│                                       requireTenant + requireRole([super_admin, gm_admin]),
│                                       parseParams + service.method + reply.send)
├── index.ts                          (barrel — `departmentsRoutes` + `buildDepartmentsService`
│                                       + public types only; NO service/repo internal leak)
└── __tests__/
    ├── departments.service.test.ts             (unit; mock repo; branch coverage:
    │                                             tenant scope, RBAC gate wiring,
    │                                             delete-conflict [both reasons + happy],
    │                                             P2002 → CONFLICT translation,
    │                                             super_admin cross-hotel bypass)
    ├── departments.routes.test.ts              (unit; supertest-style Fastify inject;
    │                                             happy path + 401 + 403 + 404 + 409)
    └── departments.repository.integration.test.ts   (testcontainers; real Postgres;
                                                     UNIQUE constraint, CHECK code regex,
                                                     tenant isolation, seed CON/HSK/FNB/ENG/FO)
```

**Files to modify**
- `src/entrypoints/api.ts` — add commented-out `// await fastify.register(departmentsRoutes, { prefix: '/api/settings', service: ... })` following DEP-4 convention. Slot B's T11 pattern per PM notes (route registration hook prepared; runtime returns 401 until DEP-4 lands). If Slot B's existing modules ARE registered live already, mirror exactly.

**Approach**
Hexagonal-disiplin: **no port for Prisma** (ADR-0001) — repository holds Prisma queries directly. Service consumes `TenantContext` from `@plugins/tenant-guard.js`, applies `assertHotelOwnership` on fetched row (super_admin bypass built-in per helper), and centralises delete-conflict as two parallel `count` queries: `countAssignedUsers(deptId)` + `countOpenTickets(deptId, status IN pending|assigned|in_progress|escalated)`. Under Opsi C the users table isn't in `hotel_core_dev` — I'll gate the users check behind `SKIP_CROSS_DB_CHECKS` env flag (GAP T21-#2 below) and always run the tickets check. Create/update wrap `try/catch (P2002)` → `ConflictError('CONFLICT', { reason: 'DEPARTMENT_CODE_TAKEN' })`. Update+delete flow: repo `findById` → `assertHotelOwnership` → mutate. Zod schemas validate JSONB shapes at the boundary; wire response uses snake_case serializer mirroring notifications. Routes stay thin: `requireTenant → requireRole([super_admin, gm_admin]) → parseParams/body → service call → reply.send`. Bootstrap wiring via `buildDepartmentsService(db)` factory (mirrors `buildNotificationsService`). Tests: unit mock repo for service branch coverage; integration testcontainer real Postgres for CHECK + UNIQUE + tenant isolation + delete-conflict E2E; route tests via Fastify `inject`. Dept-code fixture uses CON/HSK/FNB/ENG/FO to match T05 seed.

**GAPs / questions**

- **GAP T21-#1** — `operating_hours` JSONB shape not fully specified in spec §1.5 (API-CONTRACT §2.10 not in repo). PM ASSIGNMENT already anticipates this.
  - **Options**: A) permissive `z.record(z.string(), z.unknown())` for MVP; B) tighten to a per-day `{mon,tue,...sun: {open: 'HH:mm', close: 'HH:mm', dnd_override?: boolean}}` shape and lock now; C) empty-object-only until FE contract lands.
  - **My intent**: **A** — `z.object({}).catchall(z.unknown())` (parses `{}` and forwards any JSON forward-compat). Follow-up ticket when FE contract lands. Matches PM proposal.

- **GAP T21-#2** — Delete-conflict `users.department_id` check impossible under Opsi C (`users` in Auth DB, not `hotel_core_dev`). PM ASSIGNMENT already anticipates this.
  - **Options**: A) skip `users` check entirely for DEV (only tickets check active) — accept staging gap; B) gate `users` check behind `SKIP_CROSS_DB_CHECKS=true` env flag (default true in dev, false in prod once shared DB restored); C) call Auth `/api/users?dept_id=:id` HTTP roundtrip.
  - **My intent**: **B** — add `SKIP_CROSS_DB_CHECKS` to `core/config/env.ts` as `z.coerce.boolean().default(true)`; service reads flag; when `true` skips users query. Tickets check always runs. Note in service comment + surface in SUBMIT for PO ratify. C rejected (introduces Auth-service HTTP dep prematurely; PARENT §4 Opsi A/multi-schema is the future fix).

- **GAP T21-#3** (new — not in PM ASSIGNMENT) — Zod schema for `escalation_chain.skip_to_l3_categories`. Spec §1.5 lists `['vvip','urgent','complaint']` as examples but doesn't enum-lock. If tightened to enum here, future new categories require code change.
  - **Options**: A) `z.array(z.string().min(1).max(32)).max(20)` permissive; B) `z.array(z.enum(['vvip','urgent','complaint'])).max(3)` locked.
  - **My intent**: **A** — permissive string array, spec is illustrative not exhaustive. Follow-up ticket if PO wants lock.

Q-B-01 / Q-B-02 already resolved per PM ASSIGNMENT — not re-raising.

**Est.**: ~4–6h (single session likely; if crossing, mid-task CHECKPOINT per §4.3).

Awaiting PM C ACK.

##### PM C ACK — T21 PLAN APPROVED with 1 override (proceed to coding, 2026-07-03 H0)

Structural approach ✓ · Files list ✓ (serializer + routes test additions consistent with Slot B convention verified independently: `src/modules/notifications/` + `src/modules/tickets/` + `src/modules/guests/` + `src/modules/visits/` all use identical 8-file layout — schema + types + repository + service + serializer + routes + barrel `index.ts` + 3-file `__tests__/`) · session-start gate ✓ · `assertHotelOwnership` reference at `src/plugins/tenant-guard.ts:57` verified · baseline 278/1/279 matches post-T09 main ✓.

**Override #1 — `api.ts` treatment**: do NOT modify `src/entrypoints/api.ts`. My original ASSIGNMENT line ("register `departmentsRoutes` in the route registration block, mirror Slot B's T11 pattern") was overprescriptive — I independently verified `src/entrypoints/api.ts` is a fully-stubbed TODO (lines 20-39 all commented) and every Slot B barrel (`grep ticketsRoutes|guestsRoutes|visitsRoutes|notificationsRoutes src/modules/*/index.ts`) exports the plugin from `index.ts` but NOTHING wires them in `api.ts`. Slot B convention is: **barrel export is the wiring seam; foundation DEP-4 will register all module barrels at once**. Drop the commented-out `// await fastify.register(departmentsRoutes, ...)` line. Zero diff on `src/entrypoints/api.ts`. This shrinks your "Files to modify" list to zero — you touch only `src/modules/departments/*` + `src/core/config/env.ts` (for GAP #2 env addition).

**GAP responses**

- **GAP T21-#1 (operating_hours JSONB shape) → RESOLVED**: your option A (`z.object({}).catchall(z.unknown())`) confirmed. Permissive-now, FE-contract-driven-later. Registered §3 as Q-C-01 (status: `resolved (provisional, PM C ratified)`). If FE MSW diverges, revisit in follow-up ticket — zero break risk since permissive schema forward-compatible.

- **GAP T21-#2 (users cross-DB check under Opsi C) → RESOLVED with 3 constraints**: your option B (`SKIP_CROSS_DB_CHECKS` env flag) confirmed. Precedent: T08 (multipart) added 5 optional S3 env fields cleanly — additive env changes are pattern-consistent, not out-of-scope. Constraints on implementation:
  1. Use `z.coerce.boolean().default(true)` in `src/core/config/env.ts` (matches existing boolean env pattern; default `true` = safe-in-DEV).
  2. **Startup WARN when flag is `true` AND `NODE_ENV === 'production'`**: emit via winston at api bootstrap (deferred to DEP-4) — for now, service constructor logs `logger.warn({ skipCrossDbChecks: true, env: NODE_ENV }, 'DEPARTMENTS: users cross-DB check skipped')` once per hot start when flag is on. Prevents silent prod ship.
  3. Service comment (JSDoc on `countAssignedUsers` or the delete-conflict method) explains the Opsi C context + which flag toggles it. Reader will understand without reading PARENT §4.
  Registered §3 as Q-C-02 (status: `open (PO ratify before staging)`). Will roll up to PARENT §3b at SUBMIT time — PO's Opsi A/multi-schema resolution eventually removes this.

- **GAP T21-#3 (skip_to_l3_categories enum) → RESOLVED**: your option A confirmed (`z.array(z.string().min(1).max(32)).max(20)`). Spec §1.5:195-207 uses examples ("vvip, urgent, complaint") — not exhaustive enum. Permissive-with-bounds prevents unbounded payload while leaving room for hotel-specific categories. Registered §3 as Q-C-03 (status: `resolved (provisional, PM C ratified)`).

**Coding checklist reminders** (things easy to miss)

- Prisma delete-conflict: use **`count`** queries not `findMany` — cheaper + no memory pressure.
- `super_admin` cross-hotel bypass: rely on `assertHotelOwnership` built-in bypass (per `tenant-guard.ts:57` verified earlier); do NOT re-implement.
- Route plugin registration: mirror `src/modules/notifications/notifications.routes.ts` prefix-and-hooks pattern exactly. If notifications register a `preHandler` chain of `[requireTenant, requireRole([...])]`, use the same helpers — don't invent parallel ones.
- Snake_case serializer boundary: DomainDepartment (camelCase in-service) → wire DTO (snake_case). One-way, at the route boundary only.
- `escalation_chain.l1_sla_minutes`: required per spec §1.5:194 (default = 5). Enforce in zod schema.
- Integration test dept-code fixtures: use `CON`, `HSK`, `FNB`, `ENG`, `FO` to mirror T05 seed + Slot B testcontainer convention (see tickets integration test).
- `pnpm install --frozen-lockfile` fresh + `pnpm prisma:generate` if needed. Do NOT `pnpm rebuild @prisma/client`.

**Mid-task CHECKPOINT trigger**: if the session crosses ~4h with more than 3 files still incomplete, post a CHECKPOINT sub-block here with current state so I can spot-flag drift early. Otherwise straight-line to SUBMIT.

Proceed to coding on `feat/settings-departments-crud`. Awaiting your SUBMIT.

#### SUBMIT T21 — exec-C (Satrio) at 2026-07-03 H0 (attempt 1)

Task: Departments CRUD (escalation tree + operating hours)
Branch: `feat/settings-departments-crud` @ `55887f0` (pushed to origin)
Files changed: 11
  - `src/modules/departments/departments.types.ts` (new — 47 lines)
  - `src/modules/departments/departments.schema.ts` (new — 119 lines)
  - `src/modules/departments/departments.serializer.ts` (new — 25 lines)
  - `src/modules/departments/departments.repository.ts` (new — 55 lines)
  - `src/modules/departments/departments.service.ts` (new — 181 lines)
  - `src/modules/departments/departments.routes.ts` (new — 118 lines)
  - `src/modules/departments/index.ts` (new — 33 lines)
  - `src/modules/departments/__tests__/departments.service.test.ts` (new — 303 lines, 24 tests)
  - `src/modules/departments/__tests__/departments.routes.test.ts` (new — 180 lines, 11 tests)
  - `src/modules/departments/__tests__/departments.repository.integration.test.ts` (new — 302 lines, 13 tests + 1 skipped-by-pattern)
  - `src/core/config/env.ts` (modified — added `SKIP_CROSS_DB_CHECKS` per Q-C-02, +7 lines)
Zero touch on `src/entrypoints/api.ts` (per PM Override #1 — barrel-only wiring, DEP-4 will register).

**DoD self-check** (from ASSIGNMENT T21)
- [x] 4 endpoints wired: GET list / POST create / PATCH update / DELETE — `departments.routes.ts:47,63,81,99`
- [x] Zod schemas: `CreateDepartmentBodySchema` + `UpdateDepartmentBodySchema.refine(non-empty)` + `OperatingHoursSchema` (Q-C-01 permissive) + `EscalationChainSchema` (l1_sla_minutes REQUIRED, l2/l3 UUID-format optional, `skip_to_l3_categories` bounded per Q-C-03) — `departments.schema.ts:25-33,37-47,49-62`
- [x] Tenant scope: `hotelId` from `ctx.hotelId` on every write (`service.create` L83, `loadOwned → assertHotelOwnership` on detail/update/delete). Cross-tenant 404 proven — integration test `should 404 on cross-tenant update/delete (leak-safe)` — 4 tests (2 service unit + 2 integration).
- [x] RBAC: `requireRole(ctx, ['gm_admin'])` in every handler; super_admin bypass via `requireRole`'s implicit all-access; dept_head + staff both 403 — routes tests `should 403 for dept_head` + `should 403 for staff` + `should allow super_admin`.
- [x] Delete-conflict: 409 CONFLICT `DEPARTMENT_HAS_OPEN_TICKETS` when `countOpenTickets(deptId) > 0`. Users check skipped via Q-C-02 (users stub has no `departmentId` column under Opsi C — see Notes). Envelope `code='CONFLICT'`, `details.reason='DEPARTMENT_HAS_OPEN_TICKETS'`, `details.openTickets: number`.
- [x] UNIQUE(hotel_id, code) violation → 409 CONFLICT `DEPARTMENT_CODE_TAKEN` via `isPrismaUniqueViolation(err)` catching `P2002` in both create + update paths — `service.ts:102-108,136-146`. Verified by integration test on real Postgres UNIQUE constraint.
- [x] Zod validation → 400 VALIDATION via `ValidationError` in schema parsers → error-handler translation. Verified by routes test `should 400 on non-uuid id / on invalid code`.
- [x] Response envelope: list `{data: DomainDepartment[]}` (no cursor — small N per hotel per PM guidance) · single `{data: DomainDepartment}` — matches Q-B-01 canonical.
- [x] Winston logger scoped to handler via `req.log.info({module: 'departments', action, correlationId})` in each handler.
- [x] Unit tests (service): branch coverage on delete-conflict (3 paths), P2002 translation (create+update), tenant scope build, super_admin bypass, Q-C-02 startup warn (fires only when prod+flag=true).
- [x] Integration test (repository): testcontainers real Postgres; migrations deploy; seed CON/HSK/FNB/ENG/FO for HOTEL_A + HSK for HOTEL_B; CRUD + UNIQUE constraint + CHECK code regex + tenant isolation + delete-conflict on open ticket.
- [x] Line coverage ≥ 80% on new files — **96.07% lines** across `src/modules/departments/**` (repository 100 · serializer 100 · index 100 · routes 97.67 · schema 97.43 · service 92.59).
- [x] `make check` (unit only, Docker-free) PASS — 312/1/313 tests (baseline 278 + 34 new).
- [x] `pnpm test:integration` PASS — 83/1/84 tests (baseline 69/1/70 + 14 new departments).
- [x] Drift scans clean (see below).
- [x] Named exports only; barrel `index.ts` exposes public API (`departmentsRoutes` plugin + `DepartmentsService` class + `buildDepartmentsService` factory + wire/domain types); NO service/repo internal leak.

**Quality gate**
- `make typecheck`: **PASS**
- `make lint`: **PASS** (0 errors, 0 warnings)
- `make format-check`: **PASS** (prettier ran; consistent with repo style)
- `make test-unit`: **PASS** — 312 passed, 1 skipped, 313 total (baseline 278/1/279 + **+34 net**: 24 service + 10 route)
- `pnpm test:integration`: **PASS** — departments suite 13 passed + all other integration suites (notifications, tickets, visits, guests) unchanged
- `make check`: **PASS** end-to-end

**Drift scans** (`src/modules/departments/` + `src/core/config/env.ts`)
- `: any|<any>|as any` (excl `@ts-expect-error`): **0**
- `console.log/info/debug`: **0**
- `throw new Error(` in modules/core (excl tests where used as assertion helpers): **0** (2 hits in `__tests__/` are `throw new Error('expected throw')` as jest assertion helpers — allowed pattern, not a service throw)
- Forbidden imports (`express`/`typeorm`/`sequelize`/`moment`/`node-fetch`): **0**
- Default export outside entrypoints/config: **0**
- `.skip(` in tests: **0**
- Hardcoded URL / secret / dept-code enum lock: **0** (permissive per Q-C-01/Q-C-03)

**Security check**
- HMAC verified before business logic: **N/A** (no webhook in this module)
- Token encryption via `shared/utils/crypto`: **N/A** (no token storage)
- PII masking in log: **N/A** (dept metadata is not PII — `telegram_chat_id`/`supervisor_telegram_id` are operational config, not guest data)
- `hotel_id` NEVER from body/query — sourced from `ctx.hotelId`. Verified by unit test `should sink hotel_id from the tenant, never from body`.
- No secret hardcoded: **confirmed**.

**Test evidence**
- Unit: 34 new tests (24 service + 10 routes) — files `src/modules/departments/__tests__/departments.service.test.ts` + `departments.routes.test.ts`
- Integration: 13 new tests — file `src/modules/departments/__tests__/departments.repository.integration.test.ts`
- Coverage (departments module scope, ran with `--coverageThreshold='{}'`):
  ```
  All files                  | 94.40 stmts | 67.34 branch | 91.42 funcs | 96.07 lines
   departments.repository.ts | 100         | 100          | 100         | 100
   departments.routes.ts     | 97.72       | 50           | 100         | 97.67
   departments.schema.ts     | 95.00       | 58.33        | 87.50       | 97.43
   departments.serializer.ts | 100         | 100          | 100         | 100
   departments.service.ts    | 89.65       | 72.72        | 100         | 92.59
   index.ts                  | 100         | 100          | 33.33       | 100
  ```

Sample request/reply (unit-injected via Fastify — DEP-4 not landed so no live server):
```
POST /settings/departments
> body {"name":"Housekeeping","code":"HSK"}
< 201 Created
< {"data":{"id":"…","hotel_id":"…","code":"HSK",...}}

DELETE /settings/departments/:id (with 1 open ticket)
< 409 Conflict
< {"code":"CONFLICT","message":"Department still has open tickets",
   "details":{"reason":"DEPARTMENT_HAS_OPEN_TICKETS","openTickets":1}}
```

**Notes / questions for PM C**

1. **Spec vs migration status-set divergence (info, no action)** — ASSIGNMENT DoD wrote `status IN ('pending','assigned','in_progress','escalated')` for open-ticket count. The actual T02 migration CHECK enum is `('open','in_progress','awaiting_late_reason','done_pending','closed','high_alert','escalated','cancelled')`. I implemented as `notIn ['closed','cancelled']` which matches the migration's partial-index guard (line 111) — semantically "any non-terminal ticket blocks delete". This is the safer + spec-faithful interpretation ("tickets open"). Please confirm; if you'd prefer the literal IN-list from DoD, that's a 1-line repo change.

2. **Closed-ticket FK Restrict behavior (info)** — The `Ticket.departmentId` FK is `onDelete: Restrict` at the DB. Business layer's 409 catches OPEN tickets, but closed tickets ALSO block delete at DB with `foreign key constraint violated` — different surface. Under current spec this is a distinct failure mode (raw Prisma error). If PO wants a unified "reassign/archive tickets first" error surface, could add a second catch block translating FK error → different `ConflictError`. Not required by DoD; flagging as future refinement.

3. **Q-C-02 `countAssignedUsers` deferred** — Method **not implemented** in repo (would fail Prisma typecheck since `User` stub has no `departmentId` under Opsi C). Service comment at `service.ts:164-167` documents the deferral path: when Opsi A / multi-schema lands, add `repo.countAssignedUsers(id)` + throw `DEPARTMENT_HAS_USERS` conflict. Startup warn fires when `SKIP_CROSS_DB_CHECKS=true && NODE_ENV=production` (Q-C-02 constraint #2). Verified by unit test.

4. **`api.ts` untouched** (Override #1 held). Barrel `index.ts` exports `departmentsRoutes` + `buildDepartmentsService(db, { skipCrossDbChecks, nodeEnv, logger? })`. DEP-4 wiring will construct at composition root as: `buildDepartmentsService(db, { skipCrossDbChecks: config.SKIP_CROSS_DB_CHECKS, nodeEnv: config.NODE_ENV, logger })`.

5. **Fixture note** — Integration test seeds HOTEL_A with CON/HSK/FNB/ENG/FO (matches T05 seed + Slot B convention). HOTEL_B seeds HSK to prove per-hotel UNIQUE(hotel_id, code) allowance (same code across different hotels).

Requesting PM C VERDICT.

##### VERDICT T21 — APPROVED (attempt 1, 2026-07-03 H0) by PM C

✅ **APPROVED**. All 16 DoD boxes verified, independent PM validation on `feat/settings-departments-crud` @ `55887f0`.

**PM independent validation** (per PM-AGENT §3)

Step 1 — Task match: DoD 1:1 map to ASSIGNMENT + PM ACK constraints ✓
Step 2 — Drift-detection scans (rerun by PM on branch):
```
: any|<any>|as any (excl @ts-expect-error)         : 0
console.log|info|debug                              : 0
throw new Error( (service/core)                     : 0 (env.ts:91 pre-existing boilerplate — `5ce7f867` initial commit; not this task)
default export outside entrypoints/config           : 0
forbidden imports (express|typeorm|moment|node-fetch): 0
.skip( in tests                                     : 0
IRepository / ICache interface wrap of Prisma       : 0
hardcoded URL / secret                              : 0
setTimeout(..., >=1000ms) for job delay             : 0
```
Step 3 — File inventory: 11 files listed = 11 files touched (`git diff --stat main..feat/settings-departments-crud`); serializer + routes test additions consistent with Slot B convention (`notifications/`, `tickets/`, `guests/`, `visits/` all use identical layout) ✓
Step 4 — Quality gate (independent rerun by PM):
- `make check` **PASS 312/1/313** (baseline 278/1/279 + **+34 net**: 24 service + 10 routes); Docker-free (T-INFRA-03 mitigation held); 1.211s
- `pnpm test:integration` **PASS 83/1/84** (all 5 module suites green including cross-slot regression: tickets 25, notifications 15, visits 20, guests 10; departments 13 new) — 24.123s
- `make typecheck` + `make lint` + `make format-check` all PASS
Step 5 — Spot-check 3 random files:
- `departments.service.ts`: comments explain WHY (Q-C-02 rationale L54-57, cross-tenant leak-safe L177, Opsi C deferral L164-167) — not what-comments; public methods have explicit return types; `assertHotelOwnership` correctly reused (not reinvented); P2002 catch in both create + update paths ✓
- `departments.routes.ts`: thin handlers per Slot B convention; `requireTenant → requireRole → parse → service → send` chain; correlationId propagated via helper; 201 on create, 204 on delete correct; `requireRole(ctx, ['gm_admin'])` correct — verified rbac.ts:46 super_admin bypass (`if (tenant.isSuperAdmin) return;`) ✓
- `departments.repository.ts`: Prisma direct (ADR-0001 compliant); `count` queries not `findMany` for delete-conflict (PM reminder honored); comment L9-14 explains spec-vs-migration semantic ✓
- Bonus: `index.ts` barrel exposes only public surface (routes + service class + factory + DTO types); `DepartmentsRepository` imported for factory but NOT re-exported (internal) ✓
- Bonus: `departments.schema.ts` Q-C-01/-03 impl matches ACK exactly; `.strict()` on all body schemas rejects unknown fields; boundary-mirror of DB `^[A-Z]{2,8}$` CHECK (400 not 500) ✓
Step 6 — Security floor: no webhook (HMAC N/A); no token store (crypto N/A); no PII (masking N/A); `hotel_id` sourced from `ctx.hotelId` — verified `service.ts:83`; no secret hardcoded ✓
Step 7 — Test coverage: line **96.07%** across `departments/**` (exceeds ≥ 80% DoD); repo/serializer/index at 100%; routes 97.67; schema 97.43; service 92.59 — uncovered lines are the P2002 non-happy branches (tested via mocked repo throw, coverage counter miss on the untaken side) ✓
Step 8 — Verdict: **APPROVED**

**PM annotations on exec Notes**

- **Note #1 (spec vs migration status divergence) — PM ratifies exec's interpretation**: My ASSIGNMENT DoD line `status IN ('pending','assigned','in_progress','escalated')` cited stale/incorrect status enum. The actual T02 migration CHECK enumerates `('open','in_progress','awaiting_late_reason','done_pending','closed','high_alert','escalated','cancelled')`. Exec's `notIn ['closed','cancelled']` is **more spec-faithful** ("any non-terminal ticket blocks delete") + matches the partial-index guard at `20260701112000_add_hc_check_constraints_and_partial_indexes:111`. This is a PM-side DoD wording error, not exec drift — the shipped code is correct. Memorializing as PM operating note for future task DoD-writing (verify current migration enums, not spec draft enums).
- **Note #2 (closed-ticket FK Restrict raw Prisma surface) — accepted as future refinement**, not required by T21 DoD. Log for potential T21-slice-2 or PO-driven ticket-lifecycle harmonization. Left un-registered in §3 since no immediate consumer surface.
- **Note #3 (Q-C-02 `countAssignedUsers` deferred)** — matches Q-C-02 constraint #3 exactly; `service.ts:164-167` comment discoverable to future reader; startup WARN unit-tested at prod+flag=true. ✓
- **Note #4 (`api.ts` untouched)** — Override #1 held; barrel factory shape `buildDepartmentsService(db, { skipCrossDbChecks, nodeEnv, logger? })` matches DEP-4 composition-root expectations. ✓
- **Note #5 (fixture alignment)** — HOTEL_A CON/HSK/FNB/ENG/FO (T05 seed match) + HOTEL_B HSK (per-hotel UNIQUE(hotel_id, code) proof) — matches PM ACK reminder. ✓

**Slot A / Slot B awareness**
- Zero touch on Slot B files or Slot A owned surface (barrel-only wiring; env.ts additive, non-breaking).
- `SKIP_CROSS_DB_CHECKS=true` default preserves current DEV behavior — no cross-slot regression risk.
- All Slot B integration suites (tickets/notifications/visits/guests) green in independent PM rerun.

**§1 task tracker updated · §3 Q-C-02 rolls up to PARENT §3b · Short roll-up posted to PARENT §2 · Q-C-01 + Q-C-03 stay slot-scoped (provisional-resolved).**

**PO merge please**: branch `feat/settings-departments-crud` @ `55887f0` ready for main merge. Q-C-02 (`SKIP_CROSS_DB_CHECKS` env flag) needs PO ratification pre-staging — root fix routes via PARENT §4 Opsi A / multi-schema decision (foundation, not this task). Slot C **1/10 approved**.

---

### ASSIGNMENT T25 — WA templates lifecycle (slice-1) — issued by PM C at 2026-07-03 H0

- **Routed from**: `PM-STATUS-PARENT.md §1` T25 (Slot C queue; T21 merged/awaiting, next unblocked Slot C task per PM C selection).
- **Branch (to create on claim)**: `feat/wa-templates-lifecycle`
- **Slice ruling**: **slice-1 = 5 public endpoints + status-transition service + stub RPC (log-only adapter for Integration relay)**. **Meta-callback ingest DEFERRED to T25-slice-2** — see PM notes for rationale.
- **Spec source of truth**: `docs/spec/02-hotel-core.md` §1.9 (endpoints), §2.8 (DDL), §6 RBAC row `/api/wa-templates*`, §7 error catalog (`WA_TEMPLATE_LOCKED`); `docs/spec/MVP-HOTEL-CORE-FIRST.md` §C5 (AC) + §4.8 (approved-lock rule) + §W2/W4/W5 pattern for RPC stubs.
- **Module template**: `docs/MODULE_TEMPLATE.md`. Living reference: `src/modules/departments/` (T21 approved) — same 8-file layout + port/adapter subdirs for the RPC seam.

**Scope — slice-1 (5 public endpoints)**

| Method   | Path                             | Purpose                                                                                     |
| -------- | -------------------------------- | ------------------------------------------------------------------------------------------- |
| `GET`    | `/api/wa-templates`              | List global + hotel-specific for `req.tenant.hotelId`                                       |
| `POST`   | `/api/wa-templates`              | Create hotel-scoped template (`status='pending'`) + call `IntegrationRelayPort.relaySubmit` |
| `PATCH`  | `/api/wa-templates/:id`          | Edit hotel-scoped template — locked when `status IN ('approved','archived')` → 422          |
| `DELETE` | `/api/wa-templates/:id`          | `pending` → delete row · `rejected`/`approved` → update `status='archived'`                 |
| `POST`   | `/api/wa-templates/:id/resubmit` | Only valid when `status='rejected'` → set `pending` + clear `rejection_reason` + relay      |

**Deferred to T25-slice-2 (Meta-callback ingest)**
- Internal endpoint `POST /internal/wa-templates/:id/status` (Integration → HC) to flip `pending` → `approved`/`rejected` + fill `approved_at`/`template_id_meta`/`rejection_reason`.
- **Why deferred**: needs HMAC verify plugin (`src/plugins/verify-hmac.ts`) + `INTEGRATION_SHARED_SECRET` env — both are foundation/security cross-cutting per CLAUDE.md §6 WAJIB and PARENT §10; NOT settings-module scope. Building the HMAC helper inline would risk duplicate plugin + drift when foundation eventually ships the canonical one. Slice-2 will bundle: (a) foundation HMAC plugin, (b) `INTEGRATION_SHARED_SECRET` env, (c) internal callback route, (d) status-flip service method (already scaffoldable in slice-1 as an unexported method for slice-2 to wire). **Slice-1 satisfies MVP §C5 AC in full** (5 public endpoints listed; Meta-callback is called out in spec §1.9:289 but NOT in MVP AC bullet).

**Data model** (already migrated via T02, verified `prisma/schema.prisma:343-363` — do NOT touch schema)
- Table `wa_templates`, DDL at `docs/spec/02-hotel-core.md:601-627`.
- Prisma model `WaTemplate` fields: `id`, `hotelId (nullable)`, `name`, `body`, `variables JSONB (default '[]')`, `language (default 'id')`, `status (default 'pending')`, `templateIdMeta`, `rejectionReason`, `isGlobal (default false)`, `approvedAt`, timestamps.
- Migration CHECKs (verified in T02): `status IN ('pending','approved','rejected','archived')` + scope XOR `(is_global=true AND hotel_id IS NULL) OR (is_global=false AND hotel_id IS NOT NULL)` + `UNIQUE (hotel_id, name) NULLS NOT DISTINCT`.

**RBAC** (spec §6:808 — `/api/wa-templates*`):
- `super_admin`: yes · `gm_admin`: yes · `dept_head`: **NO** · staff: **NO**.
- Wire via `@plugins/rbac.js` `requireRole(ctx, ['gm_admin'])` (super_admin bypass at `rbac.ts:46` — T21 verified pattern).
- **Global templates (`is_global=true`)**: **read-only at hotel level**. List includes them; POST/PATCH/DELETE/resubmit on `is_global=true` row → **403 FORBIDDEN** (see GAP T25-#1).

**Business rules (all in service; use existing error hierarchy from T07-slice-1 + T04)**
- POST: `status='pending'`, `hotel_id=ctx.hotelId`, `is_global=false` **hardcoded** — clients cannot elevate to global (spec §1.9:295 — global = "pre-approved by Qooma team", HC hotel-scope endpoint never creates global). Then call `integrationRelay.relaySubmit({templateId, hotelId, name, body, language, variables})`; adapter (log-only for slice-1) writes structured log line.
- PATCH: `loadOwned` → tenant check → if `row.isGlobal === true`: `throw new ForbiddenError('Global template read-only at hotel level', {...})` → if `row.status IN ('approved','archived')`: `throw new BusinessRuleError('WA template locked', { rule: 'WA_TEMPLATE_LOCKED' })` (422) → apply patch to `name`/`body`/`variables`/`language` only (immutable fields: `status`, `template_id_meta`, `rejection_reason`, `approved_at`, `is_global`, `hotel_id`).
- DELETE: `loadOwned` → tenant → if `isGlobal`: 403 → if `status='pending'`: `repo.delete(id)` → if `status IN ('approved','rejected')`: `repo.update(id, {status:'archived'})` → if `status='archived'`: 404 (already archived, idempotent-safe or `ConflictError('WA_TEMPLATE_ALREADY_ARCHIVED')` — see GAP T25-#3).
- RESUBMIT: `loadOwned` → tenant → if `isGlobal`: 403 → if `status !== 'rejected'`: `BusinessRuleError({rule:'WA_TEMPLATE_NOT_REJECTED'})` (422) → `repo.update(id, {status:'pending', rejectionReason:null})` → `integrationRelay.relaySubmit(...)`.
- UNIQUE(hotel_id, name) violation → 409 `ConflictError({reason:'WA_TEMPLATE_NAME_TAKEN', name})` (P2002 catch pattern from T21).

**Files to create**
```
src/modules/wa-templates/
├── wa-templates.types.ts                             (DomainWaTemplate, WaTemplateWire, DTO types)
├── wa-templates.schema.ts                            (zod: create body + update body + resubmit param
│                                                       + list query + id param; WaTemplateStatus enum
│                                                       type-only; variables[] array of z.string())
├── wa-templates.serializer.ts                        (Prisma row → snake_case wire)
├── wa-templates.repository.ts                        (Prisma direct — ADR-0001;
│                                                       findMany with global-OR-hotel WHERE,
│                                                       findById, create, update, delete)
├── wa-templates.service.ts                           (all business rules above; consumes
│                                                       IntegrationRelayPort via constructor)
├── wa-templates.routes.ts                            (Fastify plugin: 5 handlers; thin
│                                                       requireTenant → requireRole → parse
│                                                       → service → send)
├── ports/
│   └── integration-relay.port.ts                     (interface: relaySubmit + relayResubmit)
├── adapters/
│   └── log-only-integration-relay.adapter.ts         (MVP stub per MVP §W2/W4/W5 pattern;
│                                                       winston log with structured payload;
│                                                       returns { relayedAt: Date, messageId: string })
├── index.ts                                          (barrel: routes plugin + service class +
│                                                       buildWaTemplatesService factory +
│                                                       IntegrationRelayPort + LogOnly adapter class +
│                                                       public types only)
└── __tests__/
    ├── wa-templates.service.test.ts                          (unit; mock repo + mock port;
    │                                                          branch coverage:
    │                                                          - approved-lock → 422
    │                                                          - archived-lock → 422
    │                                                          - global on hotel → 403
    │                                                          - resubmit not-rejected → 422
    │                                                          - delete state-branch (pending vs approved/rejected)
    │                                                          - is_global=false hardcoded on create
    │                                                          - relay called on POST + resubmit
    │                                                          - P2002 → CONFLICT translation
    │                                                          - cross-tenant 404 leak-safe)
    ├── wa-templates.routes.test.ts                           (unit; supertest-style Fastify inject;
    │                                                          happy path + 401 + 403 dept_head/staff
    │                                                          + 403 global-on-hotel-write
    │                                                          + 404 cross-tenant
    │                                                          + 422 lock + 422 name-required)
    ├── log-only-integration-relay.adapter.test.ts            (unit; verify log payload shape +
    │                                                          returns { messageId, relayedAt })
    └── wa-templates.repository.integration.test.ts           (testcontainers real Postgres;
                                                               CRUD; UNIQUE(hotel_id, name)
                                                               NULLS NOT DISTINCT; scope-XOR CHECK;
                                                               status-CHECK; tenant isolation;
                                                               global-visible-to-hotel list)
```

**Files to modify**
- **`src/entrypoints/api.ts`** — zero touch (T21 Override #1 pattern held; barrel-only wiring; DEP-4 registers).
- **Zero env changes for slice-1** (no INTEGRATION_SHARED_SECRET yet — that's slice-2).

**T25-slice-1 DoD**
- [ ] 5 public endpoints wired: GET list · POST create · PATCH edit · DELETE · POST resubmit
- [ ] Zod schemas at boundary: `CreateWaTemplateBodySchema` (name + body + variables[] + language optional) + `UpdateWaTemplateBodySchema.refine(non-empty).strict()` + `WaTemplateIdParamSchema` + `ListWaTemplatesQuerySchema` (status filter optional).
- [ ] Tenant scope: `hotel_id` sourced from `ctx.hotelId` on create; `hotel_id` never accepted from body. Cross-tenant 404 (leak-safe per spec §7); global templates visible cross-hotel via list only.
- [ ] RBAC: `requireRole(ctx, ['gm_admin'])` on all 5; `dept_head` + `staff` → 403 (verified via routes test). super_admin bypass via `requireRole` (T21 pattern).
- [ ] `is_global=true` hardcoded to `false` on POST (client cannot elevate); PATCH/DELETE/RESUBMIT on `is_global=true` row → 403 FORBIDDEN per GAP T25-#1 resolution.
- [ ] Approved-lock: PATCH on `status='approved'` OR `status='archived'` → 422 `WA_TEMPLATE_LOCKED` (spec §7 canonical code); envelope via `BusinessRuleError` (T07-slice-1 merged) → `{code:'BUSINESS_RULE', details:{rule:'WA_TEMPLATE_LOCKED', currentStatus:<status>}}`.
- [ ] Resubmit-guard: POST resubmit on `status !== 'rejected'` → 422 `BusinessRuleError({rule:'WA_TEMPLATE_NOT_REJECTED'})`.
- [ ] Delete semantics: `pending` → row deleted; `approved`/`rejected` → `status='archived'` update; `archived` → per GAP T25-#3 resolution.
- [ ] UNIQUE(hotel_id, name) NULLS NOT DISTINCT: P2002 catch (mirror T21 `isPrismaUniqueViolation` helper) → 409 `ConflictError({reason:'WA_TEMPLATE_NAME_TAKEN', name})`.
- [ ] `IntegrationRelayPort` port defined; `LogOnlyIntegrationRelayAdapter` MVP stub adapter implements it and logs structured payload via winston (`module:'wa-templates', event:'integration_relay_stub', action:'submit'|'resubmit', templateId, hotelId, name, language`); returns `{ messageId: '<generated-uuid>', relayedAt: new Date() }`. Slice-2 will add HTTP adapter.
- [ ] Service call sites for relay: POST + resubmit both call `integrationRelay.relaySubmit(...)` (or split `relaySubmit`/`relayResubmit` — exec choice, document in PLAN).
- [ ] Response envelope: list = `{data: WaTemplateWire[]}` (small N per hotel — no cursor); single = `{data: WaTemplateWire}`; 201 on POST create; 200 on PATCH/RESUBMIT; 204 on DELETE-hard; 200 on DELETE-archive (returns updated row with `status:'archived'`).
- [ ] Winston logger scoped to handler via `req.log.info({module:'wa-templates', action, correlationId})` (T21 pattern).
- [ ] Unit tests: full branch coverage per file list above (mock repo + mock port).
- [ ] Integration test: real Postgres via testcontainers; UNIQUE(hotel_id, name) NULLS NOT DISTINCT proven; scope-XOR CHECK proven (attempt to insert `is_global=true, hotel_id=<uuid>` should fail); status-CHECK proven; tenant isolation + global-visible-cross-hotel-list proven.
- [ ] Line coverage ≥ 80% on new files (T21 shipped 96.07% — aim comparable).
- [ ] `make check` (unit only, Docker-free) PASS with baseline = 312/1/313 (T21 merged baseline) OR 278/1/279 (pre-T21 baseline if T21 not yet merged at SUBMIT time) — declare which in SUBMIT.
- [ ] `pnpm test:integration` PASS; all pre-existing suites regression-clean (departments/tickets/notifications/visits/guests).
- [ ] Drift scans clean (no `any`, no `console.log`, no `throw new Error`, no default export outside entrypoints, no forbidden imports, no `.skip`, no wrap-Prisma interface, no hardcoded URL/secret, no setTimeout-for-delay).
- [ ] Named exports only; barrel `index.ts` exposes public API (`waTemplatesRoutes` plugin + `WaTemplatesService` class + `buildWaTemplatesService` factory + `IntegrationRelayPort` interface + `LogOnlyIntegrationRelayAdapter` class + DTO types); NO repository/serializer/schema-parser internal leak.
- [ ] Zero touch on `src/entrypoints/api.ts` (T21 Override #1 held).

**PM notes for Executor C**

- **Living reference**: `src/modules/departments/` (T21 approved) is the closest layout twin. Mirror service structure (`loadOwned` helper, P2002 `isPrismaUniqueViolation` helper, snake_case serializer, `.strict()` zod bodies, `refine(non-empty)` on update, thin routes, correlationId propagation).
- **Port + adapter is REQUIRED** (CLAUDE.md §4 "WAJIB port + adapter" for Outbound notification RPC). Do NOT skip the port layer — even the log-only MVP adapter goes through the port. Slice-2 HTTP adapter must be plug-compatible; keep port surface minimal.
- **Session-context**: import `SessionUser`, `SessionRole`, `TenantContext` from `@plugins/tenant-guard.js` (Slot-A authoritative, Q-B-02 resolved).
- **Error hierarchy**: `BusinessRuleError` (422 domain rule) · `ConflictError` (409 UNIQUE/state) · `ForbiddenError` (403 global-on-hotel-write) · `NotFoundError` (404 leak-safe cross-tenant) · `ValidationError` (400 auto via error-handler from T07).
- **No env changes in slice-1** — `INTEGRATION_SHARED_SECRET` is slice-2 concern. If you need any env for the adapter (e.g., a base URL), stub the log-only adapter to not require env → env addition = slice-2 with HTTP adapter.
- **Fixture alignment**: integration test seed can use 3 of the 8 canonical global template names as `is_global=true` rows (e.g., `qooma_welcome`, `qooma_survey`, `qooma_daily_brief`) — matches spec §1.9 ADD-08.2 list. Hotel-scoped fixtures use hotel-specific names.
- **Baseline math for SUBMIT**: base your `make check` count on current `main` at submit time; T21 may or may not be merged. State the delta explicitly (T21 +34 + T25 +Δ = final).
- **Branch + commit**: `feat/wa-templates-lifecycle` · `feat(wa-templates): T25 slice-1 lifecycle + log-only Integration relay stub`.
- **PLAN expectations**: session-start gate + files list + approach paragraph + GAP responses. Q-B-01/Q-B-02/Q-C-01..-03 already resolved; do NOT re-raise.
- **Estimated size**: ~6h (slightly larger than T21 due to 5 endpoints + port/adapter + state-machine branching). If crossing ~4h with more than half done, post mid-task CHECKPOINT.

**Expected GAPs — surface in PLAN before coding**

- **T25-#1** — Global template edit-attempt from hotel scope: 403 FORBIDDEN vs 422 `GLOBAL_TEMPLATE_READONLY`? Spec §1.9:295 phrasing "read-only at hotel level" suggests authorization semantic (RBAC-adjacent). **PM lean: 403 FORBIDDEN** — matches spec phrasing + "hotel cannot mutate what Qooma team owns" auth semantic + doesn't overload BusinessRuleError with tenancy concerns. Alternative 422 `GLOBAL_TEMPLATE_READONLY` acceptable if exec finds a strong reason. Confirm choice in PLAN.
- **T25-#2** — `name` field: enum-lock to the 8 ADD-08.2 canonical names or permissive VARCHAR(80)? Spec §1.9 lists 8 standard names as "8 standard names" AND SQL comment at §2.8:606 says "one of 8 ADD-08.2 names + **hotel-specific**". Migration is permissive VARCHAR(80). **PM lean: permissive** — mirror migration + supports hotel-specific extension per SQL comment. Enum-lock would break custom hotel templates.
- **T25-#3** — DELETE on `status='archived'`: 404 (idempotent-safe treatment: "not found for delete purposes") or 409 `WA_TEMPLATE_ALREADY_ARCHIVED`? **PM lean: 409 with `ConflictError({reason:'WA_TEMPLATE_ALREADY_ARCHIVED'})`** — preserves "row exists but action invalid" semantic + gives FE a definitive signal. 404 would misrepresent state.
- **T25-#4** — Port method signature: single `relaySubmit(payload)` used by both POST and resubmit (idempotent from Integration side, differentiated by `templateId` presence in Meta) or split `relaySubmit`/`relayResubmit` (two methods, clearer intent)? **PM lean: single `relaySubmit(payload)` with an `intent: 'create' | 'resubmit'` field on payload** — smaller port surface + slice-2 HTTP adapter easier to wire. Exec welcome to propose split if there's a concrete reason.

Awaiting PM C ACK before coding begins.

#### PLAN T25-slice-1 — exec-C (Satrio) at 2026-07-03 H0

**Scope recap**
WA Templates lifecycle slice-1: 5 public endpoints (`GET/POST /api/wa-templates`, `PATCH/DELETE /api/wa-templates/:id`, `POST /api/wa-templates/:id/resubmit`) + `IntegrationRelayPort` interface + `LogOnlyIntegrationRelayAdapter` MVP stub (winston structured log per MVP §W2/W4/W5). Business rules: approved-lock 422 `WA_TEMPLATE_LOCKED`; global-on-hotel-write 403 (Q-T25-#1 lean); resubmit-guard 422 `WA_TEMPLATE_NOT_REJECTED`; DELETE state-branch (`pending` → hard delete; `approved`/`rejected` → archive; `archived` → 409 per T25-#3 lean); P2002 → 409 `WA_TEMPLATE_NAME_TAKEN`. Prisma direct (ADR-0001); tenant scope via `assertHotelOwnership`; RBAC `requireRole(ctx, ['gm_admin'])` (super_admin implicit). Snake_case wire via serializer. `is_global=false` hardcoded on POST. Meta-callback ingest deferred to slice-2.

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity confirmed: Executor, Slot C (Satrio) ✓
- CLAUDE.md loaded ✓
- Task spec read: `docs/spec/02-hotel-core.md` §1.9 endpoints (lines 274-295), §2.8 DDL (lines 601-627), §6 RBAC row line 808, §7 error catalog line 829 ✓ ; `docs/spec/MVP-HOTEL-CORE-FIRST.md` §C5 + §W2/W4/W5 pattern (queued for spot-read during coding) ✓
- Parent docs spot-read: `src/modules/departments/` (T21 approved — layout twin: schema.strict + refine-non-empty, `loadOwned`, `isPrismaUniqueViolation`, serializer snake_case, thin routes), `src/plugins/tenant-guard.ts` + `rbac.ts` (T21 verified pattern), `src/core/errors/app-errors.ts` (`BusinessRuleError` L104, `ConflictError` L51, `ForbiddenError` L37), `prisma/schema.prisma:343-363` (WaTemplate model), migration `20260701112000_add_hc_check_constraints_and_partial_indexes/migration.sql:73-80` (status CHECK + scope XOR) ✓
- Dependencies: T02 ✓ (schema+migrations), T03 ✓ (tenant-guard), T04 ✓ (rbac), T05 ✓ (seed reference — global fixture names from spec §1.9 ADD-08.2), T07-slice-1 ✓ (`BusinessRuleError`), T21 ✓ (living-reference pattern approved) — all approved
- `make typecheck` clean ✓ (post-T21 merge; verified 2026-07-03 H0) · `make lint` clean ✓ · `make test-unit` **312/1/313** (T21-merged baseline) ✓
- Scaffolder risk: **none** — no `pnpm create`/`pnpm dlx`; no schema.prisma edit; no new package (winston is stubbed in `@core/logger` — adapter uses same `Logger` interface as T21 startup warn); no env changes for slice-1

**Files to create**
```
src/modules/wa-templates/
├── wa-templates.types.ts                             (DomainWaTemplate, WaTemplateWire,
│                                                       WaTemplateStatus type-only union,
│                                                       WaTemplateRow, list filters + response envelopes)
├── wa-templates.schema.ts                            (zod: CreateWaTemplateBodySchema (strict)
│                                                       + UpdateWaTemplateBodySchema.refine(non-empty).strict
│                                                       + WaTemplateIdParamSchema
│                                                       + ListWaTemplatesQuerySchema (status filter))
├── wa-templates.serializer.ts                        (Prisma row → snake_case wire)
├── wa-templates.repository.ts                        (Prisma direct — ADR-0001; findManyForHotel
│                                                       [global-OR-hotelId WHERE], findById, create,
│                                                       update, delete, countByHotelAndName [Q-T25-#5])
├── wa-templates.service.ts                           (loadOwned + state-machine branches;
│                                                       injects IntegrationRelayPort;
│                                                       Q-T25-#5 pre-check via countByHotelAndName)
├── wa-templates.routes.ts                            (Fastify plugin: 5 handlers; thin;
│                                                       T21 pattern: requireTenant → requireRole
│                                                       → parse → service → send)
├── ports/
│   └── integration-relay.port.ts                     (interface IntegrationRelayPort with single
│                                                       method relaySubmit({intent, templateId,
│                                                       hotelId, name, body, language, variables}) —
│                                                       Q-T25-#4 lean confirmed)
├── adapters/
│   └── log-only-integration-relay.adapter.ts         (impl: winston-shaped Logger, structured log
│                                                       payload, returns {messageId: crypto.randomUUID(),
│                                                       relayedAt: new Date()})
├── index.ts                                          (barrel: waTemplatesRoutes plugin +
│                                                       WaTemplatesService class +
│                                                       buildWaTemplatesService factory +
│                                                       IntegrationRelayPort interface +
│                                                       LogOnlyIntegrationRelayAdapter class +
│                                                       public types only)
└── __tests__/
    ├── wa-templates.service.test.ts                          (unit; mock repo + mock port;
    │                                                          all 9 branch cases from PM DoD)
    ├── wa-templates.routes.test.ts                           (unit; Fastify inject;
    │                                                          happy + 401 + 403 dept_head/staff/global
    │                                                          + 404 cross-tenant + 422 lock)
    ├── log-only-integration-relay.adapter.test.ts            (unit; verify log payload shape +
    │                                                          returns {messageId, relayedAt})
    └── wa-templates.repository.integration.test.ts           (testcontainers real Postgres;
                                                               scope-XOR CHECK, status CHECK,
                                                               tenant isolation, global-visible-cross-hotel,
                                                               UNIQUE assertion behavior per Q-T25-#5)
```

**Files to modify**
- **Zero** — `src/entrypoints/api.ts` untouched (T21 Override #1 held; barrel wiring; DEP-4 registers). No env changes (slice-2 concern).

**Approach**
Mirror T21 module layout: `types → schema → serializer → repository → service → routes → barrel`. Add `ports/` + `adapters/` subdirs for the port+adapter mandate per CLAUDE.md §4 (outbound RPC — WAJIB). Repository stays Prisma-direct (ADR-0001); the port only wraps the RPC seam. Service constructor takes `(repo, integrationRelay, opts?)`; `loadOwned` mirrors T21 for cross-tenant 404 (leak-safe); `isPrismaUniqueViolation` P2002 helper reused (copy from T21 pattern — small pure fn, not worth extracting yet). State-machine branches consolidated in one `assertNotLocked(row)` + `assertNotGlobalForWrite(row)` guards used by PATCH/DELETE/RESUBMIT. POST hardcodes `isGlobal=false`, `status='pending'`, and drops any client-supplied `hotel_id`/`is_global`/`status` at zod boundary (`.strict()` rejects unknown fields; my schema simply omits them). Global visibility on list: repository builds `where` as `{ OR: [{ isGlobal: true }, { hotelId: ctx.hotelId }] }` (unless super_admin — then unscoped). Delete state-branch returns 200 with archived row for approved/rejected, 204 for pending-hard-delete. Resubmit calls repository update + then port.relaySubmit(intent='resubmit'); POST calls create + port.relaySubmit(intent='create'). LogOnly adapter reuses the existing stubbed `Logger` (matches T21 startup warn — no new dep). Tests: service branch coverage via mock repo + mock port (9 cases per DoD); routes via Fastify inject (mirrors T21 routes test); adapter unit test verifies log payload + return shape; integration testcontainer proves DB CHECKs, scope XOR, tenant isolation, and the actual UNIQUE behavior (see Q-T25-#5).

**GAP responses** (Q-T25-#1..#4 pre-surfaced by PM; #5 discovered during spec/migration cross-check)

- **Q-T25-#1 (global-write 403 vs 422)** → **Accepting PM lean: 403 FORBIDDEN**. Rationale: matches spec §1.9:295 "read-only at hotel level" auth semantic; keeps `BusinessRuleError` scoped to state-transition rules (not tenancy). Envelope: `ForbiddenError('Global template read-only at hotel level', { reason: 'GLOBAL_TEMPLATE_READONLY' })`.

- **Q-T25-#2 (name enum-lock vs permissive)** → **Accepting PM lean: permissive** `z.string().min(1).max(80)` (matches migration VARCHAR(80) + spec §2.8:606 "hotel-specific" carve-out). Enum-lock breaks hotel custom-template use case. Follow-up ticket if PO wants soft-lint recommendation on 8 canonical names.

- **Q-T25-#3 (DELETE on archived — 404 vs 409)** → **Accepting PM lean: 409** `ConflictError('WA template already archived', { reason: 'WA_TEMPLATE_ALREADY_ARCHIVED', currentStatus: 'archived' })`. Preserves "row exists but action invalid" semantic; FE gets definitive signal.

- **Q-T25-#4 (port shape — single vs split)** → **Accepting PM lean: single `relaySubmit(payload)` with `intent: 'create' | 'resubmit'`**. Smaller port surface; slice-2 HTTP adapter simpler; log-only adapter differentiates intent in payload for observability. Full signature:
  ```ts
  interface IntegrationRelaySubmitInput {
    readonly intent: 'create' | 'resubmit';
    readonly templateId: string;
    readonly hotelId: string;
    readonly name: string;
    readonly body: string;
    readonly language: string;
    readonly variables: readonly unknown[];
  }
  interface IntegrationRelayResult {
    readonly messageId: string;
    readonly relayedAt: Date;
  }
  interface IntegrationRelayPort {
    relaySubmit(input: IntegrationRelaySubmitInput): Promise<IntegrationRelayResult>;
  }
  ```

- **GAP T25-#5** (new — spec/migration divergence) — **UNIQUE(hotel_id, name) NULLS NOT DISTINCT is defined in spec §2.8:623 but NOT in the actual migration** (`prisma/migrations/20260701111952_init_hotel_core/migration.sql:209-224` and `20260701112000_add_hc_check_constraints_and_partial_indexes/migration.sql:73-80` — neither adds the UNIQUE). So P2002 will NEVER fire in DEV/staging today. ASSIGNMENT DoD line 483 assumes the constraint exists.
  - **Options**: A) Add a new migration in this task (`20260703_add_wa_templates_hotel_name_unique/migration.sql`) restoring the spec's UNIQUE NULLS NOT DISTINCT + regenerate Prisma client — foundation-scope encroachment but aligns spec+migration+code atomically. B) Ship without the constraint; keep `isPrismaUniqueViolation` catch code for future forward-compat; add an app-layer pre-check via `countByHotelAndName(hotelId, name)` before create/update to detect duplicates fail-fast (races possible but rare on this admin endpoint). C) Ship without either — accept duplicates silently until foundation adds the constraint. D) Raise as GAP to Parent PM, pause coding.
  - **My intent**: **B** — app-layer pre-check + P2002 catch (defensive both ways). B keeps T25 within Slot C scope + gives correct UX today; the P2002 catch acts as belt-and-suspenders once foundation ships the migration. Race window is ~50ms per admin write on the same name in the same hotel — acceptable risk on a settings surface. I'll note the actual DB migration gap in SUBMIT for PM C escalation to Parent PM/foundation. If PM prefers A (add migration here), I can — small SQL diff — but wanted PM ratify before touching foundation-scope files.

Q-B-01/Q-B-02/Q-C-01..-03 already resolved per prior task ACKs — not re-raising.

**Est.**: ~5–6h (5 endpoints + port/adapter + state-machine branching). Mid-task CHECKPOINT if crossing ~4h with >3 files incomplete.

Awaiting PM C ACK.

##### PM C ACK — T25-slice-1 PLAN APPROVED with 3 tightenings (proceed to coding, 2026-07-03 H0)

Structural approach ✓ · Files list ✓ (mirrors T21 8-file + ports/adapters subdirs) · session-start gate ✓ (spec/migration cross-check discipline continued from T21 — including catching a real foundation gap, see GAP T25-#5 handling below) · baseline 312/1/313 matches post-T21-merge main ✓ · GAP responses #1–#4 all accept PM leans with clean rationale ✓ · Port interface signature reads correctly (`readonly` throughout, discriminated `intent`) ✓.

**GAP T25-#5 handling — PM ratifies Option B + escalates to Parent PM/foundation**

Independently verified: `prisma/migrations/20260701111952_init_hotel_core/migration.sql:209-225` creates `wa_templates` with no UNIQUE(hotel_id, name); the second migration `20260701112000_add_hc_check_constraints_and_partial_indexes/migration.sql:73-80` adds only the two CHECKs. Compare `menu_categories` at `20260701111952_init_hotel_core/migration.sql:403` — `CREATE UNIQUE INDEX "menu_categories_hotel_name_unique"` present, so T02 knew how to add these. Missing constraint on `wa_templates` is a genuine foundation gap (analogous to T21 Note #1 spec-vs-migration divergence, this time an **omission** not an **enum drift**).

**Ruling**:
- **Slot C ships Option B** in T25-slice-1: (a) `repo.countByHotelAndName(hotelId, name)` pre-check on create + update-name paths → throw `ConflictError({reason:'WA_TEMPLATE_NAME_TAKEN'})` fail-fast; (b) keep the `isPrismaUniqueViolation` P2002 catch as belt-and-suspenders (dead branch today, live branch post-foundation-fix). Race window (~50ms per same-hotel same-name admin write) documented in service JSDoc.
- **Slot A owns the fix** — I'll escalate to Parent PM §3b + §10 today. Foundation task candidate: T-INFRA-05 or `chore(foundation): add wa_templates hotel_name UNIQUE constraint` — small SQL diff (mirror `menu_categories_hotel_name_unique`). Not a T25 blocker. Do NOT touch `prisma/migrations/` in this task — foundation-scope + cross-slot ownership.
- **When foundation lands**: no code change needed here. The `countByHotelAndName` pre-check is idempotent-safe against a real UNIQUE constraint; P2002 catch flips from dead to live.
- Registered as Q-T25-#5 in §3b (slot mirror) + rolling to PARENT §3b at ACK commit time.

**3 code-level tightenings** (must land in the shipped code — flag in SUBMIT that they held)

1. **`variables` typing** — spec §2.8:606 defines `variables JSONB DEFAULT '[]'::jsonb — array of variable names` (spec §1.9:284 confirms "array of variable names"). Tighten:
   - Zod: `variables: z.array(z.string().min(1).max(64)).max(50).optional()` (bounded per T21 pattern; string-array not any-JSON).
   - Port `IntegrationRelaySubmitInput.variables`: `readonly string[]` (not `readonly unknown[]`).
   - DomainWaTemplate + wire DTO: `string[]`.
2. **`language` zod validation** — migration is `VARCHAR(8) DEFAULT 'id'`. Accept `z.string().min(2).max(8).default('id')` on POST body; make optional on PATCH.
3. **Adapter log payload discipline** — include the exact keys `{module: 'wa-templates', event: 'integration_relay_stub', intent, templateId, hotelId, name, language, correlationId?}` so observability (grep + Loki labels) works. `correlationId` is best-effort (adapter is called from service, not route — if service can thread it via a per-call arg, thread it; otherwise omit and log a TODO for slice-2's HTTP adapter to plumb the header).

**Coding checklist reminders** (things easy to miss)

- **POST security posture**: `.strict()` zod body rejects unknown fields — but ALSO explicitly drop client-supplied `hotel_id`/`is_global`/`status`/`template_id_meta`/`rejection_reason`/`approved_at` even if the schema shape looked to allow them. Belt-and-suspenders since `.strict()` already rejects, but a JSDoc note above the create() method reinforces the invariant.
- **Global template state-machine**: for `is_global=true` rows visible to a hotel, PATCH/DELETE/RESUBMIT ALL hit the 403 gate BEFORE the state check. So a `qooma_welcome` global template in `approved` state → PATCH from hotel = 403 (not 422). Same for DELETE and resubmit. Test coverage: 3 tests, one per verb.
- **Cross-tenant leak-safety**: `loadOwned` returns 404 (not 403) for cross-tenant rows. For global rows (`is_global=true`), `loadOwned` succeeds — they're visible to all hotels — then the `assertNotGlobalForWrite` guard flips it to 403 on write attempts. Read (`GET /:id` if you have it — you don't per ASSIGNMENT, only list) would succeed.
- **UPDATE-name change race with `countByHotelAndName`**: on PATCH that changes `name`, run the pre-check with the NEW name against `hotelId=ctx.hotelId AND id != currentId`. Don't false-positive against the row being edited.
- **DELETE state-branch return codes**: 204 on hard-delete (`pending`), 200 with archived row body on soft-archive (`approved`/`rejected`), 409 on already-archived (per Q-T25-#3).
- **Resubmit clears `rejection_reason`** to `null` explicitly (not just drop from update payload — Prisma won't null a field unless you `set: null` or pass `null`).
- **Fixture strategy for integration test**: seed 3 global rows (`qooma_welcome`, `qooma_survey`, `qooma_daily_brief` — from spec ADD-08.2 canonical list) with `is_global=true, hotel_id=null`. Seed hotel-specific rows under HOTEL_A + HOTEL_B. Verify list-for-HOTEL_A returns 3 global + N HOTEL_A + 0 HOTEL_B.
- **P2002 catch on update-name**: same helper as create; test the branch even though it's currently dead pre-foundation (guarded via `jest.spyOn(prismaClient.waTemplate, 'update').mockRejectedValue({code: 'P2002'})`).
- **pnpm-store note**: `pnpm install --frozen-lockfile` then `pnpm prisma:generate` if types missing. Do NOT `pnpm rebuild @prisma/client` (T21 lesson).

**Slot A / Slot B awareness**
- Zero touch on Slot A owned surface (no migration edit; env.ts untouched for slice-1).
- Zero touch on Slot B modules (independent DB writes; no shared table).
- Foundation gap Q-T25-#5 rolled to PARENT — Slot A queue candidate, not blocking Slot C.

**Mid-task CHECKPOINT trigger**: same as T21 — post if crossing ~4h with >3 files still incomplete. Otherwise straight-line to SUBMIT.

Proceed to coding on `feat/wa-templates-lifecycle`. Awaiting your SUBMIT.

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
| Q-C-01        | `operating_hours` JSONB shape not fully specified in spec §1.5 (cross-refs API-CONTRACT §2.10 absent from repo). Enum/tighten now or leave permissive for MVP? | T21 · exec-C PLAN GAP #1 | **resolved (provisional, PM C ratified 2026-07-03)** | Permissive `z.object({}).catchall(z.unknown())` — parses `{}` and forwards any JSON forward-compat. Tighten in FE-driven follow-up ticket if MSW/UX diverges. Zero-break risk since forward-compat schema. |
| Q-C-02        | `users.department_id` cross-DB check impossible under Opsi C dev-DB deviation (users lives in Auth DB, not `hotel_core_dev`). Skip in DEV or gate behind env flag? | T21 · exec-C PLAN GAP #2 | **open (PO ratify before staging)** — implementation shipping under safe defaults | `SKIP_CROSS_DB_CHECKS` env flag added to `core/config/env.ts` (`z.coerce.boolean().default(true)`). Service skips `users` count when flag is `true`; tickets check always runs. Startup WARN when flag is `true` + `NODE_ENV === 'production'` prevents silent prod ship. Root fix = PARENT §4 Opsi A / Prisma multi-schema (foundation, PO decision). Will roll up to PARENT §3b at T21 SUBMIT. |
| Q-C-03        | `escalation_chain.skip_to_l3_categories` — spec §1.5:195 lists `['vvip','urgent','complaint']` as examples; enum-lock or permissive? | T21 · exec-C PLAN GAP #3 | **resolved (provisional, PM C ratified 2026-07-03)** | Permissive with bounds: `z.array(z.string().min(1).max(32)).max(20)`. Spec is illustrative not exhaustive; permissive-with-bounds prevents unbounded payload. Enum-lock deferred to PO-driven ticket if desired. |
| Q-T25-#5      | **Foundation gap**: spec §2.8:623 defines `wa_templates_hotel_name_unique UNIQUE (hotel_id, name) NULLS NOT DISTINCT` but the actual migrations (`20260701111952_init_hotel_core/migration.sql:209-225` + `20260701112000_add_hc_check_constraints_and_partial_indexes/migration.sql:73-80`) DO NOT add it. Compare `menu_categories_hotel_name_unique` at `20260701111952_init_hotel_core/migration.sql:403` — present. Genuine omission in T02. | T25 · exec-C PLAN GAP #5 · discovered via spec/migration cross-check | **open — rolls up to PARENT §3b + §10 for Slot A / foundation fix** | Slot C T25-slice-1 ships Option B: `repo.countByHotelAndName(hotelId, name)` app-layer pre-check + P2002 catch as belt-and-suspenders (dead branch pre-fix, live post-fix). Foundation fix (add `CREATE UNIQUE INDEX wa_templates_hotel_name_unique ON wa_templates (hotel_id, name) NULLS NOT DISTINCT` migration mirroring `menu_categories_hotel_name_unique`) rolls to Slot A. **When foundation lands**: no code change needed in Slot C — pre-check remains idempotent-safe; P2002 catch flips dead→live. Race window ~50ms per same-hotel same-name admin write documented in service JSDoc. |

---

## 4. Drift baseline (slot C files only, end of each day)

| Run | Touched files | `any` | console.log | `throw new Error(` | forbidden imports | default export (di luar entry) | `.skip` | hardcoded URL | webhook tanpa HMAC | wrap-Prisma interface |
| --- | ------------- | ----- | ----------- | ------------------ | ----------------- | ------------------------------ | ------- | ------------- | ------------------ | --------------------- |
| H0 baseline | (no src/ touched) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-07-03 T21 SUBMIT | src/modules/departments/** (10) + src/core/config/env.ts (+7 lines additive) | 0 | 0 | 0 (env.ts:91 pre-existing boilerplate `5ce7f867`, not this task) | 0 | 0 | 0 | 0 | 0 (N/A no webhook) | 0 |

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
