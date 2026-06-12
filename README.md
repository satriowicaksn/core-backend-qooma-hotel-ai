# Qooma Backend Service — Boilerplate

> Template/boilerplate untuk backend service di ekosistem **Qooma** (microservices). Dipakai sebagai **pondasi konsisten** saat membuat service baru. Service nyata akan inherit struktur dari sini.
>
> Goal: AI-driven development (~80% AI) tetap clean dan maintainable lewat pola yang terdokumentasi.

## 📖 Wajib dibaca dulu

| Dokumen | Untuk siapa | Isi |
|---|---|---|
| **[CLAUDE.md](./CLAUDE.md)** | AI agent + developer | Aturan coding, struktur, pattern (Hexagonal Disiplin), security guard, anti-patterns |
| **[docs/PROJECT_STRUCTURE.md](./docs/PROJECT_STRUCTURE.md)** | Semua | Penjelasan folder-by-folder — apa isinya & gunanya |
| **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | Semua | Arsitektur + rationale (Hexagonal Disiplin, 1-service-1-db) |
| **[docs/SECURITY.md](./docs/SECURITY.md)** | Semua | Enkripsi, HMAC, masking PII, JWT |
| **[docs/TESTING.md](./docs/TESTING.md)** | Semua | Unit, integration, coverage target |
| **[docs/MODULE_TEMPLATE.md](./docs/MODULE_TEMPLATE.md)** | AI saat buat modul baru | Pola file-by-file modul |
| **[docs/NEW_BACKEND_SERVICE_PROMPT.md](./docs/NEW_BACKEND_SERVICE_PROMPT.md)** | Saat scaffold service baru | Prompt copy-paste ke Claude Code |
| **[docs/decisions/](./docs/decisions/)** | Audit keputusan | Architecture Decision Records |

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

1. Baca [CLAUDE.md](./CLAUDE.md) untuk pattern & rule.
2. Cek [docs/decisions/](./docs/decisions/) untuk konteks keputusan.
3. Patuhi struktur modul ([docs/MODULE_TEMPLATE.md](./docs/MODULE_TEMPLATE.md)) — copy `src/modules/_template/`.
4. `make check` lulus sebelum PR.
5. Isi PR template lengkap.

## Lisensi

UNLICENSED — proprietary internal Qooma.
