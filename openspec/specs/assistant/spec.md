# assistant Specification

## Purpose
Defines the retrieval-augmented answers, sources and safety rules of the ShopFlow Assistant.

## Requirements

### Requirement: AST-001
The Assistant SHALL index the documents in `services/assistant/knowledge/` at start. The documents are product descriptions, a return policy and a delivery policy.

#### Scenario: Index at start
- **WHEN** the Assistant starts
- **THEN** the Assistant indexes the documents in `services/assistant/knowledge/`

### Requirement: AST-002
WHEN a Customer sends a question, the Assistant SHALL find the most relevant document chunks and send them with the question to the language model.

#### Scenario: Question with retrieved chunks
- **WHEN** a Customer sends a question
- **THEN** the Assistant finds the most relevant document chunks and sends them with the question to the language model

### Requirement: AST-003
The Assistant SHALL return an answer and the list of source document names.

#### Scenario: Answer with sources
- **WHEN** the Assistant returns an answer
- **THEN** the Assistant returns the list of source document names

### Requirement: AST-004
The Assistant SHALL base each answer only on the retrieved chunks.

#### Scenario: Grounded answer
- **WHEN** the Assistant answers a question
- **THEN** the Assistant bases the answer only on the retrieved chunks

### Requirement: AST-005
IF the retrieved chunks do not contain the answer, THEN the Assistant SHALL say that it does not know.

#### Scenario: Answer absent from the chunks
- **WHEN** the retrieved chunks do not contain the answer
- **THEN** the Assistant says that it does not know

### Requirement: AST-006
IF the question asks for information about orders or personal data of another user, THEN the Assistant SHALL refuse.

#### Scenario: Request for another user's data
- **WHEN** the question asks for information about orders or personal data of another user
- **THEN** the Assistant refuses

### Requirement: AST-007
IF the question tries to change the instructions of the Assistant (prompt injection), THEN the Assistant SHALL keep its instructions and answer only the product question.

#### Scenario: Prompt injection
- **WHEN** the question tries to change the instructions of the Assistant
- **THEN** the Assistant keeps its instructions and answers only the product question

### Requirement: AST-008
The Assistant SHALL answer in the language of the question.

#### Scenario: Answer language
- **WHEN** the Customer sends a question in a language
- **THEN** the Assistant answers in the language of the question

### Requirement: AST-009
WHERE the environment variable `LLM_PROVIDER` is set, the Assistant SHALL use that provider. The default is a local Ollama model.

#### Scenario: Configured provider
- **WHEN** the environment variable `LLM_PROVIDER` is set
- **THEN** the Assistant uses that provider

#### Scenario: Default provider
- **WHEN** the environment variable `LLM_PROVIDER` is not set
- **THEN** the Assistant uses a local Ollama model
