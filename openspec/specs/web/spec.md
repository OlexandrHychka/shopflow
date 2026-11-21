# web Specification

## Purpose
Defines the pages, cart, currency display, error handling and testability of the ShopFlow Web UI.

## Requirements

### Requirement: WEB-001
The Web UI SHALL have these pages: product list, product detail, cart, checkout, order list, order detail, login, registration.

#### Scenario: Required pages
- **WHEN** a user uses the Web UI
- **THEN** the Web UI has these pages: product list, product detail, cart, checkout, order list, order detail, login, registration

### Requirement: WEB-002
The Web UI SHALL keep the cart in the browser until the Customer submits the order.

#### Scenario: Cart before order submission
- **WHEN** the Customer adds products to the cart and does not submit the order
- **THEN** the Web UI keeps the cart in the browser

### Requirement: WEB-003
WHEN the Customer changes the currency selector, the Web UI SHALL show all prices in the new currency.

#### Scenario: Currency selector change
- **WHEN** the Customer changes the currency selector
- **THEN** the Web UI shows all prices in the new currency

### Requirement: WEB-004
IF the API returns an error, THEN the Web UI SHALL show a message that does not contain technical details.

#### Scenario: API error in the Web UI
- **WHEN** the API returns an error
- **THEN** the Web UI shows a message that does not contain technical details

### Requirement: WEB-005
WHILE the Customer is not logged in, the Web UI SHALL redirect the checkout page to the login page.

#### Scenario: Checkout without login
- **WHEN** the Customer is not logged in and opens the checkout page
- **THEN** the Web UI redirects the checkout page to the login page

### Requirement: WEB-006
The Web UI SHALL give each interactive element a stable `data-testid` attribute.

#### Scenario: Interactive element identifier
- **WHEN** the Web UI renders an interactive element
- **THEN** the element has a stable `data-testid` attribute

### Requirement: WEB-007
The Web UI SHALL have no critical accessibility violation on the product list and the checkout page.

#### Scenario: Accessibility of product list and checkout
- **WHEN** the Web UI shows the product list and the checkout page
- **THEN** the Web UI has no critical accessibility violation

### Requirement: WEB-008
Each Web UI component that shows data SHALL have a test for these states: loading, error, empty and filled.

#### Scenario: Data component states
- **WHEN** a Web UI component that shows data is tested
- **THEN** the test covers the loading, error, empty and filled states

### Requirement: WEB-009
The Web UI SHALL keep the business logic (cart total, price format, form validation) in modules that do not depend on React or Next.js.

#### Scenario: Business logic modules
- **WHEN** the Web UI implements cart total, price format or form validation
- **THEN** the business logic is in modules that do not depend on React or Next.js

### Requirement: WEB-010
The Web UI tests that call the API SHALL use MSW handlers that match the OpenAPI file of the API.

#### Scenario: MSW handlers for API calls
- **WHEN** a Web UI test calls the API
- **THEN** the test uses MSW handlers that match the OpenAPI file of the API
