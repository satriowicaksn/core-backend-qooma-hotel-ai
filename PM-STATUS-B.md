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
- **Active task**: **T13 — Ticket stats + overdue** (ASSIGNMENT issued, awaiting exec-B PLAN). T11 ✅ APPROVED + **MERGED to main** (PR #1 `6c1e4e2`).
- **Branch**: T11 merged ✓ · T13 `feat/tickets-stats-overdue` (exec-B creates on ACK)
- **Runtime unblock watch**: T04 (RBAC, Slot A) now **wip** — once merged, `req.tenant` populated → T11 (and T13) routes go live automatically.
- **Progress slot B**: 1/10 approved (T11). Next: T13 → then T14/T16/T19 (unblocked). T12 waits on T06 (Slot A).
- **Next gate (global)**: G1 — lihat `PM-STATUS-PARENT.md §5`
- **Queue (Slot B, from PARENT §1)**: T11 assigned; T12–T19 backlog (transition/reroute needs T06, stats/overdue, guests CRUD, guest messages, visits+verify, notifications); T20 socket gated on T11+T16+T19.
- **⚠ Verified blockers (src/ inspection 2026-07-01)**:
  1. `src/common/` empty → **T03 tenant-guard + T04 RBAC (Slot A) NOT built**. T11 codes against a `SessionContext` seam, injected in tests; NOT mergeable to main until Slot A lands the middleware (MVP §4.1).
  2. `src/entrypoints/api.ts` still a stub (no Fastify bootstrap / `fastify.services`). T11 ships as `ticketsRoutes` plugin + service/repo behind barrel; live-server wiring = foundation scope.
  3. `docs/API-CONTRACT.md §2.2` (canonical response envelope) absent from repo → open-Q Q-B-01 (§3).

---

## 1. Task tracker (slot B — PM B authority)

> Mirror dari `PM-STATUS-PARENT.md §1` di mana Slot=B. PM B update status row di sini + push status update ke PARENT §1 setelah verdict.

| T## | Title                              | Status   | Verified by PM | Notes                                 |
| --- | ---------------------------------- | -------- | -------------- | ------------------------------------- |
| T11 | Tickets list + detail (GET + filters + cursor pagination) | **approved + MERGED** | PM B (Nathan) | ✅ APPROVED attempt 1 + **MERGED to main via PR #1 (`6c1e4e2`) 2026-07-01**. PM rerun: make check + integration 11 + coverage 96% + drift clean. Runtime gate: T04 (Slot A, now **wip** `972b0c5`) wires `req.tenant` → routes go live. GAP T11-#2 (approach A) approved; #1/#3 escalated to foundation. |
| T13 | Ticket stats + overdue                                    | assigned     | —              | ASSIGNMENT issued §2 (2026-07-01). Unblocked by T11. Extends `tickets` module (reuse). Awaiting exec-B PLAN. Possible Q-B-03 (stats shape). |
| T12 | Ticket status transition + reroute                        | backlog      | —              | Blocked on T06 (state-machine, Slot A — backlog) + T11 ✓ |
| T14/T16/T19 | Guests / Visits / Notifications CRUD               | backlog      | —              | Unblocked (T02 ✓) — release after T13 or in parallel |
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

---

## 4. Drift baseline (slot B files only, end of each day)

| Run | Touched files | `any` | console.log | `throw new Error(` | forbidden imports | default export (di luar entry) | `.skip` | hardcoded URL | webhook tanpa HMAC | wrap-Prisma interface |
| --- | ------------- | ----- | ----------- | ------------------ | ----------------- | ------------------------------ | ------- | ------------- | ------------------ | --------------------- |
| H0 baseline | (no src/ touched) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| H12 (T11 SUBMIT) | src/modules/tickets/* (10 files) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 (n/a read-only) | 0 |

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
