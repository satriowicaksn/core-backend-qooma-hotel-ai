# PM-STATUS-B — Qooma Backend · Dev B (Nathan)

> **Per-dev tracker untuk slot B (Nathan).** PM B + Executor B komunikasi **hanya** via file ini. Roll-up short summary ke `PM-STATUS-PARENT.md §2` setelah tiap VERDICT atau end-of-session.
>
> **PM A, PM C, Executor A, Executor C — JANGAN edit file ini.** File ini private ke slot B.
>
> **⚠️ Ownership swap 2026-07-01**: Slot B originally assigned to Nanak → **swapped to Nathan** (permanent). Nanak now permanent owner slot A (Foundation, T01–T10). See `PM-STATUS-PARENT.md §4` for approved deviation. This file waits for Nathan onboard.
>
> **Identity check**: di response pertama session WAJIB confirm `Role: PM | Executor`, `Slot: B (Nathan)`. Bila user belum sebut slot — STOP, tanya dulu (lihat `KICKOFF.md §4`).
>
> Format block di §2 Active assignments **append-only** (lihat `EXECUTOR-PROTOCOL.md §0.5` & `PM-AGENT.md §0.4`).

---

## 0. Current focus (slot B)

- **Day**: H12 (global) / slot-B H1 — PM B (Nathan) online 2026-07-01; T11 ASSIGNMENT issued, awaiting exec-B claim + PLAN
- **Owner**: Nathan (permanent per PARENT §4 2026-07-01 slot swap; slot B originally Nanak, swapped)
- **Active**: **4/10 merged** (T11,T13,T14,T15). **T19** 🟢 ready (DEP-5 landed, awaiting PLAN) · **T16** V1 done, V2–V5 ⛔ DEP-6 (only blocker left). T12⛔(T06+DEP-6). Backlog T17/T18/T20.
- **Branches**: T11 merged ✓ · T13 merged ✓ · T14 `feat/guests-crud` · T16 `feat/visits-list-verify` · T19 `feat/notifications-crud` (pending)
- **Mode**: multi-executor. Each T = own thread in §2 (ASSIGNMENT→PLAN→ACK→SUBMIT→VERDICT) + own branch → I verify each independently on its branch. See §0a board for live state.
- **Runtime**: T04 MERGED ✓ (`req.tenant` live). Go-live gate = **DEP-4** (`api.ts` bootstrap). **DEP-5** (`ctx.userId`) unblocks T19. Both escalated.
- **Progress**: **2/10 merged (T11, T13)** · 2 active (T14, T16) · 2 blocked (T19, T12) · 4 backlog. See §0a.
- **Next gate (global)**: G1 — lihat `PM-STATUS-PARENT.md §5`
- **Queue (Slot B, from PARENT §1)**: T11 assigned; T12–T19 backlog (transition/reroute needs T06, stats/overdue, guests CRUD, guest messages, visits+verify, notifications); T20 socket gated on T11+T16+T19.
- **⚠ Verified blockers (src/ inspection 2026-07-01)**:
  1. `src/common/` empty → **T03 tenant-guard + T04 RBAC (Slot A) NOT built**. T11 codes against a `SessionContext` seam, injected in tests; NOT mergeable to main until Slot A lands the middleware (MVP §4.1).
  2. `src/entrypoints/api.ts` still a stub (no Fastify bootstrap / `fastify.services`). T11 ships as `ticketsRoutes` plugin + service/repo behind barrel; live-server wiring = foundation scope.
  3. `docs/API-CONTRACT.md §2.2` (canonical response envelope) absent from repo → open-Q Q-B-01 (§3).

---

## 0a. Progress board + Loop ledger (Slot B — at-a-glance)

> **Purpose (PO ask 2026-07-01)**: crisp "done vs not-done" every loop, whether we close 1 T or several. Board = current state of all 10 Slot-B tasks. Ledger = one append per loop close (newest on top). Detail lives in §1 (tracker) + §2 (threads).

### Progress board — Slot B (T11–T20)
| T## | Task | Status | Branch | On main? |
| --- | ---- | ------ | ------ | -------- |
| T11 | Tickets list + detail | ✅ approved | `feat/tickets-list-detail` | ✅ merged (PR #1) |
| T13 | Ticket stats + overdue | ✅ approved | `feat/tickets-stats-overdue` | ✅ merged |
| T14 | Guests CRUD + preferences | ✅ approved | `feat/guests-crud` | ✅ **merged (PR #3)** |
| T15 | Guest messages history | ✅ approved | `feat/guest-messages` | ✅ **merged (PR #4)** |
| T16 | Visits list + verify-manual | ✅ approved (full V1–V6) | `feat/visits-list-verify` | ✅ **merged (PR #6)** |
| T12 | Ticket transition + reroute | ✅ approved | `feat/tickets-transition` | ✅ **merged (PR #5)** |
| T19 | Notifications CRUD | 🟢 UNBLOCKED (DEP-5 merged) — ready for PLAN | `feat/notifications-crud` | — |
| T17 | Visit reject + failed_3x | 🟡 wip (PLAN ACK'd) — extends `visits/` | `feat/visits-reject-override` | — |
| T18 | Manual visit create | 🟢 unblocked on T16 merge (extends `visits/`) | — | — |
| T20 | Socket emitters | ⚪ backlog (←T11✓+T16+T19) | — | — |

**Counts**: ✅ **6/10 merged (T11, T13, T14, T15, T12, T16)** · 🟡 T17 assigned (visits) · 🟢 T18 + T19 ready · ⚪ T20 (←T16✓+T19). Zero foundation blockers (only DEP-4 go-live). Sisa 4: T17, T18, T19, T20.
**Foundation watch (updated 2026-07-02 H14)**: ✅ DEP-6 `BusinessRuleError` · ✅ T06 state-machine · ✅ T-INFRA-01 prisma · ✅ **DEP-5 `ctx.userId` MERGED** (T-INFRA-02 `e95a23d` → T19 + T12 audit unblocked) · ✅ **GAP-T11-3 fixed** (T-INFRA-03 `cf65e99` → `make check` no Docker) — ALL Slot-B impl blockers cleared. ⏳ only **DEP-4 `api.ts` bootstrap** (go-live for all routes) remains.

### Loop ledger (newest on top)
- **Loop 10b — 2026-07-02 — T16 MERGED (PR #6); T17 issued.** Visits module complete on main → **6/10 merged** (T11,T13,T14,T15,T12,T16). Going one-at-a-time (parallel deferred — worktree setup skipped for now). Issued **T17** (visit reject + approve-manual/failed_3x, extends `visits/`, reuses T16 transition tx + checkout). Remaining: T17 (wip), T18 (visits, after T17 — same module), T19 (notifications, ready anytime), T20 (←T19).
- **Loop 10 — 2026-07-02 — T16 APPROVED (full V1–V6).** Visits verify-manual done (PM rerun: make check 205 no-Docker, coverage 98.01%, drift clean, merge dry-run CLEAN, tx atomicity + 422/404 no-mutate verified, checkout-TZ seam + module-local transition). Branch rebased cleanly (was 56 behind). → merge `feat/visits-list-verify`. **6/10 done pending merge. T16 merge unblocks T17 + T18.** Remaining: T19 (ready), T17, T18 (←T16), T20 (←T16+T19).
- **Loop 9b — 2026-07-02 — T12 MERGED (PR #5).** Slot B **5/10 merged** (T11,T13,T14,T15,T12). Next: T16 resume V2–V5 — ⚠ branch `feat/visits-list-verify` is **56 commits behind main** (created pre-foundation-merges); **must rebase onto main first** (picks up `BusinessRuleError`+`ctx.userId`; disjoint `visits/` module → rebase should be clean) before adding verify-manual.
- **Loop 9 — 2026-07-02 H14 — T12 APPROVED.** Ticket transition + reroute APPROVED attempt 1 (PM rerun: make check 173 in 2.5s no-Docker, coverage 96.68%, drift clean, merge dry-run into latest main CLEAN, negative tests 422+403 verified, optimistic-concurrency race-check). → merge `feat/tickets-transition`. **5/10 done pending merge.** Remaining active: T16 (resume V2–V5), T19 (ready). Then T17/T18 (←T16), T20 (←T16+T19).
- **Loop 8 — 2026-07-02 H14 — T12 PLAN ACK'd; DEP-5 + GAP-T11-3 now merged.** T12 PLAN ACK'd (ruled Q-B-11 → option (a): DEP-5 merged mid-flight so use `ctx.userId` directly, no null-interim). **DEP-5 (T-INFRA-02) + GAP-T11-3 (T-INFRA-03) both MERGED** → **T19 now unblocked**, `make check` no longer needs Docker, prisma-gen workaround droppable. Ratified T-INFRA-02's fixture edits to my test files. **All Slot-B impl blockers cleared** (only DEP-4 go-live left). Active: T12 (coding) + T16 (resume) + T19 (ready).
- **Loop 7 — 2026-07-02 — Slot A unblocks land; DEP-5 correction.** Verified main precisely: ✅ **DEP-6** (`BusinessRuleError`) + ✅ **T06** (state-machine) + ✅ **T-INFRA-01** (prisma real) all MERGED → **T16-V2..5 resume + T12 issued** (both now unblocked). ⚠ **Correction**: my Loop-6 "DEP-5 shipped → T19 unblocked" was WRONG (grep matched `SessionUser.userId`, not `TenantContext`) — DEP-5 still open, **T19 still blocked** (T-INFRA-02 pending). Executors: drop `pnpm prisma:generate` workaround (T-INFRA-01). Active now: T12 (PLAN) + T16 (resume V2–V5).
- **Loop 6b — 2026-07-02 — T15 MERGED (PR #4).** Slot B **4/10 merged** (T11, T13, T14, T15). No new PLAN/SUBMIT yet. Productive paths open: **T19 PLAN** (unblocked) + poke Slot A for **DEP-6** (only blocker left, opens T16-V2..5 + T12).
- **Loop 6 — 2026-07-02 — T15 APPROVED; DEP-5 shipped → T19 unblocked.** T15 (guest messages) APPROVED attempt 1 (PM rerun: make check 144, coverage 97.46%, drift clean, merge dry-run CLEAN) → merge `feat/guest-messages`. **Slot A shipped DEP-5** (`ctx.userId` now on `TenantContext`) → **T19 unblocked** (ready for PLAN). Still open: **DEP-6** (`BusinessRuleError` → T16-V2..5 + T12). Next active: T15 merge + T19 PLAN; T16 still waits on DEP-6.
- **Loop 5 — 2026-07-02 — T14 MERGED (PR #3); T15 issued.** Guests live on main → **T15 (guest messages) unblocked** and issued (`feat/guest-messages`, extends guests module). Bottleneck now = Slot A shipping **DEP-5** (`ctx.userId` → T19) + **DEP-6** (`BusinessRuleError` → T16-V2..5 + T12); both still open. Slot B productive path while waiting = T15.
- **Loop 4 — 2026-07-02 — T14 APPROVED, T16 split.** **T14 (guests) APPROVED attempt 1** (PM rerun: make check 131, coverage 97.95%, drift clean, merge dry-run into main CLEAN) → **merge `feat/guests-crud` FIRST**. **T16 (visits) partial**: V1 read-path done+green on branch, but **V2–V5 (verify-manual) blocked on DEP-6** (`BusinessRuleError(422)` missing from `core/errors`; foundation/Slot A — escalated). Ruled GAP T16-#4: envelope `code="BUSINESS_RULE"` + `details.rule="INVALID_VISIT_TRANSITION"`; class owner = Slot A (also unblocks T12). **Merge order: T14 now; T16 hold until DEP-6 → V2–V5 → full SUBMIT.**
- **Loop 3 — 2026-07-01→02 — parallel batch RUNNING.** T14 + T16 **PLANs ACK'd** (2026-07-02), both coding on their branches. Q-B-04 offset envelope ratified (shared, both converged on `{data,pageInfo:{page,pageSize,total,hasMore}}`). T16 GAP #1/#2/#3 → approach A (audit no-op seam, guest_name validate-only, config.TZ); Q-B-09 (visit audit table) → Parent §3c. T14: G6 masking module-local + T-CLEAN-01 follow-up, wa_phone immutable. T19 still ⛔ DEP-5. **Done: T11, T13 merged.** In-flight: T14, T16 coding → whichever SUBMITs first gets an independent VERDICT.
- **Loop 2 — 2026-07-01 H12 — T13 APPROVED + merged.** stats+overdue; `is_overdue` SSOT coherence fix verified 4 sites; T11 regression green. T04 observed merged (seam live).
- **Loop 1 — 2026-07-01 H12 — T11 APPROVED + merged (PR #1).** tickets read surface; PM-reverified (make check + integration + 96% cov + drift clean).

---

## 1. Task tracker (slot B — PM B authority)

> Mirror dari `PM-STATUS-PARENT.md §1` di mana Slot=B. PM B update status row di sini + push status update ke PARENT §1 setelah verdict.

| T## | Title                              | Status   | Verified by PM | Notes                                 |
| --- | ---------------------------------- | -------- | -------------- | ------------------------------------- |
| T11 | Tickets list + detail (GET + filters + cursor pagination) | **approved + MERGED** | PM B (Nathan) | ✅ APPROVED attempt 1 + **MERGED to main via PR #1 (`6c1e4e2`) 2026-07-01**. PM rerun: make check + integration 11 + coverage 96% + drift clean. Runtime gate: T04 (Slot A, now **wip** `972b0c5`) wires `req.tenant` → routes go live. GAP T11-#2 (approach A) approved; #1/#3 escalated to foundation. |
| T13 | Ticket stats + overdue                                    | **approved+MERGED** | PM B (Nathan) | ✅ APPROVED attempt 1 + **MERGED to main** 2026-07-01. PM rerun: make check 93 + integration 17 + coverage 96.66% + drift clean + T11 regression green. ② SSOT coherence verified 4 sites. |
| T14 | Guests CRUD + preferences                                 | **approved+MERGED** | PM B (Nathan) | ✅ APPROVED + **MERGED to main (PR #3 `ab4c113`) 2026-07-02**. make check 131 + coverage 97.95% + drift clean. Unblocks T15. T-CLEAN-01 queued. |
| T15 | Guest messages history                                    | **approved+MERGED** | PM B (Nathan) | ✅ APPROVED + **MERGED to main (PR #4 `64db2a9`) 2026-07-02**. make check 144 + coverage 97.46% + drift clean. |
| T16 | Visits list + verify-manual                               | **approved+MERGED** | PM B (Nathan) | ✅ APPROVED (full V1–V6) + **MERGED main (PR #6 `4cd6851`) 2026-07-02**. make check 205 + coverage 98.01%. Unblocks T17+T18. |
| T17 | Visit reject + failed_3x override                         | wip          | —              | PLAN ACK'd 2026-07-02 (§2). R3 transition-map generalized (T16 byte-identical). Q-B-12 ruled (reject no-body, nights optional). Coding `feat/visits-reject-override`. |
| T12 | Ticket status transition + reroute                        | **approved+MERGED** | PM B (Nathan) | ✅ APPROVED + **MERGED to main (PR #5 `3718e38`) 2026-07-02**. make check 173 (no-Docker) + coverage 96.68% + 422/403 negatives + race-check. |
| T19 | Notifications CRUD + optimistic ops                       | assigned 🟢  | —              | **UNBLOCKED 2026-07-02** — DEP-5 (T-INFRA-02 `e95a23d`) merged, `ctx.userId` now on `TenantContext`. Ready for PLAN + impl. `feat/notifications-crud`. |
| T17/T18/T20 | Downstream CRM + socket                           | backlog      | —              | T17/T18←T16; T20←T11✓+T16+T19 |

---

## 2. Active assignments (append-only)

> **Executor B** append `ASSIGNMENT` block saat claim task. **PM B** append `ACK` / `VERDICT` sub-block di bawah block executor — JANGAN edit block lama.

### ASSIGNMENT T11 — Tickets list + detail — issued by PM B (Nathan) 2026-07-01, awaiting exec-B claim + PLAN
- Branch: `feat/tickets-list-detail` (exec-B creates; **code stays on branch — PO merges to main manually**, per PO directive 2026-07-01)
- Routed from: PARENT §1 T11 (Slot B) = MVP-HOTEL-CORE-FIRST §1.2 **B1**
- Spec authority: `docs/spec/02-hotel-core.md §1.2` (endpoints + list/detail shape) + §2.4 DDL; correctness floor `MVP-HOTEL-CORE-FIRST §4.1/§4.5/§4.6`

**Scope (read-only endpoints only — NO state transitions, that is T12)**
- `GET /api/tickets` — list + filters + **cursor pagination**. Query params (spec §1.2): `status` (CSV), `department_id`, `priority`, `complaint_type` (CSV), `date_from`, `date_to`, `q` (search ticket_number + guest name + body), `is_high_alert` (bool), `is_overdue` (bool), `guest_id`, `limit` (default 20, max 100), `cursor` (opaque base64). Default sort `created_at DESC` + `id` tiebreaker (cursor encodes both).
- `GET /api/tickets/:id` — detail + `updates[]` (order `created_at ASC`) + `messages[]` (order `sent_at ASC`). Shapes per §1.2 (updates: `{id,ticket_id,type,actor_user_id,actor_name,actor_role,from_status,to_status,note,created_at}`; messages: `{id,ticket_id,sender,sender_user_id,body,media,conversation_id,sent_at,delivered_at,read_at}`).

**DoD (PM B will verify each at SUBMIT — PM-AGENT §3)**
- [ ] D1 — List returns §1.2 field set incl. `wa_phone_masked`, `is_overdue`, `is_high_alert`, `priority`, `complaint_type`, `assigned_to` (staff name joined from `users`). All query filters implemented + zod-validated; `limit` clamped ≤100; invalid `cursor` → `400 ValidationError`.
- [ ] D2 — Detail returns ticket + `updates[]` + `messages[]` in specified order; missing ticket → `NotFoundError` (404).
- [ ] D3 — **Tenant guard (§4.1)**: every query scoped `WHERE hotelId = ctx.hotelId`; `super_admin` bypass is an explicit branch; `hotel_id` NEVER read from URL/body. Reads tenant/role/dept from the `SessionContext` seam (see DEP-1), not from request params.
- [ ] D4 — **dept_head scoping (§4.6)**: list auto-filtered to `ctx.deptId`; cross-dept `:id` GET → `404 NOT_FOUND` (NOT 403, anti-enumeration).
- [ ] D5 — **PII masking (§4.5)**: guest `wa_phone`/`name`/`email` masked when `guest.privacy_mode='vvip' AND ctx.role !== 'gm_admin'` (super_admin counts as gm_admin). Applied at a **serializer layer**, not per-handler. Use `maskWaPhone()`/`maskEmail()` from `shared/utils`.
- [ ] D6 — Errors via `AppError` subclasses only (no `throw new Error`). Canonical error envelope.
- [ ] D7 — Structured logging + correlation ID per request (`req.log` / context w/ correlationId).
- [ ] D8 — Module layout per `docs/MODULE_TEMPLATE.md`: `tickets.routes.ts` / `tickets.service.ts` / `tickets.repository.ts` / `tickets.schema.ts` (zod) / `tickets.types.ts` / `index.ts` barrel. No cross-module internal imports (public API via barrel).
- [ ] D9 — Tests: **unit** on service branching (filter build, dept_head scope, masking predicate, cursor encode/decode, super_admin bypass) — no port mocks needed here; **integration** on repository against real `hotel_core_dev` PG (do NOT mock Prisma — CLAUDE.md §8) with seeded hotel/dept/guest/user/ticket fixtures. Line coverage ≥80% on changed files. Naming `it('should <expected> when <condition>')`.
- [ ] D10 — `make check` green (lint + format + typecheck + unit). No `any`, no `console.log`, no default export, explicit return types on public fns. `make test-integration` green (needs `make start`).

**Flagged dependencies (record in PLAN; do not silently work around)**
- **DEP-1 (merge-blocking) — session context seam**: T03 tenant-guard + T04 RBAC (Slot A, Nanak) are NOT built. Define/consume a typed `SessionContext { hotelId; userId; role: 'gm_admin'|'dept_head'|'super_admin'; deptId?: string }` seam (Fastify request decoration or `shared/types`). Inject it directly in tests. T11 is buildable + testable now but **not AC-complete / not mergeable to main** until Slot A middleware populates the seam. If the seam type needs to be shared infra, raise before defining (may affect Slot A/C).
- **DEP-2 — server bootstrap**: `src/entrypoints/api.ts` is a stub. Ship `ticketsRoutes` as a `FastifyPluginAsync` + a service factory exported from the barrel; do NOT block T11 on wiring a live server. Note in PLAN whether any `api.ts` edit is in scope.
- **DEP-3 — dev DB (Opsi C)**: `hotel_core_dev` has Auth `users`/`hotels` as id-only reference stubs, no rows. Integration tests must seed fixtures; `assigned_to` name join is limited in dev — cover via fixture user rows.

**GAP / open question**
- **Q-B-01 (contract)** — `docs/API-CONTRACT.md §2.2` (canonical list/detail **response envelope**: pagination wrapper `data`/`meta`, cursor field name, camelCase-vs-snake_case in JSON) is referenced by the MVP brief but is **absent from this repo**. Source of truth = FE MSW handlers (separate FE repo). Registered §3; escalated to Parent PM (PARENT §3a). **Until resolved**: exec-B builds against §1.2 field names and **proposes the envelope shape in PLAN for PM B ACK** — do not guess silently.

**Before coding — session-start gate (EXECUTOR-PROTOCOL §2)**: confirm identity (Executor, Slot B, Nathan), CLAUDE.md loaded, read 02-hotel-core §1.2/§2.4 + MVP §4, `make typecheck`/`make lint` clean, state any scaffolder command in PLAN for overwrite-risk review.

Awaiting exec-B PLAN (do not code before PM B ACK of the PLAN + Q-B-01 envelope proposal).

### ASSIGNMENT T11 — claimed by exec-B (Nathan) at H1 (2026-07-01)
- Branch: `feat/tickets-list-detail` (created at coding-start, after PM B ACK; code stays on branch, PO merges to main)
- Routed from: PARENT §1 T11 (Slot B) = MVP-HOTEL-CORE-FIRST §1.2 B1
- Claiming the PM-B-issued ASSIGNMENT above. PLAN below.

#### PLAN T11 — exec-B (Nathan) at H1 (2026-07-01)

**Scope recap**
Read-only tickets surface: `GET /api/tickets` (all §1.2 filters + opaque cursor pagination) and `GET /api/tickets/:id` (ticket + `updates[]` asc + `messages[]` asc). No state transitions (that is T12). Tenant-guard + dept_head scope + PII masking enforced against a `SessionContext` seam (T03/T04 not built — DEP-1). Ships as a Fastify plugin + injectable service/repo behind a barrel; no live-server wiring (DEP-2).

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity confirmed: Executor, Slot B (Nathan) ✓
- CLAUDE.md loaded ✓
- Task spec read: `02-hotel-core.md` §1.2 (endpoints + shapes) + §2.4 DDL + §6 RBAC/tenant + §7 error catalog; `MVP-HOTEL-CORE-FIRST.md` §1.2 B1 + §4.1/§4.5/§4.6; `docs/spec/README.md` §2.3/§2.6/§2.7 (envelope) ✓
- Parent docs spot-read: `docs/MODULE_TEMPLATE.md` pattern via `src/modules/_template/*`; `prisma/schema.prisma` (Ticket/TicketUpdate/TicketMessage/Guest models — camelCase fields, `@map` snake_case) ✓
- `node_modules` was absent on this machine → ran `pnpm install` (from committed lockfile, no dep added). After install: `pnpm typecheck` clean ✓ ; `pnpm lint` clean ✓ (baseline green confirmed).
- Scaffolder risk: **none**. Only non-source CLI I will run is `pnpm prisma:generate` (writes `node_modules/.prisma`, gitignored — no overwrite of tracked files/planning docs). No `pnpm create` / `prisma init`.

**Files to create**
```
src/modules/tickets/tickets.routes.ts        FastifyPluginAsync — GET /tickets, GET /tickets/:id (thin: validate → service → serialize)
src/modules/tickets/tickets.service.ts       orchestration: scope resolution, filter build, cursor, calls repo, calls serializer
src/modules/tickets/tickets.repository.ts     Prisma direct (injected PrismaClient; no interface — ADR-0001)
src/modules/tickets/tickets.schema.ts         zod: list-query params, :id param, cursor encode/decode
src/modules/tickets/tickets.serializer.ts     PII masking (§4.5) + snake_case wire shaping (D5 "serializer layer, not per-handler")
src/modules/tickets/tickets.types.ts          domain types, wire DTOs, SessionContext seam (local for now — DEP-1/Q-B-02)
src/modules/tickets/index.ts                  barrel: export ticketsRoutes + buildTicketsService factory (no repo/serializer export)
src/modules/tickets/__tests__/tickets.service.test.ts               unit — pure helpers: filter builder, cursor codec, mask predicate, dept scope, super_admin bypass
src/modules/tickets/__tests__/tickets.repository.integration.test.ts  integration — real hotel_core_dev PG, seeded fixtures
```

**Files to modify**
- **None in `src/` core.** I will NOT touch `src/entrypoints/api.ts` (DEP-2, foundation) nor `src/core/prisma/prisma-client.ts` (still the `{}` stub — foundation/Slot A owns singleton wiring). Repo takes `PrismaClient` via constructor; integration test instantiates `new PrismaClient()` directly. Note: a `declare module 'fastify'` request-decoration augmentation for `req.sessionContext` will live **inside** `tickets.types.ts` (module-local, no core edit) — flagging in case PM prefers it elsewhere.

**Approach**
Hexagonal-light per ADR-0001: repository = Prisma direct (no port). Service consumes repo + takes an explicit `ctx: SessionContext { hotelId; userId; role: 'gm_admin'|'dept_head'|'super_admin'; deptId? }` as first arg on every method — the DEP-1 seam. Route reads `req.sessionContext` (populated later by T03/T04 middleware; typed via local module augmentation) and passes it down; until that middleware lands the live route is not AC-complete but service+repo are fully unit/integration testable by injecting `ctx` directly. **Tenant guard (D3):** repo always applies `where hotelId = ctx.hotelId`; `super_admin` is an explicit `if` branch that drops the hotel filter; `hotel_id` is never read from URL/body. **dept_head (D4):** service forces `departmentId = ctx.deptId` on list; on `:id`, a fetched ticket whose `departmentId !== ctx.deptId` → `NotFoundError` (404, anti-enumeration). **Cursor:** opaque base64 of `{ createdAt: ISO, id }`; keyset `WHERE (createdAt,id) < (c.createdAt,c.id)` with `ORDER BY createdAt DESC, id DESC`; fetch `limit+1` to compute `hasMore`; `limit` default 20 clamp ≤100; malformed cursor → `ValidationError` (400). **Filters:** all zod-parsed; CSV (`status`,`complaint_type`) split + each value enum-validated; `q` → Prisma `OR` over `ticket_number` + `guest.name` + `body` (insensitive `contains`); dates → `createdAt` gte/lte. **Masking (D5):** serializer applies `maskWaPhone()`/`maskEmail()` from `shared/utils`; predicate = `guest.privacy_mode==='vvip' && ctx.role!=='gm_admin'` (super_admin counts as gm_admin). Errors: `AppError` subclasses only (`ValidationError`,`NotFoundError`). **Tests:** unit targets extracted PURE functions (no Prisma mock — CLAUDE §8); integration seeds hotel/dept/guest/user/ticket/updates/messages in `hotel_core_dev` and asserts filters, cursor, ordering, tenant isolation, dept scope.

**Q-B-01 — response envelope proposal (for PM B ACK)**
Repo has a canonical envelope after all: `docs/spec/README.md` **§2.7** (pagination) + **§2.3** (error) + **§2.6** (ids/timestamps/enums). Proposing, evidence-backed:
- **List** `GET /api/tickets` → `{ "data": TicketListItem[], "pageInfo": { "nextCursor": string | null, "hasMore": boolean } }` (verbatim §2.7 shape; `cursor` is the request param name, `nextCursor` the response field).
- **Detail** `GET /api/tickets/:id` → `{ "data": TicketDetail }` (single-object `data` wrapper, no `pageInfo`).
- **Error** → `{ "error": { code, message, details } }` (§2.3) — already what `core/errors` `toJson()` emits; needs the error-handler plugin (DEP-2) to wrap it.
- **Casing tension (the actual Q-B-01):** the envelope wrapper is **camelCase** (`pageInfo`,`nextCursor`,`hasMore`) per §2.7, but the resource fields in §1.2 are **snake_case** (`ticket_number`,`wa_phone_masked`,`is_overdue`,`created_at`,`from_status`,`sent_at`,…). **My intent:** keep the wrapper camelCase (§2.7 canonical) and the resource body snake_case (§1.2 canonical) — i.e. serializer emits snake_case ticket fields inside a camelCase envelope. This matches both canonical sources without guessing. **Confirm** before I lock the serializer, since FE MSW (separate repo, absent) is the only tiebreaker.
- **Sub-clarification (D5):** the list field is literally named `wa_phone_masked`. Intent: list **always** returns `wa_phone_masked` = `maskWaPhone(waPhone)` (name implies always-masked in list context); the §4.5 compound predicate additionally governs `name`/`email` (and full phone in detail). Flag if FE expects raw `wa_phone` for gm_admin in the list.

**GAPs / dependencies (recorded, not silently worked around)**
- **DEP-1 (merge-blocking)** — SessionContext seam; T03/T04 (Slot A) not built. Defined locally in `tickets.types.ts`, injected in tests. Ties to open **Q-B-02** (is this a Slot-A shared type?). If PM wants it in `shared/types` now, say so — I'll otherwise keep it module-local and re-point the import when Slot A publishes.
- **DEP-2** — `api.ts` bootstrap + `core/prisma` singleton + error-handler plugin are stubs (foundation). T11 ships as plugin + factory; not wired to a live server. Not in my scope to edit.
- **DEP-3** — `hotel_core_dev` has no `users`/`hotels` rows; integration tests seed fixtures for FK parents; `assigned_to` name-join covered via seeded user rows.
- **GAP T11-#1 — Prisma client not generated + `make check` coupling.** `@prisma/client` is NOT generated on a fresh checkout and `core/prisma/prisma-client.ts:29` is a `{}` stub. `make check` (= lint+format+typecheck+test-unit) does **not** run `prisma-generate` as a prereq (only `make install`/`make start` do). Once my repo imports the generated `PrismaClient` type, `make check`/CI will fail typecheck unless `make prisma-generate` runs first. **My intent:** run `pnpm prisma:generate` locally before coding, import `PrismaClient` in the repo constructor, and note in SUBMIT that `make prisma-generate` must precede `make check` in CI. Please confirm this is acceptable (vs. some foundation-provided generated-client guarantee I'm unaware of). No `.md`/CI edits from me — this is a flag for PM/PO.

Awaiting PM B ACK (PLAN + Q-B-01 envelope proposal + GAP T11-#1). Not writing code before ACK.

#### PLAN ADDENDUM T11 — exec-B (Nathan) at H1 (2026-07-01) — T03 landed mid-PLAN, revising the seam
Slot A shipped **T03 tenant-guard** on `main` (commit `9b55b86`) while I was drafting. It provides exactly my DEP-1 seam as **shared, Slot-A-owned** code in `src/plugins/tenant-guard.ts` + `.types.ts`. Revising the PLAN to **consume it** instead of defining a local `SessionContext` (reuse-before-create, CLAUDE §4):
- **Seam type:** consume `TenantContext { hotelId; isSuperAdmin; role: 'gm_admin'|'dept_head'|'super_admin'|'staff'; deptId? }` from `@plugins/tenant-guard.js`. **Drop** my planned local `SessionContext` in `tickets.types.ts` and the local `declare module 'fastify'` augmentation — T03 already declares `req.tenant?: TenantContext` in `tenant-guard.types.ts`. My service methods take `ctx: TenantContext` as first arg.
- **Detail `:id` (D3/D4):** after repo fetches by id, call `assertHotelOwnership(ctx, row.hotelId, 'Ticket')` then `assertDeptOwnership(ctx, row.departmentId, 'Ticket')` — both already mask cross-tenant/cross-dept as `NotFoundError` (404) per spec §7, exactly matching D4. Direct reuse, no reimplementation.
- **List (D3/D4):** build `where` from ctx — `hotelId: ctx.hotelId` unless `ctx.isSuperAdmin` (explicit branch, drop filter); `departmentId: ctx.deptId` when `ctx.role==='dept_head'`. (The assert helpers are single-resource guards; list still builds the WHERE, consistent with them.)
- **Masking (D5):** predicate becomes `guest.privacy_mode==='vvip' && !(ctx.role==='gm_admin' || ctx.isSuperAdmin)` — super_admin counts as gm_admin via `isSuperAdmin`.
- **Q-B-02 → resolvable:** "is SessionContext Slot-A-owned or per-module?" answered by T03 — it is **Slot-A-owned** (`TenantContext` in `src/plugins/tenant-guard.ts`). Requesting PM B mark Q-B-02 resolved in §3 (PM authority; not editing the table myself).
- **DEP-1 narrows (still merge-blocking, smaller):** the seam TYPE + guards now EXIST and are consumable; what remains unbuilt is the **runtime population** of `req.tenant` — T03 shipped pure functions "not yet wired as a Fastify preHandler; wait for JWT plugin (T04+)". So the live route is still not AC-complete until T04 wires the preHandler, but service+repo consume `TenantContext` and are fully unit/integration testable by constructing it directly. No change to DEP-2/DEP-3 or GAP T11-#1.
- **New file count:** unchanged except `tickets.types.ts` no longer holds the seam (keeps domain + wire DTOs only).

Awaiting PM B ACK. Not writing code before ACK.

##### PM B ACK — T11 PLAN APPROVED, proceed to coding (2026-07-01, H12)
PLAN + addendum verified against the actual repo (trust-but-verify, not citation-trust). **ACK — create `feat/tickets-list-detail`, run `pnpm prisma:generate`, implement.** Resolutions on the three open items:

**① Q-B-01 envelope — RESOLVED from in-repo canonical spec (not a PO escalation).** You were right: `docs/spec/README.md` carries the canonical contract. I confirmed each line:
- **List** `{ data, pageInfo: { nextCursor, hasMore } }` — matches §2.7 **verbatim** (line 125; its example is literally `GET /api/tickets?limit=20&cursor=…`). ACK.
- **Detail** `{ data: TicketDetail }` — ACK. §2.7: "no `pageInfo` ⇒ single page"; single-object `data` wrapper is the consistent read.
- **Error** `{ error: { code, message, details } }` — matches §2.3 (canonical, every endpoint). Use the §2.3 codes (`VALIDATION_ERROR`, `NOT_FOUND`, `BUSINESS_RULE` 422) — these are what your `AppError.toJson()` must emit; wiring waits on the error-handler plugin (DEP-2), fine.
- **Casing tension — your reading is APPROVED as the working contract.** §2.6 mandates UUID/ISO-8601/lowercase-enums but imposes **no** global field-casing rule, so there is no contradiction: **camelCase envelope wrapper (§2.7) + snake_case resource fields (§1.2)**. Ratified. Because you isolated all wire-shaping in `tickets.serializer.ts`, if the FE MSW handlers (the ultimate tiebreaker, separate repo) ever diverge, it's a **single-file** change — good design, that's precisely why I'm comfortable ratifying now rather than blocking on the absent FE repo.
- **`wa_phone_masked` sub-clarification — APPROVED.** List always emits `wa_phone_masked = maskWaPhone(...)` (the field name is definitional; §1.2 list shape exposes no raw-phone field). The §4.5 compound predicate governs `name`/`email` (+ any fuller phone in detail). Provisional on FE MSW; serializer-isolated.

**② Q-B-02 — RESOLVED. `TenantContext` is Slot-A-owned** (`src/plugins/tenant-guard.ts:22`, confirmed: `{ hotelId: string; isSuperAdmin; role: SessionRole; deptId? }` + `assertHotelOwnership`/`assertDeptOwnership` both mask cross-tenant/cross-dept as `NotFoundError` 404 per §7). **Consume it — do NOT define a local `SessionContext`.** Your addendum's reuse-before-create call is correct (CLAUDE §4). Marked resolved in §3. One confirmation: T03 already declares the `req.tenant` Fastify augmentation in `tenant-guard.types.ts` — so **do not** add a second `declare module 'fastify'` (duplicate augmentation = TS merge you don't want). You already noted dropping it; confirmed correct.

**③ GAP T11-#1 (prisma-generate ⇄ `make check`) — VERIFIED REAL; split into two.**
- **Local, for you (ACK, not blocking):** `prisma-client.ts:29` is a `{} as unknown` placeholder and `Makefile:148 check:` has no `prisma-generate` prereq — confirmed. Running `pnpm prisma:generate` before coding is safe (writes gitignored `node_modules/.prisma`, no tracked-file overwrite). Import the generated `PrismaClient` in the repo constructor. Proceed.
- **CI coupling (foundation / cross-dev — I'm escalating, NOT you):** once T11 (and every B/C task) imports the generated client, CI `make check` fails unless generate runs first. That's a foundation gap affecting >1 dev → I've raised it to Parent PM (PARENT §3b + §10) for Slot A to add `prisma-generate` as a prereq of `check` (or CI to run `make install` first). **Do not edit `Makefile`/CI yourself** — out of T11 scope. In SUBMIT, just state the CI ordering requirement; I'll run `pnpm prisma:generate` before my own `make check` rerun so your gate isn't falsely red on my side.

**Advisory nudges (catch-early, NOT blocking — no re-ACK needed):**
- **N1 — keyset cursor:** Prisma has no row-value tuple `<`. Implement `(createdAt, id) < (c.createdAt, c.id)` as the OR-decomposition: `OR: [{ createdAt: { lt: c.createdAt } }, { createdAt: c.createdAt, id: { lt: c.id } }]` with `orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]`, fetch `limit+1` for `hasMore`. Keep the `q`-search `OR` and the cursor `OR` in **separate** `AND` arms so they don't collapse into one `OR` (correctness trap).
- **N2 — dept_head guard:** if `role === 'dept_head'` but `deptId` is undefined, do not let `departmentId: undefined` silently drop the filter (tenant leak). Treat missing `deptId` for a dept_head as empty-result or `AuthError` — assert it explicitly.
- **N3 — endpoint-level RBAC (gm_admin/dept_head only) is T04's job**, not yours. `TenantContext.role` can be `'staff'`; your service correctly scopes data, but do not hand-roll the "who may hit this route" gate — leave the route consuming `req.tenant` and let T04's RBAC preHandler reject `staff`. Note this seam in SUBMIT.

**At SUBMIT I will verify:** all 10 DoD, drift scans (§3 Step 2) on changed files, `pnpm prisma:generate && make check` green on my rerun, integration test against `hotel_core_dev`, ≥80% line coverage on changed files, envelope+casing conformance to the ratified contract above. T11 remains **not-mergeable-to-main** until T04 wires the `req.tenant` preHandler (DEP-1 runtime) — that's a merge gate for PO, not an approval blocker for your service+repo layer.

Proceed. 🟢

### GAP T11-#2 — exec-B (Nathan) at H1 (2026-07-01) — user-name/role fields unresolvable in dev (proceeding with A)
- **Gap**: D1 requires `assigned_to` = staff name joined from `users`; the `:id` `updates[]` shape requires `actor_name` + `actor_role`. But HC's Prisma `User` model is **id-only** (`prisma/schema.prisma:65` — no `name`/`role`; Auth owns those), and the T02 dev migration (`20260701111952_init_hotel_core/migration.sql:9`) creates `users` as `(id UUID PK)` only. So in `hotel_core_dev` these three fields **cannot be resolved from the DB** — not via Prisma (unmodeled) nor raw SQL (columns absent). DEP-3's "cover via fixture user rows" gives IDs but no names (no column to seed).
- **Doc reference**: DoD D1 + §1.2 updates shape vs `prisma/schema.prisma:65` (User stub) + MVP §3 (assumes Auth users exist in shared DB) + DEP-3.
- **Options**: **A)** Ship the three fields **present but nullable**, resolved via an isolated seam in `tickets.serializer.ts` (a `userDirectory: Map<id,{name,role}>` param the service passes; empty in dev → fields serialize `null`). Prod wires the map from Auth cross-join/RPC later — **one-spot change**, no shape churn. **B)** Slot A extends HC `User` model + dev migration to map Auth `users.name`/`role` read-only (cross-slot, foundation, needs PO). **C)** Add an Auth user-lookup RPC port now (Auth service not up for HC lookups in MVP → out of scope per MVP §2).
- **My intent**: **A** — consistent with DEP-3's accepted dev limitation and the serializer-isolation PM ratified for Q-B-01. **Proceeding with A now** (resolution point isolated; a later B/C decision changes only the serializer wiring). Flagging for the record — redirect me if you prefer B/C before SUBMIT.

### GAP T11-#3 — exec-B (Nathan) at H1 (2026-07-01) — `test:unit` collects integration files + global test harness is a stub (non-blocking, self-worked-around)
- **Gap**: `package.json` `test:unit` pattern `__tests__/.*\.test\.ts` also matches `*.integration.test.ts` (integration pattern is a strict subset — no filename can separate them). So `make check`'s unit step pulls integration tests. Separately, `src/shared/utils/test-setup.ts` (the blessed global testcontainers harness per TESTING.md §5) is still a TODO stub.
- **Doc reference**: `package.json:25-26`, `jest.config.ts` testMatch, `docs/TESTING.md §5`, `src/shared/utils/test-setup.ts`.
- **Self-workaround (no wait)**: my integration test is **self-contained** — it spins its own `PostgreSqlContainer`, runs `prisma migrate deploy`, seeds, and disposes, with no dependency on the stubbed global harness and no `.skip` (drift-clean). Consequence: it also runs under `make check`/`test:unit`, so **`make check` now requires Docker** (~10s container spin). That's consistent with this repo already mandating Docker (docker-compose PG/Redis).
- **Recommend (foundation, Slot A)**: add `testPathIgnorePatterns: ['\\.integration\\.test\\.ts$']` to `test:unit` (or implement the global `test-setup.ts` harness) so `make check` stays fast + Docker-free. Non-blocking for T11; flagging so PM can route to Slot A / Parent.

### SUBMIT T11 — exec-B (Nathan) at H1 (2026-07-01) (attempt 1)

Task: Tickets list + detail — `GET /api/tickets` (filters + cursor) + `GET /api/tickets/:id`
Branch: **`feat/tickets-list-detail`** (pushed; commit `550e9ef`) — **PO merges to main manually**. Code is NOT on main.
Files changed: 10 new (0 modified outside the module — no `api.ts`/`prisma`/`core` edits)
  - src/modules/tickets/tickets.types.ts (wire DTOs, Prisma row types, seam consumption)
  - src/modules/tickets/tickets.schema.ts (zod query/param + cursor codec)
  - src/modules/tickets/tickets.serializer.ts (PII masking §4.5 + snake_case shaping — D5)
  - src/modules/tickets/tickets.repository.ts (Prisma direct — ADR-0001)
  - src/modules/tickets/tickets.service.ts (buildTicketWhere + scope/cursor orchestration)
  - src/modules/tickets/tickets.routes.ts (Fastify plugin, service via options)
  - src/modules/tickets/index.ts (barrel: ticketsRoutes + buildTicketsService factory)
  - src/modules/tickets/__tests__/tickets.service.test.ts (26 unit)
  - src/modules/tickets/__tests__/tickets.routes.test.ts (4 component via `app.inject`)
  - src/modules/tickets/__tests__/tickets.repository.integration.test.ts (11 integration, testcontainers)

DoD self-check
- [x] **D1** — list returns §1.2 field set incl. `wa_phone_masked`, `is_overdue`, `is_high_alert`, `priority`, `complaint_type`, `assigned_to`. All 11 filters zod-validated; `limit` clamped ≤100; invalid `cursor` → 400. (`assigned_to` = null in dev per GAP T11-#2 seam.)
- [x] **D2** — detail returns ticket + `updates[]` (created_at asc) + `messages[]` (sent_at asc); missing → `NotFoundError` (404). Integration-verified ordering.
- [x] **D3** — tenant guard: every list query `WHERE hotelId = ctx.hotelId`; super_admin is an explicit `!isSuperAdmin` branch; detail uses T03 `assertHotelOwnership`. `hotel_id` never read from URL/body. Integration: cross-tenant `:id` → 404.
- [x] **D4** — dept_head list auto-filtered to `ctx.deptId` (N2: missing deptId → `AuthError`, not a dropped filter); cross-dept `:id` → 404 via T03 `assertDeptOwnership`. Integration-verified.
- [x] **D5** — PII masking at serializer layer; predicate `privacy_mode='vvip' && !(gm_admin||super_admin)`; `maskWaPhone`/`maskEmail` from `@shared/utils` + module-local `maskName`. Unit + integration verified (dept_head masked, gm_admin clear).
- [x] **D6** — only `AppError` subclasses thrown (`ValidationError`/`NotFoundError`/`AuthError`); 0 `throw new Error`. Error envelope = `README.md §2.3` via `toJson()`.
- [x] **D7** — `req.log.info` per request with `correlationId` (`x-correlation-id` header ?? `req.id`) + `module`/`action`; no PII logged.
- [x] **D8** — module layout per template + a `tickets.serializer.ts` (D5 serializer layer, flagged in PLAN); barrel exports no repository/serializer. No cross-module internal imports.
- [x] **D9** — unit on branching (filter build, dept scope, mask predicate, cursor codec, super_admin bypass) with no Prisma mock; integration on repo/service vs real PG (testcontainers) with seeded hotel/dept/guest/user/ticket/updates/messages. **Changed-file line coverage 95.85%** (repo 100 / routes 95.65 / schema 90.74 / serializer 100 / service 98.41 / types 100). Naming `it('should … when …')`.
- [x] **D10** — `make check` green; no `any`/`console.log`/default-export/`.skip`; explicit return types on public fns. `make test-integration` green (testcontainers, 11 tests).

Quality gate
- `make check`: **PASS** (lint + format-check + typecheck + test-unit = 55 passed, 2 skipped = template placeholders)
- `make test-integration`: **PASS** (11 tests, ~16s incl. container)
- ⚠ CI ordering (per PM ACK of GAP T11-#1): `make prisma-generate` MUST run before `make check`/`make test-*` on a fresh checkout (I ran `pnpm prisma:generate` locally). Foundation escalation PARENT §3b tracks the permanent fix.

Drift scans (scoped to src/modules/tickets)
- `any`: 0 · `console.*`: 0 · `throw new Error(`: 0 · forbidden imports (express/typeorm/moment/node-fetch): 0 · default export: 0 · `.skip` in tests: 0

Security check
- Tenant/dept scope enforced on every query (D3/D4); cross-boundary masked as 404 (anti-enumeration, spec §7). PII masked at serializer (D5). No secrets/tokens; no PII in logs. HMAC/crypto: N/A (read-only, no webhook).

Test evidence
- Unit/component: 30 (service 26 + routes 4), `__tests__/tickets.service.test.ts`, `__tests__/tickets.routes.test.ts`
- Integration: 11, `__tests__/tickets.repository.integration.test.ts` (real PG, cursor paging, ordering, tenant/dept isolation, vvip masking, 404 masking)
- Sample list envelope (from route inject, ratified Q-B-01 shape):
  ```json
  { "data": [ { "id": "…", "ticket_number": "HSK-2606-048", "wa_phone_masked": "+628******7890",
      "guest_name": "…", "assigned_to": null, "is_overdue": false, "is_high_alert": false,
      "priority": "normal", "complaint_type": null, "status": "open", "created_at": "…" } ],
    "pageInfo": { "nextCursor": null, "hasMore": false } }
  ```

Notes / open items for PM
- **DEP-1 merge gate stands**: routes answer 401 until T04 wires the `req.tenant` preHandler. Service+repo+serializer are complete + tested by injecting `TenantContext` directly. Not mergeable to main until T04 (PO merge gate, not an approval blocker for this layer).
- **GAP T11-#2**: shipped with approach **A** (fields present, null-in-dev via serializer `userDirectory` seam). Confirm A is acceptable, or redirect to B/C.
- **GAP T11-#3**: `make check` now requires Docker due to the `test:unit` pattern; recommend Slot A add `testPathIgnorePatterns`. Non-blocking.
- **DEP-2 unchanged**: no `api.ts`/singleton edits; bootstrap wires via `buildTicketsService(db, { resolveUsers })` + `fastify.register(ticketsRoutes, { prefix: '/api', service })`.

Requesting PM B VERDICT.

##### VERDICT T11 — APPROVED (attempt 1) by PM B (2026-07-01, H12)
Verified by **my own rerun** on `feat/tickets-list-detail` @ `550e9ef` (not trust-of-claim). Checked out the branch, `pnpm prisma:generate`, then reran every gate + read the actual source.

**Quality gates (PM rerun):**
- `make check` → **PASS**: lint 0 / format clean / typecheck clean / **55 passed + 2 skipped**. The 2 skips are `_template/*` reference placeholders (`_template.service.test.ts:17`, `_template.repository.integration.test.ts:6`) — **T11's branch has 0 `.skip`**. Confirmed baseline, not introduced here.
- `make test-integration` → **PASS**: 11 tests, real Postgres via testcontainers (~8s).
- **Coverage (PM rerun)** — lines 96% overall; per changed file: repository 100 / serializer 100 / types 100 / service 98.41 / routes 95.65 / schema 90.74. **Every changed file ≥80% line ✓ D9** (claim 95.85% confirmed).
- **Drift scans** (src/modules/tickets): `any` 0 · `console.*` 0 · `throw new Error(` 0 · default export 0 · `.skip` 0 · forbidden imports 0 · cross-module internal import 0. Clean.
- **File inventory**: 10 new files, **all** in `src/modules/tickets/`, 0 outside (no `api.ts`/`prisma`/`core` edits). Matches PLAN.

**DoD spot-verified in code (not just checkboxes):**
- D1 ✓ 11 filters `schema.ts:54-79`; `limit` clamp ≤100 `schema.ts:71-77`; invalid cursor→400 `schema.ts:94-107`.
- D2 ✓ detail ordering updates asc / messages asc `repository.ts:13-14`; missing→`NotFoundError` `service.ts:129-131`.
- D3 ✓ explicit super_admin branch `service.ts:42-44`; detail `assertHotelOwnership` `service.ts:132`; `hotel_id` never from URL/body.
- D4 ✓ dept_head filter + **N2** `AuthError` on missing deptId `service.ts:46-51`; cross-dept `:id`→404 via `assertDeptOwnership` `service.ts:133`.
- D5 ✓ masking at serializer layer; predicate `privacyMode==='vvip' && !(isSuperAdmin||gm_admin)` `serializer.ts:16-19`; `wa_phone_masked` always-masked in list (ratified), email/name compound.
- D6 ✓ only `AppError` subclasses. D7 ✓ correlationId (`x-correlation-id` ?? `req.id`) + module/action, no PII `routes.ts:26-56`. D8 ✓ template layout + barrel hides repo/serializer.
- D10 ✓ **N1** keyset as OR-decomposition in a **separate** AND arm `service.ts:83-98`; `orderBy [createdAt desc, id desc]` `repository.ts:24` — cursor correctness confirmed.
- **Envelope**: list `{data,pageInfo:{nextCursor,hasMore}}` + detail `{data}` + snake_case body — matches ratified **Q-B-01** ✓.

**GAP rulings:**
- **GAP T11-#2 → approach A APPROVED.** `userDirectory` seam (`service.ts:142-152` + serializer `resolveUserName`) is serializer-isolated; `assigned_to`/`actor_name`/`actor_role` serialize `null` in dev, resolve via the `resolveUsers` dep in prod — one-spot change, no shape churn. **Follow-up obligation logged** (does NOT block T11): when the shared DB is restored OR an Auth user-resolution RPC lands, wire `resolveUsers`. Tracked as a future integration note against Slot B (I'll surface it when tier/shared-DB work is scheduled).
- **GAP T11-#3 → non-blocking; ESCALATED to Parent PM (foundation/Slot A).** `test:unit` glob collects `*.integration.test.ts`, so `make check` now needs Docker. Self-workaround accepted (self-contained testcontainers, 0 `.skip`). Recommend Slot A add `testPathIgnorePatterns: ['\\.integration\\.test\\.ts$']` to `test:unit`. Routed to PARENT §3b.

**Merge status (for PO):**
- **CODE APPROVED** on `feat/tickets-list-detail` @ `550e9ef`. PM verdict = APPROVE, attempt 1, zero rejects.
- Two **runtime/CI gates** remain (NOT code-quality blockers): (a) **T04** (Slot A) must wire the `req.tenant` preHandler for the live route — until then routes answer 401, which is the correct pre-auth behavior; (b) CI must run `make prisma-generate` before `make check` (GAP T11-#1, escalated).
- **→ PO action: merge `feat/tickets-list-detail` when ready.** Live traffic works once T04 lands. Service/repo/serializer are complete and fully tested by injecting `TenantContext`.
- → §1 tracker updated (approved); PARENT §1 T11 → approved; roll-up posted PARENT §2.

Excellent work, clean first-pass. **T11 closed.** Next assignment (T13) issued below. 🟢

---

### ASSIGNMENT T13 — Ticket stats + overdue — issued by PM B (Nathan) 2026-07-01 (H12)
- Branch: `feat/tickets-stats-overdue` (exec-B creates; **code stays on branch — PO merges to main**, per PO directive)
- Routed from: PARENT §1 T13 (Slot B) = MVP-HOTEL-CORE-FIRST §1.2 **B3**
- Spec authority: `docs/spec/02-hotel-core.md §1.2` (endpoints table rows `GET /api/tickets/stats`, `GET /api/tickets/overdue`) + §2.4 DDL + §1.2 dashboard refs (lines ~323-324); envelope per ratified **Q-B-01** (`README §2.7`/§2.3)
- Dependency: **T11 APPROVED** ✓ (this task extends the same `tickets` module — reuse repo/serializer/schema/seam, do NOT fork a new module).

**Scope (read-only, dashboard KPI)**
- `GET /api/tickets/stats` — counts by status (dashboard KPI cards). Roles `gm_admin`, `dept_head`. Return per-status counts across the ticket status enum (`open`/`in_progress`/`awaiting_late_reason`/`done_pending`/`closed`/`high_alert`/`escalated`/`cancelled`) + any dashboard aggregates the spec/FE MSW shape requires (e.g. totals, overdue count, high-alert count — confirm exact keys against `02-hotel-core.md` §1.2 + FE MSW; propose shape in PLAN if underspecified → Q-B-03).
- `GET /api/tickets/overdue` — list of tickets over SLA. Same list-item shape + serializer as T11 (`is_overdue`/`sla_due_at`), ordered by `sla_due_at` (oldest-breach first). Decide in PLAN: cursor-paginated (reuse T11 codec) vs bounded top-N — match FE MSW; state which.

**DoD (PM B verifies at SUBMIT)**
- [ ] E1 — `GET /api/tickets/stats` returns status-count map + dashboard aggregates per confirmed shape; single query or grouped aggregate (`groupBy`), not N per-status round-trips.
- [ ] E2 — `GET /api/tickets/overdue` returns overdue tickets (reusing T11 list-item serializer), correct ordering; pagination decision stated + implemented.
- [ ] E3 — **Tenant guard**: both scoped `WHERE hotelId = ctx.hotelId` (super_admin explicit bypass); **dept_head** stats + overdue auto-filtered to `ctx.deptId` (reuse the T11 `buildTicketWhere` scope logic — do NOT reimplement). `hotel_id` never from URL/body.
- [ ] E4 — **Route ordering trap**: `/tickets/stats` and `/tickets/overdue` are static segments that MUST be registered so they never get captured by `/tickets/:id` (the T11 param route). Verify a request to `/tickets/stats` does not hit the `:id` handler (Fastify's radix router handles static-before-param, but assert it in a route test — this is the classic collision).
- [ ] E5 — PII masking reused from T11 serializer (overdue list). Errors via `AppError`. Structured logging + correlationId (D7 pattern).
- [ ] E6 — No cross-module import; barrel unchanged public surface; layout consistent with the existing `tickets` module.
- [ ] E7 — Tests: unit on stats aggregation shaping + overdue scope/ordering + the `/stats`-vs-`/:id` route-collision test; integration against `hotel_core_dev` (seed tickets across statuses + past-SLA rows). Line coverage ≥80% changed files. `make check` + `make test-integration` green.

**Notes / seams (carry forward from T11)**
- Consume T03 `TenantContext`; still merge-gated on T04 preHandler (DEP-1) + `make prisma-generate` before CI (GAP T11-#1). Same posture as T11 — buildable + fully testable now.
- If the exact stats response shape isn't pinned by `02-hotel-core.md` §1.2 / FE MSW, **raise Q-B-03 and propose it in PLAN** for my ACK (same playbook as Q-B-01 — do not guess silently).

**Session-start gate** (EXECUTOR-PROTOCOL §2): confirm identity, re-read `02-hotel-core.md §1.2`, `make typecheck`/`make lint` clean, state any scaffolder command. Then post PLAN. **Do not code before PM B ACK.**

Awaiting exec-B PLAN for T13.

### ASSIGNMENT T13 — claimed by exec-B (Nathan) at H1 (2026-07-01)
- Branch: `feat/tickets-stats-overdue` (exec-B creates on ACK; code stays on branch, PO merges)
- Routed from: PARENT §1 T13 (Slot B) = MVP-HOTEL-CORE-FIRST §1.2 B3
- Claiming the PM-B-issued ASSIGNMENT above. PLAN below.

#### PLAN T13 — exec-B (Nathan) at H1 (2026-07-01)

**Scope recap**
Two read-only dashboard-KPI endpoints, **extending the existing `tickets` module** (no new module): `GET /api/tickets/stats` (status-count map + aggregates) and `GET /api/tickets/overdue` (over-SLA list, reusing the T11 list-item serializer). Reuse T11 scope logic, serializer, envelope, and error/logging patterns.

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity confirmed: Executor, Slot B (Nathan) ✓
- CLAUDE.md loaded ✓
- Task spec re-read: `02-hotel-core.md §1.2` (stats/overdue rows + §1.11 dashboard refs L323-324) + §2.4 DDL (`is_overdue`/`sla_due_at` + `idx_tickets_overdue` L477) + `MVP §1.2 B3`; envelope `docs/spec/README.md §2.7/§2.3` ✓
- Dependency: **T11 APPROVED + merged to main** ✓ (module present on `main`); T04 **APPROVED** (Slot A) — runtime `req.tenant` wiring lands when merged (same DEP-1 posture).
- `pnpm typecheck` clean ✓ ; `pnpm lint` clean ✓ (on `main`, after `pnpm install` + `pnpm prisma:generate` already done this session).
- Scaffolder risk: **none** (no new deps, no scaffolder; `prisma generate` already run).

**Files to modify** (all within `src/modules/tickets/` — extend, don't fork)
- `tickets.service.ts` — extract `buildScopeArms(ctx)` from `buildTicketWhere` (pure refactor; T11 tests stay green), reuse it in new `buildOverdueWhere(ctx, now)`; add `stats(ctx, now?)` + `overdue(ctx, rawQuery, now?)`.
- `tickets.repository.ts` — add `groupCountByStatus(where)` (**single `groupBy`**), `countWhere(where)`, `findOverdue(where, take)`.
- `tickets.serializer.ts` — add `serializeStats(...)` (zero-fill 8-status map); overdue items reuse `serializeTicketListItem`.
- `tickets.schema.ts` — add `parseOverdueQuery` (limit clamp, reuse pattern); stats takes no query.
- `tickets.types.ts` — add `TicketStatsWire` / `TicketStatsResponse` / `OverdueListResponse`.
- `tickets.routes.ts` — add `GET /tickets/stats` + `GET /tickets/overdue`.
- `index.ts` — export new response types.

**Files to create**
- `__tests__/tickets.stats.test.ts` — unit: stats aggregation shaping + zero-fill, overdue scope/order, **`/stats`-vs-`/:id` route-collision** test.
- extend `__tests__/tickets.repository.integration.test.ts` — seed tickets across all statuses + past/future `sla_due_at`; assert group counts, overdue predicate + ordering, dept scope.

**Approach**
- **Reuse (E3)**: refactor the tenant+dept scope arms of `buildTicketWhere` into `buildScopeArms(ctx)` (keeps the explicit super_admin bypass + N2 `AuthError` on dept_head-without-deptId). `buildTicketWhere`, stats, and overdue all consume it — one scope implementation.
- **stats (E1)**: `repo.groupCountByStatus(scopeWhere)` = one `groupBy({ by:['status'], _count })`; serializer zero-fills all 8 enum keys. `overdue` + `high_alert` totals = two cheap `count()` aggregates (3 queries total, **never N-per-status**). `total` = sum of the groupBy.
- **overdue predicate (my intent — confirm)**: `sla_due_at IS NOT NULL AND sla_due_at < :now AND status NOT IN ('closed','cancelled')` — computed, robust even though the `is_overdue` denormalized flag's worker isn't in the MVP. Same predicate drives both the `/overdue` list and the stats `overdue` count (consistency). `now` is injected (service arg, defaults to `new Date()`) for deterministic tests.
- **overdue list (E2)**: **bounded top-N** — `limit` (default 20, max 100), `ORDER BY sla_due_at ASC` (oldest breach first), reuse `serializeTicketListItem`. Envelope `{ data, pageInfo: { nextCursor: null, hasMore } }` (`hasMore` = truncated at limit). Chosen over cursor because it's a dashboard card; **if FE MSW expects cursor pagination I'll generalize the T11 codec to a `sla_due_at` keyset** — flagging, not guessing.
- **route collision (E4)**: register `/tickets/stats` + `/tickets/overdue` as static routes; Fastify's radix router matches static-before-param, but I'll **assert** it (a `/tickets/stats` request hits the stats handler, not `/:id`→400-uuid) in the route test.
- **carry-forward**: consume T03 `TenantContext`; masking/logging/error patterns identical to T11; still merge-gated on T04 preHandler + `make prisma-generate`-before-CI (GAP T11-#1). Buildable + fully testable now by injecting `ctx`.

**GAP / open question**
- **Q-B-03 (contract) — stats response shape.** `02-hotel-core.md §1.2` only says "Counts by status (dashboard KPI)"; no JSON is pinned (confirmed: 0 shape hits across `docs/spec/*`). Source of truth = FE MSW (`src/mocks/handlers/tickets.handlers.ts`, separate repo, absent). **Proposing** (single-object `{ data }` per ratified Q-B-01):
  ```json
  { "data": {
      "by_status": { "open": 0, "in_progress": 0, "awaiting_late_reason": 0,
        "done_pending": 0, "closed": 0, "high_alert": 0, "escalated": 0, "cancelled": 0 },
      "total": 0, "overdue": 0, "high_alert": 0 } }
  ```
  Note the deliberate distinction: `by_status.high_alert` = tickets whose **status** is `high_alert`; top-level `high_alert` = tickets with the **`is_high_alert` flag** true (different concept). If that dual naming risks FE confusion, I'll rename the top-level flag count to `high_alert_flagged` — PM's call. **Until ACK**: build against this proposal; do not guess further.

Awaiting PM B ACK (PLAN + Q-B-03 shape + overdue-predicate/top-N decisions). Not coding before ACK.

##### PM B ACK — T13 PLAN APPROVED with 1 required addition (2026-07-01, H12)
Verified against spec + merged T11 code. **ACK — create `feat/tickets-stats-overdue`, implement.** Rulings:

**① Q-B-03 stats shape — RATIFIED provisionally (in-repo spec confirms it's unpinned; FE MSW = tiebreaker).** I checked: `02-hotel-core.md §1.2` + §1.11 (L319-330) only say "Counts by status (dashboard KPI)" — 0 shape hits, your report is accurate. Approved structure, with the naming collision resolved:
```json
{ "data": {
    "by_status": { "open":0,"in_progress":0,"awaiting_late_reason":0,"done_pending":0,"closed":0,"high_alert":0,"escalated":0,"cancelled":0 },
    "total": 0, "overdue": 0, "high_alert_count": 0 } }
```
- **Naming decision (mine):** top-level flag count = **`high_alert_count`** (NOT `high_alert` — collides with `by_status.high_alert`; NOT your `high_alert_flagged` — invented). `by_status.high_alert` = tickets whose **status** = `high_alert`; `high_alert_count` = tickets with the **`is_high_alert` flag** true. Two different populations, now unambiguous. `total` = sum of `by_status`; `overdue` = computed-overdue count (see ②). snake_case, consistent with the ratified resource-body convention.
- **Provisional** on FE MSW (`tickets.handlers.ts`, absent repo). Serializer-isolated → one-file change if FE differs. Registered §3 Q-B-03; noted to Parent §3a. **No PO action needed** unless FE MSW diverges.

**② Overdue predicate — ACK, but ONE REQUIRED ADDITION (coherence).** Your computed predicate `sla_due_at IS NOT NULL AND sla_due_at < :now AND status NOT IN ('closed','cancelled')` shared by `/overdue` list + stats count is correct (the `is_overdue` worker isn't in MVP). **But you missed a coherence gap I verified in the merged T11 code:** `tickets.serializer.ts:55` emits `is_overdue: row.isOverdue` — the **dormant column** (default false, no worker sets it). So a ticket in your computed `/overdue` list would serialize `is_overdue: false`, and T11's `is_overdue=true` list filter (also reading the column) returns nothing. FE sees a contradiction.
   - **REQUIRED**: make **one** `isOverdue(row, now)` helper the single source of truth, used in **all four** spots: (a) the serializer's `is_overdue` field (compute, don't read `row.isOverdue`), (b) the `/overdue` filter, (c) the stats `overdue` count, (d) **T11's `is_overdue` query filter** in `buildTicketWhere` (route it through the same predicate). This is *more reuse, not more code* — you're already writing the predicate.
   - Inject `now` (service arg default `new Date()`) — no scattered `new Date()` (keeps tests deterministic, keeps the serializer pure).
   - This edits merged T11 code within the same module on your branch — **legitimate**, but T11's existing unit + integration tests MUST stay green (update any assertion that expected the dormant column value). I will re-verify T11's endpoints for regression at SUBMIT.
   - Forward-compat note: when the overdue worker lands later it just maintains the column to match this predicate — computing-at-read now is not throwaway.

**③ Overdue pagination — ACK bounded top-N.** `limit` default 20 / max 100, `sla_due_at ASC`, reuse `serializeTicketListItem`, `{ data, pageInfo:{ nextCursor:null, hasMore } }`. **Requirement**: stats `overdue` must be the **true unbounded count** (not capped at the top-N) so the KPI card is accurate even when the list truncates — your `count()` approach already does this, just don't let the two share a LIMIT. If FE MSW needs cursor paging, generalize the T11 codec to an `sla_due_at` keyset then — your call to defer is correct.

**④ `buildScopeArms(ctx)` extraction — ACK.** Good reuse (keeps super_admin bypass + N2 AuthError). T11 tests stay green (regression).
**⑤ Route-collision `/stats` vs `/:id` — ACK.** Assert it in the route test (the classic radix trap). Required, not optional.
**⑥ Single `groupBy` for status + 2 `count()` — ACK.** 3 queries total, never N-per-status.

**Runtime gate update (good news):** T04 (RBAC) is now **APPROVED** (Slot A, `feat/foundation-rbac` @ `df5648b`, awaiting PO merge) — it ships `configureTenantGuardHooks(app)` + `rbac.ts`, so the `req.tenant` seam is fully built, not just stubbed. T11+T13 go live once (a) T04 merges AND (b) someone wires `configureTenantGuardHooks(app)` + `register(ticketsRoutes)` in the `api.ts` bootstrap — which is **still a stub (DEP-2, foundation)**. That bootstrap wiring is the true go-live step; I'm flagging it to Parent as the remaining integration item — **not T13 scope**, don't touch `api.ts`.

**At SUBMIT I will verify:** E1–E7, the ② coherence requirement across all 4 spots, **T11 regression** (rerun its tests + spot the merged serializer/filter change), `pnpm prisma:generate && make check` + integration green on my rerun, ≥80% line coverage on changed files, route-collision test present, stats shape = ratified above. Same merge posture as T11.

Proceed. 🟢

### SUBMIT T13 — exec-B (Nathan) at H1 (2026-07-01) (attempt 1)

Task: Ticket stats + overdue — `GET /api/tickets/stats` + `GET /api/tickets/overdue`
Branch: **`feat/tickets-stats-overdue`** (pushed; commit `3a6af90`) — **PO merges to main manually**. Code NOT on main.
Files changed: 12 (1 new source + 1 new test + 10 modified, **all** in `src/modules/tickets/`; 0 outside — no `api.ts`/`prisma`/`core` edits)
  - **new** `tickets.overdue.ts` — SSOT for overdue (row predicate + WHERE forms)
  - **new** `__tests__/tickets.stats.test.ts` — unit (isOverdue, WHERE builders, scope, serializeStats, service stats/overdue)
  - mod `tickets.service.ts` (buildScopeArms extraction + buildOverdueWhere + stats/overdue + is_overdue filter re-route + now threading), `tickets.repository.ts` (groupCountByStatus/countWhere/findOverdue), `tickets.serializer.ts` (serializeStats + is_overdue computed via SSOT), `tickets.schema.ts` (parseOverdueQuery + shared limit), `tickets.types.ts` (stats/overdue types), `tickets.routes.ts` (2 static routes), `index.ts` (exports)
  - mod 3 test files (route-collision, T11 is_overdue-filter regression fix, integration stats/overdue + SSOT-coherence)

DoD self-check
- [x] **E1** — `/stats` returns `{ data: { by_status{8 zero-filled}, total, overdue, high_alert_count } }` (ratified Q-B-03). One `groupBy` for status counts + 2 `count()` aggregates (overdue, high-alert) — **never N-per-status**.
- [x] **E2** — `/overdue` returns overdue tickets via the **T11 list-item serializer**, `ORDER BY sla_due_at ASC`; **top-N** pagination (`limit` ≤100, `pageInfo.hasMore`, `nextCursor: null`) — decision stated in PLAN + implemented.
- [x] **E3** — both scoped via the **extracted `buildScopeArms(ctx)`** (one scope impl, explicit super_admin bypass, N2 dept_head-missing-deptId → `AuthError`); dept_head stats+overdue auto-filtered to `ctx.deptId`. `hotel_id` never from URL/body. Integration-verified (dept_head stats total 5 / overdue 2).
- [x] **E4** — `/tickets/stats` + `/tickets/overdue` registered as static routes; **route-collision test** asserts each hits its handler (not `/:id`→400-uuid). `tickets.routes.test.ts`.
- [x] **E5** — overdue list reuses T11 serializer (PII masking intact); errors `AppError` only; `req.log` + correlationId (D7 pattern) on both routes.
- [x] **E6** — no cross-module import; barrel adds only new response types; layout consistent (extended `tickets` module, no fork).
- [x] **E7** — unit (stats shaping/zero-fill, overdue scope+order, `/stats`-vs-`/:id` collision) + integration vs `hotel_core_dev`-shaped PG (statuses spread + past/future SLA + terminal-status exclusion). **Changed-file line coverage 96.58%** (overdue 100 / repo 100 / service 98.8 / serializer 100 / routes 96.96 / schema 90.16 / types 100). `make check` + `make test-integration` green.

**② REQUIRED coherence fix — done.** New `tickets.overdue.ts` `isOverdue(row, now)` is the single source of truth, used in **4 spots**: (1) serializer `is_overdue` field (`serializer.ts` → computed, no longer reads the dormant column), (2) `/overdue` list filter (`buildOverdueWhere`), (3) stats `overdue` count (`countWhere(buildOverdueWhere)`), (4) T11 `is_overdue` filter in `buildTicketWhere` (now `overdueWhere`/`notOverdueWhere`, not `{ isOverdue: value }`). The row predicate + Prisma WHERE forms are co-located and **asserted equal against a real DB** by the integration test "should agree with the isOverdue row predicate (SSOT coherence)". Net: FE no longer sees `is_overdue:false` on a ticket that's in `/overdue`, and `?is_overdue=true` on the T11 list now returns the same set.

**T11 regression** — all T11 tests green after the serializer/filter change (1 T11 unit assertion updated: the `is_overdue` filter now asserts the computed predicate instead of the column). T11 integration counts/orderings/masking/404s unchanged (seed enriched with SLA/status without altering counts).

Quality gate
- `make check`: **PASS** (lint + format + typecheck + test-unit = **93 passed, 2 skipped** template placeholders)
- `make test-integration`: **PASS** (**17 tests**, testcontainers, incl. SSOT-coherence)
- ⚠ CI ordering unchanged: `make prisma-generate` before `make check`/tests on fresh checkout (GAP T11-#1, foundation-tracked as T-INFRA-01).

Drift scans (src/modules/tickets): `any` 0 · `console.*` 0 · `throw new Error(` 0 · forbidden imports 0 · default export 0 · `.skip` 0.

Security check
- Tenant/dept scope on stats + overdue via shared `buildScopeArms`; PII masking reused from T11 serializer on the overdue list. No secrets; no PII in logs. Read-only; no webhook/crypto.

Test evidence
- Unit/component: **48** (service 28 + stats 14 + routes 6). Integration: **17**. Files: `tickets.service.test.ts`, `tickets.stats.test.ts`, `tickets.routes.test.ts`, `tickets.repository.integration.test.ts`. Total **65** across the module.
- Sample stats envelope (ratified shape):
  ```json
  { "data": { "by_status": { "open": 5, "in_progress": 0, "awaiting_late_reason": 0,
      "done_pending": 0, "closed": 1, "high_alert": 0, "escalated": 0, "cancelled": 0 },
    "total": 6, "overdue": 3, "high_alert_count": 1 } }
  ```

Notes / open items
- Same merge posture as T11: buildable + fully testable now; live traffic after T04 merges + `api.ts` bootstrap wires `configureTenantGuardHooks` + `register(ticketsRoutes)` (DEP-2/DEP-4, foundation — not touched).
- Q-B-03 shipped exactly as ratified (`high_alert_count`); FE MSW remains the final tiebreaker (serializer-isolated → one-file change if it diverges).

Requesting PM B VERDICT.

##### VERDICT T13 — APPROVED (attempt 1) by PM B (2026-07-01, H12)
Verified by **my own rerun** on `feat/tickets-stats-overdue` @ `3a6af90` (checkout + `pnpm prisma:generate` + read the code).

**Quality gates (PM rerun):**
- `make check` → **PASS**: lint/format/typecheck clean, **93 passed + 2 skipped** (2 skips = `_template` placeholders, not tickets).
- `make test-integration` → **PASS**: **17 tests**, real Postgres (testcontainers).
- **Coverage (PM rerun)** — lines **96.66%**; per file: overdue 100 / repository 100 / types 100 / serializer 100 / service 98.8 / routes 96.96 / schema 90.16. Every changed file ≥90% line ✓ E7.
- **Drift** (src/modules/tickets): any 0 · console 0 · throw-Error 0 · default-export 0 · `.skip` 0 · forbidden imports 0. Clean.
- **File inventory**: 12 files touched, **all** in `src/modules/tickets/`, 0 outside.

**The ② coherence requirement — DONE and verified across all 4 sites:**
- SSOT `tickets.overdue.ts`: `isOverdue(row, now)` (JS predicate) + `overdueWhere(now)` / `notOverdueWhere(now)` (Prisma WHERE, co-located). The `NOT overdueWhere` form correctly re-includes null-`slaDueAt` rows as not-overdue — JS and SQL forms equivalent.
- Wired: (1) serializer `is_overdue: isOverdue(row, now)` `serializer.ts:61` (computed, no longer the dormant column), (2) `/overdue` filter `service.ts:65`, (3) stats overdue count `service.ts:173`, (4) T11's `?is_overdue` filter `service.ts:96-97` (`overdueWhere`/`notOverdueWhere`). 
- The JS-predicate == Prisma-WHERE equivalence is asserted against a real DB (integration "SSOT coherence" test). **The contradiction I flagged is gone.**

**DoD E1–E7 spot-verified in code:**
- E1 ✓ stats `{by_status(8 zero-filled), total, overdue, high_alert_count}` `serializer.ts:121-134`; single `groupBy` `repository.ts:39` + 2 `count()` (never N-per-status).
- E2 ✓ `/overdue` reuses `serializeTicketListItem`, `sla_due_at ASC`, top-N; stats `overdue` = true unbounded count (not LIMIT-capped).
- E3 ✓ `buildScopeArms(ctx)` extracted `service.ts:43`, reused by `buildTicketWhere`/`buildOverdueWhere`/stats; super_admin bypass + N2 AuthError preserved.
- E4 ✓ route-collision asserted `routes.test.ts:160` (`/tickets/stats` → statsHit true, not `:id`) + `/overdue` twin.
- E5 ✓ masking/errors/logging reuse T11. E6 ✓ no cross-module import; barrel adds only response types. E7 ✓ coverage above.
- Q-B-03 shape = ratified (`high_alert_count` distinct from `by_status.high_alert`) ✓.

**T11 REGRESSION — clean.** T11's 3 test files pass after the shared serializer/filter change. Executor updated exactly 1 T11 unit assertion (column → computed predicate); T11 integration counts/orderings/masking/404s unchanged. I reran T11's suites myself — green. No behavior drift on the merged T11 endpoints beyond the intended coherence fix (which makes `?is_overdue=true` actually return overdue tickets now — a fix, not a regression).

**Merge status (for PO):**
- **CODE APPROVED** on `feat/tickets-stats-overdue` @ `3a6af90`. Attempt 1, zero rejects.
- **T04 now MERGED to main** (`rbac.ts` + `tenant-guard.hooks.ts` present) — the `req.tenant` seam is live. Remaining go-live gate is **DEP-4 only**: `api.ts` bootstrap must wire `configureTenantGuardHooks(app)` + `register(ticketsRoutes)` (foundation, still a stub). Not a T13 blocker.
- **→ PO action: merge `feat/tickets-stats-overdue` when ready.**
- → §1 tracker updated (approved); PARENT §1 T13 → approved; roll-up PARENT §2.

Another clean first pass — coherence trap closed properly with an SSOT + real-DB equality guard. **T13 closed.** Next (T14) issued below. 🟢

---

### ASSIGNMENT T14 — Guests CRUD + preferences — issued by PM B (Nathan) 2026-07-01 (H12)
- Branch: `feat/guests-crud` (exec-B creates; code stays on branch, PO merges)
- Routed from: PARENT §1 T14 (Slot B) = MVP-HOTEL-CORE-FIRST §1.2 **B4**
- Spec authority: `docs/spec/02-hotel-core.md §1.3` (guests endpoints table + roles) + §2.3 DDL (`guests` + `guest_preferences`); envelope per **Q-B-01**; PII floor **MVP §4.5**
- Dependency: T02 ✓ (tables exist). **New greenfield module `src/modules/guests/`** — do NOT touch `tickets`.

**Scope (4 endpoints — all role `gm_admin` only; NOT dept_head)**
- `GET /api/guests` — list + search (`q` matches `name` + `wa_phone`), **page/pageSize (offset) pagination** — ⚠ NOT cursor (§1.3 says page/pageSize; §2.7 allows offset per-endpoint). Do NOT reuse the tickets cursor codec here.
- `GET /api/guests/:id` — profile + `preferences[]` + `visits[]` (nested arrays per §1.3).
- `PATCH /api/guests/:id` — update profile, `privacy_mode`, VIP flag.
- `POST /api/guests/:id/preferences` — add/update preference, **upsert by `preference_type`**.

**DoD (PM B verifies at SUBMIT)**
- [ ] G1 — `GET /guests` list + `q` search (name + wa_phone), page/pageSize pagination, envelope per Q-B-01 (confirm list wrapper: `{data, pageInfo}` vs an offset `{data, page, pageSize, total}` — **propose in PLAN → Q-B-04** if §1.3/FE MSW underpin differs; page-based lists may need a `total`).
- [ ] G2 — `GET /guests/:id` returns profile + `preferences[]` + `visits[]`. **Visits shape coordination**: the visits module (T16) will own the canonical `Visit` serializer. Define a minimal embedded visit-summary here and **flag Q-B-05** so T14 + T16 agree on the shape (or reuse T16's serializer once it lands). Missing guest → `NotFoundError` 404.
- [ ] G3 — `PATCH /guests/:id` updates allowed fields only (profile, `privacy_mode`, VIP flag); reject unknown/immutable fields via zod; `privacy_mode` ∈ enum. Returns updated guest.
- [ ] G4 — `POST /guests/:id/preferences` **upserts by `preference_type`** (unique-per-guest); use a transaction if read-modify-write; return the guest's preferences.
- [ ] G5 — **Tenant guard**: every query scoped `WHERE hotelId = ctx.hotelId` via `buildScopeArms`-style logic (reuse the pattern; guests are gm_admin-only so no dept filter, but super_admin bypass still explicit). `hotel_id` never from URL/body. Cross-tenant `:id` → 404 (reuse T03 `assertHotelOwnership`).
- [ ] G6 — **PII masking (§4.5)** at a serializer layer: `wa_phone`/`name`/`email` masked when `privacy_mode='vvip' && ctx.role!=='gm_admin'` (super_admin counts as gm_admin). NOTE: since these endpoints are gm_admin-only, the predicate rarely fires — but implement it for correctness/defense (same helper as tickets; consider promoting the mask predicate to `@shared` if it's now duplicated — flag if so).
- [ ] G7 — Errors via `AppError`; structured logging + correlationId; module layout per `MODULE_TEMPLATE.md` (`guests.routes/service/repository/schema/serializer/types/index`); no cross-module internal import (reading the `visits`/`tickets` *tables* via Prisma for the profile aggregation is fine — importing their *modules* is not).
- [ ] G8 — Tests: unit (search/filter build, upsert-by-type logic, mask predicate, pagination math) + integration vs `hotel_core_dev` (seed guests + preferences + visits; assert search, upsert idempotency, tenant isolation, 404). ≥80% line coverage changed files. `make check` + `make test-integration` green.

**Open questions to raise in PLAN (don't guess silently):**
- **Q-B-04** — guests list envelope for **offset** pagination (does FE expect `{data, pageInfo}` or `{data, page, pageSize, total}`?). §2.7 is cursor-shaped; guests are page-based. Propose shape.
- **Q-B-05** — embedded `visits[]` shape in guest detail vs the canonical `Visit` serializer that T16 will own. Coordinate to avoid divergence.

**Parallelization note (per our §7 rule):** T14 is greenfield `guests/` — safe to run alongside **T19 (notifications)** in parallel (zero shared shape). **T16 (visits) shares the `Visit` shape with T14** (Q-B-05) — if you fan out, either sequence T16 first (it owns the Visit serializer) or lock the embedded-visit shape between them before both code. I'll issue T16/T19 blocks on request.

**Session-start gate** (EXECUTOR-PROTOCOL §2): confirm identity, read `02-hotel-core.md §1.3` + §2.3 DDL, `make typecheck`/`make lint` clean, state scaffolder command. Then post PLAN. **No code before PM B ACK.**

Awaiting exec-B PLAN for T14.

---

### 📐 Q-B-05 RESOLVED (PM B ratify, 2026-07-01) — canonical `Visit` wire shape (unblocks T14 ∥ T16 parallel)
To let T14 (embeds `visits[]` in guest detail) and T16 (owns `GET /visits` + Visit serializer) run in parallel **without shape divergence**, I pin the canonical Visit wire object from DDL §2.3. Both modules serialize to THIS (each module-local — no cross-module import); FE MSW is final tiebreaker (serializer-isolated → one-file change if it differs):
```json
{ "id": "uuid", "guest_id": "uuid", "check_in": "ISO", "check_out": "ISO|null",
  "nights": "int|null", "room_number": "string|null",
  "status": "pending_verification|checked_in|checked_out|rejected|failed_verification|cancelled",
  "booking_source": "ota_email|direct|walk-in|pms|null", "verification_attempts": "int",
  "special_request": "string|null", "satisfaction_score": "1..5|null",
  "created_at": "ISO", "updated_at": "ISO" }
```
- **T16 owns** the canonical `visits.serializer.ts` producing this. **T14 embeds** the same shape in guest detail (module-local serialization of the subset it needs — MAY omit `special_request`/`satisfaction_score` for the profile summary; MUST NOT rename or retype shared fields). If either finds FE MSW wants a different shape, raise it — one serializer-file change each. Optional: a shared `VisitWire` **type** in `@shared/types/` both import (type-only, no logic) — allowed, not required.

---

### ASSIGNMENT T16 — Visits list + pending verification flow — issued by PM B (Nathan) 2026-07-01 (H12)
- Branch: `feat/visits-list-verify` · Routed from PARENT §1 T16 = MVP §1.2 **B6** · Spec: `02-hotel-core.md §1.3` (visits endpoints + pending/failed flows) + §2.3 DDL (`visits`) + §4.9 (atomic verify)
- **New greenfield module `src/modules/visits/`.** Dependency: T02 ✓. **Parallel-safe with T14** via Q-B-05. **Owns the canonical Visit serializer** (Q-B-05).
- **Inherited floor** (same as T11/T13 — I verify all at SUBMIT): tenant guard via T03 `TenantContext` (`WHERE hotelId=ctx.hotelId`, super_admin explicit bypass, never trust URL/body); `AppError` only; structured log + correlationId; module layout per `MODULE_TEMPLATE.md`; no cross-module internal import; PII masking §4.5 at serializer; zod validation; `AppError` errors; ≥80% line coverage; `make check` + `make test-integration` green; drift 0.

**Scope (role `gm_admin` only)**
- `GET /api/visits` — list, filter `?status=` (incl. `pending_verification`, `failed_verification`); **offset (page/pageSize) pagination** (dashboard cards; same envelope decision as guests Q-B-04 — align with T14). Serialize via canonical Visit shape.
- `PATCH /api/visits/:id/verify-manual` — dual-mode per §1.3: **approve** `{ guest_name, room_number, nights (1–7) }` → status `checked_in`, derive `check_out = check_in@13:00 + nights → @11:00`; **reject** `{ action: 'reject' }` → status `rejected`.

**Task DoD**
- [ ] V1 — `GET /visits` list + `?status` filter (CSV or single per FE) + offset pagination + canonical Visit serializer.
- [ ] V2 — `verify-manual` **atomic (§4.9)**: status update + audit trail in ONE transaction; no partial state visible. (Socket `verification:resolved` emit is **T20** — leave a clearly-named no-op/hook seam, do NOT wire socket here.)
- [ ] V3 — valid transitions only: `pending_verification → checked_in` (approve) / `→ rejected` (reject). Any other current-status → `422 BUSINESS_RULE`. Reject/approve-manual for failed_3x is **T17**, not here.
- [ ] V4 — checkout derivation correct (check_in date @13:00 local + nights, checkout @11:00); `nights` ∈ 1–7 zod-validated.
- [ ] V5 — tenant guard + gm_admin scope; cross-tenant `:id` → 404 (`assertHotelOwnership`).
- [ ] V6 — tests: unit (transition validation, checkout derivation, status filter build) + integration (seed visits across statuses; verify-manual tx atomicity; tenant isolation; 404).

**Open Q**: Q-B-04 envelope (offset) shared with T14 — coordinate one answer. Q-B-06 (if any) verify-manual audit-log target: does visits reuse a generic audit table or a visits-local log? (spec §4.9 says "audit log entry" — confirm which table; propose in PLAN.)

Awaiting exec-B PLAN for T16.

### ASSIGNMENT T16 — claimed by exec-B (Nathan, 2nd executor) at H13 (2026-07-02)
- Branch: `feat/visits-list-verify` (created at coding-start after PM B ACK; code stays on branch → PO merges to main, per PO directive 2026-07-01)
- Routed from: PARENT §1 T16 (Slot B) = MVP §1.2 B6
- Claiming the PM-B-issued ASSIGNMENT above. Running as the **T16 thread in parallel with the T14 thread** — disjoint greenfield modules (`visits/` vs `guests/`), separate branches, Q-B-05 shape pinned → no file/shape collision (§7 parallel-executor rule). PLAN below.

#### PLAN T16 — exec-B (Nathan) at H13 (2026-07-02)

**Scope recap**
Greenfield `src/modules/visits/`. Two endpoints: `GET /api/visits` (list + `?status` filter incl. `pending_verification`/`failed_verification`, **offset page/pageSize** pagination, serialized via the canonical Visit shape this module owns per Q-B-05) and `PATCH /api/visits/:id/verify-manual` (dual-mode: **approve** `{guest_name, room_number, nights∈1–7}` → `checked_in` with derived `check_out`; **reject** `{action:'reject'}` → `rejected`). verify-manual is **atomic** (V2). Tenant guard via T03 `TenantContext` (`WHERE hotelId=ctx.hotelId`, super_admin explicit bypass). Reject/approve of `failed_verification` and manual visit `POST` are out of scope (T17/T18). Socket `verification:resolved` emit is T20 — leave a named no-op seam only.

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity confirmed: Executor, Slot B (Nathan), 2nd executor ✓
- CLAUDE.md loaded ✓
- Task spec read: `02-hotel-core.md` §1.3 (visits endpoints + pending/failed_3x flows + `verify-manual` approve/reject) + §2.3 DDL (`visits` — 13 cols, status/nights/booking_source CHECKs) + §7 (error catalog) + socket table (`verification:resolved`); `docs/spec/README.md` §2.7 (envelope); Q-B-05 ratified Visit shape + Q-B-04 (offset envelope) in this file §2/§7 ✓
- Parent docs spot-read: `docs/MODULE_TEMPLATE.md` pattern via `src/modules/_template/*` + the merged `src/modules/tickets/*` (canonical in-repo reference: routes `requireTenant`/correlationId, barrel `buildXService` factory, serializer-isolation, testcontainers integration); `src/plugins/tenant-guard.ts` (`TenantContext`, `assertHotelOwnership`); `prisma/schema.prisma:148` (Visit model — camelCase fields, `@map` snake_case) ✓
- Dependencies: T02 ✓ (visits table migrated). T03 ✓ (`TenantContext` + `assertHotelOwnership` on main). No dependency on T14 (Q-B-05 pins the shared shape → module-local serializer, no import).
- `node_modules` present + `@prisma/client` generated on this machine. `pnpm typecheck` clean ✓ ; `pnpm lint` clean ✓ (baseline green on `main` confirmed this session).
- Scaffolder risk: **none**. No `pnpm create` / `prisma init`. No migration added (T02 covered all 18 tables). Only non-source CLI is `pnpm prisma:generate` (writes gitignored `node_modules/.prisma`).

**Files to create**
```
src/modules/visits/visits.routes.ts        FastifyPluginCallback — GET /visits, PATCH /visits/:id/verify-manual (thin: requireTenant → validate → service → send)
src/modules/visits/visits.service.ts       orchestration: list scope + offset paging; verify-manual approve/reject branch, status-transition guard, checkout derivation
src/modules/visits/visits.repository.ts    Prisma direct (injected PrismaClient; no interface — ADR-0001); status-guarded atomic update
src/modules/visits/visits.schema.ts        zod: list query (?status CSV, page, pageSize), :id param, verify-manual dual-mode body (discriminated on action / nights∈1–7)
src/modules/visits/visits.serializer.ts    OWNS canonical Visit wire shape (Q-B-05, 13 fields) — module-local
src/modules/visits/visits.types.ts         domain types + wire DTOs + offset-envelope type
src/modules/visits/index.ts                barrel: export visitsRoutes + buildVisitsService factory (no repo/serializer export)
src/modules/visits/__tests__/visits.service.test.ts               unit — transition guard, checkout derivation (13:00→+nights→11:00), status-filter build, offset math, super_admin bypass
src/modules/visits/__tests__/visits.routes.test.ts                component — app.inject (401 pre-auth, 400 validation, approve/reject happy path)
src/modules/visits/__tests__/visits.repository.integration.test.ts integration — real hotel_core_dev PG (testcontainers): seed visits across statuses, verify-manual tx atomicity, tenant isolation, 404
```

**Files to modify**
- **None in `src/` core.** No `api.ts` / `prisma/schema.prisma` / `core/*` edits (DEP-2 bootstrap wires later via `buildVisitsService(db)` + `fastify.register(visitsRoutes, { prefix:'/api', service })`). No `declare module 'fastify'` — `req.tenant` augmentation already lives in `tenant-guard.types.ts` (reuse; a second block = TS merge error).

**Approach**
Mirror the ratified tickets module (reuse-before-create, CLAUDE §4). Repository = Prisma direct, injected `PrismaClient`. Service takes `ctx: TenantContext` as first arg on every method. **List (V1):** `where` = `hotelId: ctx.hotelId` unless `ctx.isSuperAdmin` (explicit branch drops the filter); `status` zod-parsed against the 6-value enum (CSV → `in`); offset via `skip=(page-1)*pageSize`, `take=pageSize`, plus a `count()` for `total`; `orderBy [{createdAt:'desc'},{id:'desc'}]`. **verify-manual (V2–V5):** repo fetch by id → `assertHotelOwnership(ctx, row.hotelId, 'Visit')` (cross-tenant → `NotFoundError` 404, anti-enumeration) → guard `row.status==='pending_verification'` else `BusinessRuleError` (422, spec §7 `BUSINESS_RULE`); `failed_verification`/others are **not** handled here (T17). **Atomicity:** the mutation is a **status-guarded conditional update** — `updateMany({ where:{ id, hotelId, status:'pending_verification' }, data })` inside `prisma.$transaction(...)`; `count===1` confirms the transition won the race, `0` → re-resolve to 404/422 (no lost update, no partial state — V2). **approve:** `data = { status:'checked_in', roomNumber, nights, checkOut: derived }`; **reject:** `data = { status:'rejected' }`. **Checkout derivation (V4):** `check_out =` calendar date of `check_in` **+ nights days at 11:00 local**, computed with `dayjs` + `utc`/`timezone` plugins; check-in standard is 13:00. `nights` zod-clamped **1–7** (stricter than the DDL 1–30 CHECK — the approve flow's contract; no conflict, zod ⊆ DB). **Serializer (Q-B-05):** module-local `visits.serializer.ts` emits the 13-field canonical shape verbatim (snake_case body inside the camelCase envelope, same casing contract ratified in Q-B-01). **Socket seam (V2):** a clearly-named `onVerificationResolved` no-op hook (default `() => {}` dep, like T11's `resolveUsers` seam) — T20 wires the real emit; **not** wired here. Errors: `AppError` subclasses only. **Tests:** unit on pure helpers (transition guard, checkout derivation across a fixed TZ, status-filter build, offset math, super_admin bypass) — no Prisma mock; integration seeds visits across all 6 statuses in `hotel_core_dev` and asserts list filter/paging, verify-manual approve+reject atomicity, invalid-status→422, cross-tenant→404.

**Q-B-04 — offset pagination envelope proposal (ONE shared answer for T14 + T16, for PM B ACK)**
§2.7 is cursor-shaped (`{data, pageInfo:{nextCursor, hasMore}}`); guests+visits are page-based, so we need an offset variant. **Proposal (minimize divergence from the already-ratified Q-B-01 envelope):** keep the **camelCase `pageInfo` wrapper** and swap only the inner fields for offset —
```json
{ "data": [ /* Visit[] */ ], "pageInfo": { "page": 1, "pageSize": 20, "total": 137, "hasMore": true } }
```
- **Why this over flat `{data,page,pageSize,total}`:** one wrapper key (`pageInfo`) across every list endpoint (cursor OR offset), differing only by inner fields — FE reads `res.pageInfo.*` uniformly; consistent with the camelCase-wrapper decision PM ratified in Q-B-01. `hasMore = page*pageSize < total` (derived, saves FE a computation).
- **Shared-answer commitment:** T16 uses exactly this; **T14 (guests list)** must adopt the same `pageInfo` wrapper (offset fields for guests list, cursor fields for `/messages`). Flagging so the T14 thread locks the identical shape before either serializer is final. FE MSW is the tiebreaker; both are serializer-isolated → one-file change if it differs. **Awaiting PM B ACK on the wrapper before I lock `visits.serializer.ts`.**

**GAPs / questions (recorded, not silently worked around)**

- **GAP T16-#1 — verify-manual "audit trail" has no target table + spec §4.9 absent.** V2 requires "status update + audit trail in ONE transaction," and the assignment cites `spec §4.9` — but (a) `grep '4\.9'` finds **no §4.9** in `02-hotel-core.md`, and (b) there is **no audit table for visits** in `prisma/schema.prisma` (no `visit_updates`, no generic audit table; `Visit` has only `hotel`/`guest` relations). Ticket audit lives in `ticket_updates` — visit-scoped, not reusable. Adding a table needs a **migration**, out of B-task scope (T02 covered all 18 tables; migrations = foundation/Slot A). **Options:** **A)** Interpret "audit trail in one tx" as the **atomic status transition itself** (the status-guarded `updateMany` inside `$transaction`, no separate row) + leave a clearly-named `recordVisitAudit` **no-op seam** for when an audit table lands via a future foundation migration — zero shape churn, one-spot wire later (mirrors T11's approved `userDirectory` seam). **B)** Reuse the `notifications` table as the audit sink — semantically wrong (user-facing, not audit), reject. **C)** Request Slot A add a `visit_audit`/`visit_updates` table via migration now (cross-slot, foundation, needs PO) — heavier, blocks T16. **My intent: A** — keeps V2 atomicity satisfiable without a migration and isolates the future decision to one seam. Proceeding with A in the skeleton unless redirected.
- **GAP T16-#2 — `verify-manual` approve `guest_name`: what does it mutate?** The approve body carries `guest_name`, but `visits` has **no** `guest_name` column (name lives on `Guest`, owned by T14's module). **Options:** **A)** validate presence only, treat as confirmation — do **not** write across the module boundary from `visits` repo (if the name must persist it belongs to a guests-module call/event). **B)** update `Guest.name` in the same tx (crosses bounded context — violates "no cross-module internal import"; a DB-level write to `guests` from `visits` repo is the same boundary leak). **C)** store on visit — impossible, no column. **My intent: A** (boundary-clean). Flag if FE expects the approve to rename the guest — then it's a guests-module concern to route, not visits.
- **GAP T16-#3 — checkout-derivation timezone: no per-hotel TZ modeled.** V4 says "check_in 13:00 **local** → +nights → 11:00 local," but `Hotel` is **id-only** in this DB (Auth owns hotel attributes — same shape as the `User` stub behind GAP T11-#2), so there is **no per-hotel timezone**. Only a global `config.TZ` (env, default `UTC`) exists. **My intent:** derive using `dayjs.tz(..., config.TZ)` (service-level seam), isolated so a later per-hotel-TZ source (Auth cross-join / hotel-settings seam) is a one-spot change — same isolation pattern as the `resolveUsers` seam. Non-blocking; flagging the assumption so PM can confirm `config.TZ` is the accepted stand-in for MVP.

Awaiting PM B ACK (PLAN + Q-B-04 offset envelope + GAP T16-#1/#2/#3). Not writing code before ACK — branch `feat/visits-list-verify` created only at coding-start.

##### PM B ACK — T16 PLAN APPROVED (2026-07-02, H13)
Verified vs spec + schema. **ACK — create `feat/visits-list-verify`, implement.**

**Q-B-04 — RATIFIED (shared T14+T16):** `{ data, pageInfo: { page, pageSize, total, hasMore } }`. Keeps the `data/pageInfo` wrapper consistent with cursor lists (§2.7 one-mental-model); offset fields inside `pageInfo` (camelCase), snake_case resource body. `hasMore` = `page*pageSize < total`. Both threads use this identical shape — lock it. Provisional on FE MSW (serializer-isolated).

**GAP T16-#1 (audit tx) — approach A APPROVED + correction.** ⚠ §4.9 **does** exist — `MVP-HOTEL-CORE-FIRST.md:127` (you grepped `02-hotel-core.md`, wrong doc). It wants status + audit + emit in one tx. BUT I confirmed **no visit audit table** in the schema (`model Visit` only, no `VisitUpdate`). So the achievable-now atomic scope = status-guarded update in a `$transaction` (**V2 satisfied — no partial state**); the audit-entry + `verification:resolved` emit are **no-op seams** (audit table + emit = foundation/T20). Approach A correct. **Don't add a migration.** Escalating the schema question as Q-B-09 (does visits get a `visit_updates` table like tickets, or is visit-audit out-of-MVP?) to Parent §3c — your `recordVisitAudit` no-op seam stands until answered.

**GAP T16-#2 (guest_name) — approach A APPROVED.** `guest_name` has no visits column; writing it to `guests.name` = cross-module write into T14's table (ownership + parallel collision). **Validate-only** (accept, don't persist) is correct. Deferred as Q-B-08 (whether verification updates the guest's name — later, via guests module, not T16). Don't cross-write to `guests`.

**GAP T16-#3 (timezone) — APPROVED.** Hotel is id-only (no `timezone`, confirmed). `config.TZ` single-TZ seam via dayjs+tz is right for dev/MVP; swap to per-hotel `hotels.timezone` on shared-DB restore (DEP-3 family). Validate `nights` 1–7 at the endpoint (§1.3 flow) though the column allows 1–30.

**Confirmed:** owns canonical `visits.serializer.ts` (Q-B-05) ✓; atomic status-guarded update in `$transaction` (V2) ✓; transitions pending_verification→checked_in/rejected else 422 (V3) ✓; socket no-op seam (T20) ✓; 0 core edits ✓; disjoint from T14 (`visits/` vs `guests/`) ✓.

At SUBMIT I verify V1–V6 + tx atomicity (integration: no partial state) + checkout derivation + tenant/404 + Q-B-04 shape + drift + make check/integration + ≥80% cov. Proceed. 🟢

### GAP T16-#4 — exec-B (Nathan) at H13 (2026-07-02) — no `BusinessRuleError` (422) class exists; V3 blocked, `core/*` out-of-scope for B
- **Gap**: V3 requires invalid verify-manual transitions to return **`422 BUSINESS_RULE`** (spec §7 `02-hotel-core.md:74` + error catalog `:826`; README §2.3 envelope `{error:{code,message,details}}`; README:88 lists `BUSINESS_RULE (422)` as an FE-handled code). But `src/core/errors/app-errors.ts` has **no 422 class** — the hierarchy is 400/401/403/404/409/429/402/500/502, jumping 409→429. I cannot `throw` the V3 error without a class. Adding one edits `core/errors` = **foundation, explicitly out-of-scope for B tasks** (this file §7 rule L783: "`core/*` … out-of-scope for B tasks → no cross-executor edit"), and both my PLAN and your ACK confirmed **"0 core edits"**. Note this is **shared**: **T12** (tickets status transition, Slot B) needs the identical `422 BUSINESS_RULE` code `INVALID_TICKET_TRANSITION` (spec §1.2 L74), so the class is cross-task foundation, not T16-local.
- **Doc reference**: `src/core/errors/app-errors.ts:51-59` (409 ConflictError → 429 RateLimitError, no 422) vs `docs/spec/02-hotel-core.md:74/:826-828` + `docs/spec/README.md:88` + PM-STATUS-B.md §7 L783 (core/* out-of-scope).
- **Options**: **A)** **Slot A / foundation adds** `BusinessRuleError` (statusCode 422, code `BUSINESS_RULE`, with a per-violation sub-code in `details` or a `code` override so `INVALID_TICKET_TRANSITION` / `INVALID_VISIT_TRANSITION` are expressible) to `core/errors/app-errors.ts` — correct owner, unblocks T16-V3 **and** T12, keeps my "0 core edits" intact. **B)** You bless a **one-time flagged core add** by me (I add the class, flag prominently in SUBMIT) — faster, but deviates from the ACK'd "0 core edits" + §7 rule. **C)** Reuse `ConflictError` (409) — **rejected**: wrong HTTP status, breaks the §7 error catalog + FE's `BUSINESS_RULE`(422) optimistic-rollback handling.
- **My intent**: **A** (foundation owns core/errors; shared with T12). **Sub-question for the class contract**: spec writes "`422 BUSINESS_RULE` code `INVALID_TICKET_TRANSITION`" — i.e. category `BUSINESS_RULE` + a specific violation code. Please confirm the wire shape: is the envelope `code` field = `"BUSINESS_RULE"` (violation in `details.rule`) OR = `"INVALID_VISIT_TRANSITION"` (BUSINESS_RULE is only the 422 category)? I'll serialize to whatever you ratify.
- **Not blocked meanwhile**: I'm building the **read-path now** (`GET /api/visits` list + `?status` filter + offset pagination + canonical `visits.serializer.ts` (Q-B-05) — V1) which needs no 422. **verify-manual (V2–V5)** service/repo/schema are drafted but the transition-guard `throw` + its unit/integration tests wait on this ruling. SUBMIT will be split or held until the class lands.

Awaiting PM B ruling on GAP T16-#4 (class owner + `code` wire shape).

#### CHECKPOINT T16 — exec-B (Nathan) at H13 (2026-07-02) — V1 (read-path) complete + green; V2–V5 held on GAP T16-#4
Read-path shipped on branch `feat/visits-list-verify` (pushed, commit `feat(visits): … T16 V1`). **Not a SUBMIT** — DoD V2–V6 not fully ticked (verify-manual blocked on GAP T16-#4), so per EXECUTOR-PROTOCOL §4.5 I'm posting a checkpoint, not requesting VERDICT yet.

**Done (V1):**
- `GET /api/visits` — tenant-scoped list (`WHERE hotelId=ctx.hotelId`, explicit super_admin bypass; visits are not dept-scoped — gm_admin surface, no `departmentId` column), `?status` CSV filter over the 6 enum values, **offset pagination** (`page`/`pageSize`, clamp ≤100), `orderBy createdAt desc, id desc`.
- **Canonical `visits.serializer.ts` (Q-B-05)** — owns the 13-field Visit wire shape verbatim; no PII masking needed (shape carries `guest_id` only, no guest name/phone/email → §4.5 N/A here, masking lives in guests module).
- **Q-B-04 offset envelope** ratified shape emitted: `{ data, pageInfo: { page, pageSize, total, hasMore } }`, `hasMore = page*pageSize < total`.
- Module layout per template: `visits.routes.ts` / `.service.ts` / `.repository.ts` / `.schema.ts` / `.serializer.ts` / `.types.ts` / `index.ts` barrel (exports `visitsRoutes` + `buildVisitsService`; repo/serializer unexported). 0 core edits, 0 cross-module imports.

**Quality (my rerun):** `make check` PASS (lint + format + typecheck + 115 unit/component/integration, 2 skips = `_template` placeholders); visits integration green via testcontainers (real PG). Coverage on changed files: repository/serializer/service/types 100%, routes 93.75%, schema (post dead-code trim) ~100% — all ≥80%. Drift (visits): `any` 0 · `console.*` 0 · `throw new Error(` 0 · forbidden imports 0 · default export 0 · `.skip` 0.

**Held on GAP T16-#4 (V2–V5):** `PATCH /api/visits/:id/verify-manual` (approve/reject), the status-guarded `$transaction`, checkout derivation (GAP T16-#3 seam ready via `config.TZ`), `recordVisitAudit` no-op seam (GAP T16-#1), `guest_name` validate-only (GAP T16-#2), and their unit/integration tests are drafted in approach but **not written to compile** — they need the 422 `BusinessRuleError` class + the `code` wire-shape ruling. The routes file registers only `GET` for now; a code comment marks the pending PATCH. **The moment you rule on T16-#4 I add V2–V5 + tests and post the full SUBMIT.**

**Ask:** ruling on GAP T16-#4 (class owner A/B + envelope `code` = `"BUSINESS_RULE"` vs `"INVALID_VISIT_TRANSITION"`). Meanwhile V1 is independently reviewable on the branch if you want an early read.

---

### ASSIGNMENT T19 — Notifications CRUD + optimistic ops — issued by PM B (Nathan) 2026-07-01 (H12) — ⛔ BLOCKED on seam extension
- Branch: `feat/notifications-crud` · Routed from PARENT §1 T19 = MVP §1.2 **B9** · Spec: `02-hotel-core.md §1.9` (endpoints L219-222 + optimistic note L240) + §2.5 DDL (`notifications`)
- **New greenfield module `src/modules/notifications/`.** Dependency: T02 ✓. **Inherited floor** as above.
- ⛔ **BLOCKED — DEP-5**: notifications are **per-user** (`WHERE user_id = ctx.userId`), but `TenantContext` currently has **no `userId`** (`tenant-guard.ts:22-26`; `SessionUser.userId` exists but `deriveTenantContext` drops it). Slot A must add `userId` to `TenantContext` + `deriveTenantContext` (2-line foundation fix). **Escalated → PARENT §3b (DEP-5) + §10.** Executor MAY draft PLAN + module skeleton/schema/serializer now, but **must not hand-roll userId** from the JWT (bypasses the seam) — hold the scoping impl until Slot A ships `ctx.userId`.

**Scope (all authenticated roles — NOT gm_admin-only)**
- `GET /api/notifications` — current user's list, filter `?is_read`, pagination; scope `WHERE hotelId=ctx.hotelId AND userId=ctx.userId`.
- `GET /api/notifications/unread-count` — `{ data: { count } }` (or per FE MSW — propose).
- `PATCH /api/notifications/:id/read` — mark one read; ownership `userId=ctx.userId` (cross-user → 404).
- `POST /api/notifications/mark-all-read` — mark all current-user unread → read.

**Task DoD**
- [ ] N1 — all 4 endpoints; **per-user scope** on every one (a user sees/mutates only their own notifications, within their hotel).
- [ ] N2 — `unread-count` accurate; `mark-all-read` idempotent; `:id/read` sets `is_read`+`read_at`.
- [ ] N3 — tenant + user guard (no cross-user, no cross-tenant); cross-user `:id` → 404.
- [ ] N4 — tests: unit (scope build, read/unread transitions) + integration (seed multi-user notifications; assert user A can't see/mark user B's; unread-count; mark-all).

**Open Q**: Q-B-07 — `unread-count` + list envelope shapes (propose per §2.7 + FE MSW).

Awaiting Slot-A `TenantContext.userId` (DEP-5) before impl; exec-B may PLAN now.

---

### ASSIGNMENT T14 — claimed by exec-B (Nathan) at H2 (2026-07-02)
- Branch: `feat/guests-crud` (exec-B creates on ACK; code stays on branch, PO merges)
- Routed from: PARENT §1 T14 (Slot B) = MVP-HOTEL-CORE-FIRST §1.2 B4
- Claiming the PM-B-issued ASSIGNMENT above. PLAN below. (Taking T14 solo this loop — not fanning out T16 concurrently, so the Q-B-05 Visit shape can't drift mid-flight.)

#### PLAN T14 — exec-B (Nathan) at H2 (2026-07-02)

**Scope recap**
New greenfield module `src/modules/guests/` (do NOT touch `tickets`). Four `gm_admin`-only endpoints: `GET /api/guests` (q-search name+wa_phone, **offset** pagination), `GET /api/guests/:id` (profile + `preferences[]` + `visits[]`), `PATCH /api/guests/:id` (profile/privacy/VIP), `POST /api/guests/:id/preferences` (upsert by `preference_type`). Reuse the tickets *patterns* (scope arms, serializer masking, AppError, correlationId logging) without importing the tickets *module*.

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity: Executor, Slot B (Nathan) ✓ · CLAUDE.md loaded ✓
- Spec read: `02-hotel-core.md §1.3` (guests endpoints + roles) + §2.3 DDL (`guests` + `guest_preferences` + `visits`) + §6 RBAC; envelope `README §2.7`; PII floor MVP §4.5; Q-B-05 ratified Visit shape (§2 above)
- Dependency: T02 ✓ (tables exist); T04 **merged** (`req.tenant` live). Greenfield module — no `tickets` edits.
- `pnpm typecheck` clean ✓ ; `pnpm lint` clean ✓ (on `main`, node_modules + prisma client already generated this session)
- Scaffolder risk: **none** (no new deps; `prisma generate` already run; no `pnpm create`).

**Files to create** (all in `src/modules/guests/`)
```
guests.routes.ts        4 routes (Fastify plugin via options, same seam as ticketsRoutes)
guests.service.ts       guestScopeWhere(ctx) + list(offset)/detail/update/upsertPreference
guests.repository.ts    Prisma direct — findManyAndCount, findDetailById (incl prefs+visits), updateGuest, upsertPreference
guests.schema.ts        zod — list query (q,page,pageSize), :id param, patch body (.strict()), preference body
guests.serializer.ts    guest wire (snake_case) + PII masking + preference wire + embedded visit summary (Q-B-05 shape)
guests.types.ts         wire DTOs + domain
index.ts                barrel — guestsRoutes + buildGuestsService
__tests__/guests.service.test.ts               unit (search build, offset math, upsert logic, mask predicate)
__tests__/guests.repository.integration.test.ts  integration (search, upsert idempotency, tenant isolation, 404)
```

**Files to modify**: none outside the new module (no `api.ts`/`prisma`/`core`/`tickets`).

**Approach**
- **Scope (G5)**: local `guestScopeWhere(ctx)` mirroring the tickets pattern — `hotelId: ctx.hotelId` unless `ctx.isSuperAdmin` (explicit bypass). No dept filter (guests are gm_admin-only; the "who may hit this route" gate is T04's RBAC preHandler — N3, I don't hand-roll role checks). Detail/PATCH/preferences load the guest by id then `assertHotelOwnership(ctx, row.hotelId, 'Guest')` (T03 helper → cross-tenant 404).
- **List (G1)**: **offset** pagination — `page` (default 1, ≥1), `pageSize` (default 20, ≤100); `skip=(page-1)*pageSize`, `take=pageSize`; `q` → Prisma `OR [{ name: contains insensitive }, { waPhone: contains insensitive }]` in its own AND arm; `findManyAndCount` (findMany + count in a `$transaction`) → `total`. **Do NOT reuse the tickets cursor codec.**
- **Detail (G2)**: `findUnique` include `preferences` (order `createdAt asc`) + `visits` (order `checkIn desc`); serialize embedded visits to the **ratified Q-B-05 shape** (module-local serializer, full shape incl. `special_request`/`satisfaction_score` — no rename/retype). Missing → `NotFoundError('Guest', id)`.
- **PATCH (G3)**: zod `.strict()` body, all-optional: `name`, `email` (nullable), `privacy_mode` (enum `standard|vvip`), `is_vip` (bool), `vip_level` (enum `silver|gold|platinum`|null). Unknown/immutable keys → `ValidationError`. **`wa_phone` intentionally immutable** in PATCH (it's the WA identity + `(hotel_id,wa_phone)` unique) — flagging; add later if FE needs it. Returns updated guest.
- **Preferences (G4)**: load+assert guest first (404 if cross-tenant), then Prisma `upsert` on `@@unique([guestId, preferenceType])` (`create` carries `hotelId=ctx.hotelId`); wrap upsert+refetch-preferences in `$transaction` for a consistent return. Returns the guest's full `preferences[]`.
- **PII masking (G6)**: serializer-layer, same predicate as tickets — mask `wa_phone`/`name`/`email` when `privacy_mode==='vvip' && !(ctx.role==='gm_admin' || ctx.isSuperAdmin)`. (Rarely fires since endpoints are gm_admin-only, but implemented for defense.)
- **Errors/logging (G7)**: `AppError` only; `req.log` + correlationId (`x-correlation-id` ?? `req.id`); MODULE_TEMPLATE layout; barrel hides repo/serializer.

**Open questions / decisions (for PM B ACK)**
- **Q-B-04 — offset list envelope (propose).** §2.7's `{data, pageInfo:{nextCursor,hasMore}}` is cursor-shaped; guests are page-based and need a `total` (FE renders page counts). **Proposing** (keeps the `data`/`pageInfo` wrapper consistent with tickets so FE has one list-envelope model, offset fields inside):
  ```json
  { "data": [ /* guest */ ], "pageInfo": { "page": 1, "pageSize": 20, "total": 137, "hasMore": true } }
  ```
  Alternative if FE MSW is flat: `{ data, page, pageSize, total }`. **My intent: the pageInfo-wrapped form** (one shared answer for T14 + T16 per your note). Confirm before I lock the serializer; FE MSW is the tiebreaker (serializer-isolated → one-file change).
- **Q-B-05 — already RESOLVED by you.** Consuming the ratified Visit shape for embedded `visits[]` (full shape, module-local serializer). No action needed; noting I'm aligned. If I later fan out T16, it owns the canonical `visits.serializer.ts` producing the same shape.
- **G6 mask-predicate duplication (flag, per your invite).** The predicate + `maskName` now exist in `tickets.serializer` and will duplicate in `guests.serializer`. **My intent: keep it module-local in guests for now** (keeps this PR self-contained, zero edits to merged `tickets`/`@shared`), and raise a small follow-up to promote `maskName` + `shouldMaskPii(privacyMode, ctx)` to `@shared/utils/masking.ts` (additive; both modules import) as a separate refactor. Redirect me if you'd rather I promote-to-`@shared` inside this PR (it would then touch merged `tickets.serializer` + shared).

**Merge posture**: same as T11/T13 — buildable + fully testable now (inject `TenantContext`); live once `api.ts` bootstrap wires `configureTenantGuardHooks` + `register(guestsRoutes)` (DEP-4, foundation — not touched). `make prisma-generate` before CI (GAP T11-#1 / T-INFRA-01).

Awaiting PM B ACK (PLAN + Q-B-04 envelope + G6 masking-dedup decision + wa_phone-immutable confirm). Not coding before ACK.

##### PM B ACK — T14 PLAN APPROVED (2026-07-02, H13)
Verified. **ACK — create `feat/guests-crud`, implement.**

**Q-B-04 — RATIFIED (shared, identical to T16):** `{ data, pageInfo: { page, pageSize, total, hasMore } }`. You and the T16 thread converged on the same shape independently — good signal. Locked for both; `hasMore` = `page*pageSize < total`. (Guest `/messages` is T15 = cursor, not this PR.)

**Q-B-05 — confirmed aligned.** Embed the ratified Visit shape (full, **module-local** serializer) in guest detail `visits[]`. Do NOT import T16's `visits.serializer` (cross-module) — your module-local serializer produces the same pinned shape. Divergence → FE-MSW tiebreaker, one-file each.

**G6 mask-dedup — module-local for THIS PR APPROVED + follow-up.** Keep `maskName` + `shouldMaskPii` module-local in guests now (self-contained PR, zero edits to merged tickets / `@shared`, no coupling with in-flight T16). **REQUIRED**: keep the predicate + `maskName` **byte-identical** to tickets' (same `privacy_mode='vvip' && !(gm_admin||super_admin)` predicate, same `B***` / `+62…***` formats) so the later consolidation is a pure move. I'm filing **T-CLEAN-01** (Slot B, post-guests): promote `maskName` + `shouldMaskPii` to `@shared/utils/masking.ts` + refactor tickets/guests to consume it. Do NOT do it in this PR.

**wa_phone immutable in PATCH — APPROVED.** It's the guest identity + part of `(hotel_id, wa_phone)` unique — exclude from the PATCH body (zod: reject/strip if present). A phone-change flow, if ever needed, is separate. Correct defensive call.

**Reminders:** offset (page/pageSize) NOT cursor for `/guests`; `POST /preferences` upsert-by-`preference_type` (tx if read-modify-write); gm_admin-only (super_admin bypass explicit); cross-tenant `:id`→404; guest detail reads the `visits` table via Prisma (fine) — do NOT import the visits module.

At SUBMIT I verify G1–G8 + upsert idempotency (integration) + search + offset pagination math + mask-predicate-identical-to-tickets + Q-B-04 shape + tenant/404 + drift + make check/integration + ≥80% cov. Proceed. 🟢

### SUBMIT T14 — exec-B (Nathan) at H2 (2026-07-02) (attempt 1)

Task: Guests CRUD + preferences — `GET /api/guests` · `GET /api/guests/:id` · `PATCH /api/guests/:id` · `POST /api/guests/:id/preferences`
Branch: **`feat/guests-crud`** (pushed; commit `f4c4fd8`) — **PO merges to main manually**. Code NOT on main.
Files changed: 11 new, **all** in `src/modules/guests/` (0 outside — no `api.ts`/`prisma`/`core`/`tickets` edits)
  - `guests.types.ts` (wire DTOs incl. Q-B-05 VisitWire + Q-B-04 OffsetPageInfo), `guests.schema.ts` (zod: offset query + `.strict()` PATCH + preference), `guests.serializer.ts` (PII masking + snake_case + embedded visit), `guests.repository.ts` (Prisma direct — findManyAndCount/detail/update/upsert-in-tx), `guests.service.ts` (scope + list/detail/update/addPreference), `guests.routes.ts` (4 routes), `index.ts` (barrel + buildGuestsService)
  - `__tests__/`: `guests.service.test.ts` (22 unit), `guests.routes.test.ts` (6 component via inject), `guests.repository.integration.test.ts` (10 integration)

DoD self-check
- [x] **G1** — `GET /guests` list + `q` search (name + wa_phone), **offset** page/pageSize pagination (NOT cursor); envelope = ratified **Q-B-04** `{ data, pageInfo: { page, pageSize, total, hasMore } }`; `hasMore = page*pageSize < total`. Integration-verified (5 guests, pageSize 2 → 3 pages).
- [x] **G2** — `GET /guests/:id` returns profile + `preferences[]` (createdAt asc) + `visits[]` (checkIn desc); embedded visits use the **module-local** serializer producing the ratified **Q-B-05** shape (no import of T16's serializer). Missing → `NotFoundError` 404.
- [x] **G3** — `PATCH /guests/:id` zod `.strict()` — only `name`/`email`/`privacy_mode`/`is_vip`/`vip_level`; unknown keys incl. **`wa_phone` rejected** (`ValidationError`); enums validated. Returns updated guest. Integration-verified persistence.
- [x] **G4** — `POST /guests/:id/preferences` **upserts by `preference_type`** (Prisma `upsert` on `@@unique([guestId, preferenceType])`) inside a `$transaction` with the refetch; returns the guest's full `preferences[]`. Integration: 2× same type → 1 row, value updated (idempotent).
- [x] **G5** — tenant guard: list scoped `WHERE hotelId=ctx.hotelId` (explicit super_admin bypass, no dept filter — gm_admin-only); detail/update/preferences load then `assertHotelOwnership` (T03) → cross-tenant 404. `hotel_id` never from URL/body. RBAC role-gate left to T04 preHandler (N3).
- [x] **G6** — PII masking at serializer layer; predicate `privacy_mode='vvip' && !(gm_admin||super_admin)`. **`maskName` + `shouldMaskPii` body byte-identical to `tickets.serializer`** (the only delta is the `shouldMaskPii` param annotation: tickets' local `GuestFields` alias vs guests' structural `{ privacyMode: string }` — the latter is the clean shared signature, so **T-CLEAN-01 stays a pure move**). Kept module-local this PR per ACK.
- [x] **G7** — `AppError` only; `req.log` + correlationId; MODULE_TEMPLATE layout; barrel hides repo/serializer; reads `visits` table via Prisma (allowed) — no visits-module import.
- [x] **G8** — unit (search/where, offset math, upsert, mask predicate, strict-PATCH) + integration vs real PG (search, offset, upsert idempotency, tenant isolation, 404). **Changed-file line coverage 97.87%** (repo 100 / routes 97.14 / schema 97.36 / serializer 100 / service 97.43 / types 100). `make check` + `make test-integration` green.

Quality gate
- `make check`: **PASS** (lint + format + typecheck + test-unit = **131 passed, 2 skipped** template placeholders; tickets suites green → no regression, guests didn't touch tickets)
- `make test-integration`: **PASS** (guests **10** + tickets 17 = 27 via testcontainers)
- ⚠ CI ordering unchanged: `make prisma-generate` before `make check`/tests on fresh checkout (GAP T11-#1 / T-INFRA-01).

Drift scans (src/modules/guests): `any` 0 · `console.*` 0 · `throw new Error(` 0 · forbidden imports 0 · default export 0 · `.skip` 0.

Security check
- Tenant scope on every query (G5); cross-tenant masked as 404 (§7). PII masking at serializer (G6). `wa_phone` immutable in PATCH. No secrets; no PII in logs. Read-only-ish; no webhook/crypto.

Test evidence
- Unit/component: **28** (service 22 + routes 6). Integration: **10**. Total **38**. Files listed above.
- Sample list envelope (ratified Q-B-04):
  ```json
  { "data": [ { "id": "…", "name": "Budi Santoso", "wa_phone": "+6281234567890",
      "email": "budi@example.com", "privacy_mode": "standard", "is_vip": false,
      "vip_level": null, "total_stays": 0, "created_at": "…", "updated_at": "…" } ],
    "pageInfo": { "page": 1, "pageSize": 20, "total": 5, "hasMore": false } }
  ```

Notes / open items
- Same merge posture as T11/T13: buildable + fully testable now; live once `api.ts` bootstrap wires `configureTenantGuardHooks` + `register(guestsRoutes)` (DEP-4, foundation — untouched).
- **T-CLEAN-01** obligation preserved: masking helpers ready for a clean promote-to-`@shared` move (bodies identical; guests already uses the general signature).
- Guest `/messages` (T15) is a separate cursor-paginated task — not in this PR.

Requesting PM B VERDICT.

##### VERDICT T14 — APPROVED (attempt 1) by PM B (2026-07-02, H13)
Verified by **my own rerun** on `feat/guests-crud` @ `f4c4fd8` (checkout + `pnpm prisma:generate` + read code).

**Quality gates (PM rerun):**
- `make check` → **PASS**: lint/format/typecheck clean, **131 passed + 2 skipped** (2 = `_template`). No tickets regression (disjoint module).
- Coverage (PM rerun) — guests lines **97.95%**: repository 100 / types 100 / serializer 100 / service 97.43 / routes 97.14 / schema 97.36. Every file ≥80% ✓ G8. (38 guests tests.)
- Integration green (real PG, testcontainers).
- **Drift** (guests): any 0 · console 0 · throw-Error 0 · default-export 0 · `.skip` 0 · forbidden imports 0 · **cross-module internal import 0** (only `@core`/`@plugins`/`@shared`/`@prisma` + intra-module).
- **File inventory**: 10 files, all in `src/modules/guests/`, 0 outside.

**DoD spot-verified in code:**
- G1 ✓ `/guests` list + `q`-search + offset pagination; envelope = ratified **Q-B-04** `{data,pageInfo:{page,pageSize,total,hasMore}}` (`service.ts:64-68`, `hasMore = page*pageSize<total`).
- G3 ✓ `PATCH` `UpdateGuestSchema.strict()` (`schema.ts:41`) — **wa_phone + unknown keys rejected** (immutable, as ACK'd); only name/privacy_mode/is_vip mutable.
- G4 ✓ `POST /preferences` **upsert by `preference_type`** via Prisma composite-unique upsert (`repository.ts:51-54`).
- G5 ✓ tenant scope + gm_admin (super_admin explicit); cross-tenant `:id`→404 (`assertHotelOwnership`).
- G6 ✓ **mask predicate byte-identical to tickets** (`serializer.ts:2` comment + `:19-21` predicate matches). T-CLEAN-01 (promote to `@shared`) queued as agreed — correctly NOT done here.
- G2 ✓ detail embeds `preferences[]` + `visits[]` (Q-B-05 shape, module-local — no visits-module import). G7 ✓ AppError + correlationId + layout.

**Merge status (for PO):**
- **CODE APPROVED** on `feat/guests-crud` @ `f4c4fd8`. Attempt 1, zero rejects.
- **Merge dry-run into main: CLEAN ✓** (main is only doc-commits ahead; disjoint from tickets). **→ PO: merge `feat/guests-crud` — this is the branch to merge FIRST.**
- → §1 tracker updated (approved); PARENT §1 T14 → approved; roll-up PARENT §2.

Clean first pass. **T14 closed.** T-CLEAN-01 (masking→@shared) stays queued for after guests lands. 🟢

##### PM B RULING — GAP T16-#4 (2026-07-02, H13) — class owner + wire shape
Verified your analysis against `core/errors/app-errors.ts` (confirmed: 409→429, **no 422 class**) + README:88 + spec §7. Both parts ruled:

**① Wire shape — RULED (from spec):** envelope `code = "BUSINESS_RULE"` (the FE-handled 422 category per README:88 — FE's optimistic-rollback switches on this), and the **specific violation goes in `details`**: `details: { rule: "INVALID_VISIT_TRANSITION", from, to }`. NOT `code: "INVALID_VISIT_TRANSITION"` — that wouldn't match FE's generic 422 handler. Same pattern for T12 (`rule: "INVALID_TICKET_TRANSITION"`). This is the §1.2 "422 BUSINESS_RULE code INVALID_*_TRANSITION" reading: BUSINESS_RULE = category, INVALID_* = the rule in details.

**② Class owner — Option A APPROVED (NOT B).** `BusinessRuleError(422)` belongs in `core/errors` = **foundation/Slot A** (maps to their **T07** "Common error handlers, HC codes per §7"). I am NOT blessing a Slot-B core edit (option B) — the class is **shared with T12**, so foundation ownership is correct and keeps the "0 core edits" boundary intact. **Escalated as DEP-6 to Parent §3b/§10** — recommending Slot A ship `BusinessRuleError` (statusCode 422, code `BUSINESS_RULE`, accepts a `details.rule`) now, as it unblocks **T16 V2–V5 AND T12**.
- **Meanwhile**: V1 (read-path) stays on the branch — correct call to checkpoint, not force a core hack. The moment DEP-6 lands, add V2–V5 + tests → full SUBMIT. I'll verdict then.
- Your `recordVisitAudit` no-op seam (T16-#1) + `config.TZ` (T16-#3) + guest_name validate-only (T16-#2) rulings from the ACK all stand.

---

### ASSIGNMENT T15 — Guest messages history — issued by PM B (Nathan) 2026-07-02 (H13)
- Branch: `feat/guest-messages` (off latest main — includes merged guests + tickets modules) · Routed from PARENT §1 T15 = MVP §1.2 **B5** · Spec: `02-hotel-core.md §1.3` (`GET /api/guests/:id/messages`, cursor-paginated) + §2.4 DDL (`ticket_messages`)
- Dependency: **T14 ✅ merged** (guests module on main). **Extends `src/modules/guests/`** — you're the only one in this module now (T14 done), so no collision.
- **Inherited floor** (verified at SUBMIT, same as T11/T13/T14): tenant guard via `TenantContext`; `AppError` only; correlationId logging; module layout; no cross-module internal import; zod; ≥80% cov; `make check` + `make test-integration` green; drift 0.

**Scope (role `gm_admin` only) — 1 endpoint**
- `GET /api/guests/:id/messages` — the guest's conversation history, **cursor pagination** (`limit` default 20 max 100, opaque `cursor`).

**Source (verified — flag if FE disagrees):** there is **no standalone guest-messages table**; the guest's messages = **`ticket_messages` across that guest's tickets** (`WHERE ticket.guestId = :id AND ticket.hotelId = ctx.hotelId`). Read `ticket_messages` via Prisma directly — **do NOT import the tickets module** (cross-module). Serialize with the **same message wire shape as tickets §1.2** (`{id, ticket_id, sender, sender_user_id, body, media, conversation_id, sent_at, delivered_at, read_at}`) — module-local serializer conforming to that shape.

**DoD**
- [ ] M1 — endpoint returns the guest's `ticket_messages` history, cursor-paginated (keyset on `(sent_at, id)`; reuse the T11 keyset *pattern* but a **module-local codec** — do not import tickets'). Envelope = ratified list shape `{ data, pageInfo: { nextCursor, hasMore } }` (cursor, per Q-B-01/§2.7).
- [ ] M2 — message wire shape conforms to tickets §1.2 `messages[]` (snake_case). Ordering: **propose in PLAN (Q-B-10)** — newest-first (chat scrollback) vs chronological; pin against FE MSW.
- [ ] M3 — tenant + guest-ownership guard: guest not in `ctx.hotelId` → `NotFoundError` 404 (reuse `assertHotelOwnership` on the guest row before querying messages). gm_admin only.
- [ ] M4 — no PII masking on message *bodies* (masking §4.5 governs guest identity fields, not conversation content; and this is gm_admin-only anyway) — confirm in PLAN, don't silently mask.
- [ ] M5 — tests: unit (cursor codec, scope/where build) + integration (seed guest + ≥2 tickets + messages across them; assert aggregation, ordering, pagination, tenant/guest isolation, 404 for cross-tenant guest).
- [ ] M6 — layout/drift/coverage/`make check`+integration per floor.

**Open Q / notes**
- **Q-B-10** — confirm message source (aggregate `ticket_messages` by guest) + ordering + cursor envelope. Propose in PLAN.
- **Cursor-codec duplication**: T11 + T15 both need a base64 keyset codec. Keep module-local now; I'm noting **T-CLEAN-02** (promote a generic cursor codec to `@shared/utils/`, alongside T-CLEAN-01 masking) as a post-CRM cleanup. Don't do it in this PR.

**Session-start gate**: confirm identity, read §1.3 + §2.4 `ticket_messages` DDL, `make typecheck`/`make lint` clean. Then PLAN. **No code before PM B ACK.**

Awaiting exec-B PLAN for T15.

### ASSIGNMENT T15 — claimed by exec-B (Nathan) at H2 (2026-07-02)
- Branch: `feat/guest-messages` (off latest main; created on ACK) · Routed from PARENT §1 T15 = MVP §1.2 B5
- Claiming the PM-B-issued ASSIGNMENT above. PLAN below.

#### PLAN T15 — exec-B (Nathan) at H2 (2026-07-02)

**Scope recap**
One `gm_admin`-only endpoint `GET /api/guests/:id/messages` — the guest's conversation history, **cursor-paginated**. No standalone table: aggregate `ticket_messages` across the guest's tickets. **Extends the existing `src/modules/guests/` module** (I own it post-T14) — read `ticket_messages` via Prisma directly, do NOT import the tickets module.

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity: Executor, Slot B (Nathan) ✓ · CLAUDE.md loaded ✓
- Spec read: `02-hotel-core.md §1.3` (`GET /guests/:id/messages`) + §2.4 DDL (`ticket_messages` — `hotel_id`, `ticket_id`, `sender`, `sender_user_id`, `body`, `media`, `conversation_id`, `sent_at`, `delivered_at`, `read_at`) + tickets §1.2 `messages[]` wire shape; envelope `README §2.7`
- Dependency: T14 ✅ merged (guests module on main); no other executor in this module.
- `pnpm typecheck` clean ✓ ; `pnpm lint` clean ✓ (on `main`).
- Scaffolder risk: **none** (no new deps; extends existing module).

**Files to modify** (all in `src/modules/guests/` — extend, no new module)
- `guests.types.ts` — add `MessageWire` (tickets §1.2 shape), `MessageCursor`, `MessageListQuery`, `GuestMessagesResponse`, `TicketMessageRow` (`Prisma.TicketMessageGetPayload`).
- `guests.schema.ts` — add `parseMessagesQuery` (limit default 20 / max 100 + opaque `cursor`) + `encodeMessageCursor`/`decodeMessageCursor` (module-local base64 keyset codec).
- `guests.serializer.ts` — add `serializeMessage` (snake_case, conforms to tickets §1.2 `messages[]`).
- `guests.repository.ts` — add `findGuestMessages(where, take)` (Prisma `ticketMessage.findMany`).
- `guests.service.ts` — add `messages(ctx, id, rawQuery)`: load guest (`findById`) → `assertHotelOwnership` (404) → build keyset where → serialize.
- `guests.routes.ts` — add `GET /guests/:id/messages`.
- `index.ts` — export `GuestMessagesResponse` + `MessageWire`.
- `__tests__/guests.service.test.ts` — cursor codec + where-build + service (fake repo) unit.
- `__tests__/guests.repository.integration.test.ts` — seed guest + ≥2 tickets + messages across them; assert aggregation, ordering, pagination, tenant/guest isolation, 404.

**Approach**
- **Source (Q-B-10)**: `ticket_messages` filtered by `hotelId: ctx.hotelId` (denormalized, indexed — explicit super_admin bypass drops it) **AND** `ticket: { guestId: id }` (relation filter). Guard first: load the guest row + `assertHotelOwnership(ctx, guest.hotelId, 'Guest')` → cross-tenant/missing guest = `NotFoundError` 404 (M3). gm_admin-only gate = T04 preHandler (N3).
- **Ordering (Q-B-10, propose)**: **newest-first** — `ORDER BY sent_at DESC, id DESC`. Rationale: this is a *paginated scrollback* (page 1 = latest, cursor loads older), unlike tickets `:id` detail which returns the full thread `sent_at ASC`. **My intent: DESC.** Pin against FE MSW; one-file flip if it wants ASC.
- **Cursor (M1)**: module-local base64 codec of `{ sentAt: ISO, id }`; keyset via N1 OR-decomposition `[{ sentAt: { lt } }, { sentAt: c.sentAt, id: { lt } }]`; fetch `limit+1` → `hasMore`; invalid cursor → `ValidationError` 400. (Duplicates T11's codec by design — **T-CLEAN-02** promote-to-`@shared` noted, not this PR.)
- **Envelope**: `{ data: MessageWire[], pageInfo: { nextCursor, hasMore } }` (cursor, per Q-B-01/§2.7).
- **No body masking (M4) — confirmed**: §4.5 masks guest *identity* fields, not conversation content; endpoint is gm_admin-only. Messages serialized verbatim (no `maskWaPhone`/`maskName` on `body`). Flagging explicitly, not silently masking.

**Open Q / notes**
- **Q-B-10** — (a) source = aggregate `ticket_messages` by `ticket.guestId` ✓ (per your verified note); (b) ordering = **newest-first DESC** (proposed); (c) envelope = cursor `{data, pageInfo:{nextCursor,hasMore}}`. Confirm (b) against FE MSW.
- **T-CLEAN-02** acknowledged (generic cursor codec → `@shared`), post-CRM; keeping module-local now.

**Merge posture**: same as T11/T13/T14 — buildable + fully testable now (inject `TenantContext`); live once `api.ts` bootstrap wires `register(guestsRoutes)` (DEP-4, foundation — not touched). `make prisma-generate` before CI (T-INFRA-01).

Awaiting PM B ACK (PLAN + Q-B-10 ordering/source/envelope + M4 no-body-masking confirm). Not coding before ACK.

##### PM B ACK — T15 PLAN APPROVED (2026-07-02, H13)
Clean PLAN, fully consistent with the assignment + schema (`TicketMessage.ticketId → Ticket.guestId` path confirmed). **ACK — create `feat/guest-messages`, implement.** No required fixes.

**Q-B-10 — RATIFIED (all three):**
- **(a) source** — `ticket_messages WHERE hotelId = ctx.hotelId AND ticket.guestId = :id`, gated by loading the guest first + `assertHotelOwnership` → 404 cross-tenant. Correct (defense-in-depth: guest-existence check before message query). Read via Prisma (`where: { hotelId, ticket: { guestId } }`) — no tickets-module import ✓.
- **(b) ordering — newest-first APPROVED** (`sent_at DESC, id DESC`). Your distinction is right: this endpoint is paginated **scrollback** (page 1 = latest, cursor loads older), vs the ticket `:id` detail which embeds the full thread ASC. Provisional on FE MSW — one-file flip if it wants ASC.
- **(c) envelope** — `{ data, pageInfo: { nextCursor, hasMore } }` (cursor, per Q-B-01/§2.7) ✓.

**M4 — no body masking CONFIRMED.** §4.5 masks guest *identity* fields (name/phone/email), not conversation *content*; endpoint is gm_admin-only regardless. Serialize message bodies verbatim. Good that you flagged rather than assumed.

**Advisory (not blocking):** keep the keyset tiebreaker on `id` (as you have it) so pagination is stable when multiple messages share a `sent_at` — same pattern as T11's cursor. Reuse that keyset logic conceptually; the module-local codec is fine (T-CLEAN-02 promotes it to `@shared` later — correctly NOT in this PR).

**At SUBMIT I verify:** M1–M6, cursor keyset stability + ordering, tenant/guest 404, no cross-module import, message shape conforms to tickets §1.2, drift, make check + integration (seed guest + ≥2 tickets + messages across them), ≥80% cov. Merge posture same as T11/T13/T14.

Proceed. 🟢

### SUBMIT T15 — exec-B (Nathan) at H2 (2026-07-02) (attempt 1)

Task: Guest messages history — `GET /api/guests/:id/messages` (cursor-paginated, aggregated `ticket_messages`)
Branch: **`feat/guest-messages`** (pushed; commit `1355204`) — **PO merges to main manually**. Code NOT on main.
Files changed: 10 modified, **all** in `src/modules/guests/` (extended the module; 0 outside — no tickets-module import, no `api.ts`/`prisma`/`core` edits)
  - `guests.types.ts` (+`MessageWire`/`MessageCursor`/`MessageListQuery`/`GuestMessagesResponse`/`TicketMessageRow`), `guests.schema.ts` (+`parseMessagesQuery` + module-local cursor codec), `guests.serializer.ts` (+`serializeMessage`), `guests.repository.ts` (+`findGuestMessages`), `guests.service.ts` (+`buildGuestMessagesWhere` + `messages()`), `guests.routes.ts` (+`GET /guests/:id/messages`), `index.ts` (exports)
  - `__tests__/`: service (+8 unit), routes (+1 component), integration (+4 + seed tickets/messages)

DoD self-check
- [x] **M1** — endpoint returns the guest's `ticket_messages` history, cursor-paginated; keyset on `(sent_at, id)` via a **module-local** codec (N1 OR-decomposition, `id` tiebreaker per advisory). Envelope `{ data, pageInfo: { nextCursor, hasMore } }`. Invalid cursor → 400.
- [x] **M2** — message wire conforms to tickets §1.2 `messages[]` (snake_case: `{id, ticket_id, sender, sender_user_id, body, media, conversation_id, sent_at, delivered_at, read_at}`). Ordering = **newest-first** (`sent_at DESC, id DESC`) per ratified Q-B-10. Integration asserts `['a2-new','a1-mid','a1-old']`.
- [x] **M3** — tenant + guest-ownership guard: guest loaded first + `assertHotelOwnership` → cross-tenant guest = `NotFoundError` 404. Message query scoped `hotelId = ctx.hotelId AND ticket.guestId = :id` (explicit super_admin bypass). gm_admin-only gate = T04 preHandler (N3). Integration: cross-tenant 404 + other-guest/other-hotel messages excluded.
- [x] **M4** — **no PII masking on message bodies** (confirmed with PM); §4.5 governs identity fields, not conversation content; gm_admin-only. `serializeMessage` emits body verbatim.
- [x] **M5** — unit (cursor codec round-trip + invalid, `buildGuestMessagesWhere` scope/keyset, service pagination/404) + integration (seed guest + 2 tickets + 3 messages across them + decoy other-guest/other-hotel messages; aggregation, ordering, cursor pagination across 2 pages, tenant/guest isolation, 404, empty-history).
- [x] **M6** — layout consistent (extended module, no new files); **no cross-module import** (reads `ticket_messages` via Prisma, tickets module untouched); drift 0; **changed-file line coverage 97.38%** (repo 100 / routes 97.56 / schema 94.91 / serializer 100 / service 98.3 / types 100); `make check` + `make test-integration` green.

Quality gate
- `make check`: **PASS** (**144 passed, 2 skipped** template placeholders; tickets + guests-CRUD suites green → no regression)
- `make test-integration`: **PASS** (guests **14** [10 CRUD + 4 messages] + tickets 17 via testcontainers)
- ⚠ CI ordering unchanged: `make prisma-generate` before `make check`/tests (T-INFRA-01).

Drift scans (src/modules/guests): `any` 0 · `console.*` 0 · `throw new Error(` 0 · forbidden imports 0 · default export 0 · `.skip` 0.

Security check
- Tenant + guest-ownership scope on every message query (M3); cross-tenant masked 404 (§7). No body masking by design (M4, gm_admin-only). No secrets/PII in logs.

Test evidence
- Unit/component: **46** (service 39 + routes 7). Integration: **14**. Total **60** in the module.
- Sample messages envelope (Q-B-10, newest-first):
  ```json
  { "data": [ { "id": "…", "ticket_id": "…", "sender": "staff", "sender_user_id": null,
      "body": "a2-new", "media": null, "conversation_id": null,
      "sent_at": "2026-06-11T09:00:00.000Z", "delivered_at": null, "read_at": null } ],
    "pageInfo": { "nextCursor": "eyJzZW50QXQiOiIuLi4ifQ", "hasMore": true } }
  ```

Notes / open items
- Same merge posture as T11/T13/T14: buildable + fully testable now; live once `api.ts` bootstrap wires `register(guestsRoutes)` (DEP-4, foundation — untouched).
- **T-CLEAN-02** obligation preserved: the base64 keyset codec duplicates T11's by design — ready for a `@shared` promote later, not this PR.

Requesting PM B VERDICT.

##### VERDICT T15 — APPROVED (attempt 1) by PM B (2026-07-02, H13)
Verified by **my own rerun** on `feat/guest-messages` @ `1355204` (checkout + `pnpm prisma:generate` + read code).

**Quality gates (PM rerun):**
- `make check` → **PASS**: **144 passed + 2 skipped** (2 = `_template`). No regression on the merged guests/tickets modules.
- Coverage (PM rerun) — guests lines **97.46%**: repository 100 / types 100 / serializer 100 / service 98.3 / routes 97.56 / schema 94.91. Every file ≥80% ✓ M6. (51 guests tests.)
- Integration green (real PG).
- **Drift** (guests): any 0 · console 0 · throw-Error 0 · default-export 0 · `.skip` 0 · forbidden imports 0 · **cross-module internal import 0** (reads `ticket_messages` via Prisma, no tickets-module import).
- **File inventory**: 10 files, all in `src/modules/guests/`, 0 outside. **Merge dry-run into main: CLEAN ✓.**

**DoD spot-verified in code:**
- M1 ✓ aggregation `buildGuestMessagesWhere` (`service.ts:59-75`) = `[{ ticket: { guestId } }]` + tenant `hotelId` (super_admin bypass explicit) + **keyset OR in its own AND arm** (N1 discipline preserved); `orderBy [sentAt desc, id desc]` (`repository.ts:75`) — newest-first as ratified. Envelope `{data,pageInfo:{nextCursor,hasMore}}`.
- M2 ✓ message wire shape conforms to tickets §1.2 (module-local serializer, 100% cov). Provisional on FE MSW.
- M3 ✓ **404 guard**: `messages()` loads guest first → `NotFoundError` if missing, then `assertHotelOwnership(ctx, guest.hotelId)` → 404 cross-tenant, THEN queries messages (`service.ts:147-160`). Defense-in-depth exactly as ACK'd.
- M4 ✓ no body masking (verbatim) — as ratified.
- M5 ✓ integration seeds guest + multiple tickets + messages (aggregation + isolation asserted). M6 ✓ (coverage/drift above).
- Q-B-10 (a/b/c) all implemented as ratified.

**Merge status (for PO):**
- **CODE APPROVED** on `feat/guest-messages` @ `1355204`. Attempt 1, zero rejects. Merges CLEAN into main.
- **→ PO: merge `feat/guest-messages` when ready.** (Disjoint concern from T16's branch — safe any order.)
- → §1 tracker updated (approved); PARENT §1 T15 → approved; roll-up PARENT §2.

Clean first pass. **T15 closed.** 🟢

---

### NUDGE T16 — V2–V5 UNBLOCKED (2026-07-02, H14): DEP-6 landed, resume
The blocker is gone: **`BusinessRuleError` (422) is now on main** (`core/errors/app-errors.ts:104`, code `BUSINESS_RULE`) via T07-slice-1. **Resume V2–V5** on `feat/visits-list-verify`:
- **Rebase `feat/visits-list-verify` onto latest main first** (picks up `BusinessRuleError` + T-INFRA-01 prisma-client — then you can drop the `pnpm prisma:generate` workaround).
- For the V3 invalid-transition throw, use `throw new BusinessRuleError('...', { rule: 'INVALID_VISIT_TRANSITION', from, to })` — the wire shape I ruled (envelope `code='BUSINESS_RULE'`, specific rule in `details`). Visits have their own status set, so **don't** import the tickets state-machine — a small module-local transition guard for `pending_verification → checked_in/rejected` is right.
- All other T16-#1/#2/#3 rulings stand. Post the full **SUBMIT** when V2–V6 are complete + green.

#### SUBMIT T16 — exec-B (Nathan) at H14 (2026-07-02) (attempt 1)

Task: Visits list + verify-manual (approve/reject) — `GET /api/visits` + `PATCH /api/visits/:id/verify-manual`
Branch: **`feat/visits-list-verify`** @ `1c502f3` (rebased onto latest main per NUDGE; **PO merges to main manually** — code NOT on main). 11 files, +1230, all in `src/modules/visits/` (0 core/prisma/api.ts edits).
  - visits.types.ts (domain + wire DTOs + VerifyManualInput + offset envelope)
  - visits.schema.ts (zod list-query + `:id` param + dual-mode verify-manual body)
  - visits.serializer.ts (canonical 13-field Visit shape — Q-B-05, owns it)
  - visits.checkout.ts (pure checkout derivation, dayjs+tz — GAP T16-#3 seam)
  - visits.repository.ts (Prisma direct; offset paged list + status-guarded verifyManualTx)
  - visits.service.ts (scope + offset paging + verify-manual approve/reject + transition guard)
  - visits.routes.ts (Fastify plugin: GET /visits + PATCH /visits/:id/verify-manual)
  - index.ts (barrel: visitsRoutes + buildVisitsService(db, deps))
  - __tests__/visits.service.test.ts (unit, 30) · visits.routes.test.ts (component, 4) · visits.repository.integration.test.ts (integration, 12)

DoD self-check
- [x] **V1** — `GET /visits` tenant-scoped list (`WHERE hotelId=ctx.hotelId`, explicit super_admin bypass; visits not dept-scoped), `?status` CSV over the 6-enum, **offset** paging (`page`/`pageSize` clamp ≤100), `orderBy createdAt desc,id desc`. Envelope = ratified **Q-B-04** `{data,pageInfo:{page,pageSize,total,hasMore}}`, `hasMore=page*pageSize<total`.
- [x] **V2** — verify-manual **atomic**: status-guarded `updateMany({where:{id,hotelId,status:'pending_verification'},data})` inside `$transaction`; `count===1` wins, `0` → re-resolve (404 if gone / 422 concurrency). No partial state (integration asserts DB unchanged on 422/404). **Audit trail** = `recordVisitAudit` **no-op seam** (GAP T16-#1, approach A — no visit audit table exists; Q-B-09 pending; a row moves into this same tx when the table lands). **Socket** `verification:resolved` = `onVerificationResolved` no-op seam (T20). Neither wired here.
- [x] **V3** — valid transitions only: `pending_verification → checked_in` (approve) / `→ rejected` (reject); any other current status → **`BusinessRuleError` (422)**, envelope `code='BUSINESS_RULE'` + `details:{rule:'INVALID_VISIT_TRANSITION',from,to}` (your DEP-6 wire ruling). **Module-local guard — no tickets state-machine import** (per NUDGE). failed_verification/others left to T17.
- [x] **V4** — checkout derivation: `check_out` = check-in calendar date **+ nights @ 11:00 local** via `dayjs.tz(config.TZ)`; `nights` zod **1–7** (stricter than DDL 1–30). Unit-verified UTC + Asia/Jakarta; integration asserts persisted `2026-06-13T11:00:00Z` for a 2-night approve.
- [x] **V5** — tenant guard + gm_admin surface; cross-tenant `:id` → `NotFoundError` 404 via `assertHotelOwnership` (integration: hotel-B visit invisible + untouched from gmA). `hotel_id` never from URL/body. (Endpoint-level RBAC "who may call" = T04 preHandler, not hand-rolled here — seam noted.)
- [x] **V6** — unit (transition guard, checkout derivation, status-filter build, offset math, super_admin bypass, verify-manual approve/reject/422/404/concurrency, seam firing with ctx.userId) + integration (seed 6 statuses across 2 hotels; verify-manual tx atomicity; invalid→422 no-mutate; cross-tenant→404 no-mutate; list filter/paging/tenant-isolation). No Prisma mock.

Quality gate (my rerun on the branch)
- `make check`: **PASS** (prisma-generate + lint + format-check + typecheck + unit; 205 passed, 1 skip = `_template` placeholder — 0 `.skip` in visits).
- `make test-integration` (visits): **PASS** — 12 tests, real Postgres via testcontainers (~6.5s).
- Coverage (changed files): checkout/repository/serializer/schema/types **100%** line · service **96.15%** · routes **95.65%** — all ≥80% (V6).
- Rebase picked up T-INFRA-01 → **dropped the `pnpm prisma:generate` workaround** (`make check` generates now).

Drift scans (src/modules/visits)
- `any` 0 · `console.*` 0 · `throw new Error(` 0 · forbidden imports (express/typeorm/moment/node-fetch) 0 · default export 0 · `.skip` 0 · cross-module internal import 0.

Security check
- Tenant scope on every query; cross-tenant masked 404 (anti-enumeration §7). No PII in the Visit wire shape (guest_id only) → §4.5 masking N/A here. No secrets. HMAC/crypto N/A (no webhook). verify-manual mutates only within-tenant, status-guarded.

Sample (verify-manual approve, from integration)
```
PATCH /api/visits/:id/verify-manual  { "guest_name":"Budi Santoso", "room_number":"1204", "nights":2 }
→ 200 { "data": { "id":"…", "status":"checked_in", "room_number":"1204", "nights":2,
                  "check_out":"2026-06-13T11:00:00.000Z", … } }   // check_in 2026-06-11T00:00Z
invalid (visit already checked_in) → 422 { "error": { "code":"BUSINESS_RULE",
  "message":"…", "details": { "rule":"INVALID_VISIT_TRANSITION", "from":"checked_in", "to":"rejected" } } }
```

Notes / open items for PM
- **Merge gate (same as T11/T14)**: routes answer 401 until T04 wires the `req.tenant` preHandler (DEP-1 runtime) — not a code-quality blocker; service+repo fully tested by injecting `TenantContext`. Not mergeable to main until T04 (PO gate).
- **GAP T16-#1 / Q-B-09**: shipped approach A (`recordVisitAudit` no-op seam). When Parent rules Q-B-09 (visit audit table), the audit insert moves inside `verifyManualTx`'s `$transaction` — one-spot change.
- **Q-B-08 (guest_name)**: validate-only, no cross-write to `guests` — confirmed in code.

Requesting PM B VERDICT.

##### VERDICT T16 — APPROVED (attempt 1, full V1–V6) by PM B (2026-07-02, H14)
Verified by **my own rerun** on `feat/visits-list-verify` @ `1c502f3` (rebased onto main as directed — confirmed clean rebase).

**Quality gates (PM rerun):**
- `make check` → **PASS**: **205 passed + 1 skipped**, 1.1s (no-Docker).
- `make test-integration` → **PASS** (real PG): tx atomicity, 422 no-mutate, cross-tenant 404 no-mutate.
- Coverage (PM rerun) — visits lines **98.01%**: checkout 100 / repository 100 / serializer 100 / types 100 / schema 100 / service 96.15 / routes 95.65. Every file ≥80% ✓ V6. (44 visits tests.)
- **Drift** (visits): any 0 · console 0 · throw-Error 0 · default-export 0 · `.skip` 0 · forbidden imports 0 · **cross-module internal import 0** (module-local transition guard — does NOT import the tickets state-machine ✓).
- **File inventory**: 11 files, all in `src/modules/visits/`, 0 outside. **Merge dry-run into latest main: CLEAN ✓.**

**DoD spot-verified in code:**
- V1 ✓ `GET /visits` list + `?status` filter + offset pagination (Q-B-04 `{data,pageInfo:{page,pageSize,total,hasMore}}`) + canonical `visits.serializer.ts` (Q-B-05 shape).
- V2 ✓ `verify-manual` **atomic** — status-guarded `updateMany({where:{...status:PENDING}})` in `$transaction`; `count===0` → re-resolve 404 (gone) vs 422 (concurrent) (`service.ts:121-133`). No partial state (integration: 422 no-mutate, 404 no-mutate).
- V3 ✓ explicit `assertPendingVerification` guard (`service.ts:118`) → `BusinessRuleError(422)` `details.rule='INVALID_VISIT_TRANSITION'` (DEP-6 wire shape as ruled). Transitions pending_verification → checked_in/rejected only.
- V4 ✓ checkout derivation `deriveCheckout(checkIn, nights, config.TZ)` = checkIn.tz + nights @ 11:00 local (`visits.checkout.ts`, dayjs+tz seam per GAP T16-#3); nights 1–7 zod.
- V5 ✓ tenant guard (`assertHotelOwnership`) cross-tenant → 404.
- GAP T16-#1 `recordVisitAudit` no-op seam + T20 `onVerificationResolved` no-op seam, `actorUserId: ctx.userId` (DEP-5) ✓. GAP T16-#2 guest_name validate-only ✓.

**Merge status (for PO):**
- **CODE APPROVED** on `feat/visits-list-verify` @ `1c502f3` (force-pushed post-rebase, PM-directed — branch-own, fine). Attempt 1, zero rejects. **Merges CLEAN into latest main.**
- Merge gate (same as T11/T14): routes 401 until T04 preHandler wires `req.tenant` — quality-clean, PO/foundation gate (DEP-4), not a blocker.
- **→ PO: merge `feat/visits-list-verify`.**
- → §1 tracker updated (approved); PARENT §1 T16 → approved; roll-up PARENT §2. **T16 merge unblocks T17 + T18.**

Clean, well-reasoned (the optimistic-concurrency guard + TZ seam are exactly right). **T16 closed — visits module complete.** 🟢

---

### ASSIGNMENT T17 — Visit reject + failed_3x override — issued by PM B (Nathan) 2026-07-02 (H14)
- Branch: `feat/visits-reject-override` (off latest main — includes merged T16 visits module) · Routed from PARENT §1 T17 = MVP §1.2 **B7** · Spec: `02-hotel-core.md §1.3` (endpoints L100-101 + failed_3x flow L113-115) + §2.3 DDL (`visits`)
- Dependency: **T16 ✅ merged.** **Extends `src/modules/visits/`** (you own it; single-task, no collision). **Reuse** T16's transition tx pattern + `deriveCheckout` + canonical serializer + `BusinessRuleError` — do NOT duplicate.
- **Inherited floor** (verified at SUBMIT): tenant guard via `TenantContext` (gm_admin-only); `AppError` only; correlationId; module layout; no cross-module import; zod; ≥80% cov; `make check`+integration green; drift 0. `ctx.userId` available (DEP-5). No prisma-generate workaround needed.

**Scope (2 endpoints, role `gm_admin`)**
- `PATCH /api/visits/:id/reject` — reject a `pending_verification` visit → status `rejected`. (Dedicated endpoint; same transition as T16's verify-manual reject-mode — **reuse the shared transition tx**, don't fork the logic. Q-CONTRACT-15 = backend's call: both paths coexist.)
- `PATCH /api/visits/:id/approve-manual` `{ guest_name, room_number, nights? }` — **failed_3x override**: approve a `failed_verification` visit → status `checked_in`. Different source-state than verify-manual (that's from `pending_verification`).

**DoD**
- [ ] R1 — `/reject`: `pending_verification → rejected`, atomic status-guarded tx (reuse T16's `verifyManualTx`-style guard + `count===0` re-resolve 404/422). Invalid source-state → `BusinessRuleError(422)` `details.rule='INVALID_VISIT_TRANSITION'`.
- [ ] R2 — `/approve-manual`: **`failed_verification → checked_in`** only (invalid source → 422). `nights?` optional; if provided, derive checkout via the existing `deriveCheckout(checkIn, nights, config.TZ)`; `room_number`/`guest_name` handled like T16 (guest_name **validate-only**, no cross-write to `guests`).
- [ ] R3 — **Generalize the visit transition guard**: T16 has a `pending_verification`-specific assert. Extend it to a small **module-local transition map** (`pending_verification→{rejected,checked_in}`, `failed_verification→{checked_in}`) so both T16's and T17's transitions validate through one source (§4.2-style; still module-local — do NOT import tickets' state-machine). Refactor is fine; **T16's existing tests must stay green**.
- [ ] R4 — tenant guard + 404 (cross-tenant `assertHotelOwnership`); gm_admin (super_admin bypass). Audit + `verification:resolved` (T20) via the existing no-op seams; `actorUserId=ctx.userId`.
- [ ] R5 — tests: unit (transition map, checkout on approve-manual) + integration (reject a pending → rejected; approve-manual a failed_verification → checked_in; **invalid source-state → 422 no-mutate**; cross-tenant 404 no-mutate; tx atomicity). ≥80% cov. `make check`+integration green.

**Open Q**: Q-B-12 (if any) — does `/reject` accept an optional reason/note? And does `approve-manual` require `nights` or default it? Propose in PLAN against §1.3 + FE MSW; don't guess.

**Session-start gate**: identity, read §1.3 (reject/approve-manual + failed_3x flow) + the merged `visits/` module (reuse points), `make typecheck`/`make lint` clean. Then PLAN. **No code before PM B ACK.**

Awaiting exec-B PLAN for T17.

### ASSIGNMENT T17 — claimed by exec-B (Nathan) at H2 (2026-07-02)
- Branch: `feat/visits-reject-override` (off latest main incl. merged T16; created on ACK) · Routed from PARENT §1 T17 = MVP §1.2 B7
- Claiming the PM-B-issued ASSIGNMENT above. PLAN below.

#### PLAN T17 — exec-B (Nathan) at H2 (2026-07-02)

**Scope recap**
Two `gm_admin`-only endpoints, **extending the merged `src/modules/visits/`**: `PATCH /api/visits/:id/reject` (`pending_verification → rejected`) and `PATCH /api/visits/:id/approve-manual` (failed_3x override: `failed_verification → checked_in`). Reuse T16's `verifyManualTx` (generic status-guarded tx), `deriveCheckout`, canonical serializer, and `BusinessRuleError` — no forking.

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity: Executor, Slot B (Nathan) ✓ · CLAUDE.md loaded ✓
- Spec read: `02-hotel-core.md §1.3` (reject L100 + approve-manual L101 + failed_3x flow L113-115) + §2.3 DDL (`visits` status CHECK) + §7; merged `visits/` module (reuse points: `verifyManualTx`, `deriveCheckout`, `serializeVisit`, `assertPendingVerification`→to-generalize)
- Dependency: T16 ✅ merged; `ctx.userId` available (DEP-5). Extends visits module (I own it, single-task).
- `pnpm typecheck` + `pnpm lint` clean on `main` ✓. No prisma-generate/Docker workaround.
- Scaffolder risk: **none**.

**Files to modify** (all in `src/modules/visits/`)
- `visits.service.ts` — **R3: replace `assertPendingVerification` with a module-local `VISIT_TRANSITIONS` map + `assertVisitTransition(from, to)`**; add `reject()` + `approveManual()`; verify-manual switches to the generalized assert (behavior identical — see below).
- `visits.schema.ts` — add `parseApproveManual` (`{ guest_name, room_number, nights? }`, `.strict()`); `/reject` body handling per Q-B-12.
- `visits.types.ts` — add `ApproveManualInput`.
- `visits.routes.ts` — add `PATCH /visits/:id/reject` + `PATCH /visits/:id/approve-manual`.
- `visits.repository.ts` — **reuse `verifyManualTx` as-is** (already generic: `{ id, hotelId, from, data }`); no new method. (Add a one-line doc note that it serves all guarded visit transitions.)
- `__tests__/` — extend service unit (transition map, approve-manual checkout) + routes component + integration (reject, approve-manual, invalid-source→422, cross-tenant→404, atomicity). **T16 tests must stay green.**

**Approach**
- **R3 transition map (single source, module-local — NOT tickets' state-machine):**
  ```
  VISIT_TRANSITIONS = { pending_verification: ['checked_in','rejected'], failed_verification: ['checked_in'] }
  assertVisitTransition(from, to): throw BusinessRuleError({rule:'INVALID_VISIT_TRANSITION', from, to}) if to ∉ map[from]
  ```
  Each endpoint pre-checks `assertVisitTransition(row.status, to)` (row.status as `from` → truly-invalid target throws *before* the tx, preserving T16's "before writing" + its `details:{from:row.status,to}` assertion) AND passes its **fixed expected source** to `verifyManualTx({ from: EXPECTED, data })` (the DB guard enforces per-endpoint source; a wrong-but-map-valid source → `count===0` → re-resolve → 422). Net: T16's verify-manual behavior is byte-identical; the new endpoints are source-restricted (R1/R2).
- **`/reject`**: expected source `pending_verification`, `data={ status:'rejected' }`. Reuses the exact reject transition T16's verify-manual reject-mode uses (Q-CONTRACT-15 both-paths-coexist).
- **`/approve-manual`**: expected source `failed_verification`, `data={ status:'checked_in', roomNumber, ...(nights ? { nights, checkOut: deriveCheckout(checkIn, nights, tz) } : {}) }`. `guest_name` **validate-only** (GAP T16-#2 / Q-B-08 — no cross-write to `guests`). Reuses `deriveCheckout`.
- **Guards/seams**: `assertHotelOwnership` (cross-tenant → 404); gm_admin (super_admin bypass); `count===0` re-resolve → 404/422; existing `recordVisitAudit` + `onVerificationResolved` no-op seams fire with `actorUserId=ctx.userId` (T20 wires real emit). Response reuses `serializeVisit`.

**GAP / open question**
- **Q-B-12** — (a) does `/reject` take an optional `reason`/`note`? There is **no `visits` column** for it and the audit table is deferred (Q-B-09), so it has nowhere to persist. **My intent: `/reject` takes no body** (empty; `.strict()` rejects stray keys) — a reason can be added when the audit table lands. (b) does `/approve-manual` require `nights`? **My intent: `nights` OPTIONAL** (per R2) — if provided, derive `check_out`; if absent, leave `check_out`/`nights` unset (status still → `checked_in`). Confirm both against §1.3 + FE MSW; not guessing silently.

**Merge posture**: buildable + fully tested now; live once `api.ts` bootstrap wires `register(visitsRoutes)` (DEP-4, foundation — untouched).

Awaiting PM B ACK (PLAN + Q-B-12 reject-body / approve-manual-nights + R3 generalization approach). Not coding before ACK.

##### PM B ACK — T17 PLAN APPROVED (2026-07-02, H14)
Clean, well-reasoned reuse. **ACK — create `feat/visits-reject-override`, implement.** No required fixes.

**R3 transition map — ENDORSED.** `VISIT_TRANSITIONS = { pending_verification: ['checked_in','rejected'], failed_verification: ['checked_in'] }` + `assertVisitTransition(from,to)`, module-local (not tickets' state-machine) ✓. The two-layer guard is exactly right: (1) pre-tx `assertVisitTransition(row.status, to)` throws `BusinessRuleError` for a truly-invalid target *before* writing (preserves T16's shape), (2) fixed expected-source into `verifyManualTx({from: EXPECTED})` so a map-valid-but-wrong-source → `count===0` → 422. **Requirement**: verify-manual (T16) must stay **byte-identical** through the generalized assert — I'll rerun T16's suites for regression at SUBMIT. The map is correctly scoped to the *manual-verification* transitions only (checkin/checkout/cancel are system-driven, out of T17 scope) — don't expand it.

**Q-B-12 — both RULED:**
- **(a) `/reject` takes no body** — APPROVED. No `visits` column for a reason + audit table deferred (Q-B-09) → nowhere to persist. `.strict()` empty body; add a reason when the audit table lands. Provisional on FE MSW (if FE sends `{action:'reject'}` on the dedicated route, ignore/strip — the `verify-manual {action:'reject'}` path already covers that shape; this dedicated route is the no-body variant per Q-CONTRACT-15 "both coexist").
- **(b) `/approve-manual` `nights` OPTIONAL** — APPROVED. If provided → derive `check_out` via `deriveCheckout`; if absent → `check_out`/`nights` stay null, status still → `checked_in` (DDL allows both null). Correct.

**Confirmed reuse (no forking):** `verifyManualTx` as-is (generic), `deriveCheckout`, `serializeVisit`, `BusinessRuleError`; guest_name validate-only (Q-B-08); `assertHotelOwnership`→404; gm_admin (super_admin bypass); `count===0` re-resolve 404/422; no-op audit + `onVerificationResolved` seams with `actorUserId=ctx.userId`.

**At SUBMIT I verify:** R1–R5, the generalized transition map, **T16 regression green** (verify-manual byte-identical), invalid-source→422 no-mutate + cross-tenant→404 no-mutate + atomicity (integration), approve-manual checkout derivation, drift, `make check`+integration, ≥80% cov.

Proceed. 🟢

---

### ASSIGNMENT T12 — Ticket status transition + reroute — issued by PM B (Nathan) 2026-07-02 (H14)
- Branch: `feat/tickets-transition` (off latest main) · Routed from PARENT §1 T12 = MVP §1.2 **B2** · Spec: `02-hotel-core.md §1.2` (status state-machine L50-74 + reroute) + §2.4 DDL (`ticket_updates`); correctness **MVP §4.2** (centralize state machine)
- Dependency: **T11 ✅ merged + T06 ✅ merged (`shared/utils/ticket-state-machine.ts`) + DEP-6 ✅ merged (`BusinessRuleError`)** — all landed. **Extends `src/modules/tickets/`.**
- **Inherited floor** (verified at SUBMIT): tenant guard via `TenantContext`; `AppError` only; correlationId; module layout; no cross-module internal import; zod; ≥80% cov; `make check`+`make test-integration` green; drift 0. **Drop the `pnpm prisma:generate` workaround** (T-INFRA-01 merged — `make check` generates now).

**Scope (2 endpoints)**
- `PATCH /api/tickets/:id/status` — state-machine-validated. Roles `gm_admin` + `dept_head` (dept_head only own-dept tickets).
- `PATCH /api/tickets/:id/department` — reroute to another dept. Role **`gm_admin` only** (dept_head → 403).

**DoD**
- [ ] TT1 — status transition: **consume the merged `assertValidTicketTransition(from, to)`** from `shared/utils/ticket-state-machine.ts` (it already throws `BusinessRuleError` with `details.rule='INVALID_TICKET_TRANSITION'`). **Do NOT reimplement the transition table** (§4.2 — single source). Invalid transition → 422 as-is.
- [ ] TT2 — on valid status change: update `tickets.status` **AND** insert a `ticket_updates` row (`type='status_change'`, `from_status`, `to_status`, `actor_user_id=ctx.userId`) **in one `$transaction`** (atomic audit).
- [ ] TT3 — reroute: update `tickets.department_id` **AND** insert `ticket_updates` (`type='reroute'`, `from_department_id`, `to_department_id`, `actor_user_id`) in one tx. Validate target dept exists + belongs to `ctx.hotelId`.
- [ ] TT4 — **RBAC**: reroute is gm_admin-only → dept_head gets **403 FORBIDDEN** (per MVP §5 AC). Status: dept_head allowed but only for own-dept tickets (cross-dept → 404, reuse `assertDeptOwnership`).
- [ ] TT5 — tenant guard on both (`WHERE hotelId=ctx.hotelId`, super_admin bypass); cross-tenant `:id` → 404.
- [ ] TT6 — socket emits (`ticket:updated`, `ticket:rerouted`) are **T20** → leave a named no-op seam, don't wire socket.
- [ ] TT7 — tests: unit (transition consume, RBAC branch, tx shape) + integration (valid + **invalid transition → 422** negative test; reroute writes `ticket_updates`; dept_head reroute → 403; atomicity). ≥80% cov. `make check`+integration green.

**Note — `ctx.userId`**: TT2/TT3 write `actor_user_id = ctx.userId`. ⚠ `TenantContext` **does not yet expose `userId`** (DEP-5 open, T-INFRA-02 pending). Options: raise **Q-B-11** in PLAN — either (a) wait for DEP-5 (also blocks T19), or (b) write `actor_user_id = null` interim (schema allows NULL) with a seam to backfill when `ctx.userId` lands. **Propose in PLAN; don't guess.** (This makes DEP-5 relevant to T12 too — I'll re-weight the escalation.)

**Session-start gate**: identity, read §1.2 state-machine + §2.4 `ticket_updates` DDL + the merged `ticket-state-machine.ts`, `make typecheck`/`make lint` clean. Then PLAN. **No code before PM B ACK.**

Awaiting exec-B PLAN for T12.

### ASSIGNMENT T12 — claimed by exec-B (Nathan) at H2 (2026-07-02)
- Branch: `feat/tickets-transition` (off latest main; created) · Routed from PARENT §1 T12 = MVP §1.2 B2
- Claiming the PM-B-issued ASSIGNMENT above. PLAN below.

#### PLAN T12 — exec-B (Nathan) at H2 (2026-07-02)

**Scope recap**
Two mutating endpoints, **extending `src/modules/tickets/`**: `PATCH /api/tickets/:id/status` (state-machine-validated, gm_admin + own-dept dept_head) and `PATCH /api/tickets/:id/department` (reroute, gm_admin-only). Each mutation + its `ticket_updates` audit row in one `$transaction`. Consume the merged `assertValidTicketTransition` — do NOT reimplement the table (§4.2).

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity: Executor, Slot B (Nathan) ✓ · CLAUDE.md loaded ✓
- Spec read: `02-hotel-core.md §1.2` (state machine L50-74 + reroute + RBAC matrix §6) + §2.4 DDL (`ticket_updates` — `type`/`from_status`/`to_status`/`from_department_id`/`to_department_id`/`actor_user_id`/`note`); MVP §4.2 + §5 AC (dept_head reroute → 403); the merged `shared/utils/ticket-state-machine.ts` (`assertValidTicketTransition(from,to)` → `BusinessRuleError` `details.rule='INVALID_TICKET_TRANSITION'`) + `BusinessRuleError` (`app-errors.ts:104`, 422)
- Dependency: T11 ✅ + T06 ✅ + DEP-6 ✅ all merged; extends tickets module.
- `pnpm typecheck` + `pnpm lint` clean on `main` ✓. **Dropping the `pnpm prisma:generate` workaround** (T-INFRA-01 merged).
- Scaffolder risk: **none**.

**Files to modify** (all in `src/modules/tickets/`)
- `tickets.schema.ts` — add `parseStatusUpdate` (`{ status: <8-enum>, note?: string }`) + `parseDepartmentUpdate` (`{ department_id: uuid, note?: string }`), `.strict()`.
- `tickets.service.ts` — add `updateStatus(ctx, id, rawBody)` + `reroute(ctx, id, rawBody)`.
- `tickets.repository.ts` — add `transitionStatusTx` + `rerouteTx` (status-guarded conditional `updateMany` + `ticketUpdate.create` in one `$transaction`) + `findDepartmentById`.
- `tickets.routes.ts` — add `PATCH /tickets/:id/status` + `PATCH /tickets/:id/department`.
- `tickets.types.ts` — add `StatusUpdate` / `DepartmentUpdate` domain types (responses reuse `TicketDetailResponse`).
- `__tests__/` — extend service unit + routes component + integration (incl. the invalid-transition→422 negative test + dept_head-reroute→403).

**Approach**
- **status (TT1/TT2)**: load ticket (scoped `hotelId`, super_admin bypass) → 404 if missing/cross-tenant (`assertHotelOwnership`); dept_head cross-dept → 404 (`assertDeptOwnership`). Validate `to` via zod (8-enum). `assertValidTicketTransition(row.status as TicketStatus, to)` (consume merged helper; its runtime defense covers the DB-string cast) → invalid = 422 as-is. Then **one `$transaction`**: status-guarded `updateMany({ where:{ id, hotelId, status: from }, data:{ status: to } })` (count===1 confirms the transition won the race; 0 → re-resolve to 404/422, no lost update) + `ticketUpdate.create({ type:'status_change', fromStatus, toStatus, note, actorUserId })`.
- **reroute (TT3/TT4)**: **gm_admin-only** — `dept_head` → `ForbiddenError` 403 (explicit domain guard in the service; belt-and-suspenders with T04's route RBAC, required by MVP §5 AC + testable now). Validate `department_id` (uuid); `findDepartmentById` must exist AND `hotelId===ctx.hotelId` else `NotFoundError('Department')`. One `$transaction`: update `departmentId` + `ticketUpdate.create({ type:'reroute', fromDepartmentId, toDepartmentId, note, actorUserId })`.
- **response**: return the refreshed detail via the existing `serializeTicketDetail` (ticket + `updates[]` incl. the new audit row + `messages[]`) → `{ data: TicketDetailWire }` (reuse `TicketDetailResponse`), so FE gets the new status + timeline entry in one round-trip.
- **socket (TT6)**: named no-op seam (`onTicketUpdated`/`onTicketRerouted`, default `() => {}` deps, like T11's `resolveUsers`) — T20 wires the real emit; not wired here.
- **tenant/errors**: `AppError` subclasses only; `req.log`+correlationId; no cross-module import (dept read via Prisma, not the departments module).

**GAP / open question**
- **Q-B-11 — `actor_user_id` source (DEP-5 still open).** TT2/TT3 want `actor_user_id = ctx.userId`, but `TenantContext` **has no `userId`** on main (`tenant-guard.ts:22-26`; T-INFRA-02 submitted, not merged). Options: **(a)** wait for DEP-5 merge; **(b)** write `actor_user_id = null` interim (column is nullable — used for system/ai actors) behind a one-line seam + `// TODO(DEP-5)`, flip to `ctx.userId` when it lands. **My intent: (b)** — keeps T12 shippable now without coupling to unmerged T-INFRA-02 (same null-interim-+-seam pattern as GAP T11-#2); the audit row still records type/from/to/note, only the actor is deferred. Confirm (a) vs (b). (Also: should the status/reroute body accept an optional `note` for the audit row? I'm including it — flag if FE MSW omits it.)

**Merge posture**: buildable + fully testable now (inject `ctx`); live once `api.ts` bootstrap wires `register(ticketsRoutes)` (DEP-4, foundation — untouched).

Awaiting PM B ACK (PLAN + Q-B-11 actor decision + note-field confirm). Not coding before ACK.

##### PM B ACK — T12 PLAN APPROVED (2026-07-02, H14)
Strong PLAN. **ACK — create `feat/tickets-transition` (off latest main), implement.** Rulings:

**Q-B-11 — RULED (a), premise changed: DEP-5 MERGED since you wrote this.** T-INFRA-02 landed on main (`e95a23d`) — I verified `TenantContext` now has `userId: string` (`tenant-guard.ts`). So drop option (b) null-interim: **rebase `feat/tickets-transition` onto latest main and write `actor_user_id = ctx.userId` directly.** No TODO/backfill debt. (Also drop the `pnpm prisma:generate` workaround — T-INFRA-01 merged — and note `make check` no longer needs Docker — T-INFRA-03/GAP-T11-3 merged.)

**note field — APPROVED (optional).** Accept optional `note` on both bodies → `ticket_updates.note`. Harmless + useful (GM annotation); `note` column exists. Provisional on FE MSW (if it omits, stays null). Keep `.strict()` so unknown keys still reject.

**Approach — endorsed, with a callout on the good part:**
- 👍 **status-guarded `updateMany({ where:{ id, hotelId, status: from } })` + `count===1` race-check** — nice: that's optimistic concurrency preventing lost-updates on concurrent transitions. On `count===0`, re-resolve to 404 (gone/cross-tenant) vs 422 (status moved) as you described. Keep it.
- ✓ one `$transaction` wraps mutation + `ticketUpdate.create` (atomic audit) — TT2/TT3.
- ✓ reroute gm_admin-only → `ForbiddenError` 403 explicit domain guard (belt-and-suspenders w/ T04 RBAC; required by §5 AC + testable now) — TT4.
- ✓ dept validation (exists + `hotelId===ctx.hotelId`) → `NotFoundError('Department')` — TT3.
- ✓ response reuses `serializeTicketDetail` (returns new status + timeline in one round-trip) — good FE ergonomics.
- ✓ socket no-op seam (`onTicketUpdated`/`onTicketRerouted`) — T20 wires real emit — TT6.
- ✓ consume `assertValidTicketTransition` (no reimplement, §4.2); dept read via Prisma (no cross-module import).

**At SUBMIT I verify:** TT1–TT7, the invalid-transition→422 + dept_head-reroute→403 negative tests, tx atomicity (integration), race-check behavior, `actor_user_id=ctx.userId`, `make check`+integration green (no Docker/prisma-gen workaround needed now), ≥80% cov, no `tickets` regression on the merged read endpoints.

Proceed. 🟢

### SUBMIT T12 — exec-B (Nathan) at H2 (2026-07-02) (attempt 1)

Task: Ticket status transition + reroute — `PATCH /api/tickets/:id/status` + `PATCH /api/tickets/:id/department`
Branch: **`feat/tickets-transition`** (rebased on latest main; pushed; commit `625a8b8`) — **PO merges to main manually**. Code NOT on main.
Files changed: 8 modified, **all** in `src/modules/tickets/` (0 outside — no `api.ts`/`prisma`/`core`/cross-module edits; consumes merged `shared/utils/ticket-state-machine.js` + `BusinessRuleError`)
  - `tickets.schema.ts` (+`parseStatusUpdate`/`parseDepartmentUpdate`, `.strict()`), `tickets.types.ts` (+`TicketRow`/`StatusUpdate`/`DepartmentUpdate`), `tickets.repository.ts` (+`findById`/`findDepartmentById`/`transitionStatusTx`/`rerouteTx`), `tickets.service.ts` (+`updateStatus`/`reroute` + socket seams), `tickets.routes.ts` (+2 PATCH routes), + 3 test files

DoD self-check
- [x] **TT1** — consumes merged `assertValidTicketTransition(row.status, to)` (no table reimplement, §4.2) → invalid = `BusinessRuleError` 422 `details.rule='INVALID_TICKET_TRANSITION'`. Integration: `open→closed` → 422, no audit written, status unchanged.
- [x] **TT2** — valid status change = **one `$transaction`**: status-guarded `updateMany({where:{id,hotelId,status:from}})` + `ticketUpdate.create({type:'status_change',from_status,to_status,note,actor_user_id=ctx.userId})`. Atomic audit. Integration asserts the audit row with `actor_user_id=USER_1`, from/to, note.
- [x] **TT3** — reroute = one tx: update `department_id` + `ticketUpdate.create({type:'reroute',from_department_id,to_department_id,note,actor_user_id})`. Target dept validated exists + `hotelId===ticket.hotelId` else `NotFoundError('Department')`.
- [x] **TT4** — reroute **gm_admin-only → dept_head 403** (`ForbiddenError`, explicit domain guard before resource lookup; MVP §5 AC). Status: dept_head allowed own-dept; cross-dept → 404 via `assertDeptOwnership`. Integration covers both.
- [x] **TT5** — tenant guard on both (scoped by the ticket's `hotelId`; super_admin bypass via `assertHotelOwnership`); cross-tenant `:id` → 404. Integration: `gmB` status update on hotel-A ticket → 404.
- [x] **TT6** — socket emits = named no-op seams (`onTicketUpdated`/`onTicketRerouted`, default `() => {}`); T20 wires the gateway. Unit asserts the seam fires.
- [x] **TT7** — unit (parse strict, transition-consume, RBAC 403, concurrency count=0→422) + integration (valid + invalid→422, reroute writes audit, dept_head reroute→403, cross-hotel dept→404, cross-tenant→404, atomicity). **Q-B-11 → (a)**: `actor_user_id = ctx.userId` (DEP-5 merged; no null-interim). **note** accepted (optional) per ACK. Response reuses `serializeTicketDetail`.

Quality gate
- `make check`: **PASS** (**173 passed, 1 skipped** template placeholder; T11/T13/T15 read-endpoint suites green → no regression)
- `make test-integration`: **PASS** (tickets **24** via testcontainers; guests 14)
- ✓ No `pnpm prisma:generate` / Docker workaround needed for `make check` (T-INFRA-01/03 merged).

Drift scans (src/modules/tickets): `any` 0 · `console.*` 0 · `throw new Error(` 0 · forbidden imports 0 · default export 0 · `.skip` 0.

Security check
- Tenant + dept scope on both mutations; cross-boundary masked 404 (§7); reroute gm-only 403. Optimistic-concurrency guarded update (no lost writes). `AppError` only; correlationId; no secrets/PII in logs.

Test evidence
- Unit/component: **47** (service 38 + routes 9). Integration: **24**. **Changed-file line coverage 96.62%** (repo 100 / service 97.36 / serializer 100 / routes 97.77 / schema 91.78 / types 100 / overdue 100).
- Sample: `PATCH /api/tickets/:id/status { "status": "in_progress", "note": "on it" }` → `200 { data: { …status:'in_progress', updates:[{ type:'status_change', from_status:'open', to_status:'in_progress', actor_user_id:'…', note:'on it' }] } }`. `dept_head` → `PATCH …/department` → `403 { error: { code:'FORBIDDEN' } }`.

Notes
- Merge posture same as prior: buildable + fully tested now; live once `api.ts` bootstrap wires `register(ticketsRoutes)` (DEP-4, foundation — untouched).
- Socket seams ready for T20; `note` field provisional on FE MSW.

Requesting PM B VERDICT.

##### VERDICT T12 — APPROVED (attempt 1) by PM B (2026-07-02, H14)
Verified by **my own rerun** on `feat/tickets-transition` @ `625a8b8` (checkout + `pnpm prisma:generate` + read code).

**Quality gates (PM rerun):**
- `make check` → **PASS**: **173 passed + 1 skipped**, in **2.5s no-Docker** (T-INFRA-03 split confirmed working — unit run no longer pulls integration).
- `make test-integration` → **PASS** (real PG, testcontainers).
- Coverage (PM rerun) — tickets lines **96.68%**: repository 100 / overdue 100 / types 100 / serializer 100 / service 97.36 / routes 97.77 / schema 91.78. Every file ≥80% ✓ TT7.
- **Drift** (tickets): any 0 · console 0 · throw-Error 0 · default-export 0 · `.skip` 0 · forbidden imports 0.
- **File inventory**: 8 files, all in `src/modules/tickets/`, 0 outside. **Merge dry-run into latest origin/main (`362edb4`): CLEAN ✓.**

**DoD spot-verified in code:**
- TT1 ✓ consumes `assertValidTicketTransition(row.status, to)` (`service.ts:232`) — no reimplement; invalid → 422 (integration test:368 "reject invalid transition with 422 and write no audit row" — also proves atomicity: nothing written on reject).
- TT2 ✓ status update + audit in one `$transaction` with **status-guarded `updateMany` + `count===1` race-check** (`repository.ts:79-97`); `count===0` → `BusinessRuleError('changed concurrently')` (`service.ts:242-248`). `actor_user_id = ctx.userId` (`service.ts:240`) — **Q-B-11 (a) as ruled** (DEP-5 merged).
- TT3 ✓ reroute + audit in tx; dept validation (exists + `hotelId===ctx.hotelId`) → `NotFoundError('Department')`; `actor_user_id = ctx.userId` (`:281`).
- TT4 ✓ **dept_head reroute → `ForbiddenError` 403** (`service.ts:262`; integration test:397 `rejects.toBeInstanceOf(ForbiddenError)`). dept_head status on own-dept allowed (test:377).
- TT5 ✓ tenant/dept guard (`assertHotelOwnership`/`assertDeptOwnership`), cross → 404.
- TT6 ✓ socket no-op seam (`onTicketUpdated`/`onTicketRerouted`) — T20 wires real emit.
- TT7 ✓ negative tests (422 invalid, 403 reroute) + coverage above.
- Response reuses `serializeTicketDetail` (new status + audit row in one round-trip) ✓.
- **No regression**: all merged tickets read endpoints (T11/T13) tests still green.

**Merge status (for PO):**
- **CODE APPROVED** on `feat/tickets-transition` @ `625a8b8`. Attempt 1, zero rejects. **Merges CLEAN into latest main.**
- **→ PO: merge `feat/tickets-transition`.**
- → §1 tracker updated (approved); PARENT §1 T12 → approved; roll-up PARENT §2.

Excellent — the optimistic-concurrency race-check is a nice touch beyond the ask. **T12 closed.** 🟢

##### PM B RATIFY — T-INFRA-02 Slot-B fixture edits (2026-07-02)
T-INFRA-02 (Slot A, DEP-5) added `userId` to `TenantContext` and updated 5 of my test fixtures (tickets + guests `__tests__`) to include it. Reviewed the diff: **purely `userId`-additive to the `ctx` literals, no change to my assertions/logic**; `pnpm typecheck` clean on main; PM A reported all Slot-B suites green. **Ratified** (per PM A's "PM B ratify pending" note, PARENT §1 T-INFRA-02).

### SUBMIT T17 — exec-B (Nathan) at H2 (2026-07-02) (attempt 1)

Task: Visit reject + failed_3x override — `PATCH /api/visits/:id/reject` + `PATCH /api/visits/:id/approve-manual`
Branch: **`feat/visits-reject-override`** (off latest main incl. merged T16; pushed; commit `cb705f4`) — **PO merges to main manually**. Code NOT on main.
Files changed: 7 modified, **all** in `src/modules/visits/` (0 outside; reuses merged T16 units — no fork)
  - `visits.service.ts` (**R3: `VISIT_TRANSITIONS` map + `assertVisitTransition`** replacing `assertPendingVerification`; `reject()` + `approveManual()` + shared `runTransition`), `visits.schema.ts` (+`parseApproveManual`), `visits.types.ts` (+`ApproveManualInput`), `visits.routes.ts` (+2 PATCH routes), + 3 test files

DoD self-check
- [x] **R1** — `/reject`: `pending_verification → rejected`, reuses `verifyManualTx` (status-guarded, `from: PENDING`) + `count===0` re-resolve (404/422). Non-pending source → `BusinessRuleError(422)` `INVALID_VISIT_TRANSITION`. Integration: reject checked_in → 422 no-mutate.
- [x] **R2** — `/approve-manual`: **`failed_verification → checked_in` only** (`from: FAILED` guard; non-failed source → 422). `nights` **optional** (Q-B-12) → `deriveCheckout` when present, else `check_out`/`nights` stay null. `guest_name`/`room_number` required; `guest_name` **validate-only** (no cross-write to `guests`, Q-B-08).
- [x] **R3** — generalized the transition guard into module-local `VISIT_TRANSITIONS = { pending_verification:[checked_in,rejected], failed_verification:[checked_in] }` + `assertVisitTransition(from,to)` (NOT tickets' state-machine; map scoped to manual transitions only). Two-layer guard (pre-tx assert on `row.status` + fixed expected-source in the tx). **T16 verify-manual byte-identical → its 28 unit + 5 integration tests stay green.**
- [x] **R4** — tenant guard (`assertHotelOwnership` → cross-tenant 404); gm_admin (super_admin bypass); audit + `onVerificationResolved` no-op seams fire with `actorUserId=ctx.userId` (T20 wires real emit).
- [x] **R5** — unit (transition map, approve-manual checkout ±nights, reject/approve 422/404) + integration (reject pending→rejected, approve-manual failed→checked_in ±nights, invalid-source→422 no-mutate, cross-tenant→404 no-mutate, atomicity). ≥80% cov. `make check`+integration green.

Quality gate
- `make check`: **PASS** (**219 passed, 1 skipped** template placeholder; **T16 verify-manual regression green**)
- `make test-integration`: **PASS** (visits **19** [12 T16 + 7 T17] via testcontainers)

Drift scans (src/modules/visits): `any` 0 · `console.*` 0 · `throw new Error(` 0 · forbidden imports 0 · default export 0 · `.skip` 0.

Security check
- Per-endpoint source-restricted transitions; cross-tenant masked 404 (§7); optimistic-concurrency guarded update (no lost writes / partial state). `AppError` only; correlationId; no secrets/PII in logs.

Test evidence
- Unit/component: **46** (service 39 + routes 7). Integration: **19**. **Changed-file line coverage 96.37%** (checkout 100 / repo 100 / routes 97.14 / schema 100 / serializer 100 / service 92.68 / types 100).
- Sample: `PATCH /api/visits/:id/reject` (no body) → `200 { data: { …status:'rejected' } }`. `PATCH …/approve-manual { guest_name, room_number, nights:2 }` on a `failed_verification` visit → `200 { data: { status:'checked_in', check_out:'…T11:00:00Z' } }`. Non-failed source → `422 { error:{ code:'BUSINESS_RULE', details:{ rule:'INVALID_VISIT_TRANSITION' } } }`.

Notes
- **Q-B-12** shipped as ruled: `/reject` no body (`.strict()` — route ignores body; the `{action:'reject'}` shape is served by verify-manual per Q-CONTRACT-15); `approve-manual` `nights` optional.
- Merge posture same as prior: buildable + tested now; live once `api.ts` bootstrap wires `register(visitsRoutes)` (DEP-4, foundation — untouched).

Requesting PM B VERDICT.

<!--
TEMPLATE — copy untuk task baru:

### ASSIGNMENT T## — claimed by exec-B (Nanak) at H{N} HH:MM
- Branch: feat/<modul>-<short>
- Routed from: PM-STATUS-PARENT.md §1 T## (Parent PM assigned)

#### PLAN T## — exec-B (Nanak) at H{N} HH:MM

**Scope recap**
- ...

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity confirmed: Executor, Slot B (Nanak) ✓
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

Awaiting PM B ACK.

##### PM B ACK — T## PLAN APPROVED, proceed to coding (H{N})
- (atau) PM B REJECT-PLAN — fix sebelum mulai: <list>

#### SUBMIT T## — exec-B (Nanak) at H{N} HH:MM (attempt 1)

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

Requesting PM B VERDICT.

##### VERDICT T## — APPROVED (H{N}, revisi N) by PM B
- All DoD verified ✓
- Drift scans clean ✓
- `make check` PASS confirmed by PM rerun
- → §1 task tracker updated; row mirrored to PARENT §1
- → Short roll-up posted to PARENT §2

(atau)

##### VERDICT T## — REJECT (revisi N) by PM B

⛔ Items to fix:

**Item #1 — <kategori>** `src/.../<file>.ts:<line>`
- **Violation**: <pelanggaran>
- **Fix**: <satu kalimat fix-path>

**Item #2 — ...**
- ...

Re-run `make check` after fix, confirm pass, resubmit (attempt N+1).

(atau)

##### VERDICT T## — ESCALATE by PM B
- Reason: <gap planning / open Q PO>
- Escalated to Parent PM at H{N} HH:MM (will reach PO via PARENT §3)
- Executor B: pick task lain dari §8 sementara

-->

---

## 3. Slot B open questions (mirror to PARENT §3)

> PM B catat di sini ketika executor B raise `GAP` atau `BLOCKED`. Setelah resolve atau eskalasi ke Parent PM, update status. Parent PM consolidate ke `PM-STATUS-PARENT.md §3`.

| ID            | Question | Source         | Status | Resolution |
| ------------- | -------- | -------------- | ------ | ---------- |
| Q-B-01        | Canonical **response envelope** for `GET /api/tickets` (+ `/:id`): pagination wrapper, cursor field name, JSON field casing (camel vs snake). `docs/API-CONTRACT.md §2.2` cited by MVP brief but absent from this repo. | T11 · MVP §1.2 / §6 | **RESOLVED (in-repo spec) 2026-07-01** | Canonical shape found by exec-B at `docs/spec/README.md §2.7` (list `{data,pageInfo:{nextCursor,hasMore}}`) + §2.3 (error `{error:{code,message,details}}`). Ratified by PM B: **camelCase envelope + snake_case resource fields (§1.2)** — §2.6 imposes no global casing rule, so no contradiction. Provisional on FE MSW (tiebreaker, absent repo); serializer-isolated → single-file change if it diverges. PARENT §3a downgraded from escalated → resolved. |
| Q-B-02        | Session context shape/ownership: Slot-A-owned shared type vs per-module? Affects T11 seam + all B tasks. | T11 · MVP §4.1 | **RESOLVED 2026-07-01** | T03 (`9b55b86`) shipped `TenantContext` as **Slot-A-owned** in `src/plugins/tenant-guard.ts`. T11 consumes it (reuse-before-create). No per-module seam. PARENT §3c marked resolved. |
| GAP T11-#2    | `assigned_to`/`actor_name`/`actor_role` unresolvable in dev (HC `users` id-only, no name/role column). | T11 · DoD D1 + §1.2 | **RESOLVED (approach A) 2026-07-01** | Serializer `userDirectory` seam → fields serialize `null` in dev, resolve via `resolveUsers` dep in prod. One-spot change. **Follow-up**: wire `resolveUsers` when shared-DB restored / Auth RPC lands (not a T11 blocker). |
| GAP T11-#3    | `test:unit` glob collects `*.integration.test.ts` → `make check` now needs Docker; global `test-setup.ts` harness is a stub. | T11 · `package.json:25` / TESTING §5 | **open — foundation/Slot A** (escalated PARENT §3b) | Non-blocking (self-contained testcontainers, 0 `.skip`). Fix: Slot A adds `testPathIgnorePatterns:['\\.integration\\.test\\.ts$']` to `test:unit`. |
| GAP T11-#1    | `make check` has no `prisma-generate` prereq + `prisma-client.ts` `{}` stub → fresh-checkout CI breaks on generated-client import. | T11 | **open — foundation/Slot A** (escalated PARENT §3b) | Affects all B/C Prisma tasks. Interim: executors + PM run `pnpm prisma:generate` before gates. |
| Q-B-03        | Stats response shape for `GET /api/tickets/stats` — unpinned in specs (§1.2/§1.11 say only "counts by status"). | T13 · MVP §1.2 B3 | **RESOLVED (provisional) 2026-07-01** | Ratified `{ data: { by_status{8}, total, overdue, high_alert_count } }`. `high_alert_count` chosen over `high_alert` to avoid collision with `by_status.high_alert` (status vs flag). Provisional on FE MSW (absent); serializer-isolated. Noted PARENT §3a. |
| DEP-4 (go-live) | After T04 merges, `api.ts` bootstrap must wire `configureTenantGuardHooks(app)` + `register(<module>Routes)` for routes to actually serve. `api.ts` still a stub. | T11/T13 · DEP-2 | **open — foundation** (flagged PARENT §10) | Not B-task scope. True go-live step for all B routes. |
| DEP-5         | `TenantContext` has no `userId`. Blocked T19 + T12 audit. | T19/T12 · §2.5 | **RESOLVED 2026-07-02 (T-INFRA-02 merged `e95a23d`)** | Verified: `TenantContext.userId: string` now present. → T19 unblocked; T12 uses `ctx.userId` for `actor_user_id`. Fixture edits to my test files ratified (§2). |
| GAP-T11-3     | `test:unit` glob collected integration tests → `make check` needed Docker. | T11 · foundation | **RESOLVED 2026-07-02 (T-INFRA-03 merged `cf65e99`)** | test:unit/integration split. `make check` no longer spins Docker. |
| Q-B-04        | Guests + Visits **offset** pagination envelope. | T14/T16 · §1.3 | **RESOLVED 2026-07-02** | Both threads converged → ratified `{ data, pageInfo: { page, pageSize, total, hasMore } }` (data/pageInfo wrapper consistent w/ §2.7 cursor lists; offset fields inside). T14+T16 both use. Provisional on FE MSW. |
| Q-B-08        | Should visit `verify-manual` update the guest's name (`guest_name` payload)? | T16 → T14 | **deferred** | For MVP: T16 validate-only, no cross-write. If needed later, route via guests module (not T16). |
| Q-B-09        | Visits audit table — add `visit_updates` (like `ticket_updates`) for §4.9 audit entry, or is visit-audit out-of-MVP? | T16 · §4.9 | **open — schema/foundation** (escalated PARENT §3c) | No table exists. Interim: T16 `recordVisitAudit` no-op seam; status update atomic in tx (satisfies V2). |
| DEP-6         | No `422 BusinessRuleError` for invalid transitions. Shared T16 + T12. | T16/T12 · §7 | **RESOLVED 2026-07-02 (T07-slice-1 merged)** | `BusinessRuleError` (statusCode 422, code `BUSINESS_RULE`, `details.rule`) now in `core/errors/app-errors.ts:104`. → **T16-V2..5 + T12 unblocked.** Wire shape as ruled. |
| T-CLEAN-01    | Promote `maskName` + `shouldMaskPii` to `@shared/utils/masking.ts`; refactor tickets + guests to consume (kill duplication). | follow-up (post-T14) | **queued (Slot B cleanup)** | Not in T14 PR. Requires guests' copy byte-identical to tickets' (enforced at T14 ACK). Do after guests lands to avoid coupling in-flight PRs. |
| Q-B-10        | Guest messages: source, ordering, envelope. | T15 · §1.3 | **RESOLVED (PM ratify) 2026-07-02** | (a) aggregate `ticket_messages WHERE hotelId=ctx.hotelId AND ticket.guestId=:id` (guest-load + 404 guard); (b) **newest-first** `sent_at DESC,id DESC` (scrollback); (c) cursor `{data,pageInfo:{nextCursor,hasMore}}`. M4: no body masking. Provisional on FE MSW. |
| T-CLEAN-02    | Promote base64 keyset cursor codec to `@shared/utils/` (T11 + T15 duplicate it). | follow-up (post-T15) | **queued (Slot B cleanup)** | Module-local for now; consolidate with T-CLEAN-01 as a post-CRM cleanup pass. |
| Q-B-12        | T17 `/reject` body + `/approve-manual` nights. | T17 · §1.3 | **RESOLVED (PM ratify) 2026-07-02** | (a) `/reject` = no body (`.strict()`; reason deferred to audit table Q-B-09). (b) `approve-manual` `nights` OPTIONAL (derive checkout if present, else null). Provisional on FE MSW. |
| Q-B-05        | Canonical `Visit` wire shape (T14 embeds, T16 owns). | T14/T16 · §2.3 DDL | **RESOLVED (PM ratify) 2026-07-01** | Pinned in §2 (13 fields from DDL §2.3). T16 owns serializer; T14 embeds same shape module-local. Unblocks T14 ∥ T16 parallel. Provisional on FE MSW. |
| Q-B-07        | Notifications list + `unread-count` envelope. | T19 · §1.9 | **open** | exec-B propose per §2.7 + FE MSW in PLAN. |

---

## 4. Drift baseline (slot B files only, end of each day)

| Run | Touched files | `any` | console.log | `throw new Error(` | forbidden imports | default export (di luar entry) | `.skip` | hardcoded URL | webhook tanpa HMAC | wrap-Prisma interface |
| --- | ------------- | ----- | ----------- | ------------------ | ----------------- | ------------------------------ | ------- | ------------- | ------------------ | --------------------- |
| H0 baseline | (no src/ touched) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| H12 (T11 SUBMIT) | src/modules/tickets/* (10 files) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (n/a read-only) | 0 |
| H12 (T13 SUBMIT) | src/modules/tickets/* (12 files, +overdue SSOT) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (n/a read-only) | 0 |

> H12 note: 2 `.skip` exist in `_template/*` (reference-module placeholders, pre-existing, out of slot-B scope) — T11 branch itself 0 `.skip`. PM verified via `grep -rn .skip src/modules/tickets` → 0.

> PM B jalankan drift scan per `PM-AGENT.md §3 Step 2` setiap SUBMIT + end-of-day full scan untuk slot B's touched files.

---

## 5. Standup log slot B (latest di atas)

> PM B post daily standup di sini, lalu post 1-2 baris ringkas ke `PM-STATUS-PARENT.md §6` (yang Parent PM consolidate jadi cross-team report).
>
> Format: per `PM-AGENT.md §7`.

### H0 — TBD (Nanak onboard, awaiting first assignment)

```
QOOMA BE B (Nanak) — Standup — H{N}/{total}

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

📈 Progress slot B
- 0 / TBD task

🎯 Fokus besok
- Awaiting Parent PM first assignment.
```

---

## 6. Slot B incidents / lessons (own-scope only)

> Hal yang affect cuma slot B. Bila affect > 1 dev, escalate ke `PM-STATUS-PARENT.md §7` lewat Parent PM.

_(kosong)_

---

## 7. PM B operating notes (untuk Executor B)

- PM B baca `PM-AGENT.md` (full) + `PM-STATUS-B.md` + scan `PM-STATUS-PARENT.md` (§1 mine, §3, §5, §8).
- PM B **TIDAK** edit `src/`, `prisma/schema.prisma` (kecuali typo non-semantik), `package.json` deps — read-only di area itu.
- PM B **BOLEH** update planning docs untuk sync (per `PM-AGENT.md §0.6`) — TAPI escalation ke Parent PM dulu bila perubahan affect dev lain. Tiap edit planning docs dicatat di `PM-STATUS-PARENT.md §4`.
- PM B **TIDAK** edit `PM-STATUS-A.md` / `PM-STATUS-C.md` — strict per-slot ownership.
- PM B **TIDAK** jawab open contract / package question — hanya PO via Parent PM.
- PM B **TIDAK** negosiasi scope. Descope adalah otoritas PO via Parent PM.
- On REJECT: fix exactly the listed items (file:line). Re-run `make check` self-validate. Resubmit per `EXECUTOR-PROTOCOL §4.5`, sebut item mana yang sudah di-address.
- Rebuttal: bila Executor B yakin PM B flag salah, post one-sentence rebuttal + evidence di sub-block `REBUTTAL T## item-#N`. PM B re-check dalam session yang sama.
- Untuk CLI command apapun yang touch root repo (scaffolder, generator, dll.): tulis exact command di PLAN supaya PM B bisa flag risiko overwrite sebelum executor run.
- Branch naming: `feat/<modul>-<short>`, `fix/<modul>-<short>`, `chore/<short>`, `docs/<short>` (per `CLAUDE.md §12`).
- Commit message: conventional commits — `feat(modul): X`, `fix(modul): Y`.
- Gunakan `make commit MSG="..."` — auto lint + typecheck + format-check sebelum commit.
- **Parallel-executor safety rule (Slot B)**: file-collision risk = **same-module, not same-slot**. Executors on **different modules** (`tickets` / `guests` / `visits` / `notifications`) touch disjoint folders + own barrels → **safe to run in parallel** on separate `feat/*` branches, merged independently as each passes VERDICT. Executors on the **same module** (e.g. T12 + T13 both extend `src/modules/tickets/*` + share `index.ts`) → **serialize** (git conflict on shared files otherwise). Dependency chains already serialize the risky same-module pairs (T12←T11, T15←T14, T17/T18←T16). No B task adds a migration (T02 covered all 18 tables) → no migration-numbering collision. Shared foundation files (`api.ts`, `prisma/schema.prisma`, `core/*`) are out-of-scope for B tasks → no cross-executor edit there.
  - **Safe parallel window after T13**: T14 (guests) + T16 (visits) + T19 (notifications) = 3 separate modules → up to 3-way fan-out with zero file collision.

---

## 8. Slot B queue (filter dari PARENT §8 di mana Slot=B)

> Parent PM authority untuk rewrite — PM B baca only. Executor B self-select dari sini bila tidak ada explicit ASSIGNMENT.

_(belum ada — tunggu Parent PM assign task ke slot B)_

<!-- Mirror format dari PM-STATUS-PARENT.md §8 template. -->

---

## 9. Roll-up reminder

Setiap kali PM B:

- **APPROVE** task → post 1 line ke `PM-STATUS-PARENT.md §2` (latest di atas) + update row status di PARENT §1
- **REJECT** task → tidak perlu PARENT roll-up (internal to slot B)
- **ESCALATE** task → post status `escalated` ke PARENT §1 + raise di PARENT §3 (Q register)
- **End-of-day** → post 3-line standup summary ke PARENT §6 di bawah Parent PM's daily roll-up block

Jangan paste full SUBMIT/VERDICT ke PARENT — itu tetap di sini.
