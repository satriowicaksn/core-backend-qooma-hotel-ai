# ADR-0008: Repo scope narrows from generic boilerplate to Hotel Core service

- **Status**: accepted
- **Tanggal**: 2026-06-26
- **Pengambil keputusan**: PO + Planning agent

## Konteks

ADR-0001..0007 (2026-06-11) ditulis dengan asumsi repo ini = boilerplate generic untuk semua service Qooma. Service split berikutnya menelurkan Service 02 (Hotel Core / CRM) sebagai service terbesar — ~80% API surface.

Spec Service 02 (`docs/services/02-hotel-core.md`, ditulis pada gate G1 oleh slot B/C) mengimplikasikan cross-service reference ke `users.id` (Auth) dan `conversations.id` (AI), yang on-paper bentrok dengan ADR-0004 (1 service = 1 DB) bila diinterpretasikan sebagai Postgres foreign key constraint.

## Opsi yang dipertimbangkan

### Opsi A: Tetap boilerplate generic; Hotel Core fork ke repo lain
- **Pros**: Pattern tetap reusable untuk sibling service
- **Cons**: Branch divergence cepat, drift planning lintas repo, multi-PM model di KICKOFF.md jadi mengambang (slot routing tidak jelas)

### Opsi B (pilihan): Repo ini = service Hotel Core spesifik
- **Pros**: Tim 3 dev fokus 1 bounded context, planning corpus konsisten, scope MSW Phase 1 bisa langsung dipetakan ke modul backend
- **Cons**: Sibling service butuh repo terpisah; mereka fork dari commit ini sebelum charter merged, atau dari branch `boilerplate-base`

### Opsi C: Monorepo multi-service
- **Pros**: 1 repo, 1 PR review surface
- **Cons**: Off-spec ADR-0004 (1 service = 1 DB) dan ADR-0002 (pnpm strict + 1 schema). pnpm workspaces + Prisma multi-schema bukan default kita. Tidak diambil.

## Keputusan

**Opsi B.** Repo ini adalah service **Hotel Core (CRM)**.

Konsekuensi langsung:
- `README.md` framing direframe (dari "generic boilerplate" → "Hotel Core service [boilerplate-derived]")
- `docs/SERVICE-CHARTER.md` ditulis (charter formal)
- `KICKOFF.md §1` slot routing dipersempit ke domain Hotel Core
- Sibling service (Auth, AI Orchestration, Integration) hidup di repo terpisah — PO menyediakan nama repo sebelum gate G2

### Resolve ADR-0004 tension (cross-service identifier)

ADR-0004 tetap berlaku tanpa modifikasi. ADR-0008 menambah pola eksplisit:

> Kolom yang merujuk entity milik sibling service **WAJIB** disimpan sebagai opaque `uuid` di Postgres **tanpa** klausa `REFERENCES`. Tidak boleh ada Postgres foreign key constraint lintas-service-boundary.

Kolom yang affected (minimum, dari Service 02 spec):

- `tickets.assigned_user_id`, `tickets.created_by` → Auth `users.id`
- `ticket_updates.actor_user_id` → Auth `users.id`
- `notifications.user_id` (recipient) → Auth `users.id`
- `ticket_messages.conversation_id` → AI `conversations.id`

Konsistensi dijaga oleh kombinasi:

1. **JWT claim** (Auth as source of truth) → Hotel Core trust `user_id` di session level
2. **Optional cache table `user_cache`** per hotel (display name, role) — TBD modul `auth-cache` di gate G2
3. **Domain event handler** (mis. `user.deleted` dari Auth) → Hotel Core soft-mark assignment sebagai orphaned — TBD

## Konsekuensi

### Positif

- Bounded context jelas untuk 3 dev paralel
- Slot routing di KICKOFF.md / SERVICE-CHARTER.md bisa dipersempit
- ADR-0004 tidak perlu di-supersede — hanya diperjelas
- Schema-level boundary diperkeras: bug "accidentally JOIN ke users table" tidak mungkin terjadi di schema level

### Negatif (yang kami terima)

- Sibling service repo belum dinamai → gate G2 blocked sampai PO menetapkan nama repo + `docs/contracts/jwt-claims.md`
- Pattern boilerplate (`_template/`, `MODULE_TEMPLATE.md`) tetap reusable, tapi forking masih manual (belum ada npm internal package)
- Read consistency lintas service = eventual (sesuai filosofi ADR-0004); butuh care saat compose ticket detail view (join dari Auth dilakukan via internal RPC, bukan SQL)

## Trigger untuk revisit

- Saat ada ≥2 service Qooma siap rilis dan banyak helper duplikat → extract pattern ke npm internal package
- Saat cross-service query jadi mahal (latency p95 > 500ms) → CQRS read model di Hotel Core
- Saat constraint integrity lintas service jadi penting (mis. compliance audit) → outbox + event sourcing pattern di sibling service
