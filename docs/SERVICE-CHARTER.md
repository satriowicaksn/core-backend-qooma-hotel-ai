# Service Charter — Hotel Core (CRM)

- **Status**: accepted
- **Tanggal**: 2026-06-26
- **Ratified by**: [ADR-0008](./decisions/0008-repo-scope-hotel-core.md)

## 1. Bounded context

Repo ini = service **Hotel Core (CRM)**. Pattern boilerplate (`_template/`, `MODULE_TEMPLATE.md`, ADR-0001..0007) tetap reusable, tapi scope work-in-flight di repo ini = Hotel Core only.

### Owns

- Hotels · departments · tickets (state machine + audit) · guests · guest preferences · visits (manual + auto verification) · notifications (server-persisted; socket fast path)
- Settings: hotel, departments, menu, knowledge base, promos (stub), upsells (stub), WA templates, feature flags (19), operating hours + DND, escalation tree, integrations **config** CRUD
- Analytics (Luxury tier only, server-enforced)
- Billing: quota meter, invoices, daily brief PDF, package upgrade
- Workers: auto-close (15m), escalation L1→L2→L3, pending-verification reminder, failed-3x detection, daily brief PDF, quota 80%/100%, monthly reset

### Does NOT own (sibling services — separate repos)

| Sibling                | Owns                                                 |
| ---------------------- | ---------------------------------------------------- |
| Auth / Identity (01)   | Users, sessions, JWT, PII masking helpers            |
| AI Orchestration (03)  | Agent prompts, orchestrator, conversations           |
| Integration (04)       | WA / Telegram / channel adapters, outbound dispatch  |
| Billing core (05)      | Payment provider integration (scope TBD by PO)       |

> **Sibling repo names / git URLs**: TBD — PO to fill before gate G2.

## 2. Cross-service contracts

- **Persistence boundary**: Hotel Core persists artifacts sibling services produce (ticket dari WA message; messages enriched by AI). Tidak membaca DB sibling.
- **Cross-service identifiers**: `users.id` (Auth), `conversations.id` (AI), `outbound_message.id` (Integration) disimpan sebagai opaque `uuid` columns **tanpa** Postgres `REFERENCES`. Pola diratifikasi di ADR-0008.
- **Tier authority**: `Hotel.tier` lives here. Auth wajib include nilainya di JWT claims untuk FE route guards. Claim shape contract → `docs/contracts/jwt-claims.md` (TBD, ditulis pada G1 saat sync dengan Auth team).
- **DND + quota enforcement**: Hotel Core owns config. Integration service consults Hotel Core (internal RPC) saat dispatch untuk read DND state + reserve quota; report back actual sends supaya meter increments. Block decision tinggal di modul quota Hotel Core, BUKAN di Integration.
- **AI handoff**: Hotel Core fires `ticket:created` setelah AI service callback dengan classified payload. AI tidak pernah menulis ke DB Hotel Core; pakai internal RPC.

## 3. Slot routing (supersedes KICKOFF.md §1 defaults)

| Slot       | Old default                       | New default                                                                                                          |
| ---------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| A (Nathan) | Foundation / shared infra         | Foundation / shared infra (no change)                                                                                |
| B (Nanak)  | Auth + Hotel Core CRUD            | Hotel Core **core** (tickets, guests, visits, settings, billing)                                                     |
| C (Satrio) | AI + Integration channels         | Hotel Core **comms** (notifications, WA templates, integrations config CRUD, escalation tree, quota & comms workers) |

`KICKOFF.md §1` table di-update di commit terpisah (`chore(planning):` prefix) supaya slot rewrite reviewable in isolation.

## 4. Open contract questions

Service 02 spec menaikkan ≥11 Q-CONTRACT items (07–12, 15, 17, 19, 20, 21) plus beberapa `(ASSUMED)` inline. Register hidup di `docs/contracts/open-questions.md` (TBD, dibuat pada G1). Parent PM mirror actionable rows ke `PM-STATUS-PARENT.md §3a`.

## 5. Out-of-scope-by-design

- Cross-service DB JOIN, shared schemas, shared Prisma generators
- Holding identity (passwords, JWT secrets) — Auth's job
- Channel adapters / vendor SDK code — Integration's job
- Prompt engineering, model selection — AI's job
