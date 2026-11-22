# Design

## Context

Phase 0 is merged. The API is a Fastify 5.12.8 service with `GET /health` only. The Web UI is a Next.js 16.4.6 shell with `GET /health` only. Docker Compose starts PostgreSQL 18.7, Kafka 4.4.0, Mailpit 1.34.0, the API and the Web UI. The `api` schema in PostgreSQL is empty. No migration tool runs yet.

Phase 1 needs four parallel work streams: auth API, catalog API, web auth and web catalog. The streams share one HTTP contract. See `proposal.md` for the motivation.

Constraints:

- The QA owner owns `contracts/`, `tests/` and `openspec/specs/`. This change writes only to `contracts/openapi/` and this change directory.
- Requirement IDs are stable. AUTH-008 is the only new requirement. It stays in the delta draft for approval.
- A test is derived from a requirement. The contract and the acceptance scenarios come before the code.
- `docker compose up` must stay one command (NFR-009).

## Goals / Non-Goals

**Goals:**

- One OpenAPI 3.1.1 file that the API, the Web UI, the mocks and the tests can all use.
- One error format for HTTP 400, 401, 404 and 409.
- A split where each change is small, independently reviewable and independently verifiable.
- A CI plan that fails on contract drift before the code is merged.
- Test notes that map each in-scope requirement to its verification levels.

**Non-Goals:**

- Application code, tests, workflow edits, migrations or seeds. All of these belong to later changes.
- Stock status, currency conversion, orders, Kafka events and the Inventory Service.
- The eight technical choices (ORM, hashing, JWT library, validation, migrations, seed, data fetching, MSW). They are listed in `open-questions.md` and need approval.
- Answers to the requirement ambiguities. They are proposals in `open-questions.md`.

## Decisions

### D-1: Contract file and format

`contracts/openapi/api.yaml` is one OpenAPI 3.1.1 file. It holds six operations, so a multi-file bundle adds no value yet. OpenAPI 3.1.1 aligns the schema objects with JSON Schema 2020-12. That keeps one schema dialect in the contract and in the validators.

The file is the single source of truth for request and response shapes. The API implements it. The Web UI generates types from it. The MSW handlers are checked against it. The API tests validate responses against it.

Alternatives: OpenAPI 3.0.3 uses an older schema dialect and cannot express `examples` and nullability the same way. A split bundle is premature for six operations.

### D-2: One error format

All client error responses for HTTP 400, 401, 404 and 409 use RFC 9457 Problem Details with the media type `application/problem+json`.

| Member | Type | Meaning |
| --- | --- | --- |
| `type` | string, URI | A stable problem type, for example `https://shopflow.example/problems/validation-error` |
| `title` | string | A short summary. It is the same for each problem type. |
| `status` | integer | The HTTP status code. |
| `detail` | string | A message for the caller. It contains no technical detail (WEB-004, NFR-005). |
| `instance` | string, optional | The request path. |
| `errors` | array, optional | Field errors. Each item has `pointer` (JSON Pointer), `code` and `message`. |

Problem types: `validation-error` (400), `unauthorized` (401), `not-found` (404), `conflict` (409).

AUTH-003 needs a field error. The `errors` array carries it. The same schema serves all statuses, so a client has one parser.

`GET /health` keeps the phase 0 body: `{ "status": "ok" }` for 200 and `{ "status": "error" }` for 503. NFR-010 forbids a change to an existing field, so the health endpoint does not use the Problem format. The Problem format covers the four statuses that carry a client error.

Alternatives: a custom `{ error: { code, message } }` shape duplicates what RFC 9457 already standardises. The Fastify default error body exposes implementation detail and risks a stack trace in a response (NFR-005).

### D-3: List parameters and response

`GET /products` accepts:

| Parameter | Type | Default | Proposed limit |
| --- | --- | --- | --- |
| `page` | integer, 1-based | 1 | minimum 1 |
| `pageSize` | integer | 10 (CAT-002) | maximum 100 (Q-04) |
| `q` | string | absent | maximum 100 characters |

The response is `{ items, page, pageSize, total, totalPages }`. `items` holds the product objects. The default order is `sku` ascending, so pagination is stable (Q-05). Search is a case-insensitive substring match on the product name (CAT-003, Q-06).

Alternatives: cursor pagination is more robust for large data sets, but the seeded catalog has 24 products and CAT-002 fixes a page model. Page-number pagination matches the requirement.

### D-4: Authentication transport

`POST /auth/register` returns HTTP 201 and `POST /auth/login` returns HTTP 200. Both return the same `AuthResponse`:

```json
{
  "accessToken": "<token>",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "user": { "id": "...", "email": "...", "role": "CUSTOMER" }
}
```

`GET /auth/me` reads `Authorization: Bearer <token>` and returns the `User` object. The token is a JWT. The proposed claims are `sub`, `email`, `role`, `iat`, `exp` and `iss` (Q-03). A missing, invalid or expired token returns HTTP 401 (AUTH-005).

The role is exposed in the `user` object as `CUSTOMER` or `ADMIN` (Q-10). The client uses it only to hide controls. The API enforces authorization.

Alternatives: an httpOnly cookie set by the API needs CSRF protection and cross-origin configuration for the Compose setup. Q-23 keeps the cookie in the Web UI instead. An opaque token needs a session table and a lookup on each request.

### D-5: Price representation

`Money` is `{ "amount": <integer>, "currency": "EUR" }`. `amount` is a whole number of minor units (cents). This avoids floating point rounding. The contract states the unit in the schema description and in the example. The final choice is Q-08.

Alternatives: a decimal string (`"19.99"`) is readable but needs parsing on every client. A JSON number of euros introduces binary floating point.

### D-6: Endpoint status matrix

| Operation | Auth | Success | Error responses |
| --- | --- | --- | --- |
| `POST /auth/register` | none | 201 `AuthResponse` | 400 `validation-error` (AUTH-003), 409 `conflict` (AUTH-002) |
| `POST /auth/login` | none | 200 `AuthResponse` | 400 `validation-error`, 401 `unauthorized` (bad credentials, Q-11) |
| `GET /auth/me` | bearer | 200 `User` | 401 `unauthorized` (AUTH-005, AUTH-008) |
| `GET /products` | none | 200 `ProductPage` | 400 `validation-error` (bad `page`, `pageSize` or `q`) |
| `GET /products/{sku}` | none | 200 `Product` | 404 `not-found` (CAT-004) |
| `GET /health` | none | 200 `{ "status": "ok" }` | 503 `{ "status": "error" }` (NFR-008) |

`GET /health` already exists in phase 0. The contract documents it and adds no behaviour.

### D-7: Change split

Phase 1 becomes four implementation changes plus one CI change.

| # | Change | Type | Scope | Requirements | Depends on | Parallel |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `phase-1-contracts` | planning | This contract, the AUTH-008 draft, the open questions, the plan | AUTH-008 (draft) | Phase 0 | No. It is the base. |
| 2 | `auth-api` | feature | `users` table, migration, register, login, me, password hash, token | AUTH-001..008 | 1 | No. It is the first code change. |
| 3 | `catalog-api` | feature | `products` table, migration, seed, list, search, pagination, detail | CAT-001..004 | 1 | No against 2. Both touch `services/api` and one migration chain. Run after 2. |
| 4 | `web-auth` | feature | Login page, registration page, token storage, error states | AUTH-001..004, WEB-004, WEB-006, WEB-008, WEB-009, WEB-010 | 1 to start with MSW; 2 for E2E | Yes, with 3 and 5, after 2 starts. |
| 5 | `web-catalog` | feature | Product list page, product detail page, search, pagination | CAT-002..005 (see E-2), WEB-001 (see E-1), WEB-004, WEB-006, WEB-008, WEB-009, WEB-010 | 1 to start with MSW; 3 for E2E | Yes, with 3 and 4, after 2 starts. |
| 6 | `ci-contract-gates` | ci | Contract lint, MSW contract check, migration check | QA-019, QA-020 | 1 | Yes. It has no OpenSpec change. |

Suggested Jira story titles:

- 2: "Auth API: register, login and current user"
- 3: "Catalog API: product list, search and product detail"
- 4: "Web auth: login and registration pages"
- 5: "Web catalog: product list and product detail pages"
- 6: "CI: contract lint and MSW contract check"

Rationale for the order: the contract unblocks all streams. The two API changes are sequential because they share one service, one dependency set and one migration chain. The two web changes can start on the contract with MSW and finish E2E after their API change lands.

WEB-004, WEB-006, WEB-008, WEB-009 and WEB-010 apply to each web change for its own pages. WEB-001 is accepted at the end of `web-catalog`, because it names the page set.

Alternatives: one large `phase-1` change. It would mix four service areas in one review and one migration chain, and a failing test would not show which slice broke.

### D-8: CI plan

Current jobs: `smoke`, `lint`, `unit-and-component`, `ui-component`, `compose-smoke`, `e2e-smoke`, `ci-ok`. The plan changes them as follows. No workflow file changes in this change.

| Job | Change | What it checks | Estimated added run time |
| --- | --- | --- | --- |
| `smoke` | Add a step | `openspec validate <name> --strict` for each active change. It fails on a malformed delta. | 10–20 s |
| `contract-lint` (new) | New job, needs `pnpm install` | `@redocly/cli@2.82.0 lint contracts/openapi/api.yaml --config contracts/openapi/redocly.yaml`. It fails on a broken reference, a missing response or a schema error. | 20–30 s |
| `unit-and-component` | No structural change | The existing job runs the new API unit and component tests. Component tests use a real PostgreSQL through Testcontainers. | 60–120 s |
| `ui-component` | Add a step | Generate types with `openapi-typescript` and typecheck the MSW handlers with `openapi-msw`. An unknown path, status or body type fails the build (QA-020). | 30–45 s |
| `db-migration` (new) | New job with a PostgreSQL 18.7 service | Apply the migrations to an empty database. Apply them a second time. Run the seed twice. Check that the row count is stable and at least 20 (NFR-011, CAT-001). | 90–120 s |
| `compose-smoke` | Add a step | After `--wait`, call `GET /health` and `GET /products?pageSize=100`. Check HTTP 200 and at least 20 items. It proves the migration and the seed ran in Compose. | 10–15 s |
| `api-tests` (new, `main` only) | New job after `docker compose up` | REST Assured tests in `tests/api/`. Each response is checked against the OpenAPI file (QA-015, QA-017, QA-018). | 3–5 min |
| `e2e-smoke` | Extend the suite | Four pages: product list, product detail, login, registration. The test creates its own account (QA-011). | 60–90 s |
| `ci-ok` | Add the new jobs to `needs` | The merge gate includes the new checks. | 0 |

Expected effect on wall-clock time: a pull request adds about 2–3 minutes because the new jobs run in parallel. A merge to `main` adds about 4–6 minutes for the API tests.

Alternatives: run the contract lint inside `lint`. A separate job gives a clear check name and runs even when the application code does not change.

### D-9: Test notes

The verification codes come from the SRS. `U` = unit, `C` = component, `K` = contract, `I` = integration, `A` = API, `W` = UI below E2E, `E` = E2E, `N` = non-functional, `V` = AI evaluation, `D` = demonstration.

| Requirement | Code | Suggested levels | What the test asserts |
| --- | --- | --- | --- |
| AUTH-001 | M \| C,K | Component, contract | A valid registration returns 201, a token and a user. The response matches `AuthResponse`. |
| AUTH-002 | M \| C | Component | A duplicate email returns 409 with `conflict`. |
| AUTH-003 | M \| U,C | Unit, component | The password rule rejects fewer than 8 characters. The API returns 400 with a `pointer` to `/password`. |
| AUTH-004 | M \| C | Component | A valid login returns a token with `exp - iat = 3600`. |
| AUTH-005 | M \| C | Component | Each protected endpoint returns 401 for a missing, an invalid and an expired token. |
| AUTH-006 | M \| C | Component | The stored value is a hash. Two equal passwords give different hashes. The plain password is absent. |
| AUTH-007 | M \| C | Component | A new account has the role `CUSTOMER`. |
| AUTH-008 (draft) | M \| C,K | Component, contract | A valid token returns 200 with `id`, `email` and `role`. A bad token returns 401 with `Problem`. |
| CAT-001 | M \| C,D | Component, demonstration | The seed is idempotent. A second start keeps at least 20 products. |
| CAT-002 | M \| C,K | Component, contract | No `pageSize` returns 10 items. `pageSize` and `page` change the page. The response matches `ProductPage`. |
| CAT-003 | S \| U,C | Unit, component | The search predicate matches a substring of the name. The API returns only matching products. |
| CAT-004 | M \| C | Component | An unknown SKU returns 404 with `not-found`. |
| CAT-005 | M \| E | E2E | Blocked by E-2. Phase 1 asserts name and price only. |
| WEB-001 | M \| E | E2E | Four of the eight pages exist. See E-1. |
| WEB-004 | M \| W,E | Component with MSW, E2E | A 400, 401, 404 or 409 response shows a message with no technical detail. |
| WEB-006 | M \| D | Demonstration, component | Every interactive element has a stable `data-testid`. |
| WEB-008 | M \| W | Component with MSW | Each data component has loading, error, empty and filled tests. |
| WEB-009 | S \| W,D | Unit, demonstration | Cart total, price format and form validation live in plain modules. |
| WEB-010 | M \| W | Component with MSW | The handlers are typed from the OpenAPI file and match it. |
| NFR-005 | M \| C | Component | No response contains a stack trace, a password hash or an internal URL. |
| NFR-011 | M \| C | Component | The migration creates the `api` schema objects on an empty database. A second run changes nothing. |
| QA-019 | M \| D | Demonstration | A pull request runs the UI unit, component and integration tests. |
| QA-020 | S \| D | Demonstration | A handler that does not match the OpenAPI file fails CI. |

The tests themselves are written in separate changes, by the QA owner or by an agent from the QA owner's description.

### D-10: Scope exceptions

Two in-scope requirements cannot pass as written in phase 1. This change does not rewrite them. It records the gap for a decision.

- **E-1, WEB-001.** The requirement lists eight pages. Phase 1 delivers four: product list, product detail, login, registration. Proposal: phase 1 delivers four pages. WEB-001 passes only at the end of phase 2. No delta is needed. The traceability table marks the four missing pages as deferred.
- **E-2, CAT-005.** The requirement shows the stock status. The status comes from the Inventory Service (CAT-006), which is out of scope. Proposal: the phase 1 product list shows the name and the price. CAT-005 stays open until the inventory change. Do not add a placeholder status.

Both proposals need the QA owner's approval. An alternative is a separate change that narrows the requirement. That change would need its own proposal because it modifies an existing requirement.

## Risks / Trade-offs

- [The contract is a draft] → Mark every proposed answer with its open-question ID. The implementation changes wait for approval. A change to a shape is cheap before the code exists.
- [Four streams read the contract differently] → One error schema, one `User` schema and one `AuthResponse` schema. The contract lint and the response validation catch drift.
- [The two API changes conflict in one service] → Run them sequentially. Each change owns one migration and one route group.
- [MSW handlers drift from the contract] → Generate the handler types from the OpenAPI file and fail CI on a mismatch (QA-020).
- [The AUTH-008 draft is merged before approval] → Keep it in the change directory. `openspec/specs/` is unchanged. Archiving waits for the QA owner's review.
- [A proposed answer is wrong] → The proposal is visible in the contract description and in `open-questions.md`. The QA owner can reject it without touching the code.

## Migration Plan

This change adds files only. No runtime change. Rollback is a revert of the pull request.

## Open Questions

All open questions are in `open-questions.md`: 23 ambiguities and process questions, plus 8 technical decisions. Each item has options, a proposed answer and an owner.

One process question needs attention before the branch is pushed: the key `KAN-10` is already the merged repository-conventions story (pull request #4). The brief gives `KAN-10` for this story too. The branch and the commit use the key as given. The QA owner must confirm the key or give the correct one. See `open-questions.md` Q-22.
