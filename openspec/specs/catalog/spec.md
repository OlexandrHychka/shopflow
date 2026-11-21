# catalog Specification

## Purpose
Defines the product catalog, seeded products, search, pagination and stock status shown to customers.

## Requirements

### Requirement: CAT-001
The API SHALL store at least 20 seeded products at first start. Each product has a SKU, a name, a description and a price in EUR.

#### Scenario: First start with an empty catalog
- **WHEN** the API starts with an empty catalog
- **THEN** the API stores at least 20 seeded products, each with a SKU, a name, a description and a price in EUR

### Requirement: CAT-002
WHEN a client requests `GET /products`, the API SHALL return a page of products. The default page size is 10.

#### Scenario: Request without a page size
- **WHEN** a client requests `GET /products` without a page size
- **THEN** the API returns a page of 10 products

### Requirement: CAT-003
WHEN a client sends a search text, the API SHALL return only the products whose name contains that text.

#### Scenario: Search by name
- **WHEN** a client sends a search text with `GET /products`
- **THEN** the API returns only the products whose name contains that text

### Requirement: CAT-004
IF a SKU does not exist, THEN the API SHALL return HTTP 404 for `GET /products/{sku}`.

#### Scenario: Unknown SKU
- **WHEN** a client requests `GET /products/{sku}` with a SKU that does not exist
- **THEN** the API returns HTTP 404

### Requirement: CAT-005
WHEN the Web UI shows a product list, the Web UI SHALL show the name, the price and the stock status of each product.

#### Scenario: Product list content
- **WHEN** the Web UI shows a product list
- **THEN** the Web UI shows the name, the price and the stock status of each product

### Requirement: CAT-006
The API SHALL get the stock status from the Inventory Service. The status is IN\_STOCK or OUT\_OF\_STOCK.

#### Scenario: Stock status source
- **WHEN** the API gets the stock status of a product
- **THEN** the API gets the status from the Inventory Service and the status is IN\_STOCK or OUT\_OF\_STOCK

### Requirement: CAT-007
IF the Inventory Service does not respond within 2 seconds, THEN the API SHALL return the products without stock status.

#### Scenario: Inventory Service timeout
- **WHEN** the Inventory Service does not respond within 2 seconds
- **THEN** the API returns the products without stock status
