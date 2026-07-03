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

- **Day**: H0 (2026-07-03) — Slot C **4/10 approved+merged**; **T29 wip**
- **Recent activity**:
  - **T21 Departments CRUD** — **MERGED** (PR #11 `bbf4bd7`) ✓
  - **T25 WA templates lifecycle (slice-1)** — **MERGED** (PR #12 `437bb3a`) ✓
  - **T27 Billing (slice-1)** — **MERGED** (PR #13 `af02167`) ✓
  - **T28 Settings/agents (Min-3)** — **MERGED** (PR #14 `0e68a38`) ✓
  - **T29 Settings/voice groundwork** — PLAN ACK'd 2026-07-03 H0 with 2 tightenings + Q-T29-#1 spec-ambiguity escalation. Exec self-claimed from T28 VERDICT §0 preview. Executor C coding on `feat/settings-voice`.
- **Branches**: `feat/settings-voice` (T29, wip)
- **Next gate (global)**: G1 — lihat `PM-STATUS-PARENT.md §5`
- **My queue (preview)**: T21+T25+T27+T28 merged; T29 wip; T22/T23/T24 now fully unblocked (T09 CSV import merged + T08 storage merged); T26+T30 hard-blocked at DEV by Opsi C.

---

## 1. Task tracker (slot C — PM C authority)

> Mirror dari `PM-STATUS-PARENT.md §1` di mana Slot=C. PM C update status row di sini + push status update ke PARENT §1 setelah verdict.

| T## | Title                              | Status   | Verified by PM | Notes                                 |
| --- | ---------------------------------- | -------- | -------------- | ------------------------------------- |
| T21 | Departments CRUD (escalation tree + operating hours) | **approved+merged** | PM C (Satrio) | ✅ APPROVED attempt 1 + **MERGED to main 2026-07-03 (PR #11 `bbf4bd7`)**. 11 files (10 module + `env.ts` additive `SKIP_CROSS_DB_CHECKS`). `make check` **312/1/313** (+34 net); coverage **96.07%**. Q-C-02 open at PARENT §3b (PO ratify pre-staging). |
| T25 | WA templates lifecycle + Meta-callback ingest (**slice-1 approved+merged**) | **approved+merged** (slice-1) | PM C (Satrio) | ✅ APPROVED attempt 1 + **MERGED to main 2026-07-03 (PR #12 `437bb3a`)**. 13 files (6 module + 1 port + 1 adapter + 1 barrel + 4 tests). `make check` **363/1/364** (+51 net: 34 service + 12 routes + 5 adapter); `pnpm test:integration` **104/1/105** (all 6 suites regression-clean); coverage **96.68% lines** module-wide. Drift 0/9 clean (2 eslint-disable in barrel with justification — accepted; foundation config nudge for Slot A at PARENT §10). Zero touch `api.ts`/`env.ts`/`prisma/migrations/`. All 3 tightenings held (variables:string[], language bounded, adapter log payload). All 4 GAP resolutions delivered. **Q-T25-#5 stays open** at PARENT §3b (foundation UNIQUE constraint missing from T02 — Slot A T-INFRA-05 candidate; Slot C code idempotent-safe post-fix). **Slice-2 (Meta-callback ingest) blocked** on foundation HMAC plugin + INTEGRATION_SHARED_SECRET env — separate ticket. |
| T27 | Billing (overview + upgrade + invoice + daily brief) (**slice-1 approved+merged**) | **approved+merged** (slice-1) | PM C (Satrio) | ✅ APPROVED attempt 1 + **MERGED to main 2026-07-03 (PR #13 `af02167`)**. 16 files. `make check` **411/1/412** (+40 net); coverage **96.68%**. Q-T27-#7 stays open at PARENT §3b (Slot A T-INFRA-06 candidate). Deferred slices blocked on foundation prereqs. |
| T28 | Settings/agents config (Min-3 enforcement) (**approved+merged**) | **approved+merged** | PM C (Satrio) | ✅ APPROVED attempt 1 + **MERGED to main 2026-07-03 (PR #14 `0e68a38`)**. 10 files. `make check` **450/1/451** (+39 net); coverage **97.65%**. First Slot C module with 0 eslint-disable. Q-T28-#1 stays open PARENT §3a (PO ratify tier-cap semantics). |
| T29 | Settings/voice groundwork stub (**wip**) | wip (PLAN ACK'd with 2 tightenings) | — | Exec self-claimed from T28 VERDICT §0 preview + PM ratified. PLAN ACK'd 2026-07-03 H0. Scope: 3 endpoints (`GET /api/settings/voice` empty-default fallback + `PUT` upsert + `POST /test` stub with soft guard). No port/adapter (stub /test not external RPC; wave 2a task adds real SIP/Twilio adapter). 2 tightenings held: (a) POST /test guard uses `BusinessRuleError` 422 `VOICE_NOT_CONFIGURED` (not ValidationError 400 — precondition rule matches T25/T28 pattern); (b) winston observability at BOTH PUT + POST /test routes. **Q-T29-#1 spec-ambiguity escalated to PARENT §3a** (MVP §101 "always returns empty" vs spec §1.5 GET/PUT paired verbs — Slot C ships option B, PUT persists + GET reflects; idempotent to either PO resolution). GAP #2/#4/#5 all accept exec leans. Zero touch `api.ts`/`env.ts`/`prisma/migrations/`/`core/`/`plugins/`/`shared/socket/`. Awaiting Executor C SUBMIT. |

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

#### SUBMIT T25-slice-1 — exec-C (Satrio) at 2026-07-03 H0 (attempt 1)

Task: WA templates lifecycle (slice-1) — 5 public endpoints + IntegrationRelayPort + LogOnly adapter
Branch: `feat/wa-templates-lifecycle` @ `138edcd` (pushed to origin)
Files changed: 11 new (zero modified — `api.ts`, `env.ts`, `prisma/migrations/` all untouched)
  - `src/modules/wa-templates/wa-templates.types.ts` (new)
  - `src/modules/wa-templates/wa-templates.schema.ts` (new)
  - `src/modules/wa-templates/wa-templates.serializer.ts` (new)
  - `src/modules/wa-templates/wa-templates.repository.ts` (new)
  - `src/modules/wa-templates/wa-templates.service.ts` (new)
  - `src/modules/wa-templates/wa-templates.routes.ts` (new)
  - `src/modules/wa-templates/ports/integration-relay.port.ts` (new)
  - `src/modules/wa-templates/adapters/log-only-integration-relay.adapter.ts` (new)
  - `src/modules/wa-templates/index.ts` (new — barrel with `buildWaTemplatesService` factory)
  - `src/modules/wa-templates/__tests__/wa-templates.service.test.ts` (new)
  - `src/modules/wa-templates/__tests__/wa-templates.routes.test.ts` (new)
  - `src/modules/wa-templates/__tests__/log-only-integration-relay.adapter.test.ts` (new)
  - `src/modules/wa-templates/__tests__/wa-templates.repository.integration.test.ts` (new)

**DoD self-check** (from ASSIGNMENT T25-slice-1 lines 475-495)
- [x] 5 public endpoints wired: GET list · POST create · PATCH edit · DELETE state-branch · POST resubmit — `wa-templates.routes.ts:47,64,80,97,120`.
- [x] Zod schemas: `CreateWaTemplateBodySchema.strict()` + `UpdateWaTemplateBodySchema.strict().refine(non-empty)` + `WaTemplateIdParamSchema` + `ListWaTemplatesQuerySchema.strict()` — `wa-templates.schema.ts:29-46,48-59,61-63,66-70`.
- [x] Tenant scope: `hotelId` from `ctx.hotelId` on create (never body); `loadOwned` → `assertHotelOwnership` on hotel-scoped rows; global rows visible cross-hotel via list but 403 on write (see next). Cross-tenant 404 leak-safe via `NotFoundError('WaTemplate', id)`.
- [x] RBAC: `requireRole(ctx, ['gm_admin'])` on every handler; super_admin bypass via `requireRole` implicit; dept_head/staff both 403 verified in routes tests.
- [x] `is_global` hardcoded false on POST (`wa-templates.service.ts:114`); PATCH/DELETE/RESUBMIT on global row → 403 `GLOBAL_TEMPLATE_READONLY` (Q-T25-#1) via `assertNotGlobalForWrite` guard applied BEFORE state check (PM ACK coding note held).
- [x] Approved-lock: `assertNotLocked` throws `BusinessRuleError({rule:'WA_TEMPLATE_LOCKED', currentStatus})` when `status IN ['approved','archived']` (`service.ts:47-54`).
- [x] Resubmit-guard: `BusinessRuleError({rule:'WA_TEMPLATE_NOT_REJECTED', currentStatus})` when `status !== 'rejected'` (`service.ts:227-232`).
- [x] Delete state-branch: `pending` → hard delete + service returns `null` → route 204; `approved|rejected` → update `status='archived'` + returns row → route 200; `archived` → `ConflictError({reason:'WA_TEMPLATE_ALREADY_ARCHIVED', currentStatus:'archived'})` per Q-T25-#3.
- [x] Q-T25-#5 pre-check: `repo.countByHotelAndName(hotelId, name, excludeId?)` before create AND before update-when-name-changes; P2002 catch as belt-and-suspenders (dead branch today, live post-foundation-fix). Both paths translate to `ConflictError({reason:'WA_TEMPLATE_NAME_TAKEN'})`.
- [x] `IntegrationRelayPort` defined with single `relaySubmit(input)` method (Q-T25-#4); `IntegrationRelaySubmitInput.variables: readonly string[]` per tightening #1; `LogOnlyIntegrationRelayAdapter.relaySubmit` emits winston payload with exact keys per tightening #3, returns `{messageId: randomUUID(), relayedAt: new Date()}`.
- [x] Service calls `integrationRelay.relaySubmit` on both POST (`intent: 'create'`) and resubmit (`intent: 'resubmit'`).
- [x] Response envelope: list `{data: WaTemplateWire[]}` · single `{data: WaTemplateWire}` (Q-B-01); **201** on POST create; **200** on PATCH/RESUBMIT and DELETE-archive; **204** on DELETE-hard-delete.
- [x] Winston logger scoped via `req.log.info({module:'wa-templates', action, correlationId})` in each handler (T21 pattern).
- [x] Unit tests: full branch coverage per DoD line 488 — 9+ cases across service + routes + adapter (see coverage below).
- [x] Integration test: real Postgres via testcontainers; scope-XOR CHECK proven (2 tests); status CHECK proven (1 test); tenant isolation + global-visible-cross-hotel-list proven; Q-T25-#5 pre-check behaviour proven (same-hotel dup rejected, same-name-different-hotel allowed — foundation UNIQUE absent case explicitly asserted).
- [x] Line coverage ≥ 80% on new files — **96.68% lines / 97.14% stmts** across `src/modules/wa-templates/**`.
- [x] `make check` PASS — 363/1/364 unit tests (baseline = 312/1/313 T21-merged, delta **+51**: 34 service + 12 routes + 5 adapter).
- [x] `pnpm test:integration` PASS — 104/1/105 tests (baseline 83/1/84 post-T21, delta **+21**).
- [x] Drift scans clean (see below).
- [x] Named exports only; barrel exposes public API (`waTemplatesRoutes` plugin + `WaTemplatesService` + `LogOnlyIntegrationRelayAdapter` + `buildWaTemplatesService` factory + `IntegrationRelayPort/Input/Result` + wire/body types). Two `eslint-disable-next-line no-restricted-imports` in the barrel with justification comments (barrel/factory is sanctioned wiring seam per CLAUDE.md §4 — service still consumes port only, verified).
- [x] Zero touch on `src/entrypoints/api.ts` (T21 Override #1 held). Zero env / migration touches.

**3 PM tightenings — all held**
- **#1 `variables: string[]`** — zod `z.array(z.string().min(1).max(64)).max(50)`; port input `readonly string[]`; wire DTO `readonly string[]`; serializer narrows defensively to guard JSONB anomalies.
- **#2 `language` bounded** — zod `z.string().min(2).max(8)`; default `'id'` applied at service layer when body omits it.
- **#3 adapter log payload** — exact keys emitted: `module: 'wa-templates'`, `event: 'integration_relay_stub'`, `intent`, `templateId`, `hotelId`, `name`, `language`, `messageId`; `correlationId` conditionally included when passed (best-effort per ACK; slice-2 HTTP adapter will plumb x-correlation-id end-to-end). Verified by adapter unit test that pins the exact key set.

**Quality gate**
- `make typecheck`: **PASS**
- `make lint`: **PASS** (0 errors, 0 warnings — 2 inline eslint-disable in barrel for `no-restricted-imports` with justification comments; documented above)
- `make format-check`: **PASS**
- `make test-unit`: **PASS** — 363 passed, 1 skipped, 364 total (baseline 312/1/313 + **+51**)
- `pnpm test:integration`: **PASS** — 104 passed, 1 skipped, 105 total (baseline 83/1/84 + **+21**)
- `make check`: **PASS** end-to-end

**Drift scans** (`src/modules/wa-templates/`)
- `: any|<any>|as any` (excl `@ts-expect-error`): **0**
- `console.log/info/debug`: **0**
- `throw new Error(` in service/repo/route/adapter (excl tests): **0** (test files use `throw new Error('expected throw')` as jest assertion helpers only — 6 hits, allowed pattern per T21 precedent)
- Forbidden imports (`express`/`typeorm`/`sequelize`/`moment`/`node-fetch`): **0**
- Default export outside entrypoints/config: **0**
- `.skip(` in tests: **0**
- Hardcoded URL / secret: **0** (adapter is log-only; no HTTP endpoint)
- Wrap-Prisma interface: **0** (`WaTemplatesRepository` is Prisma-direct per ADR-0001)
- `setTimeout` for delay: **0**

**Security check**
- HMAC verified before business logic: **N/A** for slice-1 (no callback ingest; that's slice-2 with foundation HMAC plugin + `INTEGRATION_SHARED_SECRET`).
- Token encryption via `shared/utils/crypto`: **N/A** (no token storage).
- PII masking in log: **N/A** (WA template metadata is operational config, not guest PII; adapter logs `name`/`hotelId`/`templateId` — no phone/email).
- `hotel_id` NEVER from body — enforced at zod boundary (`.strict()` rejects unknown fields including `hotel_id`, `is_global`, `status`, `template_id_meta`, `rejection_reason`, `approved_at`) + JSDoc invariant on `create()` reinforcing the belt-and-suspenders per PM ACK coding note.
- No secret hardcoded: **confirmed**.

**Test evidence**
- Unit: 51 new tests (34 service + 12 routes + 5 adapter)
- Integration: 21 new tests
- Coverage (`src/modules/wa-templates/**`, ran with `--coverageThreshold='{}'`):
  ```
  All files                             | 97.14 stmts | 82.05 branch | 96.55 funcs | 96.68 lines
   wa-templates.repository.ts           | 100         | 100          | 100         | 100
   wa-templates.routes.ts               | 98.11       | 60           | 100         | 98.07
   wa-templates.schema.ts               | 100         | 75           | 100         | 100
   wa-templates.serializer.ts           | 100         | 75           | 100         | 100
   wa-templates.service.ts              | 93.75       | 83.33        | 100         | 94.80
   ports/integration-relay.port.ts      | 100         | 100          | 100         | 100
   adapters/log-only-….adapter.ts       | 100         | 100          | 100         | 100
   index.ts                             | 100         | 100          | 25          | 100
  ```

Sample request/reply (Fastify inject — DEP-4 not landed):
```
POST /wa-templates
> body {"name":"hotel_promo","body":"Halo {{g}}","variables":["g"]}
< 201 Created
< {"data":{"id":"…","hotel_id":"…","name":"hotel_promo","status":"pending","is_global":false, …}}
# adapter emits: {module:"wa-templates", event:"integration_relay_stub", intent:"create", templateId, hotelId, name, language, messageId}

DELETE /wa-templates/:id (status=pending)
< 204 No Content
# hard delete

DELETE /wa-templates/:id (status=approved)
< 200 OK
< {"data":{...,"status":"archived"}}

POST /wa-templates/:id/resubmit (status=rejected)
< 200 OK
< {"data":{...,"status":"pending","rejection_reason":null}}
# adapter emits with intent:"resubmit"

PATCH /wa-templates/:id (row status=approved)
< 422 Unprocessable Entity
< {"code":"BUSINESS_RULE","message":"WA template locked","details":{"rule":"WA_TEMPLATE_LOCKED","currentStatus":"approved"}}

PATCH /wa-templates/:id (row is_global=true)
< 403 Forbidden
< {"code":"FORBIDDEN","message":"Global template read-only at hotel level","details":{"reason":"GLOBAL_TEMPLATE_READONLY","templateId":"…"}}
```

**Notes / questions for PM C**

1. **Q-T25-#5 foundation gap — code ready for post-fix** (info, action = Slot A ticket). Slice-1 ships Option B as ratified: `repo.countByHotelAndName` pre-check on create + update-name paths (verified by integration test "should ALLOW same name across different hotels" — proves absence of DB UNIQUE today), plus `isPrismaUniqueViolation` P2002 catch (dead branch today, live post-foundation). When Slot A adds `CREATE UNIQUE INDEX wa_templates_hotel_name_unique ON wa_templates (hotel_id, name) NULLS NOT DISTINCT`, **no Slot C code change needed** — the pre-check remains idempotent-safe, the P2002 catch flips dead→live. Roll-up to PARENT §3b + §10 per PM ACK.

2. **`correlationId` plumbing for adapter** (info). Adapter accepts `correlationId?` on the port input; service does NOT currently thread it because it's not in the port's initial call site (service isn't reading `req.log` context). Once DEP-4 lands foundation Fastify bootstrap, service could take a per-call `correlationId` arg from route → thread to adapter. Deferred as tightening #3 explicitly said "best-effort … TODO for slice-2's HTTP adapter to plumb the header". Documented in adapter code (`log-only-integration-relay.adapter.ts:35-37`).

3. **`WA_TEMPLATE_ARCHIVED_LOCK` semantics** — Q-T25-#3 archived is 409 CONFLICT. But note: PATCH on archived is 422 `WA_TEMPLATE_LOCKED` (via `assertNotLocked`), DELETE on archived is 409 `WA_TEMPLATE_ALREADY_ARCHIVED` (Q-T25-#3), RESUBMIT on archived is 422 `WA_TEMPLATE_NOT_REJECTED` (via status !== 'rejected'). Three different error codes for three different intents on the same terminal state — I believe that matches spec + your Q-T25-#3 lean (each carries a definitive signal), but flagging for verification.

4. **No `variables` DB-level CHECK** — zod at boundary enforces `string[]` bounded (tightening #1); serializer defensively narrows non-string entries; but DB has no CHECK constraint. A manual DB insert with `variables: [42, {"foo":"bar"}]` would survive → serializer would drop non-strings. Not a slice-1 concern (no ingest path bypasses zod), but flagging as foundation-adjacent for future hardening if PO wants.

5. **PATCH `body` accepts empty string?** Currently zod requires `body.min(1)` on both create AND update. If FE ever needs to send `body: ""` deliberately, we'd 400 it. Believe this is correct per spec §2.8 (`body TEXT NOT NULL`), but flagging.

Requesting PM C VERDICT.

##### VERDICT T25-slice-1 — APPROVED (attempt 1, 2026-07-03 H0) by PM C

✅ **APPROVED**. All 18 DoD boxes verified, independent PM validation on `feat/wa-templates-lifecycle` @ `138edcd`.

**PM independent validation** (per PM-AGENT §3)

Step 1 — Task match: DoD 1:1 map to ASSIGNMENT + PM ACK constraints (3 tightenings + Q-T25-#5 workaround + coding checklist reminders) ✓
Step 2 — Drift-detection scans (rerun by PM on branch):
```
: any|<any>|as any (excl @ts-expect-error)         : 0
console.log|info|debug                              : 0
throw new Error( (service/repo/routes/adapter/port) : 0
default export outside entrypoints/config           : 0
forbidden imports (express|typeorm|moment|node-fetch): 0
.skip( in tests                                     : 0
IRepository / ICache interface wrap of Prisma       : 0
hardcoded URL / secret                              : 0
setTimeout(..., >=1000ms) for job delay             : 0
eslint-disable                                      : 2 (both index.ts no-restricted-imports with justification comments — see audit below)
```

**eslint-disable audit** — 2 hits at `src/modules/wa-templates/index.ts:8` + `:16` for `no-restricted-imports`. ESLint config (`eslint.config.mjs`) restricts `**/adapters/*` imports to force service-via-port composition. The barrel factory is the sanctioned composition-root wiring point (Slot B modules + T21 departments don't hit this because they have no adapters — T25 is the first Slot C module with port+adapter). Two options considered: (a) exempt `src/modules/*/index.ts` in ESLint config (Slot A ownership territory, cross-slot PR); (b) local `eslint-disable` with explicit prose justification. Exec chose (b) — minimal-invasive, precedent-set for future Slot C modules with adapters (T27 billing likely). **Accepted**. Foundation follow-up candidate for Slot A: add `src/modules/*/index.ts` exemption to `eslint.config.mjs`. Non-blocking; nudge routed to PARENT §10.

Step 3 — File inventory: **13 files created** (`git show --name-only 138edcd` — 6 module + 1 port + 1 adapter + 1 barrel + 4 tests). SUBMIT header claims "11 new" but bullet list has 13 items — cosmetic count typo in header, not scope drift. All 13 files exactly match PLAN inventory. Zero touch on `src/entrypoints/api.ts` / `src/core/config/env.ts` / `prisma/migrations/` — Override #1 held per T21 pattern. Branch is stale relative to main on PM-STATUS files (branched before PM-STATUS-A/-C main updates); this is fine because exec commit touches ZERO PM-STATUS files — squash-merge diff = 13 files exactly.

Step 4 — Quality gate (independent rerun by PM):
- `make check` **PASS 363/1/364** (baseline 312/1/313 post-T21-merge + **+51 net**: 34 service + 12 routes + 5 adapter); Docker-free (T-INFRA-03 mitigation held); 1.336s
- `pnpm test:integration` **PASS 104/1/105** — all 6 module suites green (departments 13 + guests 10 + notifications 15 + tickets 25 + visits 20 + wa-templates 21 new). Slot B + T21 regression clean.
- `make typecheck` + `make lint` + `make format-check` all PASS

Step 5 — Spot-check 3 random files:
- `wa-templates.service.ts`: comments explain WHY (Q-T25-#5 rationale L91-95, spec §7 ref L28-29, PM ACK coding notes L149, L153); public methods have explicit return types; `assertHotelOwnership` correctly reused for hotel-scoped rows + skipped for global rows (`row.isGlobal` guard at L251 before assert); global check (`assertNotGlobalForWrite`) fires BEFORE state check on PATCH/DELETE/RESUBMIT per PM ACK; P2002 catch in both create + update paths; explicit `rejectionReason: null` on resubmit L227 per PM ACK; JSDoc invariant on `create()` L83-89 documents server-set-only fields belt-and-suspenders; state-branch on DELETE returns `WaTemplateResponse | null` correctly ✓
- `wa-templates.routes.ts`: thin handlers per Slot B/T21 convention (`requireTenant → requireRole → parse → service → send`); correlationId propagated via helper L33-39; 201 on POST-create, 204 on DELETE-hard, 200 on PATCH/RESUBMIT/DELETE-archive (state-branch handled at L110-113); routes at `/wa-templates` (no `/api` prefix — added at plugin registration; spec §1.9 `/api/wa-templates` = prefix + route, matches T21 `/settings/departments` pattern) ✓
- `wa-templates.repository.ts`: Prisma direct (ADR-0001 compliant); `countByHotelAndName(hotelId, name, excludeId?)` with `excludeId` param per PM ACK coding note L40-43 (excludes self on PATCH-name); `count` query not `findMany` (cheaper — T21 pattern); ordering `[{isGlobal:'desc'}, {name:'asc'}]` a UX bonus (globals surface first in list) ✓
- Bonus: `ports/integration-relay.port.ts` — `readonly` throughout, discriminated `intent`, `variables: readonly string[]` (tightening #1 held), `correlationId?: string` optional (tightening #3 signal) ✓
- Bonus: `adapters/log-only-integration-relay.adapter.ts` — exact log keys `{module, event:'integration_relay_stub', intent, templateId, hotelId, name, language, messageId, correlationId?}` per tightening #3 held verbatim; uses `Logger` interface (no direct winston import); returns `Promise.resolve({messageId: randomUUID(), relayedAt: new Date()})` ✓
- Bonus: `wa-templates.schema.ts` — tightening #1 held (`variables = z.array(z.string().min(1).max(64)).max(50)`); tightening #2 held (`language = z.string().min(2).max(8)`); `.strict()` on all body schemas; `.refine(non-empty)` on update; permissive `name` per Q-T25-#2 ✓
- Bonus: `index.ts` barrel — public API only (routes plugin + service class + adapter class for composition + port interface types + wire/body types); `WaTemplatesRepository` NOT re-exported (internal); `LogOnlyIntegrationRelayAdapter` IS re-exported (composition-root wiring pattern for slice-2 HTTP adapter swap); factory `buildWaTemplatesService(db, {logger, integrationRelay?})` with default-adapter fallback ✓

Step 6 — Security floor: no webhook in slice-1 (HMAC N/A — slice-2 concern); no token storage (crypto N/A); no PII (WA template metadata operational config, not guest data); `hotel_id` sourced from `ctx.hotelId` on create — verified `service.ts:108`; `.strict()` zod rejects any client-supplied `hotel_id`/`is_global`/`status`/`template_id_meta`/`rejection_reason`/`approved_at` (belt-and-suspenders); JSDoc invariant on `create()` reinforces; no secret hardcoded ✓

Step 7 — Test coverage: line **96.68%** across `wa-templates/**` (exceeds ≥ 80% DoD; repo/serializer/ports/adapter/index all 100%; routes 98.07; schema 100 lines; service 94.80). Branch coverage 82.05% — uncovered branches are defensive fallbacks (routes 60% is the 401 helper branch; serializer 75% is JSONB narrowing defensiveness; service 83% includes P2002 catch dead branch per Q-T25-#5 pending foundation UNIQUE). All coverage misses justified ✓

Step 8 — Verdict: **APPROVED**

**PM annotations on exec Notes**

- **Note #1 (Q-T25-#5 code ready for post-fix)** ✓ verified. Integration test "should ALLOW same name across different hotels" empirically proves DB UNIQUE absence today; `countByHotelAndName` pre-check is primary guard; `isPrismaUniqueViolation` catch is belt-and-suspenders. Zero-code-change when Slot A ships migration. Q-T25-#5 status unchanged at PARENT §3b: **open, foundation candidate**.
- **Note #2 (`correlationId` best-effort plumbing)** ✓ accepted as designed. Slice-2 HTTP adapter will end-to-end plumb `x-correlation-id`.
- **Note #3 (three error codes for three verbs on archived state)** — PM ratifies. PATCH→422 `WA_TEMPLATE_LOCKED`, DELETE→409 `WA_TEMPLATE_ALREADY_ARCHIVED`, RESUBMIT→422 `WA_TEMPLATE_NOT_REJECTED`. Each semantically distinct signal. Consistent with spec §7 discriminator philosophy.
- **Note #4 (no DB CHECK on `variables`)** — accepted as future foundation-hardening candidate. Zod + defensive serializer narrowing cover ingest path. Not registered as open Q; low-priority.
- **Note #5 (`body: min(1)` blocks empty string)** — PM ratifies. Spec §2.8 `body TEXT NOT NULL` + semantic sanity. If FE ever needs empty-body case, revisit — zero-value cost to blocking today.

**Slot A / Slot B awareness**
- Zero touch on Slot B files, Slot A owned surface (env.ts + migrations + api.ts + shared plugins all untouched).
- Q-T25-#5 stays open PARENT §3b (Slot A T-INFRA-05 candidate) — non-blocking for T25 merge.
- Slot A `no-restricted-imports` config nudge routed to PARENT §10 — small foundation refinement; will benefit T27 billing (likely port+adapter for PDF storage / Bull job producer).

**§1 task tracker updated · §0 focus updated · §4 drift baseline updated · PARENT §1 T25 row → approved · Short roll-up posted to PARENT §2 · Q-T25-#5 stays open PARENT §3b · new ESLint nudge added to PARENT §10.**

**PO merge please**: branch `feat/wa-templates-lifecycle` @ `138edcd` ready for main merge. Slice-2 (Meta-callback ingest) blocked on foundation HMAC plugin + `INTEGRATION_SHARED_SECRET` env — separate ticket. Slot C **2/10 approved** (T21 merged + T25-slice-1 approved-awaiting-merge).

---

### ASSIGNMENT T27 — Billing (overview + upgrade + invoice + daily brief) slice-1 — issued by PM C at 2026-07-03 H0

- **Routed from**: `PM-STATUS-PARENT.md §1` T27 (Slot C queue; next unblocked task per PM C selection — no PO-merge-chain deps).
- **Branch (to create on claim)**: `feat/settings-billing`
- **Slice ruling**: **slice-1 = 4 public read/stream endpoints + upgrade-notifier port/adapter stub + tier read behind SKIP_CROSS_DB_CHECKS gate**. Deferred to future tasks (all needing foundation prereqs):
  - **Quota meter increment endpoint** (Integration RPC receiver) — needs foundation HMAC plugin + `INTEGRATION_SHARED_SECRET` (same prereq as T25-slice-2 Meta-callback).
  - **`billing:threshold_reached` socket emit** — depends on meter increment path.
  - **Daily brief PDF generation worker (W3)** — needs T10 workers harness (Slot A wip).
  - **Monthly quota reset worker (W5)** — same as W3.
  - **Upgrade request persistence** — no `billing_upgrade_requests` table in T02; MVP ships log-only + Integration notifier stub; DB persistence a follow-up if PO wants audit trail.
- **Spec source of truth**: `docs/spec/02-hotel-core.md` §1.10 (endpoints) + §2.10 (3-table DDL) + §6 RBAC row `/api/settings/billing*` + `/api/billing*` + §7 error catalog; `docs/spec/MVP-HOTEL-CORE-FIRST.md` §C7 (AC — 4 endpoints listed) + §80 (daily-brief empty state) + §101 (seed current-month quota row).
- **Living reference**: `src/modules/wa-templates/` (T25-slice-1 approved) — has port+adapter subdirs. `src/modules/departments/` (T21) for tier-gate SKIP_CROSS_DB_CHECKS pattern.

**Scope — slice-1 (4 public endpoints)**

| Method   | Path                                       | Purpose                                                                             |
| -------- | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| `GET`    | `/api/settings/billing`                    | Overview aggregation — tier snapshot (Opsi C-gated), current-month quota, recent invoices, active extras, `daily_brief_pdf_url_latest` (nullable) |
| `POST`   | `/api/billing/upgrade-package`             | Validate target tier → log + call `UpgradeNotifierPort.notify(...)` → return 202 Accepted `{requestId, status:'pending_manual_review', requestedAt}` |
| `GET`    | `/api/billing/invoices/:id/download`       | Fetch `billing_invoices` row → verify tenant → resolve `pdf_url` object-storage key → stream via `ObjectStoragePort` with `Content-Type: application/pdf` + `Content-Disposition: attachment; filename="invoice-<number>.pdf"` |
| `GET`    | `/api/billing/daily-brief/latest.pdf`      | **404 in slice-1** with `code: 'DAILY_BRIEF_NOT_AVAILABLE'` per MVP §80 empty-state — W3 worker not built yet |

**Data model** (already migrated via T02, verified `prisma/schema.prisma:382-434` — do NOT touch schema)
- `billing_quotas` @ spec `docs/spec/02-hotel-core.md:651-666`: `id`, `hotelId`, `periodStart (DATE, first-of-month)`, `outboundQuotaTotal`, `outboundUsed`, `threshold80EmittedAt`, `threshold100EmittedAt`, `resetAt`, timestamps. UNIQUE(hotel_id, period_start). No `daily_brief_pdf_url_latest` column — slice-1 returns null for that field (see GAP T27-#5).
- `billing_invoices` @ 667-682: `id`, `hotelId`, `invoiceNumber (UNIQUE)`, `periodStart/End`, `amountIdr (Decimal 14,2)`, `status ∈ {issued, paid, overdue, void}` (CHECK), `pdfUrl (nullable VARCHAR 500)`, `issuedAt`, `paidAt`.
- `billing_extras` @ 684-694: `id`, `hotelId`, `type`, `qty`, `amountIdr`, `purchasedAt`, `expiresAt`.

**RBAC** (spec §6:812 — `/api/settings/billing*`):
- `super_admin`: yes · `gm_admin`: yes · `dept_head`: **NO** · staff: **NO**.
- `POST /api/billing/upgrade-package` + downloads: same RBAC (MVP §C7 lists all 4 as `gm_admin`).
- Wire via `@plugins/rbac.js` `requireRole(ctx, ['gm_admin'])` (T21/T25 verified pattern).

**Business rules**
- **Overview aggregation** (`GET /api/settings/billing`):
  - Tier snapshot: read `hotels.tier_id → tiers` join. **Opsi C**: cross-DB join impossible when `SKIP_CROSS_DB_CHECKS=true`. Return `tier: null` (with observability WARN at prod+flag=true — mirror T21 Q-C-02 pattern from `departments.service.ts:55-64`).
  - Current-month quota: `findLatestQuota(hotelId, currentPeriodStart)` where `periodStart = first-day-of-month(now())`. If no row exists (first month or MVP §101 seed missing), return `quota: null` — do NOT auto-create (that's W5 monthly-reset worker's job).
  - Invoices: `listRecent(hotelId, {limit: 12})` — 12 most recent by `issuedAt DESC`. Fixed limit for slice-1 (no cursor pagination — invoices are few per hotel).
  - Extras: `listActive(hotelId, now())` — where `expiresAt IS NULL OR expiresAt > now()`.
  - Daily brief: `daily_brief_pdf_url_latest: null` in slice-1 (worker W3 not built).
- **Upgrade request** (`POST /api/billing/upgrade-package`):
  - Zod body: `{targetTier: 'professional' | 'luxury' | 'enterprise'}` (GAP T27-#2). Note: `'lite'` NOT in target enum (downgrade not supported in MVP; if PO wants, extend later).
  - Generate `requestId = randomUUID()`.
  - Call `upgradeNotifier.notify({requestId, hotelId, targetTier, userId: ctx.userId, requestedAt})` (log-only adapter for MVP).
  - Return **202 Accepted** `{data: {requestId, status: 'pending_manual_review', requestedAt}}`.
  - No DB persistence in slice-1 (GAP T27-#3).
- **Invoice download** (`GET /api/billing/invoices/:id/download`):
  - `loadOwnedInvoice(ctx, id)` — tenant scope + cross-tenant 404 leak-safe.
  - If `invoice.pdfUrl` is null → 404 `INVOICE_PDF_NOT_AVAILABLE`.
  - Object storage key resolution: `pdfUrl` field contains **storage key** (not full URL) per spec convention. `ObjectStoragePort.download(key)` returns Buffer (verify T08 adapter interface).
  - If storage returns null / adapter throws NOT_FOUND-shaped error → 404 `INVOICE_PDF_NOT_FOUND` (storage race — pdfUrl set but file missing).
  - Success: `reply.type('application/pdf').header('Content-Disposition', 'attachment; filename="invoice-<invoiceNumber>.pdf"').send(buffer)`.
- **Daily brief** (`GET /api/billing/daily-brief/latest.pdf`):
  - Slice-1: throw `NotFoundError('Daily brief', 'latest', {code: 'DAILY_BRIEF_NOT_AVAILABLE'})` OR appropriate app-error.
  - Slice-2 (when W3 lands): resolve latest key from `billing_quotas.daily_brief_pdf_url_latest` (new column) OR convention `daily-briefs/{hotelId}/{YYYY-MM-DD}.pdf`.

**Files to create**
```
src/modules/billing/
├── billing.types.ts                                    (DomainBillingOverview, DomainInvoice,
│                                                        DomainQuota, DomainExtra, DomainTierSnapshot,
│                                                        UpgradeRequestResult, wire DTOs)
├── billing.schema.ts                                   (zod: UpgradePackageBodySchema,
│                                                        InvoiceIdParamSchema, no list-query schemas)
├── billing.serializer.ts                               (Prisma rows → snake_case wire;
│                                                        Decimal → string for amountIdr)
├── billing.repository.ts                               (Prisma direct — findLatestQuota,
│                                                        findInvoiceById, listRecentInvoices,
│                                                        listActiveExtras)
├── billing.service.ts                                  (overview aggregation + upgrade + invoice
│                                                        download + daily brief 404;
│                                                        SKIP_CROSS_DB_CHECKS tier gate mirror T21;
│                                                        consumes UpgradeNotifierPort + ObjectStoragePort)
├── billing.routes.ts                                   (Fastify plugin: 4 handlers; thin;
│                                                        streaming reply for invoice; 202 for upgrade)
├── ports/
│   └── upgrade-notifier.port.ts                        (interface UpgradeNotifierPort.notify(input))
├── adapters/
│   └── log-only-upgrade-notifier.adapter.ts            (MVP stub — winston structured log per
│                                                        T25 adapter pattern; returns
│                                                        {requestId, notifiedAt})
├── index.ts                                            (barrel — plugin + service class +
│                                                        factory + port interface +
│                                                        LogOnly adapter class + wire types;
│                                                        eslint-disable pattern from T25 index.ts)
└── __tests__/
    ├── billing.service.test.ts                                (unit; mock repo + mock upgrade port +
    │                                                           mock ObjectStoragePort;
    │                                                           overview shape with quota null case +
    │                                                           tier null case (Opsi C flag=true);
    │                                                           upgrade returns 202 + calls port;
    │                                                           invoice happy + pdfUrl null + tenant 404;
    │                                                           daily brief 404 slice-1)
    ├── billing.routes.test.ts                                 (unit; Fastify inject;
    │                                                           happy + 401 + 403 dept_head/staff +
    │                                                           404 cross-tenant + PDF Content-Type +
    │                                                           Content-Disposition assertions)
    ├── log-only-upgrade-notifier.adapter.test.ts              (unit; verify log payload shape +
    │                                                           returns {requestId, notifiedAt})
    └── billing.repository.integration.test.ts                 (testcontainers real Postgres;
                                                                seed hotels + 2 months of quotas +
                                                                3 invoices in different statuses +
                                                                2 extras (1 active + 1 expired);
                                                                UNIQUE(hotel_id, period_start) proven;
                                                                UNIQUE(invoice_number) proven;
                                                                status CHECK proven; tenant isolation)
```

**Files to modify**
- **Zero** — `src/entrypoints/api.ts` untouched (T21 Override #1 held). Zero migration touches. Zero env changes (**reuse existing `SKIP_CROSS_DB_CHECKS`** for tier gate — no new flag).

**T27-slice-1 DoD**
- [ ] 4 public endpoints wired: GET overview · POST upgrade-package · GET invoice download · GET daily-brief latest.
- [ ] Zod schemas at boundary: `UpgradePackageBodySchema.strict()` with `targetTier ∈ {'professional','luxury','enterprise'}` + `InvoiceIdParamSchema` with UUID.
- [ ] Tenant scope: `hotelId` from `ctx.hotelId` on every query; cross-tenant 404 (leak-safe) proven on invoice download.
- [ ] RBAC: `requireRole(ctx, ['gm_admin'])` on all 4; `dept_head` + `staff` → 403 (verified via routes test).
- [ ] Overview aggregation: parallel `Promise.all([tier, quota, invoices, extras])` for latency; graceful nulls where source missing.
- [ ] Tier snapshot: reuse `SKIP_CROSS_DB_CHECKS` env — when `true`, service returns `tier: null` + winston WARN on prod+flag=true (mirror `departments.service.ts:55-64`). When `false` (post-Opsi-A restoration), read `hotels.tier_id → tiers` join and populate.
- [ ] Upgrade endpoint: 202 Accepted, `{data: {requestId, status:'pending_manual_review', requestedAt}}` envelope; `upgradeNotifier.notify(...)` called with structured payload.
- [ ] Invoice download: streams as `application/pdf` with `Content-Disposition: attachment; filename="invoice-<number>.pdf"`; 404 on missing row / null pdfUrl / storage-not-found.
- [ ] Daily brief: 404 in slice-1 with `code: 'DAILY_BRIEF_NOT_AVAILABLE'` per MVP §80.
- [ ] `ObjectStoragePort` consumed via constructor injection — DO NOT touch `src/core/storage/` internals; wire in barrel factory (`buildBillingService(db, {objectStorage, upgradeNotifier?, logger, skipCrossDbChecks, nodeEnv})`).
- [ ] Winston logger scoped via `req.log.info({module:'billing', action, correlationId})` (T21 pattern).
- [ ] Unit tests: full branch coverage — overview shape with quota-null + tier-null (Opsi C flag=true) + tier populated (flag=false path); upgrade calls port + returns 202; invoice happy + pdfUrl-null + storage-not-found + cross-tenant 404; daily brief 404.
- [ ] Integration test: real Postgres via testcontainers; seed 2 hotels × 2-month quota history + 3 invoices with varied statuses + 2 extras (1 active + 1 expired); prove UNIQUE(hotel_id, period_start) + UNIQUE(invoice_number) + status CHECK + tenant isolation.
- [ ] Line coverage ≥ 80% on new files (target 95%+ per T21/T25 precedent).
- [ ] `make check` PASS with baseline = 363/1/364 (T25-merged) or 312/1/313 (pre-T25 if T25 not yet merged at SUBMIT). Declare baseline in SUBMIT explicitly.
- [ ] `pnpm test:integration` PASS; all pre-existing suites regression-clean (departments/wa-templates/tickets/notifications/visits/guests).
- [ ] Drift scans clean (T21/T25 pattern).
- [ ] Named exports only; barrel exposes public API only.
- [ ] Zero touch on `src/entrypoints/api.ts` + `src/core/config/env.ts` + `prisma/migrations/` + `src/core/storage/**` + `src/shared/socket/**` (T21 Override #1 + no cross-cutting changes).
- [ ] `Decimal.js` amount serialization to string — do NOT emit `Decimal` object as JSON (broken JSON). Serializer converts `amountIdr.toString()` for wire.

**PM notes for Executor C**

- **Living reference**: `src/modules/wa-templates/` (T25) for port+adapter subdirs pattern + barrel eslint-disable pattern (both accepted at T25 VERDICT); `src/modules/departments/` (T21) for `SKIP_CROSS_DB_CHECKS` tier-gate + startup WARN pattern (mirror `service.ts:55-64` in billing service constructor).
- **T08 `ObjectStoragePort` consumption**: import from `@core/storage/object-storage.port.js`. Verify method signature (probably `download(key: string): Promise<Buffer | null>` or similar) before designing service call site. Consume via constructor + factory wiring in barrel.
- **`Decimal` field serialization**: Prisma returns `Decimal` object for `amountIdr` — MUST convert to string in serializer (`row.amountIdr.toString()` or `row.amountIdr.toFixed(2)` for consistent precision). JSON-emitting Decimal directly produces `{}` or vendor-specific shape.
- **Session context**: import `SessionUser`, `SessionRole`, `TenantContext` from `@plugins/tenant-guard.js`. `ctx.userId` needed for `upgradeNotifier.notify(...)`.
- **Error hierarchy**: `NotFoundError` (invoice/PDF 404), `ForbiddenError` (RBAC), `ValidationError` (400 auto), `ConflictError` (unused in slice-1), `BusinessRuleError` (unused unless upgrade tier-jump rule added — GAP T27-#2). No new error classes needed.
- **No new env in slice-1**: reuse `SKIP_CROSS_DB_CHECKS`. No `BILLING_STUB_TIER` or similar.
- **`Promise.all` in overview**: parallelize the 4 aggregation queries for latency — but wrap each in individual try/catch OR use `Promise.allSettled` if any single source failure should not fail the whole overview. PM lean: **fail-open** on Opsi C tier read (already null-returned), fail-closed on quota/invoice/extras queries (they're all local DB, failure is genuine).
- **Fixture strategy for integration test**: use T05 seed HOTEL_A + create HOTEL_B mid-test; seed `billing_quotas` current-month + prior-month per hotel to prove `findLatestQuota` filter; seed 3 invoices with statuses `issued`/`paid`/`overdue` (skip `void` for slice-1 unless test convenience); 2 extras (1 active, 1 expired via `expiresAt < now()`).
- **Streaming vs Buffer for invoice PDF**: MVP ship Buffer (`reply.type('application/pdf').send(buffer)`). Streaming with backpressure is a slice-2 optimization if PDFs get large (>5MB); T08 adapter interface likely returns Buffer anyway.
- **Baseline math for SUBMIT**: state your `make check` baseline explicitly — depends on whether T25 has merged at SUBMIT time.
- **Branch + commit**: `feat/settings-billing` · `feat(billing): T27 slice-1 overview + upgrade + invoice download + daily-brief-empty`.
- **PLAN expectations**: session-start gate + files list + approach + GAP responses. Q-B-01/-B-02/Q-C-01..-03/Q-T25-#1..#5 all resolved — do NOT re-raise.
- **Estimated size**: ~6-8h (biggest task yet — 3 tables + 4 endpoints + 2 ports + tier gate + streaming + upgrade flow). **CHECKPOINT WAJIB** if crossing ~4h with >4 files still incomplete.

**Expected GAPs — surface in PLAN before coding**

- **T27-#1** — Tier data source under Opsi C. Options: (A) return `tier: null` in overview + FE renders "tier unavailable" state; (B) add `BILLING_STUB_TIER` env for DEV UX with hardcoded matrix; (C) call Auth `/api/hotels/me` HTTP roundtrip. **PM lean: A** — mirrors T21 Q-C-02 SKIP_CROSS_DB_CHECKS pattern (no new env), simplest, forward-compatible with Opsi A restoration.
- **T27-#2** — Upgrade payload shape. Spec §1.10 doesn't specify. Options: (A) `{targetTier: 'professional'|'luxury'|'enterprise'}` minimum; (B) `{targetTier, notes?: string}` for hotel context; (C) unrestricted `{tier: string}` and let Qooma team validate. **PM lean: A** — enforce enum at zod, no free-form fields. Downgrade (`'lite'`) NOT accepted (not in MVP).
- **T27-#3** — Upgrade request persistence. Options: (A) log-only via port + return 202 with `requestId` (no DB record); (B) persist in `billing_extras` with `type='upgrade_request_<tier>'` (semantically odd); (C) escalate to Slot A for new migration. **PM lean: A** — matches spec phrasing "Backend confirms with Qooma team" (it's a notification, not self-serve). Audit trail via winston log + Integration relay stub for MVP.
- **T27-#4** — Invoice PDF Content-Disposition filename. Options: (A) `invoice-<invoiceNumber>.pdf` (spec-natural — uses invoice_number UNIQUE); (B) `invoice-<id>.pdf`; (C) FE-supplied via query. **PM lean: A**.
- **T27-#5** — Daily brief endpoint slice-1 behavior. Options: (A) 404 always with `code:'DAILY_BRIEF_NOT_AVAILABLE'` per MVP §80 empty state; (B) attempt convention-based key `daily-briefs/{hotelId}/latest.pdf` on storage and 404 if missing; (C) escalate to Slot A for `daily_brief_pdf_url_latest` column addition to `billing_quotas`. **PM lean: A** — slice-1 doesn't build the worker, so honestly reflect the state. When W3 worker lands (post-T10), evaluate B vs C.
- **T27-#6** — Overview `Promise.all` failure mode. Options: (A) `Promise.all` — any failure kills the whole overview (500); (B) `Promise.allSettled` — each source resolves independently, missing ones become null; (C) tier-fail-open but quota/invoice/extras-fail-closed. **PM lean: C** — tier is already null-tolerant under Opsi C, other queries are local DB and failure is genuine.

Awaiting PM C ACK before coding begins.

#### PLAN T27-slice-1 — exec-C (Satrio) at 2026-07-03 H0

**Scope recap**
4 endpoints: `GET /api/settings/billing` overview aggregation (tier snapshot via `SKIP_CROSS_DB_CHECKS` gate → null under Opsi C, mirror T21 Q-C-02) + `POST /api/billing/upgrade-package` (202 Accepted, log-only notifier stub) + `GET /api/billing/invoices/:id/download` (streams PDF as `application/pdf` w/ `Content-Disposition: attachment; filename="invoice-<number>.pdf"`) + `GET /api/billing/daily-brief/latest.pdf` (404 `DAILY_BRIEF_NOT_AVAILABLE` per MVP §80 empty-state — W3 worker deferred). Prisma direct (ADR-0001) over 3 tables. Two ports: `UpgradeNotifierPort` (log-only stub adapter, mirror T25's `IntegrationRelayPort` shape) + a **new local `BillingPdfStoragePort`** (see GAP #7 — core `ObjectStoragePort` lacks `download`). RBAC `requireRole(ctx, ['gm_admin'])`. `Decimal` amount serialized as string via `.toFixed(2)`. Tenant scope via `assertHotelOwnership` on invoice download (cross-tenant 404 leak-safe). Zero touch on `api.ts`/env/schema/migrations/`core/storage/`/`shared/socket/`.

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity confirmed: Executor, Slot C (Satrio) ✓
- CLAUDE.md loaded ✓
- Task spec read: `docs/spec/02-hotel-core.md` §1.10 (endpoints + tier matrix + quota semantics + daily brief empty state), §2.10 (3-table DDL lines 651-694), §6 RBAC row `/api/settings/billing*`, §7 error catalog (`WA_TEMPLATE_LOCKED` line 829 — separate area) ✓; `docs/spec/MVP-HOTEL-CORE-FIRST.md` §C7 (4 endpoints) + §80 (daily-brief empty state) ✓
- Parent docs spot-read: `src/modules/wa-templates/` (T25 living reference: port+adapter subdirs, factory pattern, eslint-disable barrel pattern, adapter unit test discipline), `src/modules/departments/` (T21 living reference: SKIP_CROSS_DB_CHECKS + startup WARN at `service.ts:55-64`), `src/plugins/tenant-guard.ts` (`assertHotelOwnership`, `TenantContext`), `src/plugins/rbac.ts` (`requireRole` super_admin implicit), `src/core/errors/app-errors.ts` (`NotFoundError`, `ForbiddenError`), `src/core/config/env.ts` (`SKIP_CROSS_DB_CHECKS` already present — no new env), `src/core/storage/object-storage.port.ts` (verified: `upload` + `delete` only, **no `download`** — see GAP #7), `prisma/schema.prisma:382-434` (3 billing models) ✓
- Dependencies: T02 ✓ · T03 ✓ · T04 ✓ · T05 ✓ · T07-slice-1 ✓ · T08 ✓ (storage port merged — but download absent, GAP #7) · T21 ✓ (Q-C-02 pattern) · T25 ✓ (port+adapter twin) — all approved and merged
- `make typecheck` clean ✓ (post-T25 + T10 merge) · `make lint` clean ✓ · `make test-unit` **371/1/372** ✓
- Scaffolder risk: **none**

**GAP responses** — accept all 6 PM leans + new GAP #7 for storage-port gap

- **Q-T27-#1 (tier data source)** → **Accepting PM lean A**: `tier: null` under `SKIP_CROSS_DB_CHECKS=true` + winston WARN on prod+flag=true (mirror `departments.service.ts:55-64`). No new env. FE renders "tier unavailable" state.
- **Q-T27-#2 (upgrade payload)** → **Accepting PM lean A**: `z.object({ target_tier: z.enum(['professional','luxury','enterprise']) }).strict()`. Downgrade (`'lite'`) rejected at zod boundary.
- **Q-T27-#3 (upgrade persistence)** → **Accepting PM lean A**: log-only + notifier port + return 202 `{data: {request_id, status: 'pending_manual_review', requested_at}}`. No DB write in slice-1.
- **Q-T27-#4 (PDF filename)** → **Accepting PM lean A**: `invoice-<invoiceNumber>.pdf`. Filename value sanitized to `[A-Za-z0-9._-]` at handler layer to prevent header injection (defense-in-depth even though `invoiceNumber` DB column is VARCHAR(40) already constrained by domain).
- **Q-T27-#5 (daily brief slice-1)** → **Accepting PM lean A**: `NotFoundError('Daily brief', 'latest', { code: 'DAILY_BRIEF_NOT_AVAILABLE' })` → 404. Route reserves URL; when W3 worker lands, swap handler body.
- **Q-T27-#6 (overview failure mode)** → **Accepting PM lean C**: `Promise.allSettled` on the tier call ONLY (fail-open → null), `Promise.all` for the 3 local-DB calls (fail-closed → 500 bubbles). Implementation: run tier via a try/catch that maps rejection to `null` + logs warn; then `Promise.all([quotaP, invoicesP, extrasP])`. Cleaner than mixed-`allSettled` for one arm.
- **GAP T27-#7 (NEW)** — **`ObjectStoragePort` missing `download` method**. Verified `src/core/storage/object-storage.port.ts` exposes only `upload` + `delete`. PM ASSIGNMENT §business rules line 917 assumes `ObjectStoragePort.download(key)` exists, but DoD line 998 forbids touching `src/core/storage/**`.
  - **Options**: A) define local `BillingPdfStoragePort` interface in `src/modules/billing/ports/billing-pdf-storage.port.ts` with method `download(key: string): Promise<Buffer | null>`; provide `InMemoryBillingPdfStorageAdapter` for tests; production wiring uses a small adapter wrapping AWS SDK `GetObjectCommand` (deferred — bootstrap DEP-4 concern). Slice-1 ships port + in-memory adapter + composition seam. Foundation follow-up: extend `ObjectStoragePort` with `download` (Slot A ticket), then billing barrel swaps to consume core port. B) escalate to Slot A for `ObjectStoragePort.download` addition now, pause T27-slice-1 until that lands. C) skip the invoice-download endpoint from slice-1 and defer to slice-2.
  - **My intent**: **A** — local port keeps Slot C scope clean, ships slice-1 in full, foundation follow-up is a small extend. Precedent: Q-T25-#5 handled a similar spec/foundation gap by shipping local behaviour with a foundation follow-up.

**Files to create**
```
src/modules/billing/
├── billing.types.ts                                    (DomainBillingOverview,
│                                                        DomainTierSnapshot, DomainQuota,
│                                                        DomainInvoice, DomainExtra,
│                                                        UpgradeRequestResult, BillingWire etc.)
├── billing.schema.ts                                   (zod: UpgradePackageBodySchema.strict(),
│                                                        InvoiceIdParamSchema uuid)
├── billing.serializer.ts                               (Prisma rows → snake_case wire;
│                                                        Decimal → string via .toFixed(2))
├── billing.repository.ts                               (Prisma direct — findLatestQuota,
│                                                        findInvoiceById, listRecentInvoices,
│                                                        listActiveExtras)
├── billing.service.ts                                  (overview aggregation +
│                                                        upgrade + invoice download +
│                                                        daily brief 404; consumes
│                                                        UpgradeNotifierPort +
│                                                        BillingPdfStoragePort +
│                                                        SKIP_CROSS_DB_CHECKS gate)
├── billing.routes.ts                                   (Fastify plugin: 4 handlers;
│                                                        streaming reply for invoice
│                                                        w/ Content-Type + Disposition;
│                                                        202 for upgrade; 404 for daily-brief)
├── ports/
│   ├── upgrade-notifier.port.ts                        (interface UpgradeNotifierPort;
│                                                        notify(input) → {requestId, notifiedAt})
│   └── billing-pdf-storage.port.ts                     (interface BillingPdfStoragePort;
│                                                        download(key) → Buffer | null;
│                                                        GAP T27-#7 local port)
├── adapters/
│   ├── log-only-upgrade-notifier.adapter.ts            (MVP stub, winston structured log)
│   └── in-memory-billing-pdf-storage.adapter.ts        (test-friendly Map-backed impl;
│                                                        production impl wrapping AWS
│                                                        deferred to composition-root
│                                                        or Slot A foundation extend)
├── index.ts                                            (barrel — plugin + service + factory
│                                                        + ports + adapters + wire types;
│                                                        eslint-disable pattern from T25)
└── __tests__/
    ├── billing.service.test.ts                                (unit; mock repo + mock upgrade port
    │                                                           + mock storage port;
    │                                                           overview shape branches (tier-null +
    │                                                           quota-null + populated);
    │                                                           upgrade → 202 + notifier called;
    │                                                           invoice happy + pdfUrl null + storage
    │                                                           null + cross-tenant 404;
    │                                                           daily brief 404 slice-1;
    │                                                           Q-C-02 prod+flag warn (adapted for billing))
    ├── billing.routes.test.ts                                 (unit; Fastify inject;
    │                                                           happy + 401 + 403 dept_head/staff +
    │                                                           super_admin allow + 404 cross-tenant +
    │                                                           PDF Content-Type + Content-Disposition
    │                                                           assertions + 202 upgrade envelope shape +
    │                                                           daily-brief 404 code)
    ├── log-only-upgrade-notifier.adapter.test.ts              (unit; verify log payload key set +
    │                                                           returns {requestId, notifiedAt})
    ├── in-memory-billing-pdf-storage.adapter.test.ts          (unit; put/get round-trip, missing key
    │                                                           returns null)
    └── billing.repository.integration.test.ts                 (testcontainers real Postgres;
                                                                seed 2 hotels × 2 months of quotas +
                                                                3 invoices varied statuses + 2 extras;
                                                                UNIQUE(hotel_id, period_start) +
                                                                UNIQUE(invoice_number) + status CHECK +
                                                                tenant isolation + invoices ORDER BY
                                                                issuedAt DESC + extras active filter)
```

**Files to modify**
- **Zero** — `src/entrypoints/api.ts` untouched (T21 Override #1). `src/core/config/env.ts` untouched (reuses `SKIP_CROSS_DB_CHECKS`). `src/core/storage/**` untouched (GAP #7 local port). `prisma/migrations/` untouched. `src/shared/socket/**` untouched.

**Approach**
Mirror T25 layout: `types/schema/serializer/repository/service/routes/index` + `ports/` + `adapters/` subdirs (this time with TWO ports/adapters). `BillingService` constructor `(repo, upgradeNotifier, pdfStorage, opts)` where `opts = {skipCrossDbChecks, nodeEnv, logger}`. Overview aggregation: (1) tier via internal helper that either returns `null` (flag=true) or would call `IntegrationTierPort` (flag=false path — code path exists but throws `not implemented` since Auth adapter is slice-2 concern; not exercised in flag=true tests); WARN once at construction on prod+flag=true; (2) `Promise.all` for `[quotaP, invoicesP, extrasP]` — all local DB, failure bubbles; (3) serialize + assemble `{data: {...}}` with `daily_brief_pdf_url_latest: null` slice-1. Upgrade: validate body → generate `requestId = randomUUID()` → call `upgradeNotifier.notify({requestId, hotelId: ctx.hotelId, targetTier: body.target_tier, userId: ctx.userId, requestedAt: new Date()})` → return `reply.code(202).send({data: {request_id, status: 'pending_manual_review', requested_at}})`. Invoice download: `loadOwnedInvoice(ctx, id)` (findById + assertHotelOwnership) → if `pdfUrl` null → `NotFoundError('Invoice PDF', id, {code:'INVOICE_PDF_NOT_AVAILABLE'})` → `pdfStorage.download(pdfUrl)` → if `null` → `NotFoundError('Invoice PDF file', id, {code:'INVOICE_PDF_NOT_FOUND'})` → route sets `Content-Type: application/pdf` + sanitized `Content-Disposition` + sends Buffer. Daily brief: unconditional 404 slice-1. Serializer: `amountIdr.toString()` (Decimal → string) matches Q-T27-#5 lean. Tests: unit branch coverage on 5+ cases per DoD; integration testcontainer for DB constraints + tenant isolation.

Q-B-01/-B-02/Q-C-01..-03/Q-T25-#1..#5 already resolved per prior tasks — not re-raising.

**Est.**: ~6–7h (biggest task yet — 4 endpoints + 3 tables + 2 ports/adapters + streaming reply + SKIP_CROSS_DB_CHECKS gate reuse). CHECKPOINT WAJIB if crossing ~4h with >4 files still incomplete.

Awaiting PM C ACK.

##### PM C ACK — T27-slice-1 PLAN APPROVED with 3 tightenings + 1 escalation (proceed to coding, 2026-07-03 H0)

Structural approach ✓ · Files list ✓ (mirrors T25 layout + adds second port/adapter pair for storage) · session-start gate ✓ (spec/foundation cross-check discipline continued — caught the `ObjectStoragePort.download` gap the same way T25 caught the missing UNIQUE constraint) · baseline 371/1/372 matches post-T25-merge + T10-merged main ✓ · GAP responses #1–#6 all accept PM leans with clean rationale + one nice defense-in-depth addition on #4 (filename sanitization to `[A-Za-z0-9._-]` for header-injection prevention — accepted).

**GAP T27-#7 handling — PM ratifies Option A + escalates to PARENT §10 for foundation `ObjectStoragePort.download` extension**

Independently verified `src/core/storage/object-storage.port.ts:1-32` — surface is `upload` + `delete` only; comment L8-11 explicitly says "Slice-1 surface … Signed URL generation (`getSignedUrl`) is deferred to slice-2". No `download` method. My ASSIGNMENT §business-rules line assuming `ObjectStoragePort.download(key)` was optimistic — this is a legit T08-slice-1 scope boundary. Exec's independent verification during session-start gate caught it — good discipline (5th consecutive Slot C session with pre-code spec/foundation cross-check catching a real gap).

**Ruling**:
- **Slot C ships Option A in T27-slice-1**: local `BillingPdfStoragePort` at `src/modules/billing/ports/billing-pdf-storage.port.ts` with `download(key: string): Promise<Buffer | null>` signature. `InMemoryBillingPdfStorageAdapter` (Map-backed) at `src/modules/billing/adapters/in-memory-billing-pdf-storage.adapter.ts` for tests + composition-root seam. Production adapter (AWS SDK `GetObjectCommand`) DEFERRED — bootstrap DEP-4 concern OR (preferred) foundation `ObjectStoragePort.download` extension.
- **Escalate to PARENT §10 for Slot A / foundation** — recommend Slot A extend `core/storage/object-storage.port.ts` with `download(key): Promise<Buffer | null>` + implement on `S3Adapter` (SDK `GetObjectCommand`) + `InMemoryAdapter`. Small extension; matches T08 slice-1 comment's own trajectory ("slice-1 surface" implies more slices). Also serves T22/T24 menu-image download + T27 daily-brief when W3 lands. Track as **T-INFRA-06 candidate** — small SQL diff analog to Q-T25-#5's T-INFRA-05.
- **Migration path when foundation lands**: billing barrel swaps `BillingPdfStoragePort` consumer to `ObjectStoragePort`; local port + adapter deleted; billing service constructor untouched (both port shapes are structurally identical). Zero regression risk.
- Registered as Q-T27-#7 in §3 + rolled to PARENT §3b + §10 at ACK commit time.

**3 code-level tightenings** (must hold in shipped code — flag in SUBMIT that they held)

1. **`NotFoundError` signature usage** — verified `src/core/errors/app-errors.ts:42-49` — `NotFoundError` is `(resource: string, id?: string)`. It does NOT accept a custom `code` override; `.code` is hardcoded `'NOT_FOUND'` and `.details = {resource, id}`. My ASSIGNMENT phrasing `NotFoundError('Daily brief', 'latest', { code: 'DAILY_BRIEF_NOT_AVAILABLE' })` was incorrect — wouldn't typecheck. **Also**: spec §7 error catalog (line 820-835) does NOT define `DAILY_BRIEF_NOT_AVAILABLE` as a canonical code, so I was over-inventing. **Corrected approach**:
   - Daily-brief 404 → `throw new NotFoundError('DailyBrief', 'latest')` — resulting envelope `{code:'NOT_FOUND', message:'DailyBrief not found: latest', details:{resource:'DailyBrief', id:'latest'}}`.
   - Invoice PDF null-url 404 → `throw new NotFoundError('InvoicePdf', invoiceId)`.
   - Invoice PDF storage-race 404 → `throw new NotFoundError('InvoicePdfFile', invoiceId)` (distinct resource name discriminates from null-url path).
   - Cross-tenant 404 → `throw new NotFoundError('Invoice', id)` (via `assertHotelOwnership` — already the pattern).
   - **FE discriminates on `details.resource` + HTTP status**, NOT on `code`. All four paths share `code:'NOT_FOUND'`. This matches spec §7 canonical `NOT_FOUND: Cross-tenant access attempt (mask 403 as 404 to avoid enumeration)` — the envelope stays uniform, `resource` string carries semantic. Same PM-side self-correction pattern as T21 Note #1 (my ASSIGNMENT drifted from actual foundation shape).
   - **Foundation follow-up nudge** for Slot A (routed to PARENT §10): consider extending `NotFoundError` constructor to accept `(resource, id?, extraDetails?)` overload so 404s can carry richer discriminators. Non-blocking; today's uniform `NOT_FOUND` envelope with `details.resource` differentiator is spec-compliant.

2. **`Decimal` amount serialization** — pin `.toFixed(2)` (matches DDL `DECIMAL(14,2)` precision explicitly), NOT `.toString()`. Your **schema files line 1064** says `.toFixed(2)` ✓; your **approach paragraph line 1126** says `.toString()` — that's the inconsistency to reconcile. `.toFixed(2)` gives stable 2-decimal wire shape (e.g. `"1500000.00"`) which is FE-parseable + i18n-friendly; `.toString()` may drop trailing zeros (`"1500000"`) causing inconsistent JSON shape across rows. Ship `.toFixed(2)` — same value in both schema and approach.

3. **Tier flag=false code path — no `throw not-implemented`** — instead return `null` with an inline `// TODO(Opsi A): once shared-DB restored and Hotel model has { tier: Tier? } relation, replace with prisma.hotel.findUnique({include:{tier:true}}) → serializeTier(row.tier)` comment. Rationale: (a) flag=false path is completely dead today; a defensive `null` return keeps service null-safe when someone flips the flag mid-migration; (b) `throw` at the flip point would surface as a 500 to the whole overview endpoint — worse UX than a null tier while the DB catches up; (c) migration to real query becomes a single-line body swap, not a dead-code cleanup + query addition. Keep the WARN at construction (Opsi C flag=true, prod path) exactly as designed — that's the safety net.

**Coding checklist reminders** (things easy to miss)

- **`Promise.all` on the 3 local queries in overview**: quota + invoices + extras. Tier goes through the private helper (which internally handles the flag branch). Order the assembly as `{tier, quota, invoices, extras}` so wire shape matches spec §1.10 walk order.
- **Overview endpoint returns single row per hotel**: response is `{data: {tier, quota, invoices[], extras[], daily_brief_pdf_url_latest: null}}`. Not `data[]`.
- **Empty-state for quota**: when `findLatestQuota` returns null (first month post-onboarding or MVP §101 seed missing), overview returns `quota: null` — NOT `{...defaults, outbound_used: 0}`. Honest null; FE renders "quota tidak tersedia" empty state. Same principle as tier-null.
- **`SKIP_CROSS_DB_CHECKS` observability**: WARN emitted ONCE at construction when prod+flag=true (mirror `departments.service.ts:55-64` exactly — same event name shape helps grep across modules). Do NOT WARN per-request.
- **Upgrade endpoint 202 envelope**: `{data: {request_id, status: 'pending_manual_review', requested_at}}` — snake_case wire, matches Q-B-01 canonical single-resource envelope. `request_id` is fresh UUID per call (not stored anywhere in slice-1).
- **Content-Disposition filename sanitization** (your GAP #4 addition): the `invoiceNumber` DB column is VARCHAR(40), so realistic input is fine — but keep the `[A-Za-z0-9._-]` replace as defense-in-depth. Non-matching chars → `_`. Test with an integration fixture using a malformed `invoiceNumber` to prove the sanitization path.
- **Streaming vs Buffer**: MVP ship Buffer (`reply.type('application/pdf').header(...).send(buffer)`). Streaming with backpressure is a slice-2+ optimization. Buffer <5MB per PDF is fine at this scale.
- **`buildBillingService` factory shape**: `(db, {upgradeNotifier, pdfStorage, logger, skipCrossDbChecks, nodeEnv})` — pdfStorage is `BillingPdfStoragePort` (local port for slice-1; swap to `ObjectStoragePort` when foundation extends). Both upgradeNotifier + pdfStorage should have local-adapter defaults in the barrel factory (matches T25 pattern where log-only was the default).
- **eslint-disable pattern**: two ports+adapters means potentially 4 eslint-disable lines in the barrel (2 for each adapter import + re-export). Same T25 pattern; each with prose justification comment. If the count feels heavy, consider extracting a `_wiring.ts` file inside the module — but the disable-with-justification is the sanctioned pattern for now. Foundation ESLint config nudge (PARENT §10 from T25 VERDICT) would make this cleaner.
- **Integration test fixtures**: seed both `HOTEL_A` (with 2 months quota history + 3 invoices in `issued`/`paid`/`overdue` + 2 extras with 1 active + 1 expired) AND `HOTEL_B` (with just 1 quota + 1 invoice) so cross-tenant isolation tests are clean. Use `T05 seed` dept codes as the shared vocabulary where relevant.
- **`amountIdr` fixture values**: use `new Decimal('1500000.00')` style creation (Prisma accepts Decimal or string) — avoid float-in-string like `1500000` which serializes inconsistently across Prisma versions.
- **pnpm-store note**: `pnpm install --frozen-lockfile` + `pnpm prisma:generate` if types missing. Same as T21/T25.

**Slot A / Slot B awareness**
- Zero touch on Slot B files, Slot A owned surface (core/, env.ts, migrations, plugins, shared/socket, api.ts).
- **Q-T27-#7 escalation to Slot A** — foundation `ObjectStoragePort.download` extension candidate (T-INFRA-06 or bundle into next storage-touching task); non-blocking for T27 merge.
- **Foundation follow-up nudges** rolled to PARENT §10: (a) `ObjectStoragePort.download` extension, (b) `NotFoundError` constructor extension for richer discriminators — both small foundation refinements, non-blocking.

**Mid-task CHECKPOINT trigger**: this is the biggest task yet. If crossing ~4h with >4 files still incomplete, post CHECKPOINT sub-block here with current state so I can spot-flag drift early. Streaming reply + Decimal handling + tier gate + `Promise.all` orchestration = plenty of surface for a mid-task pattern-check.

Proceed to coding on `feat/settings-billing`. Awaiting your SUBMIT.

#### SUBMIT T27-slice-1 — exec-C (Satrio) at 2026-07-03 H0 (attempt 1)

Task: Billing slice-1 — overview + upgrade + invoice download + daily-brief-empty
Branch: `feat/settings-billing` @ `97f1615` (pushed to origin)
Files changed: 13 new (0 modified — `api.ts`, `env.ts`, `prisma/migrations/`, `core/`, `shared/socket/`, `plugins/` all untouched per DoD)
  - `src/modules/billing/billing.types.ts` (new)
  - `src/modules/billing/billing.schema.ts` (new)
  - `src/modules/billing/billing.serializer.ts` (new — includes `TIER_MATRIX` snapshot for flag=false trajectory)
  - `src/modules/billing/billing.repository.ts` (new)
  - `src/modules/billing/billing.service.ts` (new)
  - `src/modules/billing/billing.routes.ts` (new)
  - `src/modules/billing/ports/upgrade-notifier.port.ts` (new)
  - `src/modules/billing/ports/billing-pdf-storage.port.ts` (new — Q-T27-#7 local port)
  - `src/modules/billing/adapters/log-only-upgrade-notifier.adapter.ts` (new)
  - `src/modules/billing/adapters/in-memory-billing-pdf-storage.adapter.ts` (new)
  - `src/modules/billing/index.ts` (new — barrel + `buildBillingService` factory)
  - `src/modules/billing/__tests__/billing.service.test.ts` (new — 20 tests)
  - `src/modules/billing/__tests__/billing.routes.test.ts` (new — 13 tests)
  - `src/modules/billing/__tests__/log-only-upgrade-notifier.adapter.test.ts` (new — 3 tests)
  - `src/modules/billing/__tests__/in-memory-billing-pdf-storage.adapter.test.ts` (new — 3 tests)
  - `src/modules/billing/__tests__/billing.repository.integration.test.ts` (new — 12 tests)

**DoD self-check** (from ASSIGNMENT T27-slice-1 lines 980-999)
- [x] 4 public endpoints wired — `billing.routes.ts:45,60,79,97`.
- [x] Zod schemas at boundary: `UpgradePackageBodySchema.strict()` (Q-T27-#2 target_tier enum) + `InvoiceIdParamSchema` uuid — `billing.schema.ts:8-14,16-18`.
- [x] Tenant scope: `hotelId` from `ctx.hotelId` on every query; cross-tenant 404 proven on invoice download via `loadOwnedInvoice → assertHotelOwnership` — service test `should 404 with distinct resource "Invoice" on cross-tenant fetch` + integration test `should 404 (Invoice resource) on cross-tenant fetch (leak-safe)`.
- [x] RBAC: `requireRole(ctx, ['gm_admin'])` on all 4; `dept_head` + `staff` both 403; super_admin implicit — routes tests cover all 4 cases.
- [x] Overview aggregation: tier via internal helper (fail-open via `Promise.resolve(null)` under flag=true) + `Promise.all` on the 3 local-DB queries `[quotaP, invoicesP, extrasP]` per Q-T27-#6 lean C.
- [x] Tier snapshot: reuses `SKIP_CROSS_DB_CHECKS` env — flag=true returns null; prod+flag=true emits winston WARN once at construction (mirror `departments.service.ts:49-62` — same event `cross_db_check_skip` for grep across modules). Verified by unit test.
- [x] Upgrade endpoint: 202 Accepted + `{data: {request_id, status:'pending_manual_review', requested_at}}`; `upgradeNotifier.notify(...)` called with `{requestId, hotelId, userId, targetTier, requestedAt}` (verified by unit test asserting `expect.objectContaining`).
- [x] Invoice download: `application/pdf` + `Content-Disposition: attachment; filename="invoice-<sanitized number>.pdf"`. Distinct `NotFoundError` resource names discriminate the branches: `Invoice` (row missing / cross-tenant), `InvoicePdf` (pdfUrl null), `InvoicePdfFile` (storage-race). Sanitization regex `/[^A-Za-z0-9._-]/g → _` — routes test `should sanitize malformed invoiceNumber` exercises `INV/2026 "07"; nasty` → `INV_2026__07___nasty`.
- [x] Daily brief 404 slice-1 with `NotFoundError('DailyBrief', 'latest')` per Q-T27-#5 lean A + PM tightening #1 (no invented `code`, discriminator via `details.resource`).
- [x] `BillingPdfStoragePort` consumed via constructor injection. Q-T27-#7 local port (not `src/core/storage`) — barrel factory defaults to `InMemoryBillingPdfStorageAdapter`; production wiring can swap to a future foundation `ObjectStoragePort.download`-consuming adapter.
- [x] Winston logger scoped via `req.log.info({module:'billing', action, correlationId})` in each handler (T21 pattern).
- [x] Unit tests: overview 6 branch cases (tier-null, quota-null empty-state, quota populated, invoices serialized, extras active, daily_brief null slot); upgrade 202 + notifier called; invoice happy + null-url 404 + storage-race 404 + cross-tenant 404 + row-missing 404; daily brief always 404; Q-C-02 WARN prod+flag=true + no-WARN dev+flag=true.
- [x] Integration test: real Postgres via testcontainers; seed 2 hotels × 2-month quota history for HOTEL_A + 3 invoices in `issued`/`paid`/`overdue` statuses + 2 extras (1 active + 1 expired) + minimal HOTEL_B; proves UNIQUE(hotel_id, period_start), UNIQUE(invoice_number), status CHECK, tenant isolation, invoices ORDER BY issuedAt DESC, extras active filter.
- [x] Line coverage ≥ 80% — **overall 96.68% lines / 97.14% stmts across `src/modules/billing/**`** (routes 95.34%, service 97.22%, schema 100%, serializer 88.88%, repo 100%, adapters 100%/100%, index 100%).
- [x] `make check` PASS with baseline **363/1/364 (T25-merged) + T10-merged = 371/1/372**; SUBMIT delta = **+40 unit** (411/1/412) + **+12 integration** (116/1/117).
- [x] `pnpm test:integration` PASS — all pre-existing suites regression-clean (departments/wa-templates/tickets/notifications/visits/guests).
- [x] Drift scans clean (see below).
- [x] Named exports only; barrel exposes public API (routes plugin + `BillingService` + `buildBillingService` factory + both port interfaces + both adapter classes + DTO/wire types).
- [x] Zero touch on `src/entrypoints/api.ts` + `src/core/config/env.ts` + `prisma/migrations/` + `src/core/storage/**` + `src/shared/socket/**` + `src/plugins/**`.
- [x] `Decimal.toFixed(2)` serialization — `billing.serializer.ts:76,90` — matches DDL DECIMAL(14,2) precision + stable `"1500000.00"` wire shape. Verified by unit + integration tests.

**3 PM tightenings — all held**
- **#1 `NotFoundError` signature** — verified `src/core/errors/app-errors.ts:42-49`; `(resource: string, id?: string)` only, no `code` override. All 4 404 paths use distinct resource names (`Invoice` / `InvoicePdf` / `InvoicePdfFile` / `DailyBrief`) as wire discriminators; envelope stays uniform `code:'NOT_FOUND'` per spec §7. Unit tests assert on `details.resource` at each branch.
- **#2 `Decimal.toFixed(2)`** — pinned in serializer (`serializeInvoice.amount_idr` + `serializeExtra.amount_idr`). Never `.toString()`. Tests assert exact `"1500000.00"` / `"99000.00"` output.
- **#3 Tier flag=false null (no throw)** — `fetchTierSnapshot` returns `Promise.resolve(null)` under both flag branches; TODO(Opsi A) comment inlined at `billing.service.ts:146-149` calls out the migration path. WARN at construction is the safety net for prod+flag=true.

**Quality gate**
- `make typecheck`: **PASS**
- `make lint`: **PASS** (0 errors, 0 warnings — 4 inline eslint-disable in barrel for `no-restricted-imports` with justification comments; 2 for import, 2 for re-export; same T25 pattern)
- `make format-check`: **PASS**
- `make test-unit`: **PASS** — 411 passed, 1 skipped, 412 total (baseline 371/1/372 + **+40**)
- `pnpm test:integration`: **PASS** — 116 passed, 1 skipped, 117 total (baseline 104/1/105 + **+12**)
- `make check`: **PASS** end-to-end

**Drift scans** (`src/modules/billing/`)
- `: any|<any>|as any` (excl `@ts-expect-error`): **0**
- `console.log/info/debug`: **0**
- `throw new Error(` in service/repo/route/adapter (excl tests where used as jest assertion helpers): **0** (5 hits in `__tests__/` — all `throw new Error('expected throw')` pattern, T21/T25 precedent)
- Forbidden imports (`express`/`typeorm`/`sequelize`/`moment`/`node-fetch`): **0**
- Default export outside entrypoints/config: **0**
- `.skip(` in tests: **0**
- `setTimeout` for delay pattern: **0**
- Hardcoded URL / secret / wrap-Prisma interface: **0**

**Security check**
- HMAC verified before business logic: **N/A** (no callback ingest; that's slice-2 or foundation).
- Token encryption via `shared/utils/crypto`: **N/A** (no token storage).
- PII masking in log: **N/A** (billing metadata is operational — `hotelId`/`userId`/`targetTier` — no guest PII).
- `hotel_id` NEVER from body — sourced from `ctx.hotelId` in every service method (`overview`, `requestUpgrade`, `downloadInvoicePdf` via `loadOwnedInvoice`, `downloadDailyBriefPdf`). Zod strict rejects unknown fields.
- **Filename sanitization** (Q-T27-#4 defense-in-depth) — `sanitizeFilename` in `billing.routes.ts:38-40` replaces any non-`[A-Za-z0-9._-]` char with `_`. Test proves `INV/2026 "07"; nasty` → `INV_2026__07___nasty`. Prevents CRLF header injection even though `invoiceNumber` DB column is VARCHAR(40) domain-constrained.
- No secret hardcoded: **confirmed**.

**Test evidence**
- Unit: 40 new tests (20 service + 12 routes + 3 upgrade-notifier adapter + 3 pdf-storage adapter + 2 zod parser)
- Integration: 12 new tests
- Coverage (`src/modules/billing/**`, ran with `--coverageThreshold='{}'`):
  ```
  All files                                | 97.14 stmts | 76.66 branch | 95.34 funcs | 96.68 lines
   billing.repository.ts                   | 100         | —            | 100         | 100
   billing.routes.ts                       | 95.34       | 50           | 100         | 95.23
   billing.schema.ts                       | 100         | 66.66        | 100         | 100
   billing.serializer.ts                   | 88.88       | 60           | 75          | 88.88
   billing.service.ts                      | 97.22       | 100          | 100         | 97.22
   ports/*                                 | 100         | 100          | 100         | 100
   adapters/*                              | 100         | 100          | 100         | 100
   index.ts                                | 100         | 75           | 20          | 100
  ```
  Serializer branch/func gaps: `serializeTier` is exported but not exercised in tests (its use site is the flag=false dead branch today per PM tightening #3). Acceptable per T25 precedent (dead code kept for migration path).

Sample request/reply (Fastify inject — DEP-4 not landed):
```
GET /settings/billing
< 200 OK
< {"data":{
    "tier": null,                        // Opsi C flag=true
    "quota": { "period_start":"2026-07-01", "outbound_used":250, ... },
    "invoices": [ ... ordered issuedAt DESC ... ],
    "extras": [ { "type":"outbound_pack", ... } ],  // active only
    "daily_brief_pdf_url_latest": null   // slice-1
  }}

POST /billing/upgrade-package  body {"target_tier":"luxury"}
< 202 Accepted
< {"data":{"request_id":"<uuid>","status":"pending_manual_review","requested_at":"..."}}
# adapter emits: {module:"billing", event:"upgrade_notifier_stub", requestId, hotelId, userId, targetTier:"luxury", requestedAt}

POST /billing/upgrade-package  body {"target_tier":"lite"}
< 400 Bad Request  (Q-T27-#2 no downgrade)

GET /billing/invoices/<id>/download   (row + pdfUrl + storage all present)
< 200 OK
< Content-Type: application/pdf
< Content-Disposition: attachment; filename="invoice-INV-2026-07-001.pdf"
< <pdf bytes>

GET /billing/invoices/<id>/download   (row present, pdfUrl null)
< 404 Not Found
< {"code":"NOT_FOUND","message":"InvoicePdf not found: <id>","details":{"resource":"InvoicePdf","id":"<id>"}}

GET /billing/invoices/<id>/download   (row present, pdfUrl set, storage miss)
< 404 Not Found
< {"code":"NOT_FOUND","details":{"resource":"InvoicePdfFile","id":"<id>"}}

GET /billing/invoices/<id>/download   (HOTEL_A ctx, HOTEL_B invoice)
< 404 Not Found
< {"code":"NOT_FOUND","details":{"resource":"Invoice","id":"<id>"}}   # leak-safe

GET /billing/daily-brief/latest.pdf
< 404 Not Found
< {"code":"NOT_FOUND","details":{"resource":"DailyBrief","id":"latest"}}   # slice-1 empty state
```

**Notes / questions for PM C**

1. **Q-T27-#7 escalation ready to roll to PARENT** — `BillingPdfStoragePort` is local, `InMemoryBillingPdfStorageAdapter` provides tests + composition-root seam. When Slot A extends `ObjectStoragePort.download` (T-INFRA-06 candidate per PM ACK), migration is a one-line barrel swap. Local port + adapter deletion is one commit; billing service constructor untouched.
2. **`TIER_MATRIX` in serializer + `serializeTier` currently unreferenced** — I inlined the spec §1.10 tier matrix in the serializer as future-facing code for when Opsi A restores. Currently the flag=true path (only live path today) returns `null` before reaching `serializeTier`. The dead-code trajectory is documented in `fetchTierSnapshot` TODO. If PM prefers stricter live-only code, I can remove `TIER_MATRIX` + `serializeTier` — say the word. Coverage impact: serializer would go from 88.88% lines to 100%.
3. **Overview `Promise.all` failure mode** — implemented per Q-T27-#6 lean C: tier via a separate `Promise.resolve` (always resolves today; failure-mode reserved for slice-2/foundation Auth HTTP call) + `Promise.all` on the 3 local-DB queries. Any local-DB failure bubbles to route → 500. If PM prefers `Promise.allSettled` for the whole thing (make quota/invoices/extras fail independently), the change is small — but the current design matches the ACK.
4. **`InMemoryBillingPdfStorageAdapter.put` is test-only** — it's `public` so tests can seed the store; there's no service consumer. If PM wants stricter surface control (module-internal), I can move the adapter to a `test-utils/` subfolder or expose via a separate barrel — but the current setup mirrors T25's `InMemoryAdapter` peek pattern from T08.
5. **Upgrade `notes?: string` follow-up** — Q-T27-#2 explicitly rejected free-form fields. If FE later asks for a "hotel context" free-text field per PM's option B, that's a single zod field addition + notifier payload passthrough — flagging as a potential Q-T28 or upgrade-slice-2 concern.
6. **Foundation `NotFoundError` extension nudge** (from PM tightening #1 foundation follow-up) — I noticed while implementing that distinct resource names work well for wire discrimination but require FE code to compare strings. If Slot A extends `NotFoundError(resource, id?, extraDetails?)`, we could carry a semantic hint like `{ subKind: 'INVOICE_PDF_NULL_URL' }`. Not blocking; PM's ratified discriminator pattern is spec-compliant today.

Requesting PM C VERDICT.

##### VERDICT T27-slice-1 — APPROVED (attempt 1, 2026-07-03 H0) by PM C

✅ **APPROVED**. All 19 DoD boxes verified, independent PM validation on `feat/settings-billing` @ `97f1615`.

**PM independent validation** (per PM-AGENT §3)

Step 1 — Task match: DoD 1:1 map to ASSIGNMENT + PM ACK constraints (3 tightenings + Q-T27-#7 local port + 6 GAP resolutions + coding checklist reminders) ✓
Step 2 — Drift-detection scans (rerun by PM on branch):
```
: any|<any>|as any (excl @ts-expect-error)         : 0
console.log|info|debug                              : 0
throw new Error( (service/repo/routes/adapter/port) : 0
default export outside entrypoints/config           : 0
forbidden imports (express|typeorm|moment|node-fetch): 0
.skip( in tests                                     : 0
IRepository / ICache interface wrap of Prisma       : 0
hardcoded URL / secret                              : 0
setTimeout(..., >=1000ms) for job delay             : 0
eslint-disable                                      : 4 (all barrel `no-restricted-imports` — 2 imports + 2 re-exports for the 2 adapters; T25 precedent held; foundation config nudge from T25 VERDICT still open at PARENT §10)
```

Step 3 — File inventory: **16 files created** (`git show --name-only 97f1615` — 6 module + 2 ports + 2 adapters + 1 barrel + 5 tests). SUBMIT header claims "13 new" but bullet list has 15 items and actual commit has 16 files — same cosmetic count typo pattern as T25 SUBMIT. Zero touch on `src/entrypoints/api.ts` / `src/core/config/env.ts` / `src/core/storage/` / `src/shared/socket/` / `src/plugins/` / `prisma/migrations/` — Override #1 held + all foundation surface untouched. Q-T27-#7 handled via local port as ratified.

Step 4 — Quality gate (independent rerun by PM):
- `make check` **PASS 411/1/412** (baseline 371/1/372 post-T25+T10-merged + **+40 net**: 20 service + 12 routes + 3 upgrade-notifier adapter + 3 pdf-storage adapter + 2 zod parser); Docker-free (T-INFRA-03 held); 1.397s
- `pnpm test:integration` **PASS 116/1/117** — all 7 module suites green (departments/wa-templates/tickets/notifications/guests/visits + billing 12 new). Slot B + T21 + T25 regression clean.
- `make typecheck` + `make lint` + `make format-check` all PASS

Step 5 — Spot-check 3 random files:
- `billing.service.ts` (153 LOC): all 3 tightenings held verbatim — **#1**: `NotFoundError(resource, id?)` used with distinct resource names `'Invoice'`/`'InvoicePdf'`/`'InvoicePdfFile'`/`'DailyBrief'` at L113,117,125,131; no invented code override; **#2**: exercised in serializer, service reads Decimal via `.amountIdr` and passes through; **#3**: `fetchTierSnapshot` returns `Promise.resolve(null)` on both flag branches (L144,151) with TODO(Opsi A) comment inlined at L146-150 documenting the migration path. Q-C-02 pattern mirrored exactly at L49-58 (`event: 'cross_db_check_skip'` matches `departments.service.ts` for cross-module grep). `Promise.all` on tier+3-local per Q-T27-#6 lean C at L67-72 (tier resolves to null fail-open, others fail-closed). `loadOwnedInvoice` mirrors `loadOwned` T21 pattern with `assertHotelOwnership` for cross-tenant 404 leak-safe at L128-136. ✓
- `billing.routes.ts` (113 LOC): thin handlers per T21/T25 convention; `sanitizeFilename` regex `/[^A-Za-z0-9._-]/g → _` at L38-40 (Q-T27-#4 defense-in-depth held); correlationId propagated at L28-34; 202 on upgrade at L70; PDF stream via `reply.type('application/pdf').header('Content-Disposition', ...).send(body)` at L88-91; daily-brief calls `service.downloadDailyBriefPdf(ctx)` which is typed `never` at L107 — unreachable `reply.code(500).send()` at L109 is a defensive TS-happy fallback (cosmetic but reasonable). ✓
- `billing.repository.ts` (45 LOC): Prisma direct (ADR-0001 compliant); `RECENT_INVOICES_LIMIT = 12` constant matches ASSIGNMENT fixed-limit spec; `findLatestQuota` returns `null` on missing row (comment L11-13 documents PM-ACK honest empty-state); `listActiveExtras` uses `OR: [{expiresAt: null}, {expiresAt: {gt: now}}]` matches DoD active filter; ordering `issuedAt DESC` / `purchasedAt DESC` per spec §2.10 index hints. ✓
- Bonus `billing.serializer.ts` (88 LOC): tightening **#2** `.toFixed(2)` held at L71 (invoice) + L84 (extra); TIER_MATRIX inlined at L19-44 with per-tier values from spec §1.10; `enterprise: 0` sentinel with comment L36-37 explaining "custom per spec" — dead code today per exec Note #2 but future-facing per tightening #3 Opsi A path. ✓
- Bonus `index.ts` barrel (63 LOC): 4 eslint-disable lines (2 imports L8+10, 2 re-exports L19+21) with in-line prose justification, mirrors T25 pattern. `buildBillingService(db, {upgradeNotifier?, pdfStorage?, logger, skipCrossDbChecks, nodeEnv})` factory has default fallbacks (`LogOnlyUpgradeNotifierAdapter` + `InMemoryBillingPdfStorageAdapter`) at L56-57. `BillingRepository` NOT re-exported (internal). ✓
- Bonus `billing.schema.ts` (43 LOC): `UpgradePackageBodySchema.strict()` with `target_tier: z.enum(['professional', 'luxury', 'enterprise'])` at L8-12 — Q-T27-#2 enum held (no `'lite'` downgrade). ✓
- Bonus ports (10 + 24 LOC): `BillingPdfStoragePort.download(key): Promise<Buffer | null>` matches Q-T27-#7 workaround signature; `UpgradeNotifierPort.notify(input): Promise<UpgradeNotifyResult>` mirrors T25 port structure with `correlationId?` optional. ✓

Step 6 — Security floor: no webhook in slice-1 (HMAC N/A); no token storage (crypto N/A); no PII (`hotelId`/`userId`/`targetTier` operational, not guest data); `hotel_id` sourced from `ctx.hotelId` verified in every service method; `.strict()` zod rejects unknown fields; **filename sanitization** at `routes.ts:38-40` prevents CRLF/quote/space header injection even though `invoiceNumber` DB column is domain-constrained (Q-T27-#4 defense-in-depth); no secret hardcoded ✓

Step 7 — Test coverage: line **96.68%** across `billing/**` (exceeds ≥ 80% DoD; repo/ports/adapters/index all 100%; schema 100 lines; service 97.22; routes 95.23; serializer 88.88). Branch 76.66% — uncovered branches are `serializeTier` dead path (exec Note #2 — kept intentionally per PM tightening #3 for Opsi A migration path) + defensive route fallback L109. All coverage misses justified ✓

Step 8 — Verdict: **APPROVED**

**PM annotations on exec Notes**

- **Note #1 (Q-T27-#7 ready to roll to PARENT)** ✓ verified. Rolled to PARENT §3b + §10 at ACK time (`3e9842c`) — status stays **open** at PARENT §3b, foundation candidate. Barrel swap when foundation lands is a single-commit path.
- **Note #2 (`TIER_MATRIX` + `serializeTier` unreferenced today)** — **PM ratifies keeping the dead code**. Aligns with tightening #3 (flag=false path stays null-safe + migration-ready). Coverage impact (88.88% serializer) is acceptable — dead branch is documented + linked to TODO(Opsi A). Removing would force re-authoring for slice-2 when Opsi A restores.
- **Note #3 (overview failure mode)** — matches Q-T27-#6 lean C exactly. Ratified as designed.
- **Note #4 (`InMemoryBillingPdfStorageAdapter.put` test-only)** — accepted as-is. Mirrors T08 `InMemoryAdapter.peek` pattern (test-only accessor on class, NOT on port). Clean separation.
- **Note #5 (`notes?: string` upgrade extension follow-up)** — noted for future ticket (post-MVP or PO-driven). Not registered in §3.
- **Note #6 (`NotFoundError` foundation extension nudge)** — matches PM ACK PARENT §10 nudge already registered at T27 ACK time (`3e9842c`). ✓

**Slot A / Slot B awareness**
- Zero touch on Slot B files, Slot A owned surface (env.ts + core/ + plugins/ + shared/socket/ + api.ts + migrations all untouched).
- Q-T27-#7 stays open at PARENT §3b + §10 (T-INFRA-06 candidate) — non-blocking for T27 merge.
- Foundation ESLint nudge (from T25) + `NotFoundError` extension nudge (from T27 ACK) still open at PARENT §10 — both non-blocking.

**§1 task tracker updated · §0 focus updated · §4 drift baseline updated · PARENT §1 T27 row → approved · Short roll-up posted to PARENT §2 · Q-T27-#7 stays open PARENT §3b (Slot A T-INFRA-06 candidate).**

**PO merge please**: branch `feat/settings-billing` @ `97f1615` ready for main merge. Deferred slices (T25-slice-2 Meta-callback + T27 quota-meter + T27 W3/W5 workers) blocked on foundation prereqs (HMAC plugin, INTEGRATION_SHARED_SECRET env; T10 workers-harness now merged so W3 unblocked at foundation infra layer but daily-brief PDF generation is a whole worker task) — not this task. Slot C **3/10 approved** (T21 merged + T25 merged + T27-slice-1 approved-awaiting-merge).

### ASSIGNMENT T28 — Settings/agents config (list + patch with min-3 + tier-cap) — claimed by exec-C (Satrio) at 2026-07-03 H0

- **Routed from**: PM C verbal direction ("continue to the next T") + §0 preview line 22 candidates T28/T29; PM listed T28 first. Formal §8 queue empty at claim time — self-select per EXECUTOR-PROTOCOL §0.3 route (B) honouring verbal direction. If PM prefers T29 instead, reject this ASSIGNMENT and I'll swap.
- **Branch (to create on PLAN ACK)**: `feat/settings-agents`
- **Spec source of truth**: `docs/spec/02-hotel-core.md` §1.5 (endpoints + `PATCH` constraints Min-3 + tier caps), §2.11 (`ai_agent_configs` DDL), §6 RBAC row `/api/settings/agents*`, §7 error catalog (`MIN_AGENTS_VIOLATION`); `docs/spec/MVP-HOTEL-CORE-FIRST.md` §C8 (AC) + §4.3 (Min-3 rule with SELECT FOR UPDATE guidance) + §101 (seed 3 default agents per hotel).
- **Living reference**: `src/modules/wa-templates/` (T25 approved — port+adapter subdirs not needed here; T28 is pure DB read/write, no external RPC) · `src/modules/departments/` (T21 approved — schema.strict + Q-C-02 SKIP_CROSS_DB_CHECKS pattern for tier cap under Opsi C) · `src/modules/billing/` (T27 approved — `TIER_MATRIX` in serializer can be reused for tier-cap lookup).

**Scope (2 endpoints)**

| Method  | Path                        | Purpose                                                                              |
| ------- | --------------------------- | ------------------------------------------------------------------------------------ |
| `GET`   | `/api/settings/agents`      | List AI agents for `req.tenant.hotelId`                                              |
| `PATCH` | `/api/settings/agents/:id`  | Update `is_active` / `capacity` / `config`. Enforce Min-3 active + tier-cap on activate |

**Data model** (already migrated via T02 — do NOT touch schema)
- `ai_agent_configs` @ spec `docs/spec/02-hotel-core.md:697-712` — verified `prisma/schema.prisma:437-454`. Key fields: `id`, `hotelId`, `agentType (VARCHAR 40)`, `name (VARCHAR 80)`, `isActive (default true)`, `capacity (Int default 1)`, `config (JSONB default {})`, timestamps. UNIQUE(hotel_id, agent_type) already in migration.
- No status CHECK; no `agent_type` enum lock at DB — permissive VARCHAR(40) per T21 Q-#3 pattern.

**RBAC** (spec §6:812 — `/api/settings/agents*`):
- `super_admin`: yes · `gm_admin`: yes · `dept_head`: **NO** · staff: **NO**. Wire via `@plugins/rbac.js` `requireRole(ctx, ['gm_admin'])` (T21/T25/T27 verified pattern).

**Business rules**
- **List** (`GET /api/settings/agents`): return all agents for the tenant, ordered by `agentType asc`. Optional `?is_active=true|false` filter (mirror T21 departments pattern).
- **Patch** (`PATCH /api/settings/agents/:id`): allowed fields `is_active` | `capacity` | `config`. `agent_type`, `name`, `hotel_id`, timestamps are immutable — zod strict rejects.
  - **Min-3 rule** (MVP §4.3): if PATCH sets `is_active: false` on an agent currently active AND the post-update active count would drop below 3, → `422 BUSINESS_RULE` with `rule: 'MIN_AGENTS_VIOLATION'` + `details: {activeAfter, minRequired: 3}`. **SELECT FOR UPDATE transaction** to serialize concurrent toggles.
  - **Tier-cap rule** (spec §1.5 + §1.10): if PATCH sets `is_active: true` on an agent currently inactive AND the post-update active count would exceed `tier.agents_max`, → `422 BUSINESS_RULE` with `rule: 'TIER_CAP_VIOLATION'` + `details: {tier, activeAfter, capacity}`. **Under Opsi C `SKIP_CROSS_DB_CHECKS=true`**: tier is null → tier-cap check is SKIPPED (only Min-3 enforced); WARN at construction (mirror T21/T27 pattern).
  - `capacity` value validation: `z.number().int().min(1).max(100)` bounded (T25 Q-T25-#3 permissive-with-bounds pattern).
  - `config` validation: permissive `z.record(z.string(), z.unknown())` — no enum lock (Q-C-01 permissive JSON pattern from T21).

**Files to create**
```
src/modules/agents/
├── agents.types.ts                                (DomainAgent, AgentRow, AgentWire, list filter,
│                                                    response envelopes)
├── agents.schema.ts                               (zod: UpdateAgentBodySchema.strict.refine-non-empty
│                                                    + AgentIdParamSchema + ListAgentsQuerySchema
│                                                    (is_active filter))
├── agents.serializer.ts                           (Prisma row → snake_case wire)
├── agents.repository.ts                           (Prisma direct — findMany, findById,
│                                                    update, countActive, countActiveForUpdate
│                                                    within a transaction)
├── agents.service.ts                              (loadOwned + Min-3 + tier-cap guards;
│                                                    SELECT FOR UPDATE transaction pattern;
│                                                    reuse TIER_MATRIX from billing.serializer
│                                                    or inline snapshot)
├── agents.routes.ts                               (Fastify plugin: 2 handlers; thin;
│                                                    requireTenant → requireRole → parse →
│                                                    service → send)
├── index.ts                                       (barrel — routes plugin + service + factory
│                                                    + public types only)
└── __tests__/
    ├── agents.service.test.ts                            (unit; mock repo;
    │                                                      branch cases: Min-3 blocks toggle-off
    │                                                      dropping below 3; Min-3 allows toggle-off
    │                                                      when 4 remain; tier-cap blocks toggle-on
    │                                                      exceeding cap; tier-cap skipped under
    │                                                      flag=true; cross-tenant 404; update no-op
    │                                                      allowed; capacity + config-only PATCH)
    ├── agents.routes.test.ts                             (unit; Fastify inject; happy + 401 +
    │                                                      403 dept_head/staff + 404 cross-tenant +
    │                                                      422 min-3 + 422 tier-cap + 400 strict)
    └── agents.repository.integration.test.ts             (testcontainers real Postgres; seed
                                                            HOTEL_A with 5 agents (3 active, 2 inactive) +
                                                            HOTEL_B with 3 agents (all active) for
                                                            isolation; UNIQUE(hotel_id, agent_type)
                                                            proven; countActive filter; SELECT FOR
                                                            UPDATE race isolation proven via
                                                            concurrent-transaction test)
```

**Files to modify**
- **Zero** — `src/entrypoints/api.ts` untouched (T21 Override #1 pattern held; barrel-only wiring). `env.ts` reuses existing `SKIP_CROSS_DB_CHECKS` (no new env). Schema + migrations untouched. Zero touch on `core/` / `plugins/` / `shared/socket/` / other modules.

**T28 DoD**
- [ ] 2 endpoints wired: `GET /api/settings/agents` list + `PATCH /api/settings/agents/:id` update.
- [ ] Zod schemas at boundary: `UpdateAgentBodySchema.strict().refine(non-empty)` accepting `is_active`, `capacity` (1-100), `config` (record); `AgentIdParamSchema` uuid; `ListAgentsQuerySchema.strict()` with `is_active` boolFlag.
- [ ] Tenant scope: `hotelId` from `ctx.hotelId` on every query; cross-tenant 404 (leak-safe) via `assertHotelOwnership` mirroring T21/T27 pattern.
- [ ] RBAC: `requireRole(ctx, ['gm_admin'])` on both; `dept_head` + `staff` → 403.
- [ ] Min-3 rule enforced via `SELECT FOR UPDATE` transaction (Prisma `$transaction` + `queryRaw` for the row-lock OR use serializable isolation — see PLAN GAPs).
- [ ] Tier-cap rule: when `SKIP_CROSS_DB_CHECKS=true`, skip tier-cap enforcement + emit startup WARN on prod+flag=true (T21 Q-C-02 pattern). When flag=false (future), read tier + cap-check on activation.
- [ ] `MIN_AGENTS_VIOLATION` + `TIER_CAP_VIOLATION` → `BusinessRuleError` (422) with `rule` + observability details.
- [ ] Response envelope: list `{data: AgentWire[]}` · single `{data: AgentWire}` per Q-B-01 canonical.
- [ ] Snake_case wire via serializer (T21/T25/T27 pattern).
- [ ] Winston logger scoped via `req.log.info({module:'agents', ...})` in each handler.
- [ ] Unit tests: branch coverage for Min-3 + tier-cap + cross-tenant 404 + strict update.
- [ ] Integration test: real Postgres via testcontainers; seed 2 hotels; verify tenant isolation + UNIQUE(hotel_id, agent_type) + Min-3 race scenario (SELECT FOR UPDATE) or serializable isolation guaranteeing no-race.
- [ ] Line coverage ≥ 80% new files (T21/T25/T27 shipped ≥96%).
- [ ] `make check` PASS baseline **411/1/412** (T27-merged); delta stated in SUBMIT.
- [ ] `pnpm test:integration` PASS all suites regression-clean.
- [ ] Drift scans clean (T21/T25/T27 pattern).
- [ ] Named exports only; barrel exposes public API (routes plugin + service + factory + wire/DTO types).
- [ ] Zero touch on `api.ts` / `env.ts` / `prisma/migrations/` / `core/` / `plugins/` / `shared/socket/` / other modules.

#### PLAN T28 — exec-C (Satrio) at 2026-07-03 H0

**Scope recap**
2 endpoints: `GET /api/settings/agents` (list, optional `?is_active` filter) + `PATCH /api/settings/agents/:id` (update `is_active`/`capacity`/`config`). Business rules: Min-3 active-agents enforced via `$transaction` + row-lock (`SELECT FOR UPDATE`) to avoid race, throwing `422 MIN_AGENTS_VIOLATION` on toggle-off below 3; tier-cap enforced on toggle-on when flag=false (deferred code path today under Opsi C — Q-C-02 pattern) throwing `422 TIER_CAP_VIOLATION`. Prisma direct (ADR-0001). No external ports; no adapters. Tenant scope via `assertHotelOwnership`; cross-tenant 404 leak-safe. RBAC `requireRole([gm_admin])`. Zero touches on `api.ts`/env/schema/migrations/core/plugins/shared.

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity confirmed: Executor, Slot C (Satrio) ✓
- CLAUDE.md loaded ✓
- Task spec read: `docs/spec/02-hotel-core.md` §1.5 endpoints + §2.11 DDL + §6 RBAC row + §7 error catalog `MIN_AGENTS_VIOLATION` (line 830) ✓; `docs/spec/MVP-HOTEL-CORE-FIRST.md` §C8 + §4.3 Min-3 SELECT FOR UPDATE + §101 seed guidance ✓
- Parent docs spot-read: `src/modules/departments/` (T21 SKIP_CROSS_DB_CHECKS + startup WARN + `loadOwned` pattern), `src/modules/wa-templates/` (T25 `assertNotLocked` guard shape for reuse as `assertMin3` / `assertTierCap`), `src/modules/billing/` (T27 `TIER_MATRIX` at `billing.serializer.ts:25-44` — can import + reuse for tier-cap lookup, avoids duplication), `src/plugins/tenant-guard.ts` + `rbac.ts`, `src/core/errors/app-errors.ts` `BusinessRuleError` (L104), `src/core/config/env.ts` `SKIP_CROSS_DB_CHECKS` (T21 Q-C-02, T27 reuse), `prisma/schema.prisma:437-454` (AiAgentConfig) ✓
- Dependencies: T02 ✓ · T03 ✓ · T04 ✓ · T05 ✓ · T07-slice-1 ✓ (`BusinessRuleError`) · T21 ✓ (Q-C-02 pattern) · T25 ✓ (state-machine guard pattern) · T27 ✓ (`TIER_MATRIX` reuse candidate) — all approved and merged
- `make typecheck` clean ✓ (post-T27 merge) · `make lint` clean ✓ · `make test-unit` **411/1/412** ✓
- Scaffolder risk: **none**

**Files to create** (as per ASSIGNMENT §Files to create above)

**Files to modify**
- **Zero** per ASSIGNMENT DoD.

**Approach**
Mirror T21 layout (no port/adapter this time — no external RPC): `types → schema → serializer → repository → service → routes → barrel`. Service constructor `(repo, opts = {skipCrossDbChecks, nodeEnv, logger, tierResolver?})`. Tier snapshot resolution: default `tierResolver = () => null` under Opsi C flag=true (matches billing's fetchTierSnapshot pattern); flag=false path takes an injectable `TierResolver` interface with method `(hotelId) → TierName | null` — dead branch today, TODO(Opsi A) comment inlined. Startup WARN once on prod+flag=true (same `event: 'cross_db_check_skip'` shape for cross-module grep). **List** returns all `AiAgentConfig` rows for the tenant, sorted by `agentType`. **Patch** flow:
1. `loadOwned(ctx, id)` → row + tenant check + super_admin bypass.
2. Compute delta: no-op → return current row (idempotent-safe).
3. If body includes `is_active` transition, wrap in `db.$transaction([...], { isolationLevel: 'Serializable' })` — the whole read-then-write becomes atomic per row batch. Inside the transaction:
   - Toggle-off (active → inactive): compute `activeAfter = countActive - 1`; if `activeAfter < 3` throw `BusinessRuleError({rule:'MIN_AGENTS_VIOLATION', activeAfter, minRequired: 3, currentStatus:'active'})`.
   - Toggle-on (inactive → active): if `skipCrossDbChecks=true` → skip cap check (dev/Opsi C). Otherwise fetch tier via `tierResolver(hotelId)`; look up `agents_max` from `TIER_MATRIX` (import from billing serializer); compute `activeAfter = countActive + 1`; if `activeAfter > agents_max` throw `BusinessRuleError({rule:'TIER_CAP_VIOLATION', tier, activeAfter, capacity: agents_max})`.
   - Same-state toggle (`is_active: true` on active row, or `false` on inactive): no-op on `is_active` change — passthrough for capacity/config-only updates.
   - Persist `repo.update(id, delta)` still inside transaction.
4. Non-toggle patches (capacity/config only): plain `repo.update` outside transaction (no race concern).
5. Serialize response → `{data: AgentWire}`.

**Design choice: Serializable isolation vs SELECT FOR UPDATE raw** — spec §4.3 says "Compute in a transaction (SELECT FOR UPDATE) to avoid race". Prisma doesn't natively support row-level `FOR UPDATE` via the fluent API. Two options: (A) `db.$transaction([...], { isolationLevel: 'Serializable' })` — Prisma-idiomatic, serializable snapshot conflicts abort the losing transaction (Postgres 40001) → we can retry once OR let it bubble as 5xx (rare race). (B) `db.$queryRaw` for `SELECT ... FOR UPDATE` on the count query. (A) is preferred: idiomatic + integration-testable via concurrent transactions; retry-on-40001 is a small helper. See GAP #1.

**GAPs / questions**

- **GAP T28-#1** — SELECT FOR UPDATE vs Serializable isolation. Options: (A) Prisma `$transaction` with `isolationLevel: 'Serializable'` + retry-on-40001 (Postgres serialization_failure). Clean, no raw SQL, integration-testable. (B) `db.$queryRawUnsafe('SELECT ... FOR UPDATE')` inside `$transaction` — matches spec §4.3 wording literally. Adds raw SQL to the module. (C) Advisory lock via `pg_advisory_xact_lock(hash(hotelId))` — serializes all agent PATCHes per hotel; simpler than serializable, avoids retry.
  - **My intent**: **A** — Prisma-idiomatic, no raw SQL, retry-on-40001 is a 5-line helper. Integration test proves race isolation via `Promise.all` on two concurrent toggle-off calls where only one succeeds (matches expected behaviour under serializable isolation). C is attractive but pg-specific + harder to test cleanly. B works but breaks the "no raw SQL" convention shown across T21/T25/T27.

- **GAP T28-#2** — Retry-on-40001 policy. Options: (A) retry once with small jitter, then bubble as 5xx. (B) no retry — bubble immediately, FE re-submits on user retry. (C) retry N times with backoff.
  - **My intent**: **A** — single retry catches the common case (2 concurrent toggles) without adding meaningful latency; N-retry is over-engineering for a settings surface. FE would still see 5xx on genuine sustained contention (rare).

- **GAP T28-#3** — Tier-cap check under `SKIP_CROSS_DB_CHECKS=true`. Options: (A) Skip cap check entirely (only Min-3 enforced) — matches T27 tier=null approach. (B) Use hardcoded default `professional` tier (`agents_max=3`) for cap check under flag=true — always cap at 3. (C) Refuse toggle-on entirely under flag=true (safe-strict).
  - **My intent**: **A** — matches T27 precedent (tier=null → tier-related checks skipped). WARN at construction covers observability. B introduces a fake tier that could surprise post-Opsi-A operators. C is over-strict for dev/staging UX.

- **GAP T28-#4** — Tier-cap details wire shape. When `TIER_CAP_VIOLATION` fires, what fields in `details`? Proposal: `{tier: TierName, activeAfter: number, capacity: number}`. `capacity` is the tier's `agents_max`; naming avoids conflict with the agent row's `capacity` field.
  - **My intent**: Ship as proposed.

- **GAP T28-#5** — `TIER_MATRIX` reuse from `billing.serializer.ts`. It's exported from that module. Options: (A) import from `@modules/billing` barrel — clean cross-module public API consumption (barrel exports `TierName` type but not `TIER_MATRIX` value). (B) Duplicate `TIER_MATRIX` inline in agents.service (~10 lines). (C) Extract to a shared location like `@shared/constants/tier-matrix.ts`.
  - **Barrel check**: verified `src/modules/billing/index.ts` exports `TierName`, `TierSnapshotWire`, but **NOT `TIER_MATRIX`** — it's an internal implementation detail of the serializer. Options: (A') extend billing barrel to export `TIER_MATRIX` (cross-module API expansion); (B) duplicate; (C) extract to `@shared/`.
  - **My intent**: **B** — small duplication (~10 lines constant) is cheaper than cross-module API surface expansion (A') OR foundation-scope shared-constants file (C). The tier matrix is small; when Opsi A restores and both modules read from Auth's `tiers` table, both local copies get deleted. Alternative: I can propose extending the billing barrel to export `TIER_MATRIX` if PM prefers single-source-of-truth — 1-line change, no code duplication.

Q-B-01/Q-B-02/Q-C-01..-03/Q-T25-#1..#5/Q-T27-#1..#7 all resolved — not re-raising.

**Est.**: ~4-5h (2 endpoints + Min-3/tier-cap guard + transaction pattern + testcontainer race test). Smaller than T27 (no port/adapter, no streaming, no multiple ports).

Awaiting PM C ACK.

##### PM C ACK — T28 PLAN APPROVED with 4 tightenings (proceed to coding, 2026-07-03 H0)

**Self-claim ratified** — T28 was listed in my T27 VERDICT §0 preview as a next-candidate. Exec's self-authored ASSIGNMENT block follows my prior task patterns cleanly (routing note, spec anchors, living-reference cross-links, structured DoD). Session-start gate + baseline 411/1/412 ✓. Files layout mirrors T21 (no port/adapter — pure DB read/write, no external RPC — CLAUDE.md §4 does NOT require port for local DB). Independent spec/foundation cross-check discipline held (**6th consecutive** Slot C session).

**Tightening #1 — DROP tier-cap enforcement from slice-1** (largest correction; new Q-T28-#1 registered)

Independent spec review: `TIER_CAP_VIOLATION` code invented by exec is NOT in spec §7 error catalog. Only `MIN_AGENTS_VIOLATION` (line 827) is spec-explicit for agents. `TIER_GATE` (line 830) exists but is scoped to "Tier-restricted resource access (e.g. analytics for non-Luxury)" — that's a 403 pattern for feature gating, not a 422 capacity cap. Further: spec §1.10 tier matrix uses phrasing "**3 min**" (Professional) + "**5 include**" (Luxury), and the `billing_extras` DDL comment at §2.10 line 685-688 declares `type='extra_agent'` as a valid billing extra. Combined signal: **tier counts are baseline-included totals; additional agents are purchased via `billing_extras`, NOT blocked at activation**. Enforcing a hard tier-cap at `PATCH is_active:true` would break the billing model (block a paying-for-extras hotel from activating what they paid for). Similar PM-side self-correction as my T27 ASSIGNMENT's invented `DAILY_BRIEF_NOT_AVAILABLE` code — I originally endorsed tier-cap in the T28 ASSIGNMENT ratification implicit path; correcting now via independent spec re-read.

**Ruling**:
- **Slice-1 enforces ONLY Min-3**. `MIN_AGENTS_VIOLATION` (422 `BusinessRuleError` + `details.rule='MIN_AGENTS_VIOLATION'` + `details.activeAfter` + `details.minRequired: 3`).
- Drop from scope: `TIER_CAP_VIOLATION`, `TIER_MATRIX` import from billing, `tierResolver` interface, tier-cap tests, flag=false tier-cap code path.
- Service constructor simplifies to `(repo, opts = {logger?})` — no `skipCrossDbChecks`, no `nodeEnv`, no `tierResolver`. No startup WARN (nothing tier-related runs).
- Registered as **Q-T28-#1** in §3 → rolls to **PARENT §3a** (contract question — PO decision needed on: is there ANY hard tier-cap on agent activation, or is `billing_extras.extra_agent` the mechanism? If cap exists, spec §7 needs `AGENTS_TIER_CAP` entry).
- **Follow-up ticket** (if PO wants tier-cap): T28-slice-2 or feature-flags module (T26) — deferred pending spec clarification.

Result: **GAPs #3, #4, #5 all become N/A** after tightening #1 (no tier-cap = no tier-check code path = no `TIER_MATRIX` reuse decision). Cleaner slice.

**Tightening #2 — callback-form `$transaction`, not array-form**

Exec's PLAN L1509 shows `db.$transaction([...], { isolationLevel: 'Serializable' })` — this is Prisma's array-batch form, which cannot express read-then-conditional-then-write logic (each element is a discrete query committed together, no imperative conditional). Min-3 requires: read count → conditional throw → write update → commit atomically. That's callback-form:
```ts
await db.$transaction(async (tx) => {
  const activeCount = await tx.aiAgentConfig.count({
    where: { hotelId: ctx.hotelId, isActive: true },
  });
  const activeAfter = activeCount - 1;
  if (activeAfter < 3) {
    throw new BusinessRuleError('Min 3 active agents required', {
      rule: 'MIN_AGENTS_VIOLATION',
      activeAfter,
      minRequired: 3,
    });
  }
  await tx.aiAgentConfig.update({ where: { id }, data: { isActive: false, ...delta } });
}, { isolationLevel: 'Serializable' });
```
Confirm callback-form in coded service. Integration test proves race isolation via `Promise.all` on 2 concurrent toggle-off calls where target hotel has exactly 4 active — expected: one succeeds (goes to 3), other fails with `MIN_AGENTS_VIOLATION` OR retries and fails (both agents were "the 4th" from different transaction snapshots).

**Tightening #3 — GAP #1 + GAP #2 acceptance + retry-helper shape**

GAP #1 → **Option A confirmed** (Serializable isolation + retry-on-40001). Correct choice — Prisma-idiomatic + no raw SQL + integration-testable + matches T21/T25/T27 "no raw SQL" convention.

GAP #2 → **Option A confirmed** (retry-once with jitter). 5-line helper shape:
```ts
async function withSerializableRetry<T>(fn: () => Promise<T>, jitterMs = 20): Promise<T> {
  try { return await fn(); }
  catch (err) {
    if (isSerializationFailure(err)) {
      await new Promise(r => setTimeout(r, Math.random() * jitterMs));
      return fn();
    }
    throw err;
  }
}
function isSerializationFailure(err: unknown): boolean {
  return typeof err === 'object' && err !== null &&
    ((err as { code?: string }).code === 'P2034' ||
     (err as { meta?: { code?: string } }).meta?.code === '40001');
}
```
Prisma throws `PrismaClientKnownRequestError` with `code='P2034'` for transaction serialization conflicts (Postgres SQLSTATE 40001). Belt-and-suspenders check on both P2034 + raw 40001. Retry uses same jitter across the range 0-20ms.

**Tightening #4 — no-op PATCH idempotency + response shape**

Same-state toggle (`is_active: true` on already-active row) or empty-body-effective PATCH (no delta after ignoring server-set fields) should return the current row with **200** (idempotent-safe), NOT 400 or 304. Zod `.refine(non-empty)` still rejects an entirely empty body (as per exec's plan). But an update body like `{ is_active: true }` on an already-active agent should pass through as no-op (no transaction wrapper needed — no state change to guard). Test coverage: `should return current row on same-state toggle-on` + `should return current row on same-state toggle-off`.

**Coding checklist reminders** (things easy to miss)

- **Field allowlist on update**: zod strict rejects `hotel_id`/`agent_type`/`name`/timestamps at boundary — but ALSO explicitly do NOT read these off the parsed body in the service, even if they'd fall through. JSDoc invariant on the update method (T21/T25/T27 pattern).
- **`config` JSONB serialization**: pass through as-is via `as unknown as Prisma.InputJsonValue` (T21 pattern). No inner shape validation in slice-1 — permissive.
- **`capacity` bounds**: `z.number().int().min(1).max(100)` (as exec proposed). Test both floors + ceiling.
- **Integration test seed**: HOTEL_A with **4 active + 1 inactive** for the crucial toggle-off race scenario (start at 4, race two concurrent toggle-offs, exactly-one-succeeds proves the guard). Add HOTEL_B with 3 active for cross-tenant isolation.
- **Retry test**: mock the transaction wrapper to throw a synthetic P2034 the first invocation then succeed — verify the helper retries once + eventual success. Then a second test where both attempts throw P2034 → verify the second error bubbles.
- **Non-toggle patch outside transaction**: capacity-only or config-only PATCH runs plain `repo.update` (no race concern, no transaction wrapper). Only `is_active` transitions enter the serializable block.
- **Baseline math for SUBMIT**: post-T27-merge (PR #13 `af02167`) baseline is **411/1/412** as exec noted. State delta explicitly.
- **eslint-disable count expected**: 0 (no adapter, no barrel factory needs adapter import). Simpler barrel than T25/T27.

**Slot A / Slot B awareness**
- Zero touch on Slot B files, Slot A owned surface. Simplest cross-slot touch of any Slot C task so far.
- Q-T28-#1 tier-cap ambiguity rolls to PARENT §3a as a **contract question for PO**. Non-blocking for T28-slice-1 merge — slice-1 ships Min-3 only.

**Mid-task CHECKPOINT trigger**: unlikely needed at ~4-5h estimate. If crossing ~4h with the transaction wrapper still incomplete, post CHECKPOINT.

Proceed to coding on `feat/settings-agents`. Awaiting your SUBMIT.

#### SUBMIT T28 — exec-C (Satrio) at 2026-07-03 H0 (attempt 1)

Task: Settings/agents config (list + patch with Min-3)
Branch: `feat/settings-agents` @ `02a296d` (pushed to origin)
Files changed: 10 new (0 modified — `api.ts`/`env.ts`/`prisma/migrations/`/`core/`/`plugins/`/`shared/socket/` all untouched per DoD)
  - `src/modules/agents/agents.types.ts` (new)
  - `src/modules/agents/agents.schema.ts` (new)
  - `src/modules/agents/agents.serializer.ts` (new)
  - `src/modules/agents/agents.repository.ts` (new)
  - `src/modules/agents/agents.service.ts` (new)
  - `src/modules/agents/agents.routes.ts` (new)
  - `src/modules/agents/index.ts` (new — barrel + `buildAgentsService` factory)
  - `src/modules/agents/__tests__/agents.service.test.ts` (new — 30 tests)
  - `src/modules/agents/__tests__/agents.routes.test.ts` (new — 9 tests)
  - `src/modules/agents/__tests__/agents.repository.integration.test.ts` (new — 13 tests)

**DoD self-check** (from ASSIGNMENT T28)
- [x] 2 endpoints wired: `GET /api/settings/agents` list + `PATCH /api/settings/agents/:id` — `agents.routes.ts:42,58`.
- [x] Zod schemas at boundary: `UpdateAgentBodySchema.strict().refine(non-empty)` allowing only `is_active`/`capacity`(1-100)/`config` — `agents.schema.ts:16-27`. `AgentIdParamSchema` uuid + `ListAgentsQuerySchema.strict()` with `is_active` boolFlag.
- [x] Tenant scope: `hotelId` from `ctx.hotelId` on every query; cross-tenant 404 via `loadOwned → assertHotelOwnership` — 2 unit tests + 1 integration test cover cross-tenant leak-safety.
- [x] RBAC: `requireRole(ctx, ['gm_admin'])` on both handlers; `dept_head`/`staff` both 403; `super_admin` implicit — routes tests cover all matrix cells.
- [x] Min-3 rule enforced via **callback-form** `db.$transaction(async tx => ...)` with `isolationLevel: 'Serializable'` (PM ACK tightening #2 held) + `withSerializableRetry` helper on P2034/40001 with 0-20ms jitter (tightening #3 held). Concurrent-race integration test proves exactly-one-succeeds under Serializable.
- [x] Tier-cap dropped from slice-1 (PM ACK tightening #1) — service constructor is `(repo, db)` only; no `skipCrossDbChecks`/`nodeEnv`/`tierResolver`/`TIER_MATRIX`/WARN. Q-T28-#1 rolls to PARENT §3a for PO.
- [x] `MIN_AGENTS_VIOLATION` → `BusinessRuleError` (422) with `details: {rule:'MIN_AGENTS_VIOLATION', activeAfter, minRequired: 3}` — verified by service test asserting exact details + route test asserting envelope 422 + `code:'BUSINESS_RULE'`.
- [x] No-op idempotency (PM ACK tightening #4): same-state toggle (`is_active:true` on already-active) returns current row with 200; capacity/config-only patches use plain `repo.update` outside transaction. 3 unit tests + 1 integration test cover no-op branches.
- [x] Response envelope: list `{data: AgentWire[]}` · single `{data: AgentWire}` (Q-B-01 canonical).
- [x] Snake_case wire via serializer; `config` JSONB pass-through (defensive narrow to `{}` on non-object row, T28 conservative-serializer pattern).
- [x] Winston logger scoped via `req.log.info({module:'agents', action, correlationId})` in each handler (T21 pattern).
- [x] Unit tests: 39 total (30 service + 9 routes) — zod parsers + `buildAgentWhere` + `serializeAgent` + list happy path + Min-3 block/allow + toggle-on no-cap + no-op idempotency (3 cases) + capacity+config-only via plain update + retry-on-P2034 (succeed / bubble / no-retry-on-other) + cross-tenant/not-found 404 + all route status matrix.
- [x] Integration test: 13 tests via real Postgres testcontainer — UNIQUE(hotel_id, agent_type) + tenant isolation + list filters + Min-3 at floor (HOTEL_B blocks toggle-off) + Min-3 at 4→3 allowed (HOTEL_A) + toggle-on reactivate + **concurrent-toggle race** via `Promise.allSettled` proving exactly-one-succeeds + capacity/config updates + no-op + cross-tenant 404.
- [x] Line coverage: **97.65% lines / 97.08% stmts** across `src/modules/agents/**` (repo 100 · serializer 100 · service 98.21 · routes 96.55 · schema 96.55 · index 100).
- [x] `make check` PASS baseline **411/1/412** (post-T27 merge PR #13 `af02167`); SUBMIT delta = **+39 unit** (450/1/451) + **+13 integration** (129/1/130).
- [x] `pnpm test:integration` PASS; all pre-existing suites regression-clean (departments/wa-templates/billing/tickets/notifications/visits/guests).
- [x] Drift scans clean (see below).
- [x] Named exports only; barrel exposes `agentsRoutes` plugin + `AgentsService` + `buildAgentsService` factory + wire/DTO types.
- [x] Zero touch on `api.ts`/`env.ts`/`prisma/migrations/`/`core/`/`plugins/`/`shared/socket/`.

**4 PM tightenings — all held**
- **#1 tier-cap dropped** — service constructor simplified to `(repo, db)` (no `skipCrossDbChecks`, no `nodeEnv`, no `tierResolver`, no WARN). No `TIER_MATRIX` import. No `TIER_CAP_VIOLATION` code path. Q-T28-#1 rolls to PARENT §3a for PO decision.
- **#2 callback-form `$transaction`** — `db.$transaction(async (tx) => { ... }, { isolationLevel: 'Serializable' })` at `agents.service.ts:103-121`. Inside: `tx.aiAgentConfig.count` → conditional `throw BusinessRuleError` → `tx.aiAgentConfig.update`. Atomic read-then-conditional-write.
- **#3 GAP #1+#2 acceptance + retry helper** — `withSerializableRetry` at `agents.service.ts:39-49`. `isSerializationFailure` at `agents.service.ts:29-37` checks both `err.code === 'P2034'` and `err.meta.code === '40001'`. Single retry with `Math.random() * 20` ms jitter. 3 unit tests prove: succeed-on-second-attempt, bubble-on-double-fail (calls=2), no-retry-on-non-serialization error.
- **#4 no-op PATCH idempotency + response shape** — `agents.service.ts:86-97`: reads current row, computes `isActiveChange`/`capacityChange`/`configChange` deltas, returns current row with 200 when all deltas resolve to no-op. Empty-body still rejected at zod. 3 unit + 1 integration test.

**Quality gate**
- `make typecheck`: **PASS**
- `make lint`: **PASS** (0 errors, 0 warnings — 0 eslint-disable in barrel; simplest module yet with no port/adapter)
- `make format-check`: **PASS**
- `make test-unit`: **PASS** — 450 passed, 1 skipped, 451 total (baseline 411/1/412 + **+39**)
- `pnpm test:integration`: **PASS** — 129 passed, 1 skipped, 130 total (baseline 116/1/117 + **+13**)
- `make check`: **PASS** end-to-end

**Drift scans** (`src/modules/agents/`)
- `: any|<any>|as any` (excl `@ts-expect-error`): **0**
- `console.log/info/debug`: **0**
- `throw new Error(` in service/repo/route (excl tests where used as jest assertion helpers): **0** (test-file hits are `throw new Error('expected throw')` and `throw new Error('seed missing')` — allowed jest/assertion pattern)
- Forbidden imports (`express`/`typeorm`/`sequelize`/`moment`/`node-fetch`): **0**
- Default export outside entrypoints/config: **0**
- `.skip(` in tests: **0**
- `eslint-disable` in module: **0** (no port+adapter → no barrel-vs-service restriction to bypass)

**Security check**
- HMAC verified before business logic: **N/A** (no webhook).
- Token encryption via `shared/utils/crypto`: **N/A** (no token storage).
- PII masking in log: **N/A** (agent config is operational — `agentId`/`hotelId`/`agentType` — no guest PII).
- `hotel_id` NEVER from body — sourced from `ctx.hotelId` via `assertHotelOwnership` on `loadOwned`. `agent_type`/`name` immutable (zod strict rejects).
- No secret hardcoded: **confirmed**.

**Test evidence**
- Unit: 39 new tests (30 service + 9 routes)
- Integration: 13 new tests via testcontainer real Postgres
- Race-scenario proof (integration): `should race-safe: two concurrent toggle-offs on HOTEL_A (4 active) result in exactly one violation` — asserts 1 fulfilled + 1 `BusinessRuleError({rule:'MIN_AGENTS_VIOLATION'})` + final `activeCount === 3` (Min-3 floor preserved).
- Coverage:
  ```
  All files            | 97.08 stmts | 79.59 branch | 93.54 funcs | 97.65 lines
   agents.repository.ts | 100         | 100          | 100         | 100
   agents.routes.ts     | 96.66       | 50           | 100         | 96.55
   agents.schema.ts     | 96.66       | 63.63        | 100         | 96.55
   agents.serializer.ts | 100         | 100          | 100         | 100
   agents.service.ts    | 96.72       | 86.2         | 100         | 98.21
   index.ts             | 100         | 100          | 33.33       | 100
  ```

Sample request/reply (Fastify inject — DEP-4 not landed):
```
GET /settings/agents
< 200 OK
< {"data":[{"id":"...","hotel_id":"...","agent_type":"concierge","name":"Concierge",
   "is_active":true,"capacity":3,"config":{},"created_at":"...","updated_at":"..."}, ...]}

PATCH /settings/agents/:id   body {"is_active":false}   (HOTEL_A: 4 active → 3 after)
< 200 OK
< {"data":{..., "is_active": false}}

PATCH /settings/agents/:id   body {"is_active":false}   (HOTEL_B: 3 active → 2 after)
< 422 Unprocessable Entity
< {"code":"BUSINESS_RULE","message":"Minimum 3 active agents required",
   "details":{"rule":"MIN_AGENTS_VIOLATION","activeAfter":2,"minRequired":3}}

PATCH /settings/agents/:id   body {"is_active":true}   (already active row)
< 200 OK
< {"data":{..., "is_active": true}}   # no-op idempotent, current row returned

PATCH /settings/agents/:id   body {"agent_type":"butler"}
< 400 Bad Request  (zod strict — immutable field)
```

**Notes / questions for PM C**

1. **Q-T28-#1 stays open at PARENT §3a for PO** — Tier-cap semantics: hard 422 gate on activation, or is `billing_extras.extra_agent` the mechanism? Once PO decides, slice-2 either adds `TIER_CAP_VIOLATION` (with fresh spec §7 catalog entry) or the file stays at Min-3 only. Slot C code is idempotent to either resolution (no dead code today).
2. **`serializer.ts:9-11` defensive config narrowing** — `AiAgentConfig.config` is Prisma `Json`, i.e. `Prisma.JsonValue`. Non-object shapes (string, array, primitive) are theoretically possible via raw INSERT. Serializer narrows to `{}` in those cases. Alternative: let `Prisma.JsonValue` widen the wire type to `unknown`. Chose defensive narrow to keep FE `config: Record<string, unknown>` contract stable. Coverage cost: 1 branch line (60%). Non-blocking.
3. **`fakeDb` typing in unit tests** — the `PrismaClient` stub uses `as unknown as PrismaClient` cast. Same pattern as T21/T25/T27 mock repo casts. If PM wants stricter typing (e.g. via `jest.mocked` on a full Prisma type), it's a rewrite of the test harness — flagging as a testing-convention discussion, not a T28 concern.
4. **Retry-once policy in production traffic** — under sustained contention (10+ concurrent PATCHes to the same hotel), the retry-once policy still surfaces 5xx to the losing tx after two failures. This is acceptable UX for a settings surface per PM ACK GAP #2 lean A. If PO wants richer retry (e.g. N=3 with exponential backoff), the helper is a 3-line change — flagging as a potential slice-2 concern.
5. **No CHECK constraint on `agent_type` at the DB** — spec §2.11 declares `agent_type VARCHAR(40)` with no enum lock. Slice-1 accepts any string. If PO wants an enum lock (e.g. `concierge`/`reception`/`housekeeping`/`fnb`/`wellness`), that's a foundation migration + zod schema tightening — not this task.
6. **`config` shape validation** — slice-1 permissive per Q-C-01 pattern. If PO wants per-`agent_type` config schemas (e.g. concierge has `{tone, language}`, reception has `{shift_hours}`), that's a follow-up spec/coordination task with AI service consumers.

Requesting PM C VERDICT.

##### VERDICT T28 — APPROVED (attempt 1, 2026-07-03 H0) by PM C

✅ **APPROVED**. All 18 DoD boxes verified, independent PM validation on `feat/settings-agents` @ `02a296d`.

**PM independent validation** (per PM-AGENT §3)

Step 1 — Task match: DoD 1:1 map to ASSIGNMENT + PM ACK constraints (4 tightenings + Q-T28-#1 scope reduction + coding checklist reminders) ✓
Step 2 — Drift-detection scans (rerun by PM on branch):
```
: any|<any>|as any (excl @ts-expect-error)         : 0 (even in tests — mock casts use `as unknown as PrismaClient` pattern)
console.log|info|debug                              : 0
throw new Error( (service/repo/routes, excl tests)  : 0
default export outside entrypoints/config           : 0
forbidden imports (express|typeorm|moment|node-fetch): 0
.skip( in tests                                     : 0
IRepository / ICache interface wrap of Prisma       : 0
hardcoded URL / secret                              : 0
setTimeout(..., >=1000ms) for job delay             : 0
eslint-disable                                      : 0 ← FIRST Slot C module with zero eslint-disable (no port+adapter = no barrel-vs-service restriction)
```

Step 3 — File inventory: **10 files created** (`git show --name-only 02a296d` — 6 module + 1 barrel + 3 tests). **SUBMIT header claim of "10 new" is accurate — first Slot C SUBMIT with exact count** (T25/T27 had off-by-2 typos in headers). Simplest module structure Slot C has shipped yet: no ports, no adapters, no barrel factory imports. Zero touch on `src/entrypoints/api.ts` / `src/core/config/env.ts` / `prisma/migrations/` / `src/core/` / `src/plugins/` / `src/shared/socket/` — Override #1 held + all foundation surface untouched.

Step 4 — Quality gate (independent rerun by PM):
- `make check` **PASS 450/1/451** (baseline 411/1/412 post-T27-merge + **+39 net**: 30 service + 9 routes); Docker-free (T-INFRA-03 held); 1.611s
- `pnpm test:integration` **PASS 129/1/130** — all 8 module suites green (departments/wa-templates/tickets/notifications/guests/visits/billing + agents 13 new). T21+T25+T27 + Slot B regression clean.
- `make typecheck` + `make lint` + `make format-check` all PASS

Step 5 — Spot-check 3 random files:
- `agents.service.ts` (152 LOC): all 4 tightenings held verbatim — **#1**: constructor `(repo, db)` only — no `skipCrossDbChecks`/`nodeEnv`/`tierResolver`/`TIER_MATRIX`/WARN (L63-66); **#2**: callback-form `db.$transaction(async (tx) => {...}, { isolationLevel: 'Serializable' })` at L104-121 with imperative read (`tx.aiAgentConfig.count`) → conditional throw (L110-116) → write (`tx.aiAgentConfig.update`); **#3**: `withSerializableRetry` at L39-49 (single retry with 0-20ms jitter); `isSerializationFailure` at L29-37 (P2034 + 40001 belt-and-suspenders); **#4**: no-op idempotency at L94-97 (returns current row when all deltas resolve to no-op). Constants `MIN_ACTIVE_AGENTS = 3` module-level (grep-able). Toggle-on plain `repo.update` outside transaction at L128 (no race per tightening #1's dropped tier-cap). `loadOwned` mirrors T21/T25/T27 pattern with cross-tenant 404 leak-safe via `assertHotelOwnership`. JSDoc invariant at L73-85 documents Min-3 rule + idempotency semantic. Comments cross-ref MVP §4.3 + spec §7. ✓
- `agents.routes.ts` (69 LOC): thin handlers per T21/T25/T27 convention (`requireTenant → requireRole → parse → service → send`); correlationId propagated via helper L27-33; 200 on both endpoints (no 201/204 — pure list/update, no create/delete in slice-1); `requireRole(ctx, ['gm_admin'])` super_admin bypass verified at `rbac.ts:46`. ✓
- `agents.schema.ts` (73 LOC): `UpdateAgentBodySchema.strict().refine(non-empty)` at L16-25 with `is_active`/`capacity`/`config` allowlist — server-set fields (`agent_type`/`name`/`hotel_id`/timestamps) implicitly rejected by strict; `capacityField: z.number().int().min(1).max(100)` matches PM ACK reminder; permissive `configField: z.record(z.string(), z.unknown())` per Q-C-01 pattern; `.strict()` on list query too. ✓
- Bonus `agents.repository.ts`: Prisma direct (ADR-0001 compliant); simple CRUD surface (no `count` methods since Min-3 count runs inside the callback-form transaction where `tx.aiAgentConfig.count` is used directly on the transaction client). ✓
- Bonus `index.ts` barrel: **first Slot C module with 0 eslint-disable** — no port+adapter → no adapter imports to disable. Factory `buildAgentsService(db)` simplest yet. ✓
- Bonus tests: **race-scenario integration test** at `agents.repository.integration.test.ts` proves Serializable isolation with `Promise.allSettled` on 2 concurrent toggle-off calls where HOTEL_A starts at 4 active → exactly-one-succeeds pattern: 1 fulfilled + 1 `BusinessRuleError({rule:'MIN_AGENTS_VIOLATION'})` + final `activeCount === 3` (Min-3 floor preserved). Empirically proves the guard works under concurrent traffic. ✓

Step 6 — Security floor: no webhook (HMAC N/A); no token storage (crypto N/A); no PII (`agentId`/`hotelId`/`agentType` operational, not guest data); `hotel_id` sourced from `ctx.hotelId` via `assertHotelOwnership` in `loadOwned`; immutable fields (`agent_type`/`name`/`hotel_id`/timestamps) rejected at zod boundary + never read in service; no secret hardcoded ✓

Step 7 — Test coverage: line **97.65%** across `agents/**` (exceeds ≥ 80% DoD; repo/serializer/index all 100%; service 98.21; routes 96.55; schema 96.55). Branch 79.59% — uncovered branches are Prisma-JsonValue-shape defensive narrows in serializer + retry-with-mock-null-error edge cases + zod-parse-null-body defensive paths. All coverage misses justified ✓

Step 8 — Verdict: **APPROVED**

**PM annotations on exec Notes**

- **Note #1 (Q-T28-#1 stays open at PARENT §3a for PO)** ✓ verified. Registered at ACK time (`83e1b44`) — status unchanged: **open, PO ratify**. Slot C code idempotent to either resolution (no dead code today) — matches T21 Q-C-02 discipline pattern.
- **Note #2 (defensive `config` narrowing in serializer)** — accepted as-is. Trade-off (1 uncovered branch line for stable FE `config: Record<string, unknown>` contract) is defensible.
- **Note #3 (`fakeDb` typing in tests via `as unknown as PrismaClient`)** — accepted as-is. Same pattern as T21/T25/T27 mock repo casts. Testing-convention discussion (not module-specific).
- **Note #4 (retry-once policy under sustained contention)** — accepted as-is per PM ACK GAP #2 lean A. Settings surface UX tolerance. Flag for follow-up if traffic profile changes.
- **Note #5 (no `agent_type` DB CHECK / enum lock)** — noted. Consistent with T25 Q-T25-#2 permissive-name pattern + spec §2.11's permissive VARCHAR(40). Foundation-scope migration if PO wants enum lock; not blocking today.
- **Note #6 (`config` shape per-agent_type schemas)** — future coordination task with AI service consumers. Non-blocking.

**Slot A / Slot B awareness**
- Zero touch on Slot B files, Slot A owned surface (env.ts + core/ + plugins/ + shared/socket/ + api.ts + migrations all untouched).
- **First Slot C module with zero eslint-disable** — foundation ESLint nudge (from T25 VERDICT) still open at PARENT §10 for future port+adapter modules (T22/T23/T24 menu tasks may hit it).
- Q-T28-#1 stays open PARENT §3a (**PO decision needed**) — non-blocking for T28 merge; T28-slice-1 ships Min-3 only.

**§1 task tracker updated · §0 focus updated · §4 drift baseline updated · PARENT §1 T28 row → approved · Short roll-up posted to PARENT §2 · Q-T28-#1 stays open PARENT §3a.**

**PO merge please**: branch `feat/settings-agents` @ `02a296d` ready for main merge. Q-T28-#1 (tier-cap semantics) needs PO ratification but non-blocking — code is idempotent to either resolution. Slot C **4/10 approved** (T21 merged + T25 merged + T27 merged + T28 approved-awaiting-merge). Next candidate: **T29 Voice groundwork stub** (last fully-unblocked task).

### ASSIGNMENT T29 — Settings/voice groundwork (GET + PUT + POST /test) — claimed by exec-C (Satrio) at 2026-07-03 H0

- **Routed from**: PM C verbal direction ("continue to next T") + §0 preview line 23 "T29 fully unblocked (last fully-unblocked task)". Self-select per EXECUTOR-PROTOCOL §0.3 route (B).
- **Branch (to create on PLAN ACK)**: `feat/settings-voice`
- **Spec source of truth**: `docs/spec/02-hotel-core.md` §1.5 (endpoints) + §2.12 (DDL `voice_configs`) + §6 RBAC row `/api/settings/voice*`; `docs/spec/MVP-HOTEL-CORE-FIRST.md` §C9 (AC — 3 endpoints listed) + §101 line 172 ("**`voice_configs`** persistence — keep the stub endpoint; real PBX config is wave 2a per ADD-23.7") + §80 (deferred to wave 2a).
- **Living reference**: `src/modules/agents/` (T28 approved — same simplicity, no port/adapter, single-table upsert semantic differs but layout mirrors). `src/modules/departments/` for zod strict pattern.
- **Groundwork positioning**: spec explicitly flags T29 as "wave 2a groundwork only". Slice-1 = persistence + stub /test — NO PBX integration, NO port/adapter for actual SIP/Twilio wire-up, NO connection retry logic. FE settings page renders + saves; real PBX integration is wave 2a per ADD-23.7.

**Scope (3 endpoints)**

| Method | Path                        | Purpose                                                                                          |
| ------ | --------------------------- | ------------------------------------------------------------------------------------------------ |
| `GET`  | `/api/settings/voice`       | Get voice config for tenant hotel. Returns default `{pbx_type: null, config: {}, is_active: false}` if row absent (never 404) |
| `PUT`  | `/api/settings/voice`       | Upsert voice config (hotel_id PK). Accepts `pbx_type` / `config` / `is_active` — all optional     |
| `POST` | `/api/settings/voice/test`  | Stub connection test — winston log + return `{success: true, note: 'stub — PBX integration is wave 2a'}` |

**Data model** (already migrated via T02 — do NOT touch schema)
- `voice_configs` @ `docs/spec/02-hotel-core.md:715-725`; verified `prisma/schema.prisma:456-466`. PK = `hotelId` (one row per hotel — natural upsert target). Fields: `pbxType (VARCHAR 40 nullable)`, `config (JSONB default {})`, `isActive (default false)`, `updatedAt`. Relation: `hotel Hotel @relation(fields:[hotelId], references:[id], onDelete: Cascade)`.
- **No CHECK constraint** on `pbx_type` at DB — spec §2.12 lists `'sip'|'twilio'|…` as example but permissive (Q-C-01 pattern).

**RBAC** (spec §6:813 — `/api/settings/voice*`):
- `super_admin`: yes · `gm_admin`: yes · `dept_head`: **NO** · staff: **NO**.
- Wire via `@plugins/rbac.js` `requireRole(ctx, ['gm_admin'])` (T21/T25/T27/T28 verified pattern).

**Business rules**
- **GET**: read `voice_configs` for `ctx.hotelId`. If no row → return `{data: {pbx_type: null, config: {}, is_active: false, updated_at: null}}` (empty-state default per MVP §101 stub-endpoint guidance). Never 404.
- **PUT (upsert)**: hotel_id from `ctx.hotelId` (PK); zod strict body accepts `{pbx_type?: string | null, config?: Record<string,unknown>, is_active?: boolean}` — `.refine(non-empty)`. Prisma `upsert({where:{hotelId}, create: {...}, update: {...}})` — atomic. Returns fresh row as `{data: VoiceConfigWire}` with `200`.
- **POST /test**: stub — no actual PBX connection. Requires current config to have `pbxType` set; if null → `ValidationError('Voice PBX not configured', {reason:'VOICE_NOT_CONFIGURED'})` → 400 (soft guard; FE UX signal). See GAP T29-#3. Winston log at route layer for observability. Return `{data: {success: true, note: 'stub — PBX integration is wave 2a per ADD-23.7'}}` with `200` on happy path.

**Files to create**
```
src/modules/voice/
├── voice.types.ts                                  (DomainVoiceConfig, VoiceConfigRow,
│                                                     VoiceConfigWire, TestResultWire,
│                                                     response envelopes)
├── voice.schema.ts                                  (zod: UpsertVoiceBodySchema.strict.refine-non-empty)
├── voice.serializer.ts                              (Prisma row → snake_case wire;
│                                                     empty-default helper for GET no-row case;
│                                                     defensive config narrow to {} on non-object)
├── voice.repository.ts                              (Prisma direct — findByHotel, upsert)
├── voice.service.ts                                 (get with default-fallback empty state;
│                                                     upsert wrapping; test stub with soft guard)
├── voice.routes.ts                                  (Fastify plugin: 3 handlers; thin)
├── index.ts                                         (barrel — plugin + service + factory + wire types)
└── __tests__/
    ├── voice.service.test.ts                              (unit; mock repo; branches:
    │                                                       get-empty-default, get-populated, upsert
    │                                                       partial+full, test happy + test guard 400)
    ├── voice.routes.test.ts                               (unit; Fastify inject; happy + 401 +
    │                                                       403 dept_head/staff + 400 test-guard)
    └── voice.repository.integration.test.ts               (testcontainers real Postgres;
                                                             upsert idempotency, tenant isolation
                                                             via PK-per-hotel, permissive pbx_type)
```

**Files to modify**
- **Zero** — `src/entrypoints/api.ts` untouched. Env + schema + migrations + core + plugins + shared untouched. No new ports/adapters (stub /test is inline, not external RPC — CLAUDE.md §4 port requirement is for outbound RPC to real services, not stubbed groundwork).

**T29 DoD**
- [ ] 3 endpoints wired.
- [ ] Zod strict body on PUT; `.refine(non-empty)`.
- [ ] Tenant scope: PK `hotelId` from `ctx.hotelId` on all 3 endpoints.
- [ ] RBAC: `requireRole([gm_admin])` on all 3.
- [ ] GET returns empty defaults if no row; never 404.
- [ ] PUT is idempotent upsert; multiple PUTs converge to same state.
- [ ] POST /test guard: 400 `VOICE_NOT_CONFIGURED` when `pbxType` null.
- [ ] `make check` PASS baseline **450/1/451** (post-T28-merge); delta in SUBMIT.
- [ ] Drift scans clean.
- [ ] Named exports only.
- [ ] Zero touch on `api.ts`/`env.ts`/`prisma/migrations/`/`core/`/`plugins/`/`shared/socket/`.

#### PLAN T29 — exec-C (Satrio) at 2026-07-03 H0

**Scope recap**
3 endpoints: `GET /api/settings/voice` (empty-default fallback), `PUT /api/settings/voice` (upsert), `POST /api/settings/voice/test` (stub with soft guard when `pbxType` null). Prisma direct (ADR-0001). No ports/adapters (stub, not real PBX RPC per wave 2a defer). RBAC `requireRole([gm_admin])`. Tenant scope via PK. Zero cross-cutting touches.

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity confirmed: Executor, Slot C (Satrio) ✓
- CLAUDE.md loaded ✓
- Task spec read: `docs/spec/02-hotel-core.md` §1.5 + §2.12 + §6:813 ✓ ; `docs/spec/MVP-HOTEL-CORE-FIRST.md` §C9 + §101:172 (stub endpoint guidance) + §80 (wave 2a defer) ✓
- Parent docs spot-read: `src/modules/agents/` (T28 layout — thinnest slot-C module, no port/adapter), `src/modules/departments/` (T21 upsert-shape reference for integration test), `src/plugins/tenant-guard.ts` + `rbac.ts`, `src/core/errors/app-errors.ts` `ValidationError`, `prisma/schema.prisma:456-466` (VoiceConfig — PK is hotelId) ✓
- Dependencies: T02 ✓ · T03 ✓ · T04 ✓ · T05 ✓ · T07-slice-1 ✓ · T21/T25/T27/T28 ✓ (living references) — all approved and merged
- `make typecheck` clean ✓ · `make lint` clean ✓ · `make test-unit` **450/1/451** ✓
- Scaffolder risk: **none**

**Approach**
Mirror T28 layout (no port/adapter, no state machine, no transaction). Service constructor `(repo)`. **GET**: `repo.findByHotel(hotelId)` → serialize if present, else return `emptyDefault()` (helper in serializer returning static empty wire). **PUT**: `repo.upsert(hotelId, delta)` using Prisma `upsert({where:{hotelId}, create: {hotelId, ...delta}, update: {...delta}})`. All fields optional in delta; upsert fills defaults from Prisma schema (`isActive: false`, `config: {}`, `pbxType: null` remains null unless set). **POST /test**: fetch current via `repo.findByHotel`; if row is null OR `pbxType` null → throw `ValidationError('Voice PBX not configured', {reason:'VOICE_NOT_CONFIGURED'})` (400); else return stub result wire. Winston log at route layer per T21/T25/T27/T28 pattern. Tests: unit for empty-default branch, upsert partial/full, /test guard branches; integration for upsert idempotency + PK-per-hotel tenant isolation + permissive `pbx_type` (any string incl `'sip'`/`'twilio'`/`'custom_pbx_v2'`).

**GAPs / questions**

- **GAP T29-#1** — GET behavior when no row exists. MVP §101:172 says "keep the stub endpoint (always returns empty + `pbx_type: null`)". Two readings:
  - (A) GET ALWAYS returns empty stub regardless of DB state — ignores DB, pure façade.
  - (B) GET honestly reads DB; returns empty defaults ONLY when no row exists. PUT persists; subsequent GET reflects PUT.
  - **My intent**: **B** — spec §1.5 lists `GET, PUT /api/settings/voice` as paired verbs; if GET ignored PUT, pair is nonsensical. MVP §101 phrasing "keep the stub endpoint" means the ENDPOINT exists as a stub (not that the response ignores state). Empty stub ONLY when no row.

- **GAP T29-#2** — `pbx_type` validation. Spec §2.12 example values `'sip'|'twilio'|…` are illustrative, DDL is VARCHAR(40) permissive.
  - **Options**: A) permissive `z.string().min(1).max(40).nullable().optional()`; B) enum-lock `['sip','twilio']`; C) permissive with soft-lint WARN.
  - **My intent**: **A** — matches DDL + spec "…" open-set signal + Q-C-01 pattern. Wave 2a will add real PBX types beyond current guess.

- **GAP T29-#3** — POST /test guard on `pbxType: null`. Options:
  - (A) 400 `VOICE_NOT_CONFIGURED` `ValidationError` — FE gets a clear UX signal.
  - (B) Return `{success: false, note: 'no PBX configured'}` with 200 — treat "test unconfigured" as valid observability result.
  - (C) Return `{success: true, note: 'stub — always succeeds'}` unconditionally.
  - **My intent**: **A** — matches user intent (clicked "test" expecting to test something). 200-with-success:false ambiguous; 200-always-success:true misleading when nothing configured.

- **GAP T29-#4** — Test result envelope shape. Options:
  - (A) `{data: {success: boolean, note: string}}` — canonical Q-B-01 wrapper.
  - (B) `{data: {success: boolean, message: string}}` — reuse `message` naming.
  - **My intent**: **A** with `note` — `message` reserved for AppError envelope; avoid overload.

- **GAP T29-#5** — `updated_at` in empty-default wire. When no row exists, GET returns `updated_at: null`? Or omit the field entirely?
  - **My intent**: `updated_at: null` for shape consistency (all-populated-or-empty shape uniform; FE renders "never configured" state). Type declares `updated_at: string | null`.

Q-B-01/Q-B-02/Q-C-01..-03/Q-T25-#1..#5/Q-T27-#1..#7/Q-T28-#1 all resolved or open elsewhere — not re-raising.

**Est.**: ~2-3h (smallest Slot C task — 3 stub endpoints, single-table upsert, no state machine, no port/adapter, no transaction).

Awaiting PM C ACK.

##### PM C ACK — T29 PLAN APPROVED with 2 tightenings + 1 spec-ambiguity escalation (proceed to coding, 2026-07-03 H0)

**Self-claim ratified** — T29 was named in T28 VERDICT §0 preview as "last fully-unblocked Slot C task". Self-authored ASSIGNMENT block follows my patterns cleanly; session-start gate + baseline 450/1/451 ✓. Files layout mirrors T28 (thinnest Slot C module template — no port/adapter for stub /test since CLAUDE.md §4 port requirement is for outbound RPC to real services, not stubbed groundwork; **exec's reasoning correct** — when wave 2a lands with real SIP/Twilio integration, THAT task adds the port + adapter). GAP responses #2, #4, #5 all accept clean rationale.

**Tightening #1 — Q-T29-#3 use `BusinessRuleError` (422), not `ValidationError` (400)**

Verified `src/core/errors/app-errors.ts:27-30` — `ValidationError` has hardcoded `code:'VALIDATION_ERROR'` + `statusCode:400`. It's semantically scoped to **request-shape validation** (malformed body, missing required field, bad type). The `POST /test` guard on `pbxType: null` is different — the **request itself is valid**; what's not met is a **domain precondition** ("must configure PBX before testing"). This is the "precondition-not-met domain rule" semantic that `BusinessRuleError` (422, T07-slice-1) was built for. Matches T25 `WA_TEMPLATE_LOCKED` + T28 `MIN_AGENTS_VIOLATION` precedent — same envelope shape (`code:'BUSINESS_RULE'` + `details.rule:'VOICE_NOT_CONFIGURED'`).

**Corrected code**:
```ts
if (!row || row.pbxType == null) {
  throw new BusinessRuleError('Voice PBX not configured', {
    rule: 'VOICE_NOT_CONFIGURED',
  });
}
```
Not `ValidationError`. Wire envelope: `{code:'BUSINESS_RULE', message:'Voice PBX not configured', details:{rule:'VOICE_NOT_CONFIGURED'}}` — FE discriminates on `details.rule` (T25/T28 pattern).

**Tightening #2 — winston observability at BOTH `PUT` and `POST /test` route layers**

Exec's plan mentions winston log at `/test` for observability. Add: `PUT /api/settings/voice` also logs at handler with `{module:'voice', action:'upsert', pbxTypeSet: body.pbx_type != null, isActiveSet: body.is_active === true, correlationId}` — voice-config changes are settings-audit-worthy (T25 template edits are similarly logged). Not PII (pbx_type is 'sip'/'twilio' operational). Standard T21/T25/T27/T28 handler-log pattern.

**Spec ambiguity escalation — Q-T29-#1 (GAP #1) rolls to PARENT §3a**

Q-T29-#1 is a **genuine spec ambiguity** requiring PO clarification. MVP §101 line 81 says:
> "voice_configs persistence — **keep the stub endpoint (always returns empty + pbx_type: null)**; real PBX config is wave 2a per ADD-23.7."

Parenthetical "**always returns empty**" reads literally as exec's option (A): GET is a pure façade ignoring DB state. That would make PUT + persistence table pointless in slice-1. But spec §1.5 line 181 pairs `GET, PUT /api/settings/voice` as normal verbs, and the DDL exists with proper PK+columns, which supports exec's option (B) semantic reflection of DB state. The tension is real.

**Ruling**: **Slice-1 ships exec's option (B)** — PUT persists + GET reflects DB state with empty-default fallback when no row. Rationale:
1. Least-surprising API semantic (GET reflects what PUT wrote).
2. If MVP §101 is literal-A ("always empty facade"), what does PUT even do? A no-op PUT with a persistence table is contradictory.
3. Data collected now is available to wave 2a FE + real PBX integration without a migration to backfill.
4. If PO rules literal-A, single-line service change (`get()` returns static empty regardless of DB) — zero regression risk on flip.

**Register Q-T29-#1 in §3 → roll to PARENT §3a** (contract Q for PO — spec §1.5 vs MVP §101 phrasing reconciliation). Non-blocking for T29 merge; code is idempotent to either resolution (matches Q-T28-#1 handling discipline).

**GAP #2 (pbx_type validation)** → **Option A confirmed** — permissive `z.string().min(1).max(40).nullable().optional()`. Matches DDL VARCHAR(40) + Q-C-01 permissive-JSONB / Q-T25-#2 permissive-name / Q-T28 permissive-agent_type patterns. Wave 2a will add real PBX types beyond current guess.

**GAP #4 (test result envelope)** → **Option A confirmed** — `{data: {success: boolean, note: string}}`. `note` avoids `message` overload with AppError envelope. Q-B-01 canonical wrapper.

**GAP #5 (`updated_at` in empty default)** → **Confirmed** — `updated_at: null` for shape uniformity. Type declares `updated_at: string | null`.

**Coding checklist reminders** (things easy to miss)

- **Prisma `@updatedAt` decorator**: verified `schema.prisma:461` — `updatedAt` auto-populates on any write via the decorator. Do NOT manually set it in `upsert.create/update` payloads (Prisma handles it).
- **`config` defensive narrow**: same T28 pattern — non-object JSONB rows serialize to `{}` on wire. Slice-1 ingest path is zod-guarded (record shape), but defensive narrow protects against raw INSERT drift.
- **`isActive` semantics on PUT**: if body omits `is_active`, upsert leaves current value (or Prisma schema default `false` on create). Don't force `false` on missing key — respect partial-update contract.
- **`emptyDefault()` helper location**: place in serializer per exec plan; return static `{pbx_type: null, config: {}, is_active: false, updated_at: null}`. Never carries `hotel_id` since it's the caller's tenant scope, not part of the wire (or does it? Check T21/T27/T28 wire shape convention).
- **Wire shape for `hotel_id`**: T21 departments wire includes `hotel_id`; T25 wa-templates wire includes `hotel_id`; T27 billing wire OMITS `hotel_id` (it's the caller's tenant context). Slice-1 T29 voice-config could go either way. **PM lean**: include `hotel_id` in wire for consistency with per-table settings endpoints (matches T21/T25 convention). Empty-default helper returns `hotel_id: ctx.hotelId` (the caller's) not null.
- **Empty-body PUT**: `.refine(non-empty)` rejects entirely empty body. Test coverage for this branch.
- **Empty-DB GET after empty-DB test**: sequence proves the empty-default is stable + not a side effect of prior writes.
- **Baseline math for SUBMIT**: 450/1/451 post-T28 merge (PR #14 `0e68a38`) — exec noted correctly.
- **Expected eslint-disable**: **0** (T28 precedent — no port/adapter → no barrel adapter import).

**Slot A / Slot B awareness**
- Zero touch on Slot B files, Slot A owned surface (all foundation untouched).
- Q-T29-#1 rolls to PARENT §3a (PO Q, non-blocking); Q-T28-#1 already at §3a still open.
- No new foundation nudges from T29 — smallest task, standard patterns throughout.

**Mid-task CHECKPOINT trigger**: unlikely needed at ~2-3h estimate. Straight-line to SUBMIT.

Proceed to coding on `feat/settings-voice`. Awaiting your SUBMIT.

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
| Q-T29-#1      | **Spec ambiguity contract Q for PO**: MVP §101:81 says `voice_configs` "stub endpoint (**always returns empty + `pbx_type: null`**)". Literal reading = GET is a pure façade ignoring DB state → PUT + persistence table pointless in slice-1. But spec §1.5:181 pairs `GET, PUT /api/settings/voice` as normal verbs + DDL exists with PK+columns → supports GET reflects DB state. Which semantic? | T29 · PM C independent MVP §101 vs spec §1.5 cross-check | **open — PO ratify** (rolls to PARENT §3a) | Slot C T29 ships **Option B**: PUT persists + GET reflects DB with empty-default fallback when no row. Rationale: (a) least-surprising API, (b) MVP §101 literal-A makes PUT+table contradictory, (c) data collected now available to wave 2a without backfill migration, (d) if PO rules literal-A: single-line service change (`get()` returns static empty regardless of DB). Zero regression risk on flip. Non-blocking for merge; matches Q-T28-#1 idempotent-to-either-resolution discipline. |
| Q-T27-#7      | **Foundation port gap**: `src/core/storage/object-storage.port.ts:1-32` exposes `upload` + `delete` only — **no `download` method**. T08 slice-1 comment explicitly says "Slice-1 surface … Signed URL generation deferred to slice-2", implying more slices were expected. T27 slice-1 needs invoice PDF download stream. | T27 · exec-C PLAN GAP #7 · discovered via spec/foundation cross-check | **open — rolls up to PARENT §3b + §10 for Slot A / foundation extension (T-INFRA-06 candidate)** | Slot C T27-slice-1 ships Option A: local `BillingPdfStoragePort` at `src/modules/billing/ports/billing-pdf-storage.port.ts` with `download(key): Promise<Buffer \| null>` + `InMemoryBillingPdfStorageAdapter` for tests + composition-root wiring. Production adapter deferred (DEP-4 or foundation extension). **Foundation fix (T-INFRA-06 candidate)**: extend core `ObjectStoragePort` with `download(key): Promise<Buffer \| null>` + implement on `S3Adapter` (SDK `GetObjectCommand`) + `InMemoryAdapter`. Small extension; matches T08's slice-1 trajectory. Also serves T22/T24 menu-image download + T27 daily-brief when W3 lands. **Migration path when foundation lands**: billing barrel swaps consumer to core port; local port + adapter deleted; billing service constructor untouched (structurally identical). Zero regression risk. |
| Q-T28-#1      | **Contract Q for PO**: is there a hard tier-cap on `PATCH /api/settings/agents/:id` `is_active:true` that blocks activation beyond `tier.agents_max`? Spec §7 catalog (line 820-835) defines `MIN_AGENTS_VIOLATION` + `TIER_GATE` (resource-access, e.g. analytics) but NO `AGENTS_TIER_CAP` or similar 422 for over-activation. Spec §1.10 tier matrix uses "**3 min**" (Professional) + "**5 include**" (Luxury) wording + `billing_extras.type='extra_agent'` DDL comment at §2.10 line 686 suggests baseline-included counts with billing-time expansion (not hard-caps). Enforcing a hard cap at activation-time would block a hotel from activating agents they paid for via extras. | T28 · PM C independent spec review of exec ASSIGNMENT self-authored tier-cap enforcement · Q escalated to PARENT §3a | **open — PO ratify** (slice-1 ships Min-3 only) | Slot C T28-slice-1 enforces ONLY Min-3 (spec-explicit hard rule). Tier-cap enforcement dropped from scope; `TIER_MATRIX` import from billing NOT needed. If PO ruling introduces a hard cap: needs (a) spec §7 catalog addition (`AGENTS_TIER_CAP`?), (b) clarification on interaction with `billing_extras.extra_agent` (does purchasing an extra raise the cap? By 1 per row? By `qty`?), (c) follow-up ticket (T28-slice-2 or feature-flags T26 tier-gate module). **Slot C ships slice-1 clean today; slice-2 or feature-flags reintroduces tier-cap post-PO-ruling**. |

---

## 4. Drift baseline (slot C files only, end of each day)

| Run | Touched files | `any` | console.log | `throw new Error(` | forbidden imports | default export (di luar entry) | `.skip` | hardcoded URL | webhook tanpa HMAC | wrap-Prisma interface |
| --- | ------------- | ----- | ----------- | ------------------ | ----------------- | ------------------------------ | ------- | ------------- | ------------------ | --------------------- |
| H0 baseline | (no src/ touched) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 2026-07-03 T21 SUBMIT | src/modules/departments/** (10) + src/core/config/env.ts (+7 lines additive) | 0 | 0 | 0 (env.ts:91 pre-existing boilerplate `5ce7f867`, not this task) | 0 | 0 | 0 | 0 | 0 (N/A no webhook) | 0 |
| 2026-07-03 T25-slice-1 SUBMIT | src/modules/wa-templates/** (13) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (N/A slice-1 no callback) | 0 |
| 2026-07-03 T27-slice-1 SUBMIT | src/modules/billing/** (16) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (N/A slice-1 no callback) | 0 |
| 2026-07-03 T28 SUBMIT | src/modules/agents/** (10) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (N/A no webhook) | 0 |

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
