# AGENTS.md

This file is the working agreement for every coding agent in the ShopFlow repository.
It contains the writing rules, the controlled vocabulary and the ownership rules that apply to all work.

## 1. Writing conventions

Source: SRS B1.3.

- The text follows ASD-STE100 rules: short sentences, active voice, one term for one thing, no synonyms. The glossary in section 3 is the controlled vocabulary.
- Each requirement uses an EARS pattern (section 2).
- Each requirement has an ID, a priority and a verification code at the end: `[priority | verification]`.
- Each requirement states one need only (ISO/IEC/IEEE 29148: singular, unambiguous, verifiable).
- Deliberate deviation: STE uses "must" for obligations. The SRS uses "shall", because EARS and ISO/IEC/IEEE 29148 use "shall". Run the text through an STE checker before you claim formal conformance.

For OpenSpec spec files, write the obligation as `SHALL` in uppercase. The meaning is the same as "shall" in the SRS.

Requirement IDs are stable. Do not rename, renumber, merge or delete a requirement ID. Do not add or change a requirement without a separate change proposal.

## 2. EARS patterns

Source: SRS B1.4.

| Pattern | Template |
| --- | --- |
| Ubiquitous | The \<system> shall \<response>. |
| Event-driven | WHEN \<trigger>, the \<system> shall \<response>. |
| State-driven | WHILE \<state>, the \<system> shall \<response>. |
| Unwanted behavior | IF \<condition>, THEN the \<system> shall \<response>. |
| Optional feature | WHERE \<feature is present>, the \<system> shall \<response>. |

**Priority:** M = must have, S = should have, C = could have (MoSCoW).

**Verification:** U = unit test, C = component test, K = contract test, I = multi-service integration test, A = API test (REST Assured, black box), W = UI test below the end-to-end level (unit, component, integration with MSW), E = end-to-end test, N = non-functional test, V = AI evaluation, D = demonstration or inspection.

## 3. Glossary

Source: SRS B1.5. This is the controlled vocabulary. Use these terms with these meanings.

| Term | Meaning |
| --- | --- |
| Customer | A person who uses the Web UI to buy products. |
| Administrator | A person who changes stock quantities. |
| Web UI | The Next.js application in `services/web`. |
| API | The TypeScript service in `services/api`. It is the only entry point for the Web UI. |
| Order Service | The Java service that owns orders. |
| Inventory Service | The Java service that owns stock. |
| Notification Service | The Java service that sends emails. |
| Assistant | The TypeScript service that answers questions with RAG. |
| Broker | The Kafka server. |
| Event | A JSON message on a Kafka topic. |
| SKU | The unique code of a product. |
| Rate Provider | The Frankfurter API (external service). |
| Mail Server | Mailpit. It receives SMTP email in the test environment. |
| Base currency | EUR. All prices are stored in EUR. |

## 4. Who does what

Source: SRS C2.

**Agents:** application code, unit tests of their own code, migrations, Dockerfiles, initial YAML for CI.

**You (the QA owner):** test strategy, acceptance scenarios (WHEN/THEN), API, contract, integration and E2E tests (yourself or an agent from your description in a **separate** session), PR review, CI operation, bug bank, exploratory testing.

Key rule: **a test is derived from a requirement, not from the code**. An agent that writes code and tests together often writes a test that confirms its own mistake. Therefore:

- scenarios and acceptance tests are ready before implementation;
- the implementation agent must not change the `tests/`, `contracts/` and `openspec/specs/` folders without a separate change proposal;
- in `CODEOWNERS`, these folders are assigned to you, and `main` requires your review.

## 5. Commands

Run these commands from the repository root.

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install dependencies after `package.json` or lockfile changes. |
| `pnpm lint` | Run ESLint on the whole repository. |
| `pnpm format:check` | Check Prettier formatting. |
| `pnpm format` | Apply Prettier formatting. |
| `pnpm typecheck` | Run TypeScript checks for every workspace package. |
| `pnpm test` | Run all package-level tests. |
| `pnpm --filter @shopflow/api test:unit` | Run API unit tests. |
| `pnpm --filter @shopflow/api test:component` | Run API component tests with Testcontainers. |
| `pnpm --filter @shopflow/web test` | Run Web UI component tests. |
| `pnpm --filter @shopflow/e2e test:e2e` | Run Playwright E2E tests. |
| `docker compose -f infra/compose/docker-compose.yml up --wait` | Start the whole system. |
| `docker compose -f infra/compose/docker-compose.yml down -v` | Stop the system and remove volumes. |

The toolchain decisions and pinned versions are in `docs/adr/0001-toolchain.md`.

## 6. Jira and Git conventions

- The Jira project key is `KAN`. Never invent a key. If a task has no key, stop and ask the QA owner.
- Branch name: `<type>/KAN-<n>-<short-kebab-slug>`. Types: `feature`, `fix`, `chore`, `docs`, `test`, `ci`. The slug has at most 5 words.
- Commit message: Conventional Commits. Put the key at the end of the subject, for example `feat(auth): add registration endpoint (KAN-12)`.
- Pull request title: same as the squash commit subject, with the key. Put the key in the description too. Do not put a Jira URL in the repository files or in the pull request text. Use the key only.
- One story = one OpenSpec change = one branch = one pull request.
- The first lines of `proposal.md` of each change are: `Jira: KAN-<n> (epic KAN-<m>)`.
- You do not change Jira statuses. The QA owner does.
- Epic start protocol. Before work on a new epic starts:
  1. Run `openspec list` and list all changes.
  2. Archive only a change that is complete (all tasks done) AND merged to main. Check the git history. Never archive an incomplete or unmerged change.
  3. Archive in a separate small pull request, branch `chore/KAN-<n>-archive-<names>`. Use `openspec archive`. If the change has no delta specs, use the option that skips spec updates (check `openspec archive --help`; do not guess).
  4. Show the QA owner what moved. Wait for the merge before the new epic work starts.
- Archiving is the only step that updates `openspec/specs/` from a change. Do it only after the pull request of that change is merged.
