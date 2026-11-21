# currency Specification

## Purpose
Defines currency conversion, exchange-rate caching and fallback behavior for product prices.

## Requirements

### Requirement: CUR-001
WHERE the request contains the parameter `currency`, the API SHALL return prices in that currency.

#### Scenario: Currency parameter present
- **WHEN** a request contains the parameter `currency`
- **THEN** the API returns prices in that currency

### Requirement: CUR-002
The API SHALL get exchange rates from the Rate Provider with the base currency EUR.

#### Scenario: Exchange-rate source
- **WHEN** the API gets exchange rates
- **THEN** the API gets the rates from the Rate Provider with the base currency EUR

### Requirement: CUR-003
The API SHALL keep each rate in cache for 1 hour.

#### Scenario: Rate cache duration
- **WHEN** the API gets an exchange rate
- **THEN** the API keeps the rate in cache for 1 hour

### Requirement: CUR-004
The API SHALL round converted prices to 2 decimal places.

#### Scenario: Converted price rounding
- **WHEN** the API converts a price
- **THEN** the API rounds the converted price to 2 decimal places

### Requirement: CUR-005
IF the Rate Provider is not available, THEN the API SHALL use the last cached rate.

#### Scenario: Rate Provider unavailable with a cached rate
- **WHEN** the Rate Provider is not available and a cached rate exists
- **THEN** the API uses the last cached rate

### Requirement: CUR-006
IF the Rate Provider is not available and the cache is empty, THEN the API SHALL return prices in EUR and the header `X-Currency-Fallback: true`.

#### Scenario: Rate Provider unavailable without a cached rate
- **WHEN** the Rate Provider is not available and the cache is empty
- **THEN** the API returns prices in EUR and the header `X-Currency-Fallback: true`

### Requirement: CUR-007
IF the currency code is not supported, THEN the API SHALL return HTTP 400.

#### Scenario: Unsupported currency code
- **WHEN** a request contains a currency code that is not supported
- **THEN** the API returns HTTP 400

### Requirement: CUR-008
The API SHALL send requests to the Rate Provider only through one client module.

#### Scenario: Rate Provider client
- **WHEN** the API sends a request to the Rate Provider
- **THEN** the API sends the request only through one client module

### Requirement: CUR-009
WHEN the Rate Provider returns a response that does not match the expected schema, THEN the API SHALL treat the response as not available.

#### Scenario: Unexpected Rate Provider response
- **WHEN** the Rate Provider returns a response that does not match the expected schema
- **THEN** the API treats the response as not available
