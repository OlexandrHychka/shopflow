# Tasks

This change delivers planning artifacts only. It writes no application code, no test and no workflow.

## 1. Contract draft

- [x] 1.1 Write `contracts/openapi/api.yaml` as OpenAPI 3.1.1 with the six operations, the schemas, the shared Problem format, the pagination and search parameters and the examples. Check: `npx --yes @redocly/cli@2.82.0 lint contracts/openapi/api.yaml --config contracts/openapi/redocly.yaml` exits 0.
- [x] 1.2 Add `contracts/openapi/redocly.yaml` with the pinned rule set and the two documented exceptions. Check: the same lint command reports no error and no warning.
- [x] 1.3 Check that the six required paths are present. Check: `grep -cE '^  /(health|auth/register|auth/login|auth/me|products|products/\{sku\}):' contracts/openapi/api.yaml` prints `6`.
- [x] 1.4 Check that HTTP 400, 401, 404 and 409 are defined. Check: `grep -cE "^        '(400|401|404|409)':" contracts/openapi/api.yaml` prints at least `4`.
- [x] 1.5 Check that every error response uses `application/problem+json` and the `Problem` schema. Check: `grep -c 'application/problem+json' contracts/openapi/api.yaml` prints at least `6`, and no error response uses `application/json`.
- [x] 1.6 Check that every operation has an `operationId` and an example on each success response. Check: `grep -c 'operationId:' contracts/openapi/api.yaml` prints `6`.
- [x] 1.7 Add the shared 500 response and the `internal-error` type (Q-26). Check: `grep -c '^    InternalError:' contracts/openapi/api.yaml` prints `1` and `grep -c "^        '500':" contracts/openapi/api.yaml` prints `6`.
- [x] 1.8 Define the field error codes in one `ErrorCode` schema (Q-25). Check: `grep -c '^    ErrorCode:' contracts/openapi/api.yaml` prints `1` and `grep -A6 '^    ErrorCode:' contracts/openapi/api.yaml | grep -c 'too_short'` prints `1`.
- [x] 1.9 Document the page-out-of-range rule and the password Unicode rule (Q-01, Q-24). Check: `grep -c 'beyond the last page' contracts/openapi/api.yaml` prints at least `1` and `grep -c 'Unicode code points' contracts/openapi/api.yaml` prints at least `1`.
- [x] 1.10 Document the duplicate-registration 409 enumeration risk (AUTH-002). Check: `grep -c 'accepted risk' contracts/openapi/api.yaml` prints `1`.
- [x] 1.11 Add the extended `ErrorCode` values `out_of_range` and `unknown_field` (Q-25). Check: `grep -c 'out_of_range' contracts/openapi/api.yaml` prints `1` and `grep -c 'unknown_field' contracts/openapi/api.yaml` prints `1`.
- [x] 1.12 Add the page maximum of `100000` (Q-24). Check: `grep -c 'maximum: 100000' contracts/openapi/api.yaml` prints `1`.
- [x] 1.13 Add `source` to `FieldError` with the values `body` and `query` (Q-25). Check: `grep -A16 '^    FieldError:' contracts/openapi/api.yaml | grep -c '^        source:'` prints `1`.
- [x] 1.14 Define the closed `ProblemType` set and refer to it from `Problem.type` (Q-26). Check: `grep -c '^    ProblemType:' contracts/openapi/api.yaml` prints `1` and `grep -c "schemas/ProblemType'" contracts/openapi/api.yaml` prints `1`.
- [x] 1.15 Add the 405 response to all six operations and the 413 and 415 responses to the two POST operations (Q-26). Check: `grep -c "responses/MethodNotAllowed'" contracts/openapi/api.yaml` prints `6`, `grep -c "responses/PayloadTooLarge'" contracts/openapi/api.yaml` prints `2` and `grep -c "responses/UnsupportedMediaType'" contracts/openapi/api.yaml` prints `2`.
- [x] 1.16 Declare the `x-correlation-id` header on every error response and `WWW-Authenticate: Bearer` on the token 401 (Q-26, Q-29). Check: `grep -c "headers/CorrelationId'" contracts/openapi/api.yaml` prints `9`, `grep -c "headers/BearerChallenge'" contracts/openapi/api.yaml` prints `1` and `grep -c 'WWW-Authenticate:' contracts/openapi/api.yaml` prints `1`.
- [x] 1.17 Record that the identity response has no secret-derived field (Q-29). Check: `grep -c 'no password hash, no password' contracts/openapi/api.yaml` prints `1` and `grep -c 'Q-29' contracts/openapi/api.yaml` prints `3`.
- [x] 1.18 Document the numeric-bound rule on `page` and `pageSize` (Q-24, Q-25). Check: `grep -c 'code: out_of_range' contracts/openapi/api.yaml` prints `2`.

## 2. Requirement delta

- [x] 2.1 Write `specs/auth/spec.md` as a delta with `## ADDED Requirements` and AUTH-008 only, in EARS and STE style. Check: `grep -c '^### Requirement:' openspec/changes/phase-1-contracts/specs/auth/spec.md` prints `1`.
- [x] 2.2 Check that AUTH-008 has seven scenarios and the `[M | C,K]` tag. Check: `grep -c '^#### Scenario:' openspec/changes/phase-1-contracts/specs/auth/spec.md` prints `7` and `grep -c '\[M | C,K\]'` prints `1`.
- [x] 2.3 Check that no file under `openspec/specs/` changed. Check: `git diff --name-only -- openspec/specs` prints nothing.
- [x] 2.4 Check that the delta does not change an existing requirement. Check: `grep -E 'AUTH-00[1-7]' openspec/changes/phase-1-contracts/specs/auth/spec.md` prints nothing.
- [x] 2.5 Check the new AUTH-008 scenarios cover a bad scheme, a tampered token, `alg: none` and a response with no extra field. Check: `grep -cE 'Wrong authorization scheme|Tampered token|none algorithm|Response without a password hash' openspec/changes/phase-1-contracts/specs/auth/spec.md` prints `4`.
- [x] 2.6 Check that the last AUTH-008 scenario bans a secret-derived field and does not ban an additive field (Q-29). Check: `grep -c 'no other field that derives from a secret' openspec/changes/phase-1-contracts/specs/auth/spec.md` prints `1`.

## 3. Open questions

- [x] 3.1 Write `open-questions.md` with the ambiguities. Check: `grep -c '^### Q-' openspec/changes/phase-1-contracts/open-questions.md` prints `29`.
- [x] 3.2 Check that the ten required topics are present. Check: `grep -ciE 'password rules|email normalization|token format|maximum page size|default sort order|search semantics|SKU format|price representation|error format|role is exposed' openspec/changes/phase-1-contracts/open-questions.md` prints at least `10`.
- [x] 3.3 Write the eight technical decisions with options and a recommendation. Check: `grep -c '^### T-' openspec/changes/phase-1-contracts/open-questions.md` prints `8` and `grep -c '^\*\*Recommendation\.\*\*'` prints `8`.
- [x] 3.4 Check that each item has a status. Check: `grep -c '^\*\*Status:' openspec/changes/phase-1-contracts/open-questions.md` prints `37`, `grep -c '^\*\*Status: approved\.\*\*'` prints `30`, `grep -c '^\*\*Status: approved with conditions\.\*\*'` prints `6`, `grep -c '^\*\*Status: resolved\.\*\*'` prints `1`, and `grep -c '^\*\*Status: open\.'` prints `0`.
- [x] 3.5 Check that the key fix is recorded. Check: `grep -c 'feature/KAN-11-phase-1-contracts' openspec/changes/phase-1-contracts/open-questions.md` prints `1` and `grep -c '^\*\*Status: resolved\.\*\*'` prints `1`.
- [x] 3.6 Add Q-24..Q-28. Check: `grep -c '^### Q-2[4-8]:' openspec/changes/phase-1-contracts/open-questions.md` prints `5`.
- [x] 3.7 Add Q-29 and a `Conditions` block to each conditional answer (Q-23, Q-24, Q-25, Q-26, T-04, T-07). Check: `grep -c '^### Q-29:' openspec/changes/phase-1-contracts/open-questions.md` prints `1` and `grep -c '^\*\*Conditions\.\*\*' openspec/changes/phase-1-contracts/open-questions.md` prints `6`.

## 4. Design, split, CI and test notes

- [x] 4.1 Write `design.md` with the contract decisions, the endpoint status matrix, the split, the CI plan and the test notes. Check: `grep -cE '^### D-[0-9]+' openspec/changes/phase-1-contracts/design.md` prints `12`.
- [x] 4.2 Check that the split names five implementation changes and one CI change. Check: `grep -c '^| [0-9] |' openspec/changes/phase-1-contracts/design.md` prints `7`.
- [x] 4.3 Check that each split row states scope, requirement IDs, order, dependency and parallel status. Check: `grep -A10 '^Phase 1 becomes five implementation' openspec/changes/phase-1-contracts/design.md | grep -c '^|'` prints `9`.
- [x] 4.4 Check that the CI plan names each new or changed job and an estimated run time. Check: `grep -c 'Estimated added run time' openspec/changes/phase-1-contracts/design.md` prints `1`.
- [x] 4.5 Check that the test notes cover every in-scope requirement. Check: `for id in AUTH-001 AUTH-002 AUTH-003 AUTH-004 AUTH-005 AUTH-006 AUTH-007 AUTH-008 CAT-001 CAT-002 CAT-003 CAT-004 CAT-005 WEB-001 WEB-004 WEB-006 WEB-008 WEB-009 WEB-010 NFR-005 NFR-011 QA-019 QA-020; do grep -q "| $id " openspec/changes/phase-1-contracts/design.md || echo "missing $id"; done` prints nothing.
- [x] 4.6 Check that the two scope exceptions are recorded. Check: `grep -c '^- \*\*E-[12],' openspec/changes/phase-1-contracts/design.md` prints `2`.
- [x] 4.7 Check that `web-foundation` is added before `web-auth` and `web-catalog`. Check: `grep -A10 '^Phase 1 becomes five implementation' openspec/changes/phase-1-contracts/design.md | grep -cE '^\\| *4 *\\| *\`web-foundation\` *\\|'` prints `1`.
- [x] 4.8 Check that the T-07 rule is recorded. Check: `grep -c 'thin Server Components' openspec/changes/phase-1-contracts/design.md` prints `1`.
- [x] 4.9 Check that the QA prerequisites are listed. Check: `grep -c '^### D-12: QA prerequisites' openspec/changes/phase-1-contracts/design.md` prints `1`.
- [x] 4.10 Check that E-1 says phase 3. Check: `grep -c 'end of phase 3' openspec/changes/phase-1-contracts/design.md` prints at least `1`.
- [x] 4.11 Check that `api-tests` runs on every pull request. Check: `grep -c 'every pull request' openspec/changes/phase-1-contracts/design.md` prints `1`.

## 5. Proposal

- [x] 5.1 Write `proposal.md` with the Jira line first and the `auth` capability as the only modified capability. Check: `head -1 openspec/changes/phase-1-contracts/proposal.md` prints `Jira: KAN-11 (epic KAN-2)`.
- [x] 5.2 Check that the proposal adds no capability and changes no other capability. Check: `grep -c '^- `auth`' openspec/changes/phase-1-contracts/proposal.md` prints `1`.

## 6. Validation and delivery

- [x] 6.1 Validate the change. Check: `openspec validate phase-1-contracts --strict` exits 0.
- [x] 6.2 Validate the contract. Check: `npx --yes @redocly/cli@2.82.0 lint contracts/openapi/api.yaml --config contracts/openapi/redocly.yaml` exits 0.
- [x] 6.3 Check the file scope. Check: `git status --porcelain | awk '{print $2}'` lists only paths under `contracts/openapi/` or `openspec/changes/phase-1-contracts/`.
- [x] 6.4 Commit with a Conventional Commit subject and the Jira key at the end. Check: `git log -1 --pretty=%s` matches `^docs\(contracts\): .+ \(KAN-11\)$`.
- [x] 6.5 Push the branch and open the pull request with the same subject as the squash commit. Check: `git status --short --branch` shows no local commit ahead of the remote. Merged in pull request #5.
- [x] 6.6 Record the AUTH-008 approval with the date of the QA owner's decision (D-12). Check: `grep -c 'AUTH-008 (draft)' openspec/changes/phase-1-contracts/design.md` prints `0`.

## Workflow follow-up

- The QA owner has approved Q-01..Q-21, Q-27 and Q-28, and T-01/T-02/T-03/T-05/T-06/T-08. Q-23, Q-24, Q-25, Q-26, T-04 and T-07 are approved with conditions; the conditions are recorded in `open-questions.md`.
- The QA owner approved AUTH-008 on 25 November 2026. `auth-api` can start (D-12).
- The QA owner creates the Jira stories for the split changes. This change does not create them.
- Q-23 and Q-28 are decided. `web-foundation` follows the conditions of Q-23 and T-07.
- Archive this change only after its pull request is merged. `openspec/specs/` changes at archive time only. Archive is a separate change.
