# Open Questions

Status: reviewed. The QA owner approved Q-01 to Q-21, Q-27 and Q-28 on 22 November 2026. T-01, T-02, T-03, T-05, T-06 and T-08 are approved. T-04, T-07, Q-23, Q-24, Q-25 and Q-26 are approved with conditions. Q-22 is resolved. No question stays open.

The OpenAPI draft in `contracts/openapi/api.yaml` encodes the proposed answers. The contract names the question ID where an answer affects a shape. A rejected answer changes the contract before the code exists.

Last checked: 22 November 2026.

## Part 1: Ambiguities in the requirements and the brief

### Q-01: Password rules beyond the minimum length

**Question.** AUTH-003 sets only a minimum of 8 characters. What else does the API accept or reject?

**Options.**

| Option | Effect |
| --- | --- |
| A. Minimum 8, maximum 128, no composition rules | Short and long passphrases are valid. Only length is checked. |
| B. Minimum 8 plus upper case, lower case, digit and symbol | More rules, more field errors, weaker real passwords. |
| C. Minimum 12 plus a breach-list check | Stronger, but needs an external service that is not in scope. |

**Proposed answer.** Option A. Minimum 8 characters. Maximum 128 characters. No composition rules. No truncation. A password of 129 characters or more returns HTTP 400 with `pointer: "/password"`. Length is the number of Unicode code points, not bytes and not grapheme clusters. A password of only whitespace returns HTTP 400. The schema enforces the length. The service enforces the whitespace-only rule, because JSON Schema cannot express it.

**Reason.** OWASP guidance favours length over composition rules. The maximum prevents an unbounded hash input.

**Status: approved.**

### Q-02: Email normalization and case

**Question.** Is `User@Example.com` the same account as `user@example.com`?

**Options.**

| Option | Effect |
| --- | --- |
| A. Trim, then lower-case, before store and compare | One account for one address in any case. |
| B. Compare the exact bytes | Two accounts for one mailbox. |
| C. Lower-case the domain only | Correct for the domain, but the local part stays case-sensitive. |

**Proposed answer.** Option A. The API trims the address, lower-cases the whole address, and stores the result. A unique index on the stored value enforces AUTH-002. The API does not strip a plus tag and does not remove dots from the local part. Maximum 254 characters. A shape check rejects an address without `@` or without a domain. AUTH-002 requires the 409 response for a registered address. The response reveals that the account exists. This is an accepted risk for the test stand.

**Status: approved.**

### Q-03: Token format and claims

**Question.** What is the token, and which claims does it carry?

**Options.**

| Option | Effect |
| --- | --- |
| A. JWT, HS256, shared secret from an environment variable | Simple. One service signs and verifies. |
| B. JWT, RS256, key pair | Asymmetric. More key handling with no second verifier. |
| C. Opaque token with a session table | Revocable, but needs a lookup on each request. |

**Proposed answer.** Option A. The token is a JWT with these claims: `sub` (user ID), `email`, `role`, `iat`, `exp`, `iss` (`shopflow-api`). The lifetime is 60 minutes (AUTH-004). The secret comes from `JWT_SECRET` (NFR-006). The API accepts only HS256 and rejects `alg: none`.

**Status: approved.**

### Q-04: Maximum page size

**Question.** CAT-002 fixes the default page size at 10. It sets no maximum.

**Options.** 50, 100, or no maximum.

**Proposed answer.** Maximum 100. `pageSize` above 100 or below 1 returns HTTP 400 with `pointer: "/pageSize"`. The default stays 10 (CAT-002).

**Reason.** A cap protects the API and makes the contract tests deterministic. The seed has 24 products, so one page of 100 shows the whole catalog.

**Status: approved.**

### Q-05: Default sort order

**Question.** In which order does `GET /products` return the items?

**Options.**

| Option | Effect |
| --- | --- |
| A. `sku` ascending | Unique and stable. Pagination never repeats or skips an item. |
| B. Name ascending | Readable, but names are not unique. |
| C. Creation time descending | Shows new products first. The seed has one creation time. |

**Proposed answer.** Option A. `sku` ascending. The order is part of the contract, so the tests can assert it.

**Status: approved.**

### Q-06: Search semantics

**Question.** CAT-003 says "the products whose name contains that text". Which comparison is that?

**Options.**

| Option | Effect |
| --- | --- |
| A. Case-insensitive literal substring on the name | `phone` finds `Phone Case`. `%` is a literal character. |
| B. Case-insensitive substring on the name or the description | More results than the requirement states. |
| C. Tokenised full-text search | Ranking and stemming. More than phase 1 needs. |

**Proposed answer.** Option A. The API trims `q`. An empty `q` applies no filter. The match is `name ILIKE '%' || q || '%'` with `%` and `_` escaped in `q`. The maximum length of `q` is 100 characters.

**Status: approved.**

### Q-07: SKU format

**Question.** The requirements use a SKU but do not define its shape.

**Options.**

| Option | Effect |
| --- | --- |
| A. Upper-case letters, digits and single hyphens, 3 to 32 characters | Safe in a URL path. Readable. |
| B. Any non-empty string | Needs URL encoding. Ambiguous in a path. |
| C. Fixed `SKU-0001` form | Simple, but blocks real supplier codes. |

**Proposed answer.** Option A. Pattern `^[A-Z0-9]+(-[A-Z0-9]+)*$`, length 3 to 32. The seed uses `SKU-0001` to `SKU-0024`. A SKU in a request is matched exactly, in upper case. The path parameter `sku` does not enforce the pattern. Any value that does not match a product returns 404 (Q-27).

**Status: approved.**

### Q-08: Price representation

**Question.** CAT-001 says "a price in EUR". How does JSON carry the value?

**Options.**

| Option | Effect |
| --- | --- |
| A. Integer minor units plus a currency code: `{ "amount": 1999, "currency": "EUR" }` | Exact. No rounding. Needs a format step in the Web UI. |
| B. Decimal string: `{ "amount": "19.99", "currency": "EUR" }` | Readable. Every client parses it. |
| C. JSON number: `{ "amount": 19.99 }` | Binary floating point. Rounding errors. |

**Proposed answer.** Option A. `amount` is a non-negative integer in cents. `currency` is the constant `EUR`. The database stores an integer. The Web UI formats the value for display in a plain module (WEB-009).

**Status: approved.**

### Q-09: Error format

**Question.** Which body does an error response carry?

**Options.**

| Option | Effect |
| --- | --- |
| A. RFC 9457 Problem Details, `application/problem+json`, with an `errors` array | One standard shape. Field errors are expressible. |
| B. A custom `{ "error": { "code", "message" } }` envelope | Simple, but every client learns a private format. |
| C. The Fastify default error body | Leaks implementation detail. Risks NFR-005. |

**Proposed answer.** Option A. Members: `type`, `title`, `status`, `detail`, optional `instance`, optional `errors[]`. Each field error has `pointer` (a JSON Pointer such as `/password`), `code` and `message`. Problem types: `validation-error` (400), `unauthorized` (401), `not-found` (404), `conflict` (409). The `detail` text contains no stack trace, no hash and no internal URL (NFR-005).

**Status: approved.**

### Q-10: How the role is exposed

**Question.** AUTH-007 gives every new account the role CUSTOMER. Where does a client read the role?

**Options.**

| Option | Effect |
| --- | --- |
| A. A `role` field in the `user` object of `AuthResponse` and `GET /auth/me` | One place. The client hides controls. |
| B. A separate endpoint | An extra call on each page load. |
| C. No role in phase 1 | The Web UI cannot hide an admin control later. |

**Proposed answer.** Option A. `role` is an enum: `CUSTOMER` or `ADMIN`. The client uses the value only to hide controls. The API enforces authorization. The role is not a security boundary on the client.

**Status: approved.**

### Q-11: Login failure behaviour

**Question.** AUTH-004 covers a valid login. What does a failed login return?

**Options.**

| Option | Effect |
| --- | --- |
| A. HTTP 401 with one generic detail for an unknown email and for a wrong password | No account enumeration. |
| B. HTTP 404 for an unknown email and 401 for a wrong password | Tells an attacker which accounts exist. |
| C. HTTP 401 with different `code` values | Same leak as B. |

**Proposed answer.** Option A. Status 401, `type: ".../unauthorized"`, `detail: "The email address or the password is incorrect."` The API runs a dummy hash check when the email is unknown, so the response time does not differ.

**Status: approved.**

### Q-12: Registration success status

**Question.** AUTH-001 says the API creates an account and returns a token. Which 2xx status?

**Options.** 201 Created, or 200 OK.

**Proposed answer.** 201 Created. The body is the same `AuthResponse` as a login. The response has no `Location` header, because the user resource has no public URL in phase 1.

**Status: approved.**

### Q-13: Pagination field names and page numbering

**Question.** CAT-002 uses a page model but does not name the parameters.

**Options.**

| Option | Effect |
| --- | --- |
| A. `page` (1-based) and `pageSize`; response `{ items, page, pageSize, total, totalPages }` | Matches the requirement wording. |
| B. `offset` and `limit` (0-based) | Closer to SQL. Does not match "page size". |

**Proposed answer.** Option A.

**Status: approved.**

### Q-14: `GET /auth/me` response fields

**Question.** Which fields identify the user?

**Options.** `{ id, email, role }`, or the same plus `createdAt`, or a full profile.

**Proposed answer.** `{ id, email, role }`. A later field is additive and allowed by NFR-010.

**Status: approved.**

### Q-15: Health response shape

**Question.** Phase 0 returns `{ "status": "ok" }` with 200 and `{ "status": "error" }` with 503. Does phase 1 keep it?

**Options.**

| Option | Effect |
| --- | --- |
| A. Keep the phase 0 body | No break. NFR-010 holds. |
| B. Add a `checks` object | More detail. Existing fields stay. |
| C. Replace the body with Problem Details | Breaks the phase 0 field. Violates NFR-010. |

**Proposed answer.** Option A. The contract documents the phase 0 body. A dependency check that adds fields is a later change.

**Status: approved.**

### Q-16: Seed data and reset

**Question.** CAT-001 needs at least 20 products at first start. Which products, and how does a repeat start behave?

**Options.**

| Option | Effect |
| --- | --- |
| A. A fixed list of 24 products, inserted with `ON CONFLICT (sku) DO NOTHING` | Repeatable. Stable test data. |
| B. Generated products on each start | The catalog grows on each start. Tests become unstable. |
| C. Seed inside the schema migration | Data and schema share one version. A repeat needs care. |

**Proposed answer.** Option A. 24 products with fixed SKUs, names, descriptions and prices. The seed runs after the migration on each start. A second run changes no row. The test-only reset script (NFR-012) is a later change.

**Status: approved.**

### Q-17: Public or protected catalog

**Question.** Do `GET /products` and `GET /products/{sku}` need a token?

**Options.**

| Option | Effect |
| --- | --- |
| A. Public | A visitor browses before registration. |
| B. Protected | A visitor must register before browsing. |

**Proposed answer.** Option A. The phase 1 target says a visitor browses the catalog. The contract marks both operations as public.

**Status: approved.**

### Q-18: JSON field naming

**Question.** Does the API use camelCase or snake_case in JSON?

**Options.** camelCase, or snake_case.

**Proposed answer.** camelCase. Database columns stay snake_case and are mapped at the boundary. This matches the TypeScript and Next.js conventions.

**Status: approved.**

### Q-19: Field length limits

**Question.** The requirements set no maximum length except the password minimum.

**Proposed answer.** `email` at most 254 characters. `password` 8 to 128 characters on registration. `name` at most 200 characters. `description` at most 2000 characters. `q` at most 100 characters. A longer value returns HTTP 400 with a field error. A login password has no minimum beyond one character, so a wrong short password returns 401 (Q-11).

**Status: approved.**

### Q-20: Duplicate registration race

**Question.** Two requests register the same email at the same time. A pre-check alone can pass both.

**Proposed answer.** A unique index on the normalized email. The API maps the unique-violation error to HTTP 409 with `type: ".../conflict"`. The pre-check stays as a fast path only.

**Status: approved.**

### Q-21: API path prefix

**Question.** Are the paths `/auth/register` and `/products`, or `/api/v1/auth/register` and `/api/v1/products`?

**Options.**

| Option | Effect |
| --- | --- |
| A. No prefix | Matches the SRS paths and the phase 0 `/health`. |
| B. `/api/v1` | Room for a breaking change later. Changes every path in the SRS. |

**Proposed answer.** Option A. The SRS names the paths without a prefix. A prefix is a product decision, not a QA decision.

**Status: approved.**

### Q-22: The Jira key `KAN-10` was already in use (resolved)

**Question.** `KAN-10` is the merged repository-conventions story (pull request #4). The brief gave `KAN-10` for this story too.

**Options.**

| Option | Effect |
| --- | --- |
| A. Keep `KAN-10` | The branch and the commit reuse a key that is already merged. Traceability is ambiguous. |
| B. Use a new key from the QA owner | Clean traceability. The branch and the commit subject change. |

**Resolution.** The QA owner gave `KAN-11` for this story. The branch is `feature/KAN-11-phase-1-contracts`. The proposal, the design, the commit subject and `tasks.md` use `KAN-11`. `KAN-10` stays with the merged repository-conventions story.

**Status: resolved.**

### Q-23: Token storage in the Web UI

**Question.** The API returns the token in the body. Where does the Web UI keep it?

**Options.**

| Option | Effect |
| --- | --- |
| A. An httpOnly cookie, set by a Next.js Route Handler, forwarded as `Authorization: Bearer` | Scripts cannot read the token. Adds a small server-side auth route. |
| B. `localStorage` | Simple. Readable by any script on the page. |
| C. Memory only | Safe from persistence. The user logs in again after a refresh. |

**Proposed answer.** Option A. The Web UI has Route Handlers for login, registration and logout. Each Route Handler stores the API token in an httpOnly cookie with these attributes:

- `SameSite=Lax`
- `Path=/`
- `Secure` only when the connection uses HTTPS
- `Max-Age` equal to `expiresIn` (3600 seconds)

When the API returns HTTP 401, the Route Handler clears the cookie and redirects the browser to the login page. Phase 1 has no refresh token. A stateless token cannot be revoked on the server. This is an accepted risk for phase 1.

An E2E test asserts that the token is not readable from `document.cookie` or `localStorage`.

**Status: approved with conditions.**

### Q-24: A page beyond the last page

**Question.** What does `GET /products?page=99` return when the result set has three pages?

**Options.**

| Option | Effect |
| --- | --- |
| A. HTTP 200 with `items: []` and the real `total` and `totalPages` | The request is valid. The client sees the end of the list. |
| B. HTTP 400 | A valid request becomes an error. |
| C. Clamp to the last page | The client cannot tell that it asked for a page that does not exist. |

**Proposed answer.** Option A. The response is a valid page. `total` and `totalPages` describe the whole result set. An empty catalog returns `total: 0` and `totalPages: 0`. The `page` parameter has a maximum of 100000. A larger value returns HTTP 400 with `pointer: "/page"` and `code: out_of_range`.

**Status: approved with conditions.**

### Q-25: Error code vocabulary

**Question.** Are the `FieldError.code` values free text?

**Options.**

| Option | Effect |
| --- | --- |
| A. A fixed enum in one schema: `required`, `too_short`, `too_long`, `invalid_format` | A client can switch on a closed set. A typo fails the lint. |
| B. Free text | Flexible, but a client cannot rely on a value. |
| C. The fixed enum plus service-specific codes | More values to maintain and to document. |

**Proposed answer.** Option A. One `ErrorCode` schema holds the list: `required`, `too_short`, `too_long`, `invalid_format`, `out_of_range`, `unknown_field`. The HTTP status and the problem `type` carry the class of the error. The code names the field rule. A new code needs a contract change.

`FieldError` has a `source` member with the value `body` or `query`. For body fields, `pointer` is a JSON Pointer such as `/password`. For query parameters, `pointer` is the parameter name such as `page`.

A wrong value type maps to `invalid_format`. Malformed JSON returns HTTP 400 with `type: ".../validation-error"` and no `errors` array. Q-27 does not produce a field error, because the path parameter accepts any string.

**Reason.** The list stays in one place, so the contract and the tests cannot drift. Six codes cover every rule in Q-01, Q-19 and Q-24.

**Status: approved with conditions.**

### Q-26: Format of HTTP 500

**Question.** What does the API return for an unexpected error?

**Options.**

| Option | Effect |
| --- | --- |
| A. A Problem body with `type: ".../internal-error"` and a generic detail | One parser for every error. No internals. |
| B. A bare `{ "error": "..." }` | A second error shape for clients. |
| C. An empty body | No message and no correlation between the body and the log. |

**Proposed answer.** Option A. Status 500, `application/problem+json`, `title: "Internal server error"`, `detail: "An unexpected error occurred."`. The body has no stack trace, no SQL and no internal URL (NFR-005). The correlation ID stays in the `x-correlation-id` response header, which phase 0 already sets.

Framework errors also use the Problem format: unknown route, HTTP 405, HTTP 413, HTTP 415 and malformed JSON all return a Problem body. The `x-correlation-id` header is present on every error response.

**Status: approved with conditions.**

### Q-27: SKU in the path

**Question.** Does `GET /products/{sku}` validate the shape of the SKU?

**Options.**

| Option | Effect |
| --- | --- |
| A. Any string. An unknown value returns 404. | One behaviour for every value. |
| B. The pattern from Q-07. An invalid shape returns 400. | Tells a client that the shape is wrong. |
| C. The pattern from Q-07. An invalid shape returns 404. | The same status for two causes. |

**Proposed answer.** Option A. The path parameter has no pattern and no length limit. Every value that does not match a product returns 404 (CAT-004). The product resource still uses the Q-07 pattern for stored SKUs. A client can apply Q-07 to its own input.

**Status: approved.**

### Q-28: Who calls the API

**Question.** Does the browser call the API directly, or only the Next.js server?

**Options.**

| Option | Effect |
| --- | --- |
| A. The Next.js server only. No CORS. | Fewer moving parts. The token stays server-side. |
| B. The server and the browser. CORS with an allow-list. | The browser needs a token store and a preflight path. |
| C. The browser only. | The Next.js server cannot render data. |

**Proposed answer.** Option A. Server Components and Route Handlers call the API. The browser calls only the Next.js origin. The API base URL comes from the server-side variable `API_BASE_URL`. It is not exposed as a `NEXT_PUBLIC_*` variable. The API has no CORS middleware. If the browser must call the API later, CORS is a separate change with an explicit origin allow-list.

**Status: approved.**

## Part 2: Technical decisions

The versions below were checked on 22 November 2026. Each recommendation names the version to pin.

### T-01: ORM and migration tool

**Options.**

| Option | Version | Notes |
| --- | --- | --- |
| A. Drizzle ORM with drizzle-kit | `drizzle-orm` 0.45.4, `drizzle-kit` 0.31.11 | SQL-first schema in TypeScript. Generates SQL migration files. Small runtime. |
| B. Prisma | `prisma` and `@prisma/client` 7.10.1 (stable) | Strong tooling. A generated client and a query engine. The `latest` tag is 8.0.0-rc.34, a release candidate. |
| C. Kysely with node-pg-migrate | `kysely` 0.29.9, `node-pg-migrate` 9.0.0 | A type-safe query builder and a separate migration tool. Two tools to learn. |

**Recommendation.** Option A. Drizzle keeps the schema in TypeScript, writes plain SQL migrations, and needs no generated client at runtime. Pin 0.45.4 and 0.31.11. Do not use the 1.0 beta.

**Reason.** NFR-011 needs a versioned migration tool with plain SQL files that CI can apply. Drizzle gives that with the least runtime weight. Prisma 7 is a valid second choice. Prisma 8 is a release candidate and is not suitable for this test stand.

**Status: approved.**

### T-02: Password hashing library

**Options.**

| Option | Version | Notes |
| --- | --- | --- |
| A. `@node-rs/argon2` | 2.2.2 | Prebuilt binaries. Argon2id. No compiler in the image. |
| B. `argon2` | 0.45.2 | The reference binding. Needs a build toolchain in the Docker image. |
| C. `bcrypt` | 6.0.0 | Mature. 72-byte input limit. Not memory-hard. |

**Recommendation.** Option A. Set Argon2id explicitly to `m=19456` KiB (19 MiB), `t=2`, `p=1`. Do not rely on library defaults. The OWASP Password Storage Cheat Sheet gives this as the minimum configuration: 19 MiB of memory, 2 iterations and 1 degree of parallelism. Pin 2.2.2. Benchmark the parameters on the target system and record the measured hash time in the change.

**Reason.** The OWASP minimum is explicit. Explicit parameters keep the value stable when the library changes a default. Prebuilt binaries keep the API image small and the build reproducible. Option B is the fallback if the prebuilt binary fails on the target platform.

**Status: approved.**

### T-03: JWT library

**Options.**

| Option | Version | Notes |
| --- | --- | --- |
| A. `jose` | 6.2.18 | ESM, WebCrypto, no runtime dependencies. Explicit sign and verify. |
| B. `@fastify/jwt` | 10.2.8 | Fastify plugin. Decorators for `request.jwtVerify()`. |
| C. `jsonwebtoken` | 9.0.3 | Widely used. CommonJS. Callback API. |

**Recommendation.** Option A. `jose` signs and verifies with HS256. The secret comes from `JWT_SECRET`. The API verifies `iss`, `exp` and the algorithm.

**Reason.** The API runs on Node 26 and uses ESM. `jose` is ESM-native and has no plugin coupling. Option B is the fallback if the team wants Fastify decorators.

**Status: approved.**

### T-04: Request validation tied to the OpenAPI file

**Options.**

| Option | Version | Notes |
| --- | --- | --- |
| A. `fastify-openapi-glue` | 4.12.0 | Routes, request validation and security come from the contract. OpenAPI 3.1 needs a custom `Ajv2020` validator. |
| B. Generated JSON Schemas registered with Fastify | `ajv` 8.20.0 | A build step writes Fastify schemas from the contract. A CI diff fails when the file is stale. |
| C. Hand-written Fastify schemas | none | Fast, but the contract and the code can drift. |

**Recommendation.** Option A, with a time-boxed spike as the first task of `auth-api`. The spike registers the contract with `fastify-openapi-glue` and passes `new Ajv2020({...})` to Fastify. It must show request validation, a 400 Problem body and the security handler for `GET /auth/me`. Time box: one working day. If the spike fails, use Option B: generate JSON Schemas from the contract at build time, register them with Fastify, and fail CI when the generated file is stale. Both options must load `ajv-formats`, because the contract uses `format: email`.

**Reason.** The contract becomes the router, so a request shape cannot drift from the file. The spike measures the 3.1 support before the change commits to the glue. Option B is a working fallback with the same contract source.

**Status: approved with conditions.**

### T-05: How migrations run in Compose

**Options.**

| Option | Effect |
| --- | --- |
| A. The API entrypoint runs the migration, then the server | Simple. Two API replicas would race. |
| B. A one-shot `migrate` service; the API waits for `service_completed_successfully` | One code path for Compose and CI. No race. |
| C. A manual command only | `docker compose up` would not prepare the database. |

**Recommendation.** Option B. A `migrate` service runs `pnpm --filter @shopflow/api db:migrate` after PostgreSQL is healthy. The `api` service depends on `migrate` with `condition: service_completed_successfully`. The same command is available outside Compose for CI.

**Reason.** NFR-009 needs one command. A one-shot service gives a clear failure and no race. The command stays the same in CI, so there is one migration path.

**Status: approved.**

### T-06: Seed strategy

**Options.**

| Option | Effect |
| --- | --- |
| A. A one-shot `seed` service after `migrate`, with `ON CONFLICT (sku) DO NOTHING` | Idempotent. Runs on each start. |
| B. Seed at API startup when the table is empty | Works, but the API owns data setup and a failed seed is silent. |
| C. Seed inside the migration | A data change needs a schema version. A repeat needs care. |

**Recommendation.** Option A. 24 fixed products. A `seed` service depends on `migrate`. The seed is a plain script with one transaction. A second run inserts no row. CI runs the same script twice and checks the row count.

**Reason.** CAT-001 needs at least 20 products at first start. Idempotency makes a local reset safe and keeps the E2E data stable.

**Status: approved.**

### T-07: Data fetching in Next.js

**Options.**

| Option | Effect |
| --- | --- |
| A. Server Components with `fetch`; client components only for the search input and the auth forms | No client cache library. Streaming with `loading.tsx`. |
| B. Client components with SWR or React Query | More client JavaScript. A cache library to configure. |
| C. Route Handlers as a full backend-for-frontend | More server code. The API is no longer the only data source. |

**Recommendation.** Option A, with this rule: pages are thin Server Components. They fetch data and pass it to presentational state components. The state components take props and do not fetch, so React Testing Library can test the loading, error, empty and filled states (WEB-008). The fetch wrapper and the Problem mapping are tested with MSW at unit level. Business logic stays in plain modules (WEB-009). The product list page and the product detail page fetch on the server with `cache: "no-store"`. The search input updates the URL. The auth forms call one Route Handler (Q-23).

**Reason.** Next.js 16 renders Server Components by default. This keeps the token on the server and the client bundle small. Thin pages with prop-driven state components give WEB-008 a test seam that does not need a server. Option C stays limited to the auth Route Handler from Q-23.

**Status: approved with conditions.**

### T-08: MSW setup

**Options.**

| Option | Version | Notes |
| --- | --- | --- |
| A. `openapi-typescript` types plus `openapi-msw` handlers on `msw` | `openapi-typescript` 7.13.0, `openapi-msw` 2.1.1, `msw` 3.0.7 | Handlers are typed from the contract. A wrong path, status or body fails `tsc`. |
| B. `orval` generates the client and the MSW handlers | `orval` 8.49.0 | More generated code. A generator in the loop. |
| C. Hand-written handlers with fixtures | `msw` 3.0.7 | Simple. No link to the contract, so QA-020 cannot pass. |

**Recommendation.** Option A. Generate `paths` types from `contracts/openapi/api.yaml` with `openapi-typescript`. Build the handlers with `openapi-msw`. Add a CI step that regenerates the types and fails on a diff. `openapi-msw` 2.1.1 accepts `msw` 3.x.

**Reason.** QA-020 needs a failing check when a handler does not match the contract. Typed handlers give that at compile time with little code.

**Status: approved.**

## Part 3: Sources

- OpenAPI Specification 3.1.1: <https://spec.openapis.org/oas/v3.1.1.html>
- RFC 9457 Problem Details for HTTP APIs: <https://www.rfc-editor.org/rfc/rfc9457.html>
- Redocly CLI `lint`: <https://redocly.com/docs/cli/commands/lint>
- OWASP Password Storage Cheat Sheet: <https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html>
- `@node-rs/argon2` API and defaults: <https://github.com/napi-rs/node-rs/tree/main/packages/argon2>
- openapi-typescript: <https://openapi-ts.dev/introduction>
- Drizzle migrations: <https://orm.drizzle.team/docs/migrations>
- Prisma Migrate: <https://www.prisma.io/docs/orm/prisma-migrate>
- Fastify validation and serialization: <https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/>
- `fastify-openapi-glue` OpenAPI 3.1 note: <https://github.com/seriousme/fastify-openapi-glue/blob/master/docs/schema2020.md>
- `jose`: <https://github.com/panva/jose>
- Next.js data fetching: <https://nextjs.org/docs/app/getting-started/fetching-data>
- MSW: <https://mswjs.io/docs/>
- `openapi-msw`: <https://github.com/christoph-fricke/openapi-msw>
