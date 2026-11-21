# notification Specification

## Purpose
Defines the emails that the Notification Service sends after an order reaches a final status.

## Requirements

### Requirement: NTF-001
WHEN the Notification Service receives `order.confirmed.v1`, the Notification Service SHALL send a confirmation email to `customerEmail`.

#### Scenario: Order confirmed
- **WHEN** the Notification Service receives `order.confirmed.v1`
- **THEN** the Notification Service sends a confirmation email to `customerEmail`

### Requirement: NTF-002
WHEN the Notification Service receives `order.rejected.v1`, the Notification Service SHALL send a rejection email that contains the reason.

#### Scenario: Order rejected
- **WHEN** the Notification Service receives `order.rejected.v1`
- **THEN** the Notification Service sends a rejection email that contains the reason

### Requirement: NTF-003
The confirmation email SHALL contain the order ID, the list of items and the total.

#### Scenario: Confirmation email content
- **WHEN** the Notification Service sends a confirmation email
- **THEN** the email contains the order ID, the list of items and the total

### Requirement: NTF-004
IF the Notification Service receives an Event that it already processed, THEN the Notification Service SHALL not send a second email.

#### Scenario: Duplicate Event
- **WHEN** the Notification Service receives an Event that it already processed
- **THEN** the Notification Service does not send a second email

### Requirement: NTF-005
IF the Mail Server is not available, THEN the Notification Service SHALL retry 3 times with an increasing delay.

#### Scenario: Mail Server unavailable
- **WHEN** the Mail Server is not available
- **THEN** the Notification Service retries 3 times with an increasing delay

### Requirement: NTF-006
IF all retries fail, THEN the Notification Service SHALL send the Event to the `.dlq` topic.

#### Scenario: All retries fail
- **WHEN** all retries fail
- **THEN** the Notification Service sends the Event to the `.dlq` topic
