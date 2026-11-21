# non-functional Specification

## Purpose
Defines performance, reliability, security, observability, portability, data and test-data constraints for all services.

## Requirements

### Requirement: NFR-001
(Performance) WHILE 20 virtual users send requests, the API SHALL answer `GET /products` with a 95th percentile of less than 500 ms.

#### Scenario: Product list under load
- **WHEN** 20 virtual users send requests
- **THEN** the API answers `GET /products` with a 95th percentile of less than 500 ms

### Requirement: NFR-002
(Performance) The saga from order creation to the final status SHALL take less than 5 seconds in the test environment.

#### Scenario: Saga duration
- **WHEN** an order is created in the test environment
- **THEN** the saga from order creation to the final status takes less than 5 seconds

### Requirement: NFR-003
(Reliability) IF one service stops, THEN the other services SHALL continue to answer their own health checks.

#### Scenario: One service stops
- **WHEN** one service stops
- **THEN** the other services continue to answer their own health checks

### Requirement: NFR-004
(Reliability) WHEN the Order Service starts after a stop, the Order Service SHALL process the Events that it did not read.

#### Scenario: Order Service restart
- **WHEN** the Order Service starts after a stop
- **THEN** the Order Service processes the Events that it did not read

### Requirement: NFR-005
(Security) The API SHALL not return a stack trace, a password hash or an internal URL in any response.

#### Scenario: Response content
- **WHEN** the API returns a response
- **THEN** the response does not contain a stack trace, a password hash or an internal URL

### Requirement: NFR-006
(Security) Each service SHALL read secrets from environment variables. The repository SHALL not contain secrets.

#### Scenario: Secret configuration
- **WHEN** a service reads a secret
- **THEN** the service reads the secret from an environment variable

#### Scenario: Repository without secrets
- **WHEN** the repository is inspected
- **THEN** the repository does not contain secrets

### Requirement: NFR-007
(Observability) Each service SHALL write structured JSON logs. Each log line SHALL contain a correlation ID.

#### Scenario: Structured log line
- **WHEN** a service writes a log line
- **THEN** the log line is structured JSON and contains a correlation ID

### Requirement: NFR-008
(Observability) Each service SHALL have the endpoint `GET /health`. It returns HTTP 200 only when the dependencies of the service are available.

#### Scenario: Dependencies available
- **WHEN** the dependencies of a service are available
- **THEN** `GET /health` returns HTTP 200

#### Scenario: Dependency not available
- **WHEN** a dependency of a service is not available
- **THEN** `GET /health` does not return HTTP 200

### Requirement: NFR-009
(Portability) The command `docker compose up` SHALL start the complete system on a machine with 8 GB of RAM. The Assistant and the Ollama model are in an optional profile.

#### Scenario: Start on an 8 GB machine
- **WHEN** a machine with 8 GB of RAM runs `docker compose up`
- **THEN** the complete system starts

#### Scenario: Optional profile disabled
- **WHEN** the optional profile is not enabled
- **THEN** the Assistant and the Ollama model do not start

### Requirement: NFR-010
(Compatibility) The API SHALL keep the existing fields of a response when it adds new fields.

#### Scenario: Additive response change
- **WHEN** the API adds a new field to a response
- **THEN** the API keeps the existing fields of the response

### Requirement: NFR-011
(Data) Each service SHALL create its own database schema with a versioned migration tool (Flyway for Java, a TypeScript migration tool for API and Assistant).

#### Scenario: Schema creation
- **WHEN** a service creates its database schema
- **THEN** the service uses a versioned migration tool

### Requirement: NFR-012
(Test data) The system SHALL have a reset endpoint or script that sets the seed data. It SHALL exist only when `APP_ENV=test`.

#### Scenario: Reset in the test environment
- **WHEN** `APP_ENV=test`
- **THEN** the system has a reset endpoint or script that sets the seed data

#### Scenario: Reset outside the test environment
- **WHEN** `APP_ENV` is not `test`
- **THEN** the reset endpoint or script does not exist
