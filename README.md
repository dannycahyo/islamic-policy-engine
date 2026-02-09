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
│   ├── TRD.md                      # Technical Requirements Document
│   └── IMPLEMENTATION.md           # Phase-by-phase delivery plan
├── docker-compose.yml
└── README.md                       # ← You are here
```

## API Reference

### Evaluate a Policy

All evaluation requests wrap input fields inside a `"data"` object:

```bash
# Transaction Limit — check if SILVER tier can transact 8M IDR
curl -X POST http://localhost:8080/api/v1/policies/TRANSACTION_LIMIT/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "accountTier": "SILVER",
      "transactionAmount": 8000000,
      "dailyCumulativeAmount": 5000000
    }
  }'

# Financing Eligibility — check Murabahah eligibility
curl -X POST http://localhost:8080/api/v1/policies/FINANCING_ELIGIBILITY/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "age": 30,
      "monthlyIncome": 15000000,
      "accountStatus": "ACTIVE",
      "requestedAmount": 100000000
    }
  }'

# Risk Flag — assess transaction risk
curl -X POST http://localhost:8080/api/v1/policies/RISK_FLAG/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "transactionAmount": 150000000,
      "destinationRegion": "IRAN",
      "transactionFrequency": 15,
      "isNewBeneficiary": true
    }
  }'
```

### Manage Rules

```bash
# List all rules
curl http://localhost:8080/api/v1/rules

# Get a specific rule (with DRL source)
curl http://localhost:8080/api/v1/rules/a1b2c3d4-e5f6-7890-abcd-ef1234567890

# Update rule parameters (changes take effect immediately)
curl -X PUT http://localhost:8080/api/v1/rules/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -H "Content-Type: application/json" \
  -d '{
    "parameters": [
      {"key": "silverDailyLimit", "value": "15000000", "type": "DECIMAL", "description": "Daily limit for SILVER tier"}
    ]
  }'

# Toggle a rule off
curl -X PATCH http://localhost:8080/api/v1/rules/{id}/status \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'

# Dry-run test (no audit record created)
curl -X POST http://localhost:8080/api/v1/rules/{id}/test \
  -H "Content-Type: application/json" \
  -d '{"data": {"accountTier": "GOLD", "transactionAmount": 40000000, "dailyCumulativeAmount": 0}}'

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
createdb -U postgres islamic_policy

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

## Documentation

- [Product Requirements Document (PRD)](./docs/PRD.md) — what we're building and why
- [Technical Requirements Document (TRD)](./docs/TRD.md) — how we're building it (architecture, schemas, API design, code samples)
- [Implementation Plan](./docs/IMPLEMENTATION.md) — 9-phase delivery plan with task tracking (53 tasks)

## License

This is a proof-of-concept project for internal evaluation.
