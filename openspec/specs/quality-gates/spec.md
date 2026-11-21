# quality-gates Specification

## Purpose
Defines the test environment, pipeline checks and quality gates that every ShopFlow change must pass.

## Requirements

### Requirement: QA-001
WHEN a pull request is opened or updated, the CI pipeline SHALL run lint, unit tests, component tests and contract tests.

#### Scenario: Pull request checks
- **WHEN** a pull request is opened or updated
- **THEN** the CI pipeline runs lint, unit tests, component tests and contract tests

### Requirement: QA-002
The CI pipeline SHALL run only the tests of the changed services and of their contract partners.

#### Scenario: Change limited to some services
- **WHEN** a change affects only some services
- **THEN** the CI pipeline runs only the tests of the changed services and of their contract partners

### Requirement: QA-003
IF a required check fails, THEN the repository SHALL block the merge to `main`.

#### Scenario: Required check fails
- **WHEN** a required check fails
- **THEN** the repository blocks the merge to `main`

### Requirement: QA-004
WHEN a change is merged to `main`, the CI pipeline SHALL start the complete system with Docker Compose and run the multi-service integration tests and the end-to-end tests.

#### Scenario: Change merged to main
- **WHEN** a change is merged to `main`
- **THEN** the CI pipeline starts the complete system with Docker Compose and runs the multi-service integration tests and the end-to-end tests

### Requirement: QA-005
WHEN a consumer test creates a Pact file, the CI pipeline SHALL save the Pact file as an artifact. The provider pipeline SHALL verify it.

#### Scenario: Pact file saved
- **WHEN** a consumer test creates a Pact file
- **THEN** the CI pipeline saves the Pact file as an artifact

#### Scenario: Provider verification
- **WHEN** the provider pipeline runs
- **THEN** the provider pipeline verifies the Pact file

### Requirement: QA-006
WHERE a Pact Broker is present, the CI pipeline SHALL run `can-i-deploy` before it publishes images.

#### Scenario: Pact Broker present
- **WHEN** a Pact Broker is present
- **THEN** the CI pipeline runs `can-i-deploy` before it publishes images

### Requirement: QA-007
The CI pipeline SHALL run the nightly workflow every day. The nightly workflow runs the cross-browser end-to-end tests, the live Rate Provider check, the performance smoke test and the AI evaluation.

#### Scenario: Nightly workflow
- **WHEN** the nightly workflow runs
- **THEN** it runs the cross-browser end-to-end tests, the live Rate Provider check, the performance smoke test and the AI evaluation

### Requirement: QA-008
IF a test fails, THEN the CI pipeline SHALL save the test report, the service logs and (for end-to-end tests) the Playwright trace as artifacts.

#### Scenario: Test failure artifacts
- **WHEN** a test fails
- **THEN** the CI pipeline saves the test report, the service logs and, for end-to-end tests, the Playwright trace as artifacts

### Requirement: QA-009
The CI pipeline SHALL show a test summary in the job summary.

#### Scenario: Test summary
- **WHEN** the CI pipeline finishes a test run
- **THEN** the CI pipeline shows a test summary in the job summary

### Requirement: QA-010
The AI evaluation SHALL not block a merge. It SHALL report the metric values.

#### Scenario: AI evaluation result
- **WHEN** the AI evaluation runs
- **THEN** it does not block a merge and it reports the metric values

### Requirement: QA-011
Each integration and end-to-end test SHALL create its own data and SHALL not depend on the order of the tests.

#### Scenario: Test isolation
- **WHEN** an integration or end-to-end test runs
- **THEN** the test creates its own data and does not depend on the order of the tests

### Requirement: QA-012
The end-to-end tests SHALL check the sent email through the Mail Server API.

#### Scenario: Email verification
- **WHEN** an end-to-end test checks a sent email
- **THEN** the test checks the email through the Mail Server API

### Requirement: QA-013
The Pact file for the Rate Provider SHALL be checked each night against the live Rate Provider.

#### Scenario: Live Rate Provider check
- **WHEN** the nightly workflow runs
- **THEN** the Pact file for the Rate Provider is checked against the live Rate Provider

### Requirement: QA-014
The multi-service integration tests SHALL include these scenarios: successful order, insufficient stock, duplicate Event, Broker restart, Inventory Service stop.

#### Scenario: Required integration scenarios
- **WHEN** the multi-service integration tests run
- **THEN** they include the successful order, insufficient stock, duplicate Event, Broker restart and Inventory Service stop scenarios

### Requirement: QA-015
The API tests SHALL call the public endpoints of the API on the running system through REST Assured. They SHALL not use mocks of ShopFlow services. The tests are in `tests/api/`.

#### Scenario: Black-box API tests
- **WHEN** the API tests run
- **THEN** they call the public endpoints of the API on the running system through REST Assured and do not use mocks of ShopFlow services

#### Scenario: API test location
- **WHEN** the API tests are inspected
- **THEN** the tests are in `tests/api/`

### Requirement: QA-016
Each public endpoint of the API SHALL have at least one positive test, one validation test and one authorization test.

#### Scenario: Endpoint test coverage
- **WHEN** a public endpoint of the API is tested
- **THEN** it has at least one positive test, one validation test and one authorization test

### Requirement: QA-017
The API tests SHALL check each response against the OpenAPI file of the API: status code, headers and body schema.

#### Scenario: Response contract check
- **WHEN** an API test checks a response
- **THEN** the test checks the status code, headers and body schema against the OpenAPI file of the API

### Requirement: QA-018
WHEN a change is merged to `main`, the CI pipeline SHALL run the API tests after `docker compose up` and SHALL save the REST Assured report as an artifact.

#### Scenario: API tests after merge
- **WHEN** a change is merged to `main`
- **THEN** the CI pipeline runs the API tests after `docker compose up` and saves the REST Assured report as an artifact

### Requirement: QA-019
WHEN a pull request is opened or updated, the CI pipeline SHALL run the UI unit, component and integration tests.

#### Scenario: UI checks on a pull request
- **WHEN** a pull request is opened or updated
- **THEN** the CI pipeline runs the UI unit, component and integration tests

### Requirement: QA-020
IF an MSW handler does not match the OpenAPI file of the API, THEN the CI pipeline SHALL fail the check.

#### Scenario: MSW handler mismatch
- **WHEN** an MSW handler does not match the OpenAPI file of the API
- **THEN** the CI pipeline fails the check
