Jira: KAN-10 (epic KAN-2)

## Why

Phase 1 adds authentication and the catalog to ShopFlow. The API, the Web UI, the API tests, the contract tests and the mocks need one agreed contract before an agent writes code. Phase 0 provides only `GET /health`. Without a contract, the parallel work streams would invent different request and response shapes.

This change produces planning artifacts only. It writes no application code.

## What Changes

- Add the OpenAPI 3.1 draft at `contracts/openapi/api.yaml`. It defines `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `GET /products`, `GET /products/{sku}` and `GET /health`.
- Add one shared error format for HTTP 400, 401, 404 and 409.
- Add the pagination and the search parameters for `GET /products`.
- Add a delta-spec draft for the new requirement AUTH-008. AUTH-005 needs a protected endpoint. The delta stays inside this change until the QA owner approves it.
- Add the ambiguity list. Each item has a proposed answer.
- Add the proposed split of phase 1 into small OpenSpec changes.
- Add the technical decisions that need approval. Each decision has options and a recommendation.
- Add the CI plan for phase 1.
- Add test notes for every in-scope requirement.
- Add no application code, no workflow change and no test.

## Capabilities

### Modified Capabilities

- `auth`: add AUTH-008 only. `GET /auth/me` returns the identity of the authenticated user. This requirement gives AUTH-005 a protected endpoint.

## Impact

- Files added: `contracts/openapi/api.yaml` and the files in `openspec/changes/phase-1-contracts/`.
- Files changed: none.
- Requirements: one new requirement (AUTH-008), inside the delta draft only. No existing requirement ID changes.
- Downstream: the split changes (auth API, catalog API, web auth, web catalog), the API tests, the contract tests, the MSW handlers and the Playwright tests use this contract.
- Risk: the contract is a draft. An answer in `open-questions.md` can change a shape before implementation starts.
