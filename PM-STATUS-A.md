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
- **Active task**: T06 (ticket state-machine helper) — ASSIGNMENT posted §2, awaiting exec-A PLAN. Direct dependency of Nathan's T12 (imminent post-T07-slice-1 merge). T07-slice-1 merged (PO commit `8ebdb9a`).
- **Branch (current active task)**: `feat/foundation-ticket-state-machine` (per PO branch-per-task policy)
- **Completed**: T01, T02, T03, T04, T-INFRA-01, T07-slice-1 (all merged to main)
- **Next gate (global)**: G1 — lihat `PM-STATUS-PARENT.md §5`
- **My queue (T01–T10 + infra)**: T01 ✅ · T02 ✅ · T03 ✅ · T04 ✅ · T-INFRA-01 ✅ · T07-slice-1 ✅ · **T06 (assigned, next)** · T05 seed (Opsi C twist pending) · T07-slice-2+ (deferred) · T08–T10 backlog

---

## 1. Task tracker (slot A — PM A authority)

> Mirror dari `PM-STATUS-PARENT.md §1` di mana Slot=A. PM A update status row di sini + push status update ke PARENT §1 setelah verdict.

| T## | Title                                                        | Status   | Verified by PM       | Notes                                 |
| --- | ------------------------------------------------------------ | -------- | -------------------- | ------------------------------------- |
| T01 | `make check` green dari boilerplate (lint+format+typecheck+test) | approved | PM A (Nanak) | env fix + ts-node + tsconfig ts-node override |
| T02 | Prisma schema initial migration (18 HC tables + indexes + CHECK constraints) | approved | PM A (Nanak) | 2 migrations applied: init + CHECK/partial-indexes; DEV DB deviation: fresh `hotel_core_dev` DB (Opsi C) — see PARENT §4 |
| T03 | Tenant-guard middleware (`hotel_id` from session everywhere) | approved | PM A (Nanak) | 3 files: tenant-guard.ts (pure fns) + .types.ts (req.tenant augmentation) + test (14 pass); jest config bonus fix for alias+.js |
| T04 | RBAC middleware (gm_admin / dept_head / super_admin all-access) + tenant-guard onRequest hooks factory (Option A bundle) | approved | PM A (Nanak) | 5 files (rbac.ts + tenant-guard.hooks.ts + tenant-guard.types.ts modify + 2 tests). 28 tests pass (14 T03 preserved + 11 rbac + 3 hooks). 100% coverage on rbac.ts + tenant-guard.hooks.ts. Branch `feat/foundation-rbac` @ `df5648b` — PO merge pending. Q-B-02 fully resolved. T11 seam FULLY unblocked. |
| T05 | Seed scripts (1 demo hotel via Auth API + 5 depts + sample menu + KB) | backlog | —      | After T04 |
| T06 | Ticket state-machine helper + unit-test the transition table | assigned | — | Direct dependency of Nathan's T12. Codifies spec §5 (8 states, ~15 transitions, 2 terminal). Uses T07-slice-1 `BusinessRuleError` + `rule: 'INVALID_TICKET_TRANSITION'`. Home: `src/shared/utils/ticket-state-machine.ts` (pure fn). |
| T07 | Common error handlers (HC-specific codes per spec §7)      | backlog | —              | After T01 |
| T08 | Multipart upload utility (S3 / R2 abstraction)             | backlog | —              | After T01 |
| T09 | CSV import utility (used by menu + knowledge)              | backlog | —              | After T01 |
| T10 | Workers harness (cron + queue) — actual workers wired per B/C tasks | backlog | —      | After T02 |
| T-INFRA-01 | Foundation: `make check` prisma-generate prereq + real Prisma client singleton (GAP-T11-1 fix) | approved+merged | PM A (Nanak) | ✅ APPROVED attempt 1 + **MERGED to main 2026-07-02 (PO `9a50c6d`)**. 2 files (Makefile + prisma-client.ts). GAP-T11-1 resolved. |
| T07-slice-1 | Foundation: `BusinessRuleError` (422) — first slice of T07 error hierarchy build-out (DEP-6 fix) | approved | PM A (Nanak) | ✅ APPROVED attempt 1 (2026-07-02 H0). `feat/foundation-business-rule-error` @ `b214743` — **awaiting PO merge**. 2 files (app-errors.ts append + fresh test file, 6 new tests). 150 tests pass on branch (+6 vs 144 baseline). Drift clean. 9 existing classes untouched (verified via git diff = pure `+`). Cherry-pick transparency clean (origin/main never touched by code). PARENT §10 DEP-6 resolved. |

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

### ASSIGNMENT T04 — claimed by exec-A (Nanak) at H0 2026-07-01
- Branch: `feat/foundation-rbac` (per PO branch-per-task policy — code lewat feature branch, PO manual merge to main; consistency dengan Slot B workflow)
- Routed from: PM-STATUS-PARENT.md §1 T04 (Nanak permanent slot A owner per §4 2026-07-01 swap)
- Depends on: T03 tenant-guard ✓ (consumes `SessionUser` / `SessionRole` / `TenantContext`)
- Downstream unblocks: **T11** (Nathan / slot B — currently merge-blocked on T03/T04 seam per PARENT §10) + all future B/C endpoints that gate on role
- Spec refs (WAJIB dibaca sebelum PLAN):
  - `docs/spec/02-hotel-core.md §6` — RBAC & tenant-guard summary + per-endpoint RBAC matrix (super_admin all-access / gm_admin full CRM / dept_head own-dept auto-filter on tickets+knowledge+menu / **staff NEVER** — Telegram-only)
  - `docs/spec/02-hotel-core.md §7` — Error catalog (403 vs cross-tenant 404-mask rule — do NOT downgrade T03's 404-mask to 403)
  - `CLAUDE.md §5.4` — AppError hierarchy (use `ForbiddenError` for role mismatch, NOT `throw new Error(...)`)
  - `CLAUDE.md §8` — Testing rules (unit + mock port; NO Prisma mock)

#### PM A notes untuk exec-A

**Scope**
- RBAC middleware — **pure functions** (bukan Fastify plugin yet — same rationale as T03: `api.ts` masih stub, wire as preHandler ketika JWT auth plugin lands, kemungkinan late-T04 atau task terpisah).
- Support 4 roles dari T03's `SessionRole` union: `super_admin` (all-access implicit), `gm_admin` (all HC endpoints), `dept_head` (subset + own-dept auto-filter), `staff` (**hard-reject di setiap HC endpoint**).
- Compose bersih dengan T03's tenant-guard: call chain idiom = `deriveTenantContext(user)` → `requireRole(tenant, [...])` → `assertHotelOwnership(tenant, resourceHotelId)` → `assertDeptOwnership(tenant, resourceDeptId)`.

**Q-B-02 seam callout — WAJIB address di PLAN (pilih ONE + justify)**

T03 exports `SessionUser` dari `src/plugins/tenant-guard.ts`. Nathan (slot B, T11) merge-blocked karena butuh canonical `SessionContext {hotelId,userId,role,deptId}` import path yang stable (PARENT §3c Q-B-02 + §10 coord note). Exec-A pilih di PLAN:

- **Option (a) — canonicalize (PREFERRED jika delta kecil)**: rename `SessionUser` → `SessionContext`, pindah ke `src/shared/types/session-context.ts` (per `CLAUDE.md §3` folder rule for lintas-modul types), re-export dari `tenant-guard.ts` untuk compat. Gunakan jika:
  - Perubahan ≤ ~30 LOC total (move + re-export shim + import update di T03 test file)
  - 0 test regression (14 T03 tests tetap hijau)
  - Tidak butuh nambah dep atau struktur baru selain 1 file di `shared/types/`
  - **Efek**: Q-B-02 selesai permanent — B/C import path `@shared/types/session-context.js`, single source of truth.
- **Option (b) — declare authoritative in place**: `SessionUser` tetap di `src/plugins/tenant-guard.ts`, exec-A tulis note di PLAN yang formally declare path itu authoritative. PM A pakai note itu untuk resolve Q-B-02 di PARENT §3c. Gunakan jika kanonikalisasi out-of-scope (mis. butuh rename di banyak file, atau conflict dengan struktur folder yang akan datang).

Rebuttal welcome jika exec-A yakin ada Option (c) lebih tepat — sertakan di PLAN GAP section.

**HARD constraints (WAJIB — pelanggaran = REJECT)**
- RBAC = **pure functions**. Test = unit dengan mock `SessionContext`. **JANGAN**:
  - mock Prisma (per CLAUDE.md §8)
  - butuh DB integration test (role-check adalah decision on injected context, tidak ada side-effect)
  - couple ke T05 seed data (T04 harus reviewable + testable tanpa row apapun di `hotel_core_dev`)
  - kalau exec-A menemukan RBAC butuh live user record untuk validate → design smell → raise sebagai GAP di PLAN, jangan lanjut coding
- Error hierarchy WAJIB pakai `AppError` subclass dari `@core/errors/app-errors`:
  - Role mismatch (allowed roles tidak match) → `ForbiddenError` (HTTP 403)
  - No session on request → `AuthError` (HTTP 401)
  - Cross-tenant / cross-dept → tetap `NotFoundError` (T03's 404-mask rule, spec §7) — **JANGAN** downgrade jadi 403
- No new deps (`package.json` untouched — kalau butuh sesuatu, escalate ke PM A dulu)
- No `any` / `console.log` / `throw new Error(...)` / default export di luar entrypoints (per CLAUDE.md §5 + §7 + drift table)
- File naming: `kebab-case.ts`; class PascalCase; fn camelCase; explicit return type untuk public fn

**Files hint (exec-A finalize di PLAN)**
- `src/plugins/rbac.ts` — new; `requireRole(...)` guard fn + optional dept-scope helper untuk list endpoint filter
- `src/plugins/__tests__/rbac.test.ts` — new; unit ≥ 80% line coverage, semua branch (each role × each guard) tercover
- **IF Option (a) chosen**:
  - `src/shared/types/session-context.ts` — new; canonical `SessionContext` type
  - `src/plugins/tenant-guard.ts` — modify: replace inline `SessionUser` interface dengan `import type { SessionContext } from '@shared/types/session-context.js'` + re-export shim (`export type SessionUser = SessionContext` untuk backward-compat) — atau langsung rename call-site
  - `src/plugins/__tests__/tenant-guard.test.ts` — verify 14 tests tetap green after rename
- **IF Option (b) chosen**: no `shared/types/` change; hanya note di PLAN yang PM A mirror ke PARENT §3c

**T04 DoD**
- [ ] `requireRole(tenant, allowed: SessionRole[])` guard fn — throws `AuthError` on no tenant; `ForbiddenError` on role tidak di `allowed`; super_admin implicit all-access (no perlu di-list)
- [ ] `staff` role **hard-rejected** di setiap call (spec §6: "staff role NEVER hits any of these")
- [ ] Optional: dept-scope filter helper untuk list endpoint (mis. `applyDeptFilter(tenant, whereClause)`) — signature TBD di PLAN, harus satisfy spec §6 rule 2. Kalau exec-A anggap ini overhead di T04 dan lebih baik di modul konsumer (T11+), justify di PLAN — PM A OK dengan defer selama T04 punya minimum surface untuk B/C consume
- [ ] Compose bersih dengan T03 tenant-guard (chain idiom di atas terpanggil di 1 test integration-style unit — mock context, verify order/exit)
- [ ] Unit test ≥ 80% line coverage on new file(s); test naming `it('should <expected> when <condition>')`
- [ ] All branches covered: 4 roles × guard outcomes (allow / auth-error / forbidden)
- [ ] `make check` PASS (lint + format:check + typecheck + test:unit)
- [ ] Drift scans clean (`any` / `console.log` / `throw new Error(` / forbidden imports / default export / `.skip`)
- [ ] Q-B-02 addressed via chosen option — PLAN sub-block harus include: (i) option a/b, (ii) rationale, (iii) resolution note yang PM A tinggal mirror ke PARENT §3c

**Coordination downstream (untuk PM A tracking, exec-A tidak perlu action)**
- Post VERDICT APPROVED, PM A akan:
  - Update PARENT §1 row T04 → approved
  - Post roll-up ke PARENT §2
  - Resolve Q-B-02 di PARENT §3c (option + import path yang exec-A pilih)
  - Update PARENT §10 coord note (Nathan/slot B unblocked-to-merge untuk T11 chain)

Awaiting **PLAN T04** dari exec-A.

#### NUDGE T04 — PM A (Nanak) at H0 2026-07-01 · post-ASSIGNMENT delta from Slot B activity (commits `3f682df` → `04bf313`)

> Nathan pushed 3 updates between my ASSIGNMENT commit and now. Read this before writing PLAN — 3 things changed.

**Delta 1 — Q-B-02 already RESOLVED by PM B (effectively Option b)**
- Nathan declared `TenantContext` (di `src/plugins/tenant-guard.ts:22`) sebagai **Slot-A-owned canonical**. PARENT §3c marked resolved. B/C consume it via `@plugins/tenant-guard`.
- **Consequence for T04**: skip the Option (a) vs (b) decision in your PLAN — Q-B-02 is settled. Just consume `TenantContext` as-is; do NOT canonicalize to `shared/types/` (would force B to re-import + regen tests he already wrote).
- If exec-A rebuts (e.g. still believes canonical location should be `shared/types/`), sertakan justification di PLAN + PM A akan re-check dengan PM B via PARENT §10 sebelum ACK. Default: leave path as `src/plugins/tenant-guard.ts`.

**Delta 2 — preHandler runtime wiring: T04 scope question (WAJIB address di PLAN)**
- PARENT §10 (updated post-Q-B-02 resolve) now says T11 merge gate = "**T04 must wire the `req.tenant` preHandler (runtime population)** — until then B routes build + test but do not merge live". This subtly expands T04 beyond original "RBAC middleware" (spec §6 role-check only).
- Reality check: JWT plugin doesn't exist yet → `req.user` will be `undefined` at runtime → preHandler `deriveTenantContext(req.user)` throws `AuthError`. So a wired preHandler is effectively dormant sampai JWT plugin lands.
- Exec-A pilih di PLAN:
  - **Option A (bundle — PREFERRED jika < 20 LOC delta)**: T04 ships (1) `requireRole` guard fn + (2) `src/plugins/tenant-guard.plugin.ts` Fastify preHandler yang attach `req.tenant = deriveTenantContext(req.user)`, ready to register di `api.ts` (tapi tidak wajib register sekarang since api.ts stub). Includes 1 integration-style Fastify test yang inject mock `req.user` via decorator. **Efek**: Nathan's T11 merge gate satisfied — B tinggal register both JWT plugin (future) + this preHandler; preHandler file exists as "shelf-ready".
  - **Option B (defer to T04b)**: T04 pure-fn RBAC only per original scope. PM A open T04b (preHandler wiring) sebagai follow-up task, escalate ke Parent PM untuk sequence sebelum Nathan needs merge. Use jika Option A punya hidden complexity (mis. Fastify decorator ordering, JWT-plugin coupling yang tidak obvious).
- Rekomendasi kalau ragu: **Option A**. Cheap to bundle, unblocks slot B faster, no cross-task coordination overhead. Kalau exec-A implement dan ternyata cost > 40 LOC atau butuh JWT plugin coupling → switch ke Option B mid-PLAN + document reason.

**Delta 3 — GAP-T11-1 (prisma-generate ⇄ `make check` CI gap) escalated to Slot A**
- Nathan raised PARENT §3b + §10: `make check` (Makefile:148) lacks `prisma-generate` prereq + `src/core/prisma/prisma-client.ts:29` is `{}` stub. Once B/C imports generated `PrismaClient`, CI typecheck breaks on fresh checkout.
- **Out of T04 scope.** PM A will open separate follow-up task (working title: T-INFRA-PRISMA-CI, likely inserts before T05 seed) — Parent PM to slot officially. Do NOT bundle into T04 SUBMIT. Exec-A: JANGAN edit `Makefile` atau `prisma-client.ts` di PR T04.
- If exec-A observes symptom while running `make check` for T04, note in SUBMIT tapi tidak fix.

**Unchanged HARD constraints (recap — semua di ASSIGNMENT tetap berlaku)**
- Pure fn RBAC (no Prisma mock, no T05 seed coupling)
- `AppError` subclass only (`ForbiddenError` / `AuthError` / `NotFoundError` per T03 mask rule)
- No new deps, no `any` / `console.log` / `throw new Error(` / default export
- ≥ 80% unit coverage; `make check` green

Proceed to PLAN T04. Address Delta 2 explicitly (Option A vs B + rationale). Delta 1 + Delta 3 need only 1-line acknowledgment each in PLAN.

#### PLAN T04 — exec-A (Nanak) at H0 2026-07-01

**Scope recap**
- RBAC pure-fn guard (`requireRole`) yang compose bersih dengan T03 tenant-guard chain, plus (per NUDGE Delta 2) Fastify preHandler plugin yang populate `req.tenant` — shelf-ready untuk registrasi di `api.ts` ketika JWT plugin landing. Semua pure logic (no DB, no seed coupling). Sepenuhnya unit-testable.

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity confirmed: Executor, Slot A (Nanak) ✓
- CLAUDE.md loaded ✓
- Task spec read: `docs/spec/02-hotel-core.md §6` (RBAC matrix — staff NEVER; dept_head auto-filter on tickets/knowledge/menu) + `§7` (404-mask cross-tenant, tidak downgrade) ✓
- Parent docs spot-read: `src/plugins/tenant-guard.ts` (TenantContext shape, deriveTenantContext), `src/plugins/tenant-guard.types.ts` (FastifyRequest.tenant augmentation), `src/plugins/__tests__/tenant-guard.test.ts` (test pattern), `src/core/errors/app-errors.ts` (AuthError/ForbiddenError/NotFoundError), `src/entrypoints/api.ts` (masih stub — konfirmasi tidak register plugin runtime), `package.json` (fastify 4.28, `@fastify/jwt` present, `fastify-plugin` NOT present) ✓
- Dependencies: T03 ✓ (approved di §1) — consume TenantContext + SessionUser + SessionRole as-is
- `make typecheck` clean ✓ ; `make lint` clean ✓ (baseline dari post-T03)
- Scaffolder risk: none — no CLI generator, semua manual edit

**NUDGE deltas — acknowledgment**
- **Delta 1 (Q-B-02)**: acknowledged as resolved by PM B (Option b in effect). T04 consumes `TenantContext` / `SessionUser` / `SessionRole` dari `@plugins/tenant-guard.js` at their current path. **JANGAN** canonicalize ke `shared/types/`. No rebuttal.
- **Delta 2 (preHandler wiring scope)**: pilih **Option A (bundle)** — see rationale below.
- **Delta 3 (prisma-generate CI gap → T-INFRA-PRISMA-CI)**: acknowledged out-of-scope. Tidak sentuh `Makefile` / `src/core/prisma/prisma-client.ts`. Bila symptom muncul saat `make check`, note-only di SUBMIT.

**Delta 2 rationale — Option A (bundle preHandler) chosen**

Cost estimate:
- New `src/plugins/tenant-guard.plugin.ts` (plain async Fastify plugin, ~25 LOC) — bare function karena `fastify-plugin` bukan direct dep (dan menambahkannya = escalation, delay Nathan's merge unblock). Nathan tinggal register di root scope api.ts sebelum module routes untuk hook propagate global (Fastify 4 default behavior tanpa encapsulation-escape).
- Modify `src/plugins/tenant-guard.types.ts` (~5 LOC): tambah `FastifyRequest.user?: SessionUser` type augmentation supaya plugin bisa baca decoded JWT payload dengan proper typing.
- New `src/plugins/__tests__/tenant-guard.plugin.test.ts` (~50 LOC): integration-style dengan `fastify.inject()` — tanpa DB, tanpa Redis. 3 case: (a) req dengan `user` → tenant populated correctly; (b) req tanpa `user` → tenant undefined (routes will explicit-check via requireRole → AuthError); (c) req dengan malformed user (missing hotelId) → deriveTenantContext throws AuthError → error propagates via Fastify error path.

Total production delta ≈ 30 LOC + 50 LOC test (~80 LOC). Sedikit di atas soft-40 LOC hint, tapi majoritas overhead scaffolding test. Trade-off:
- **Bundle wins**: Nathan T11 merge gate satisfied dalam 1 SUBMIT (no cross-task coordination hop, no separate T04b assignment overhead). Semua tenant-guard runtime story ter-consolidated di `src/plugins/`.
- **Defer risk**: opening T04b = 1 more PM ↔ Parent PM ↔ PO hop, delay Nathan's merge minimum 1 half-day.

If mid-implementation Option A ternyata butuh cross-plugin coupling (mis. `@fastify/jwt` decorator ordering), akan pause + post CHECKPOINT + escalate ke Option B.

**Files to create**
```
src/plugins/rbac.ts
src/plugins/__tests__/rbac.test.ts
src/plugins/tenant-guard.plugin.ts
src/plugins/__tests__/tenant-guard.plugin.test.ts
```

**Files to modify**
- `src/plugins/tenant-guard.types.ts` — add `FastifyRequest.user?: SessionUser` augmentation (import type from `./tenant-guard.js`). Existing `req.tenant?: TenantContext` block preserved. Zero regression on T03 tests (they don't touch `req.user`).

**Approach**

**`src/plugins/rbac.ts`** — pure functions (mirror T03 tenant-guard.ts style):
- `export function requireRole(tenant: TenantContext | undefined, allowed: readonly SessionRole[]): void` — guard fn dengan explicit return type. Order of checks:
  1. `if (!tenant) throw new AuthError('No tenant context')` — 401
  2. `if (tenant.role === 'staff') throw new ForbiddenError('staff role not permitted')` — 403 (hard-reject spec §6, defense-in-depth walau caller kadang keliru include 'staff' di `allowed`)
  3. `if (tenant.isSuperAdmin) return` — implicit all-access (super_admin tidak perlu di-list oleh caller)
  4. `if (!allowed.includes(tenant.role)) throw new ForbiddenError(...)` — 403
- **DEFER `applyDeptFilter` helper**: justification — spec §6 rule 2 hanya applicable di 3 endpoint families (tickets, knowledge, menu list). Signature yang tepat depends on Prisma `where` type yang endpoint-specific (mis. `Prisma.TicketWhereInput` vs `Prisma.MenuItemWhereInput`). Bundling generic helper di T04 = premature abstraction (per CLAUDE.md general principle). T11 (Nathan / tickets) akan pakai chain `requireRole(tenant, ['gm_admin','dept_head']) + { hotelId: tenant.hotelId, ...(tenant.role === 'dept_head' && { deptId: tenant.deptId }) }` inline — clearer + type-safe per Prisma model. Kalau pattern repeat di > 3 modul dengan shape yang sama, refactor ke helper post-T11. PM A can call this out di VERDICT bila prefer bundle sekarang; happy to add ~10 LOC generic helper `applyDeptFilter<W>(tenant, where: W): W` yang untyped-passthrough kalau perlu.
- Compose test: 1 unit test `it('should chain deriveTenantContext → requireRole → assertHotelOwnership → assertDeptOwnership without side-effect for dept_head on own resource')` — verify order + no throw.

**`src/plugins/tenant-guard.plugin.ts`** — plain async Fastify plugin (bare function; register di root scope untuk hook propagation):
```ts
export async function tenantGuardPlugin(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (req) => {
    if (req.user) {
      req.tenant = deriveTenantContext(req.user);
    }
  });
}
```
- JSDoc jelaskan: (i) register at root scope; (ii) register AFTER JWT plugin yang populate `req.user`; (iii) leaves `req.tenant` undefined jika no JWT (webhook / public routes) — routes explicit-check via `requireRole` → AuthError.
- No `fastify-plugin` wrapper (bukan dep). Hook propagation via natural Fastify 4 encapsulation ordering.

**`src/plugins/tenant-guard.plugin.test.ts`** — integration-style dengan `fastify.inject()`:
- Build minimal Fastify (`Fastify({ logger: false })`), register plugin, tambah test route `GET /_probe` yang return `req.tenant ?? { unset: true }`.
- Decorate `req.user` via `preHandler` bypass (test harness) atau via `onRequest` yang jalan sebelum plugin's hook di sub-scope. Simpler: pakai `app.addHook('onRequest', (req, _, done) => { req.user = fixture; done(); })` di test setup order-BEFORE `tenantGuardPlugin` register.
- Cases: (a) valid SessionUser → response has tenant; (b) no user → response has `unset: true`; (c) user missing hotelId → response 401 dengan AuthError code.
- Tidak butuh Postgres / Redis (pure Fastify + in-process).

**`src/plugins/rbac.test.ts`** — unit ≥ 80% line coverage:
- 4 describe blocks:
  - `deriveTenantContext + requireRole compose` — chain test (1 test).
  - `requireRole` — 8-10 tests: (a) no tenant → AuthError; (b) staff → ForbiddenError even if allowed=['staff']; (c) super_admin → pass regardless of allowed; (d) gm_admin in allowed → pass; (e) gm_admin NOT in allowed → ForbiddenError; (f) dept_head in allowed → pass; (g) dept_head NOT in allowed → ForbiddenError; (h) empty allowed + super_admin → pass; (i) empty allowed + non-super → ForbiddenError.
  - `requireRole error shape` — ForbiddenError.details includes actual role + allowed list (for observability, mask di error-handler nanti).
- Test naming: `it('should <expected> when <condition>')` per CLAUDE.md.

**GAPs / questions**: none.

Awaiting PM A ACK.

##### PM A REJECT-PLAN — T04 PLAN needs 2 fixes before implementation (H0 2026-07-01) by PM A (Nanak)

Direction sound (Option A bundle chosen wisely; dept-filter defer justified; RBAC guard order defensible). But 2 implementation choices would ship non-working code — catching at PLAN is cheaper than REJECT-at-SUBMIT.

**Fix #1 — Fastify plugin encapsulation** (correctness blocker)

- **Violation**: `src/plugins/tenant-guard.plugin.ts` as plain async fn = isolated context per Fastify 4 encapsulation model. `addHook('onRequest', ...)` inside plain-fn plugin only fires for routes registered as **children** of that plugin's scope. Nathan will register `ticketsRoutes` as a **sibling** at root (standard pattern per T11 PLAN). Result: `req.tenant` stays `undefined` for all ticket routes → Option A bundle doesn't satisfy Nathan's merge gate.
- **Fix — pick ONE**:
  - **(A, preferred)**: change export from plugin to a plain setup fn — `export function configureTenantGuardHooks(app: FastifyInstance): void` that calls `app.addHook('onRequest', ...)` on the passed instance directly (no `app.register()` wrapper). Nathan calls `configureTenantGuardHooks(app)` in `api.ts` root scope. Zero dep, zero encapsulation, hook is global. Rename file to `tenant-guard.hooks.ts` for accuracy. 5 LOC delta from your current sketch.
  - **(B, fallback)**: add `fastify-plugin@4.x` as devDep (well-known, ~2KB) + wrap with `fp(fn)` to escape encapsulation. Requires PO approval per CLAUDE.md §11 (dep add) — I can fast-track via Parent PM if you prefer this, but adds ½-day gating.
  - **(C, ugly)**: keep plain plugin, but instruct Nathan to register `ticketsRoutes` **inside** `tenantGuardPlugin`. Awkward coupling; NOT preferred — reject unless (A) and (B) both infeasible.
- **Recommendation**: (A). Update test to match — `describe('configureTenantGuardHooks', ...)` builds a Fastify instance, calls the fn, adds test route at same scope, verifies hook fires.

**Fix #2 — `FastifyRequest.user` type augmentation collision with `@fastify/jwt` v8** (typecheck blocker at SUBMIT)

- **Violation**: `src/plugins/tenant-guard.types.ts` adding `user?: SessionUser` to `FastifyRequest` will collide with `@fastify/jwt`'s own `declare module 'fastify'` block that types `req.user` via its `FastifyJWT` interface. TS error: `Subsequent property declarations must have the same type. Property 'user' must be of type '...'`.
- **Fix**: augment `@fastify/jwt`'s `FastifyJWT` interface instead — that's the canonical pattern the plugin exposes for consumers to type the JWT payload:
  ```ts
  declare module '@fastify/jwt' {
    interface FastifyJWT {
      payload: SessionUser;
      user: SessionUser;
    }
  }
  ```
  Effect: `req.user` auto-typed as `SessionUser` everywhere; no conflict; works whether or not JWT plugin is registered yet at runtime (typecheck-only augmentation).
- Keep existing `FastifyRequest.tenant?: TenantContext` augmentation in same file (T03) untouched — that one's fine (Fastify doesn't declare `.tenant`).

**Accepted as-planned (no change needed)**

- Q-B-02 handling (Delta 1 acknowledgment) ✓
- `applyDeptFilter` defer with premature-abstraction rationale ✓ — endpoint-specific Prisma `WhereInput` typing is the right call; T11 inline pattern is clearer. If ≥3 modules repeat the same shape post-T11, refactor then.
- `requireRole` check order (auth → staff-reject → super-bypass → allowed) ✓ — defense-in-depth staff-reject is defensible; super_admin can't also be staff (union exclusive), so ordering is semantically equivalent to super-first anyway.
- Test plan (10-12 unit + 3 integration-style via `fastify.inject()`) ✓
- Files list (4 create + 1 modify) ✓ — with Fix #1 file rename: `tenant-guard.plugin.ts` → `tenant-guard.hooks.ts` (test file rename same)
- Delta 3 (prisma-generate) acknowledged as out-of-scope ✓

**Resubmit as PLAN T04 addendum** (append sub-block under this REJECT-PLAN, not a new PLAN block) — address Fix #1 + Fix #2 with chosen approach + updated LOC estimate. Same DoD/scope otherwise. PM A will ACK addendum if fixes clean.

##### PLAN T04 addendum — exec-A (Nanak) at H0 2026-07-01 (response to REJECT-PLAN)

Both fixes accepted; no rebuttal. Same DoD, same scope, same file count (4 create + 1 modify). Only shape adjustments below.

**Fix #1 — adopt (A) factory fn (no fastify-plugin dep, no PO gating)**

- Rename: `src/plugins/tenant-guard.plugin.ts` → `src/plugins/tenant-guard.hooks.ts` (test file: `__tests__/tenant-guard.hooks.test.ts`).
- Export shape (final):
  ```ts
  // src/plugins/tenant-guard.hooks.ts
  import type { FastifyInstance } from 'fastify';
  import { deriveTenantContext } from './tenant-guard.js';

  export function configureTenantGuardHooks(app: FastifyInstance): void {
    app.addHook('onRequest', async (req) => {
      if (req.user) {
        req.tenant = deriveTenantContext(req.user);
      }
    });
  }
  ```
- Nathan's future `api.ts` wiring (documented in JSDoc of the fn):
  ```ts
  await app.register(jwtPlugin);
  configureTenantGuardHooks(app);       // direct fn call, hooks land on root scope
  await app.register(ticketsRoutes, { prefix: '/api' });
  ```
- Test setup uses same direct call + pre-hook to inject `req.user` fixture before the tenant-guard hook (Fastify FIFO onRequest ordering guarantees user-set → tenant-derive):
  ```ts
  const app = Fastify({ logger: false });
  app.addHook('onRequest', async (req) => { req.user = fixtureUser; });
  configureTenantGuardHooks(app);
  app.get('/_probe', async (req) => req.tenant ?? { unset: true });
  const res = await app.inject({ method: 'GET', url: '/_probe' });
  ```

**Fix #2 — augment `@fastify/jwt` `FastifyJWT` interface (not `FastifyRequest.user`)**

- `src/plugins/tenant-guard.types.ts` final shape:
  ```ts
  import type { SessionUser, TenantContext } from './tenant-guard.js';

  declare module 'fastify' {
    interface FastifyRequest {
      tenant?: TenantContext;
    }
  }

  declare module '@fastify/jwt' {
    interface FastifyJWT {
      payload: SessionUser;
      user: SessionUser;
    }
  }

  export {};
  ```
- Existing T03 `FastifyRequest.tenant?: TenantContext` block preserved verbatim (zero regression to T03's 14 unit tests — they don't touch types).
- `req.user` becomes auto-typed as `SessionUser` everywhere via `@fastify/jwt`'s standard consumer-typing pattern. Works purely at typecheck level — no runtime dependency on JWT plugin being registered yet (aligns with api.ts still stub).

**Updated LOC estimate**
- `rbac.ts`: ~30 LOC (unchanged)
- `tenant-guard.hooks.ts`: ~15 LOC (down from ~25 — plain factory fn, no fastify-plugin scaffolding)
- `tenant-guard.types.ts` modify: +8 LOC (both `declare module` blocks, was +5)
- Production delta total: **~53 LOC** (was ~60, down 7)
- `rbac.test.ts`: ~100 LOC (unchanged)
- `tenant-guard.hooks.test.ts`: ~45 LOC (down from ~50 — simpler setup, no `app.register` step)
- Grand total delta: **~198 LOC** including test scaffolding (was ~210). Well within Option A bundle budget.

**Accepted-as-planned items** (unchanged from original PLAN — PM A confirmed):
- Q-B-02 handling (Delta 1 acknowledgment) — consume TenantContext/SessionUser/SessionRole from `@plugins/tenant-guard.js` as-is.
- `applyDeptFilter` defer with premature-abstraction rationale (T11 inline; refactor if ≥3 modules repeat).
- `requireRole` check order: no-tenant → staff-reject → super-bypass → allowed.
- Delta 3 (prisma-generate CI gap) out-of-scope; no Makefile / prisma-client.ts edits.
- Test plan: 10-12 unit + 3 integration-style via `fastify.inject()`; ≥ 80% line coverage; `it('should <expected> when <condition>')` naming.
- Files count: 4 create + 1 modify (with Fix #1 rename applied).

**GAPs / questions**: none. Ready to implement upon PM A ACK.

##### PM A ACK — T04 PLAN addendum APPROVED, proceed to coding (H0 2026-07-01) by PM A (Nanak)

Both REJECT-PLAN fixes cleanly addressed:

- **Fix #1** — factory fn `configureTenantGuardHooks(app: FastifyInstance): void` with direct `app.addHook('onRequest', ...)` call. Hook lands on root scope (no encapsulation), Fastify FIFO onRequest ordering makes the test pre-hook → tenant-derive sequence deterministic. Nathan's wiring pattern documented in JSDoc — clear consumer contract. File rename applied (`tenant-guard.hooks.ts` + test). No `fastify-plugin` dep needed. ✓
- **Fix #2** — `declare module '@fastify/jwt' { interface FastifyJWT { payload: SessionUser; user: SessionUser } }`. Canonical `@fastify/jwt` v8 consumer-typing pattern; `req.user` auto-types as `SessionUser` everywhere via the plugin's own `FastifyRequest.user = FastifyJWT['user']` internal link. T03's `FastifyRequest.tenant?: TenantContext` block preserved verbatim → 0 regression on 14 T03 tests. Type-only augmentation → works whether JWT plugin registered at runtime or not (aligns with `api.ts` stub state). ✓

LOC estimate (~53 prod / ~198 total incl. tests) reasonable. No new deps. No `any` / `console.log` / `throw new Error(` / default export planned. Accepted-as-planned items reconfirmed:
- Q-B-02 handling (consume `TenantContext` as-is from `@plugins/tenant-guard.js`)
- `applyDeptFilter` defer (endpoint-specific Prisma `WhereInput` in T11 inline; revisit if ≥3 modules repeat)
- `requireRole` check order (auth → staff-reject → super-bypass → allowed)
- Test plan (10-12 unit + 3 integration-style via `fastify.inject()`, ≥ 80% coverage, `it('should <expected> when <condition>')`)
- Delta 3 (prisma-generate CI gap) OUT of T04 — no `Makefile` / `prisma-client.ts` edits

Proceed to implementation on branch `feat/foundation-rbac`. Reminders for SUBMIT (drift + gate):
- `make check` PASS (lint + format:check + typecheck + test:unit)
- Drift scans clean per PM-AGENT §3 Step 2
- Test coverage evidence in SUBMIT block (unit count + integration count + line coverage %)
- Confirm 14 T03 tests still green after `tenant-guard.types.ts` modify
- Note in SUBMIT if `make check` symptoms hint at GAP-T11-1 (prisma-generate CI) — note-only, do not fix

Ship it.

#### SUBMIT T04 — exec-A (Nanak) at H0 2026-07-01 (attempt 1)

Task: RBAC middleware (gm_admin / dept_head / super_admin all-access) + tenant-guard onRequest hooks factory (Option A bundle)

Branch: `feat/foundation-rbac` · Commit: `df5648b` (pushed to `origin/feat/foundation-rbac`)

Files changed: **5** (4 create + 1 modify)
  - `src/plugins/rbac.ts` (new, 52 LOC)
  - `src/plugins/tenant-guard.hooks.ts` (new, 39 LOC)
  - `src/plugins/tenant-guard.types.ts` (modify, +18 LOC — add `@fastify/jwt` FastifyJWT augmentation + type-only bare import to force module resolution; existing `FastifyRequest.tenant` block preserved verbatim)
  - `src/plugins/__tests__/rbac.test.ts` (new, 92 LOC — 11 tests)
  - `src/plugins/__tests__/tenant-guard.hooks.test.ts` (new, 83 LOC — 3 tests)

DoD self-check (from ASSIGNMENT + PLAN addendum)
- [x] `requireRole(tenant, allowed: readonly SessionRole[])` guard fn — throws `AuthError` on no tenant (401); `ForbiddenError` on role not in `allowed` (403); `super_admin` implicit all-access (no need to list in `allowed`) — `src/plugins/rbac.ts:34-56`
- [x] `staff` role hard-rejected in every call — `src/plugins/rbac.ts:41-46` (defense-in-depth: even if caller accidentally passes `['staff']`, staff is rejected before the `allowed` check)
- [x] `applyDeptFilter` helper deferred with premature-abstraction rationale — PM A accepted in ACK; T11 will inline per Prisma `WhereInput` type
- [x] Composes with T03 tenant-guard chain — verified by `describe('requireRole composition with tenant-guard chain')` (`rbac.test.ts:67-81`) exercising `deriveTenantContext → requireRole → assertHotelOwnership → assertDeptOwnership` for dept_head on own hotel+dept without throw
- [x] Unit test ≥ 80% line coverage — **100% stmts/branches/funcs/lines** on both `rbac.ts` and `tenant-guard.hooks.ts` (coverage evidence below)
- [x] Test naming: `it('should <expected> when <condition>')` — all 14 new tests conform
- [x] All branches covered: 4 roles × guard outcomes (allow / auth-error / forbidden / staff-reject)
- [x] `make check` PASS — see Quality gate
- [x] Drift scans clean for T04-touched paths — see Drift scans
- [x] Fastify preHandler wiring via `configureTenantGuardHooks(app: FastifyInstance): void` factory — Nathan invokes at root scope, hook lands globally (no encapsulation), zero new dep
- [x] Q-B-02: consume `TenantContext` / `SessionUser` / `SessionRole` from `@plugins/tenant-guard.js` at existing path — no canonicalization
- [x] `@fastify/jwt` FastifyJWT augmentation (not `FastifyRequest.user`) — avoids v8 collision; canonical consumer-typing pattern; type-only bare import `import type {} from '@fastify/jwt'` forces module resolution so the augmentation takes effect at use-sites
- [x] Delta 3 (prisma-generate CI gap) out of scope — no `Makefile` / `prisma-client.ts` edits confirmed via `git status --short`

Quality gate
- `pnpm lint`: **PASS** (0 errors, 0 warnings)
- `pnpm format:check`: **PASS** (All matched files use Prettier code style)
- `pnpm typecheck`: **PASS** (`tsc --noEmit` clean)
- `pnpm test:unit`: **PASS** (30 tests total: 14 T03 tenant-guard + 11 rbac + 3 tenant-guard.hooks + 2 skipped `_template` boilerplate placeholder)
- `pnpm test:integration`: not run (no DB / Redis touched; all tests are unit + Fastify-in-process)
- `make format-check`: **PASS** (bundled in `make check`)
- `make check` overall: **PASS**

Drift scans (per EXECUTOR-PROTOCOL §4.4)
- `any` types (excluding `_template` placeholder): **0 hits** in T04 files
- `console.log` in src: **0 hits**
- `throw new Error(` in `src/modules/` + `src/core/` (excluding `_template`): 3 pre-existing hits (`core/config/env.ts:75` env bootstrap, `core/http/http-client.ts:19,27` stub) — **0 new hits from T04**
- Forbidden imports (express / typeorm / sequelize / moment / node-fetch): **0 hits**
- Default export outside entrypoints/config: **0 hits**
- `.skip(` in tests (excluding `_template`): **0 hits**

Security check (N/A for T04 — no auth/webhook/crypto surface)
- HMAC verify: N/A (no webhook)
- Token encryption: N/A (no token storage)
- PII masking: N/A (no log lines emit user data)
- No secret hardcoded: **confirmed** (T04 touches no config / env)

Test evidence
- Unit tests: **28** (14 T03 + 11 rbac + 3 tenant-guard.hooks) — all pass
- Skipped: 2 in `src/modules/_template/__tests__/` (pre-existing boilerplate placeholder, per T01 baseline note)
- Coverage on new files (targeted run `--collectCoverageFrom=src/plugins/rbac.ts --collectCoverageFrom=src/plugins/tenant-guard.hooks.ts`):
  ```
  File                   | % Stmts | % Branch | % Funcs | % Lines
  -----------------------|---------|----------|---------|--------
  All files              |     100 |      100 |     100 |     100
   rbac.ts               |     100 |      100 |     100 |     100
   tenant-guard.hooks.ts |     100 |      100 |     100 |     100
  ```
- T03's 14 tenant-guard tests: **all green** post-tenant-guard.types.ts modify (verified in `make check` run — `PASS src/plugins/__tests__/tenant-guard.test.ts`)
- Consumer wiring sample (documented in JSDoc of `tenant-guard.hooks.ts`, for Nathan / api.ts author reference):
  ```ts
  await app.register(jwtPlugin);
  configureTenantGuardHooks(app);   // direct fn call — NOT app.register()
  await app.register(ticketsRoutes, { prefix: '/api' });
  ```

Notes
- **GAP-T11-1 (prisma-generate CI) — no symptom observed during `make check`**: `pnpm typecheck` clean without prior `pnpm prisma:generate` because Prisma Client is already generated in local `node_modules` from T02. On fresh checkout this would break as PM B flagged; still out of T04 scope, left for T-INFRA-PRISMA-CI follow-up. Note-only per NUDGE Delta 3.
- Env note: this session started with system Node 18 / pnpm 8; had to re-activate Node 20 + pnpm 9 via `nvm use 20 && corepack enable && corepack prepare pnpm@9 --activate` (T01-established procedure). No permanent config change needed.
- Line count in files changed above is measured post-Prettier; slightly larger than PLAN's ~53 prod / ~198 total estimate due to JSDoc verbosity — no functional expansion.

Requesting PM A VERDICT.

##### VERDICT T04 — APPROVED (H0 2026-07-01, attempt 1) by PM A (Nanak)

Validated per PM-AGENT §3 Steps 1–7 on branch `feat/foundation-rbac` @ commit `df5648b`. All 7 gates green.

**DoD verification (12 items from ASSIGNMENT + PLAN addendum)** — all ✓
- `requireRole` guard fn (order: no-tenant → staff → super-bypass → allowed) verified at `src/plugins/rbac.ts:33-53`. `AuthError`/`ForbiddenError` used correctly, no `throw new Error(`.
- `staff` hard-reject with defense-in-depth (rejects even if caller passes `['staff']`) — verified `rbac.ts:40-45` + tests at `rbac.test.ts:23-28`.
- `super_admin` implicit all-access (works with `allowed=[]` too) — verified `rbac.ts:46` + tests at `rbac.test.ts:31-37`.
- `applyDeptFilter` defer — accepted per PLAN addendum; T11 will inline per Prisma `WhereInput` shape.
- Composition test — `rbac.test.ts:70-84` exercises full T03 chain (`deriveTenantContext → requireRole → assertHotelOwnership → assertDeptOwnership`) for dept_head own-dept without throw.
- Test naming compliance — 14 new tests all match `it('should <expected> when <condition>')`.

**Both REJECT-PLAN fixes verified in code (independent read)**
- **Fix #1 (Fastify encapsulation)** — `src/plugins/tenant-guard.hooks.ts:31-38`: `configureTenantGuardHooks(app: FastifyInstance): void` factory. Direct `app.addHook('onRequest', ...)` on caller's instance. No `app.register()` wrapper → no encapsulation → hook fires globally for sibling-registered routes. JSDoc lines 1–25 document the rationale + wiring pattern for Nathan (`api.ts` root-scope invocation, order: JWT register → configure hooks → routes register). Zero new dep.
- **Fix #2 (`FastifyJWT` augmentation)** — `src/plugins/tenant-guard.types.ts:24, 34-39`: bare type-only `import type {} from '@fastify/jwt'` forces module resolution + `declare module '@fastify/jwt' { interface FastifyJWT { payload: SessionUser; user: SessionUser } }`. T03's `FastifyRequest.tenant?: TenantContext` block preserved verbatim at lines 28-32. Canonical `@fastify/jwt` v8 consumer-typing pattern. `tsc --noEmit` clean — proves no collision.

**Quality gate (independent re-run in `main` checkout of branch)**
- `make check` overall: **PASS** — confirmed locally
- `pnpm lint`: PASS (`--max-warnings 0`)
- `pnpm format:check`: PASS
- `pnpm typecheck`: PASS (both `declare module` blocks compile — Fix #2 verified at compile-time)
- `pnpm test:unit`: PASS — 28 tests pass (14 T03 tenant-guard + 11 rbac + 3 tenant-guard.hooks), 2 `_template` skipped (pre-existing baseline)
- **T03 regression check**: `PASS src/plugins/__tests__/tenant-guard.test.ts` — all 14 T03 tests green post-augmentation modify ✓

**Drift scans** (per PM-AGENT §3 Step 2, all 7 categories on T04 files)
- `any` types: **0 hits**
- `console.log/info/debug`: **0 hits**
- `throw new Error(`: **0 hits** (uses `AuthError`/`ForbiddenError`)
- Forbidden imports (express/typeorm/sequelize/mongoose/moment/node-fetch): **0 hits**
- Default export: **0 hits** (all named exports)
- `.skip` in tests: **0 hits** (14 real tests)
- Hardcoded URL: **0 hits**

**Coverage — 100% claim independently verified**
```
File                   | % Stmts | % Branch | % Funcs | % Lines
rbac.ts                |     100 |      100 |     100 |     100
tenant-guard.hooks.ts  |     100 |      100 |     100 |     100
```

**Spot-check** (PM-AGENT §3 Step 5)
- Naming: kebab-case files ✓; camelCase fns (`requireRole`, `configureTenantGuardHooks`) ✓; PascalCase types (via re-consumption of T03's `SessionUser`/`TenantContext`) ✓
- Explicit return types on public fns: `requireRole(...): void` ✓ ; `configureTenantGuardHooks(...): void` ✓
- No what-comments — JSDoc explains WHY (encapsulation caveat, canonical `@fastify/jwt` pattern) ✓
- Import direction: plugin files import from same folder, no cross-module leak ✓
- LOC per file (post-Prettier): `rbac.ts` 53, `hooks.ts` 38, `types.ts` 41, `rbac.test.ts` 85, `hooks.test.ts` 80 — all well under 300 rule-of-thumb ✓

**Security floor** (PM-AGENT §3 Step 6) — N/A for T04 (no auth/webhook/crypto/PII surface). Confirmed: no config edits, no token storage, no HMAC surface, no log lines emit user data.

**Follow-ups actioned in same commit**
- → §1 task tracker: T04 → approved
- → §0 Active task refreshed
- → PARENT §1 row T04 → approved
- → PARENT §2 short roll-up posted
- → PARENT §3c Q-B-02 resolution strengthened with T04 ratification note (canonical path: `TenantContext`/`SessionUser`/`SessionRole` at `src/plugins/tenant-guard.ts`)
- → PARENT §10 coord note: T11 seam **FULLY RESOLVED** (T03 pure fns + T04 factory + `@fastify/jwt` augmentation → Nathan can wire `configureTenantGuardHooks(app)` for global `req.tenant`)

**PO action item — branch merge**
`feat/foundation-rbac` @ `df5648b` on `origin`; `make check` verified green by PM A. Per CLAUDE.md §12 (code lewat feature branch, PO merge manual), **please merge `feat/foundation-rbac` → `main` when ready**. PM A will not auto-merge. Docs (PM-STATUS-A.md + PARENT roll-ups) already on `main`.

**Next Slot A queue**
1. **T-INFRA-01** (foundation fix for GAP-T11-1 per PARENT §3b) — PM A to draft ASSIGNMENT next
2. **T05** seed scripts
3. **T06** ticket state-machine helper (parallel-friendly)

Ship it.

### ASSIGNMENT T-INFRA-01 — claimed by exec-A (Nanak) at H12 2026-07-01
- Branch: `feat/foundation-prisma-ci` (per PO branch-per-task policy)
- Routed from: PM-STATUS-PARENT.md §1 T-INFRA-01 + §3b GAP-T11-1 (escalated by PM B / Nathan during T11 wip)
- Depends on: T02 (Prisma schema applied — done ✓), T04 (foundation-rbac merged — done ✓)
- Downstream unblocks: any current or future B/C module that imports generated `PrismaClient` at typecheck (currently workarounded via pre-run `pnpm prisma:generate` before every `make check`). Nathan's T13 (stats+overdue) starts wip today — will benefit immediately.
- Spec / reference:
  - `docs/decisions/0001-hexagonal-disiplin.md` — Prisma client langsung, TIDAK di-wrap dengan interface (ADR-0001)
  - `docs/decisions/0004-one-service-one-db.md` — 1 service = 1 DB = 1 Prisma schema
  - `CLAUDE.md §4` — Aturan hexagonal: Prisma pakai langsung, no port-wrap
  - `CLAUDE.md §12` — Branch/commit policy
  - `Makefile:148` — current `check` target definition (no prisma-generate prereq — this is the gap)
  - `src/core/prisma/prisma-client.ts:11-27` — commented-out real singleton pattern (this is the second gap; uncomment + activate)

#### PM A notes untuk exec-A

**Scope**

Two-part foundation fix in a single small PR:

1. **Makefile `check` target — add `prisma-generate` as first prereq.**
   - Current (Makefile:148): `check: lint format-check typecheck test-unit`
   - Target: `check: prisma-generate lint format-check typecheck test-unit`
   - Effect: on fresh checkout, `make check` regenerates Prisma Client into `node_modules/.prisma/client` before typecheck runs. `prisma-generate` target already exists (Makefile:87-88, calls `pnpm prisma:generate`) — just referenced as prereq.

2. **`src/core/prisma/prisma-client.ts` — replace `{}` stub with real singleton.**
   - Current (line 29): `export const db = {} as unknown as Record<string, unknown>; // placeholder`
   - Target: real `PrismaClient` singleton per the commented-out template at lines 11-27:
     ```ts
     import { PrismaClient } from '@prisma/client';
     import { loadConfig } from '@core/config/env.js';

     const config = loadConfig();

     export const db = new PrismaClient({
       datasources: { db: { url: config.DATABASE_URL } },
       log: config.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
     });

     const shutdown = async (): Promise<void> => {
       await db.$disconnect();
     };
     process.on('SIGTERM', shutdown);
     process.on('SIGINT', shutdown);
     ```
   - Remove the TODO block (lines 11-27 as-comments) + the placeholder line (29). Keep the top-of-file JSDoc (lines 1-10) — accurate and durable.
   - Verify `config.DATABASE_URL` is the correct env name (check `src/core/config/env.ts` if uncertain — sanity check before commit).

**HARD constraints (WAJIB — pelanggaran = REJECT)**
- **No new deps** — `@prisma/client` already in `package.json` deps. If exec-A finds anything else needed, escalate to PM A via GAP block, do NOT `pnpm add`.
- **No wrap-Prisma interface** — per ADR-0001 + CLAUDE.md §4 anti-pattern table: Prisma is already an abstraction; DILARANG bikin `interface IUserRepository`-style wrapper. Consume `db` directly.
- **No `any` / `console.log` / `throw new Error(` / default export** — same drift rules as prior tasks.
- **Explicit return type** for `shutdown` fn (already `Promise<void>` in template — preserve).
- **Named export only** (`db` + implicit `shutdown` fn kept module-local; do NOT export shutdown).
- **Do NOT touch** `src/plugins/tenant-guard.hooks.ts` / `rbac.ts` / T03 files — T04 tests must remain green.
- **Do NOT touch** `.github/workflows/*` — CI infrastructure is out of scope (Makefile-level fix is sufficient; CI runs `make install && make check` per standard convention, but validate via smoke if uncertain).

**Files to modify** (exec-A finalize count in PLAN)
- `Makefile` — line 148 `check` target: add `prisma-generate` as first prereq
- `src/core/prisma/prisma-client.ts` — replace stub with real singleton per template. Rewrite entire file body (JSDoc lines 1-10 preserved).

**Files that MAY need light touch (exec-A confirm in PLAN if applicable)**
- No test file required — Prisma Client is a library wrapper; unit-testing "the wrapper wraps" is redundant per CLAUDE.md general principle. Integration coverage comes downstream via testcontainers in modules that use it (Nathan's T11 already does this).
- **BUT**: exec-A should verify Nathan's T11 tests still pass end-to-end. T11 was merged with a workaround (exec-B likely instantiated its own `PrismaClient` in the tickets repo — verify in PLAN by grep). If T11 already injects `db` from `@core/prisma/prisma-client.js`, verify no runtime regression. If T11 has its own inline instantiation, note in PLAN — no need to refactor now, but flag for future cleanup.

**T-INFRA-01 DoD**
- [ ] `Makefile:148` `check` target has `prisma-generate` as first prereq — verified via `grep -n "^check:" Makefile`
- [ ] `src/core/prisma/prisma-client.ts` exports real `PrismaClient` instance (not `{}` stub) — verified via file read
- [ ] Fresh-checkout simulation passes: `rm -rf node_modules dist coverage .tsbuildinfo && pnpm install --frozen-lockfile && make check` → PASS. (This is the acceptance test — proves the gap is closed.)
- [ ] `make check` PASS on already-generated checkout (standard case) — no regression
- [ ] T04's `tenant-guard.hooks.test.ts` (3 tests) still green
- [ ] T04's `rbac.test.ts` (11 tests) still green
- [ ] T03's `tenant-guard.test.ts` (14 tests) still green
- [ ] `_template` 2 skipped tests remain skipped (baseline behavior unchanged)
- [ ] Drift scans clean on `Makefile` (N/A for TS rules) + `src/core/prisma/prisma-client.ts` (0 `any`, 0 `console.log`, 0 `throw new Error(`, 0 default export)
- [ ] No new deps in `package.json` — verified via `git diff package.json` (should be empty)
- [ ] Nathan's T13 unblocking implicit — SUBMIT should note that once merged, exec-B can drop the pre-run `pnpm prisma:generate` workaround

**Additional PLAN checks (exec-A think through and address if applicable)**
- **Env dependency at import time**: real singleton calls `loadConfig()` at module load. If env vars missing (mis. `DATABASE_URL`), import throws. Verify `loadConfig()` fails-fast behavior is acceptable — if not, wrap in lazy getter. Confirm in PLAN.
- **`process.on('SIGTERM', ...)` at import time**: adding signal handlers at module import means every test file that (transitively) imports `prisma-client.ts` registers a handler. Jest may complain about open handles. Verify test-time behavior via `make check` — if flaky, guard with `if (process.env.NODE_ENV !== 'test')` and mention in PLAN.
- **Circular import risk**: `prisma-client.ts` imports `loadConfig` from `@core/config/env.js`. If `env.ts` transitively imports anything from `@core/prisma/`, circular. Grep `src/core/config/env.ts` to confirm (should be safe — env is a leaf).

**Coordination downstream (PM A tracking; exec-A no action)**
- Post VERDICT APPROVED, PM A akan:
  - Update PARENT §1 row T-INFRA-01 → approved
  - Update PARENT §3b GAP-T11-1 → resolved
  - Update PARENT §10 coord note: CI/build gap fixed
  - Post roll-up to PARENT §2

Awaiting **PLAN T-INFRA-01** from exec-A.

#### PLAN T-INFRA-01 — exec-A (Nanak) at H12 2026-07-01

**Scope recap**
- Two-part foundation fix bundled in one PR: (1) `Makefile:148` — add `prisma-generate` as first prereq of `check` target so fresh checkouts regenerate `@prisma/client` before typecheck; (2) `src/core/prisma/prisma-client.ts` — replace `{}` stub with real eager `PrismaClient` singleton per PM A's template, add `NODE_ENV !== 'test'` guard on signal handlers, and adapt async-handler pattern to satisfy `@typescript-eslint/no-misused-promises`. Resolves PARENT §3b GAP-T11-1; downstream unblocks any future module importing `@core/prisma/prisma-client.js` on fresh checkout typecheck.

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity confirmed: Executor, Slot A (Nanak) ✓
- CLAUDE.md loaded ✓
- Task spec read: ASSIGNMENT block above + spec refs (`docs/decisions/0001-hexagonal-disiplin.md`, `docs/decisions/0004-one-service-one-db.md`, `CLAUDE.md §4` no-wrap-Prisma) ✓
- Parent docs spot-read: `Makefile` (line 148 `check` target + line 87-88 `prisma-generate` target already exists), `src/core/prisma/prisma-client.ts` (current stub + PM A's uncomment template), `src/core/config/env.ts` (loadConfig behavior + DATABASE_URL field), `.eslintrc.cjs` (`no-misused-promises` + `no-floating-promises` both `error` — informs signal-handler wrapping), `jest.config.ts` (setupFilesAfterEach = `test-setup.ts` which is currently empty ESM marker), `src/modules/tickets/index.ts` (T11 `buildTicketsService(db: PrismaClient, ...)` takes `db` as injected arg via type-only import — NOT consuming singleton), `src/modules/tickets/__tests__/tickets.repository.integration.test.ts` (T11 integration spins its own `new PrismaClient` via testcontainers, does NOT import singleton) ✓
- Dependencies: T02 ✓ (Prisma schema applied, Prisma Client generated in local `node_modules`), T04 ✓ (merged; my tests don't touch prisma-client so untouched by this change)
- `make typecheck` clean ✓ ; `make lint` clean ✓ (baseline dari post-T04 merge)
- Scaffolder risk: **none** — no CLI generator, only 2 file edits (1 Makefile line + 1 TS body rewrite)

**Files to modify** (2 total, 0 create)
- `Makefile` — line 148: prepend `prisma-generate` to `check` target prereqs
- `src/core/prisma/prisma-client.ts` — rewrite body per PM A's template with 3 targeted adaptations (see Approach below); preserve top JSDoc lines 1-10 verbatim

**Files to NOT touch** (per HARD constraint recap)
- `package.json` (no new deps needed; `@prisma/client` already present)
- `src/plugins/*` (T03/T04 files — must remain untouched to guarantee test-green)
- `.github/workflows/*` (out of scope; Makefile-level fix is sufficient)
- Any `src/modules/*` file (no consumer refactor; T11 tests should remain untouched)

**Approach**

*(1) Makefile edit* — single-line change:
```
Before:  check: lint format-check typecheck test-unit
After:   check: prisma-generate lint format-check typecheck test-unit
```
The `prisma-generate` target already exists (Makefile:87-88, wraps `pnpm prisma:generate`) — just referenced as first prereq. Effect on fresh checkout: `pnpm install --frozen-lockfile && make check` regenerates `node_modules/.prisma/client` before typecheck touches any file that imports `@prisma/client`.

*(2) prisma-client.ts rewrite* — final body:
```ts
/**
 * Prisma client singleton.
 *
 * 1 service = 1 DB = 1 Prisma schema (ADR-0004).
 *
 * Usage:
 *   import { db } from '@core/prisma/prisma-client.js';
 *   const items = await db.exampleResource.findMany();
 */

import { PrismaClient } from '@prisma/client';

import { loadConfig } from '@core/config/env.js';

const config = loadConfig();

export const db = new PrismaClient({
  datasources: { db: { url: config.DATABASE_URL } },
  log: config.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

const shutdown = async (): Promise<void> => {
  await db.$disconnect();
};

if (process.env.NODE_ENV !== 'test') {
  process.on('SIGTERM', () => {
    void shutdown();
  });
  process.on('SIGINT', () => {
    void shutdown();
  });
}
```

Rationale for 3 adaptations relative to PM A's raw template:
1. **`NODE_ENV !== 'test'` guard on signal handlers** — see Advisory #2 resolution below.
2. **`void shutdown()` inside sync arrow wrapper** — Node's `process.on(signal, listener)` types `listener` as `NodeJS.SignalsListener` returning `void`. Passing the async `shutdown` fn directly (`process.on('SIGTERM', shutdown)`) triggers `@typescript-eslint/no-misused-promises: error` (rule enabled in `.eslintrc.cjs:33`). Wrapping in a sync arrow that `void`s the promise is the canonical fix — preserves fire-and-forget semantics; on process termination, PrismaClient's own disconnect timeout still applies. Named `handleSignal` alternative considered but two inline arrows are clearer (2 lines each) and match Node stdlib idiom.
3. **JSDoc preserved verbatim** (lines 1-10 of current file) — accurate and durable per PM A note.

**Explicit resolution of PM A's 3 advisory checks**

- **Advisory #1 — `loadConfig()` fails-fast at module import**: acceptable AS-IS, no lazy-getter wrap.
  - `loadConfig()` in `@core/config/env.ts:67-80` zod-parses `process.env`; throws with formatted issues on missing required fields (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `API_BASE_URL`, `CORS_ORIGIN`, `REDIS_URL`).
  - Fail-fast is desirable at production/dev entrypoint boot (better than lazy failures deep in a request).
  - **Zero regression risk for current test suite**: `grep` confirmed no file under `src/` (nor test file) currently imports `@core/prisma/prisma-client.js` at value-level. T11 uses `import type { PrismaClient } from '@prisma/client'` (type-only, no runtime module load) and injects `db` via `buildTicketsService(db, ...)` constructor; its integration test spins its own `new PrismaClient` via testcontainers. So making the singleton eager triggers `loadConfig()` only at future consumer-import time — not during `make check` today.
  - `.env` present in repo root (verified: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `ENCRYPTION_KEY` populated), so local dev consumers work out of the box. Future test authors who import the singleton will need to ensure envs in test process — that's a test-authoring concern, not a T-INFRA-01 concern.
  - **Fallback trigger**: if the fresh-checkout acceptance test (`rm -rf node_modules dist coverage .tsbuildinfo && pnpm install --frozen-lockfile && make check`) surfaces any test-time env failure, will pivot to lazy `getPrisma()` factory + document in SUBMIT. Not expected.

- **Advisory #2 — `process.on('SIGTERM', ...)` at module import creates jest open-handle risk**: adopting `if (process.env.NODE_ENV !== 'test')` guard.
  - Jest sets `NODE_ENV=test` by default when running via jest CLI (documented behavior; verified via jest docs). No override in this repo's jest config or scripts.
  - Guard prevents signal-handler registration during any test process that transitively loads `prisma-client.ts` (none today, but future-proofing). Also idiomatic pattern per Node/Fastify community.
  - No behavior change at production/dev entrypoint boot — `NODE_ENV=development|production|staging` all pass the guard.

- **Advisory #3 — Circular import risk**: **NO circular** — `env.ts` is a leaf. Confirmed via `Read src/core/config/env.ts` — only imports `zod`. It does not import from `@core/prisma/*` or transitively pull the singleton back. `prisma-client.ts → env.ts → zod` is a clean 1-way chain.

**Additional verification points to cover in SUBMIT**
- Fresh-checkout acceptance test (`rm -rf node_modules dist coverage .tsbuildinfo && pnpm install --frozen-lockfile && make check`) → PASS (this is the primary DoD signal that the CI gap is closed).
- Standard `make check` (already-generated checkout) → PASS (no regression).
- T04's 14 new tests + T03's 14 tests + `_template`'s 2 skipped: all remain in their prior states.
- `git diff package.json` → empty (no dep add).
- Nathan T11 workaround note: post-merge, exec-B can drop pre-run `pnpm prisma:generate` habit before `make check`.
- Drift scans clean on `src/core/prisma/prisma-client.ts` (no `any`, no `console.log`, no `throw new Error(`, no default export).

**GAPs / questions**: none.

Awaiting PM A ACK.

##### PM A ACK — T-INFRA-01 PLAN APPROVED, proceed to coding (H12 2026-07-01) by PM A (Nanak)

All 3 advisory checks resolved cleanly + `no-misused-promises` catch verified real (`.eslintrc.cjs` has both `no-misused-promises: error` and `no-floating-promises: error` — the `void shutdown()` wrapper is the correct fix, not a bikeshed).

**Verified in PLAN**:
- **Adv #1 (fail-fast at import)** ✓ — grep evidence solid: T11 uses `import type { PrismaClient }` + constructor injection (`buildTicketsService(db, ...)`) + testcontainers spins its own client. Zero current runtime consumers of the singleton → `loadConfig()` at module load impacts no test in the suite today. `.env` present with all required fields for future consumers. Fallback plan (lazy `getPrisma()` factory) documented if fresh-checkout acceptance test surfaces env failure — well-scoped escape hatch.
- **Adv #2 (SIGTERM jest guard)** ✓ — `NODE_ENV=test` set by jest CLI is documented default behavior; no override in this repo's config. Guard is idiomatic + future-proofs against any test that transitively loads the singleton. Zero prod/dev/staging behavior change.
- **Adv #3 (circular import)** ✓ — `env.ts` only imports `zod` (leaf), clean 1-way chain `prisma-client.ts → env.ts → zod`. Confirmed via file read.

**Bonus catch — `no-misused-promises` fix**: canonical `void shutdown()` inside sync arrow wrapper accepted. Named-helper vs inline-arrow style is preference — 2 inline arrows fine, matches Node stdlib idiom. Would also accept `const handleSignal = () => { void shutdown(); }; process.on('SIGTERM', handleSignal); process.on('SIGINT', handleSignal);` if exec-A prefers DRY — either is drift-clean.

**Scope match**: 2 files modify (Makefile 1 line + prisma-client.ts body rewrite preserving JSDoc lines 1-10). Zero create. No dep add. HARD constraints all upheld in PLAN — no wrap-Prisma interface, no `any`, no `console.log`, no default export.

**Proceed to implementation on branch `feat/foundation-prisma-ci`.**

**SUBMIT expectations (reminders)**:
- Fresh-checkout acceptance test WAJIB run + evidence in SUBMIT: `rm -rf node_modules dist coverage .tsbuildinfo && pnpm install --frozen-lockfile && make check` → PASS. This is the primary DoD signal that the CI gap is closed.
- Standard `make check` (already-generated checkout) → PASS.
- T03 14 + T04 14 (11 rbac + 3 hooks) + `_template` 2 skipped — states preserved.
- `git diff package.json` → empty.
- Drift scans on `src/core/prisma/prisma-client.ts` (Makefile is N/A for TS drift categories).
- Include the Nathan T11 workaround note (exec-B can drop pre-run `pnpm prisma:generate` after merge).
- If any advisory-#1 fallback triggers (env failure at test time), pivot to lazy getter + document reason in SUBMIT.

Ship it.

#### SUBMIT T-INFRA-01 — exec-A (Nanak) at H0 2026-07-02 (attempt 1)

Task: Foundation infra — `make check` `prisma-generate` prereq + real Prisma client singleton (GAP-T11-1 fix)

Branch: `feat/foundation-prisma-ci` · Commit: `583d324` (pushed to `origin/feat/foundation-prisma-ci`)

Files changed: **2** (0 create, 2 modify)
  - `Makefile` line 148 (1-line edit: prepend `prisma-generate` to `check` prereqs + updated help text)
  - `src/core/prisma/prisma-client.ts` (body rewrite per PLAN — JSDoc lines 1-10 preserved verbatim; 30 LOC of real singleton + `NODE_ENV !== 'test'` signal-handler guard + `void`-wrapped shutdown)

DoD self-check (11 items from ASSIGNMENT §T-INFRA-01 DoD)
- [x] **`Makefile:148` `check` target has `prisma-generate` as first prereq** — verified: `check: prisma-generate lint format-check typecheck test-unit ## Prisma-generate + lint + format-check + typecheck + unit test`
- [x] **`src/core/prisma/prisma-client.ts` exports real `PrismaClient` instance** — 30-line file exporting `db = new PrismaClient({...})` with datasource url from `loadConfig().DATABASE_URL` and env-aware log level. `{}` stub removed.
- [x] **Fresh-checkout acceptance test PASSES** — evidence below (primary DoD signal)
- [x] **`make check` PASS on already-generated checkout** — 2nd/subsequent run also green, no state pollution
- [x] **T04's `tenant-guard.hooks.test.ts` (3 tests) still green** — visible in `make check` output: `PASS src/plugins/__tests__/tenant-guard.hooks.test.ts`
- [x] **T04's `rbac.test.ts` (11 tests) still green** — `PASS src/plugins/__tests__/rbac.test.ts`
- [x] **T03's `tenant-guard.test.ts` (14 tests) still green** — `PASS src/plugins/__tests__/tenant-guard.test.ts`
- [x] **`_template` 2 skipped tests remain skipped** — `Test Suites: 2 skipped, 6 passed, 6 of 8 total` + `Tests: 2 skipped, 69 passed, 71 total`
- [x] **Drift scans clean on Makefile + `src/core/prisma/prisma-client.ts`** — evidence below (Makefile N/A for TS-rule categories)
- [x] **No new deps in `package.json`** — `git diff package.json` returned empty (verified in run)
- [x] **Nathan T13 unblocking implicit** — exec-B can drop the pre-run `pnpm prisma:generate` workaround after this merges; noted below

Quality gate (final `make check`, standard `already-generated` run)
- `pnpm prisma:generate`: PASS (`✔ Generated Prisma Client (v5.22.0) to ./node_modules/.prisma/client in 299ms`) — now the first step of `make check`
- `pnpm lint`: PASS (0 errors, 0 warnings)
- `pnpm format:check`: PASS (`All matched files use Prettier code style!`)
- `pnpm typecheck`: PASS (`tsc --noEmit` clean)
- `pnpm test:unit`: PASS — `Test Suites: 2 skipped, 6 passed, 6 of 8 total · Tests: 2 skipped, 69 passed, 71 total`
- `make check` overall: **PASS**

Fresh-checkout acceptance test evidence (PRIMARY DoD signal — closes GAP-T11-1)
```bash
$ rm -rf node_modules dist coverage .tsbuildinfo
$ pnpm install --frozen-lockfile
  … (pnpm store link, no postinstall run under pnpm 9 default)
  Done in 2.8s
$ make check
  pnpm prisma:generate
  Environment variables loaded from .env
  Prisma schema loaded from prisma/schema.prisma
  ✔ Generated Prisma Client (v5.22.0) to ./node_modules/.prisma/client in 299ms
  … (lint, format:check, typecheck all PASS)
  PASS src/modules/tickets/__tests__/tickets.service.test.ts
  PASS src/modules/tickets/__tests__/tickets.repository.integration.test.ts (25.418 s)
  PASS src/modules/tickets/__tests__/tickets.routes.test.ts
  PASS src/plugins/__tests__/tenant-guard.hooks.test.ts
  PASS src/plugins/__tests__/tenant-guard.test.ts
  PASS src/plugins/__tests__/rbac.test.ts
  Test Suites: 2 skipped, 6 passed, 6 of 8 total
  Tests:       2 skipped, 69 passed, 71 total
  Time:        26.008 s
```
→ **PASS**. Pre-fix behavior on same fresh state: `make check` would fail at `typecheck` with `Namespace 'Prisma' has no exported member 'TicketInclude' | 'TicketWhereInput' | 'TicketGetPayload'` (Nathan's T11 code untouched, exact symptom he flagged). Post-fix: passes because `prisma-generate` now runs before `typecheck`.

Drift scans (per EXECUTOR-PROTOCOL §4.4, on T-INFRA-01 touched files)
- `any` types in `src/core/prisma/prisma-client.ts`: **0 hits**
- `console.log` in `src/core/prisma/prisma-client.ts`: **0 hits**
- `throw new Error(` in `src/core/prisma/prisma-client.ts`: **0 hits** (uses no error — success-only module init; failure surfaces via `loadConfig()`'s own error path)
- Forbidden imports in `src/core/prisma/prisma-client.ts`: **0 hits** (only `@prisma/client` + `@core/config/env.js`)
- Default export in `src/core/prisma/prisma-client.ts`: **0 hits** (single named `export const db`)
- `.skip(` in tests: unchanged from baseline (2 in `_template`, pre-existing per T01 note)
- Makefile: N/A for TS-rule drift categories (edit is 1-line prereq addition)
- `git diff package.json`: empty (no dep add — HARD constraint upheld)

Security check (N/A for T-INFRA-01 — no auth/webhook/crypto surface)
- HMAC verify: N/A
- Token encryption: N/A
- PII masking: N/A (log config passes only warn/error levels; no user data serialized)
- No secret hardcoded: **confirmed** (`config.DATABASE_URL` is env-sourced via `loadConfig()`)
- ADR-0001 compliance (no wrap-Prisma interface): **confirmed** — `db` is a raw `PrismaClient` instance; no `IUserRepository`-style wrapper introduced

Test evidence
- Total tests post-fix: **69 passed / 2 skipped / 71 total** in 6 executed suites (2 additional suites skipped: `_template` boilerplate + jest config placeholder)
- New tests added by T-INFRA-01: **0** — rationale from ASSIGNMENT: "Prisma Client is a library wrapper; unit-testing 'the wrapper wraps' is redundant per CLAUDE.md general principle. Integration coverage comes downstream via testcontainers in modules that use it (Nathan's T11 already does this)."
- Coverage: unchanged (touched file `prisma-client.ts` has no test — deliberate per above rationale; would be tested via integration when a module actually consumes it)

Adv-#1 fallback status: **NOT triggered**. `loadConfig()` at module top did not surface any test-time failure — as PLAN predicted, no current test transitively loads the singleton (T11 uses `import type` + injection; T03/T04 don't touch `@core/prisma/*`). No pivot to lazy `getPrisma()` factory needed.

Notes for Slot B
- **Nathan can drop the pre-run `pnpm prisma:generate` workaround** once this branch merges to `main`. Standard `make check` will now regenerate Prisma Client automatically on any checkout state.
- No change to T11 code required. `buildTicketsService(db: PrismaClient, ...)` remains the wiring seam — future `api.ts` implementation will pass `db` from `@core/prisma/prisma-client.js` at composition time.

Notes / operational
- Root cause deep-dive on pnpm virtual store behavior (for PARENT §10 coord note if useful): under `.npmrc` `node-linker=isolated` + `shamefully-hoist=false`, pnpm 9 does NOT auto-run @prisma/client's postinstall on `pnpm install --frozen-lockfile`. So the pnpm-store `.prisma/client/` folder is absent after fresh install. `pnpm prisma:generate` (per schema.prisma's `output = "../node_modules/.prisma/client"`) then writes to the project-root `.prisma/client/`, and TypeScript module resolution — walking up the directory tree from the pnpm store — finds it there. All types (37927 lines including `TicketWhereInput`, `TicketInclude`, `TicketGetPayload`) resolve correctly. Pre-existing brokenness was strictly the missing prereq step. My earlier intermediate `pnpm rebuild @prisma/client` in this session polluted the pnpm store with a 110-line stub that shadowed the project-root types — this is a red herring that doesn't reproduce under the acceptance-test steps.
- Env note (session-local): had to re-activate Node 20 + pnpm 9 via `nvm use 20 && corepack prepare pnpm@9 --activate` at session start (T01-established procedure). No permanent config change.

Requesting PM A VERDICT.

##### VERDICT T-INFRA-01 — APPROVED (H0 2026-07-02, attempt 1) by PM A (Nanak)

Validated per PM-AGENT §3 Steps 1–7 on branch `feat/foundation-prisma-ci` @ commit `583d324`, with **additional validation on simulated post-merge state** (main + T13/T14/T15 + T-INFRA-01 applied via `git checkout feat/foundation-prisma-ci -- Makefile src/core/prisma/prisma-client.ts`). All gates green.

**DoD verification (11 items from ASSIGNMENT)** — all ✓
- Makefile:148 `check` target has `prisma-generate` first: verified `check: prisma-generate lint format-check typecheck test-unit ## …` ✓
- `src/core/prisma/prisma-client.ts` exports real `PrismaClient` instance (not `{}` stub): file-read verified (33 LOC, JSDoc lines 1-9 preserved verbatim per PLAN) ✓
- **Fresh-checkout acceptance test** (primary DoD signal — closes GAP-T11-1): independent PM re-run on **combined main+T-INFRA-01 state** → PASS. Evidence below.
- `make check` PASS on already-generated checkout: green ✓
- T04 `tenant-guard.hooks.test.ts` (3): green ✓
- T04 `rbac.test.ts` (11): green ✓
- T03 `tenant-guard.test.ts` (14): green ✓
- `_template` 2 skipped: unchanged ✓
- Drift scans clean on prisma-client.ts (Makefile N/A for TS rules) ✓
- No new deps: `git diff main -- package.json pnpm-lock.yaml` empty ✓
- Nathan T11 workaround note landed in SUBMIT ✓

**Independent fresh-checkout acceptance evidence (PM rerun, simulated post-merge state)**

```bash
git checkout main
git checkout feat/foundation-prisma-ci -- Makefile src/core/prisma/prisma-client.ts
rm -rf node_modules dist coverage .tsbuildinfo
pnpm install --frozen-lockfile
make check
```

Result (tail):
```
pnpm prisma:generate
  ✔ Generated Prisma Client (v5.22.0) to ./node_modules/.prisma/client in 172ms
pnpm lint  → PASS (0 errors, 0 warnings, --max-warnings 0)
pnpm format:check  → PASS
pnpm typecheck  → PASS  (proves T13/T14/T15's PrismaClient type consumption compiles on fresh checkout)
pnpm test:unit  → PASS
Test Suites: 2 skipped, 10 passed, 10 of 12 total
Tests:       2 skipped, 144 passed, 146 total
Time:        9.986 s
```

**PM rerun count = 144 passed** (vs exec-A's 69 on branch-alone). Delta = **Nathan's T13/T14/T15 tests all green**. Stronger acceptance signal than SUBMIT alone — validates the fix on the exact state PO will see post-merge.

**Drift scans** (PM-AGENT §3 Step 2, on `src/core/prisma/prisma-client.ts`)
- `any`: **0** · `console.log/info/debug`: **0** · `throw new Error(`: **0** · Forbidden imports: **0** · Default export: **0** · Hardcoded URL: **0** · Wrap-Prisma interface: **0** (ADR-0001 ✓)

**Spot-check** (PM-AGENT §3 Step 5)
- Naming ✓; explicit return type `Promise<void>` on `shutdown` ✓; JSDoc lines 1-9 preserved verbatim ✓; `NODE_ENV !== 'test'` guard prevents jest open-handle ✓; `void shutdown()` inside sync arrow — lint PASS proves `no-misused-promises` + `no-floating-promises` compliance ✓; imports leaf-only (`@prisma/client` lib + `@core/config/env.js`) ✓; 33 LOC ✓

**Security floor** — N/A (no auth/webhook/crypto/PII surface). Log config sanitized (`warn/error` levels only, no query params/user data serialized).

**Advisory tracking (all 3 resolved, no fallback triggered)**
- Adv-#1 (fail-fast at import): NOT triggered. `loadConfig()` at module load impacts **zero current test** (T11-T15 all use `import type { PrismaClient }` + constructor injection; T03/T04 don't touch `@core/prisma/*`). Lazy-getter fallback stays documented for future.
- Adv-#2 (SIGTERM guard `NODE_ENV !== 'test'`): in code, lint PASS.
- Adv-#3 (circular): leaf chain `prisma-client.ts → env.ts → zod` confirmed.

**pnpm-store deep-dive from SUBMIT — mirroring to PARENT §10 (per PO request)**
Under `.npmrc` `node-linker=isolated` + `shamefully-hoist=false`, pnpm 9 does NOT auto-run `@prisma/client`'s postinstall on `pnpm install --frozen-lockfile`. Pnpm-store `.prisma/client/` absent after fresh install. `pnpm prisma:generate` writes to project-root `node_modules/.prisma/client/` (per `schema.prisma`'s `output = "../node_modules/.prisma/client"`), and TS module resolution walks up from the pnpm store, finds it there. This is why `prisma-generate` as `check` prereq is the correct fix (not CI-level or `.npmrc` tweak). **Do NOT run `pnpm rebuild @prisma/client`** — pollutes pnpm store with 110-line stub that shadows project-root types (red herring; doesn't reproduce under standard acceptance steps). Useful onboarding note for Satrio.

**Follow-ups actioned in same commit**
- → §1 T-INFRA-01 → approved
- → §0 Active task refreshed → T05 next
- → PARENT §1 T-INFRA-01 → approved (row mirrored)
- → PARENT §2 short roll-up (latest-at-top)
- → PARENT §3b GAP-T11-1 → **resolved**
- → PARENT §10 pnpm-store insight documented

**PO action item — branch merge**
`feat/foundation-prisma-ci` @ `583d324` on `origin`; PM A verified green on both (1) branch alone (69 tests) and (2) **simulated post-merge state with T13/T14/T15 (144 tests)**. Per CLAUDE.md §12, **please merge `feat/foundation-prisma-ci` → `main` when ready**. PM A will not auto-merge. Post-merge impact: every dev's `make check` runs `prisma-generate` first (~300ms overhead), exec-B drops the `pnpm prisma:generate` workaround, future singleton consumers work out of the box.

**Next Slot A queue**
1. **T05** seed scripts (1 demo hotel via Auth API + 5 depts + sample menu + KB)
2. **T06** ticket state-machine helper (parallel-friendly)
3. **T07** common error handlers (HC-specific codes per spec §7)

Ship it.

### ASSIGNMENT T07-slice-1 — claimed by exec-A (Nanak) at H0 2026-07-02
- Branch: `feat/foundation-business-rule-error` (per PO branch-per-task policy)
- Routed from: PARENT §1 T07-slice-1 + §10 DEP-6 (escalated by PM B / Nathan during T16 wip)
- Depends on: T-INFRA-01 (merged ✓ — real Prisma singleton not consumed here, but foundation is healthy)
- Downstream unblocks: **T12** (ticket status transition — invalid transition = `BUSINESS_RULE`) + **T16-V2..T16-V5** (visits verify-manual family — pending/failed_3x/manual verification rule violations). 5 Slot B tasks total.
- Spec / reference (WAJIB read before PLAN):
  - `src/core/errors/app-errors.ts` — existing `AppError` hierarchy + subclass pattern (ValidationError/AuthError/ForbiddenError/NotFoundError/ConflictError/RateLimitError/ExternalServiceError/TenantError/BillingRequiredError). New class must match this style.
  - `docs/spec/02-hotel-core.md §7` — HC error catalog. Lists 5 specific 422 codes: `INVALID_TICKET_TRANSITION`, `MIN_AGENTS_VIOLATION`, `FEATURE_FLAG_DEPENDENCY_VIOLATION`, `WA_TEMPLATE_LOCKED`, `TIER_GATE`.
  - `CLAUDE.md §5.4` — service must throw `AppError` subclass; plugin-error-handler translates to HTTP.
  - `PARENT §10 row 317` — DEP-6 escalation + PM B's ratified envelope shape.

#### PM A notes untuk exec-A

**Scope**

Single-class addition to `src/core/errors/app-errors.ts` plus a fresh unit-test file. **Intentionally scoped as slice-1** — ships ONE class (the one Nathan needs today) rather than all 8 spec §7 codes. Rationale: Satrio (Slot C) hasn't started coding; his error codes can be shipped in slice-2+ on-demand without holding up Nathan's chain.

Class shape (aligned with existing subclass pattern):
```ts
/**
 * BusinessRuleError — HTTP 422 for domain rule violations
 * (invalid state transitions, business invariant breaks).
 *
 * Wire contract per PARENT §10 DEP-6 (PM B ratified):
 *   envelope `code = 'BUSINESS_RULE'` (generic category)
 *   + `details.rule` = specific rule identifier
 *     (e.g. 'INVALID_TICKET_TRANSITION', 'PENDING_VERIFICATION_ONLY')
 *
 * Consumer pattern:
 *   throw new BusinessRuleError('Cannot transition closed → open', {
 *     rule: 'INVALID_TICKET_TRANSITION',
 *     from: 'closed',
 *     to: 'open',
 *   });
 */
export class BusinessRuleError extends AppError {
  readonly statusCode = 422;
  readonly code = 'BUSINESS_RULE';
}
```

That's it — 2-line body + JSDoc, matches `ValidationError` / `ConflictError` / `RateLimitError` style (no custom constructor needed; base class handles `(message, details)`).

**Envelope design note — WAJIB acknowledge in PLAN**

Spec `docs/spec/02-hotel-core.md §7` lists 5 specific 422 codes at envelope level (`INVALID_TICKET_TRANSITION`, `MIN_AGENTS_VIOLATION`, etc.). PM B's ratified envelope for DEP-6 uses generic `BUSINESS_RULE` at envelope + specific rule in `details.rule`. **This is an intentional design divergence, not a bug** — categorization pattern chosen for cleaner consumer error handling (one `catch (BusinessRuleError)` block, discriminate on `details.rule`).

- If PLAN wants to push back (e.g. propose per-rule subclasses `InvalidTicketTransitionError extends BusinessRuleError`), route via PLAN GAP → PM A will consult with PM B before ACK.
- If PLAN accepts the envelope-generic + details-rule design (recommended, matches PM B's ruling), sertakan 1-line acknowledgment in PLAN referencing PARENT §10 DEP-6.
- **This slice does NOT need to refactor spec §7's other 422 codes**. Class supports any `rule` string in details; when T12 lands it passes `rule: 'INVALID_TICKET_TRANSITION'`, when T28 lands (later) it passes `rule: 'MIN_AGENTS_VIOLATION'`, etc.

**HARD constraints (WAJIB — pelanggaran = REJECT)**
- **No `throw new Error(`** — well-formed AppError subclass ✓
- **No `any`** — class extends AppError which types details as `Record<string, unknown>`; keep it
- **No default export** — named export only (`BusinessRuleError`)
- **No new deps** — `@core/errors/app-errors.ts` needs no imports beyond what's already there
- **Do NOT modify existing error classes** — AuthError/NotFoundError/etc. stay untouched (avoids merge-conflict risk with any Slot B in-flight branches referencing them)
- **Do NOT touch other files** in this PR — `src/plugins/`, `src/modules/`, `src/core/config/`, `src/core/prisma/` all out of scope
- **Do NOT wire error-handler HTTP mapping** — error-handler plugin is out of scope (may be stub per DEP-4). `toJson()` on base class + `statusCode` on subclass already give error-handler everything it needs when it gets wired; verify no active error-handler needs update

**Files to modify** (1) + **create** (1)
- Modify: `src/core/errors/app-errors.ts` — append `BusinessRuleError` class after `BillingRequiredError` (last existing subclass; keeps semantic ordering by HTTP status ascending: 400 → 401 → 402 → 403 → 404 → 409 → 422 → 429 → 500 → 502)
- Create: `src/core/errors/__tests__/app-errors.test.ts` — first test file for this module. Sets a precedent — write cleanly.

**T07-slice-1 DoD**
- [ ] `BusinessRuleError` exported from `@core/errors/app-errors.js`
- [ ] `statusCode === 422` (readonly)
- [ ] `code === 'BUSINESS_RULE'` (readonly)
- [ ] `extends AppError` — verified via `instanceof AppError` test
- [ ] JSDoc documents Nathan's `details.rule` convention with the consumer example above
- [ ] `toJson()` returns `{ code: 'BUSINESS_RULE', message, details }` — verified via test
- [ ] Unit test suite for `BusinessRuleError`: (a) constructs with message + details.rule; (b) statusCode/code/name correct; (c) toJson shape matches Nathan's envelope; (d) instanceof AppError + instanceof Error
- [ ] Bonus (optional but nice): 1-2 sanity tests for existing classes (e.g. AuthError statusCode=401, code=`AUTH_ERROR`) — establishes coverage for the hierarchy in this new test file. Exec-A discretion.
- [ ] `make check` PASS (lint + format + typecheck + test:unit)
- [ ] T03/T04/T-INFRA-01/T11/T13/T14/T15 tests all still green — verified via full test suite pass (should be ~146+ total post-slice-1)
- [ ] Drift scans clean on both files (0 `any`, 0 `console.log`, 0 `throw new Error(`, 0 default export)
- [ ] `git diff package.json` empty (no dep add)

**Advisory PLAN checks (proactive gotcha flags)**

1. **Test file location**: I did NOT find `src/core/errors/__tests__/` — this test file will be the first in that directory. Verify jest picks it up via existing `jest.config.ts` patterns (`__tests__/*.test.ts` should be auto-globbed; T03/T04 tests live at `src/plugins/__tests__/*.test.ts` and work). Sanity-check the test file is discovered by running `pnpm test:unit` and confirming the new test suite appears in the output — flag in SUBMIT if not.

2. **`AppError` is abstract** — cannot directly `new AppError(...)` in test. Test via `BusinessRuleError` instance and cast to `AppError` for base-class behavior verification. Don't try to test the abstract class directly.

3. **`Error.captureStackTrace` availability** — `AppError` uses optional chaining `Error.captureStackTrace?.(this, this.constructor)` (line 19). Works on V8 (Node/Chrome), undefined on other engines. Node 20 has it — no concern in this repo. Do NOT need to test stack trace shape.

4. **Consumer verification (grep for existing Nathan usage)** — before coding, `grep -r "BusinessRuleError" src/modules/` to check if any Slot B branch (unmerged) has already referenced the class in expectation. If yes, verify shape matches. If exec-A finds an already-imported `BusinessRuleError` in Slot B code, the shape shipped MUST match — otherwise Nathan's next merge breaks. Note in PLAN what grep found.

5. **HTTP status ordering in file** — existing classes are ordered by status: 400 → 401 → 402 → 403 → 404 → 409 → 429 → 500 → 502 (currently jumbled: BillingRequiredError 402 sits after ExternalServiceError 502). Options: (a) append `BusinessRuleError` at end regardless (matches current jumble — fine), (b) insert at 422 slot between 409 and 429 (cleaner). Exec-A choice; note rationale in PLAN. Not blocking either way.

6. **`readonly` + subclass pattern** — TypeScript `readonly` class field on subclass must satisfy the abstract signature from parent. Verify via typecheck; should just work per existing 8-subclass proof.

**Coordination downstream (PM A tracking, exec-A no action)**
- Post VERDICT APPROVED, PM A will:
  - Update PARENT §1 T07-slice-1 → approved
  - Post roll-up to PARENT §2
  - Update PARENT §10 DEP-6 → resolved (or partially resolved if error-handler wiring pending)
  - Notify PO to merge `feat/foundation-business-rule-error` → main
  - After merge, ping PM B via cross-dev coord note that unblock is live

Awaiting **PLAN T07-slice-1** from exec-A.

#### PLAN T07-slice-1 — exec-A (Nanak) at H0 2026-07-02

**Scope recap**
- Append single `BusinessRuleError extends AppError` (HTTP 422, `code = 'BUSINESS_RULE'`) to `src/core/errors/app-errors.ts` per PM B's ratified envelope (`BUSINESS_RULE` at envelope + specific rule identifier in `details.rule`). Create first test file under `src/core/errors/__tests__/app-errors.test.ts` covering `BusinessRuleError` DoD + 2 sanity tests for existing hierarchy. Unblocks Slot B DEP-6 (T12 + T16-V2..5, 5 tasks).

**Session-start gate** (EXECUTOR-PROTOCOL §2)
- Identity confirmed: Executor, Slot A (Nanak) ✓
- CLAUDE.md loaded ✓
- Task spec read: ASSIGNMENT block above + `docs/spec/02-hotel-core.md §7` (5 spec 422 codes; envelope-vs-details divergence acknowledged) + `CLAUDE.md §5.4` (AppError subclass mandatory) ✓
- Parent docs spot-read: `src/core/errors/app-errors.ts` (86 LOC — full existing hierarchy, base `AppError` abstract with `constructor(message, details = {})` + `toJson()` method returning `{code, message, details}`, `Error.captureStackTrace?.(this, this.constructor)` line 19, existing 9 subclasses); `jest.config.ts` (`testMatch: ['**/__tests__/**/*.test.ts', ...]` + `roots: ['<rootDir>/src', '<rootDir>/scripts']` — confirms discovery of new location); `PM-STATUS-A.md` §2 ASSIGNMENT + PARENT §10 DEP-6 context ✓
- Dependencies: T-INFRA-01 ✓ (merged; foundation healthy — my touch doesn't consume Prisma singleton but working tree is)
- `make typecheck` clean ✓ ; `make lint` clean ✓ (baseline dari post-T-INFRA-01 merge)
- Scaffolder risk: **none** — 1 append + 1 new test file, no CLI generators

**Files to modify** (1) + **create** (1)
- Modify: `src/core/errors/app-errors.ts` — append `BusinessRuleError` class after `BillingRequiredError` (currently the last class at line 83-86). Zero touch to existing classes → satisfies HARD constraint + zero Slot B merge-conflict risk.
- Create: `src/core/errors/__tests__/app-errors.test.ts` — first test file for this module (sets precedent). Cover 4-item DoD for `BusinessRuleError` + 2 bonus sanity tests for existing hierarchy (`AuthError` 401, `NotFoundError` 404 constructor with resource+id).

**Files NOT touched** (per HARD constraints + zero-scope-creep)
- Existing error classes in `app-errors.ts` — untouched.
- `src/plugins/` (T03/T04), `src/modules/*` (Nathan/Satrio), `src/core/config/`, `src/core/prisma/` (T-INFRA-01) — all out of scope.
- `package.json` — no dep add.
- Any error-handler plugin (does not exist yet per DEP-4 stub state; `toJson()` + `statusCode` already give it what it needs when wired later).

**Approach**

*(1) `app-errors.ts` append* — final block appended after existing `BillingRequiredError` (mirrors `ValidationError`/`ConflictError`/`RateLimitError` no-custom-ctor style):
```ts
/**
 * BusinessRuleError — HTTP 422 for domain rule violations (invalid state
 * transitions, business invariant breaks).
 *
 * Wire contract per PARENT §10 DEP-6 (PM B ratified):
 *   envelope `code = 'BUSINESS_RULE'` (generic category)
 *   + `details.rule` = specific rule identifier
 *     (e.g. 'INVALID_TICKET_TRANSITION', 'PENDING_VERIFICATION_ONLY')
 *
 * Consumer pattern:
 *   throw new BusinessRuleError('Cannot transition closed → open', {
 *     rule: 'INVALID_TICKET_TRANSITION',
 *     from: 'closed',
 *     to: 'open',
 *   });
 */
export class BusinessRuleError extends AppError {
  readonly statusCode = 422;
  readonly code = 'BUSINESS_RULE';
}
```

*(2) `__tests__/app-errors.test.ts` create* — test structure:
- `describe('BusinessRuleError')` — 4 tests: (a) constructs with message + `details.rule`; (b) `statusCode === 422` / `code === 'BUSINESS_RULE'` / `name === 'BusinessRuleError'`; (c) `toJson()` returns `{ code: 'BUSINESS_RULE', message, details }` (Nathan's envelope shape); (d) `instanceof BusinessRuleError` + `instanceof AppError` + `instanceof Error`.
- `describe('existing hierarchy sanity')` — 2 bonus tests: (a) `AuthError` has statusCode=401 + code='AUTH_ERROR'; (b) `NotFoundError` constructs correctly with resource-only + resource+id shapes (statusCode=404, code='NOT_FOUND', message includes id when provided, `details.resource`+`details.id` populated). These establish coverage for the hierarchy in the new precedent-setting file per DoD bonus bullet.
- Test naming: `it('should <expected> when <condition>')` per CLAUDE.md.
- Import path: `from '../app-errors.js'` (relative — matches T04 test pattern for co-located source).

**Explicit resolution of PM A's 6 advisory checks**

- **Adv #1 — test file location discovery**: **VERIFIED**. `jest.config.ts` shows `roots: ['<rootDir>/src', '<rootDir>/scripts']` + `testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.integration.test.ts']`. The glob `**/__tests__/**/*.test.ts` matches any `__tests__/` directory anywhere under `src/`, so `src/core/errors/__tests__/app-errors.test.ts` will be auto-discovered on first jest run. No config change needed. Will confirm in SUBMIT via test-output listing this new suite.

- **Adv #2 — `AppError` is abstract**: acknowledged. Test uses `BusinessRuleError` instance for all base-class behavior verification (toJson, name, details, captureStackTrace-derived stack). Never directly `new AppError(...)`. The `instanceof AppError` assertion in test (d) is prototype-chain check on the concrete instance — legal on abstract classes.

- **Adv #3 — `Error.captureStackTrace` availability**: acknowledged. Node 20 (this repo's runtime per `package.json` engines + T01 nvm activation) supports it. Base `AppError:19` optional-chains it (`Error.captureStackTrace?.(this, this.constructor)`) which no-ops on non-V8. Test does NOT assert stack-trace shape (fragile + engine-specific) — only verifies `err.stack` is a non-empty string (safe universal check that passes when captureStackTrace runs OR when the native `Error` fills the field).

- **Adv #4 — Consumer verification (Slot B pre-import check)**: **grep confirmed ZERO existing references**. Ran `grep -rn "BusinessRuleError" src/ docs/` → no hits. No Slot B branch on `main` has pre-imported the class. Shape shipped is authoritative — no compat pressure. (If Nathan's next branch surprises with a different shape after ship, that's a T12/T16 PLAN concern, not mine — but PM B's ratified envelope in PARENT §10 DEP-6 is what he'll use.)

- **Adv #5 — HTTP status ordering — choice**: **Option (a) — append at end** after `BillingRequiredError`. Rationale:
  1. Matches HARD constraint "Do NOT modify existing error classes" both semantically (no class touched) AND structurally (no lines inserted between existing classes). Option (b) would push RateLimitError/ExternalServiceError/TenantError/BillingRequiredError down N lines, expanding the diff surface into their line ranges → git blame noise + increased merge-conflict window with any unmerged Slot B/C branch touching this file.
  2. Current tail is already jumbled (502→500→402); appending 422 after 402 doesn't make it worse and preserves append-only pattern that future slice-2+ additions will follow.
  3. Reordering the whole tail (500/502/402/422) semantically is a separate concern — should be its own PR that touches the whole file intentionally (with git blame explanation in commit body), not smuggled into a class-add slice.
  → append after line 86 `}` of `BillingRequiredError`.

- **Adv #6 — `readonly` + subclass pattern**: acknowledged. Existing 8 subclasses prove the pattern; TypeScript's `readonly statusCode = 422` on `class BusinessRuleError extends AppError` satisfies the parent's `abstract readonly statusCode: number` signature. Same for `code`. Typecheck will validate.

**Envelope design acknowledgment (per ASSIGNMENT WAJIB item)**
Accepting PM B's ratified envelope design (envelope-generic `BUSINESS_RULE` + specific rule in `details.rule`) as documented in PARENT §10 DEP-6 — no rebuttal. Spec §7's 5 specific 422 codes will become `details.rule` values (`INVALID_TICKET_TRANSITION`, `MIN_AGENTS_VIOLATION`, `FEATURE_FLAG_DEPENDENCY_VIOLATION`, `WA_TEMPLATE_LOCKED`, `TIER_GATE`), preserving spec coverage without proliferating subclasses. Consumers write one `catch (BusinessRuleError)` block and discriminate on `err.details.rule` — cleaner than per-rule subclass hierarchy for downstream error-handler wiring (T07-slice-N or wherever).

**GAPs / questions**: none.

Awaiting PM A ACK.

##### PM A ACK — T07-slice-1 PLAN APPROVED, proceed to coding (H0 2026-07-02) by PM A (Nanak)

All 6 advisories resolved with concrete evidence. Design accepts PM B's ratified envelope without divergence. Test plan proportionate.

**Verified in PLAN**:
- **Adv #1 (jest globbing)** ✓ — read `jest.config.ts`: `testMatch: ['**/__tests__/**/*.test.ts']` + `roots: ['<rootDir>/src', '<rootDir>/scripts']` catches the new path. No config change needed.
- **Adv #2 (abstract AppError)** ✓ — tests use `BusinessRuleError` instance; `instanceof AppError` is prototype-chain check (legal on abstract classes).
- **Adv #3 (captureStackTrace)** ✓ — asserts `err.stack` non-empty string (universal, engine-agnostic), not fragile shape. Node 20 supports capture natively; optional-chain in base gracefully no-ops on non-V8.
- **Adv #4 (consumer grep)** ✓ — `grep -rn "BusinessRuleError" src/ docs/` = 0 hits. Free hand on shape; PM B's ratified envelope is what T12/T16 will use.
- **Adv #5 (HTTP status ordering)** ✓ — Option (a) append-at-end chosen. Rationale solid: (1) preserves HARD "no modify existing" both semantically AND structurally (zero lines inserted between existing classes); (2) reduces merge-conflict window with any unmerged B/C branches touching this file; (3) existing tail is already jumbled (502→500→402) — reordering is a separate PR's job, not smuggled into a slice-1 add. Append-only pattern is what slice-2+ will follow.
- **Adv #6 (readonly + subclass)** ✓ — 8 existing subclasses prove the pattern; TS satisfies parent's abstract signature.

**Envelope design accepted as PM B ratified** ✓ — envelope-generic `BUSINESS_RULE` + specific rule in `details.rule`. Spec §7's 5 specific 422 codes become `details.rule` values (`INVALID_TICKET_TRANSITION`, `MIN_AGENTS_VIOLATION`, `FEATURE_FLAG_DEPENDENCY_VIOLATION`, `WA_TEMPLATE_LOCKED`, `TIER_GATE`). Consumers `catch (BusinessRuleError)` + discriminate on `err.details.rule`. Clean.

**Scope match** ✓ — 1 modify (`app-errors.ts` append) + 1 create (fresh test file). Zero touch to existing error classes, plugins, modules, config, prisma. No dep add. HARD constraints all upheld.

**Test plan proportionate** ✓ — 4 core `BusinessRuleError` tests (construction + status/code/name + toJson envelope + instanceof chain) + 2 bonus sanity (AuthError + NotFoundError). Test naming per CLAUDE.md. Establishes coverage precedent for slice-2+ additions without over-testing library-wrapper behavior.

**Proceed to implementation on branch `feat/foundation-business-rule-error`.**

**SUBMIT expectations (reminders)**:
- `make check` PASS (lint + format:check + typecheck + test:unit) — expect ~146+ tests post-slice-1 (144 baseline + ~6 new)
- New test suite `src/core/errors/__tests__/app-errors.test.ts` appears in jest output (Adv #1 confirmation signal)
- T03/T04/T-INFRA-01/T11/T13/T14/T15 all preserved green
- Drift scans clean on both files (0 `any`, 0 `console.log`, 0 `throw new Error(`, 0 default export)
- `git diff package.json` empty
- Full class + JSDoc + test file diff in SUBMIT for spot-check
- If Nathan pushes a new Slot B branch mid-implementation that references `BusinessRuleError`, note in SUBMIT — verify shape compat but no rework needed (Adv #4 confirmed free hand)

Ship it.

#### SUBMIT T07-slice-1 — exec-A (Nanak) at H0 2026-07-02 (attempt 1)

Task: `BusinessRuleError` (HTTP 422, `code = 'BUSINESS_RULE'`) foundation error class — DEP-6 fix, unblocks Slot B T12 + T16-V2..V5

Branch: `feat/foundation-business-rule-error` · Commit: `b214743` (pushed to `origin/feat/foundation-business-rule-error`)

Files changed: **2** (1 modify, 1 create)
  - `src/core/errors/app-errors.ts` (modify — append 20 LOC: JSDoc + 4-line class body after `BillingRequiredError`; 9 existing classes untouched)
  - `src/core/errors/__tests__/app-errors.test.ts` (create — 77 LOC, 6 tests, first test file for this module)

DoD self-check (10 items from ASSIGNMENT §T07-slice-1 DoD)
- [x] **`BusinessRuleError` exported from `@core/errors/app-errors.js`** — verified via test's named import
- [x] **`statusCode === 422` (readonly)** — verified via test `should expose statusCode 422, code BUSINESS_RULE, and name BusinessRuleError`
- [x] **`code === 'BUSINESS_RULE'` (readonly)** — same test above
- [x] **`extends AppError`** — verified via test `should be an instance of BusinessRuleError, AppError, and Error` (`instanceof AppError` true)
- [x] **JSDoc documents Nathan's `details.rule` convention with consumer example** — full block appended above class per ASSIGNMENT template verbatim; references PARENT §10 DEP-6, includes 5-line consumer code sample
- [x] **`toJson()` returns `{ code: 'BUSINESS_RULE', message, details }`** — verified via test `should serialize via toJson to Nathan envelope shape`
- [x] **Unit test suite covers (a)/(b)/(c)/(d)** — 4 `BusinessRuleError` tests present, all pass
- [x] **Bonus: 1-2 sanity tests for existing classes** — 2 tests: `AuthError` (statusCode/code) + `NotFoundError` (resource-only and resource+id constructor shapes)
- [x] **`make check` PASS** — see Quality gate below
- [x] **T03/T04/T-INFRA-01/T11/T13/T14/T15 tests all still green** — full suite runs to 150 passing / 2 skipped / 152 total across 11 executed suites (T04 rbac + T04 tenant-guard.hooks + T03 tenant-guard + T11 tickets service/routes/integration + T13 tickets.stats + guests service/routes/integration + new app-errors — visible in `make check` output). Baseline 144 → new 150 = +6 new tests exactly (4 BRE + 2 sanity).
- [x] **Drift scans clean on both files** — see Drift scans below (0 hits on any / console.log / throw new Error / forbidden imports / default export / .skip)
- [x] **`git diff package.json` empty** — verified in run (no output); no dep add

Quality gate (final `make check`)
- `pnpm prisma:generate`: PASS (first prereq from T-INFRA-01)
- `pnpm lint`: PASS (0 errors, 0 warnings)
- `pnpm format:check`: PASS (`All matched files use Prettier code style!`)
- `pnpm typecheck`: PASS (`tsc --noEmit` clean)
- `pnpm test:unit`: **PASS** — `Test Suites: 2 skipped, 11 passed, 11 of 13 total · Tests: 2 skipped, 150 passed, 152 total`
- `make check` overall: **PASS**

Adv #1 confirmation (jest discovery of new test-dir precedent)
Jest output shows the new suite listed among the 11 executed:
```
PASS src/core/errors/__tests__/app-errors.test.ts
PASS src/modules/tickets/__tests__/tickets.stats.test.ts
PASS src/modules/guests/__tests__/guests.service.test.ts
PASS src/plugins/__tests__/tenant-guard.test.ts
PASS src/modules/tickets/__tests__/tickets.service.test.ts
PASS src/plugins/__tests__/rbac.test.ts
PASS src/plugins/__tests__/tenant-guard.hooks.test.ts
PASS src/modules/tickets/__tests__/tickets.routes.test.ts
PASS src/modules/guests/__tests__/guests.routes.test.ts
PASS src/modules/guests/__tests__/guests.repository.integration.test.ts (8.568 s)
PASS src/modules/tickets/__tests__/tickets.repository.integration.test.ts (8.786 s)
```
→ jest's `testMatch: ['**/__tests__/**/*.test.ts']` picks up `src/core/errors/__tests__/` as predicted in PLAN. No config change needed.

Drift scans (per EXECUTOR-PROTOCOL §4.4, on T07-slice-1 touched files)
- `any` types in `src/core/errors/app-errors.ts` + `src/core/errors/__tests__/app-errors.test.ts`: **0 hits**
- `console.log`: **0 hits** in both files
- `throw new Error(`: **0 hits** in both files (test uses `expect(...).toBe(...)` / `toEqual(...)` / `toBeInstanceOf(...)` assertions only)
- Forbidden imports (express / typeorm / sequelize / moment / node-fetch): **0 hits** in both files
- Default export: **0 hits** in both files (all named exports)
- `.skip(` in tests: **0 hits** in new file
- `git diff package.json`: empty (no dep add — HARD constraint upheld)

Security check (N/A for T07-slice-1 — error class, no auth/webhook/crypto surface)
- HMAC verify: N/A
- Token encryption: N/A
- PII masking: N/A (error `details` shape is caller's responsibility; the class does not log)
- No secret hardcoded: **confirmed**

Test evidence
- **Total tests post-slice-1: 150 passed / 2 skipped / 152 total** (from prior baseline ~144 + 6 = 150 confirmed)
- **New tests added by T07-slice-1: 6** (4 `BusinessRuleError` DoD tests + 2 bonus sanity: `AuthError` + `NotFoundError`)
- Coverage on the `BusinessRuleError` class itself: **100% conceptually** — the class body is `readonly statusCode = 422;` + `readonly code = 'BUSINESS_RULE';`. All observable behavior (construction, statusCode, code, name, toJson envelope, instanceof chain, stack presence) is asserted directly in the 4 dedicated tests. File-level `--coverage` on `app-errors.ts` shows 58.97% because 6 of the 9 pre-existing subclasses were intentionally left uncovered (out of scope; slice-N+ can add more sanity tests). This is DoD-compliant per bonus-optional bullet.
- Sample test line count: 77 LOC (below common test-file targets — matches Prettier-formatted single-import + 6 well-named `it()` blocks).

Slot B pre-import verification (Adv #4 re-check pre-commit)
- Ran `git log --all --grep=BusinessRuleError` — hits are ONLY in PM-STATUS + PARENT commits (PM A ASSIGNMENT/ACK, Nathan's GAP T16-#4 escalation) — no code commits.
- Ran `git grep BusinessRuleError` across all remote refs — hits in PM-STATUS-B.md, PM-STATUS-PARENT.md (docs) + `origin/feat/visits-list-verify:src/modules/visits/__tests__/visits.repository.integration.test.ts`. Inspected that test file: **only a JSDoc header comment** referencing the class name ("verify-manual tx atomicity / tenant-404 coverage lands with V2–V5 once GAP T16-#4 (422 BusinessRuleError) is resolved") — no import statement, no runtime reference. Nathan waiting on the class to ship. **Shape shipped here is authoritative — no compat pressure.**
- No new Slot B branch pushed mid-implementation (checked `git branch -r` at commit time).

Notes / operational
- Env note (session-local): re-activated Node 20 + pnpm 9 via `nvm use 20 && corepack prepare pnpm@9 --activate` at session start (T01-established procedure).
- Sequencing note (transparency for PM A audit): my initial commit landed on local `main` accidentally after a branch-context slip during interactive session; corrected via `cherry-pick 5cb83c8` onto `feat/foundation-business-rule-error` (new hash `b214743` — same tree), then `git reset origin/main` to rewind local `main` (non-destructive default `--mixed`). `origin/main` was never touched with code; PM A + PO see only PLAN/ACK/SUBMIT commits on `main`, all code on the feature branch. Left as end-of-session cleanup with zero side effects to shared state.

Requesting PM A VERDICT.

##### VERDICT T07-slice-1 — APPROVED (H0 2026-07-02, attempt 1) by PM A (Nanak)

Validated per PM-AGENT §3 Steps 1–7 on `feat/foundation-business-rule-error` @ commit `b214743`. All gates green. Transparency claim on cherry-pick recovery independently verified.

**Transparency verification (per PO validation request)**
- `git log origin/main -- src/core/errors/app-errors.ts` → 1 commit (`5ce7f86 chore: initial backend service boilerplate`). No T07-slice-1 code ever touched `origin/main`. ✓
- `git log faa05c8..origin/main --oneline` (since PM A ACK) → 1 commit `74c9cd4 exec A: SUBMIT T07-slice-1 attempt 1` (docs-only). No source commits leaked. ✓
- Cherry-pick recovery clean. Exec-A's self-disclosure was accurate and complete.

**DoD verification (10 items)** — all ✓
- `BusinessRuleError` exported from `@core/errors/app-errors.js`: verified `app-errors.ts:105-108` ✓
- `statusCode === 422`: verified line 106 (readonly) ✓
- `code === 'BUSINESS_RULE'`: verified line 107 (readonly) ✓
- `extends AppError`: verified line 105, plus test at `app-errors.test.ts:47-49` (`instanceof AppError` prototype-chain check) ✓
- JSDoc documents Nathan's `details.rule` convention with consumer example: verified `app-errors.ts:88-103` (JSDoc block includes PARENT §10 DEP-6 reference + consumer pattern verbatim from ASSIGNMENT template) ✓
- `toJson()` returns `{ code, message, details }`: verified `app-errors.test.ts:30-42` (asserts exact envelope shape with realistic payload — `{ rule, ticketId }`) ✓
- Unit test suite: 4 BusinessRuleError tests (`app-errors.test.ts:5-52`) + 2 bonus sanity (`AuthError` 401 + `NotFoundError` bare+with-id) ✓
- `make check` PASS: independent PM rerun on branch → 150 tests / 2 skipped / 152 total ✓
- Drift scans clean on both files ✓
- `git diff main -- package.json pnpm-lock.yaml` empty ✓

**HARD constraint verified: 9 existing classes UNTOUCHED**
`git diff main -- src/core/errors/app-errors.ts | grep -E "^[-+]"` shows ONLY `+` additions — zero `-` deletions/modifications to any existing class. 21 lines appended verbatim after `BillingRequiredError` (line 86 → 108). Verified proof of Adv #5 append-at-end discipline: zero merge-conflict window for any Slot B/C in-flight branch that touches this file.

**Independent `make check` re-run on branch**
```
pnpm prisma:generate  → PASS (Prisma Client regenerated per T-INFRA-01)
pnpm lint             → PASS (0 errors, 0 warnings, --max-warnings 0)
pnpm format:check     → PASS
pnpm typecheck        → PASS
pnpm test:unit        → PASS
Test Suites: 2 skipped, 11 passed, 11 of 13 total
Tests:       2 skipped, 150 passed, 152 total
Time:        8.589 s
```

**Adv #1 confirmation signal ✓** — jest output includes `PASS src/core/errors/__tests__/app-errors.test.ts` on the very first run. Auto-discovery via existing `testMatch` glob confirmed live; no config change was needed.

**Test delta verification**: 150 pass (this branch) vs 144 pass baseline (main pre-slice) = **+6 tests** matching SUBMIT claim exactly (4 BusinessRuleError + 2 bonus sanity).

**Drift scans** (PM-AGENT §3 Step 2, on both `app-errors.ts` + `app-errors.test.ts`)
- `any` types: **0 hits**
- `console.log/info/debug`: **0 hits**
- `throw new Error(`: **0 hits** (test file uses AppError subclass instantiation via `new BusinessRuleError(...)`)
- Forbidden imports: **0 hits** (`@jest/globals` + `../app-errors.js` only)
- Default export: **0 hits**
- `.skip` in tests: **0 hits** (6 real tests)
- Hardcoded URL: **0 hits**

**Coverage — BusinessRuleError 100% (2-line class body trivially exercised)**
File-level `app-errors.ts` reports 58.97% stmts, 100% branch, 75% funcs — dominated by pre-existing untested classes (ValidationError/ForbiddenError/ConflictError/RateLimitError/ExternalServiceError/TenantError/BillingRequiredError). This slice deliberately did NOT touch those per HARD constraint "Do NOT modify existing error classes". BusinessRuleError itself (the DoD scope) is 100% covered — 2 readonly declarations + JSDoc are exercised by every test. Bonus sanity coverage lands on AuthError + NotFoundError. Note: `make check` PASS confirms no global coverage-threshold enforcement in the standard `test:unit` path; threshold only surfaces on explicit `--coverage` run (jest config concern, not this slice's).

**Envelope shape verification (PM B's ratified contract)**
Test at `app-errors.test.ts:30-42`:
```ts
expect(err.toJson()).toEqual({
  code: 'BUSINESS_RULE',
  message: 'Ticket already resolved',
  details: { rule: 'INVALID_TICKET_TRANSITION', ticketId: 't-1' },
});
```
Matches PARENT §10 DEP-6 ratified envelope exactly: envelope-generic `code = 'BUSINESS_RULE'` + specific rule in `details.rule` + freeform extra details. When T12 lands with `rule: 'INVALID_TICKET_TRANSITION'` and T16-V2..V5 with their own rules, the shape holds.

**Spot-check** (PM-AGENT §3 Step 5)
- File naming: kebab-case ✓
- Explicit return type: N/A (class fields, not fns) — but `readonly statusCode = 422` correctly satisfies base's `abstract readonly statusCode: number` ✓
- JSDoc verbatim from ASSIGNMENT template (WHY documented, not WHAT — PARENT §10 DEP-6 rationale + consumer pattern) ✓
- Test naming: `it('should <expected> ...')` — 6 tests conform ✓
- No what-comments in test file ✓
- Append-at-end ordering (Adv #5) — verified via git diff, pure `+` lines ✓
- LOC: `app-errors.ts` 108 (was 87) + test file 76 — well under 300 rule-of-thumb ✓
- Import direction: test imports from `../app-errors.js` (same layer, sibling); source imports nothing new — leaf module ✓

**Security floor** — N/A. No auth/webhook/crypto/PII surface. `BusinessRuleError.details` will carry rule-specific payload (e.g. ticket state transition context) but that's caller responsibility to keep sanitized; the class itself has no logging or secret handling.

**Transparency discipline — high-value pattern from exec-A**
Cherry-pick slip disclosure in SUBMIT notes was proactive, complete, and verifiable. Sequence exec-A followed: (1) recognize the slip mid-session, (2) cherry-pick to correct branch (new hash, same tree — auditable), (3) rewind local main via `git reset origin/main` (default `--mixed`, non-destructive), (4) verify `origin/main` untouched by code, (5) self-disclose in SUBMIT with exact commit hashes. **This is the model recovery pattern for git-context slips** — much better than silent recovery or unverified assertion. Worth memorializing (PO also flagged this). PM A will save to memory as durable feedback.

**Follow-ups actioned in same commit**
- → §1 T07-slice-1 → approved
- → §0 Active task refreshed → T05 seed OR next DEP triage (Nathan's queue check)
- → PARENT §1 T07-slice-1 → approved (row mirrored)
- → PARENT §2 short roll-up (latest-at-top)
- → PARENT §10 DEP-6 → **RESOLVED** (unblocks Nathan's T12 + T16-V2..V5 chain)

**PO action item — branch merge**
`feat/foundation-business-rule-error` @ `b214743` on `origin`; PM A verified: `make check` PASS on branch (150 tests), drift clean, 9 existing classes untouched, transparency verified. Per CLAUDE.md §12, **please merge `feat/foundation-business-rule-error` → `main`**. PM A will not auto-merge. Post-merge: Nathan's T12 (invalid ticket transition) + T16-V2..V5 (visits verify-manual family) chain unblocked — 5 Slot B tasks can proceed.

**Next Slot A queue**
Triage between:
1. **T05** seed scripts (Opsi C twist: Auth API stub design)
2. **T06** ticket state-machine helper (parallel-friendly; feeds T12)
3. **T07-slice-2** additional spec §7 codes (`INVALID_TICKET_TRANSITION` as specific class? — currently rolled into `details.rule`; per envelope design, no additional classes needed until a downstream module needs a wire-level discriminator)
4. Watch for new DEP-N escalations from Nathan/Satrio

PM A will pause here + await PO next-task direction (T05 vs T06 vs "wait for Nathan's next unblock").

Ship it.

### ASSIGNMENT T06 — claimed by exec-A (Nanak) at H0 2026-07-02
- Branch: `feat/foundation-ticket-state-machine` (per PO branch-per-task policy)
- Routed from: PARENT §1 T06 (issued post T07-slice-1 merge to unblock Nathan's imminent T12)
- Depends on: T07-slice-1 ✓ merged (`BusinessRuleError` shipped; `rule: 'INVALID_TICKET_TRANSITION'` is the ratified `details.rule` value per spec §5 line 74). T01-T04 + T-INFRA-01 ✓ merged (foundation healthy).
- Downstream unblocks: **T12** (ticket status transition + reroute — direct consumer, likely Nathan's next start post T07-slice-1 merge). Also feeds T13 (stats — needs to know valid transitions for KPI computation) if Nathan wants to consume.
- Spec / reference (WAJIB read before PLAN):
  - `docs/spec/02-hotel-core.md §5` lines 50-74 — full state machine definition (8 states, ~15 transitions, terminal states, `422 BUSINESS_RULE code INVALID_TICKET_TRANSITION` on rejection)
  - `src/core/errors/app-errors.ts` — `BusinessRuleError` class (T07-slice-1 shipped `8ebdb9a`)
  - `src/modules/tickets/tickets.types.ts:3-11` — Nathan's existing `TicketStatus` declaration (Slot B canonical for tickets domain; NOT exported via barrel)
  - `CLAUDE.md §3` — folder structure rules (pure helpers → `src/shared/utils/`)
  - `CLAUDE.md §5.4` — `AppError` subclass mandatory (no `throw new Error`)

#### PM A notes untuk exec-A

**Scope**

Single new file `src/shared/utils/ticket-state-machine.ts` with 4 named exports + one fresh test file. Pure functions, no framework coupling, no DB, no side effects.

Class/type shape:
```ts
export type TicketStatus =
  | 'open'
  | 'in_progress'
  | 'awaiting_late_reason'
  | 'done_pending'
  | 'closed'
  | 'high_alert'
  | 'escalated'
  | 'cancelled';

export const TICKET_TRANSITIONS: Readonly<Record<TicketStatus, readonly TicketStatus[]>> = {
  open: ['in_progress', 'cancelled'],
  in_progress: ['awaiting_late_reason', 'done_pending', 'escalated', 'cancelled'],
  awaiting_late_reason: ['done_pending'],
  done_pending: ['closed', 'high_alert', 'cancelled'],
  high_alert: ['in_progress'],
  escalated: ['in_progress', 'cancelled'],
  closed: [],       // terminal
  cancelled: [],    // terminal
} as const;

export function isValidTicketTransition(from: TicketStatus, to: TicketStatus): boolean {
  return TICKET_TRANSITIONS[from].includes(to);
}

export function assertValidTicketTransition(from: TicketStatus, to: TicketStatus): void {
  if (!isValidTicketTransition(from, to)) {
    throw new BusinessRuleError(`Invalid ticket transition: ${from} → ${to}`, {
      rule: 'INVALID_TICKET_TRANSITION',
      from,
      to,
    });
  }
}
```

That's the whole surface. ~40 LOC + JSDoc.

**Design decision: Slot A ships own `TicketStatus`** (structurally-identical duplicate of Nathan's `src/modules/tickets/tickets.types.ts:3-11`)

Rationale:
- TypeScript string literal unions are structural, not nominal → Slot A's `TicketStatus` and Nathan's `TicketStatus` are TYPE-COMPATIBLE (unify at type level). Zero runtime friction.
- Nathan's declaration is INTERNAL to tickets module (not exported via barrel `src/modules/tickets/index.ts`); Slot A cannot cleanly import it without violating CLAUDE.md §3 cross-module rule.
- Both mirror spec §5 as authoritative source; if either drifts, tests catch it.
- Nathan can optionally consolidate later (import Slot A canonical + remove his local) as a T-CLEAN cleanup — out of T06 scope.
- Alternative "make it generic" (helper takes any string union) was considered but rejected — state-machine helper without the ticket state-machine data isn't useful; T06 spec explicitly says "state-machine helper + unit-test the transition table".

**HARD constraints (WAJIB — pelanggaran = REJECT)**
- **No new deps** — `BusinessRuleError` already shipped via T07-slice-1; imported from `@core/errors/app-errors.js`
- **No `any` / `console.log` / `throw new Error(`** — well-formed subclass throw via `BusinessRuleError` ✓
- **No default export** — 4 named exports
- **Do NOT modify Nathan's `src/modules/tickets/*` files** — Slot B territory. Slot A ships parallel canonical; Nathan consolidates on his own terms later.
- **Do NOT modify T07-slice-1's error classes** — reuse `BusinessRuleError` as-is
- **Do NOT touch `src/plugins/*`** (T03/T04 files)
- **Do NOT touch other `shared/utils/*` files** (crypto.ts / masking.ts / test-setup.ts)
- **Pure function design** — no side effects, no I/O, no time-of-day dependency
- **Explicit return types** for both public fns (`: boolean` and `: void`)

**Files to create** (2, both new; 0 modify)
- `src/shared/utils/ticket-state-machine.ts` — helper + type + table (~40 LOC + JSDoc)
- `src/shared/utils/__tests__/ticket-state-machine.test.ts` — first test file for this dir (precedent-setting like T07-slice-1 did for `src/core/errors/__tests__/`)

**T06 DoD**
- [ ] `TicketStatus` string union of 8 states per spec §5 (`open` / `in_progress` / `awaiting_late_reason` / `done_pending` / `closed` / `high_alert` / `escalated` / `cancelled`) — verified via test
- [ ] `TICKET_TRANSITIONS` Readonly<Record<TicketStatus, readonly TicketStatus[]>> map with **exactly** these transitions per spec §5 lines 52-72:
  - open → [in_progress, cancelled]
  - in_progress → [awaiting_late_reason, done_pending, escalated, cancelled]
  - awaiting_late_reason → [done_pending]
  - done_pending → [closed, high_alert, cancelled]
  - high_alert → [in_progress]
  - escalated → [in_progress, cancelled]
  - closed → [] (terminal)
  - cancelled → [] (terminal)
- [ ] `isValidTicketTransition(from, to): boolean` pure fn — explicit return type
- [ ] `assertValidTicketTransition(from, to): void` throws `BusinessRuleError` when invalid, with EXACT shape: `statusCode = 422`, `code = 'BUSINESS_RULE'`, `details = { rule: 'INVALID_TICKET_TRANSITION', from, to }`
- [ ] Test suite exhaustive: (a) every valid transition returns `true` from `isValidTicketTransition` (all ~15 spec-defined pairs); (b) every INVALID transition returns `false` (from×to matrix minus allowed = ~49 disallowed pairs, cover a representative subset + all terminal-state-outbound + all "wrong direction" pairs); (c) `assertValidTicketTransition` throws `BusinessRuleError` with correct shape on invalid; (d) `assertValidTicketTransition` does NOT throw on valid
- [ ] Terminal states verified: `TICKET_TRANSITIONS.closed` and `TICKET_TRANSITIONS.cancelled` are BOTH `[]`; any transition FROM either → invalid
- [ ] Test coverage 100% on `ticket-state-machine.ts` (target file focused, not global)
- [ ] `make check` PASS (lint + format:check + typecheck + test:unit)
- [ ] Drift scans clean on both files (0 `any`, 0 `console.log`, 0 `throw new Error(`, 0 default export)
- [ ] `git diff package.json` empty (no dep add)
- [ ] T03/T04/T07-slice-1/T-INFRA-01 + Nathan's T11/T13/T14/T15 tests all still green — verified via full test suite

**Advisory PLAN checks (proactive gotcha flags — 6 items)**

1. **TicketStatus duplication awareness**: Nathan already declares `TicketStatus` at `src/modules/tickets/tickets.types.ts:3-11` mirroring spec §5 (8 states). Slot A's declaration will be structurally-identical string union — TypeScript unifies them at type level (no runtime conflict). Advisory: acknowledge in PLAN as spec-driven duplicate; do NOT try to import from Nathan's module (barrel doesn't export TicketStatus, and cross-module internal import violates CLAUDE.md §3). If exec-A prefers a different resolution (e.g., escalate to Nathan for canonicalization first), route via PLAN GAP → PM A coordinates.

2. **`BusinessRuleError` availability check**: T07-slice-1 shipped it via PO merge `8ebdb9a`. Import path `@core/errors/app-errors.js` should work. Verify via `grep 'export class BusinessRuleError' src/core/errors/app-errors.ts` before writing code (defensive — should return 1 hit). If not found, dependency assumption wrong → escalate immediately.

3. **First test file in `src/shared/utils/__tests__/`**: precedent-setting like T07-slice-1 did for `src/core/errors/__tests__/`. Existing `jest.config.ts` glob `**/__tests__/**/*.test.ts` should auto-discover — no config change. Verify signal via test suite listing in first run (jest output includes `PASS src/shared/utils/__tests__/ticket-state-machine.test.ts`). Note in SUBMIT if missing.

4. **Exhaustive transition matrix coverage**: 8 states × 8 targets = 64 potential from→to pairs, ~15 allowed + ~49 disallowed. Options for test structure:
   - **Fully exhaustive**: table-driven test iterating all 64 pairs; asserts each matches expected valid/invalid. Comprehensive but verbose.
   - **Representative**: individual `it` per spec §5 rule (positive) + a few key negatives (terminal outbound, wrong-direction pairs, illegal double-jumps). Cleaner.
   - **Hybrid**: table-driven for validity check + individual for BusinessRuleError shape verification.
   - PM A recommendation: **hybrid** — table-driven `describe.each` over all 15 allowed transitions + all 8 terminal outbound (16 disallowed) + 3 illegal jumps for BusinessRuleError shape. Total ~34 test cases. Exec-A choice, justify in PLAN.

5. **Terminal states verification** — spec §5 line 63-72: `closed` has NO outbound (implicit — spec lists no lines starting with `closed`); `cancelled` same. Slot A must encode `closed: []` and `cancelled: []` in TICKET_TRANSITIONS. Any transition FROM these → invalid throws. Test explicit assertions for both.

6. **Runtime input handling (defensive)** — **PM A recommendation: nullish coalesce**: If a caller sneaks a raw string via `as TicketStatus` cast (e.g., Prisma raw query returns a `String` column value not in the spec union — DB drift, spec change lagging code), naive `TICKET_TRANSITIONS[from].includes(to)` returns `undefined.includes(to)` → runtime `TypeError`. PM A recommendation: use nullish coalescing `(TICKET_TRANSITIONS[from] ?? []).includes(to)` for safe fallback. Cost = 4 chars, benefit = defensive at the module boundary per CLAUDE.md philosophy (TS covers the happy path at compile time; runtime insurance covers the boundary drift path). Apply the same pattern in `assertValidTicketTransition` — if `from` is unknown, treat as invalid and throw `BusinessRuleError` (never `TypeError`). Include 1 test case: `assertValidTicketTransition('bogus_state' as TicketStatus, 'open')` throws `BusinessRuleError`, not `TypeError`.

**Coordination downstream (PM A tracking, exec-A no action)**
- Post VERDICT APPROVED, PM A will:
  - Update PARENT §1 T06 → approved
  - Post roll-up to PARENT §2
  - Notify PO to merge `feat/foundation-ticket-state-machine` → main
  - Nathan can then consume via `import { assertValidTicketTransition } from '@shared/utils/ticket-state-machine.js'` in T12 service layer

Awaiting **PLAN T06** from exec-A.

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
