# Qooma Backend Service — Boilerplate

> Template/boilerplate untuk backend service di ekosistem **Qooma** (microservices). Dipakai sebagai **pondasi konsisten** saat membuat service baru. Service nyata akan inherit struktur dari sini.
>
> Goal: AI-driven development (~80% AI) tetap clean dan maintainable lewat pola **multi-agent workflow** (Planning / PM / Executor) dengan 3 dev paralel.

## 📖 Wajib dibaca dulu

| Dokumen | Untuk siapa | Isi |
|---|---|---|
| **[KICKOFF.md](./KICKOFF.md)** | Onboarding tim | Master kickoff prompt — 3 dev paralel (Nathan/Nanak/Satrio), 3 agent per dev (Planning/PM/Executor), Parent PM cross-coordinator, identity check rule, PROMPT A/B/C copy-paste |
| **[CLAUDE.md](./CLAUDE.md)** | AI agent + developer | Aturan coding, struktur, pattern (Hexagonal Disiplin), security guard, anti-patterns |
| **[PM-AGENT.md](./PM-AGENT.md)** | Parent PM + PM A/B/C | Role spec PM — validation procedure, drift scans, roll-up protocol, escalation |
| **[EXECUTOR-PROTOCOL.md](./EXECUTOR-PROTOCOL.md)** | Executor A/B/C | Workflow rulebook — session bootstrap, PLAN/SUBMIT format, self-validate, block protocol |
| **[docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md)** | Semua | Penjelasan folder-by-folder — apa isinya & gunanya |
| **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | Semua | Arsitektur + rationale (Hexagonal Disiplin, 1-service-1-db) |
| **[docs/SECURITY.md](./docs/SECURITY.md)** | Semua | Enkripsi, HMAC, masking PII, JWT |
| **[docs/TESTING.md](./docs/TESTING.md)** | Semua | Unit, integration, coverage target |
| **[docs/MODULE_TEMPLATE.md](./docs/MODULE_TEMPLATE.md)** | AI saat buat modul baru | Pola file-by-file modul |
| **[docs/NEW_BACKEND_SERVICE_PROMPT.md](./docs/NEW_BACKEND_SERVICE_PROMPT.md)** | Saat scaffold service baru | Prompt copy-paste ke Claude Code |
| **[docs/decisions/](./docs/decisions/)** | Audit keputusan | Architecture Decision Records |

## 🤖 Multi-agent workflow (3 dev paralel)

3 dev paralel, masing-masing punya **3 Claude Code session** (Planning / PM / Executor) + 1 shared Parent PM session.

| Slot | Nama   | PM file (per-dev)                | Default domain                                    |
| ---- | ------ | -------------------------------- | ------------------------------------------------- |
| A    | Nathan | [PM-STATUS-A.md](./PM-STATUS-A.md) | Foundation / shared infra (core, plugins, ADR)    |
| B    | Nanak  | [PM-STATUS-B.md](./PM-STATUS-B.md) | Business modules batch 1 (auth, hotel-core)        |
| C    | Satrio | [PM-STATUS-C.md](./PM-STATUS-C.md) | Business modules batch 2 + integration channels    |

Cross-dev roll-up & gates: **[PM-STATUS-PARENT.md](./PM-STATUS-PARENT.md)** (Parent PM authority).

Onboard via **[KICKOFF.md](./KICKOFF.md)** — di sana ada PROMPT A (Planning), PROMPT B-PARENT (Parent PM), PROMPT B (sub-PM per slot), PROMPT C (Executor per slot) yang bisa langsung paste ke fresh Claude Code session.

## 📊 Progress board

> Auto-updated by Parent PM. Detail per-dev di file PM-STATUS-{A,B,C}.md. Global tracker di PM-STATUS-PARENT.md §1.

### Current snapshot (H0 — bootstrap)

| Slot | Dev    | Active task | Status   | Last approved | Branch |
| ---- | ------ | ----------- | -------- | ------------- | ------ |
| A    | Nathan | —           | idle     | —             | —      |
| B    | Nanak  | —           | idle     | —             | —      |
| C    | Satrio | —           | idle     | —             | —      |

**Gates** (target H per PO, criteria default `PM-AGENT.md §5`):

| Gate | Target H | Status        | Notes                                                                    |
| ---- | -------- | ------------- | ------------------------------------------------------------------------ |
| G1   | TBD      | not started   | Boilerplate ready: `make check` green, `make start` jalan, `_template` jalan |
| G2   | TBD      | not started   | Modul auth + 1 modul business + coverage ≥ 80%                            |
| G3   | TBD      | not started   | Semua endpoint kontrak + webhook HMAC + CI green                          |
| G4   | TBD      | not started   | Feature freeze                                                            |
| G5   | TBD      | not started   | UAT pass, AC P0 = 100%, runbook ready                                     |

**Counters** (global):

- ✅ Tasks approved: **0** / TBD
- 🔄 Tasks in progress: **0**
- ⛔ Tasks rejected today: **0**
- 🚨 Open contract Qs: **0**
- 📅 Days into project: H0

> Update protocol: Parent PM edit table di section ini setiap end-of-day, mirroring dari `PM-STATUS-PARENT.md §1` + §5 + §6. Sub-PM A/B/C tidak edit progress board ini langsung — push status via PM-STATUS-PARENT.md, Parent PM yang sync ke README.

## 🧱 Tech stack

Node.js ≥20 LTS (diuji di Node 20 + 22) · TypeScript 5 (strict) · Fastify 4 · Prisma 5 · PostgreSQL 15 · Redis 7 · Bull 4 · zod 3 · winston 3 · Jest 29 · **pnpm 9** · Docker multi-stage · AWS ECS Fargate (default deploy target)

## 🏗️ Pattern arsitektur

**Hexagonal Disiplin** — Ports & Adapters HANYA untuk external I/O (HTTP API eksternal, queue producer, notifier, object storage). Prisma/Redis/logger dipakai langsung (sudah jadi abstraksi).

**1 service = 1 database = 1 Prisma schema** (microservices). Cross-service communication lewat API atau event, BUKAN shared DB.

Detail rationale: [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) + ADR di [docs/decisions/](./docs/decisions/).

## 🚀 Quick start

> **Prasyarat**: Node.js ≥20, pnpm (auto-install via `corepack enable` — sudah di-handle `make install`).

```bash
# 1. Install pnpm & deps (termasuk corepack enable otomatis)
make install

# 2. Setup env
cp .env.example .env
# edit .env: isi DATABASE_URL, JWT secrets, dll

# 3. Start dev stack (Postgres + Redis) + run migration
make start
# atau, kalau mau FRESH database (DROP volume → migrate → seed):
make start-fresh
#
# Default host port: Postgres → 5433, Redis → 6380 (digeser dari 5432/6379
# untuk hindari bentrok dengan Postgres/Redis lokal). Internal container
# port tetap 5432/6379, jadi service di compose network tidak terdampak.
# Kalau mau ubah, edit `docker-compose.yml` + `.env`.

# 4. Run dev process (di terminal terpisah)
make dev-api
make dev-worker   # kalau service punya background job
```

## 📝 Command penting (Makefile)

```bash
make help              # daftar semua command
make start             # start dev (DB persist)
make start-fresh       # FRESH: drop volume + migrate + seed
make stop              # stop containers
make clean             # stop + drop volumes + clean node_modules

make dev-api           # run HTTP server (hot reload)
make dev-worker        # run Bull worker (hot reload)

make db-migrate        # apply migration
make db-seed           # run seed
make db-studio         # Prisma Studio (DB UI browser)

make test              # semua test
make lint              # ESLint check
make typecheck         # TypeScript check
make format            # Prettier write
make check             # lint + format-check + typecheck + unit test

make commit MSG="feat(modul): tambah X"   # auto-check + git commit
```

## 🧪 Test

```bash
make test              # semua
make test-unit         # unit saja (cepat, no DB)
make test-integration  # dengan DB + Redis nyata (perlu `make start` dulu)
make test-coverage     # dengan coverage report
```

Target coverage: 80% line. Detail di [docs/TESTING.md](./docs/TESTING.md).

## 📦 Build & deploy

```bash
make build             # tsc → dist/
make docker-build      # docker image (api + worker)
```

Default deploy: AWS ECS Fargate (multi-target image: `api`, `worker`).

## 🔐 Security ringkas

- Token sensitif: AES-256-GCM at rest
- Webhook: HMAC validation timing-safe
- PII (nomor WA, email): mask di log (`maskWaPhone`, `maskEmail`)
- JWT: access 8h + refresh 30d
- Rate limit: 100 req/menit per IP (configurable)

Detail: [docs/SECURITY.md](./docs/SECURITY.md).

## 🤝 Cara berkontribusi (manusia ATAU AI)

### Bila kamu Claude Code session baru

1. Baca **[KICKOFF.md](./KICKOFF.md)** dulu — di sana ada PROMPT untuk Planning / Parent PM / sub-PM / Executor sesuai role.
2. Di response pertama kamu **WAJIB** confirm identitas: `Role: PM | Executor | Parent PM | Planning` + `Slot: A (Nathan) | B (Nanak) | C (Satrio)`. Bila user belum sebut slot — STOP, tanya dulu.
3. Baca file PM-STATUS yang sesuai slot kamu (PM A → PM-STATUS-A.md + PM-STATUS-PARENT.md; Executor A → PM-STATUS-A.md only; dst).
4. Baca [CLAUDE.md](./CLAUDE.md) untuk code rules.
5. Follow work loop di [EXECUTOR-PROTOCOL.md §4](./EXECUTOR-PROTOCOL.md) (executor) atau [PM-AGENT.md §3](./PM-AGENT.md) (PM).

### Bila kamu human dev

1. Baca [CLAUDE.md](./CLAUDE.md) untuk pattern & rule.
2. Cek [docs/decisions/](./docs/decisions/) untuk konteks keputusan.
3. Patuhi struktur modul ([docs/MODULE_TEMPLATE.md](./docs/MODULE_TEMPLATE.md)) — copy `src/modules/_template/`.
4. `make check` lulus sebelum PR.
5. Isi PR template lengkap.

## Lisensi

UNLICENSED — proprietary internal Qooma.
