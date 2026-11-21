# ShopFlow

ShopFlow is a multi-service shop platform. The repository contains the Web UI, the API, the infrastructure definitions and the end-to-end tests. Phase 0 gives the project a walking skeleton: one command starts the system, each layer exposes a health endpoint, and the pipeline runs one test at each available level.

## Architecture

- **Web UI** (`services/web`): Next.js 16 application. Serves the start page at `/` and a health route at `/api/health`. `GET /health` rewrites to `/api/health`.
- **API** (`services/api`): Fastify 5 service. `GET /health` returns HTTP 200 when PostgreSQL answers and HTTP 503 when it does not. Logs are structured JSON with a correlation ID.
- **Infrastructure** (`infra/compose`): Docker Compose stack with PostgreSQL 18.7, Kafka 4.4.0 (single node, KRaft) and Mailpit v1.34.0.
- **E2E tests** (`tests/e2e`): Playwright smoke test that opens the start page in Chromium.

## Quick start

Start the complete system with Docker Compose:

```sh
docker compose -f infra/compose/docker-compose.yml up --wait
```

Then open:

- Web UI: <http://localhost:3000>
- API health: <http://localhost:3001/health>
- Mailpit: <http://localhost:8025>

Stop the system:

```sh
docker compose -f infra/compose/docker-compose.yml down -v
```

## Development

Install dependencies:

```sh
pnpm install
```

Run lint, formatting and type checks:

```sh
pnpm lint
pnpm format:check
pnpm typecheck
```

Run all tests:

```sh
pnpm test
pnpm --filter @shopflow/e2e test:e2e
```

## Documentation

- `docs/srs.md` – Software Requirements Specification.
- `docs/adr/0001-toolchain.md` – Pinned toolchain versions and decisions.
- `AGENTS.md` – Working agreement and common commands for agents.
