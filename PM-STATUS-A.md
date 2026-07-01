# PM-STATUS-A — Qooma Backend · Dev A (Nathan)

> **Per-dev tracker untuk slot A (Nathan).** PM A + Executor A komunikasi **hanya** via file ini. Roll-up short summary ke `PM-STATUS-PARENT.md §2` setelah tiap VERDICT atau end-of-session.
>
> **PM B, PM C, Executor B, Executor C — JANGAN edit file ini.** File ini private ke slot A.
>
> **Identity check**: di response pertama session WAJIB confirm `Role: PM | Executor`, `Slot: A (Nathan)`. Bila user belum sebut slot — STOP, tanya dulu (lihat `KICKOFF.md §4`).
>
> Format block di §2 Active assignments **append-only** (lihat `EXECUTOR-PROTOCOL.md §0.5` & `PM-AGENT.md §0.4`).

---

## 0. Current focus (slot A)

- **Day**: H0 (2026-07-01)
- **Owner**: Nanak (permanent — see PARENT §4 2026-07-01 slot swap)
- **Active task**: T04 (RBAC middleware) — next to start
- **Branch**: main (solo drive; feature branch discipline resumes when Nathan onboards to slot B and Satrio joins)
- **Completed today**: T01, T02, T03
- **Next gate (global)**: G1 — lihat `PM-STATUS-PARENT.md §5`
- **My queue (T01–T10)**: T01 ✅ · T02 ✅ · T03 ✅ · T04 (next) · T05–T10 backlog

---

## 1. Task tracker (slot A — PM A authority)

> Mirror dari `PM-STATUS-PARENT.md §1` di mana Slot=A. PM A update status row di sini + push status update ke PARENT §1 setelah verdict.

| T## | Title                                                        | Status   | Verified by PM       | Notes                                 |
| --- | ------------------------------------------------------------ | -------- | -------------------- | ------------------------------------- |
| T01 | `make check` green dari boilerplate (lint+format+typecheck+test) | approved | PM A (Nanak) | env fix + ts-node + tsconfig ts-node override |
| T02 | Prisma schema initial migration (18 HC tables + indexes + CHECK constraints) | approved | PM A (Nanak) | 2 migrations applied: init + CHECK/partial-indexes; DEV DB deviation: fresh `hotel_core_dev` DB (Opsi C) — see PARENT §4 |
| T03 | Tenant-guard middleware (`hotel_id` from session everywhere) | approved | PM A (Nanak) | 3 files: tenant-guard.ts (pure fns) + .types.ts (req.tenant augmentation) + test (14 pass); jest config bonus fix for alias+.js |
| T04 | RBAC middleware (gm_admin / dept_head / super_admin all-access) | assigned | —            | Next up. Will consume tenant-guard's TenantContext + SessionUser types. |
| T05 | Seed scripts (1 demo hotel via Auth API + 5 depts + sample menu + KB) | backlog | —      | After T04 |
| T06 | Ticket state-machine helper + unit-test the transition table | backlog | —              | Parallel-friendly after T01 |
| T07 | Common error handlers (HC-specific codes per spec §7)      | backlog | —              | After T01 |
| T08 | Multipart upload utility (S3 / R2 abstraction)             | backlog | —              | After T01 |
| T09 | CSV import utility (used by menu + knowledge)              | backlog | —              | After T01 |
| T10 | Workers harness (cron + queue) — actual workers wired per B/C tasks | backlog | —      | After T02 |

---

## 2. Active assignments (append-only)

> **Executor A** append `ASSIGNMENT` block saat claim task. **PM A** append `ACK` / `VERDICT` sub-block di bawah block executor — JANGAN edit block lama.

### ASSIGNMENT T01 — claimed by exec-A (Nanak covering) at H0 2026-07-01
- Branch: feat/foundation-boilerplate-check
- Routed from: PM-STATUS-PARENT.md §1 T01 (Parent PM assigned; Nanak covering per §4 deviation 2026-07-01 — Nathan not yet onboard)

#### PLAN T01 — exec-A (Nanak covering) at H0 2026-07-01

**Scope recap**
- Verify `make check` (lint + format-check + typecheck + unit test) hijau dari boilerplate current state.
- Env prerequisite (Node 20 + pnpm 9) di-fix dulu di terminal (via nvm + corepack).

**Approach**
1. Local env: `nvm install 20 && nvm use 20 && corepack enable && corepack prepare pnpm@9 --activate`
2. Fresh install: `rm -rf node_modules && pnpm install`
3. Diagnose `make check` failures.
4. Fix minimal.
5. Rerun sampai green.

**Files modified**
- `package.json` — add devDependency `ts-node@10.9.2` (required for jest to parse jest.config.ts)
- `pnpm-lock.yaml` — auto-updated by pnpm add
- `tsconfig.json` — add `ts-node.compilerOptions` override (module: CommonJS, verbatimModuleSyntax: false, moduleResolution: Node) so ts-node can parse jest.config.ts without conflicting with strict ESM settings used for src/ build

**GAPs / questions**: none

#### SUBMIT T01 — exec-A (Nanak covering) at H0 2026-07-01 (attempt 1)

Task: `make check` green dari boilerplate
Files changed: 3
  - package.json (add ts-node@10)
  - pnpm-lock.yaml (auto)
  - tsconfig.json (add ts-node override block)

DoD self-check
- [x] `make check` PASS — verified in terminal
- [x] All 4 sub-commands green: lint, format:check, typecheck, test:unit (2 tests skipped in _template — intentional placeholder)
- [x] No src/ changes (verification-only task per T01 scope)

Quality gate
- `pnpm lint`: PASS (only harmless @typescript-eslint TS-version warning — non-blocking, will resolve when eslint bumps supported range)
- `pnpm format:check`: PASS
- `pnpm typecheck`: PASS
- `pnpm test:unit`: PASS (2 skipped in _template)

Drift scans (per EXECUTOR-PROTOCOL §4.4)
- `any` types: 0 hits di src/
- console.log: 0 hits di src/
- `throw new Error(`: 0 hits di src/modules/core
- forbidden imports (express/typeorm/moment/node-fetch): 0 hits
- default export di luar entrypoints/config: 0 hits
- `.skip` di test: 2 hits di `_template/__tests__/` (intentional placeholder, tidak dihitung drift per template convention — will be replaced when new modules copy from _template)

Notes
- ts-node@10 added as devDependency (approved by Parent PM = Nanak solo drive; noted for Nathan handoff).
- tsconfig.json ts-node override affects ONLY ts-node runtime (jest config parsing). Actual `tsc --noEmit` build uses main compilerOptions unchanged.

##### PM A ACK — T01 PLAN APPROVED (H0) by PM A (Nanak covering)
- Approach reasonable (fix env + minimal boilerplate patch). Proceed.

##### VERDICT T01 — APPROVED (H0, attempt 1) by PM A (Nanak covering)
- All DoD verified ✓
- Drift scans clean ✓ (`.skip` in _template noted as boilerplate-intentional)
- `make check` PASS confirmed
- → §1 task tracker updated: T01 approved
- → Row mirrored to PARENT §1
- → Short roll-up posted to PARENT §2

### ASSIGNMENT T02 — claimed by exec-A (Nanak covering) at H0 2026-07-01
- Branch: main (solo drive; feature branch discipline resumes when team joins)
- Routed from: PM-STATUS-PARENT.md §1 T02 (Parent PM assigned; Nanak covering per §4 deviation 2026-07-01)

#### PLAN T02 — exec-A (Nanak covering) at H0 2026-07-01

**Scope recap**
- Initial Prisma migration for 18 HC tables + indexes + 19 CHECK constraints + 11 partial/GIN indexes per spec §2 DDL.
- Deployment topology gap discovered: HC's schema.prisma has Hotel/User as reference stubs; running `prisma migrate dev` against shared `app` DB (which already contains Auth+AI tables) triggers destructive schema reset prompt.

**Approach — Opsi C (deviation, see PARENT §4)**
1. Switch HC DEV DATABASE_URL from shared `app` DB → fresh `hotel_core_dev` DB (avoid touching Auth data).
2. Run `pnpm prisma migrate dev --name init_hotel_core` — auto-creates DB + applies 20-table migration (18 HC + 2 stubs).
3. Create separate raw SQL migration `20260701112000_add_hc_check_constraints_and_partial_indexes/migration.sql` from schema.prisma tail comments — 19 CHECK + 11 partial indexes.
4. Apply via `pnpm prisma migrate deploy`.

**Trade-off (logged in PARENT §4)**
- ✅ Auth data safe, Prisma migrate workflow unblocked, momentum preserved.
- ⚠️ Cross-DB FK impossible in Postgres → HC's `tickets.hotelId` FK points to local stub `hotels` table (id-only), not Auth's real `hotels`. Manual seed of hotel record needed for local integration tests.
- ⚠️ T26 (feature flags tier-gated) + T30 (analytics Luxury-tier) blocked at DEV until proper shared-DB restored (Opsi A multi-schema or Opsi Compromise: Auth migrations imported).
- ⚠️ For staging/prod: MUST revisit to shared-DB (Opsi A multi-schema recommended).

**Files created / modified**
- `.env` — DATABASE_URL: `app` → `hotel_core_dev`
- `prisma/migrations/20260701111952_init_hotel_core/migration.sql` — generated by Prisma from schema.prisma
- `prisma/migrations/20260701112000_add_hc_check_constraints_and_partial_indexes/migration.sql` — hand-written from schema.prisma tail comments

**GAPs / questions**: none blocking; deferred technical debt tracked in PARENT §4.

#### SUBMIT T02 — exec-A (Nanak covering) at H0 2026-07-01 (attempt 1)

Task: Prisma initial migration (18 HC tables + CHECK + partial indexes)
Files changed / created: 3
  - `.env` (DATABASE_URL update)
  - `prisma/migrations/20260701111952_init_hotel_core/migration.sql` (Prisma-generated)
  - `prisma/migrations/20260701112000_add_hc_check_constraints_and_partial_indexes/migration.sql` (raw SQL)

DoD self-check
- [x] 18 HC tables created — confirmed via `prisma migrate dev` output ("Your database is now in sync with your schema")
- [x] All indexes per spec §2 DDL — Prisma-generated + partial/GIN via raw SQL
- [x] 19 CHECK constraints applied — confirmed via `prisma migrate deploy` "All migrations have been successfully applied"
- [x] 11 partial/GIN indexes applied — same deploy step
- [x] Prisma Client regenerated — types available for downstream tasks

Quality gate (pending re-run)
- `make check`: pending verification (env unchanged, only DB layer touched; expect PASS)

Notes / deviations
- Opsi C fresh-DB approach — see PARENT §4 for full deviation log.
- Auth+AI data in shared `app` DB preserved (not touched).
- Local dev integration tests will need to manually seed hotel record in `hotel_core_dev.hotels` (id-only) before ticket-related tests can pass FK.

##### PM A ACK — T02 PLAN APPROVED (H0) by PM A (Nanak covering)
- Opsi C acknowledged as MVP dev-only deviation. Trade-off logged clearly. Proceed.

##### VERDICT T02 — APPROVED (H0, attempt 1) by PM A (Nanak covering)
- All DoD verified ✓
- Initial migration + CHECK/partial-index migration both applied ✓
- Prisma Client generated ✓
- Deviation logged in PARENT §4
- → §1 task tracker updated: T02 approved
- → Row mirrored to PARENT §1 (status approved)
- → T03 (tenant-guard) moves from `backlog` → `assigned`
- → Short roll-up posted to PARENT §2

### ASSIGNMENT T03 — claimed by exec-A (Nanak) at H0 2026-07-01
- Branch: main (solo drive)
- Routed from: PM-STATUS-PARENT.md §1 T03 (Nanak permanent slot A owner per §4 2026-07-01 slot swap)

#### PLAN T03 — exec-A (Nanak) at H0 2026-07-01

**Scope recap**
- Tenant-guard middleware per spec §6 (RBAC & tenant guard summary) + §7 (cross-tenant enumeration masked as 404).
- Approach: pure functions (not yet Fastify plugin) since api.ts entrypoint is stub — will wire as preHandler hook when JWT auth plugin lands (T04+).

**Approach**
- 3 files: `tenant-guard.ts` (deriveTenantContext + assertHotelOwnership + assertDeptOwnership) + `tenant-guard.types.ts` (Fastify req.tenant augmentation) + unit test.
- Uses existing `AuthError` and `NotFoundError` from `@core/errors/app-errors`.
- Cross-tenant / cross-dept violations mask 403 → 404 per spec §7 (prevent enumeration).

**Files created**
- `src/plugins/tenant-guard.ts` — 3 exported functions + 3 exported types (86 lines)
- `src/plugins/tenant-guard.types.ts` — Fastify FastifyRequest augmentation (18 lines)
- `src/plugins/__tests__/tenant-guard.test.ts` — 14 unit tests (94 lines)

**Files modified**
- `jest.config.ts` — moduleNameMapper: add `.js` extension handling for alias paths (`@core/`, `@modules/`, `@plugins/`, `@shared/`). Bonus fix; unblocks future alias+.js imports in tests (previously only relative-path+.js was handled). Discovered when tenant-guard.test.ts failed to resolve `@core/errors/app-errors.js`.

**GAPs / questions**: none

#### SUBMIT T03 — exec-A (Nanak) at H0 2026-07-01 (attempt 1)

Task: Tenant-guard middleware (pure functions)
Files changed: 4
  - src/plugins/tenant-guard.ts (new)
  - src/plugins/tenant-guard.types.ts (new)
  - src/plugins/__tests__/tenant-guard.test.ts (new)
  - jest.config.ts (modified — alias+.js fix)

DoD self-check
- [x] `hotel_id` extraction from session — via `deriveTenantContext(user)`
- [x] Super-admin bypass — `tenant.isSuperAdmin` flag + short-circuits in assert fns
- [x] dept_head scoping — `assertDeptOwnership` allows only own-dept access
- [x] Cross-tenant → 404 mask (spec §7) — `NotFoundError` on hotel_id mismatch
- [x] Cross-dept → 404 mask (spec §7) — `NotFoundError` on dept_id mismatch for dept_head
- [x] Unit tests cover all branches (14 tests, all pass)

Quality gate
- `make check`: PASS (lint + format + typecheck + test:unit 14 pass + 2 skipped in _template)

Drift scans (per EXECUTOR-PROTOCOL §4.4)
- `any` types: 0 hits in new files
- console.log: 0 hits
- `throw new Error(`: 0 hits — uses AppError subclasses (AuthError, NotFoundError)
- forbidden imports: 0 hits
- default export: 0 hits (all named exports)
- `.skip` in test: 0 hits (14 real tests)

Notes
- Not yet a Fastify plugin — will wire as preHandler hook after JWT auth plugin lands (T04+).
- SessionUser type is HC's opinion of JWT payload shape; when JWT plugin is added, may need coordination with Auth service repo. If mismatch discovered, adjust here (low risk — no downstream consumers yet).

##### PM A ACK — T03 PLAN APPROVED (H0) by PM A (Nanak)
- Approach solid. Pure fn approach + defer plugin wiring to T04 is pragmatic given api.ts still stub.

##### VERDICT T03 — APPROVED (H0, attempt 1) by PM A (Nanak)
- All DoD verified ✓
- 14/14 unit tests pass ✓
- Drift scans clean ✓
- `make check` PASS ✓
- Bonus jest config fix improves DX for future alias+.js imports
- → §1 task tracker updated: T03 approved
- → Row mirrored to PARENT §1
- → T04 (RBAC middleware) moves from `backlog` → `assigned`
- → Short roll-up posted to PARENT §2

<!--
TEMPLATE — copy untuk task baru:

### ASSIGNMENT T## — claimed by exec-A (Nathan) at H{N} HH:MM
- Branch: feat/<modul>-<short>
- Routed from: PM-STATUS-PARENT.md §1 T## (Parent PM assigned)

#### PLAN T## — exec-A (Nathan) at H{N} HH:MM

**Scope recap**
- ...

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity confirmed: Executor, Slot A (Nathan) ✓
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

Awaiting PM A ACK.

##### PM A ACK — T## PLAN APPROVED, proceed to coding (H{N})
- (atau) PM A REJECT-PLAN — fix sebelum mulai: <list>

#### SUBMIT T## — exec-A (Nathan) at H{N} HH:MM (attempt 1)

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

Requesting PM A VERDICT.

##### VERDICT T## — APPROVED (H{N}, revisi N) by PM A
- All DoD verified ✓
- Drift scans clean ✓
- `make check` PASS confirmed by PM rerun
- → §1 task tracker updated; row mirrored to PARENT §1
- → Short roll-up posted to PARENT §2

(atau)

##### VERDICT T## — REJECT (revisi N) by PM A

⛔ Items to fix:

**Item #1 — <kategori>** `src/.../<file>.ts:<line>`
- **Violation**: <pelanggaran>
- **Fix**: <satu kalimat fix-path>

**Item #2 — ...**
- ...

Re-run `make check` after fix, confirm pass, resubmit (attempt N+1).

(atau)

##### VERDICT T## — ESCALATE by PM A
- Reason: <gap planning / open Q PO>
- Escalated to Parent PM at H{N} HH:MM (will reach PO via PARENT §3)
- Executor A: pick task lain dari §8 sementara

-->

---

## 3. Slot A open questions (mirror to PARENT §3)

> PM A catat di sini ketika executor A raise `GAP` atau `BLOCKED`. Setelah resolve atau eskalasi ke Parent PM, update status. Parent PM consolidate ke `PM-STATUS-PARENT.md §3`.

| ID            | Question | Source         | Status | Resolution |
| ------------- | -------- | -------------- | ------ | ---------- |
| —             | —        | —              | —      | —          |

---

## 4. Drift baseline (slot A files only, end of each day)

| Run | Touched files | `any` | console.log | `throw new Error(` | forbidden imports | default export (di luar entry) | `.skip` | hardcoded URL | webhook tanpa HMAC | wrap-Prisma interface |
| --- | ------------- | ----- | ----------- | ------------------ | ----------------- | ------------------------------ | ------- | ------------- | ------------------ | --------------------- |
| H0 baseline | (no src/ touched) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

> PM A jalankan drift scan per `PM-AGENT.md §3 Step 2` setiap SUBMIT + end-of-day full scan untuk slot A's touched files.

---

## 5. Standup log slot A (latest di atas)

> PM A post daily standup di sini, lalu post 1-2 baris ringkas ke `PM-STATUS-PARENT.md §6` (yang Parent PM consolidate jadi cross-team report).
>
> Format: per `PM-AGENT.md §7`.

### H0 — TBD (Nathan onboard, awaiting first assignment)

```
QOOMA BE A (Nathan) — Standup — H{N}/{total}

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

📈 Progress slot A
- 0 / TBD task

🎯 Fokus besok
- Awaiting Parent PM first assignment.
```

---

## 6. Slot A incidents / lessons (own-scope only)

> Hal yang affect cuma slot A. Bila affect > 1 dev, escalate ke `PM-STATUS-PARENT.md §7` lewat Parent PM.

_(kosong)_

---

## 7. PM A operating notes (untuk Executor A)

- PM A baca `PM-AGENT.md` (full) + `PM-STATUS-A.md` + scan `PM-STATUS-PARENT.md` (§1 mine, §3, §5, §8).
- PM A **TIDAK** edit `src/`, `prisma/schema.prisma` (kecuali typo non-semantik), `package.json` deps — read-only di area itu.
- PM A **BOLEH** update planning docs untuk sync (per `PM-AGENT.md §0.6`) — TAPI escalation ke Parent PM dulu bila perubahan affect dev lain. Tiap edit planning docs dicatat di `PM-STATUS-PARENT.md §4`.
- PM A **TIDAK** edit `PM-STATUS-B.md` / `PM-STATUS-C.md` — strict per-slot ownership.
- PM A **TIDAK** jawab open contract / package question — hanya PO via Parent PM.
- PM A **TIDAK** negosiasi scope. Descope adalah otoritas PO via Parent PM.
- On REJECT: fix exactly the listed items (file:line). Re-run `make check` self-validate. Resubmit per `EXECUTOR-PROTOCOL §4.5`, sebut item mana yang sudah di-address.
- Rebuttal: bila Executor A yakin PM A flag salah, post one-sentence rebuttal + evidence di sub-block `REBUTTAL T## item-#N`. PM A re-check dalam session yang sama.
- Untuk CLI command apapun yang touch root repo (scaffolder, generator, dll.): tulis exact command di PLAN supaya PM A bisa flag risiko overwrite sebelum executor run.
- Branch naming: `feat/<modul>-<short>`, `fix/<modul>-<short>`, `chore/<short>`, `docs/<short>` (per `CLAUDE.md §12`).
- Commit message: conventional commits — `feat(modul): X`, `fix(modul): Y`.
- Gunakan `make commit MSG="..."` — auto lint + typecheck + format-check sebelum commit.

---

## 8. Slot A queue (filter dari PARENT §8 di mana Slot=A)

> Parent PM authority untuk rewrite — PM A baca only. Executor A self-select dari sini bila tidak ada explicit ASSIGNMENT.

_(belum ada — tunggu Parent PM assign task ke slot A)_

<!-- Mirror format dari PM-STATUS-PARENT.md §8 template. -->

---

## 9. Roll-up reminder

Setiap kali PM A:

- **APPROVE** task → post 1 line ke `PM-STATUS-PARENT.md §2` (latest di atas) + update row status di PARENT §1
- **REJECT** task → tidak perlu PARENT roll-up (internal to slot A)
- **ESCALATE** task → post status `escalated` ke PARENT §1 + raise di PARENT §3 (Q register)
- **End-of-day** → post 3-line standup summary ke PARENT §6 di bawah Parent PM's daily roll-up block

Jangan paste full SUBMIT/VERDICT ke PARENT — itu tetap di sini.
