# Proposal: phase-0-skeleton

## Why

ShopFlow has specifications, an empty folder tree and a CI job that checks the repository structure. No service starts. No test runs. The team cannot show a working system, and the pipeline cannot catch an integration error.

Phase 0 gives the project a walking skeleton. One command starts the system. Each layer has a health endpoint. The pipeline runs one test at each available level. SRS C10, phase 0, defines this step. Every later change adds to this base.

This change implements no business requirement.

## What Changes

- **Workspace.** One pnpm workspace for `services/web`, `services/api` and `tests/e2e`. Node.js, TypeScript, ESLint and Prettier are pinned at the root. TypeScript runs in strict mode.
- **Web UI (`services/web`).** A start page at `/`. The route handler `GET /api/health` returns HTTP 200. A rewrite redirects `GET /health` to `/api/health`, so NFR-008 is satisfied for the Web UI. The build uses `output: "standalone"` with `outputFileTracingRoot` set to the repository root. A multi-stage Dockerfile serves the standalone output with `HOSTNAME=0.0.0.0`.
- **API (`services/api`).** A Fastify server. `GET /health` returns HTTP 200 only after a PostgreSQL ping. Otherwise it returns HTTP 503 (NFR-008). The API writes structured JSON logs with a correlation ID (NFR-007). It reads configuration from environment variables (NFR-006). A Dockerfile builds and runs it. No ORM and no migration tool.
- **Infrastructure (`infra/compose`).** `docker-compose.yml` with web, api, PostgreSQL 18.7, Kafka (single node, KRaft) and Mailpit. Every container has a healthcheck. Every image uses a pinned tag. An init SQL script creates the schemas `api`, `orders`, `inventory`, `notification` and `assistant` (ADR-2). `.env.example` holds development-only values. `.env` stays in `.gitignore`. `docker compose up --wait` starts the complete system (NFR-009).
- **Tests.** One trivial test at each available level. The title of each test starts with the requirement ID.
  - Unit (Vitest, `services/api`): NFR-007.
  - Component (Vitest, Fastify `inject`, Testcontainers PostgreSQL, `services/api`): NFR-008. HTTP 200 with a database. HTTP 503 without it. Also an automated check for the correlation ID behavior.
  - UI component (React Testing Library, `services/web`): QA-019, with a code comment that phase 1 replaces it with a WEB requirement.
  - E2E smoke (Playwright, Chromium, `tests/e2e`): NFR-009. The start page opens against the system started by Docker Compose.
  - The API level (REST Assured, `tests/api`) is not part of phase 0.
- **CI (`.github/workflows/pr.yml`).** `ci-ok` stays the aggregating job. New jobs: `lint`, `unit-and-component`, `ui-component`, `compose-smoke`, `e2e-smoke`. Every new job is in `needs` of `ci-ok`. The pipeline caches pnpm downloads. Each job sets minimal `permissions`. On failure, the pipeline saves the test report, the service logs and the Playwright trace (QA-008). The `smoke` job pins the OpenSpec CLI version instead of using `@latest`.
- **Documentation.** `docs/adr/0001-toolchain.md` records each version, the source and the reason. A Commands section is added to `AGENTS.md`. A root `README.md` gives an overview and the quick-start commands.

## Toolchain Versions

Checked on 2026-11-21 against the official sources. The ADR holds the source URLs and the alternatives.

| Item | Pin | Note |
| --- | --- | --- |
| Node.js | 26.13.1 | Active LTS, codename "Lithium". |
| pnpm | 12.21.0 | `latest` on the npm registry. |
| TypeScript | 6.0.3 | Latest 6.0.x. See OQ-1: `latest` is 7.0.2, but `typescript-eslint` 8.73.0 declares `<6.1.0`. |
| Next.js | 16.4.6 | App Router. |
| React / React DOM | 19.3.1 | Peer range of Next.js 16.4.6. |
| Fastify | 5.12.8 | |
| Vitest | 5.1.1 | |
| Vite | 8.3.8 | Peer of Vitest 5 and `@vitejs/plugin-react` 6. |
| `@testing-library/react` | 16.3.3 | |
| `@testing-library/jest-dom` | 8.0.0 | |
| `@testing-library/dom` | 10.4.2 | Peer of React Testing Library. |
| jsdom | 31.0.1 | |
| `@playwright/test` | 1.65.1 | Chromium only in phase 0. |
| ESLint | 10.15.0 | Flat config only. |
| `eslint-config-next` | 16.4.6 | Same version as Next.js. |
| `typescript-eslint` | 8.73.0 | |
| Prettier | 3.10.1 | |
| `testcontainers` | 12.2.2 | |
| `@testcontainers/postgresql` | 12.2.2 | The main package does not export `PostgreSqlContainer`. |
| `pg` | 8.23.1 | |
| `@types/node` | 26.6.6 | |
| Docker: `postgres` | `18.7` | Latest 18.x. `PGDATA=/var/lib/postgresql/18/docker`. A pgvector build for PG 18 is verified: `pgvector/pgvector:0.8.7-pg18-trixie`. Phase 0 uses plain PostgreSQL; the Assistant phase can switch to the pgvector image without a schema change. |
| Docker: `apache/kafka` | `4.4.0` | Single node, KRaft. Healthcheck uses `start_period: 30s` and `retries: 10`. |
| Docker: `axllent/mailpit` | `v1.34.0` | |
| Docker: `node` | `26.13.1-alpine3.24` | Build stage and runtime base. |

## Capabilities

### New Capabilities

None. Phase 0 creates infrastructure, test scaffolding and two health endpoints. The SRS already defines this behavior. A new capability would duplicate NFR-008, NFR-009 and the QA requirements.

### Modified Capabilities

None. This change does not add, remove or change a requirement. The change sets `skip_specs: true` in `.openspec.yaml`.

Phase 0 exercises these existing requirements. It closes none of them.

- **NFR-006, NFR-007, NFR-008, NFR-009:** environment configuration, JSON logs with a correlation ID, health endpoints, Compose startup.
- **QA-001, QA-008, QA-019:** lint, unit and component jobs, failure artifacts, the first UI component test. Phase 0 has no contract tests and no UI integration tests, so QA-001 and QA-019 stay open.
- **QA-003:** `ci-ok` is the single required check. Branch protection is repository configuration, not code.

## Out of Scope

- Every requirement of the capabilities `auth`, `catalog`, `currency`, `ordering`, `inventory`, `notification`, `web` and `assistant`. No business endpoint, page, table, seed row, Event, producer or consumer.
- An ORM and a migration tool (NFR-011). The init SQL creates empty schemas only. A later change adds versioned migrations.
- Contract tests, Pact, OpenAPI files, MSW, REST Assured, `tests/api/`, multi-service integration tests, `main.yml` and `nightly.yml`.
- The Assistant, Ollama and pgvector. They stay in an optional Compose profile in a later phase.
- The reset endpoint or script (NFR-012).
- Branch protection and Jira setup. These are manual steps.
- Changes to `openspec/specs/`, `contracts/` and `tests/api/`. This change creates files in `tests/e2e/` only.

## Impact

**New files.** `services/web/*`, `services/api/*`, `infra/compose/*`, `tests/e2e/*`, `docs/adr/0001-toolchain.md`, `README.md`, and the workspace root files: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc.json`, `.prettierignore`, `.nvmrc`, `.editorconfig`, `.dockerignore`.

**Modified files.** `.github/workflows/pr.yml`, `AGENTS.md` (Commands section only).

**Local run.** `docker compose -f infra/compose/docker-compose.yml up --build --wait` starts five containers. Ports: Web UI 3000, API 3001, PostgreSQL 5432, Kafka 9092, Mailpit 8025 (HTTP) and 1025 (SMTP).

**CI run.** `pr.yml` runs six jobs (`smoke`, `lint`, `unit-and-component`, `ui-component`, `compose-smoke`, `e2e-smoke`) plus the `ci-ok` aggregator.

**Risks.**
- Two jobs build the images. The PR pipeline can exceed the 10-minute target in SRS A4. Mitigation: pnpm cache and Playwright browser cache. A shared image build is a later change.
- Docker Hub rate limits can stop `compose-smoke`. Mitigation: pinned tags and a retry on the pull.
- Testcontainers needs a Docker socket. `ubuntu-latest` provides one.
- Kafka and Next.js make the first build slow. Mitigation: Docker layer order puts the lockfile before the source.

## Decisions

All open questions from the first draft are resolved.

- **OQ-1 TypeScript.** Accept TypeScript 6.0.3. The `latest` npm tag is 7.0.2, but `typescript-eslint` 8.73.0 (a dependency of `eslint-config-next` 16.4.6) declares `typescript >=4.8.4 <6.1.0`. The ADR records this.
- **OQ-2 Web UI health route.** Keep `GET /api/health` as the implementation route. Add a rewrite from `GET /health` to `/api/health`, so NFR-008 is satisfied for the Web UI.
- **OQ-3 UI component test ID.** Accept `QA-019` for the phase 0 UI component test. Add a code comment that phase 1 replaces this ID with a WEB requirement.
- **OQ-4 Node.js.** Accept Node.js 26.13.1. The Node.js releases page lists v26 LTS with codename "Lithium" and marks v26.13.1 as the Latest LTS. It is the current Active LTS.
- **OQ-5 PostgreSQL.** Use PostgreSQL 18.7. A pgvector build for PG 18 is verified (`pgvector/pgvector:0.8.7-pg18-trixie` via `docker manifest inspect`). Phase 0 uses plain PostgreSQL; the Assistant phase can switch to the pgvector image without changing the schema.
- **OQ-6 `.env`.** Accept development defaults in the Compose file, using the `${VAR:-default}` form. The `.env.example` documents overridable values. The ADR records the NFR-006 interpretation: development defaults are not secrets, and the repository contains no credential.
- **OQ-7 QA-001.** Accept that QA-001 remains open in phase 0 because there are no contract tests.
- **OQ-8 `smoke` job.** Keep the existing `smoke` job in `needs` of `ci-ok`. Pin the OpenSpec CLI to the current stable version (2.1.1) instead of `@latest`.

## Assumptions

- **A-1 Start page.** No requirement defines the start page. It has a heading and a plain link. The test uses `data-testid="start-page"`.
- **A-2 Ports and rewrite.** Web UI 3000, API 3001. The API uses 3001 to avoid a clash with Next.js. The Web UI rewrites `GET /health` to `/api/health`.
- **A-3 Kafka listeners.** One internal listener (`kafka:29092`) and one host listener (`localhost:9092`). Phase 0 has no producer or consumer.
- **A-4 Mailpit healthcheck.** The image has the subcommand `/mailpit readyz`. The healthcheck uses it.
- **A-5 pnpm install and pgvector.** The Node.js 26 images do not ship Corepack. The Dockerfiles and the developer setup install pnpm with `npm install -g pnpm@12.21.0`. The Assistant phase can use `pgvector/pgvector:0.8.7-pg18-trixie` with the existing `assistant` schema.
- **A-6 GitHub Actions.** Actions use major tags: `actions/checkout@v7`, `actions/setup-node@v7`, `pnpm/action-setup@v6`, `actions/upload-artifact@v7`. The latest release-page versions are 7.0.1, 7.1.0, 6.1.1 and 7.0.2. This follows the existing convention in the repository.
- **A-7 Migrations.** Phase 0 has no migration tool. NFR-011 is deferred to the change that adds the first table.
- **A-8 Separate jobs.** `compose-smoke` and `e2e-smoke` are separate jobs. Each job starts its own Compose system.
