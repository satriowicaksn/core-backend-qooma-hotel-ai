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
- **Active task**: **T21 Departments CRUD** — PLAN ACK'd 2026-07-03 H0 with 1 override (no `api.ts` touch); Executor C coding on `feat/settings-departments-crud`
- **Branch**: `feat/settings-departments-crud`
- **Next gate (global)**: G1 — lihat `PM-STATUS-PARENT.md §5`
- **My queue (preview)**: T21 wip; T22–T30 backlog (see §8 note) — T26 + T30 hard-blocked at DEV by Opsi C DB deviation (PARENT §4)

---

## 1. Task tracker (slot C — PM C authority)

> Mirror dari `PM-STATUS-PARENT.md §1` di mana Slot=C. PM C update status row di sini + push status update ke PARENT §1 setelah verdict.

| T## | Title                              | Status   | Verified by PM | Notes                                 |
| --- | ---------------------------------- | -------- | -------------- | ------------------------------------- |
| T21 | Departments CRUD (escalation tree + operating hours) | wip (PLAN ACK'd with 1 override) | — | PLAN ACK'd 2026-07-03 H0. Files scope: `src/modules/departments/*` (8 files) + `src/core/config/env.ts` additive (`SKIP_CROSS_DB_CHECKS` per Q-C-02). Zero touch on `src/entrypoints/api.ts` (Slot B convention: barrel-only wiring; DEP-4 will register at foundation ship). 3 GAPs registered §3 (Q-C-01/-02/-03). Awaiting Executor C SUBMIT. |

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
