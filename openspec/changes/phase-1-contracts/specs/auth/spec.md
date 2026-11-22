# Spec Delta

## ADDED Requirements

### Requirement: AUTH-008
WHEN a user sends a valid access token to `GET /auth/me`, the API SHALL return the identity of that user. The identity contains the user ID, the email address and the role. `[M | C,K]`

#### Scenario: Valid token
- **WHEN** a user sends a request to `GET /auth/me` with a valid access token
- **THEN** the API returns HTTP 200 with the user ID, the email address and the role

#### Scenario: Missing token
- **WHEN** a user sends a request to `GET /auth/me` without an access token
- **THEN** the API returns HTTP 401 with the shared error format

#### Scenario: Invalid or expired token
- **WHEN** a user sends a request to `GET /auth/me` with an invalid token or an expired token
- **THEN** the API returns HTTP 401 with the shared error format
