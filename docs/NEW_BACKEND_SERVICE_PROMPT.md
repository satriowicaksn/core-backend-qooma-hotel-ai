# 📋 Prompt: Scaffold New Backend Service (Qooma Convention)

> **Cara pakai**: Saat butuh backend service Qooma baru, copy seluruh blok di bawah, ganti `<<SERVICE_NAME>>` dan `<<SERVICE_PURPOSE>>` sesuai kebutuhan, lalu paste ke Claude Code di repo kosong.
>
> Prompt ini self-contained — Claude tidak perlu akses repo boilerplate untuk follow.

---

## Copy mulai dari sini ⤵

````
Saya akan scaffold backend service baru untuk platform Qooma. Tolong ikuti convention berikut PERSIS, tanpa improvisasi.

## Service identity

- **Service name**: <<SERVICE_NAME>>  (contoh: qooma-billing, qooma-chat, qooma-ai)
- **Service purpose**: <<SERVICE_PURPOSE>>  (1-2 kalimat)
- **Bagian dari**: platform Qooma (microservices)

## Prinsip Qooma yang WAJIB diikuti

1. **1 service = 1 database = 1 Prisma schema**. Tidak ada split master/tenant. Komunikasi antar service via API/event.
2. **Hexagonal Disiplin**: port + adapter HANYA untuk external IO (HTTP API, queue producer, notifier, storage). Prisma/Redis/logger langsung.
3. **TypeScript strict**, ESM, pnpm.
4. **2 process per repo**: api (Fastify HTTP) + worker (Bull queue). Service yang butuh process lain (SMTP, gRPC) tambahkan entrypoint.
5. **Dokumentasi Bahasa Indonesia**, kode + identifier Bahasa Inggris.

## Tech stack (TIDAK BOLEH ganti)
- Node.js 20 LTS, TypeScript 5.x strict, ESM (`"type": "module"`)
- HTTP: Fastify 4.x
- ORM: Prisma 5.x
- Queue: Bull 4.x + ioredis
- Validation: zod 3.x
- HTTP client: axios
- Date: dayjs
- Logging: winston 3.x JSON
- Testing: Jest 29 + ts-jest ESM
- Package manager: pnpm 9 (strict deps via `.npmrc`)

## Folder structure yang HARUS dibuat

```
.
├── .claude/settings.json           MCP servers + permissions
├── .github/workflows/ci.yml        Lint + typecheck + test + docker build
├── .github/PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── ARCHITECTURE.md             High-level + rationale
│   ├── PROJECT_STRUCTURE.md        Folder-by-folder explanation (1 file aja)
│   ├── SECURITY.md
│   ├── TESTING.md
│   ├── MODULE_TEMPLATE.md
│   ├── NEW_BACKEND_SERVICE_PROMPT.md  (copy doc ini)
│   └── decisions/
│       ├── README.md
│       ├── 0000-template.md
│       ├── 0001-hexagonal-disiplin.md
│       ├── 0002-package-manager.md
│       ├── 0003-coding-standards.md
│       ├── 0004-one-service-one-db.md
│       ├── 0005-deployment-target.md
│       ├── 0006-fastify-vs-express.md
│       └── 0007-prisma-vs-alternatives.md
├── prisma/
│   ├── schema.prisma               1 schema dengan 1 model contoh
│   └── seeds/index.ts
├── scripts/                        Kosong (diisi saat butuh)
├── src/
│   ├── entrypoints/
│   │   ├── api.ts                  Fastify HTTP server
│   │   └── worker.ts               Bull queue worker
│   ├── core/
│   │   ├── config/env.ts           Validasi env via zod
│   │   ├── logger/logger.ts        Winston + redact
│   │   ├── errors/app-errors.ts    AppError hierarchy
│   │   ├── prisma/prisma-client.ts
│   │   ├── redis/redis-client.ts
│   │   ├── queue/bull-factory.ts
│   │   └── http/http-client.ts
│   ├── plugins/
│   │   ├── correlation-id.plugin.ts
│   │   ├── error-handler.plugin.ts
│   │   ├── auth-jwt.plugin.ts      (kalau butuh auth)
│   │   ├── hmac-validator.plugin.ts (kalau butuh webhook)
│   │   ├── rate-limit.plugin.ts
│   │   ├── cors.plugin.ts
│   │   └── helmet.plugin.ts
│   ├── shared/
│   │   ├── types/
│   │   ├── utils/
│   │   │   ├── crypto.ts
│   │   │   ├── masking.ts
│   │   │   └── test-setup.ts
│   │   └── constants/              (kalau ada)
│   └── modules/
│       └── _template/              Referensi pola (jangan diedit)
├── .env.example
├── .gitignore
├── .dockerignore
├── .editorconfig
├── .eslintrc.cjs
├── .npmrc                          pnpm strict
├── .nvmrc                          (20)
├── .prettierrc.json
├── .prettierignore
├── Dockerfile                      Multi-stage, target api + worker
├── docker-compose.yml              postgres + redis
├── jest.config.ts
├── Makefile                        make start, start-fresh, commit, dst
├── package.json                    type: module, pnpm engines
├── tsconfig.json                   Strict semua flag
├── tsconfig.build.json
├── README.md
└── CLAUDE.md
```

## File contents yang HARUS dibuat

### 1. `package.json`
- `"type": "module"`
- `"packageManager": "pnpm@9.0.0"`
- engines: node `>=20.0.0 <21.0.0`, pnpm `>=9.0.0`
- Scripts: dev:api, dev:worker, build, start:*, lint, lint:fix, format, format:check, typecheck, test, test:unit, test:integration, test:coverage, prisma:generate, prisma:migrate:dev, prisma:migrate:deploy, prisma:migrate:reset, seed
- Kosongkan dependencies/devDependencies — diisi saat implementasi mulai

### 2. `tsconfig.json`
- target ES2022, module ESNext, moduleResolution Bundler
- ALL strict flags: strict, noImplicitAny, strictNullChecks, exactOptionalPropertyTypes, noUncheckedIndexedAccess, noImplicitOverride
- noUnusedLocals, noUnusedParameters
- verbatimModuleSyntax, isolatedModules
- Path alias: @core/*, @modules/*, @plugins/*, @shared/*

### 3. `.eslintrc.cjs`
- Parser @typescript-eslint dengan type-checking
- Extends: eslint:recommended, recommended-requiring-type-checking, plugin:import/recommended, prettier
- Rules kunci:
  - no-explicit-any: error
  - no-floating-promises: error
  - consistent-type-imports: error
  - import/no-default-export: error (kecuali config & entrypoint)
  - import/no-cycle: error
  - **no-restricted-imports**: blokir import lintas `adapters/*` antar modul
  - no-console: error (allow warn/error)

### 4. `.prettierrc.json`
- semi: true, singleQuote: true, trailingComma: 'all', printWidth: 100, tabWidth: 2

### 5. `.npmrc`
```
strict-peer-dependencies=true
auto-install-peers=false
shamefully-hoist=false
node-linker=isolated
engine-strict=true
```

### 6. `Dockerfile`
Multi-stage, multi-target. Stage:
- `deps` — pnpm install dev
- `prisma` — generate client
- `build` — tsc
- `prod-deps` — pnpm install prod-only
- `api` target — runtime HTTP
- `worker` target — runtime queue
- `corepack enable && corepack prepare pnpm@9.0.0 --activate`
- Non-root user, tini sebagai init
- Alpine base

### 7. `docker-compose.yml`
- Postgres 15 + Redis 7
- Service app di profile `full` (default tidak start agar dev jalan via pnpm/make)

### 8. `Makefile`
Commands:
- `help` — daftar commands
- `install` — pnpm install + prisma generate
- `start` — docker compose up postgres+redis + prisma generate + migrate (DB persist)
- `start-fresh` — docker compose down -v + start + migrate + seed
- `stop`, `clean`, `restart`, `logs`, `ps`
- `prisma-generate`, `db-migrate`, `db-reset`, `db-seed`, `db-studio`
- `dev-api`, `dev-worker`
- `lint`, `lint-fix`, `format`, `format-check`, `typecheck`
- `test`, `test-unit`, `test-integration`, `test-coverage`
- `check` — lint + format-check + typecheck + unit test
- `pre-commit` — gate sebelum commit
- `commit MSG="..."` — pre-commit + git add + git commit
- `build`, `docker-build`

### 9. `README.md`
Sections:
- Tahap project saat ini
- Link ke CLAUDE.md, docs/PROJECT_STRUCTURE.md, docs/ARCHITECTURE.md
- Tech stack table
- Pattern arsitektur (Hexagonal Disiplin + 1-service-1-db)
- Quick start (via make commands)
- Daftar make commands penting
- Testing, Build & deploy, Security ringkas

### 10. `CLAUDE.md`
Lengkap, Bahasa Indonesia. Sections (urutan):
1. Cara membaca dokumen (WAJIB/DEFAULT/HINDARI)
2. Konteks repo
3. Tech stack (table)
4. Struktur folder (link ke PROJECT_STRUCTURE.md)
5. **Hexagonal Disiplin — kapan port, kapan tidak** (TABEL eksplisit)
6. Coding standards (TS strict, naming convention, no-any, error handling)
7. Security ringkasan
8. Logging & observability
9. Testing rules
10. Common patterns (Fastify route, Bull job, port+adapter, service)
11. **Anti-patterns** (table ❌ vs ✅)
12. Workflow: kapan AI lanjut, kapan tanya user
13. Git & commit (conventional commits)
14. PR checklist

### 11. `docs/PROJECT_STRUCTURE.md`
**1 file aja** yang menjelaskan SEMUA folder + isinya — JANGAN bikin per-folder README.

### 12. `docs/ARCHITECTURE.md`
Sections:
- Konteks
- Service topology (api + worker)
- Pattern: Hexagonal Disiplin + rationale
- Single Database
- Observability
- Non-functional defaults
- Rationale rekap (table ke ADR)
- Glossary

### 13. ADR (`docs/decisions/`)
Minimal buat semua ADR yang disebutkan di struktur. Format pakai 0000-template.md. README.md daftar ADR.

### 14. `docs/MODULE_TEMPLATE.md`
File-by-file convention per modul. Contoh full untuk modul standar + dengan port.

### 15. `.env.example`
Generic baseline:
- Runtime (NODE_ENV, LOG_LEVEL, TZ)
- HTTP Server (PORT, HOST, BASE_URL, CORS_ORIGIN)
- DATABASE_URL
- REDIS_URL
- Security (JWT secrets, ENCRYPTION_KEY)
- Rate limit
- Observability (Sentry)
- Worker concurrency
- Komentar bawah untuk service-specific (uncomment + sesuaikan)

### 16. `.github/workflows/ci.yml`
Jobs: lint-and-typecheck, test-unit, test-integration (dengan postgres+redis service), build (docker per target)

### 17. `.claude/settings.json`
- permissions allow: pnpm, node, tsx, prisma, docker, make, ls/cat/find/grep, git read
- permissions deny: rm -rf /, git push --force, git reset --hard, prisma migrate reset, docker volume rm
- mcpServers: sequential-thinking, postgres, serena, sentry

### 18. Folder skeleton
Buat folder kosong dengan `.gitkeep`.
Bikin `src/modules/_template/` dengan skeleton lengkap (routes, service, repository, schema, types, events, jobs, port, adapter, tests). JANGAN edit `_template/` setelah ini.

## Yang TIDAK perlu dibuat sekarang

- Install pnpm dependencies (kosongkan di package.json)
- Implementasi business logic
- Modul spesifik (tinggal `_template/` saja sebagai referensi)
- Migration Prisma (cuma schema.prisma dengan 1 model contoh)

## Bahasa & branding

- Semua dokumen panduan (README, CLAUDE.md, docs/*.md): **Bahasa Indonesia**
- Semua kode + identifier + comment di code: **English**
- Branding: "Qooma" konsisten

## Final checklist

- [ ] Semua file di struktur dibuat
- [ ] Dokumen konsisten dengan convention Qooma
- [ ] README + CLAUDE.md menjadi entry point yang lengkap
- [ ] ADR ditulis dengan rationale jelas
- [ ] Makefile siap (make start, make commit, dll)
- [ ] Tidak ada placeholder "TBD" tanpa konteks (selalu link ke aktionable TODO)
- [ ] Lint config + Prettier config sudah set sesuai standard
- [ ] Dockerfile multi-stage siap
- [ ] CI workflow siap

Mulai dari batch struktur folder, lalu config files, lalu README + CLAUDE.md, lalu architecture docs, lalu ADRs, lalu module template, terakhir verifikasi.
````

## Cara pakai prompt ini

1. Buat repo kosong baru: `mkdir qooma-<new-service> && cd qooma-<new-service> && git init`
2. Buka Claude Code di repo tersebut
3. Copy seluruh blok di atas (mulai dari ` ```` ` sampai ` ```` `)
4. Replace `<<SERVICE_NAME>>` dan `<<SERVICE_PURPOSE>>` dengan nilai sebenarnya
5. Paste ke Claude
6. Verifikasi output sesuai checklist
7. Setelah scaffold siap, mulai isi business logic per modul (lihat `docs/MODULE_TEMPLATE.md`)

## Yang BUKAN scope prompt ini

Prompt ini scaffold STRUKTUR, BUKAN implementasi. Setelah scaffolding selesai:
- Install dependencies sesuai kebutuhan
- Implement business logic modul per modul
- Bikin schema Prisma sesuai entity service
- Tulis test
