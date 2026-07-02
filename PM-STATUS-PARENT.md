# PM-STATUS-PARENT — Qooma Backend (cross-dev roll-up)

> **Parent PM tracker.** Read-only buat Executor & PM A/B/C kecuali bagian roll-up yang explicit dipost oleh PM A/B/C. Parent PM authority untuk section §1, §3, §4, §5, §6, §7, §8. PM A/B/C append baris short ke §2 setelah tiap APPROVE (per `PM-AGENT.md §0.8`).
>
> Detail per-dev assignment (ASSIGNMENT → PLAN → SUBMIT → VERDICT) tinggal di **`PM-STATUS-A.md`** (Nathan), **`PM-STATUS-B.md`** (Nanak), **`PM-STATUS-C.md`** (Satrio).
>
> Komunikasi PO ↔ Parent PM ↔ PM A/B/C ↔ Executor semua via git-synced markdown. Tidak ada DM kecuali eskalasi formal (lihat §9).
>
> **Identity check**: setiap session WAJIB sebut role + slot di response pertama (lihat `KICKOFF.md §4`).

---

## 0. Current focus (global)

- **Day**: H12+ (post-Auth bootstrap; Hotel Core handover landed 2026-06-29)
- **Phase**: Bootstrap / pre-T01 — authoritative spec live di [`docs/spec/MVP-HOTEL-CORE-FIRST.md`](./docs/spec/MVP-HOTEL-CORE-FIRST.md) (Slice 2 of 3 backend MVP slices)
- **Active gate**: G1 — Boilerplate + Prisma schema ready (kriteria default `PM-AGENT.md §5`; PO konfirmasi)
- **Active devs**: **Permanent slot swap 2026-07-01** — Nanak = slot A (Foundation, T01–T10), Nathan = slot B (Core CRM, T11–T20) when onboard, Satrio = slot C unchanged (T21–T30). Approved by all 3 devs. See §4 deviation log.
- **Progress (global)**: 0 / 30 task assigned (T01–T03 + T11 + T21 active per below; T04–T10, T12–T20, T22–T30 backlog — Parent PM release per gate)
- **Reading order untuk fresh dev**: `KICKOFF.md` → `docs/SERVICE-CHARTER.md` → `docs/spec/MVP-HOTEL-CORE-FIRST.md` → `docs/spec/02-hotel-core.md` (full DDL + RBAC) → `docs/spec/data-model.md` → `docs/spec/open-questions.md` → claim task di §8 / §1a

> **H12 PO rulings baked in (2026-06-29)**: integrations CRUD MOVED → Integration repo (Q-OPS-03 resolved); Satrio's bucket retains WA-template Meta-callback only. Q-CONTRACT-25 + Q-OPS-06 NEW (Telegram per-dept write-through — see `docs/spec/open-questions.md`).

---

## 1. Global task tracker (Parent PM authority)

> Otoritas Parent PM untuk edit row in-place. Status: `backlog` | `assigned` | `wip` | `submit-pending` | `approved` | `rejected` | `escalated`.
>
> Setiap task **wajib** punya kolom **Slot** untuk routing ke PM A/B/C. ID `T##` di-issue oleh PO atau Parent PM dari §1a pre-G1 queue.

| T## | Title                                                                            | Slot | Owner   | Status   | Verified by | Notes                                              |
| --- | -------------------------------------------------------------------------------- | ---- | ------- | -------- | ----------- | -------------------------------------------------- |
| T01 | `make check` green dari boilerplate (lint + typecheck + format)                  | A    | Nanak   | approved | PM A (Nanak) | Fixed via env upgrade (Node 20+pnpm 9), ts-node@10 dep, tsconfig ts-node override — see PM-STATUS-A.md §2 |
| T02 | Prisma schema initial migration (13 HC tables + indexes per §2 DDL)              | A    | Nanak   | approved | PM A (Nanak) | Applied via 2 migrations (init + CHECK/partial-idx). DEV deviation: fresh `hotel_core_dev` DB (Opsi C) instead of shared `app` DB — see §4. UNBLOCKS T04–T30 impl (except tier-gated T26/T30 pending shared-DB restore) |
| T03 | Tenant-guard middleware (`hotel_id` from session everywhere)                     | A    | Nanak   | approved | PM A (Nanak) | 3 files: tenant-guard.ts pure fns + .types.ts req.tenant augmentation + test 14 pass. Wire as preHandler hook when JWT auth lands (T04+). Bonus: jest config alias+.js fix. |
| T04 | RBAC middleware + tenant-guard onRequest hooks factory (Option A bundle)         | A    | Nanak   | approved | PM A (Nanak) | ✅ APPROVED attempt 1 (2026-07-01). `feat/foundation-rbac` @ `df5648b` — **awaiting PO merge**. 5 files (rbac.ts + tenant-guard.hooks.ts factory + types augmentation of `@fastify/jwt` FastifyJWT + 2 tests). 28 tests pass, 100% coverage on new files, drift clean, T03's 14 tests preserved. **T11 seam FULLY unblocked** (see §10). Nathan wires `configureTenantGuardHooks(app)` in root scope. |
| T05 | Seed scripts (1 demo hotel via Auth API + 5 depts + sample menu + KB)            | A    | Nanak   | approved | PM A (Nanak) | ✅ APPROVED attempt 1 (2026-07-02 H0). `feat/foundation-seed-hotel-core` @ `cdd1ed5` — **awaiting PO merge**. S2 shipped (runtime Prisma upsert, own PrismaClient, env `SEED_HOTEL_ID`, deterministic UUIDs, `update:{}` no-op idempotency). Independent PM verify: 2-run idempotency + DB counts 1/5/3/10/6 + CHECK compliance (dept codes CON/HSK/FNB/ENG/FO match `^[A-Z]{2,8}$`) + Slot B compat (Nathan's testcontainer fixtures isolated + HSK/FO alignment as future-Satrio friction-reducer) + `make check` unchanged 160/1/161 + drift 0/6 + merge dry-run clean. Silent-ratification note routed to PM B via §10 for post-hoc awareness. |
| T06 | Ticket state-machine helper + unit-test the transition table                     | A    | Nanak   | approved+merged | PM A (Nanak) | ✅ APPROVED attempt 1 + **MERGED to main 2026-07-02 (PO commit `4f4a5d0`)**. 2 files (helper 61 LOC + test 137 LOC, 40 tests, 100% coverage). Envelope matches T07-slice-1 DEP-6 ratification. **T12 fully unblocked**. |
| T-INFRA-02 | Foundation: DEP-5 fix — add `userId: string` to `TenantContext` + `deriveTenantContext` | A    | Nanak   | approved+merged | PM A (Nanak) | ✅ APPROVED attempt 1 + **MERGED to main 2026-07-02 (PO commit `e95a23d`)**. Nathan Q-B-11 auto-resolved (T12 PLAN can use `ctx.userId` directly). T19 unblocked. PM B post-hoc ratification pending on next session read of §10 coord note. |
| T-INFRA-03 | Foundation: GAP-T11-3 fix — split `test:unit` from integration tests so `make check` stays Docker-free | A    | Nanak   | approved | PM A (Nanak) | ✅ APPROVED attempt 1 (2026-07-02 H0). `feat/foundation-testglob-split` @ `59b12cd` — **awaiting PO merge**. 1-line `package.json` script change. PM independent verified: test count trio (unit 160/1/161 in 0.532s + integration 31/1/32 + coverage 191/2/193 full baseline). Sum sanity 161+32=193 ✓. **~20x faster** test:unit portion of `make check` (0.532s vs ~11s baseline). Zero Docker/testcontainers in unit gate. Mitigation held (no 4th slip). GAP-T11-3 resolved. |
| T07 | Common error handlers (HC-specific codes per spec §7)                            | A    | Nanak   | backlog  | —           | After T01                                          |
| T08 | Multipart upload utility (S3 / R2 abstraction)                                   | A    | Nanak   | assigned | —           | Issued 2026-07-02 H0 post-T05 merge. Main-queue continuation per PO soft-priority guidance. Ships port + adapter per ADR-0001 (external IO required). Home: `src/core/storage/` (mirrors `src/core/http/` external-IO wrapper location pattern). Scope: object-storage port + S3Adapter (AWS SDK v3) + InMemoryAdapter for tests. **New dep**: `@aws-sdk/client-s3` — PO ratification required per CLAUDE.md §11 (flagged in ASSIGNMENT). Signed URLs deferred to T08-slice-2. |
| T09 | CSV import utility (used by menu + knowledge)                                    | A    | Nanak   | backlog  | —           | After T01                                          |
| T10 | Workers harness (cron + queue) — actual workers wired per B/C tasks              | A    | Nanak   | backlog  | —           | After T02                                          |
| T-INFRA-01 | Foundation: `make check` prisma-generate prereq + real Prisma client singleton (GAP-T11-1 fix) | A    | Nanak   | approved+merged | PM A (Nanak) | ✅ APPROVED attempt 1 (2026-07-02 H0) + **MERGED to main 2026-07-02 (PO commit `9a50c6d`)**. 2 files (Makefile 1-line + prisma-client.ts body rewrite). GAP-T11-1 resolved. Post-merge: exec-B can drop `pnpm prisma:generate` workaround. pnpm-store insight logged §10 for Satrio onboarding. |
| T07-slice-1 | Foundation: `BusinessRuleError` (422) — first slice of T07 error-handler build-out (DEP-6 fix) | A    | Nanak   | approved+merged | PM A (Nanak) | ✅ APPROVED attempt 1 + **MERGED to main 2026-07-02 (PO commit `8ebdb9a`)**. 2 files (app-errors.ts pure append + fresh test file, 6 new tests). Envelope: `code = 'BUSINESS_RULE'` + `details.rule`. §10 DEP-6 resolved. Consumed by T06 (transitively unblocks T12 + T16-V2..V5). |
| T11 | Tickets list + detail (GET endpoints + filters + cursor pagination)              | B    | Nathan  | **approved+merged** | PM B (Nathan) | ✅ APPROVED attempt 1 + **MERGED main PR #1 (`6c1e4e2`) 2026-07-01**. PM rerun: make check + integration 11 + coverage 96% + drift clean. Runtime gate: T04 (wip) wires `req.tenant` → live. |
| T12 | Ticket status transition + reroute (state-machine-validated)                     | B    | Nathan  | **approved+merged** | PM B (Nathan) | ✅ APPROVED + **MERGED main (PR #5 `3718e38`) 2026-07-02**. make check 173 (no-Docker) + coverage 96.68% + 422/403 negatives + race-check. |
| T13 | Ticket stats + overdue                                                           | B    | Nathan  | **approved+merged** | PM B (Nathan) | ✅ APPROVED attempt 1 + **MERGED to main** 2026-07-01. PM rerun: make check 93 + integration 17 + coverage 96.66% + drift + T11 regression green. `is_overdue` SSOT coherence verified. |
| T14 | Guests CRUD + preferences                                                        | B    | Nathan  | **approved+merged** | PM B (Nathan) | ✅ APPROVED + **MERGED main (PR #3 `ab4c113`) 2026-07-02**. make check 131 + coverage 97.95% + drift clean. Unblocks T15. |
| T15 | Guest messages history                                                           | B    | Nathan  | **approved+merged** | PM B (Nathan) | ✅ APPROVED + **MERGED main (PR #4 `64db2a9`) 2026-07-02**. make check 144 + coverage 97.46% + drift clean. |
| T16 | Visits list + pending verification flow                                          | B    | Nathan  | **approved+merged** | PM B (Nathan) | ✅ APPROVED (full V1–V6) + **MERGED main (PR #6 `4cd6851`) 2026-07-02**. make check 205 + coverage 98.01%. Unblocks T17+T18. |
| T17 | Visit reject + failed_3x override                                                | B    | Nathan  | **approved+merged** | PM B (Nathan) | ✅ APPROVED + **MERGED main (PR #7 `9afde4f`) 2026-07-02**. make check 219 + coverage 96.48% + T16 regression clean. Unblocks T18. |
| T18 | Manual visit create                                                              | B    | Nathan  | approved | PM B (Nathan) | ✅ APPROVED attempt 1 (2026-07-02). PM rerun: make check 230 (no-Docker) + coverage 96.84% + drift clean + merge dry-run CLEAN + T16/T17 regression clean. `feat/visits-manual-create` @ `cccf28b` → **awaiting PO merge**. Completes visits module. |
| T19 | Notifications CRUD + optimistic ops                                              | B    | Nathan  | assigned | —           | **UNBLOCKED 2026-07-02** — DEP-5 (T-INFRA-02 `e95a23d`) merged; `ctx.userId` now on `TenantContext`. Ready for PLAN. `feat/notifications-crud`. |
| T20 | Socket emitters (`ticket:*` + `verification:*` + `notification:new`)             | B    | Nathan  | backlog  | —           | After T11 + T16 + T19                              |
| T21 | Departments CRUD (escalation tree + operating hours)                             | C    | Satrio  | assigned | —           | Spec reading + module skeleton OK; impl blocked on T02 |
| T22 | Menu CRUD + categories + multipart image                                         | C    | Satrio  | backlog  | —           | After T02 + T08                                    |
| T23 | Menu bulk ops (CSV + bulk availability)                                          | C    | Satrio  | backlog  | —           | After T22 + T09                                    |
| T24 | Knowledge CRUD + CSV import                                                      | C    | Satrio  | backlog  | —           | After T02 + T09                                    |
| T25 | WA templates lifecycle + Meta-callback ingest                                    | C    | Satrio  | backlog  | —           | After T02                                          |
| T26 | Feature flags (tier-gated, dependency check)                                     | C    | Satrio  | backlog  | —           | After T02; needs Auth `hotels.tier_id` join        |
| T27 | Billing (overview + upgrade + invoice + daily brief)                             | C    | Satrio  | backlog  | —           | After T02                                          |
| T28 | Settings/agents config (min-3 enforcement)                                       | C    | Satrio  | backlog  | —           | After T02                                          |
| T29 | Settings/voice groundwork stub                                                   | C    | Satrio  | backlog  | —           | After T02                                          |
| T30 | Analytics 8 endpoints (Luxury-gated + export)                                    | C    | Satrio  | backlog  | —           | After T02; tier-join required                      |

### 1a. Pre-G1 bootstrap queue (MIRRORED into §1 on 2026-06-29 — kept here as spec-driven reference; §1 is the live tracker)

| Suggested T## | Title                                                                    | Slot | Spec ref                                          |
| ------------- | ------------------------------------------------------------------------ | ---- | ------------------------------------------------- |
| T01           | `make check` green dari boilerplate (lint + typecheck + format)          | A    | F1 prep                                           |
| T02           | Prisma schema initial migration (13 HC tables + indexes)                 | A    | F1 — `docs/spec/02-hotel-core.md` §2 DDL          |
| T03           | Tenant-guard middleware (`hotel_id` from session everywhere)             | A    | F2                                                |
| T04           | RBAC middleware (gm_admin / dept_head / super_admin all-access)          | A    | F3                                                |
| T05           | Seed scripts (1 demo hotel via Auth API + 5 depts + sample menu + KB)    | A    | F4                                                |
| T06           | Ticket state-machine helper + unit-test the transition table             | A    | F5                                                |
| T07           | Common error handlers (HC-specific codes per spec §7)                    | A    | F6                                                |
| T08           | Multipart upload utility (S3 / R2 abstraction)                           | A    | F7                                                |
| T09           | CSV import utility (used by menu + knowledge)                            | A    | F8                                                |
| T10           | Workers harness (cron + queue) — actual workers wired per B/C tasks      | A    | F8 follow-up                                      |
| T11           | Tickets list + detail (GET endpoints + filters + cursor pagination)      | B    | B1                                                |
| T12           | Ticket status transition + reroute (state-machine-validated)             | B    | B2                                                |
| T13           | Ticket stats + overdue                                                   | B    | B3                                                |
| T14           | Guests CRUD + preferences                                                | B    | B4                                                |
| T15           | Guest messages history                                                   | B    | B5                                                |
| T16           | Visits list + pending verification flow                                  | B    | B6                                                |
| T17           | Visit reject + failed_3x override                                        | B    | B7                                                |
| T18           | Manual visit create                                                      | B    | B8                                                |
| T19           | Notifications CRUD + optimistic ops                                      | B    | B9                                                |
| T20           | Socket emitters (`ticket:*` + `verification:*` + `notification:new`)     | B    | B10                                               |
| T21           | Departments CRUD (escalation tree + operating hours)                     | C    | C1                                                |
| T22           | Menu CRUD + categories + multipart image                                 | C    | C2                                                |
| T23           | Menu bulk ops (CSV + bulk availability)                                  | C    | C3                                                |
| T24           | Knowledge CRUD + CSV import                                              | C    | C4                                                |
| T25           | WA templates lifecycle + Meta-callback ingest                            | C    | C5                                                |
| T26           | Feature flags (tier-gated, dependency check)                             | C    | C6                                                |
| T27           | Billing (overview + upgrade + invoice + daily brief)                     | C    | C7                                                |
| T28           | Settings/agents config (min-3 enforcement)                               | C    | C8                                                |
| T29           | Settings/voice groundwork stub                                           | C    | C9                                                |
| T30           | Analytics 8 endpoints (Luxury-gated + export)                            | C    | C10                                               |

---

## 2. Per-dev short-status roll-up (PM A/B/C append, latest di atas)

> Setiap PM A/B/C post **1-2 baris** summary ke sini setelah tiap VERDICT atau end-of-session. Parent PM scan ini untuk daily report. JANGAN paste full SUBMIT/VERDICT di sini — itu tetap di PM-STATUS-{slot}.md.
>
> Format:
> ```
> [YYYY-MM-DD H{N}] [PM <SLOT> <NAME>] <T## status — 1 liner>
> ```

[2026-07-02 H0] [PM A Nanak] **T05 (seed scripts, S2 silent-ratification) APPROVED attempt 1** — `feat/foundation-seed-hotel-core` @ `cdd1ed5`. 1 file (`prisma/seeds/index.ts` stub → 257-LOC real S2 impl). PM independent DB-level verify: **1st run 1.946s** + **2nd run 0.586s idempotent** (3.3× faster on no-op upserts), row counts exactly `1 hotel / 5 depts / 3 categories / 10 items / 6 KB` via psql. CHECK constraint pre-PLAN grep prevented what would have been a REJECT-SUBMIT (dept codes `^[A-Z]{2,8}$` — CON/HSK/FNB/ENG/FO all comply). Own PrismaClient design held (line 29 `import` + line 186 `new`; 1 JSDoc rationale mention only). `make check` unchanged 160/1/161. Drift 0/6. Merge dry-run clean. **Silent-ratification note routed to PM B** via §10 (post-hoc awareness — no override expected, HSK+FO codes aligned with his testcontainer fixtures as friction-reducer). **Two durable-pattern mitigations held**: (a) branch-slip mitigation 2nd consecutive task not recurring, (b) verify-before-act **strongest efficacy datapoint yet** (6 advisories → 6 pre-PLAN verifications → 0 REJECT-PLAN → clean SUBMIT). Slot A **10 approved**. **PO merge please**.
[2026-07-02 H0] [PM A Nanak] **T-INFRA-03 (GAP-T11-3 test-glob split) APPROVED attempt 1** — `feat/foundation-testglob-split` @ `59b12cd`. 1-line `package.json` script change. PM independent verified: test count trio (unit **160/1/161 in 0.532s** + integration 31/1/32 + coverage 191/2/193 full baseline), sum sanity clean, **~20x faster** `test:unit` portion of `make check` (0.532s vs ~11s baseline), zero Docker/testcontainers in unit gate (independent `--listTests` confirms 11 unit + 0 integration leaked). GAP-T11-3 resolved. **Mitigation efficacy datapoint** — `git branch --show-current` pre-commit verify from `feedback_git_slip_transparency.md` HELD, no 4th slip recurrence. First evidence memorialized mitigation works. Adv #5 (CI implications) + Adv #6 (dev-flow guidance) surfaced as **T-INFRA-04 candidate** + **docs/TESTING.md update** in §10 for PO/PARENT decision. Slot A 9/10 approved. **PO merge please**.
[2026-07-02 H0] [PM A Nanak] **T-INFRA-02 (DEP-5 fix, `TenantContext.userId` required) APPROVED attempt 1** — `feat/foundation-userid-tenant-context` @ `d0a0bcc`. Cross-slot PR: 10 files (3 Slot A source/test + 7 Slot B test fixtures via PM A GAP-1 **Path B scope override** — type-breaking cross-slot cannot cleanly sequence, rationale in §10 coord note). PM independent validation on branch: `make check` PASS 191/193 (190 baseline + 1 new), all 7 Nathan Slot B suites green (guardrail #3), 100% coverage on `tenant-guard.ts`, drift 0/6 on all 10 files, `git diff` verified zero non-test Slot B files touched (guardrail #1), sample-check confirmed mechanical fixture defaults matching per-file convention (USER_1 constant reuse in tickets integration + inline 'u-1' in guests integration, guardrail #2), commit body clean `=== Slot A ===`/`=== Slot B ===` sections (guardrail #4). Nathan self-corrected his DEP-5 misclaim in `438664d` — cross-team hygiene clean. **DEP-5 RESOLVED** — T19 + T12 `actor_user_id` (Q-B-11) unblocked post-merge. Transparency clean (3rd branch-slip instance + adopted mitigation: `git branch --show-current` verify before code commit). Slot A 8/10 approved. **PO merge please**. **PM B — Path B ratification pending via PARENT §10 read on next session** (fixture values are placeholders; welcome to rename in future PR — zero breakage since userId now required + any string satisfies TS).
[2026-07-02 H0] [PM A Nanak] **T06 (ticket state-machine helper) APPROVED attempt 1** — `feat/foundation-ticket-state-machine` @ `0e6d211`. PM independent validation on branch: `make check` PASS 190/192 (150 baseline + 40 new), 100% coverage on `ticket-state-machine.ts` (targeted rerun), drift 0/7 clean, `git diff package.json` empty, all Slot B tests preserved (T11/T13/T14/T15 all green in run). Adv #6 nullish coalesce **independently verified as `noUncheckedIndexedAccess: true` TS-level requirement** (tsconfig.json:29) — not just runtime defense but load-bearing compile constraint. Envelope shape matches T07-slice-1 DEP-6 ratification (BUSINESS_RULE + details.rule = 'INVALID_TICKET_TRANSITION' per spec §5 line 74). Cherry-pick transparency verified (2nd instance of the pattern — memorializing to memory). **Nathan T12 chain fully unblocked** post-merge — `import { assertValidTicketTransition } from '@shared/utils/ticket-state-machine.js'`. Slot A 7/10 approved. **PO merge please**.
[2026-07-02 H0] [PM A Nanak] **T07-slice-1 (`BusinessRuleError` 422, DEP-6 fix) APPROVED attempt 1** — `feat/foundation-business-rule-error` @ `b214743`. Independent PM validation: `make check` PASS on branch (150 tests, +6 vs baseline), drift 0/7, `git diff` verified 9 existing error classes untouched (pure `+` append per Adv #5 discipline). Envelope shape verified via test — matches PM B ratified (`code=BUSINESS_RULE` + `details.rule`). Adv #1 (jest globbing) confirmed live via test suite auto-discovery in first run. **DEP-6 → resolved** — unblocks Nathan's **T12 + T16-V2..V5 chain (5 Slot B tasks)** post-merge. Cherry-pick transparency verified: `origin/main` app-errors.ts history stops at initial boilerplate, only docs commits reached main since ACK. Exec-A's proactive self-disclosure on branch-context slip = model recovery pattern (worth memorializing). Slot A 6/10 approved. **PO merge please**.
[2026-07-02 H0] [PM A Nanak] **T-INFRA-01 (GAP-T11-1 foundation fix) APPROVED attempt 1** — `feat/foundation-prisma-ci` @ `583d324`. PM independent fresh-checkout acceptance on **simulated post-merge state** (main + T13/T14/T15 + T-INFRA-01): **144 tests pass** (2 skipped), drift clean, `git diff package.json` empty, ADR-0001 compliance verified (raw `PrismaClient`, no wrap). Adv-#1 fallback not triggered (grep-confirmed T11-T15 use type-only imports + constructor injection). §3b GAP-T11-1 → resolved. pnpm-store insight (isolated node-linker, no postinstall on `--frozen-lockfile`) mirrored to §10 for Satrio onboarding. **PO merge please** → post-merge exec-B drops the pre-run `pnpm prisma:generate` workaround. **Awareness**: DEP-6 (`BusinessRuleError` from PM B §3b, T16-V2..5 + T12 blocker) noted — will triage priority vs T05 seed scripts before next ASSIGNMENT. Slot A 5/10 approved.
[2026-07-01 H12] [PM A Nanak] **T04 RBAC + tenant-guard hooks factory APPROVED (attempt 1)** — PM validated per §3 Steps 1–7 on `feat/foundation-rbac` @ `df5648b`: `make check` green (independent rerun), 28 tests pass (14 T03 preserved + 11 rbac + 3 hooks), 100% coverage on `rbac.ts` + `tenant-guard.hooks.ts`, drift 0/7 clean, both REJECT-PLAN fixes verified (factory fn avoids encapsulation ✓, `FastifyJWT` augmentation avoids `FastifyRequest.user` collision ✓). **T11 seam FULLY unblocked** — once PO merges, Nathan wires `configureTenantGuardHooks(app)` root-scope to flip T11/T13 routes 401→live. Q-B-02 resolution strengthened with Slot A ratification (§3c). §10 coord note now FULLY RESOLVED. **Next: T-INFRA-PRISMA-CI** (GAP-T11-1 foundation fix per §3b). Slot A 4/10 approved.
[2026-07-02 H14] [PM B Nathan] **T18 (manual visit create) APPROVED attempt 1** — PM rerun: make check 230 no-Docker, coverage 96.84%, drift clean, merge dry-run CLEAN, T16/T17 regression clean (visits 80 tests), guest-guard cross-tenant 404 no-create. → PO merge `feat/visits-manual-create`. **Visits module complete (T16+T17+T18).** Slot B 8/10 pending merge. Remaining: T19 (notifications), T20 (socket).
[2026-07-02 H14] [PM B Nathan] **T17 MERGED** (PR #7) → **Slot B 7/10 merged**. **T18 issued** (manual visit create, completes visits trio). Remaining: T18 (wip), T19 (notifications ready), T20 (←T19).
[2026-07-02 H14] [PM B Nathan] **T17 (visit reject + failed_3x override) APPROVED attempt 1** — PM rerun: make check 219 no-Docker, coverage 96.48%, drift clean, merge dry-run CLEAN, **T16 regression clean** (visits suite 65 tests via generalized transition map). → PO merge `feat/visits-reject-override`. **Unblocks T18.** Slot B 7/10 pending merge.
[2026-07-02 H14] [PM B Nathan] **T16 MERGED** (PR #6) → **Slot B 6/10 merged** (T11,T13,T14,T15,T12,T16). Going one-at-a-time. **T17 issued** (visit reject + failed_3x override, extends `visits/`). Remaining: T17 (wip), T18 (visits, after T17), T19 (ready), T20 (←T19).
[2026-07-02 H14] [PM B Nathan] **T16 (visits verify-manual) APPROVED attempt 1** (full V1–V6) — PM rerun: make check 205 no-Docker, coverage 98.01%, drift clean, merge dry-run CLEAN, tx atomicity + 422/404 no-mutate, checkout-TZ seam. Branch rebased cleanly (was 56 behind). → PO merge `feat/visits-list-verify`. **Visits module complete → unblocks T17 + T18.** Slot B 6/10 pending merge.
[2026-07-02 H14] [PM B Nathan] **T12 MERGED** (PR #5) → **Slot B 5/10 merged** (T11,T13,T14,T15,T12). Next: T16 resume V2–V5 (branch 56 behind → rebase first). Then T19 (ready), T17/T18 (←T16), T20 (←T16+T19).
[2026-07-02 H14] [PM B Nathan] **T12 (transition + reroute) APPROVED attempt 1** — PM rerun: make check 173 in 2.5s (no-Docker ✓ GAP-T11-3), coverage 96.68%, drift clean, merge dry-run into latest main CLEAN, negative tests 422 (invalid transition, no audit) + 403 (dept_head reroute), optimistic-concurrency race-check. → PO merge `feat/tickets-transition`. **Slot B 5/10 done pending merge.** Remaining: T16 (resume), T19 (ready), then T17/T18/T20.
[2026-07-02 H14] [PM B Nathan] **T12 PLAN ACK'd → wip.** DEP-5 (T-INFRA-02) + GAP-T11-3 (T-INFRA-03) both observed MERGED → **T19 now unblocked**, `make check` no-Docker, prisma-gen workaround dropped. Q-B-11 ruled (a): use `ctx.userId` (DEP-5 landed). Ratified T-INFRA-02's fixture edits to Slot-B test files (PM A's "PM B ratify pending" → done). **All Slot-B impl blockers cleared** (only DEP-4 go-live remains). Active: T12, T16 (resume), T19 (ready).
[2026-07-02 H14] [PM B Nathan] **CORRECTION + unblocks.** Re-verified main precisely: ✅ DEP-6 (`BusinessRuleError`) + T06 (state-machine) + T-INFRA-01 (prisma real) all MERGED → **T12 issued + T16-V2..5 resumed** (nudged). ⚠ **My H13 "DEP-5 shipped → T19 unblocked" was INACCURATE** (grep matched `SessionUser.userId`, not `TenantContext`) — thanks PM A for the catch. **DEP-5 still open** (T-INFRA-02) → T19 still blocked, AND it now also soft-blocks T12's `actor_user_id` (Q-B-11). Please prioritize T-INFRA-02. Slot B active: T12 (PLAN), T16 (resume).
[2026-07-02 H13] [PM B Nathan] **T15 MERGED** (PR #4) → **Slot B 4/10 merged** (T11,T13,T14,T15). Open work: T19 ready (DEP-5 landed, awaiting PLAN); T16 V1 on branch, V2–V5 + T12 still blocked on **DEP-6** (`BusinessRuleError`, Slot A) — now the single remaining Slot-B blocker.
[2026-07-02 H0 PM A correction annotation] The line below claims "DEP-5 observed SHIPPED by Slot A (`ctx.userId` on `TenantContext`)" — PM A independent read of `src/plugins/tenant-guard.ts:22-27` verified this was inaccurate. Nathan likely conflated `SessionUser.userId` (existed since T03) with `TenantContext.userId` (never landed until T-INFRA-02 which is currently in PLAN stage). Exec-A's Adv #4 grep `-rn "tenant\.userId" src/` = 0 hits corroborates: no Slot B code was relying on `tenant.userId`. Original claim preserved unedited for audit; T-INFRA-02 is the actual DEP-5 fix. Documented as coordination hygiene, not blame — future readers see the incident + verification workflow.
[2026-07-02 H13] [PM B Nathan] **T15 (guest messages) APPROVED attempt 1** — PM rerun: make check 144, coverage 97.46%, drift clean, merge dry-run CLEAN → PO merge `feat/guest-messages`. **DEP-5 observed SHIPPED by Slot A** (`ctx.userId` on `TenantContext`) → **T19 unblocked** (ready for PLAN). Still open: **DEP-6** (`BusinessRuleError` → T16-V2..5 + T12). Slot B: 3 merged + T15 approved-pending-merge.
[2026-07-02 H13] [PM B Nathan] **T14 MERGED** (PR #3 `ab4c113`) → **Slot B 3/10 merged** (T11, T13, T14). T15 (guest messages) unblocked + issued. **Bottleneck = Slot A**: DEP-5 (`ctx.userId`) + DEP-6 (`BusinessRuleError`) still open, blocking T19 + T16-V2..5 + T12. Slot B productive path meanwhile = T15.
[2026-07-02 H13] [PM B Nathan] **T14 (guests) APPROVED attempt 1** — PM rerun: make check 131, coverage 97.95%, drift clean, merge-into-main dry-run CLEAN → **PO merge `feat/guests-crud` FIRST**. **T16 (visits) partial**: V1 read-path green on branch; V2–V5 blocked on **DEP-6** (`BusinessRuleError(422)` missing, foundation — also blocks T12; escalated §3b/§10). GAP T16-#4 ruled (envelope `BUSINESS_RULE` + `details.rule`). Slot B: 2 merged + 1 approved-pending-merge.
[2026-07-02 H13] [PM B Nathan] **T13 MERGED** to main. **Parallel batch OPENED**: T14 (guests) ∥ T16 (visits) issued (Q-B-05 Visit shape ratified → no collision) + T19 (notifications) issued but ⛔ blocked on **DEP-5** (`TenantContext.userId`, escalated to Slot A §3b/§10). Multi-executor mode; each T = own branch/thread, verified independently. Progress board live in PM-STATUS-B §0a. **Slot B 2/10 merged.**
[2026-07-01 H12] [PM B Nathan] **T13 Ticket stats+overdue APPROVED (attempt 1)** — PM rerun: make check 93, integration 17, coverage 96.66%, drift clean, **T11 regression green**. `is_overdue` SSOT coherence fix verified across 4 sites (the T13-ACK requirement). Code `feat/tickets-stats-overdue` @ `3a6af90` → awaiting PO merge. **T04 observed MERGED to main** → `req.tenant` seam live; only DEP-4 (api.ts bootstrap) left for go-live. Next: T14 (guests) issued. **Slot B 2/10 approved.**
[2026-07-01 H12] [PM B Nathan] **T11 MERGED to main** (PR #1 `6c1e4e2`) — first Core CRM surface live on main. T13 (stats+overdue) awaiting exec-B PLAN. Observed: T04 (RBAC, Slot A) now wip → will flip T11/T13 routes from 401 to live on merge. Slot B 1/10 approved+merged.
[2026-07-01 H12] [PM B Nathan] **T11 Tickets list+detail APPROVED (attempt 1)** — PM rerun verified: `make check` green, integration 11 pass (testcontainers), coverage 96% lines, drift clean, 0 rejects. Code on `feat/tickets-list-detail` @ `550e9ef` → **awaiting PO merge** (runtime-gated on T04 preHandler; routes 401 until then). GAP T11-#2 approved (approach A). New GAP T11-#3 (test:unit collects integration → make check needs Docker) escalated §3b. **Next: T13 issued.** Slot B 1/10 approved.
[2026-07-01 H12] [PM B Nathan] T11 PLAN ACK'd → wip (`feat/tickets-list-detail`). Q-B-01 resolved from in-repo spec (`README §2.7`, no PO needed); Q-B-02 resolved (T03 `TenantContext` Slot-A-owned). New: **GAP-T11-1** (prisma-generate⇄`make check` CI gap, foundation) → §3b/§10 for Slot A. T11 merge now gated only on **T04** preHandler wiring.
[2026-07-01 H12] [PM B Nathan] Online. Last approved: none (slot B first activity). Active: T11 ASSIGNMENT issued (tickets list+detail), awaiting exec-B PLAN. Next-up: T12–T20. Open Qs: 2 (Q-B-01 contract envelope escalated §3a; Q-B-02 session-context shape §3c). ⚠ T11 merge-blocked on Slot A T03/T04 seam — see PARENT §10.
[2026-07-01 H0] [PM A Nanak] T03 tenant-guard APPROVED (attempt 1) — 3 files (tenant-guard.ts + .types.ts + test 14 pass) + bonus jest config alias+.js fix. Pure fn approach; wire as Fastify preHandler when JWT plugin lands. ⚠ Nathan flag T11 merge-blocked on this + T04 (see §10) — plan T04 next.
[2026-07-01 H0] [PM A Nanak covering] T02 Prisma init migration APPROVED (attempt 1) — 18 HC tables + 19 CHECK + 11 partial/GIN indexes applied. DEV Opsi C deviation (fresh `hotel_core_dev` DB) logged in §4. UNBLOCKS T03–T30 impl chain (except T26/T30 tier-gated features pending Opsi A restore).
[2026-07-01 H0] [PM A Nanak covering] T01 boilerplate `make check` APPROVED (attempt 1) — env upgraded Node 20/pnpm 9, ts-node@10 added, tsconfig ts-node override for jest config parser. All 4 gates green.

<!-- TEMPLATE:
[2026-06-25 H3] [PM A Nathan] T01 boilerplate scaffold APPROVED (attempt 2) — make check green, 0 drift hits.
[2026-06-25 H3] [PM B Nanak]  T02 auth module wip — PLAN ACK'd, executor implementing JWT issuance.
[2026-06-25 H3] [PM C Satrio] T03 webhook plugin REJECT (attempt 1) — HMAC verify di middle of handler, harus plugin-level.
-->

---

## 3. Open questions register (consolidated)

> Parent PM consolidate dari PM A/B/C. PM A/B/C juga boleh edit row mereka sendiri (status update). Resolve = PO action.

### 3a. Contract questions (target: resolved sebelum G2; frozen setelah G3)

| ID            | Question | Raised by | Source         | Status | Resolution |
| ------------- | -------- | --------- | -------------- | ------ | ---------- |
| Q-B-01        | Canonical response envelope for tickets list/detail (pagination wrapper, cursor field name, JSON casing). `docs/API-CONTRACT.md §2.2` cited by MVP brief but absent from repo. | PM B (Nathan) | T11 · MVP §1.2/§6 | **resolved (in-repo spec) 2026-07-01** | Canonical shape lives at `docs/spec/README.md §2.7` (list `{data,pageInfo:{nextCursor,hasMore}}`) + §2.3 (error). PM B ratified camelCase envelope + snake_case resource fields (§2.6 imposes no global casing). Provisional on FE MSW tiebreaker; serializer-isolated. **No PO action needed** unless FE MSW diverges. |
| Q-B-03        | Stats shape for `GET /api/tickets/stats` — unpinned in specs (§1.2/§1.11 = "counts by status" only). | PM B (Nathan) | T13 · MVP §1.2 B3 | **resolved (provisional) 2026-07-01** | PM B ratified `{data:{by_status{8}, total, overdue, high_alert_count}}` — `high_alert_count` disambiguates the status-vs-flag collision. Provisional on FE MSW (absent); serializer-isolated. **No PO action** unless FE MSW diverges. |

### 3b. Package / tooling questions

| ID            | Question | Raised by | Source         | Status | Resolution |
| ------------- | -------- | --------- | -------------- | ------ | ---------- |
| GAP-T11-1     | `make check` (`Makefile:148`) has no `prisma-generate` prereq; `core/prisma/prisma-client.ts:29` is a `{}` stub. Once any B/C module imports the generated `PrismaClient`, CI `make check` fails typecheck on fresh checkout unless generate runs first. **Affects every task that touches Prisma (B + C).** | PM B (Nathan) | T11 | **resolved 2026-07-02 H0 by T-INFRA-01** | Fixed via T-INFRA-01 (PM A APPROVED `feat/foundation-prisma-ci` @ `583d324` — awaiting PO merge). PM independent fresh-checkout acceptance on simulated post-merge state PASS (144 tests). Post-merge: exec-B drops the pre-run `pnpm prisma:generate` workaround. pnpm-store behavior note in §10. |
| GAP-T11-3     | `package.json` `test:unit` glob `__tests__/.*\.test\.ts` also collects `*.integration.test.ts` (subset) → `make check` now spins Docker/testcontainers. Global `test-setup.ts` harness still a stub. **Affects every slot's `make check` as integration tests land.** | PM B (Nathan) | T11 | **RESOLVED 2026-07-02 H0 via T-INFRA-03** (`feat/foundation-testglob-split` @ `59b12cd`, PM A APPROVED — awaiting PO merge). 1-line `package.json` script edit adds `--testPathIgnorePatterns` to `test:unit`. Post-merge: `make check` runs 160 unit tests in 0.532s (was 191 in ~11s = ~20x faster), Docker-free. `test:integration` and `test:coverage` unchanged. Follow-up T-INFRA-04 candidate (CI check-full strategy) tracked in §10. |
| DEP-5         | `TenantContext` (`tenant-guard.ts:22-26`) has **no `userId`** — `SessionUser.userId` exists but `deriveTenantContext` drops it. **Blocks T19** (notifications scope by `user_id`) + any future per-user endpoint. | PM B (Nathan) | T19 · §2.5 | **RESOLVED 2026-07-02 H0 via T-INFRA-02** (`feat/foundation-userid-tenant-context` @ `d0a0bcc`, PM A APPROVED — awaiting PO merge). `TenantContext.userId: string` (REQUIRED) shipped + `deriveTenantContext` copies it. Cross-slot PR: 10 files (3 Slot A + 7 Slot B test fixtures per Path B scope override, see §10 coord note for rationale). Post-merge: T19 unblocked + T12 `actor_user_id` (Q-B-11) resolved. |
| DEP-6         | `core/errors/app-errors.ts` has **no 422 class** (409→429). Needed for `422 BUSINESS_RULE` on invalid state transitions. **Blocks T16-V2..5 (visits verify) AND T12 (ticket transition)** — shared. `core/*` out-of-scope for B. | PM B (Nathan) | T16/T12 · §7 | **RESOLVED 2026-07-02 H0 via T07-slice-1** (`feat/foundation-business-rule-error` @ `b214743`, PM A APPROVED — awaiting PO merge). `BusinessRuleError` class shipped per PM B's ratified envelope: `statusCode = 422`, `code = 'BUSINESS_RULE'`, `details.rule` carries specific rule identifier (e.g. `INVALID_TICKET_TRANSITION`, `PENDING_VERIFICATION_ONLY`). Post-merge: T12 + T16-V2..V5 chain unblocked. |

### 3c. Architecture / planning questions

| ID            | Question | Raised by | Source         | Status | Resolution |
| ------------- | -------- | --------- | -------------- | ------ | ---------- |
| Q-B-02        | `SessionContext` — Slot-A-owned shared type, or per-module? Slot B T11 consumes it as a seam now; needs a single owner to avoid divergence across B/C. | PM B (Nathan) | T11 · MVP §4.1 | **resolved 2026-07-01 (Slot A ratified via T04)** | T03 (`9b55b86`) shipped `TenantContext` as Slot-A-owned at `src/plugins/tenant-guard.ts`. T04 (`df5648b`) ratifies: `rbac.ts` consumes `SessionRole` + `TenantContext` from same path; `tenant-guard.hooks.ts` factory populates `req.tenant` from `req.user: SessionUser`. Canonical paths (Slot A authoritative): `SessionUser` / `SessionRole` / `TenantContext` at `src/plugins/tenant-guard.ts` — B/C import via `@plugins/tenant-guard.js`. No per-module seam, no `shared/types/` migration. |
| Q-B-09        | Visits audit table: add `visit_updates` (like `ticket_updates`) so `verify-manual` can write an audit entry per §4.9, or is visit-audit out-of-MVP? Schema (T02) has no visit-audit table. | PM B (Nathan) | T16 · MVP §4.9 | **open — schema/PO** | T16 ships now with a `recordVisitAudit` **no-op seam** (status update stays atomic in a tx → V2 satisfied); no migration added. If PO wants the audit trail persisted, needs a schema/migration decision (foundation). Low priority — MVP verify works without it. |

---

## 4. Approved deviations & planning updates (PO-approved)

> Parent PM mencatat tiap perubahan ke planning docs yang dilakukan untuk sync (per `PM-AGENT.md §0.6`), serta deviasi one-off yang di-approve PO. PM A/B/C tidak edit row di sini — propose via §3 atau direct ke Parent PM.

| Tanggal    | Doc / lokasi                                                       | Perubahan singkat                                                                                 | Driver task    | Disetujui oleh |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------- | -------------- |
| 2026-06-12 | docker-compose.yml, .env.example, README.md, .claude/settings.json | Shift host port Postgres 5432→5433 & Redis 6379→6380 untuk hindari bentrok dengan service lokal | (pre-T01 fix)  | PO             |
| 2026-07-01 | PARENT §1 T01–T03 Owner column                                     | Temporary reassign Nathan→Nanak (foundation unblocker chain — Nathan+Satrio not yet onboard, verbal consent from all devs) | T01, T02, T03  | Parent PM (solo Nanak) |
| 2026-07-01 | `.env` DATABASE_URL (dev-only)                                     | Opsi C: HC DEV uses fresh `hotel_core_dev` DB instead of shared `app` DB (which contains Auth+AI data). Reason: avoid destructive `prisma migrate reset` on Auth data when HC's schema.prisma reference stubs (Hotel/User with id-only) conflict with actual Auth tables. Trade-off: cross-DB FK impossible → HC's `tickets.hotelId` points to id-only stub, not real Auth `hotels`. Tier-gated features (T26/T30) blocked at DEV until shared-DB restored. **MUST revisit before staging/prod** — recommendation: Prisma multi-schema (previewFeatures=["multiSchema"]) with HC in `hotel_core` schema + Auth in `public` schema, in shared DB. | T02 | Parent PM (solo Nanak) |
| 2026-07-01 | PARENT §1 Slot ownership (Slot A ↔ Slot B swap, permanent)         | **Permanent slot swap**: Nanak takes over slot A (Foundation, T01–T10) — Nathan takes over slot B (Core CRM, T11–T20) when he onboards. Satrio unchanged (slot C, T21–T30). Reason: Nanak is only active dev + already covered T01+T02 successfully (unblocker chain done); prefers to continue foundation domain rather than context-switch. **Approved by all 3 devs** (Nathan + Satrio verbal consent; Nathan explicitly asked Nanak to proceed). Supersedes 2026-07-01 temporary covering deviation. Historical audit blocks in PM-STATUS-A.md §2 retaining "(covering)" designation are accurate at time of writing — post-swap blocks drop the tag. | Slot restructure (affects T01–T20) | Parent PM (solo Nanak) — cross-dev consent recorded |
| —          | —                                                                  | —                                                                                                 | —              | —              |

---

## 5. Gates (Parent PM enforce, PO define)

> Default kriteria di `PM-AGENT.md §5`. PO override di sini bila perlu.

| Gate | Target H | Criteria (recap)                                                                                       | Status      | Notes |
| ---- | -------- | ------------------------------------------------------------------------------------------------------ | ----------- | ----- |
| G1   | TBD      | Boilerplate ready: `make check` hijau, `make start` jalan, `_template` jalan, ADR lengkap              | not started | PO konfirmasi timeline |
| G2   | TBD      | Modul auth + 1 modul business jalan (CRUD lengkap + 1 external integration). Coverage ≥ 80%            | not started | —     |
| G3   | TBD      | Semua endpoint kontrak terimplementasi. Webhook HMAC tervalidasi. CI hijau                             | not started | —     |
| G4   | TBD      | Feature freeze — hanya bugfix                                                                          | not started | —     |
| G5   | TBD      | UAT pass. AC P0 = 100%. Migrasi prod siap. Runbook lengkap di `docs/runbooks/`                          | not started | —     |

---

## 6. Parent standup log (latest di atas)

> Parent PM consolidate dari 3 standup PM A/B/C (yang masing-masing tinggal di PM-STATUS-{slot}.md §6).
>
> Format:
> ```
> QOOMA BE PARENT — Standup — H{N}/{total}
>
> Dev A (Nathan) — <1-2 baris ringkas dari PM A standup>
> Dev B (Nanak)  — <1-2 baris ringkas dari PM B standup>
> Dev C (Satrio) — <1-2 baris ringkas dari PM C standup>
>
> 📅 Gate status
> - Next gate: G{N} di H{X} — <on track | at risk | slipping>
>
> 🚨 Eskalasi ke PO
> - <satu baris ask>
>
> 🎯 Fokus besok (cross-dev)
> - <re-balance / dependency unblock / shared-infra ship>
> ```

### H0 — 2026-06-12 (bootstrap, pre-multi-dev kickoff)

```
QOOMA BE PARENT — Standup — H0 (bootstrap)

Dev A (Nathan) — belum onboard, awaiting kickoff
Dev B (Nanak)  — belum onboard, awaiting kickoff
Dev C (Satrio) — belum onboard, awaiting kickoff

📅 Gate status
- Next gate: G1 (Boilerplate ready) — kriteria default; PO konfirmasi timeline
- Open contract questions: 0
- Open package questions: 0

🚨 Eskalasi ke PO
- Konfirmasi timeline + gate definition (G1..G5 default vs custom)
- Konfirmasi roadmap awal (T01–T##) untuk distribute ke 3 dev

🎯 Fokus besok / next session
- Setelah PO konfirmasi: Parent PM post first ASSIGNMENT batch,
  PM A/B/C onboard + identitas confirmed, executor session start.
```

---

## 7. Cross-dev incidents / lessons (Parent PM scope — affects >1 dev)

### 2026-06-12 — Docker port collision (pre-T01)

**What happened**: `make start` gagal — port 5432 host sudah dipakai service Postgres lokal user. Error: `Bind for 0.0.0.0:5432 failed: port is already allocated`.

**Fix**: Shift host port di `docker-compose.yml` — Postgres 5432→5433, Redis 6379→6380. Container internal port tetap default (5432/6379) supaya service di compose network tidak butuh perubahan. Updated: `docker-compose.yml`, `.env.example`, `.env` user, `README.md` quick-start note, `.claude/settings.json` MCP postgres DATABASE_URL.

**Tidak diubah**: `.github/workflows/ci.yml` (CI runner fresh, no collision), `docs/TESTING.md` (testcontainers pakai `getMappedPort()` random ephemeral).

**Lesson for tim**: bila task touch local dev port, cek dulu via `lsof -i :<port>` apakah ada bentrok sebelum tetap pakai default.

---

## 8. Next-up queue (Parent PM authority)

> Parent PM rewrite list ini ketika roadmap berubah. Each task **wajib** kolom Slot (A/B/C) untuk routing. PM A/B/C baca queue ini untuk lihat upcoming work — PM A/B/C tidak edit queue.

_(belum ada — tunggu PO post task / roadmap awal)_

<!-- TEMPLATE — copy untuk task baru di queue:

### T## — <Title>

- **Slot**: A | B | C (Parent PM assign)
- **Owner**: TBD (PM <SLOT> pick up via PM-STATUS-<SLOT>.md §2 ASSIGNMENT)
- **Started**: —
- **Status**: queued

#### Scope (dari roadmap / DEVELOPMENT-PLAN bila ada)
- ...

#### Files yang harus dibuat
- ...

#### Files yang akan dimodifikasi
- ...

#### T## DoD
- [ ] ...
- [ ] ...

#### Parent PM notes untuk PM <SLOT>
- Rasionalisasi slot pick: <kenapa A/B/C>
- Dependency: T## (slot X, status)
- Shared-infra risk: <none | flags file/folder shared dengan slot lain>
- Coordination needed with: <slot> for <reason>

-->

---

## 9. Eskalasi rules (recap)

DM PO langsung HANYA bila:

1. Gate (G1..G5) akan miss dalam 24 jam — Parent PM call
2. Open contract Q blocking > 48 jam — consolidated
3. Executor (via PM A/B/C) propose scope/architecture change — Parent PM ratify dulu
4. Forbidden package / pattern muncul di PR (CLAUDE.md §6 / §11)
5. Drift sistemik (>5 hits sejenis di banyak file lintas dev)
6. Security WAJIB (CLAUDE.md §6) tersentuh — Parent PM eskalasi instan

Routine miss / single drift / daily standup → PM-STATUS-{slot} → roll-up
ke §2 / §6 di sini, **bukan** ke PO langsung.

---

## 10. Cross-dev coordination notes

> Parent PM catat hal yang affect > 1 dev: file collision, shared-infra ship sequence, re-balance proposal, dependency unblocking. PM A/B/C boleh propose via §3c (architecture Q).

| Tanggal | Topic                                         | Affects        | Action / decision                         |
| ------- | --------------------------------------------- | -------------- | ----------------------------------------- |
| 2026-07-01 | Session-context seam blocks Core CRM merges. T11 (and all B tickets/guests/visits endpoints) need session context from Slot A's **T03 tenant-guard + T04 RBAC**. | B (blocked-to-merge), A (provider), C (same seam later) | **FULLY RESOLVED 2026-07-01 H12**: T03 (`9b55b86`) shipped pure fns + `TenantContext` type. T04 (`df5648b`) shipped `configureTenantGuardHooks(app: FastifyInstance): void` factory (root-scope hook, no encapsulation) + `@fastify/jwt` `FastifyJWT` augmentation. Nathan's wiring pattern in `api.ts`: `await app.register(jwtPlugin); configureTenantGuardHooks(app); await app.register(ticketsRoutes)`. `req.tenant` populated globally. B/C route merges no longer blocked on this seam once PO merges `feat/foundation-rbac` → main. |
| 2026-07-01 | **CI/build gap (GAP-T11-1)**: `make check` has no `prisma-generate` prereq + `prisma-client.ts` is a `{}` stub. First B/C module importing the generated client breaks CI typecheck on fresh checkout. | A (owns Makefile/CI foundation), B + C (all Prisma-touching tasks) | **RESOLVED 2026-07-02 H0 via T-INFRA-01** (`feat/foundation-prisma-ci` @ `583d324`, PM A APPROVED — awaiting PO merge). Post-merge: `make check` runs `prisma-generate` first; `prisma-client.ts` exports real singleton; exec-B drops the pre-run workaround. See adjacent pnpm-store note. |
| 2026-07-02 | **pnpm-store behavior insight (T-INFRA-01 side note, for future onboarding — Satrio especially)**: `.npmrc` uses `node-linker=isolated` + `shamefully-hoist=false`. Under pnpm 9 + `pnpm install --frozen-lockfile`, `@prisma/client`'s postinstall does NOT auto-run, so the pnpm-store `.prisma/client/` folder stays absent. `pnpm prisma:generate` (per `schema.prisma`'s `output = "../node_modules/.prisma/client"`) writes to project-root `node_modules/.prisma/client/`; TS module resolution walks up from the pnpm store and finds it there. Correct fix = `prisma-generate` as `check` prereq (shipped via T-INFRA-01). **Do NOT `pnpm rebuild @prisma/client`** — pollutes pnpm store with 110-line stub that shadows project-root types (red herring; doesn't reproduce under standard acceptance-test steps). | A (Makefile/CI), B + C (any Prisma-touching task) | Documented for future onboarding. No action needed; T-INFRA-01 already ships the fix. |
| 2026-07-02 | **DEP-5 — `TenantContext` missing `userId`**: blocks T19 (notifications = per-user scope). `SessionUser.userId` exists; `deriveTenantContext` just doesn't copy it. | B (T19 blocked), A (owns `tenant-guard.ts`), C (any future per-user endpoint) | **RESOLVED 2026-07-02 H0 via T-INFRA-02** (`feat/foundation-userid-tenant-context` @ `d0a0bcc`, PM A APPROVED — awaiting PO merge). See adjacent T-INFRA-02 scope-override row below for Path B rationale + guardrails. Nathan self-corrected his H13 misclaim in `438664d`. Post-merge T19 + T12 `actor_user_id` unblocked. |
| 2026-07-02 | **DEP-6 — no `422 BusinessRuleError` in `core/errors`**: blocks T16-V2..5 (visit verify-manual) **and T12** (ticket transition) — both need `422 BUSINESS_RULE` for invalid transitions. | B (T16, T12 blocked), A (owns `core/errors`, T07) | **RESOLVED 2026-07-02 H0 via T07-slice-1** (merged to main 2026-07-02, PO commit `8ebdb9a`). Class shipped per PM B's ratified envelope. T16-V2..V5 unblocked. Rest of T07 (7 other spec §7 codes) deferred to future slices on consumer demand — envelope-generic + `details.rule` approach means no additional subclasses needed until a wire-level discriminator becomes necessary. |
| 2026-07-02 | **T12 dependency chain FULLY UNBLOCKED** (state-machine + business-rule error): T12 needs both (a) valid transition validation + (b) `BusinessRuleError` throw on invalid. T07-slice-1 (merged) shipped (b); T06 (approved, awaiting PO merge) ships (a). Nathan wires as `assertValidTicketTransition(ticket.status, newStatus)` in T12 service before Prisma update. | B (T12), A (foundation done) | **T06 MERGED 2026-07-02 (PO commit `4f4a5d0`)**. Full chain live. No further foundation coordination needed for T12. Nathan can start T12 PLAN on ACK. |
| 2026-07-02 | **T-INFRA-02 scope override — Path B (PM A ratified)**: DEP-5 fix makes `TenantContext.userId` REQUIRED. Exec-A's Adv #1 grep surfaced 11 breaking sites in 7 Slot B test files (8 bare literals + 3 Partial builders across tickets + guests test files). Adv #4 grep confirmed Slot B production code has **zero** value-level references to `tenant.userId` → no latent unblock, but 11 typecheck breaks at `make check`. **Why Path B (single combined PR) instead of Path A (coordinated sequential PRs)**: TS type-breaking changes cannot cleanly sequence across independent PRs — either PM B's fixture PR fails excess-property-check (userId not yet on TenantContext) OR T-INFRA-02 red-mains for a window until B fixture PR merges. Only clean options are (a) atomic simultaneous merge (git doesn't support), (b) intermediate `userId?: string` optional step + follow-up PR (2 hops + weakens type), or (c) single combined PR. PM A picked (c) with guardrails. | B (test fixtures + T19 unblock), A (owner) | **Guardrails ratified in PM A ACK of GAP-1** (PM-STATUS-A §2): Slot B edits = TEST FILES ONLY (no production touched), mechanical `userId: '<value>'` defaults following Slot B's existing `'u-1'`/`'u-2'` SessionUser convention, zero test-logic changes, commit body clearly labels Slot A vs Slot B sections. Post-merge PM A will annotate here that PM B may rename to preferred value in any future PR (zero breakage risk since userId is now required — any string satisfies TS). **PM B — welcome to ratify or object retrospectively; the Path B decision was type-system-forced, not chosen for speed**. **UPDATE 2026-07-02 H0 PM A VERDICT**: T-INFRA-02 APPROVED (`d0a0bcc`) and all 4 guardrails independently verified — #1 zero non-test Slot B files touched, #2 sample-check confirmed mechanical fixture-only diffs, #3 all 7 Nathan suites green in independent `make check` run, #4 commit body has clean `=== Slot A ===`/`=== Slot B ===` sections. Nathan's `438664d` self-correction of his DEP-5 misclaim landed independently — cross-team hygiene rippled organically. **PM B ratification pending on next session read of this note.** Fixture values chosen per file: `USER_1` constant in `tickets.repository.integration.test.ts` (spec-compliant reuse), inline `'u-1'` elsewhere. Rename to preferred values welcome in any future PR — zero break. **UPDATE 2026-07-02 T-INFRA-02 MERGED** (PO commit `e95a23d`): DEP-5 fully resolved on main. Nathan Q-B-11 (T12 `actor_user_id` source) auto-resolves — his T12 PLAN can use `ctx.userId` directly. |
| 2026-07-02 | **T05 seed design input request (PM A → PM B, awaiting your read)** — Now that foundation chain is 8/10 shipped, T05 seed is next-up in Slot A queue but has an Opsi C twist from §4 deviation: HC DEV uses fresh `hotel_core_dev` DB, no Auth API access, but seed script needs a "demo hotel" record (canonical source per spec = Auth API). Nathan uses testcontainers for integration tests (spins own DB + fixtures) so seed script may not affect Slot B directly — but consistency matters for Satrio (when onboard) + local `make start-fresh` demo. **Options**: **(S1)** raw SQL migration inserting demo hotel row into HC's id-only `hotels` stub; **(S2)** runtime Prisma upsert in seed script (env-configurable `SEED_HOTEL_ID`, idempotent); **(S3)** mock Auth API stub (nock or similar, closer to prod parity); **(S4)** env-driven mode (dev-standalone vs production-linked via `AUTH_API_URL`, seed picks path at runtime). **PM A leaning S2** — simplest, no migration coupling, aligns with Prisma-first approach + your existing fixture patterns. **PM B — if you prefer another approach for reasons that touch your integration setup, flag here. Silent = ratify S2 default; PM A will ship T05 accordingly in ~1 session cycle after T-INFRA-03 merges.** Also welcome any tension with Nathan's testcontainers pattern I might be missing (e.g., does S2 conflict with his `beforeAll` fixture bootstrap?). | A (T05 owner), B (test consistency + integration seam), C (future consumer) | *Awaiting PM B input via PARENT §10 read on next session; PM A defaults to S2 after T-INFRA-03 lands + ~1 session cycle no signal.* **UPDATE 2026-07-02 H0 PM A VERDICT — S2 SHIPPED via T05** (`feat/foundation-seed-hotel-core` @ `cdd1ed5`, PM A APPROVED, awaiting PO merge). Silent-ratification path completed: PM B did not respond in the session cycle window while T-INFRA-03 landed. Per plan, PM A ratified S2 as default and shipped. **PM B — post-hoc awareness routing**: (1) 1 hotel + 5 depts + 3 categories + 10 items + 6 KB seeded via runtime Prisma upsert into `hotel_core_dev`; (2) HSK (Housekeeping) + FO (Front Office) dept codes **deliberately aligned with your testcontainer fixture codes** (`tickets.repository.integration.test.ts:73-74`) as a friction-reducer for any future shared-seed use case; (3) upserts are `update: {}` no-op idempotent so 2nd runs preserve manual dev tweaks; (4) env `SEED_HOTEL_ID` optional override; (5) own PrismaClient (not the T-INFRA-01 singleton) to avoid env fail-fast on unrelated secrets. **No override expected but channel remains open** — if you have a preference for S1/S3/S4 that touches your integration setup, or if the specific dept/menu/KB values should mirror your fixture conventions more closely, welcome to raise here or in any future PR. Zero breakage risk (dev-only script, `update:{}` no-op preserves your tweaks). |
| 2026-07-02 | **T-INFRA-04 candidate — CI integration test strategy (post T-INFRA-03 merge)** — T-INFRA-03 makes `make check` Docker-free (unit-only, 0.532s vs ~11s). CI likely calls `make check` today → post-merge, CI stops running integration tests unless a new step is added. Exec-A proposed 3 concrete options in T-INFRA-03 SUBMIT: **(a)** new `make check-full = check + test-integration` Makefile target (single command, backwards-compat with existing CI if CI switches to it); **(b)** separate CI job step for `pnpm test:integration` (keeps `check` fast, adds parallel job for integration); **(c)** do nothing if CI already handles integration separately (need to verify CI config). **PM A needs**: PO decision on priority (blocker vs P1 vs later) + preferred option. If (a) or (b) chosen, PM A ships as T-INFRA-04 next session cycle. If (c), close as no-op after CI config audit. | A (foundation/CI author), all consumers (CI coverage) | *Awaiting PO signal on priority + preferred option. Low urgency if CI has integration coverage already; escalate if CI is only `make check`.* |
| 2026-07-02 | **docs/TESTING.md dev-flow guidance follow-up (post T-INFRA-03 merge)** — Post-merge, contributors touching integration tests must remember `pnpm test:integration` as an additional local gate before pushing. Currently `docs/TESTING.md` doesn't distinguish (assumes `make check` covers everything). Update needed: (i) `make check` runs UNIT ONLY (Docker-free, fast), (ii) `pnpm test:integration` runs integration tests (Docker/testcontainers required), (iii) recommended workflow: `make check` on every save + `pnpm test:integration` before push if touching `.integration.test.ts` files. **`docs/TESTING.md` is planning territory** — PM A cannot edit unilaterally per EXECUTOR-PROTOCOL §10; needs PARENT/Planning session to author the doc update. | A (raises the ask), Planning (doc author), all devs (readers) | *Flagged for PARENT/Planning session. Low urgency; workaround = README quick note or Slack until doc updates.* |
| 2026-07-01 | **Go-live gap (DEP-4)**: the T04 wiring pattern above assumes `src/entrypoints/api.ts` is a live Fastify bootstrap, but it's still a **stub** (no server, no `register(jwtPlugin)`, no `fastify.services`, no route registration). So even after `feat/foundation-rbac` merges, **no B/C route actually serves** until the api.ts bootstrap is built. Also gates G1 ("`make start` jalan"). | B + C (all routes) + G1 gate | *Proposed by PM B for Parent PM*: assign the `api.ts` server bootstrap (Fastify instance + config + core plugins + `configureTenantGuardHooks` + module route registration) to Slot A / foundation. Not a per-module (B/C) task. Blocks first real end-to-end request + G1. |

<!-- Contoh:
2026-06-30 | core/queue/ Bull factory pattern decision | B, C | A ship dulu (T05), B & C unblocked H+1
2026-07-02 | shared/utils/crypto.ts signature change | A, B          | A coord with B; B re-test webhook (T11)
-->

---

## 11. Quick reference — file ownership matrix

| File / Folder                                            | Edit authority                                                                                             |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `PM-STATUS-PARENT.md`                                    | Parent PM (full) · PM A/B/C (only append to §2 roll-up & §6 standup; status update for own row in §1)      |
| `PM-STATUS-A.md`                                         | PM A (Nathan) + Executor A (assignment/PLAN/CHECKPOINT/SUBMIT only — append-only)                          |
| `PM-STATUS-B.md`                                         | PM B (Nanak) + Executor B (same)                                                                           |
| `PM-STATUS-C.md`                                         | PM C (Satrio) + Executor C (same)                                                                          |
| `CLAUDE.md`, `PM-AGENT.md`, `EXECUTOR-PROTOCOL.md`, `KICKOFF.md`, `README.md`, `docs/*`, `docs/decisions/*` | Planning agent (with PO ack) · Parent PM (sync update per `PM-AGENT.md §0.6`)                              |
| `src/`, `prisma/migrations/`                             | Executor A/B/C (each in own task scope) — never PM/Parent PM                                               |
| `prisma/schema.prisma`                                   | Executor (in task that touches schema) — never PM (kecuali typo non-semantik)                              |
| `package.json` deps                                      | PO approval via Parent PM eskalasi — no executor adds deps unilaterally                                    |
| `docker-compose.yml`, `Makefile`, env templates          | Executor (in task that touches them); Parent PM consolidate via §4 deviation log                           |
