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
- **Active task**: **T11 — Tickets list + detail** (issued in §2; impl unblocked by T02, merge-blocked by T03/T04 seam — see below)
- **Branch**: `feat/tickets-list-detail` (to be created by exec-B; code stays on branch, PO merges manually)
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
| T11 | Tickets list + detail (GET + filters + cursor pagination) | assigned | — | ASSIGNMENT issued §2 (2026-07-01). Impl unblocked (T02). Merge-blocked on T03/T04 seam (Slot A). Contract GAP Q-B-01. Awaiting exec-B PLAN. |
| T12–T20 | Core CRM backlog (see PARENT §1)  | backlog  | —              | Released per dependency chain / gate  |

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
| Q-B-01        | Canonical **response envelope** for `GET /api/tickets` (+ `/:id`): pagination wrapper (`data`/`meta`), cursor field name, JSON field casing (camel vs snake). `docs/API-CONTRACT.md §2.2` cited by MVP brief but absent from this repo; truth = FE MSW handlers (separate repo). | T11 · MVP §1.2 / §6 | open — escalated to Parent PM (PARENT §3a) | Pending PO/Parent. Interim: exec-B proposes envelope in T11 PLAN for PM B ACK against §1.2 field names. |
| Q-B-02        | Session context shape/ownership: is `SessionContext {hotelId,userId,role,deptId}` a Slot-A-owned shared type (from T03/T04 middleware) or per-module? Affects T11 seam + all B tasks. | T11 · MVP §4.1 | open — coordinate w/ Slot A via Parent §10 | Pending T03/T04 design (Nanak). |

---

## 4. Drift baseline (slot B files only, end of each day)

| Run | Touched files | `any` | console.log | `throw new Error(` | forbidden imports | default export (di luar entry) | `.skip` | hardcoded URL | webhook tanpa HMAC | wrap-Prisma interface |
| --- | ------------- | ----- | ----------- | ------------------ | ----------------- | ------------------------------ | ------- | ------------- | ------------------ | --------------------- |
| H0 baseline | (no src/ touched) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

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
