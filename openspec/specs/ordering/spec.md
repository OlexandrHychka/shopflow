# ordering Specification

## Purpose
Defines order creation, total calculation, saga status transitions and customer order access.

## Requirements

### Requirement: ORD-001
WHEN an authenticated Customer sends an order with 1 to 20 items, the API SHALL forward the order to the Order Service.

#### Scenario: Valid order forwarded
- **WHEN** an authenticated Customer sends an order with 1 to 20 items
- **THEN** the API forwards the order to the Order Service

### Requirement: ORD-002
IF an item quantity is less than 1 or more than 99, THEN the Order Service SHALL return HTTP 400.

#### Scenario: Invalid item quantity
- **WHEN** an order item has a quantity less than 1 or more than 99
- **THEN** the Order Service returns HTTP 400

### Requirement: ORD-003
IF the order has a SKU that does not exist, THEN the Order Service SHALL return HTTP 422.

#### Scenario: Unknown SKU in an order
- **WHEN** an order has a SKU that does not exist
- **THEN** the Order Service returns HTTP 422

### Requirement: ORD-010
WHEN the Order Service accepts a valid order, the Order Service SHALL save the order with status PENDING and return HTTP 201.

#### Scenario: Accepted order
- **WHEN** the Order Service accepts a valid order
- **THEN** the Order Service saves the order with status PENDING and returns HTTP 201

### Requirement: ORD-011
WHEN the Order Service saves an order, the Order Service SHALL publish `order.created.v1` in the same unit of work (outbox pattern).

#### Scenario: Outbox publish
- **WHEN** the Order Service saves an order
- **THEN** the Order Service publishes `order.created.v1` in the same unit of work

### Requirement: ORD-012
The Order Service SHALL calculate the total in EUR from the unit prices at the time of the order.

#### Scenario: Total calculation
- **WHEN** the Order Service calculates the total of an order
- **THEN** the Order Service calculates the total in EUR from the unit prices at the time of the order

### Requirement: ORD-020
WHEN the Order Service receives `stock.reserved.v1`, the Order Service SHALL set the status of the order to CONFIRMED.

#### Scenario: Stock reserved event
- **WHEN** the Order Service receives `stock.reserved.v1`
- **THEN** the Order Service sets the status of the order to CONFIRMED

### Requirement: ORD-021
WHEN the Order Service receives `stock.rejected.v1`, the Order Service SHALL set the status of the order to REJECTED.

#### Scenario: Stock rejected event
- **WHEN** the Order Service receives `stock.rejected.v1`
- **THEN** the Order Service sets the status of the order to REJECTED

### Requirement: ORD-022
WHEN the status of an order changes to CONFIRMED or REJECTED, the Order Service SHALL publish `order.confirmed.v1` or `order.rejected.v1`.

#### Scenario: Final status event
- **WHEN** the status of an order changes to CONFIRMED or REJECTED
- **THEN** the Order Service publishes `order.confirmed.v1` or `order.rejected.v1`

### Requirement: ORD-023
IF the Order Service receives an Event with an `eventId` that it already processed, THEN the Order Service SHALL ignore the Event.

#### Scenario: Duplicate Event
- **WHEN** the Order Service receives an Event with an `eventId` that it already processed
- **THEN** the Order Service ignores the Event

### Requirement: ORD-024
IF the status of an order is CONFIRMED or REJECTED, THEN the Order Service SHALL not change the status.

#### Scenario: Final status is immutable
- **WHEN** the status of an order is CONFIRMED or REJECTED
- **THEN** the Order Service does not change the status

### Requirement: ORD-025
IF the Order Service cannot process an Event after 3 attempts, THEN the Order Service SHALL send the Event to the `.dlq` topic.

#### Scenario: Event processing fails three times
- **WHEN** the Order Service cannot process an Event after 3 attempts
- **THEN** the Order Service sends the Event to the `.dlq` topic

### Requirement: ORD-030
WHEN a Customer requests an order, the API SHALL return the order only if the order belongs to that Customer. Otherwise, the API SHALL return HTTP 404.

#### Scenario: Order owned by another Customer
- **WHEN** a Customer requests an order that does not belong to that Customer
- **THEN** the API returns HTTP 404

### Requirement: ORD-031
WHILE the status of an order is PENDING, the Web UI SHALL show the message "Processing".

#### Scenario: Pending order message
- **WHEN** the status of an order is PENDING
- **THEN** the Web UI shows the message "Processing"

### Requirement: ORD-032
WHEN the status of an order changes to CONFIRMED or REJECTED, the Web UI SHALL show the new status within 10 seconds.

#### Scenario: Status update in the Web UI
- **WHEN** the status of an order changes to CONFIRMED or REJECTED
- **THEN** the Web UI shows the new status within 10 seconds

### Requirement: ORD-033
The Web UI SHALL show the list of orders of the Customer, newest first.

#### Scenario: Order list order
- **WHEN** the Web UI shows the list of orders of the Customer
- **THEN** the Web UI shows the newest order first
