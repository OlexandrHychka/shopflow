# Design

## Context

Phase 0 is merged. The API is a Fastify 5.12.8 service with `GET /health` only. The Web UI is a Next.js 16.4.6 shell with `GET /health` only. Docker Compose starts PostgreSQL 18.7, Kafka 4.4.0, Mailpit 1.34.0, the API and the Web UI. The `api` schema in PostgreSQL is empty. No migration tool runs yet.

Phase 1 needs four parallel work streams: auth API, catalog API, web auth and web catalog. The streams share one HTTP contract. See `proposal.md` for the motivation.

Constraints:

- The QA owner owns `contracts/`, `tests/` and `openspec/specs/`. This change writes only to `contracts/openapi/` and this change directory.
- Requirement IDs are stable. AUTH-008 is the only new requirement. The QA owner approved it on 25 November 2026 (D-12).
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
- The eight technical choices (ORM, hashing, JWT library, validation, migrations, seed, data fetching, MSW). They are in `open-questions.md`. All eight are approved; six of the answers carry recorded conditions.
- Answers to the requirement ambiguities. They are proposals in `open-questions.md`. All 29 are decided; the six conditional answers carry recorded conditions.

## Decisions

### D-1: Contract file and format

`contracts/openapi/api.yaml` is one OpenAPI 3.1.1 file. It holds six operations, so a multi-file bundle adds no value yet. OpenAPI 3.1.1 aligns the schema objects with JSON Schema 2020-12. That keeps one schema dialect in the contract and in the validators.

The file is the single source of truth for request and response shapes. The API implements it. The Web UI generates types from it. The MSW handlers are checked against it. The API tests validate responses against it.

Alternatives: OpenAPI 3.0.3 uses an older schema dialect and cannot express `examples` and nullability the same way. A split bundle is premature for six operations.

### D-2: One error format

All error responses use RFC 9457 Problem Details with the media type `application/problem+json`, except the HTTP 503 of `GET /health` (Q-15, Q-26).

| Member | Type | Meaning |
| --- | --- | --- |
| `type` | `ProblemType` | A closed set: `validation-error` (400), `unauthorized` (401), `not-found` (404), `method-not-allowed` (405), `conflict` (409), `payload-too-large` (413), `unsupported-media-type` (415), `internal-error` (500) |
| `title` | string | A short summary. It is the same for each problem type. |
| `status` | integer | The HTTP status code. |
| `detail` | string | A message for the caller. It contains no technical detail (WEB-004, NFR-005). |
| `instance` | string, optional | The request path. |
| `errors` | array, optional | Field errors. Each item has `pointer` (JSON Pointer), `code`, `message` and `source`. |

The problem type comes from one `ProblemType` schema, so a value outside the set fails the lint (Q-26). Every error response declares the `x-correlation-id` header in one `CorrelationId` component, so QA-017 can check it.

AUTH-003 needs a field error. The `errors` array carries it. The same schema serves all statuses, so a client has one parser. `FieldError.code` uses one closed vocabulary in one schema: `required`, `too_short`, `too_long`, `invalid_format`, `out_of_range` and `unknown_field` (Q-25). A new code needs a contract change. A numeric bound uses `out_of_range`; a string length uses `too_short` or `too_long` (Q-24).

An unexpected error returns HTTP 500 with `type: ".../internal-error"` and a generic `detail`. The body has no stack trace, no SQL and no internal URL (Q-26).

Framework errors use the same Problem format. Each operation lists HTTP 405. The two POST operations also list HTTP 413 and HTTP 415, because they carry a body. An unknown route returns HTTP 404 with `type: not-found`; no operation owns that response, so the `NotFound` component documents it (Q-26).

`GET /health` keeps the phase 0 body: `{ "status": "ok" }` for 200 and `{ "status": "error" }` for 503. NFR-010 forbids a change to an existing field, so the health endpoint does not use the Problem format. It is the only operation whose error response is not a Problem body.

Alternatives: a custom `{ error: { code, message } }` shape duplicates what RFC 9457 already standardises. The Fastify default error body exposes implementation detail and risks a stack trace in a response (NFR-005).

### D-3: List parameters and response

`GET /products` accepts:

| Parameter | Type | Default | Limit |
| --- | --- | --- | --- |
| `page` | integer, 1-based | 1 | 1 to 100000 (Q-24) |
| `pageSize` | integer | 10 (CAT-002) | 1 to 100 (Q-04) |
| `q` | string | absent | maximum 100 characters |

The response is `{ items, page, pageSize, total, totalPages }`. `items` holds the product objects. The default order is `sku` ascending, so pagination is stable (Q-05). Search is a case-insensitive substring match on the product name (CAT-003, Q-06). A page beyond the last page returns HTTP 200 with an empty `items` array and the real `total` and `totalPages` (Q-24). `totalPages` is 0 when `total` is 0; otherwise it is `ceil(total / pageSize)`. A value outside the limit of `page` or `pageSize` returns HTTP 400 with `code: out_of_range` (Q-25).

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

`GET /auth/me` reads `Authorization: Bearer <token>` and returns the `User` object. The token is a JWT. The proposed claims are `sub`, `email`, `role`, `iat`, `exp` and `iss` (Q-03). A missing, invalid, expired, unsigned, tampered or wrongly signed token returns the same HTTP 401 body with `WWW-Authenticate: Bearer` (AUTH-005, AUTH-008, Q-29). The response contains no password hash and no other value that derives from a secret; a later field is additive (Q-29).

The role is exposed in the `user` object as `CUSTOMER` or `ADMIN` (Q-10). The client uses it only to hide controls. The API enforces authorization.

Alternatives: an httpOnly cookie set by the API needs CSRF protection and cross-origin configuration for the Compose setup. Q-23 keeps the cookie in the Web UI instead. An opaque token needs a session table and a lookup on each request.

### D-5: Price representation

`Money` is `{ "amount": <integer>, "currency": "EUR" }`. `amount` is a whole number of minor units (cents). This avoids floating point rounding. The contract states the unit in the schema description and in the example. The final choice is Q-08.

Alternatives: a decimal string (`"19.99"`) is readable but needs parsing on every client. A JSON number of euros introduces binary floating point.

### D-6: Endpoint status matrix

| Operation | Auth | Success | Error responses |
| --- | --- | --- | --- |
| `POST /auth/register` | none | 201 `AuthResponse` | 400 `validation-error` (AUTH-003), 409 `conflict` (AUTH-002), 413, 415 |
| `POST /auth/login` | none | 200 `AuthResponse` | 400 `validation-error`, 401 `unauthorized` (bad credentials, Q-11), 413, 415 |
| `GET /auth/me` | bearer | 200 `User` | 401 `unauthorized` (AUTH-005, AUTH-008) |
| `GET /products` | none | 200 `ProductPage` | 400 `validation-error` (bad `page`, `pageSize` or `q`) |
| `GET /products/{sku}` | none | 200 `Product` | 404 `not-found` (CAT-004) |
| `GET /health` | none | 200 `{ "status": "ok" }` | 503 `{ "status": "error" }` (NFR-008) |

`GET /health` already exists in phase 0. The contract documents it and adds no behaviour. Every operation can also return HTTP 405 `method-not-allowed` and HTTP 500 `internal-error`. An unknown route returns HTTP 404 `not-found`. All of these use the Problem format, except the 503 of `GET /health` (Q-26).

### D-7: Change split

Phase 1 becomes five implementation changes plus one CI change. The planning change is the base.

| # | Change | Type | Scope | Requirements | Depends on | Parallel |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `phase-1-contracts` | planning | This contract, the AUTH-008 delta, the open questions, the plan | AUTH-008 | Phase 0 | No. It is the base. |
| 2 | `auth-api` | feature | T-04 spike first. Then `users` table, migration, register, login, me, password hash, token | AUTH-001..008 | 1 and AUTH-008 approval | No. It is the first code change. |
| 3 | `catalog-api` | feature | `products` table, migration, seed, list, search, pagination, detail | CAT-001..004 | 1 | No against 2. Both touch `services/api` and one migration chain. Run after 2. |
| 4 | `web-foundation` | feature | Fetch wrapper, Problem mapping, MSW setup, generated types, test utilities, layout | WEB-004, WEB-008, WEB-009, WEB-010 | 1 | Yes, with 2 and 3. |
| 5 | `web-auth` | feature | Login page, registration page, Route Handler, token storage, error states | AUTH-001..004, WEB-004, WEB-006, WEB-008, WEB-009, WEB-010 | 4; 2 for E2E | Yes, with 6. |
| 6 | `web-catalog` | feature | Product list page, product detail page, search, pagination | CAT-002..005 (see E-2), WEB-004, WEB-006, WEB-008, WEB-009, WEB-010 | 4; 3 for E2E | Yes, with 5. |
| 7 | `ci-contract-gates` | ci | 7a: contract lint and migration gate. 7b: MSW contract check, after 4 | QA-019, QA-020 | 1 for 7a; 4 for 7b | Yes. It has no OpenSpec change. |

Suggested Jira story titles:

- 2: "Auth API: register, login and current user"
- 3: "Catalog API: product list, search and product detail"
- 4: "Web foundation: data access, mocks and test utilities"
- 5: "Web auth: login and registration pages"
- 6: "Web catalog: product list and product detail pages"
- 7: "CI: contract and migration gates"

Rationale for the order: the contract unblocks all streams. `web-foundation` starts with the contract, in parallel with the two API changes. The two API changes are sequential because they share one service, one dependency set and one migration chain. `web-auth` and `web-catalog` start after `web-foundation` and run in parallel. Each finishes E2E after its API change lands. Change 7 lands in two parts: the contract lint and the migration gate first, the MSW check after `web-foundation` exists.

WEB-004, WEB-006, WEB-008, WEB-009 and WEB-010 apply to each web change for its own pages. WEB-001 is accepted at the end of phase 3, because four of its eight pages belong to phase 3 (E-1).

Alternatives: one large `phase-1` change. It would mix five service areas in one review and one migration chain, and a failing test would not show which slice broke.

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
| `api-tests` (new, every pull request and `main`) | New job after `docker compose up` | REST Assured tests in `tests/api/`. Each response is checked against the OpenAPI file (QA-015, QA-017, QA-018). | 3–5 min |
| `e2e-smoke` | Extend the suite | Four pages: product list, product detail, login, registration. The test creates its own account (QA-011). | 60–90 s |
| `ci-ok` | Add the new jobs to `needs` | The merge gate includes the new checks. | 0 |

Expected effect on wall-clock time: a pull request adds about 4–6 minutes. The longest new job is `api-tests` at 3–5 minutes; the other new jobs run in parallel. A merge to `main` adds about the same time.

Change 7 lands in two parts. The contract lint and the migration gate come first. The MSW contract check comes after `web-foundation` exists, because it needs the generated types and the handlers.

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
| AUTH-008 | M \| C,K | Component, contract | A valid token returns 200 with `id`, `email` and `role`. A missing token, a bad scheme, a tampered token, an expired token and `alg: none` return 401 with the same body and `WWW-Authenticate: Bearer`. The body has no password hash and no other secret-derived field (Q-29). |
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
| NFR-005 | M \| C | Component | No response, including HTTP 500, contains a stack trace, a password hash or an internal URL. |
| NFR-011 | M \| C | Component | The migration creates the `api` schema objects on an empty database. A second run changes nothing. |
| QA-019 | M \| D | Demonstration | A pull request runs the UI unit, component and integration tests. |
| QA-020 | S \| D | Demonstration | A handler that does not match the OpenAPI file fails CI. |

Q-26 has no requirement ID of its own. The contract test covers it for every operation: HTTP 405 on each operation, HTTP 413 and HTTP 415 on the two POST operations, and HTTP 404 for an unknown route. Each check validates the body against `Problem` and the `x-correlation-id` header.

The tests themselves are written in separate changes, by the QA owner or by an agent from the QA owner's description.

### D-10: Scope exceptions

Two in-scope requirements cannot pass as written in phase 1. This change does not rewrite them. It records the gap for a decision.

- **E-1, WEB-001.** The requirement lists eight pages. Phase 1 delivers four: product list, product detail, login, registration. Proposal: phase 1 delivers four pages. WEB-001 passes only at the end of phase 3. No delta is needed. The traceability table marks the four missing pages as deferred.
- **E-2, CAT-005.** The requirement shows the stock status. The status comes from the Inventory Service (CAT-006), which is out of scope. Proposal: the phase 1 product list shows the name and the price. CAT-005 stays open until the inventory change. Do not add a placeholder status.

Both proposals need the QA owner's approval. An alternative is a separate change that narrows the requirement. That change would need its own proposal because it modifies an existing requirement.

### D-11: Web rendering and test seams

The approved T-07 rule applies to `web-foundation` and to both web changes.

- Pages are thin Server Components. They fetch data and pass the result to presentational state components.
- A state component takes props. It does not fetch. React Testing Library tests the loading, error, empty and filled states (WEB-008).
- The fetch wrapper and the Problem mapping are tested with MSW at unit level.
- The generated types come from the contract (T-08). A handler that does not match the contract fails `tsc` (QA-020).
- Business logic (price format, form validation) stays in plain modules (WEB-009).
- Server Components and Route Handlers call the API. The API base URL comes from the server-side variable `API_BASE_URL`. It is not exposed as `NEXT_PUBLIC_*` (Q-28).
- The browser does not call the API. The Next.js server is the only client.

### D-12: QA prerequisites before auth-api

The QA owner does these tasks before `auth-api` starts. They are not part of this change.

1. Enrich the acceptance scenarios for AUTH-001..008 from the delta. The AUTH-008 delta has seven scenarios.
2. Create the `tests/api/` skeleton: REST Assured, the OpenAPI response validator and one runnable smoke test.
3. Write the acceptance tests for auth and catalog from the requirements.
4. Approved AUTH-008 on 25 November 2026. `auth-api` is no longer blocked by this item.

The conditions of Q-23, Q-24, Q-25, Q-26, T-04 and T-07 are part of the decision and are recorded in `open-questions.md`. They are not prerequisites. They bind the change that implements the answer.

The QA owner also creates the Jira stories for the split. This change does not create them.

## Risks / Trade-offs

- [The contract is a draft] → Closed. All answers are decided and the contract is version 1.0.0. A change to a shape now needs a change proposal.
- [Four streams read the contract differently] → One error schema, one `User` schema and one `AuthResponse` schema. The contract lint and the response validation catch drift.
- [The two API changes conflict in one service] → Run them sequentially. Each change owns one migration and one route group.
- [MSW handlers drift from the contract] → Generate the handler types from the OpenAPI file and fail CI on a mismatch (QA-020).
- [The AUTH-008 draft is merged before approval] → Closed. The QA owner approved AUTH-008 on 25 November 2026. `openspec/specs/` changes at archive time only.
- [A proposed answer is wrong] → The proposal is visible in the contract description and in `open-questions.md`. The QA owner can reject it without touching the code.

## Migration Plan

This change adds files only. No runtime change. Rollback is a revert of the pull request.

## Open Questions

All open questions are in `open-questions.md`: 29 ambiguities and process questions, plus 8 technical decisions. Q-01..Q-21, Q-27, Q-28 and Q-29 are approved. T-01, T-02, T-03, T-05, T-06 and T-08 are approved. T-04, T-07, Q-23, Q-24, Q-25 and Q-26 are approved with conditions. The conditions are recorded in each item. Q-22 is resolved. No question stays open.

The key is `KAN-11`. The branch is `feature/KAN-11-phase-1-contracts`. See `open-questions.md` Q-22.
