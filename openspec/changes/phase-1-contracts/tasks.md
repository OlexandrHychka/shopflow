# Tasks

This change delivers planning artifacts only. It writes no application code, no test and no workflow.

## 1. Contract draft

- [ ] 1.1 Write `contracts/openapi/api.yaml` as OpenAPI 3.1.1 with the six operations, the schemas, the shared Problem format, the pagination and search parameters and the examples. Check: `npx --yes @redocly/cli@2.82.0 lint contracts/openapi/api.yaml --config contracts/openapi/redocly.yaml` exits 0.
- [ ] 1.2 Add `contracts/openapi/redocly.yaml` with the pinned rule set and the two documented exceptions. Check: the same lint command reports no error and no warning.
- [ ] 1.3 Check that the six required paths are present. Check: `grep -cE '^  /(health|auth/register|auth/login|auth/me|products|products/\{sku\}):' contracts/openapi/api.yaml` prints `6`.
- [ ] 1.4 Check that HTTP 400, 401, 404 and 409 are defined. Check: `grep -cE "^        '(400|401|404|409)':" contracts/openapi/api.yaml` prints at least `4`.
- [ ] 1.5 Check that every error response uses `application/problem+json` and the `Problem` schema. Check: `grep -c 'application/problem+json' contracts/openapi/api.yaml` prints at least `5`, and no error response uses `application/json`.
- [ ] 1.6 Check that every operation has an `operationId` and an example on each success response. Check: `grep -c 'operationId:' contracts/openapi/api.yaml` prints `6`.

## 2. Requirement delta

- [ ] 2.1 Write `specs/auth/spec.md` as a delta with `## ADDED Requirements` and AUTH-008 only, in EARS and STE style. Check: `grep -c '^### Requirement:' openspec/changes/phase-1-contracts/specs/auth/spec.md` prints `1`.
- [ ] 2.2 Check that AUTH-008 has the three scenarios and the `[M | C,K]` tag. Check: `grep -c '^#### Scenario:' openspec/changes/phase-1-contracts/specs/auth/spec.md` prints `3` and `grep -c '\[M | C,K\]'` prints `1`.
- [ ] 2.3 Check that no file under `openspec/specs/` changed. Check: `git diff --name-only -- openspec/specs` prints nothing.
- [ ] 2.4 Check that the delta does not change an existing requirement. Check: `grep -E 'AUTH-00[1-7]' openspec/changes/phase-1-contracts/specs/auth/spec.md` prints nothing.

## 3. Open questions

- [ ] 3.1 Write `open-questions.md` with the requirement ambiguities. Check: `grep -c '^### Q-' openspec/changes/phase-1-contracts/open-questions.md` prints `23`.
- [ ] 3.2 Check that the ten required topics are present. Check: `grep -ciE 'password rules|email normalization|token format|maximum page size|default sort order|search semantics|SKU format|price representation|error format|role is exposed' openspec/changes/phase-1-contracts/open-questions.md` prints at least `10`.
- [ ] 3.3 Write the eight technical decisions with options and a recommendation. Check: `grep -c '^### T-' openspec/changes/phase-1-contracts/open-questions.md` prints `8` and `grep -c '^\*\*Recommendation\.\*\*'` prints `8`.
- [ ] 3.4 Check that every item asks for approval and none decides. Check: `grep -c '^\*\*Needs approval from the QA owner\.\*\*' openspec/changes/phase-1-contracts/open-questions.md` prints `31`.
- [ ] 3.5 Check that the key reuse is recorded. Check: `grep -c 'KAN-10 is already' openspec/changes/phase-1-contracts/open-questions.md` prints `1`.

## 4. Design, split, CI and test notes

- [ ] 4.1 Write `design.md` with the contract decisions, the endpoint status matrix, the split, the CI plan and the test notes. Check: `grep -cE '^### D-[0-9]+' openspec/changes/phase-1-contracts/design.md` prints `10`.
- [ ] 4.2 Check that the split names four implementation changes and one CI change. Check: `grep -cE '\| (2|3|4|5|6) \| `openspec/changes/phase-1-contracts/design.md` prints at least `5`.
- [ ] 4.3 Check that each split row states scope, requirement IDs, order, dependency and parallel status. Check: `grep -c '^| [0-9] |' openspec/changes/phase-1-contracts/design.md` prints `6`.
- [ ] 4.4 Check that the CI plan names each new or changed job and an estimated run time. Check: `grep -c 'Estimated added run time' openspec/changes/phase-1-contracts/design.md` prints `1`.
- [ ] 4.5 Check that the test notes cover every in-scope requirement. Check: `for id in AUTH-001 AUTH-002 AUTH-003 AUTH-004 AUTH-005 AUTH-006 AUTH-007 AUTH-008 CAT-001 CAT-002 CAT-003 CAT-004 CAT-005 WEB-001 WEB-004 WEB-006 WEB-008 WEB-009 WEB-010 NFR-005 NFR-011 QA-019 QA-020; do grep -q "| $id " openspec/changes/phase-1-contracts/design.md || echo "missing $id"; done` prints nothing.
- [ ] 4.6 Check that the two scope exceptions are recorded. Check: `grep -c '^- \*\*E-[12],' openspec/changes/phase-1-contracts/design.md` prints `2`.

## 5. Proposal

- [ ] 5.1 Write `proposal.md` with the Jira line first and the `auth` capability as the only modified capability. Check: `head -1 openspec/changes/phase-1-contracts/proposal.md` prints `Jira: KAN-10 (epic KAN-2)`.
- [ ] 5.2 Check that the proposal adds no capability and changes no other capability. Check: `grep -c '^- `auth`' openspec/changes/phase-1-contracts/proposal.md` prints `1`.

## 6. Validation and delivery

- [ ] 6.1 Validate the change. Check: `openspec validate phase-1-contracts --strict` exits 0.
- [ ] 6.2 Validate the contract. Check: `npx --yes @redocly/cli@2.82.0 lint contracts/openapi/api.yaml --config contracts/openapi/redocly.yaml` exits 0.
- [ ] 6.3 Check the file scope. Check: `git status --porcelain` lists only files under `contracts/openapi/` and `openspec/changes/phase-1-contracts/`.
- [ ] 6.4 Commit with a Conventional Commit subject and the Jira key at the end. Check: `git log -1 --pretty=%s` matches `^docs\(contracts\): .+ \(KAN-10\)$`.
- [ ] 6.5 Push the branch and open the pull request with the same subject as the squash commit. Check: `git status --short --branch` shows no local commit ahead of the remote.

## Workflow follow-up

- The QA owner approves AUTH-008 and the answers in `open-questions.md`.
- The QA owner creates the Jira stories for the split changes. This change does not create them.
- The QA owner reviews the contract before any implementation change starts.
- Archive this change only after its pull request is merged. `openspec/specs/` changes at archive time only.
