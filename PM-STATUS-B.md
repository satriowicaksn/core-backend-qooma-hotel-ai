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
- **Active tasks (PARALLEL)**: **T14 (guests) ∥ T16 (visits)** — both issued, awaiting PLANs; parallel-safe via ratified Q-B-05. **T19 (notifications)** issued but ⛔ blocked on DEP-5. T11 + T13 ✅ merged.
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
| T14 | Guests CRUD + preferences | 🟡 wip (PLAN ACK'd) | `feat/guests-crud` | — |
| T16 | Visits list + verify-manual | 🟡 wip (PLAN ACK'd) | `feat/visits-list-verify` | — |
| T19 | Notifications CRUD | ⛔ blocked (DEP-5 `ctx.userId`) | `feat/notifications-crud` | — |
| T12 | Ticket transition + reroute | ⛔ blocked (T06, Slot A) | — | — |
| T15 | Guest messages history | ⚪ backlog (←T14) | — | — |
| T17 | Visit reject + failed_3x | ⚪ backlog (←T16) | — | — |
| T18 | Manual visit create | ⚪ backlog (←T16) | — | — |
| T20 | Socket emitters | ⚪ backlog (←T11✓+T16+T19) | — | — |

**Counts**: ✅ 2/10 done+merged · 🟡 2 wip (T14, T16 — PLANs ACK'd, coding) · ⛔ 2 blocked (T19 on DEP-5, T12 on T06) · ⚪ 4 backlog.
**Foundation watch (not Slot B, but gate our go-live/unblocks)**: DEP-4 `api.ts` bootstrap (go-live for ALL routes) · DEP-5 `TenantContext.userId` (unblocks T19) · T06 state-machine (unblocks T12) — all escalated to Parent/Slot A.

### Loop ledger (newest on top)
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
| T14 | Guests CRUD + preferences                                 | wip          | —              | PLAN ACK'd 2026-07-02 (§2). Q-B-04 ratified, G6 module-local (T-CLEAN-01 follow-up), wa_phone immutable. Coding `feat/guests-crud`. |
| T16 | Visits list + verify-manual                               | wip          | —              | PLAN ACK'd 2026-07-02 (§2). Q-B-04 ratified; GAP #1/#2/#3 approach A; Q-B-09 (visit audit table) escalated. Coding `feat/visits-list-verify`. |
| T19 | Notifications CRUD + optimistic ops                       | assigned ⛔  | —              | Issued §2 (2026-07-01) but **BLOCKED on DEP-5** (`TenantContext.userId`, Slot A). May PLAN now; impl waits. Escalated PARENT §3b/§10. |
| T12 | Ticket status transition + reroute                        | backlog ⛔   | —              | Blocked on T06 (state-machine, Slot A — backlog) + T11 ✓ |
| T15/T17/T18/T20 | Downstream CRM + socket                       | backlog      | —              | T15←T14; T17/T18←T16; T20←T11✓+T16+T19 |

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
| DEP-5         | `TenantContext` has no `userId` (`tenant-guard.ts:22-26`); `SessionUser.userId` exists but `deriveTenantContext` drops it. **Blocks T19** (notifications scope by `user_id`). | T19 · §2.5 DDL | **open — foundation/Slot A** (escalated PARENT §3b/§10) | 2-line fix: add `userId` to `TenantContext` + copy in `deriveTenantContext`. T19 executor may PLAN/skeleton; impl waits. Do NOT hand-roll userId from JWT. |
| Q-B-04        | Guests + Visits **offset** pagination envelope. | T14/T16 · §1.3 | **RESOLVED 2026-07-02** | Both threads converged → ratified `{ data, pageInfo: { page, pageSize, total, hasMore } }` (data/pageInfo wrapper consistent w/ §2.7 cursor lists; offset fields inside). T14+T16 both use. Provisional on FE MSW. |
| Q-B-08        | Should visit `verify-manual` update the guest's name (`guest_name` payload)? | T16 → T14 | **deferred** | For MVP: T16 validate-only, no cross-write. If needed later, route via guests module (not T16). |
| Q-B-09        | Visits audit table — add `visit_updates` (like `ticket_updates`) for §4.9 audit entry, or is visit-audit out-of-MVP? | T16 · §4.9 | **open — schema/foundation** (escalated PARENT §3c) | No table exists. Interim: T16 `recordVisitAudit` no-op seam; status update atomic in tx (satisfies V2). |
| T-CLEAN-01    | Promote `maskName` + `shouldMaskPii` to `@shared/utils/masking.ts`; refactor tickets + guests to consume (kill duplication). | follow-up (post-T14) | **queued (Slot B cleanup)** | Not in T14 PR. Requires guests' copy byte-identical to tickets' (enforced at T14 ACK). Do after guests lands to avoid coupling in-flight PRs. |
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
