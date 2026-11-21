# ShopFlow — QA тест-стенд: концепт, архітектура, вимоги

Версія 0.1 · 21.11.2026 · Частина A — рішення і організація (українською). Частина B — SRS та архітектура (англійською, ASD-STE100 + EARS + ISO/IEC/IEEE 29148).

## Частина A. Концепт і рішення

### A1. Що будуємо

**ShopFlow** — міні-інтернет-магазин. Користувач реєструється, дивиться каталог (ціни у вибраній валюті), оформлює замовлення, система резервує товар на складі й надсилає лист. Окремий AI-асистент відповідає на питання про товари та правила повернення (RAG).

Чому саме магазин: у ньому природно виникає все, що ви хочете тренувати:

- **Багатосервісний флоу** — замовлення проходить через 3 сервіси (сага через чергу).
- **Контракти** — HTTP між UI і API, HTTP між API і Order, події в Kafka між Order, Inventory і Notification.
- **Сторонній сервіс** — курси валют (Frankfurter API, без ключа і реєстрації).
- **UI/E2E** — повний сценарій від каталогу до листа в Mailpit.
- **AI-оцінка** — асистент з базою знань (політики, опис товарів).

### A2. Стек (рекомендація)

| Компонент | Технологія | Навіщо / примітка |
| --- | --- | --- |
| web | Next.js 15, TypeScript | UI, Playwright E2E |
| api | Node.js, TypeScript, Fastify | BFF: авторизація, каталог, валюта, проксі до Order |
| order-service | Java 21, Spring Boot | замовлення, продюсер/консюмер подій |
| inventory-service | Java 21, Spring Boot | склад, резервування |
| notification-service | Java 21, Spring Boot | листи через SMTP (Mailpit) |
| assistant-service | TypeScript, pgvector, Ollama | RAG; опційна фаза |
| База | PostgreSQL, одна інстанція, окрема schema на сервіс | простіше локально, ізоляція зберігається |
| Черга | Kafka (apache/kafka, режим KRaft) | RabbitMQ теж підійде; Kafka дає більше матеріалу (партиції, ключі, DLQ) |
| Зовнішній API | Frankfurter (курси валют) | безкоштовний, без ключа. Опційно Stripe test mode |
| Пошта | Mailpit | локальний SMTP + API для перевірки листів |
| Контракти | Pact (HTTP і message), Pact Broker локально | consumer-driven |
| Eval | Python, DeepEval, pytest | окремий каталог `eval/` |
| CI | **GitHub Actions** | див. A4 |

**Чому GitHub Actions, а не GitLab CI:** runner `ubuntu-latest` має Docker, тож `docker compose up` на runner — це ваш «ефемерний staging». Для публічного репозиторію хвилини безкоштовні. Testcontainers працює без налаштувань. GitLab CI можна повторити пізніше як вправу з тими самими скриптами.

### A3. Піраміда тестів: що де

| Рівень | Інструмент | Що перевіряємо | Де запускається |
| --- | --- | --- | --- |
| Unit | Vitest (TS), JUnit 5 + Mockito (Java) | чиста логіка: розрахунок суми, валідація, конвертація валюти, машина станів замовлення | локально, PR |
| Component | Testcontainers (Postgres, Kafka), Fastify inject | один сервіс із реальною БД/чергою, інші залежності замінені | PR |
| UI unit | Vitest | логіка фронтенду без React: сума кошика, формат цін і валют, валідація форм | локально, PR |
| UI component | React Testing Library + Vitest (або Playwright Component Testing) | окремі компоненти в станах: loading, error, empty, OUT\_OF\_STOCK | PR |
| UI integration | Vitest або Playwright + MSW (Mock Service Worker) | сторінка Next.js з роутингом і data fetching, API замінений на MSW: помилки API, редірект на логін, зміна валюти | PR |
| Contract (HTTP) | Pact | web→api, api→order; provider verification | PR |
| Contract (message) | Pact message | схема подій між Order, Inventory, Notification | PR |
| Contract (3rd party) | Pact consumer проти Frankfurter + smoke на живий API | чи наш клієнт розуміє відповідь; чи API не змінився | PR (mock), nightly (live) |
| Multi-service integration | docker compose + REST Assured + Awaitility | сага: order → inventory → order → notification, без UI | main |
| API (black box) | REST Assured + JUnit 5, перевірка проти OpenAPI | публічні ендпоінти api на запущеній системі: статус-коди, схема відповіді, авторизація (401/403/404), валідація, пагінація, негативні кейси | main |
| E2E / UI | Playwright | критичні сценарії користувача, Mailpit API для листа | main, nightly |
| Non-functional | k6 (smoke), axe (a11y) | базова продуктивність, доступність | nightly |
| AI eval | DeepEval, pytest | faithfulness, relevancy, hallucination, retrieval | nightly, вручну |

Правило: **кожну вимогу перевіряємо на найнижчому рівні, де це можливо**. E2E — тільки для того, що інакше не перевірити.

### A4. CI/CD з точки зору QA

У вас немає staging-сервера, тому середовище створює сам pipeline. Три workflow:

1. **`pr.yml`** (ціль: до 10 хв). Lint → unit → component → Pact consumer (публікація pact як artifact) → Pact provider verify → збірка образів → smoke compose (health-check усіх сервісів). Path filters: змінили лише `services/order` — запускаємо тільки його тести і contract verify для його споживачів.
2. **`main.yml`** (після merge). Все з PR + multi-service integration + Playwright (Chromium) + `can-i-deploy` + публікація образів у GHCR.
3. **`nightly.yml`** (cron). Playwright на 3 браузерах, живий Frankfurter smoke, k6, axe, DeepEval, аудит залежностей, звіт про flaky-тести.

**Quality gates:** PR не можна merge, якщо впав unit, component, contract або smoke. E2E блокує `main`-релізний тег, але не PR. AI eval **не блокує**, а показує тренд (метрики недетерміновані).

**Практики QA, які варто налаштувати:** артефакти при падінні (Playwright trace, логи compose, JUnit XML); кеш Maven/npm/Docker layers; ретраї лише для E2E і лише з маркуванням «flaky»; карантин тестів через тег; тест-звіт у Job Summary; обов’язковий status check у branch protection; секрети тільки через GitHub Secrets (на старті секретів майже немає).

### A5. Репозиторії: локально і віддалено

**Рекомендація: один monorepo `shopflow` на GitHub** (публічний — безкоштовні CI-хвилини). Причини: контракти і код змінюються атомарно; один CI; OpenSpec/GSD бачить усю систему; легше агентам.

```
shopflow/
├─ openspec/            # specs (джерело правди) + changes
├─ docs/                # srs, architecture, adr, test-strategy
├─ services/
│  ├─ web/  api/  assistant/
│  └─ order/  inventory/  notification/   (Java, Maven)
├─ contracts/           # pact files, event JSON Schemas
├─ tests/
│  ├─ api/              # REST Assured, black box (QA-015)
│  ├─ integration/      # multi-service, compose-based
│  └─ e2e/              # Playwright
├─ eval/                # Python, DeepEval
├─ infra/compose/       # docker-compose*.yml, init SQL
└─ .github/workflows/
```

**Окремі репозиторії:** `shopflow-agent` (Jira-агент з пункту 6: інша життєва циклічність, власні секрети, може працювати над shopflow як зовнішній клієнт). Eval спершу тримайте в `eval/` — виносьте, лише якщо захочете тестувати «чужий» продукт.

**Локально:** одна тека `~/dev/shopflow`, `origin` = GitHub. Для паралельної роботи агентів — `git worktree` (одна worktree на задачу/гілку).

**Гілки:** trunk-based. `main` захищена, зміни тільки через PR, короткі гілки `feature/SHOP-123-short-name` (ключ Jira в назві дає автоматичний лінк). Conventional Commits. Squash merge.

**Де що жити:** вимоги й архітектура — в репозиторії (`docs/`, `openspec/`), бо їх змінюють агенти через PR. Confluence — читабельна копія/обговорення (публікуйте з repo, а не навпаки). Jira — задачі; кожна задача посилається на ID вимог (наприклад `ORD-010`).

### A6. OpenSpec / GSD

- Розбийте частину B на **capabilities**: `auth`, `catalog`, `currency`, `ordering`, `inventory`, `notification`, `web`, `assistant`, `non-functional`, `quality-gates`. Кожна стає `openspec/specs/<capability>/spec.md`.
- Кожну EARS-вимогу переносьте як `### Requirement: …` з тим самим ID. Для кожної додайте `#### Scenario:` (WHEN/THEN) — це майбутній приймальний тест.
- Реалізація йде **фазами** (A7). Одна фаза = один або кілька `openspec/changes/<name>/` з proposal, tasks, delta specs.
- GSD: використайте частину B як вхід для `PROJECT`/`REQUIREMENTS`/`ROADMAP`; точні назви файлів і команд звірте з поточною документацією інструмента — вони можуть відрізнятися від моїх припущень.
- Агентам давайте правило: «не змінюй вимогу без окремої change-пропозиції».

### A7. Фази реалізації

| Фаза | Результат | QA-навичка |
| --- | --- | --- |
| 0 | repo, compose з Postgres, Kafka, Mailpit; порожній CI | базовий pipeline, branch protection |
| 1 | api + web: реєстрація, каталог | unit, component, Playwright smoke |
| 2 | currency + Frankfurter | контракт зі сторонім API, mock vs live |
| 3 | order-service (синхронно) | Testcontainers, Pact HTTP |
| 4 | Kafka + inventory + сага | Pact message, DLQ, ідемпотентність |
| 5 | notification + Mailpit | multi-service integration |
| 6 | повний E2E | Playwright, trace, flaky |
| 7 | assistant + eval | RAG, DeepEval |
| 8 | Jira/Confluence агент | окремо, `shopflow-agent` |

**Стартова порада:** після фази 0 пропустіть Java на тиждень — зробіть фази 1–2 на TS, щоб агенти відпрацювали процес OpenSpec на простому матеріалі.

## Part B. Software Requirements Specification and Architecture

### B1. Introduction

**B1.1 Purpose.** This part defines the requirements and the architecture of ShopFlow. Coding agents use it as the input for OpenSpec or GSD. QA engineers use it to build the test levels.

**B1.2 Scope.** ShopFlow is a demonstration online shop. It runs on one developer machine with Docker Compose. It runs also on a GitHub Actions runner. It has no production environment.

**B1.3 Writing conventions.**

- The text follows ASD-STE100 rules: short sentences, active voice, one term for one thing, no synonyms. The glossary in B1.5 is the controlled vocabulary.
- Each requirement uses an EARS pattern (see B1.4).
- Each requirement has an ID, a priority and a verification code at the end: `[priority | verification]`.
- Each requirement states one need only (ISO/IEC/IEEE 29148: singular, unambiguous, verifiable).
- Deliberate deviation: STE uses "must" for obligations. This document uses "shall", because EARS and ISO/IEC/IEEE 29148 use "shall". Run the text through an STE checker before you claim formal conformance.

**B1.4 EARS patterns.**

| Pattern | Template |
| --- | --- |
| Ubiquitous | The \<system> shall \<response>. |
| Event-driven | WHEN \<trigger>, the \<system> shall \<response>. |
| State-driven | WHILE \<state>, the \<system> shall \<response>. |
| Unwanted behavior | IF \<condition>, THEN the \<system> shall \<response>. |
| Optional feature | WHERE \<feature is present>, the \<system> shall \<response>. |

**Priority:** M = must have, S = should have, C = could have (MoSCoW). **Verification:** U = unit test, C = component test, K = contract test, I = multi-service integration test, A = API test (REST Assured, black box), W = UI test below the end-to-end level (unit, component, integration with MSW), E = end-to-end test, N = non-functional test, V = AI evaluation, D = demonstration or inspection.

**B1.5 Glossary.**

| Term | Meaning |
| --- | --- |
| Customer | A person who uses the Web UI to buy products. |
| Administrator | A person who changes stock quantities. |
| Web UI | The Next.js application in `services/web`. |
| API | The TypeScript service in `services/api`. It is the only entry point for the Web UI. |
| Order Service | The Java service that owns orders. |
| Inventory Service | The Java service that owns stock. |
| Notification Service | The Java service that sends emails. |
| Assistant | The TypeScript service that answers questions with RAG. |
| Broker | The Kafka server. |
| Event | A JSON message on a Kafka topic. |
| SKU | The unique code of a product. |
| Rate Provider | The Frankfurter API (external service). |
| Mail Server | Mailpit. It receives SMTP email in the test environment. |
| Base currency | EUR. All prices are stored in EUR. |

### B2. System context and architecture

**B2.1 Context.** The Customer and the Administrator use the Web UI. The Web UI calls the API only. The API calls the Order Service, the Inventory Service, the Assistant and the Rate Provider. The Order Service, the Inventory Service and the Notification Service exchange Events through the Broker. The Notification Service sends email to the Mail Server.

```
 Customer / Admin
        |
   [ Web UI ]  Next.js
        |  HTTP
   [ API ]  Fastify  -----HTTP-----> [ Rate Provider ] (external)
    |      |       \
 HTTP    HTTP      HTTP
    |      |         \
[Order]  [Inventory]  [Assistant] -- pgvector, Ollama
  |  ^      ^  |
  v  |      |  v
  ===== Kafka (Broker) =====
          |
   [Notification] --SMTP--> [Mail Server]

 PostgreSQL: schemas api, orders, inventory, assistant
```

**B2.2 Components.**

| ID | Component | Owns | Interfaces |
| --- | --- | --- | --- |
| C1 | Web UI | no data | HTTP to API |
| C2 | API | users, products (schema `api`) | REST to C1; REST to C3, C4, C6; HTTPS to Rate Provider |
| C3 | Order Service | orders, order items (schema `orders`) | REST; produces and consumes Events |
| C4 | Inventory Service | stock, reservations (schema `inventory`) | REST; produces and consumes Events |
| C5 | Notification Service | sent-email log (schema `notification`) | consumes Events; SMTP |
| C6 | Assistant | document chunks and vectors (schema `assistant`) | REST; Ollama HTTP |

**B2.3 REST interfaces.**

| Service | Endpoint | Purpose |
| --- | --- | --- |
| API | `POST /auth/register`, `POST /auth/login` | account and token |
| API | `GET /products`, `GET /products/{sku}?currency=` | catalog |
| API | `POST /orders`, `GET /orders`, `GET /orders/{id}` | orders (authenticated) |
| API | `POST /assistant/ask` | question to Assistant |
| Order | `POST /orders`, `GET /orders/{id}` | internal |
| Inventory | `GET /stock/{sku}`, `PUT /stock/{sku}` | internal and administrator |
| All | `GET /health` | health check |

Each service publishes an OpenAPI file in its folder. The OpenAPI file is the base for the HTTP contract tests.

**B2.4 Events.** Topic names use the pattern `<entity>.<fact>.v<major>`. The message key is `orderId`. Each Event has a JSON Schema in `contracts/events/`.

| Topic | Producer | Consumer | Main fields |
| --- | --- | --- | --- |
| `order.created.v1` | Order | Inventory | eventId, orderId, items\[sku, qty\], occurredAt |
| `stock.reserved.v1` | Inventory | Order | eventId, orderId, occurredAt |
| `stock.rejected.v1` | Inventory | Order | eventId, orderId, reason, occurredAt |
| `order.confirmed.v1` | Order | Notification | eventId, orderId, customerEmail, total |
| `order.rejected.v1` | Order | Notification | eventId, orderId, customerEmail, reason |
| `*.dlq` | each consumer | none | original message, error |

**B2.5 Order flow (choreography saga).**

1. The Customer submits an order. The Order Service saves it as PENDING and publishes `order.created.v1`.
2. The Inventory Service reserves the stock and publishes `stock.reserved.v1`, or `stock.rejected.v1` if the stock is not enough.
3. The Order Service sets the status to CONFIRMED or REJECTED and publishes `order.confirmed.v1` or `order.rejected.v1`.
4. The Notification Service sends an email to the Customer.

**B2.6 Architecture decisions.**

- ADR-1: Monorepo. Reason: atomic change of code and contract.
- ADR-2: One PostgreSQL instance, one schema for each service. A service shall not read the schema of another service.
- ADR-3: Choreography saga. No central orchestrator.
- ADR-4: At-least-once delivery. Each consumer is idempotent.
- ADR-5: JSON Schema for Events. No schema registry in version 1.
- ADR-6: The CI runner is the only test environment.

### B3. Functional requirements

#### B3.1 Authentication (capability `auth`)

- **AUTH-001** WHEN a visitor sends a valid registration request, the API shall create an account and return a token. `[M | C,K]`
- **AUTH-002** IF the email address is already registered, THEN the API shall return HTTP 409. `[M | C]`
- **AUTH-003** IF the password has fewer than 8 characters, THEN the API shall return HTTP 400 and a field error. `[M | U,C]`
- **AUTH-004** WHEN a user sends valid credentials, the API shall return a token that expires after 60 minutes. `[M | C]`
- **AUTH-005** IF the token is missing, invalid or expired, THEN the API shall return HTTP 401 for each protected endpoint. `[M | C]`
- **AUTH-006** The API shall store only a salted hash of each password. `[M | C]`
- **AUTH-007** The API shall give the role CUSTOMER to each new account. `[M | C]`

#### B3.2 Catalog (capability `catalog`)

- **CAT-001** The API shall store at least 20 seeded products at first start. Each product has a SKU, a name, a description and a price in EUR. `[M | C,D]`
- **CAT-002** WHEN a client requests `GET /products`, the API shall return a page of products. The default page size is 10. `[M | C,K]`
- **CAT-003** WHEN a client sends a search text, the API shall return only the products whose name contains that text. `[S | U,C]`
- **CAT-004** IF a SKU does not exist, THEN the API shall return HTTP 404 for `GET /products/{sku}`. `[M | C]`
- **CAT-005** WHEN the Web UI shows a product list, the Web UI shall show the name, the price and the stock status of each product. `[M | E]`
- **CAT-006** The API shall get the stock status from the Inventory Service. The status is IN\_STOCK or OUT\_OF\_STOCK. `[M | C,K]`
- **CAT-007** IF the Inventory Service does not respond within 2 seconds, THEN the API shall return the products without stock status. `[S | C]`

#### B3.3 Currency (capability `currency`)

- **CUR-001** WHERE the request contains the parameter `currency`, the API shall return prices in that currency. `[M | C,K]`
- **CUR-002** The API shall get exchange rates from the Rate Provider with the base currency EUR. `[M | K]`
- **CUR-003** The API shall keep each rate in cache for 1 hour. `[S | C]`
- **CUR-004** The API shall round converted prices to 2 decimal places. `[M | U]`
- **CUR-005** IF the Rate Provider is not available, THEN the API shall use the last cached rate. `[M | C]`
- **CUR-006** IF the Rate Provider is not available and the cache is empty, THEN the API shall return prices in EUR and the header `X-Currency-Fallback: true`. `[M | C]`
- **CUR-007** IF the currency code is not supported, THEN the API shall return HTTP 400. `[M | U,C]`
- **CUR-008** The API shall send requests to the Rate Provider only through one client module. `[S | D]`
- **CUR-009** WHEN the Rate Provider returns a response that does not match the expected schema, THEN the API shall treat the response as not available. `[M | K]`

#### B3.4 Ordering (capability `ordering`)

- **ORD-001** WHEN an authenticated Customer sends an order with 1 to 20 items, the API shall forward the order to the Order Service. `[M | C,K]`
- **ORD-002** IF an item quantity is less than 1 or more than 99, THEN the Order Service shall return HTTP 400. `[M | U,C]`
- **ORD-003** IF the order has a SKU that does not exist, THEN the Order Service shall return HTTP 422. `[M | C]`
- **ORD-010** WHEN the Order Service accepts a valid order, the Order Service shall save the order with status PENDING and return HTTP 201. `[M | C]`
- **ORD-011** WHEN the Order Service saves an order, the Order Service shall publish `order.created.v1` in the same unit of work (outbox pattern). `[M | C,K]`
- **ORD-012** The Order Service shall calculate the total in EUR from the unit prices at the time of the order. `[M | U]`
- **ORD-020** WHEN the Order Service receives `stock.reserved.v1`, the Order Service shall set the status of the order to CONFIRMED. `[M | C,I]`
- **ORD-021** WHEN the Order Service receives `stock.rejected.v1`, the Order Service shall set the status of the order to REJECTED. `[M | C,I]`
- **ORD-022** WHEN the status of an order changes to CONFIRMED or REJECTED, the Order Service shall publish `order.confirmed.v1` or `order.rejected.v1`. `[M | C,K]`
- **ORD-023** IF the Order Service receives an Event with an `eventId` that it already processed, THEN the Order Service shall ignore the Event. `[M | C]`
- **ORD-024** IF the status of an order is CONFIRMED or REJECTED, THEN the Order Service shall not change the status. `[M | U]`
- **ORD-025** IF the Order Service cannot process an Event after 3 attempts, THEN the Order Service shall send the Event to the `.dlq` topic. `[S | C]`
- **ORD-030** WHEN a Customer requests an order, the API shall return the order only if the order belongs to that Customer. Otherwise, the API shall return HTTP 404. `[M | C,K]`
- **ORD-031** WHILE the status of an order is PENDING, the Web UI shall show the message "Processing". `[M | E]`
- **ORD-032** WHEN the status of an order changes to CONFIRMED or REJECTED, the Web UI shall show the new status within 10 seconds. `[M | E]`
- **ORD-033** The Web UI shall show the list of orders of the Customer, newest first. `[S | E]`

#### B3.5 Inventory (capability `inventory`)

- **INV-001** The Inventory Service shall store the available quantity for each SKU. `[M | C]`
- **INV-002** WHEN the Inventory Service receives `order.created.v1` and all items have enough stock, the Inventory Service shall reserve the quantities and publish `stock.reserved.v1`. `[M | C,I,K]`
- **INV-003** IF one item has not enough stock, THEN the Inventory Service shall reserve nothing and publish `stock.rejected.v1` with the reason INSUFFICIENT\_STOCK. `[M | C,I,K]`
- **INV-004** IF the order has an unknown SKU, THEN the Inventory Service shall publish `stock.rejected.v1` with the reason UNKNOWN\_SKU. `[M | C]`
- **INV-005** IF the Inventory Service receives the same `orderId` more than once, THEN the Inventory Service shall reserve the stock one time only. `[M | C]`
- **INV-006** The Inventory Service shall not allow a negative available quantity, also with parallel orders. `[M | C,I]`
- **INV-007** WHEN an Administrator sends `PUT /stock/{sku}` with a quantity of 0 or more, the Inventory Service shall set the quantity. `[S | C]`
- **INV-008** IF a user without the role ADMIN calls `PUT /stock/{sku}`, THEN the API shall return HTTP 403. `[S | C]`

#### B3.6 Notification (capability `notification`)

- **NTF-001** WHEN the Notification Service receives `order.confirmed.v1`, the Notification Service shall send a confirmation email to `customerEmail`. `[M | C,I,E]`
- **NTF-002** WHEN the Notification Service receives `order.rejected.v1`, the Notification Service shall send a rejection email that contains the reason. `[M | C,I]`
- **NTF-003** The confirmation email shall contain the order ID, the list of items and the total. `[M | C,E]`
- **NTF-004** IF the Notification Service receives an Event that it already processed, THEN the Notification Service shall not send a second email. `[M | C]`
- **NTF-005** IF the Mail Server is not available, THEN the Notification Service shall retry 3 times with an increasing delay. `[S | C]`
- **NTF-006** IF all retries fail, THEN the Notification Service shall send the Event to the `.dlq` topic. `[S | C]`

#### B3.7 Web UI (capability `web`)

- **WEB-001** The Web UI shall have these pages: product list, product detail, cart, checkout, order list, order detail, login, registration. `[M | E]`
- **WEB-002** The Web UI shall keep the cart in the browser until the Customer submits the order. `[M | W,E]`
- **WEB-003** WHEN the Customer changes the currency selector, the Web UI shall show all prices in the new currency. `[M | W,E]`
- **WEB-004** IF the API returns an error, THEN the Web UI shall show a message that does not contain technical details. `[M | W,E]`
- **WEB-005** WHILE the Customer is not logged in, the Web UI shall redirect the checkout page to the login page. `[M | W,E]`
- **WEB-006** The Web UI shall give each interactive element a stable `data-testid` attribute. `[M | D]`
- **WEB-007** The Web UI shall have no critical accessibility violation on the product list and the checkout page. `[S | N]`
- **WEB-008** Each Web UI component that shows data shall have a test for these states: loading, error, empty and filled. `[M | W]`
- **WEB-009** The Web UI shall keep the business logic (cart total, price format, form validation) in modules that do not depend on React or Next.js. `[S | W,D]`
- **WEB-010** The Web UI tests that call the API shall use MSW handlers that match the OpenAPI file of the API. `[M | W]`

#### B3.8 Assistant (capability `assistant`)

- **AST-001** The Assistant shall index the documents in `services/assistant/knowledge/` at start. The documents are product descriptions, a return policy and a delivery policy. `[M | C]`
- **AST-002** WHEN a Customer sends a question, the Assistant shall find the most relevant document chunks and send them with the question to the language model. `[M | C,V]`
- **AST-003** The Assistant shall return an answer and the list of source document names. `[M | C,K]`
- **AST-004** The Assistant shall base each answer only on the retrieved chunks. `[M | V]`
- **AST-005** IF the retrieved chunks do not contain the answer, THEN the Assistant shall say that it does not know. `[M | V]`
- **AST-006** IF the question asks for information about orders or personal data of another user, THEN the Assistant shall refuse. `[S | V]`
- **AST-007** IF the question tries to change the instructions of the Assistant (prompt injection), THEN the Assistant shall keep its instructions and answer only the product question. `[S | V]`
- **AST-008** The Assistant shall answer in the language of the question. `[C | V]`
- **AST-009** WHERE the environment variable `LLM_PROVIDER` is set, the Assistant shall use that provider. The default is a local Ollama model. `[S | D]`

**Thresholds for the AI evaluation (initial values, tune after the first run).** Answer relevancy 0.7 or more. Faithfulness 0.8 or more. Contextual recall 0.7 or more. Hallucination 0.2 or less. A golden dataset of at least 30 question-answer pairs is in `eval/dataset/`. The dataset has 5 questions without an answer in the documents and 5 adversarial questions.

### B4. Non-functional requirements

- **NFR-001** (Performance) WHILE 20 virtual users send requests, the API shall answer `GET /products` with a 95th percentile of less than 500 ms. `[S | N]`
- **NFR-002** (Performance) The saga from order creation to the final status shall take less than 5 seconds in the test environment. `[S | I,N]`
- **NFR-003** (Reliability) IF one service stops, THEN the other services shall continue to answer their own health checks. `[S | I]`
- **NFR-004** (Reliability) WHEN the Order Service starts after a stop, the Order Service shall process the Events that it did not read. `[M | I]`
- **NFR-005** (Security) The API shall not return a stack trace, a password hash or an internal URL in any response. `[M | C]`
- **NFR-006** (Security) Each service shall read secrets from environment variables. The repository shall not contain secrets. `[M | D]`
- **NFR-007** (Observability) Each service shall write structured JSON logs. Each log line shall contain a correlation ID. `[S | C,I]`
- **NFR-008** (Observability) Each service shall have the endpoint `GET /health`. It returns HTTP 200 only when the dependencies of the service are available. `[M | C]`
- **NFR-009** (Portability) The command `docker compose up` shall start the complete system on a machine with 8 GB of RAM. The Assistant and the Ollama model are in an optional profile. `[M | D]`
- **NFR-010** (Compatibility) The API shall keep the existing fields of a response when it adds new fields. `[M | K]`
- **NFR-011** (Data) Each service shall create its own database schema with a versioned migration tool (Flyway for Java, a TypeScript migration tool for API and Assistant). `[M | C]`
- **NFR-012** (Test data) The system shall have a reset endpoint or script that sets the seed data. It shall exist only when `APP_ENV=test`. `[M | D]`

### B5. Quality-stand requirements (capability `quality-gates`)

These requirements define the test environment and the pipeline. The pipeline is part of the product.

- **QA-001** WHEN a pull request is opened or updated, the CI pipeline shall run lint, unit tests, component tests and contract tests. `[M | D]`
- **QA-002** The CI pipeline shall run only the tests of the changed services and of their contract partners. `[S | D]`
- **QA-003** IF a required check fails, THEN the repository shall block the merge to `main`. `[M | D]`
- **QA-004** WHEN a change is merged to `main`, the CI pipeline shall start the complete system with Docker Compose and run the multi-service integration tests and the end-to-end tests. `[M | D]`
- **QA-005** WHEN a consumer test creates a Pact file, the CI pipeline shall save the Pact file as an artifact. The provider pipeline shall verify it. `[M | D]`
- **QA-006** WHERE a Pact Broker is present, the CI pipeline shall run `can-i-deploy` before it publishes images. `[C | D]`
- **QA-007** The CI pipeline shall run the nightly workflow every day. The nightly workflow runs the cross-browser end-to-end tests, the live Rate Provider check, the performance smoke test and the AI evaluation. `[S | D]`
- **QA-008** IF a test fails, THEN the CI pipeline shall save the test report, the service logs and (for end-to-end tests) the Playwright trace as artifacts. `[M | D]`
- **QA-009** The CI pipeline shall show a test summary in the job summary. `[S | D]`
- **QA-010** The AI evaluation shall not block a merge. It shall report the metric values. `[S | D]`
- **QA-011** Each integration and end-to-end test shall create its own data and shall not depend on the order of the tests. `[M | D]`
- **QA-012** The end-to-end tests shall check the sent email through the Mail Server API. `[M | E]`
- **QA-013** The Pact file for the Rate Provider shall be checked each night against the live Rate Provider. `[S | K]`
- **QA-014** The multi-service integration tests shall include these scenarios: successful order, insufficient stock, duplicate Event, Broker restart, Inventory Service stop. `[M | I]`
- **QA-015** The API tests shall call the public endpoints of the API on the running system through REST Assured. They shall not use mocks of ShopFlow services. The tests are in `tests/api/`. `[M | A]`
- **QA-016** Each public endpoint of the API shall have at least one positive test, one validation test and one authorization test. `[M | A]`
- **QA-017** The API tests shall check each response against the OpenAPI file of the API: status code, headers and body schema. `[S | A]`
- **QA-018** WHEN a change is merged to `main`, the CI pipeline shall run the API tests after `docker compose up` and shall save the REST Assured report as an artifact. `[M | D]`
- **QA-019** WHEN a pull request is opened or updated, the CI pipeline shall run the UI unit, component and integration tests. `[M | D]`
- **QA-020** IF an MSW handler does not match the OpenAPI file of the API, THEN the CI pipeline shall fail the check. `[S | D]`

### B6. Traceability (starting view)

The table maps each capability to the main test levels and to the phase in A7. Agents shall add one row for each new requirement.

| Capability | Requirements | Main tests | Phase |
| --- | --- | --- | --- |
| auth | AUTH-001 to AUTH-007 | unit, component, API | 1 |
| catalog | CAT-001 to CAT-007 | component, API, Pact HTTP, E2E | 1 |
| currency | CUR-001 to CUR-009 | unit, component, Pact (external) | 2 |
| ordering | ORD-001 to ORD-033 | component, API, Pact HTTP and message, integration, E2E | 3, 4 |
| inventory | INV-001 to INV-008 | component, API, Pact message, integration | 4 |
| notification | NTF-001 to NTF-006 | component, integration, E2E | 5 |
| web | WEB-001 to WEB-010 | UI unit, component and integration (MSW), E2E, accessibility | 1, 6 |
| assistant | AST-001 to AST-009 | component, AI evaluation | 7 |
| non-functional | NFR-001 to NFR-012 | k6, integration | 6 |
| quality-gates | QA-001 to QA-020 | inspection of the pipeline | 0 and later |

### B7. Open points and assumptions

- The Rate Provider (Frankfurter) has no formal SLA. The API must work when it is not available (CUR-005, CUR-006).
- The Assistant needs a language model. A local Ollama model is free but slow on a laptop without a GPU. A cloud API is faster but not free. Decide before phase 7.
- No payment step exists in version 1. A later change can add Stripe test mode as a second external service and a new Event `payment.completed.v1`.
- Pact Broker: version 1 uses Pact files as CI artifacts. A local broker in Compose and a free hosted broker are options for phase 4.
- Search for STE: this text is written in the STE style. It has not passed a formal STE checker.
- The tool details of OpenSpec and GSD (file names, commands) shall be checked in their current documentation.

## Частина C. Беклог і порядок роботи (українською)

### C1. Додатковий беклог для QA-практики

У частині B немає цих речей. Кожна з них — окрема OpenSpec-зміна. Пріоритет: M — робити, S — бажано, C — за настроєм.

| ID | Що | Навіщо для QA | Фаза | Пріор. |
| --- | --- | --- | --- | --- |
| BL-001 | **Bug bank**: feature flag `BUGS=...` вмикає навмисні дефекти (гонка на складі, неправильне округлення, відсутня ідемпотентність, пропущений 403) | перевіряєте, чи ваші тести справді ловлять баги | 6 | M |
| BL-002 | Mutation testing: Stryker (TS), PIT (Java) | показує якість тестів, а не лише coverage; головний захист від «тестів, які пише агент під свій код» | 4+ | M |
| BL-003 | Coverage-звіти: JaCoCo, Vitest coverage; поріг як сигнал, не як ціль | базова метрика | 1+ | S |
| BL-004 | Pact Broker локально в Compose + `can-i-deploy` (QA-006) | повний цикл consumer-driven контрактів | 4 | S |
| BL-005 | Breaking-change detection для OpenAPI (`oasdiff`) і JSON Schema подій | CI блокує несумісні зміни контракту | 3 | S |
| BL-006 | WireMock або Toxiproxy між `api` і Frankfurter та між сервісами і Kafka: затримки, 500, обрив | resilience-тести без реального збою | 5 | S |
| BL-007 | Security у CI: gitleaks, `npm audit`, Trivy (образи і залежності), OWASP ZAP baseline у nightly | shift-left безпека | 2+ | S |
| BL-008 | Allure або HTML-звіт, публікація на GitHub Pages | читабельні результати для всіх рівнів | 1+ | S |
| BL-009 | Visual regression: Playwright screenshots для 2–3 сторінок | UI-регресії | 6 | C |
| BL-010 | Трекінг flaky-тестів: повторні запуски, мітка `@flaky`, тижневий звіт | практика роботи з нестабільністю | 6 | S |
| BL-011 | OpenTelemetry + Jaeger (опційний compose profile) | діагностика падіння в багатосервісному флоу | 5 | C |
| BL-012 | Другий зовнішній сервіс: платіж (Stripe test mode або WireMock) + подія `payment.completed.v1` | другий контракт зі сторонньою системою, розширена сага | після 6 | C |
| BL-013 | Адмін-UI для залишків (зараз лише API, INV-007) | RBAC на UI, більше E2E | після 6 | C |
| BL-014 | Pre-commit: lint, commitlint, gitleaks; Dependabot/Renovate | гігієна репозиторію | 0 | S |
| BL-015 | Тест-стратегія як документ (`docs/test-strategy.md`) і README піраміди | ваш головний артефакт QA | 0–1 | M |
| BL-016 | Скрипт трасування: збирає ID вимог із тегів тестів, CI падає, якщо M-вимога без тесту | автоматична версія B6 | 3 | M |
| BL-017 | Мультиплатформний smoke: запуск стенду на чистій машині одним `make up` | перевірка NFR-009 | 6 | S |

### C2. Хто що робить

**Агенти:** код застосунку, unit-тести власного коду, міграції, Dockerfile, початковий YAML для CI.

**Ви:** тест-стратегія, сценарії приймання (WHEN/THEN), API-, контрактні, інтеграційні і E2E-тести (самі або агентом за вашим описом у **окремій** сесії), рев'ю PR, експлуатація CI, bug bank, дослідницьке тестування.

Ключове правило: **тест виводиться з вимоги, а не з коду**. Агент, який пише код і тест разом, часто пише тест, який підтверджує його власну помилку. Тому:

- сценарії й acceptance-тести готові до реалізації;
- агентові реалізації заборонено змінювати папки `tests/`, `contracts/` і `openspec/specs/` без окремої change-пропозиції;
- у `CODEOWNERS` ці папки закріплені за вами, а `main` вимагає ваше рев'ю.

### C3. Алгоритм: крок за кроком

**Крок 0. Підготовка репозиторію (день 1).**

1. Створіть публічний репозиторій `shopflow`, клонуйте локально.
2. Покладіть документ у `docs/srs.md` (експорт у Markdown). Розбийте частину B на спеки `openspec/specs/<capability>/spec.md`. Збережіть ID без змін.
3. Створіть `AGENTS.md` (або `CLAUDE.md`): глосарій B1.5, правила STE/EARS, структура каталогів, заборона змінювати тести і вимоги, формат гілок і комітів, команди запуску тестів, Definition of Done.
4. Ініціалізуйте OpenSpec. Складіть `openspec/changes/` за фазами A7.
5. Налаштуйте branch protection для `main` (PR, обов'язкові checks, CODEOWNERS).

**Крок 1. Walking skeleton + CI (перші 2–3 дні).** Це відповідь на «з чого почати»: не з функціональності, а з тонкого наскрізного зрізу.

- Compose: Postgres, Kafka, Mailpit.
- Порожні `web`, `api` з `GET /health`, по одному тривіальному тесту на кожному доступному рівні (unit, component, API, один Playwright smoke).
- `pr.yml` запускає все це. Pipeline зелений ще до першої бізнес-вимоги.
- Далі кожна зміна лише **додає** перевірки в готовий pipeline. CI стартує з першого дня, бо дописати його потім у кілька сервісів значно дорожче.

**Крок 2. Цикл однієї зміни (повторюється для кожної фази).**

1. Ви обираєте групу вимог (наприклад `auth`), створюєте Jira-задачу `SHOP-n` із переліком ID.
2. Агент пише OpenSpec proposal: що змінюється, дельта-спеки, `tasks.md`. **Ви рецензуєте** вимоги, сценарії й пропущені негативні кейси.
3. Контракти першими: OpenAPI і JSON Schema подій (`contracts/`) — лише після вашого схвалення.
4. Ви пишете або замовляєте в окремій сесії acceptance-тести зі сценаріїв (API, контрактні, інтеграційні). Вони падають — це очікувано.
5. Агент реалізації працює у гілці `feature/SHOP-n-...` і доводить тести до зеленого, не чіпаючи ваших тестів.
6. PR → CI → ваше рев'ю (перегляд діффу тестів, а не лише коду) → squash merge.
7. `openspec archive`: спека оновлена, задача закрита, рядок трасування оновлений.

**Крок 3. Порядок реалізації.** Дотримуйтесь A7: 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Що додається в CI на кожній фазі:

| Фаза | Що додається в CI |
| --- | --- |
| 0 | lint, health-check, branch protection |
| 1 | unit, component, UI unit/component/integration (MSW), перші API-тести, Playwright smoke |
| 2 | Pact consumer для Frankfurter, nightly smoke на живий API |
| 3 | Testcontainers для Java, Pact HTTP provider verify, перші REST Assured API-тести на `order` |
| 4 | Pact message, multi-service integration, DLQ- і ідемпотентні сценарії |
| 5 | перевірка листа через Mailpit API, resilience-тести |
| 6 | повний E2E, nightly, k6, axe, bug bank |
| 7 | DeepEval у nightly |
| 8 | автоматизація Jira-агента (окремий репозиторій) |

### C4. Як використовувати дані з документа

| Розділ документа | Куди переходить | Як використовується |
| --- | --- | --- |
| B1.3–B1.5 (правила, глосарій) | `AGENTS.md`, `docs/glossary.md` | вставляється в контекст кожної агентської сесії |
| B2.1–B2.2, B2.6 | `docs/architecture.md`, ADR, `infra/compose/` | основа для Compose і структури сервісів |
| B2.3 (REST) | OpenAPI-файли в `contracts/` | генеруються до коду; база для API-тестів, Pact, MSW |
| B2.4 (події) | JSON Schema в `contracts/events/` | база для message pact |
| B3 (вимоги) | `openspec/specs/*/spec.md` | кожна вимога = `Requirement`, плюс `Scenario` (WHEN/THEN), які ви дописуєте |
| Код верифікації `[M \| C,K]` | назви й теги тестів | тест містить ID, наприклад `@Tag("ORD-020")` або `test("ORD-020 ...")`; код каже, на якому рівні писати |
| B4 (NFR) | k6-скрипти, налаштування логів | порогові значення беруться з вимог |
| B5 (QA) | `.github/workflows/*.yml` | чек-ліст для налаштування pipeline |
| B6 (трасування) | скрипт із BL-016 | таблиця генерується з тегів тестів, а не пишеться вручну |
| Пороги AST | `eval/config` | значення DeepEval |

Правило: **документ — джерело правди до початку роботи, спеки в `openspec/` — після**. Зміна вимоги = зміна спеки через proposal, потім (за бажанням) оновлення цього документа.

### C5. Коли підключати Jira і Confluence

- **Jira, ручний режим — з фази 0.** Створіть проєкт (безкоштовний план), колонки To Do / In Progress / In Review / Done. Один SHOP-ключ на одну OpenSpec-зміну. Ключ у назві гілки (`feature/SHOP-12-...`) дає зв'язок із PR. Це потрібно, щоб відпрацювати процес.
- **Confluence — з фази 3–4.** Публікуйте з репозиторію (тест-стратегія, архітектура, глосарій). Не ведіть там вимоги паралельно з репозиторієм.
- **Агент за тригером Jira — не раніше фази 6–7.** Автоматизація підсилює процес: якщо цикл із C3 ще нестабільний, агент лише швидше виробляє сміття. Умови: цикл відпрацьований вручну 5–10 разів, CI довіряється, є CODEOWNERS і правила для агента. Реалізуйте у `shopflow-agent` (webhook або polling на перехід «In Progress»; MCP або REST API Jira). На старті нехай агент лише створює гілку і proposal, а код пише після вашого схвалення.

### C6. Ваш щотижневий ритм QA

1. Рецензія proposals і сценаріїв (негативні кейси, граничні значення, неоднозначності вимог).
2. Написання або замовлення acceptance-тестів перед реалізацією.
3. Рев'ю PR: тести змінені лише з причини? немає тавтологій? немає моків там, де потрібен реальний компонент? відповідає ID?
4. Огляд CI: тривалість, flaky, покриття, mutation score.
5. Дослідницьке тестування зібраного стенду (30–60 хв) і запис знахідок як дефектів.
6. Оновлення тест-стратегії за підсумками тижня.

### C7. Ризики роботи через агентів

| Ризик | Захист |
| --- | --- |
| Агент править тест, щоб він пройшов | CODEOWNERS на `tests/`, `contracts/`; діфф тестів у рев'ю |
| Тавтологічні або надмоковані тести | mutation testing (BL-002), bug bank (BL-001) |
| Агент вигадує вимоги | заборона змінювати спеки без proposal; кожен PR посилається на ID |
| Великі PR, які не можна прорецензувати | одна зміна = одна група вимог, ліміт розміру в `AGENTS.md` |
| Розбіжність моків і реальності | MSW і Pact перевіряються проти OpenAPI (QA-020, BL-005) |
| Нестабільний CI відучує довіряти червоному | карантин flaky (BL-010), не вимикайте тести мовчки |

### C8. Перший тиждень: конкретний список

1. Створити репозиторій, структуру каталогів і `AGENTS.md`.
2. Експортувати цей документ у `docs/srs.md`, розбити на OpenSpec-спеки.
3. Compose з Postgres, Kafka, Mailpit (`docker compose up` працює).
4. Скелети `web` і `api` з `/health`.
5. `pr.yml`: lint + один тест на кожному рівні, що є.
6. Branch protection і CODEOWNERS.
7. Проєкт у Jira, перші задачі для фази 1.
8. BL-014 (pre-commit) і BL-015 (початок тест-стратегії).
9. Перша OpenSpec-зміна: `auth` (вимоги AUTH-001…007). Прогнати цикл C3 від початку до кінця.
10. Підсумок: що в процесі не працює, виправити `AGENTS.md` до фази 2.

### C9. Беклог фіч магазину (для пізнішої розробки і Jira-агента)

Це функціонал, який ви додаєте **після** базової версії (фази 0–6). Кожна фіча невелика й самодостатня: ідеально для Jira-задачі, яку бере агент, і для практики «вимоги → реалізація → тести». Для кожної в Jira створюйте задачу з EARS-вимогами за шаблоном частини B (нові ID, наприклад `SRCH-001`). Розмір: S — до дня роботи агента, M — кілька днів, L — нова інфраструктура або сервіс.

| ID | Фіча | Що зачіпає | Чому корисна для практики | Розмір |
| --- | --- | --- | --- | --- |
| FT-001 | Пошук і фільтри каталогу: категорія, діапазон цін, сортування | api, БД, web | комбінаторика параметрів, межі, пагінація, UI-компоненти | S |
| FT-002 | Промокоди і знижки (відсоток, фіксована сума, термін дії, ліміт використань) | order, api, web | бізнес-правила, граничні значення, таблиці рішень, багато unit-тестів | M |
| FT-003 | Історія замовлень: фільтри, пагінація, часова шкала статусів | api, order, web | прості API- і UI-тести, добра перша задача для агента | S |
| FT-004 | Багатомовний UI (uk / en) | web, notification | i18n-тести, переклад листів, зв'язок із AST-008 | S |
| FT-005 | Серверний кошик (зберігається між сесіями, об'єднується після входу) | api, order, web | стан, конкурентні зміни, API-тести сценаріїв | M |
| FT-006 | Скасування замовлення | order, inventory, notification | компенсаційна сага: `order.cancelled.v1`, звільнення резерву, нові контракти | M |
| FT-007 | Термін дії резерву (TTL): якщо оплати немає, резерв знімається | inventory, order | час у тестах, планувальники, гонки | M |
| FT-008 | Підписка «повідомити, коли товар з'явиться» | inventory, notification | нова подія `stock.replenished.v1`, event-driven фіча з нуля | M |
| FT-009 | Оновлення статусу замовлення через SSE або WebSocket замість опитування | api, web | асинхронні UI-тести, очікування без sleep | M |
| FT-010 | Версіонування події: `order.created.v2` з новим полем | order, inventory | зворотна сумісність, одночасна робота v1 і v2, Pact message | M |
| FT-011 | Захист API: rate limiting, блокування акаунта після невдалих входів | api | безпекові API-тести, перевірка кодів 429 | S |
| FT-012 | Адмін-панель: CRUD товарів і залишків | api, inventory, web | RBAC на UI й API, більше E2E | L |
| FT-013 | Оплата: окремий `payment-service` (Java) із провайдером у тестовому режимі або моком (див. BL-012) | новий сервіс, події `payment.*` | другий зовнішній контракт, ідемпотентні ключі, таймаути, вебхуки | L |
| FT-014 | Доставка: варіанти й вартість із зовнішнього API (перевірте, який безкоштовний сервіс доступний для вас; може знадобитися ключ) | api, order | третій контракт зі стороннім сервісом | L |
| FT-015 | Повернення товару й відшкодування | order, payment, assistant | розширення саги, зв'язок із документом політики повернення в RAG | L |
| FT-016 | Відгуки й рейтинги товарів із модерацією | api, web, assistant | валідація вводу, XSS-кейси; відгуки стають даними для RAG | M |
| FT-017 | Покращення асистента: рекомендації, відповідь про статус замовлення через виклик API від імені користувача, пам'ять діалогу | assistant | оцінка tool use і багатокрокових діалогів у DeepEval, безпека доступу до чужих даних | L |

**Рекомендована черга хвиль** (після завершення фази 6):

1. **Хвиля 1, без нової інфраструктури:** FT-001, FT-003, FT-004, FT-011. Найкращі кандидати для першого експерименту з Jira-агентом: маленькі, чіткі, легко перевірити.
2. **Хвиля 2, нові події:** FT-006, FT-007, FT-008, FT-010. Тут тренуються контракти черги й еволюція схем.
3. **Хвиля 3, правила й стан:** FT-002, FT-005, FT-009.
4. **Хвиля 4, нові сервіси й зовнішні системи:** FT-013, FT-014, FT-012, FT-015.
5. **Хвиля 5, AI:** FT-016, FT-017.

У базовій версії частини B не реалізуйте жодної з цих фіч. Це розширення, а не заміна вимог.

### C10. З чого почати розробку: порядок додатків

Розробляють агенти, тому порядок важливий двічі: тестам потрібен працюючий застосунок, а агентам потрібні невеликі зрізи з чіткими вимогами. Принципи:

- **Вертикальні зрізи.** Кожна фаза закінчується працюючим кроком, який можна показати руками й запустити через `docker compose up`. Не пишіть усі сервіси «вшир».
- **TypeScript першим.** Фази 0–2 повністю на TS. Агенти відпрацюють процес OpenSpec на простішому матеріалі, а Java-частина стартує, коли процес стабільний.
- **Контракт перед кодом.** OpenAPI і схеми подій готові й схвалені вами до того, як агент пише сервіс. Тоді сервіси можуть створюватися паралельно.
- **Тимчасові заглушки.** Якщо вимога залежить від ще не створеного сервісу, вона відкладається явно (наприклад, CAT-006 і CAT-007 чекають на Inventory). Агент не вигадує заглушку непомітно.

| Фаза | Що має працювати (демо руками) | Вимоги | Що розробляють агенти | Ваші тести на цьому кроці |
| --- | --- | --- | --- | --- |
| 0 | `docker compose up` піднімає Postgres, Kafka, Mailpit; є `GET /health` у `web` і `api`; зелений `pr.yml` | NFR-008, NFR-009, QA-001, QA-003 | каркас `web` (Next.js) і `api` (Fastify), Compose, CI | перші тести на кожному рівні |
| 1 | реєстрація, вхід, список товарів із пошуком (Web UI) | AUTH-001…007, CAT-001…005, WEB-001, WEB-005, WEB-006 | схема БД і міграції `api`, seed, auth, каталог, сторінки web | API-тести, контракт web→api, UI component/integration (MSW), Playwright smoke |
| 2 | перемикач валюти, ціни в обраній валюті, робота при недоступному Frankfurter | CUR-001…009, WEB-003 | клієнт Rate Provider, кеш, fallback | контракт зі стороннім сервісом, resilience-кейси |
| 3 | кошик, checkout, створення замовлення зі статусом PENDING, список замовлень | ORD-001…003, ORD-010, ORD-012, ORD-030, ORD-033, WEB-002, WEB-004 | **Order Service (Java)**, проксі в `api`, сторінки кошика й замовлень | Testcontainers, Pact HTTP api→order, REST Assured API-тести |
| 4 | замовлення переходить у CONFIRMED або REJECTED залежно від залишків | ORD-011, ORD-020…025, ORD-031, ORD-032, INV-001…008, CAT-006, CAT-007 | **Inventory Service (Java)**, Kafka, outbox, DLQ; UI показує статуси | Pact message, multi-service integration, сценарії дублікатів і гонки |
| 5 | після підтвердження у Mailpit з'являється лист | NTF-001…006 | **Notification Service (Java)**, шаблони листів | перевірка листа через Mailpit API, resilience-тести |
| 6 | повний E2E, нічні перевірки, bug bank | NFR-001…007, NFR-010…012, QA-004…014 | доведення, логи з correlation ID, reset-ендпоінт | Playwright, k6, axe, BL-001, BL-002 |
| 7 | відповіді асистента на питання про товари й політики | AST-001…009 | Assistant, індексація документів | DeepEval, золотий набір питань |

**Паралельна робота агентів.** Коли контракти фази 4 схвалені, Order і Inventory розробляють два агенти одночасно в окремих `git worktree`. Зведення йде через CI: Pact провайдера й multi-service тест вирішують, чи два боки справді сумісні.

**Технічні рішення, які варто зафіксувати в ADR до фази 0** (щоб агенти не вибирали різне в різних сервісах):

- менеджер пакетів і версія Node (наприклад pnpm і LTS-версія Node), версії Java і Spring Boot: перевірте поточні версії в документації перед фіксацією;
- ORM і міграції: Prisma або Drizzle для TS, Flyway для Java (NFR-011);
- формат помилок API (єдиний JSON для всіх сервісів) і правила іменування;
- структура логів і заголовок correlation ID (NFR-007);
- спосіб локального запуску: сервіси у Compose для демо й тестів, а у розробці допускається запуск окремого сервісу з IDE поруч із Compose-інфраструктурою.

**Definition of Done для агента (додайте в `AGENTS.md`):** код і власні unit-тести зелені; lint без помилок; OpenAPI або схеми подій оновлені, якщо змінився інтерфейс; міграції застосовуються на чистій БД; `docker compose up` піднімає сервіс, `/health` повертає 200; PR посилається на ID вимог; у PR немає змін у `tests/`, `contracts/` і `openspec/specs/` без погодженої пропозиції.

**Ваша приймальна перевірка перед глибшим тестуванням.** Після кожної фази 10–15 хвилин покликайте демо руками за колонкою «Що має працювати». Якщо демо не працює, пишіть дефект, а не нові тести: автоматизація поверх зламаного кроку лише створює шум.

**Шаблон стартового завдання для агента (фаза 0):**

```
Read AGENTS.md, docs/srs.md and openspec/specs/. Create an OpenSpec change
"phase-0-skeleton". Scope: monorepo layout, docker compose with Postgres,
Kafka (KRaft) and Mailpit, minimal Next.js app and Fastify API with GET /health,
and .github/workflows/pr.yml with lint and one test per service.
Do not implement business requirements. Do not edit tests/, contracts/ or
openspec/specs/. Write proposal.md and tasks.md first and stop for review.
```
