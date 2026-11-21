# inventory Specification

## Purpose
Defines stock storage, reservation, rejection and administrator stock changes.

## Requirements

### Requirement: INV-001
The Inventory Service SHALL store the available quantity for each SKU.

#### Scenario: Stock storage per SKU
- **WHEN** the Inventory Service stores stock
- **THEN** the Inventory Service stores the available quantity for each SKU

### Requirement: INV-002
WHEN the Inventory Service receives `order.created.v1` and all items have enough stock, the Inventory Service SHALL reserve the quantities and publish `stock.reserved.v1`.

#### Scenario: Enough stock for all items
- **WHEN** the Inventory Service receives `order.created.v1` and all items have enough stock
- **THEN** the Inventory Service reserves the quantities and publishes `stock.reserved.v1`

### Requirement: INV-003
IF one item has not enough stock, THEN the Inventory Service SHALL reserve nothing and publish `stock.rejected.v1` with the reason INSUFFICIENT\_STOCK.

#### Scenario: Insufficient stock
- **WHEN** one item of an order has not enough stock
- **THEN** the Inventory Service reserves nothing and publishes `stock.rejected.v1` with the reason INSUFFICIENT\_STOCK

### Requirement: INV-004
IF the order has an unknown SKU, THEN the Inventory Service SHALL publish `stock.rejected.v1` with the reason UNKNOWN\_SKU.

#### Scenario: Unknown SKU in the order
- **WHEN** an order has an unknown SKU
- **THEN** the Inventory Service publishes `stock.rejected.v1` with the reason UNKNOWN\_SKU

### Requirement: INV-005
IF the Inventory Service receives the same `orderId` more than once, THEN the Inventory Service SHALL reserve the stock one time only.

#### Scenario: Duplicate order event
- **WHEN** the Inventory Service receives the same `orderId` more than once
- **THEN** the Inventory Service reserves the stock one time only

### Requirement: INV-006
The Inventory Service SHALL not allow a negative available quantity, also with parallel orders.

#### Scenario: Parallel orders compete for stock
- **WHEN** parallel orders compete for the same stock
- **THEN** the Inventory Service does not allow a negative available quantity

### Requirement: INV-007
WHEN an Administrator sends `PUT /stock/{sku}` with a quantity of 0 or more, the Inventory Service SHALL set the quantity.

#### Scenario: Administrator sets a stock quantity
- **WHEN** an Administrator sends `PUT /stock/{sku}` with a quantity of 0 or more
- **THEN** the Inventory Service sets the quantity

### Requirement: INV-008
IF a user without the role ADMIN calls `PUT /stock/{sku}`, THEN the API SHALL return HTTP 403.

#### Scenario: Non-administrator changes stock
- **WHEN** a user without the role ADMIN calls `PUT /stock/{sku}`
- **THEN** the API returns HTTP 403
