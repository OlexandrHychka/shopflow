# auth Specification

## Purpose
Defines account registration, login, token handling and password storage for ShopFlow customers.

## Requirements

### Requirement: AUTH-001
WHEN a visitor sends a valid registration request, the API SHALL create an account and return a token.

#### Scenario: Valid registration
- **WHEN** a visitor sends a valid registration request
- **THEN** the API creates an account and returns a token

### Requirement: AUTH-002
IF the email address is already registered, THEN the API SHALL return HTTP 409.

#### Scenario: Duplicate email address
- **WHEN** a visitor sends a registration request with an email address that is already registered
- **THEN** the API returns HTTP 409

### Requirement: AUTH-003
IF the password has fewer than 8 characters, THEN the API SHALL return HTTP 400 and a field error.

#### Scenario: Short password
- **WHEN** a visitor sends a registration request with a password that has fewer than 8 characters
- **THEN** the API returns HTTP 400 with a field error

### Requirement: AUTH-004
WHEN a user sends valid credentials, the API SHALL return a token that expires after 60 minutes.

#### Scenario: Valid login
- **WHEN** a user sends valid credentials
- **THEN** the API returns a token that expires after 60 minutes

### Requirement: AUTH-005
IF the token is missing, invalid or expired, THEN the API SHALL return HTTP 401 for each protected endpoint.

#### Scenario: Request without a valid token
- **WHEN** a request to a protected endpoint has no token, an invalid token or an expired token
- **THEN** the API returns HTTP 401

### Requirement: AUTH-006
The API SHALL store only a salted hash of each password.

#### Scenario: Password storage
- **WHEN** the API stores an account password
- **THEN** the API stores only a salted hash of the password

### Requirement: AUTH-007
The API SHALL give the role CUSTOMER to each new account.

#### Scenario: New account role
- **WHEN** the API creates a new account
- **THEN** the API gives the role CUSTOMER to the account
