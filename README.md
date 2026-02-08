# Islamic Policy Engine — Proof of Concept

A minimal, working proof of concept that validates Drools 8.x as the rule engine for Islamic banking policy evaluation. The project demonstrates declarative rule definitions, runtime evaluation via REST API, an admin dashboard for rule management, and auditable decision logging.

**This is a showcase project** — not a production system. It proves the architecture works before committing to a full build.

## Quick Start

```bash
# Clone and start everything
git clone https://github.com/dannycahyo/islamic-policy-engine
cd islamic-policy-engine
docker compose up --build
```

Once running:

| Service         | URL                                   |
| --------------- | ------------------------------------- |
| Admin Dashboard | http://localhost:5173                 |
| Backend API     | http://localhost:8080                 |
| Swagger UI      | http://localhost:8080/swagger-ui.html |
| PostgreSQL      | localhost:5432                        |

## What It Demonstrates

Three distinct policy rule types, each showcasing a different Drools pattern:

**1. Transaction Limit** — threshold-based rule. Checks if a transaction exceeds the daily limit for the customer's account tier (Silver: 10M, Gold: 50M, Platinum: 200M IDR).

**2. Financing Eligibility (Murabahah)** — multi-condition rule. Evaluates whether a customer qualifies for Murabahah financing based on age (21–65), income (≥ 5M IDR/month), account status, and debt-to-income ratio.

**3. Risk Flag** — pattern-matching rule. Flags transactions for review based on amount thresholds, destination region risk, and transaction frequency patterns.

## Tech Stack

| Component        | Technology                       | Version |
| ---------------- | -------------------------------- | ------- |
| Language         | Java                             | 17      |
| Framework        | Spring Boot                      | 2.6.x   |
| Rule Engine      | Drools                           | 8.44.x  |
| Database         | PostgreSQL                       | 15      |
| Caching          | Spring Cache (Caffeine)          | 3.x     |
| Frontend         | React Router V7 (framework mode) | 7.x     |
| Code Editor      | Monaco Editor                    | 4.x     |
| API Docs         | SpringDoc OpenAPI                | 1.7.x   |
| Containerization | Docker Compose                   | 3.8     |

## Project Structure

```
islamic-policy-engine/
├── policy-engine-backend/          # Spring Boot + Drools
│   ├── src/main/java/com/islamic/policyengine/
│   │   ├── config/                 # Cache, CORS, Drools config
│   │   ├── controller/             # REST endpoints
│   │   ├── service/                # Business logic + Drools engine
│   │   ├── model/                  # Entities, DTOs, Facts, Enums
│   │   ├── repository/             # JPA repositories
│   │   └── exception/              # Error handling
│   ├── src/main/resources/
│   │   ├── application.yml
│   │   └── db/changelog/           # Liquibase changelogs
│   └── src/test/                   # Unit + integration tests
├── policy-engine-dashboard/        # React Router V7 admin UI
│   ├── app/
│   │   ├── routes/                 # File-based routing (loaders + actions)
│   │   ├── components/             # Reusable UI components
│   │   └── lib/                    # API client, types
│   └── vite.config.ts
├── docs/
│   ├── PRD.md                      # Product Requirements Document
│   └── TRD.md                      # Technical Requirements Document
├── docker-compose.yml
└── README.md                       # ← You are here
```

## API Reference

### Evaluate a Policy

```bash
# Transaction Limit
curl -X POST http://localhost:8080/api/v1/policies/TRANSACTION_LIMIT/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "accountTier": "SILVER",
    "transactionAmount": 8000000,
    "dailyCumulativeAmount": 5000000
  }'

# Financing Eligibility
curl -X POST http://localhost:8080/api/v1/policies/FINANCING_ELIGIBILITY/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "age": 30,
    "monthlyIncome": 15000000,
    "accountStatus": "ACTIVE",
    "requestedAmount": 100000000
  }'

# Risk Flag
curl -X POST http://localhost:8080/api/v1/policies/RISK_FLAG/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "transactionAmount": 150000000,
    "destinationRegion": "HIGH_RISK_REGION_A",
    "transactionFrequency": 15,
    "isNewBeneficiary": true
  }'
```

### Manage Rules

```bash
# List all rules
curl http://localhost:8080/api/v1/rules

# Toggle a rule off
curl -X PATCH http://localhost:8080/api/v1/rules/{id}/status \
  -H "Content-Type: application/json" \
  -d '{ "isActive": false }'

# Dry-run test (no audit record)
curl -X POST http://localhost:8080/api/v1/rules/{id}/test \
  -H "Content-Type: application/json" \
  -d '{ "accountTier": "GOLD", "transactionAmount": 40000000, "dailyCumulativeAmount": 0 }'

# View audit log
curl "http://localhost:8080/api/v1/audit?policyType=TRANSACTION_LIMIT&page=0&size=10"
```

## Development Setup (Without Docker)

### Prerequisites

- Java 17+ (JDK)
- Maven 3.9+
- Node.js 20+ and npm
- PostgreSQL 15 (running locally or via Docker)

### Backend

```bash
cd policy-engine-backend

# Create the database
createdb -U postgres policy_engine

# Run with local profile
mvn spring-boot:run
```

### Frontend

```bash
cd policy-engine-dashboard
npm install
npm run dev
```

### Running Tests

```bash
# Backend unit + integration tests (Testcontainers spins up PostgreSQL)
cd policy-engine-backend
mvn test

# Frontend (if applicable)
cd policy-engine-dashboard
npm test
```

---

## Implementation Tracking

The table below tracks the status of each implementation phase. Update the status as work progresses.

### Phase 1: Project Setup and Infrastructure

| #   | Task                                        | Status      | Notes |
| --- | ------------------------------------------- | ----------- | ----- |
| 1.1 | Initialize Spring Boot project (Maven)      | Not Started |       |
| 1.2 | Add Drools 8.44.x dependencies to pom.xml   | Not Started |       |
| 1.3 | Configure PostgreSQL + Liquibase            | Not Started |       |
| 1.4 | Create Liquibase changelogs (001, 002, 003) | Not Started |       |
| 1.5 | Configure Spring Cache (Caffeine)           | Not Started |       |
| 1.6 | Configure CORS                              | Not Started |       |
| 1.7 | Set up SpringDoc OpenAPI                    | Not Started |       |
| 1.8 | Create Dockerfile (backend)                 | Not Started |       |
| 1.9 | Create docker-compose.yml                   | Not Started |       |

### Phase 2: Domain Model and Database Layer

| #   | Task                                        | Status      | Notes |
| --- | ------------------------------------------- | ----------- | ----- |
| 2.1 | Create `Rule` JPA entity                    | Not Started |       |
| 2.2 | Create `RuleParameter` JPA entity           | Not Started |       |
| 2.3 | Create `AuditLog` JPA entity                | Not Started |       |
| 2.4 | Create enums (PolicyType, AccountTier, etc) | Not Started |       |
| 2.5 | Create Drools fact classes (3 types)        | Not Started |       |
| 2.6 | Create DTOs (request/response)              | Not Started |       |
| 2.7 | Create JPA repositories                     | Not Started |       |

### Phase 3: Drools Engine Integration

| #   | Task                                              | Status      | Notes |
| --- | ------------------------------------------------- | ----------- | ----- |
| 3.1 | Implement `DroolsEngineService` (compile + cache) | Not Started |       |
| 3.2 | Write Transaction Limit DRL                       | Not Started |       |
| 3.3 | Write Financing Eligibility DRL                   | Not Started |       |
| 3.4 | Write Risk Flag DRL                               | Not Started |       |
| 3.5 | Implement DRL validation service                  | Not Started |       |
| 3.6 | Seed default rules (003 changeset)                | Not Started |       |
| 3.7 | Unit test: Transaction Limit rule                 | Not Started |       |
| 3.8 | Unit test: Financing Eligibility rule             | Not Started |       |
| 3.9 | Unit test: Risk Flag rule                         | Not Started |       |

### Phase 4: REST API Layer

| #   | Task                                   | Status      | Notes |
| --- | -------------------------------------- | ----------- | ----- |
| 4.1 | Implement `PolicyEvaluationService`    | Not Started |       |
| 4.2 | Implement `PolicyEvaluationController` | Not Started |       |
| 4.3 | Implement `RuleManagementService`      | Not Started |       |
| 4.4 | Implement `RuleManagementController`   | Not Started |       |
| 4.5 | Implement `AuditService`               | Not Started |       |
| 4.6 | Implement `AuditController`            | Not Started |       |
| 4.7 | Implement `GlobalExceptionHandler`     | Not Started |       |
| 4.8 | Integration test: full evaluation flow | Not Started |       |
| 4.9 | Integration test: rule management flow | Not Started |       |

### Phase 5: Admin Dashboard (React Router V7)

| #    | Task                                              | Status      | Notes |
| ---- | ------------------------------------------------- | ----------- | ----- |
| 5.1  | Scaffold React Router V7 project (framework mode) | Not Started |       |
| 5.2  | Create dashboard layout (sidebar + header)        | Not Started |       |
| 5.3  | Build Dashboard overview page                     | Not Started |       |
| 5.4  | Build Rule listing page with filters              | Not Started |       |
| 5.5  | Build Rule detail page (parameter form)           | Not Started |       |
| 5.6  | Build DRL editor page (Monaco integration)        | Not Started |       |
| 5.7  | Build Rule test page (dry-run)                    | Not Started |       |
| 5.8  | Build Create new rule page                        | Not Started |       |
| 5.9  | Build Audit log viewer page                       | Not Started |       |
| 5.10 | Create API client (`lib/api.ts`)                  | Not Started |       |
| 5.11 | Create Dockerfile (frontend)                      | Not Started |       |

### Phase 6: Integration and Polish

| #   | Task                                       | Status      | Notes |
| --- | ------------------------------------------ | ----------- | ----- |
| 6.1 | End-to-end test: Docker Compose full stack | Not Started |       |
| 6.2 | Verify cache invalidation on rule update   | Not Started |       |
| 6.3 | Verify audit log records all evaluations   | Not Started |       |
| 6.4 | Test DRL hot-reload without restart        | Not Started |       |
| 6.5 | Swagger UI verification                    | Not Started |       |
| 6.6 | Update README with final instructions      | Not Started |       |

### Status Legend

| Status      | Meaning                             |
| ----------- | ----------------------------------- |
| Not Started | Work has not begun                  |
| In Progress | Currently being worked on           |
| Done        | Completed and verified              |
| Blocked     | Cannot proceed — see Notes          |
| Skipped     | Intentionally skipped (with reason) |

---

## Documentation

- [Product Requirements Document (PRD)](./docs/PRD.md) — what we're building and why
- [Technical Requirements Document (TRD)](./docs/TRD.md) — how we're building it (architecture, schemas, API design, code samples)

## License

This is a proof-of-concept project for internal evaluation.
