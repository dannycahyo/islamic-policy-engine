# Technical Requirements Document (TRD)

## Islamic Policy Engine — Proof of Concept

| Field        | Value            |
| ------------ | ---------------- |
| Document     | TRD-ISL-PE-001   |
| Version      | 1.0              |
| Author       | Engineering Team |
| Status       | Draft            |
| Last Updated | 2026-02-08       |
| Related PRD  | PRD-ISL-PE-001   |

---

## 1. Architecture Overview

The system follows a two-tier architecture: a Spring Boot backend that hosts the Drools rule engine and exposes REST APIs, and a React Router V7 frontend that provides the admin dashboard. PostgreSQL serves as the single data store for both rule definitions and audit logs.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Compose                           │
│                                                                 │
│  ┌──────────────────┐    ┌──────────────────┐   ┌───────────┐   │
│  │  Admin Dashboard │───▶│  Policy Engine   │──▶│ PostgreSQL│   │
│  │  (React Router 7)│    │  (Spring Boot)   │   │           │   │
│  │  Port: 5173      │    │  Port: 8080      │   │ Port: 5432│   │
│  └──────────────────┘    └──────────────────┘   └───────────┘   │
│                                  │                              │
│                           ┌──────┴──────┐                       │
│                           │   Drools    │                       │
│                           │  KieSession │                       │
│                           │  (cached)   │                       │
│                           └─────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
```

### Request Flow

1. Client (dashboard or external service) sends `POST /api/v1/policies/{type}/evaluate`
2. Spring Boot controller deserializes input, resolves the policy type
3. Service layer checks Spring Cache for a compiled `KieSession`
4. On cache miss: loads DRL from database, compiles via `KieHelper`, caches the `KieBase`
5. Creates a stateless `KieSession`, inserts facts, fires rules
6. Collects results from the session, writes an audit record to PostgreSQL
7. Returns the evaluation result as JSON

## 2. Technology Stack

| Component   | Technology               | Version    | Purpose                                 |
| ----------- | ------------------------ | ---------- | --------------------------------------- |
| Language    | Java                     | 17         | Standard for Islamic banking apps       |
| Framework   | Spring Boot              | 2.6.x      | REST API, dependency injection, caching |
| Rule Engine | Drools                   | 8.44.x     | Declarative policy evaluation via DRL   |
| Database    | PostgreSQL               | 15         | Rule storage + audit log                |
| Migrations  | Liquibase                | 4.17.x     | Database schema versioning              |
| Caching     | Spring Cache (Caffeine)  | 3.x        | In-memory KieBase caching               |
| API Docs    | SpringDoc OpenAPI        | 1.7.x      | Swagger UI auto-generation              |
| Frontend    | React Router V7          | 7.x        | Admin dashboard (framework mode)        |
| Code Editor | Monaco Editor (React)    | 4.x        | DRL editing in browser                  |
| Build (BE)  | Maven                    | 3.9+       | Java build and dependency management    |
| Build (FE)  | Vite                     | 6.x        | Frontend bundling (via React Router)    |
| Containers  | Docker + Compose         | 24.x       | Local deployment and demo               |
| Testing     | JUnit 5 + Testcontainers | 5.x / 1.19 | Unit and integration tests              |

### Dependency Compatibility Notes

Drools 8.44.x ships with `kie-api` and `drools-engine` modules that are compatible with Spring Boot 2.6.x. The key dependency is:

```xml
<dependency>
    <groupId>org.drools</groupId>
    <artifactId>drools-engine</artifactId>
    <version>8.44.2.Final</version>
</dependency>
<dependency>
    <groupId>org.drools</groupId>
    <artifactId>drools-mvel</artifactId>
    <version>8.44.2.Final</version>
</dependency>
```

Liquibase is included via Spring Boot's starter. The `spring-boot-starter-liquibase` dependency pulls in a compatible Liquibase version (4.17.x for Spring Boot 2.6.x):

```xml
<dependency>
    <groupId>org.liquibase</groupId>
    <artifactId>liquibase-core</artifactId>
</dependency>
```

Caffeine is chosen over the default ConcurrentMapCache because it supports TTL-based eviction, which is useful for automatically refreshing KieBase instances.

## 3. Project Structure

### 3.1 Backend (`policy-engine-backend/`)

```
policy-engine-backend/
├── src/
│   ├── main/
│   │   ├── java/com/islamic/policyengine/
│   │   │   ├── PolicyEngineApplication.java
│   │   │   ├── config/
│   │   │   │   ├── CacheConfig.java              # Caffeine cache configuration
│   │   │   │   ├── CorsConfig.java               # CORS for dashboard
│   │   │   │   └── DroolsConfig.java             # KieServices bean setup
│   │   │   ├── controller/
│   │   │   │   ├── PolicyEvaluationController.java
│   │   │   │   ├── RuleManagementController.java
│   │   │   │   └── AuditController.java
│   │   │   ├── service/
│   │   │   │   ├── PolicyEvaluationService.java
│   │   │   │   ├── RuleManagementService.java
│   │   │   │   ├── DroolsEngineService.java      # KieBase compilation + session mgmt
│   │   │   │   └── AuditService.java
│   │   │   ├── model/
│   │   │   │   ├── entity/
│   │   │   │   │   ├── Rule.java                 # JPA entity
│   │   │   │   │   ├── RuleParameter.java        # JPA entity
│   │   │   │   │   └── AuditLog.java             # JPA entity
│   │   │   │   ├── enums/
│   │   │   │   │   ├── PolicyType.java
│   │   │   │   │   ├── AccountTier.java
│   │   │   │   │   └── AccountStatus.java
│   │   │   │   ├── fact/                          # Drools fact objects
│   │   │   │   │   ├── TransactionFact.java
│   │   │   │   │   ├── FinancingRequestFact.java
│   │   │   │   │   └── RiskAssessmentFact.java
│   │   │   │   └── dto/
│   │   │   │       ├── EvaluationRequest.java
│   │   │   │       ├── EvaluationResponse.java
│   │   │   │       ├── RuleDto.java
│   │   │   │       └── AuditLogDto.java
│   │   │   ├── repository/
│   │   │   │   ├── RuleRepository.java
│   │   │   │   └── AuditLogRepository.java
│   │   │   └── exception/
│   │   │       ├── PolicyNotFoundException.java
│   │   │       ├── DrlCompilationException.java
│   │   │       └── GlobalExceptionHandler.java
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-docker.yml
│   │       └── db/changelog/                      # Liquibase changelogs
│   │           ├── db.changelog-master.xml        # Master changelog
│   │           └── changes/
│   │               ├── 001-create-rules-table.xml
│   │               ├── 002-create-audit-log-table.xml
│   │               └── 003-seed-default-rules.xml
│   └── test/
│       └── java/com/islamic/policyengine/
│           ├── service/
│           │   ├── TransactionLimitRuleTest.java
│           │   ├── FinancingEligibilityRuleTest.java
│           │   └── RiskFlagRuleTest.java
│           └── integration/
│               ├── PolicyEvaluationIntegrationTest.java
│               └── RuleManagementIntegrationTest.java
├── pom.xml
└── Dockerfile
```

### 3.2 Frontend (`policy-engine-dashboard/`)

```
policy-engine-dashboard/
├── app/
│   ├── root.tsx                         # Root layout
│   ├── routes.ts                        # Route configuration
│   ├── routes/
│   │   ├── _layout.tsx                  # Dashboard shell (sidebar + header)
│   │   ├── _layout.dashboard.tsx        # Overview / home
│   │   ├── _layout.rules.tsx            # Rule listing
│   │   ├── _layout.rules.$ruleId.tsx    # Rule detail + parameter editor
│   │   ├── _layout.rules.new.tsx        # Create new rule (DRL editor)
│   │   ├── _layout.rules.$ruleId.drl.tsx # DRL editor for existing rule
│   │   ├── _layout.rules.$ruleId.test.tsx # Dry-run testing
│   │   └── _layout.audit.tsx            # Audit log viewer
│   ├── components/
│   │   ├── RuleCard.tsx
│   │   ├── ParameterForm.tsx
│   │   ├── DrlEditor.tsx                # Monaco wrapper
│   │   ├── TestRunner.tsx
│   │   ├── AuditTable.tsx
│   │   └── StatusBadge.tsx
│   ├── lib/
│   │   ├── api.ts                       # API client (fetch wrapper)
│   │   └── types.ts                     # Shared TypeScript types
│   └── tailwind.css
├── react-router.config.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
└── Dockerfile
```

## 4. Database Schema

### 4.1 `rules` Table

Stores rule definitions including DRL source and configurable parameters.

```sql
CREATE TABLE rules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    policy_type     VARCHAR(50) NOT NULL,        -- TRANSACTION_LIMIT, FINANCING_ELIGIBILITY, RISK_FLAG
    drl_source      TEXT NOT NULL,                -- Raw DRL content
    is_active       BOOLEAN NOT NULL DEFAULT true,
    version         INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rules_policy_type ON rules(policy_type);
CREATE INDEX idx_rules_is_active ON rules(is_active);
```

### 4.2 `rule_parameters` Table

Stores configurable parameters for each rule, enabling threshold changes without editing DRL.

```sql
CREATE TABLE rule_parameters (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id         UUID NOT NULL REFERENCES rules(id) ON DELETE CASCADE,
    param_key       VARCHAR(100) NOT NULL,       -- e.g., "SILVER_DAILY_LIMIT"
    param_value     VARCHAR(500) NOT NULL,        -- e.g., "10000000"
    param_type      VARCHAR(20) NOT NULL,         -- STRING, INTEGER, DECIMAL, BOOLEAN, LIST
    description     TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(rule_id, param_key)
);
```

### 4.3 `policy_audit_log` Table

Records every rule evaluation for traceability.

```sql
CREATE TABLE policy_audit_log (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_type       VARCHAR(50) NOT NULL,
    rule_id           UUID REFERENCES rules(id),
    rule_version      INTEGER NOT NULL,
    input_data        JSONB NOT NULL,             -- Request payload
    output_data       JSONB NOT NULL,             -- Evaluation result
    evaluation_ms     INTEGER NOT NULL,            -- Duration in milliseconds
    caller_id         VARCHAR(100),                -- Service or user identifier
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_policy_type ON policy_audit_log(policy_type);
CREATE INDEX idx_audit_created_at ON policy_audit_log(created_at DESC);
CREATE INDEX idx_audit_rule_id ON policy_audit_log(rule_id);
```

## 5. API Design

### 5.1 Policy Evaluation

#### `POST /api/v1/policies/{policyType}/evaluate`

**Path Parameters:**

- `policyType` — `TRANSACTION_LIMIT` | `FINANCING_ELIGIBILITY` | `RISK_FLAG`

**Request Body (Transaction Limit example):**

```json
{
  "accountTier": "SILVER",
  "transactionAmount": 8000000,
  "dailyCumulativeAmount": 5000000
}
```

**Response (200 OK):**

```json
{
  "policyType": "TRANSACTION_LIMIT",
  "ruleId": "a1b2c3d4-...",
  "ruleVersion": 1,
  "result": {
    "allowed": true,
    "reason": "Transaction within daily limit for SILVER tier",
    "remainingLimit": 2000000
  },
  "evaluationMs": 12,
  "timestamp": "2026-02-08T10:30:00Z"
}
```

**Error Response (400 Bad Request):**

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Invalid accountTier: BRONZE. Must be one of: SILVER, GOLD, PLATINUM",
  "timestamp": "2026-02-08T10:30:00Z"
}
```

### 5.2 Rule Management

#### `GET /api/v1/rules`

**Query Parameters:** `policyType` (optional), `isActive` (optional), `page` (default 0), `size` (default 20)

**Response:**

```json
{
  "content": [
    {
      "id": "a1b2c3d4-...",
      "name": "Transaction Limit - Standard",
      "policyType": "TRANSACTION_LIMIT",
      "isActive": true,
      "version": 3,
      "parameters": [
        {
          "key": "SILVER_DAILY_LIMIT",
          "value": "10000000",
          "type": "INTEGER"
        },
        {
          "key": "GOLD_DAILY_LIMIT",
          "value": "50000000",
          "type": "INTEGER"
        },
        {
          "key": "PLATINUM_DAILY_LIMIT",
          "value": "200000000",
          "type": "INTEGER"
        }
      ],
      "updatedAt": "2026-02-08T09:00:00Z"
    }
  ],
  "totalElements": 3,
  "totalPages": 1,
  "number": 0
}
```

#### `PUT /api/v1/rules/{id}`

**Request Body:**

```json
{
  "name": "Transaction Limit - Standard",
  "description": "Daily transaction limits by account tier",
  "drlSource": "package com.islamic.policyengine.rules;\n\nimport ...",
  "parameters": [
    {
      "key": "SILVER_DAILY_LIMIT",
      "value": "15000000",
      "type": "INTEGER"
    }
  ]
}
```

Updates the rule, increments the version, invalidates the cache, and recompiles the KieBase.

#### `PATCH /api/v1/rules/{id}/status`

```json
{ "isActive": false }
```

#### `POST /api/v1/rules/{id}/test`

Same request body as the evaluation endpoint, but returns the result without writing an audit record. Used for dry-run testing from the dashboard.

### 5.3 Audit Log

#### `GET /api/v1/audit`

**Query Parameters:** `policyType`, `ruleId`, `dateFrom`, `dateTo`, `page`, `size`

Returns paginated audit entries sorted by `created_at DESC`.

## 6. Drools Integration Design

### 6.1 DRL Structure

Each rule type has a DRL template. Parameters from the database are injected as global variables.

**Example: Transaction Limit DRL**

```drl
package com.islamic.policyengine.rules;

import com.islamic.policyengine.model.fact.TransactionFact;

global Long silverDailyLimit;
global Long goldDailyLimit;
global Long platinumDailyLimit;

rule "Transaction Limit - SILVER"
    when
        $tx : TransactionFact(
            accountTier == "SILVER",
            (transactionAmount + dailyCumulativeAmount) > silverDailyLimit
        )
    then
        $tx.setAllowed(false);
        $tx.setReason("Daily limit exceeded for SILVER tier");
        $tx.setRemainingLimit(silverDailyLimit - $tx.getDailyCumulativeAmount());
end

rule "Transaction Limit - SILVER - Allowed"
    when
        $tx : TransactionFact(
            accountTier == "SILVER",
            (transactionAmount + dailyCumulativeAmount) <= silverDailyLimit
        )
    then
        $tx.setAllowed(true);
        $tx.setReason("Transaction within daily limit for SILVER tier");
        $tx.setRemainingLimit(
            silverDailyLimit - $tx.getDailyCumulativeAmount() - $tx.getTransactionAmount()
        );
end

// ... similar rules for GOLD and PLATINUM
```

### 6.2 KieBase Compilation and Caching

```java
@Service
public class DroolsEngineService {

    @Cacheable(value = "kieBases", key = "#rule.id + '-' + #rule.version")
    public KieBase compileRule(Rule rule) {
        KieHelper kieHelper = new KieHelper();
        kieHelper.addContent(rule.getDrlSource(), ResourceType.DRL);

        Results results = kieHelper.verify();
        if (results.hasMessages(Message.Level.ERROR)) {
            throw new DrlCompilationException(results.getMessages());
        }

        return kieHelper.build();
    }

    @CacheEvict(value = "kieBases", key = "#ruleId + '-' + #oldVersion")
    public void evictCache(UUID ruleId, int oldVersion) {
        // Cache entry removed; next evaluation triggers recompilation
    }
}
```

### 6.3 Evaluation Flow

```java
@Service
@RequiredArgsConstructor
public class PolicyEvaluationService {

    private final DroolsEngineService droolsEngine;
    private final RuleRepository ruleRepository;
    private final AuditService auditService;

    public EvaluationResponse evaluate(PolicyType type, EvaluationRequest request) {
        Rule rule = ruleRepository.findByPolicyTypeAndIsActiveTrue(type)
            .orElseThrow(() -> new PolicyNotFoundException(type));

        KieBase kieBase = droolsEngine.compileRule(rule);
        KieSession session = kieBase.newKieSession();

        try {
            // Inject parameters as globals
            rule.getParameters().forEach(p ->
                session.setGlobal(p.getParamKey(), castValue(p))
            );

            // Insert the fact
            Object fact = mapToFact(type, request);
            session.insert(fact);

            long start = System.nanoTime();
            session.fireAllRules();
            long durationMs = (System.nanoTime() - start) / 1_000_000;

            EvaluationResponse response = mapToResponse(type, fact, rule, durationMs);

            // Async audit
            auditService.log(type, rule, request, response, durationMs);

            return response;
        } finally {
            session.dispose();
        }
    }
}
```

### 6.4 DRL Validation

Before saving a DRL update, the backend compiles it in isolation and returns any errors:

```java
public List<String> validateDrl(String drlSource) {
    KieHelper kieHelper = new KieHelper();
    kieHelper.addContent(drlSource, ResourceType.DRL);
    Results results = kieHelper.verify();
    return results.getMessages().stream()
        .map(Message::getText)
        .collect(Collectors.toList());
}
```

The admin dashboard calls this before saving to provide inline error feedback in the Monaco editor.

## 7. Caching Strategy

| Cache Name | Key                  | TTL    | Eviction                           |
| ---------- | -------------------- | ------ | ---------------------------------- |
| `kieBases` | `{ruleId}-{version}` | 30 min | On rule update (explicit eviction) |

**Configuration (`CacheConfig.java`):**

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager("kieBases");
        manager.setCaffeine(Caffeine.newBuilder()
            .maximumSize(50)
            .expireAfterWrite(Duration.ofMinutes(30))
            .recordStats());
        return manager;
    }
}
```

## 8. Frontend Architecture

### 8.1 React Router V7 — Framework Mode

The dashboard uses React Router V7 in framework mode, providing file-based routing with loaders and actions for server-side data fetching.

**Key patterns:**

- **Loaders** fetch data server-side before rendering (e.g., rule list, audit entries)
- **Actions** handle form submissions (e.g., updating rule parameters, toggling status)
- **Error boundaries** per route for graceful error handling

**Example Route (`app/routes/_layout.rules.tsx`):**

```tsx
import type { Route } from './+types/_layout.rules';

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const policyType = url.searchParams.get('policyType') ?? undefined;

  const res = await fetch(
    `${process.env.API_URL}/api/v1/rules?policyType=${policyType ?? ''}`,
  );
  return await res.json();
}

export default function RulesPage({
  loaderData,
}: Route.ComponentProps) {
  const { content: rules } = loaderData;
  return (
    <div>
      <h1>Policy Rules</h1>
      <div className="grid gap-4">
        {rules.map((rule) => (
          <RuleCard key={rule.id} rule={rule} />
        ))}
      </div>
    </div>
  );
}
```

### 8.2 Monaco Editor Integration

The DRL editor uses `@monaco-editor/react` with a custom language configuration for DRL syntax highlighting.

```tsx
import Editor from '@monaco-editor/react';

export function DrlEditor({
  value,
  onChange,
  errors,
}: DrlEditorProps) {
  return (
    <Editor
      height="500px"
      language="java" // DRL is close enough to Java for basic highlighting
      value={value}
      onChange={(val) => onChange(val ?? '')}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
      }}
    />
  );
}
```

### 8.3 Dashboard Pages

| Route                 | Purpose                                     |
| --------------------- | ------------------------------------------- |
| `/`                   | Redirect to `/dashboard`                    |
| `/dashboard`          | Overview: rule counts, recent audit entries |
| `/rules`              | Rule listing with filter by policy type     |
| `/rules/:ruleId`      | Rule detail: parameters form + toggle       |
| `/rules/:ruleId/drl`  | DRL editor with validation + save           |
| `/rules/:ruleId/test` | Dry-run tester with JSON input/output       |
| `/rules/new`          | Create new rule form with DRL editor        |
| `/audit`              | Paginated, filterable audit log table       |

## 9. Docker Compose Setup

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: policy_engine
      POSTGRES_USER: policy_admin
      POSTGRES_PASSWORD: policy_dev
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U policy_admin']
      interval: 5s
      timeout: 3s
      retries: 5

  backend:
    build: ./policy-engine-backend
    environment:
      SPRING_PROFILES_ACTIVE: docker
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/policy_engine
      SPRING_DATASOURCE_USERNAME: policy_admin
      SPRING_DATASOURCE_PASSWORD: policy_dev
    ports:
      - '8080:8080'
    depends_on:
      postgres:
        condition: service_healthy

  dashboard:
    build: ./policy-engine-dashboard
    environment:
      API_URL: http://backend:8080
    ports:
      - '5173:3000'
    depends_on:
      - backend

volumes:
  pgdata:
```

## 10. Testing Strategy

### 10.1 Unit Tests

Each rule type has a dedicated test class that creates a Drools session in-memory (no database) and validates rule logic.

```java
@Test
void silverTier_withinLimit_shouldAllow() {
    TransactionFact fact = new TransactionFact();
    fact.setAccountTier("SILVER");
    fact.setTransactionAmount(3_000_000L);
    fact.setDailyCumulativeAmount(5_000_000L);

    session.setGlobal("silverDailyLimit", 10_000_000L);
    session.insert(fact);
    session.fireAllRules();

    assertThat(fact.isAllowed()).isTrue();
    assertThat(fact.getRemainingLimit()).isEqualTo(2_000_000L);
}
```

### 10.2 Integration Tests

Using Testcontainers to spin up PostgreSQL, tests verify the full flow: API call → Drools evaluation → audit record creation.

```java
@SpringBootTest(webEnvironment = RANDOM_PORT)
@Testcontainers
class PolicyEvaluationIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Test
    void evaluateTransactionLimit_shouldReturnResultAndAudit() {
        // POST /api/v1/policies/TRANSACTION_LIMIT/evaluate
        // Assert response + verify audit record in DB
    }
}
```

### 10.3 Test Coverage Targets

| Area                   | Target             |
| ---------------------- | ------------------ |
| Rule logic (unit)      | 100%               |
| Service layer          | 80%+               |
| Controller (API)       | 80%+               |
| Integration (E2E flow) | Core paths covered |

## 11. Error Handling

| Scenario                       | HTTP Code | Error Code              |
| ------------------------------ | --------- | ----------------------- |
| Invalid policy type            | 400       | `INVALID_POLICY_TYPE`   |
| Missing required input field   | 400       | `VALIDATION_ERROR`      |
| No active rule for policy type | 404       | `POLICY_NOT_FOUND`      |
| DRL compilation failure        | 422       | `DRL_COMPILATION_ERROR` |
| Rule evaluation timeout (>5s)  | 504       | `EVALUATION_TIMEOUT`    |
| Internal server error          | 500       | `INTERNAL_ERROR`        |

All error responses follow a consistent structure:

```json
{
  "error": "DRL_COMPILATION_ERROR",
  "message": "Line 12: unable to resolve method 'getAmounts()'",
  "details": ["...additional compiler messages..."],
  "timestamp": "2026-02-08T10:30:00Z"
}
```

## 12. Configuration

### Backend (`application.yml`)

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/policy_engine
    username: policy_admin
    password: policy_dev
  jpa:
    hibernate:
      ddl-auto: validate       # Liquibase handles schema
    show-sql: false
  liquibase:
    enabled: true
    change-log: classpath:db/changelog/db.changelog-master.xml
  cache:
    type: caffeine

policy-engine:
  evaluation:
    timeout-ms: 5000 # Max evaluation time
  cache:
    max-size: 50
    ttl-minutes: 30

springdoc:
  api-docs:
    path: /api-docs
  swagger-ui:
    path: /swagger-ui.html
```

### Frontend (`.env`)

```env
API_URL=http://localhost:8080
```

## 13. Security Considerations (PoC Scope)

Since this is a PoC, full security implementation is out of scope. However, these minimal safeguards are included:

- **CORS** — Backend only accepts requests from the dashboard origin
- **Input validation** — All API inputs are validated via Bean Validation annotations
- **DRL sandboxing** — DRL rules cannot import arbitrary classes; imports are restricted to the `model.fact` package
- **SQL injection** — Mitigated by JPA parameterized queries (no raw SQL)
- **No authentication** — All endpoints are open (to be addressed post-PoC)

## 14. Known Limitations

1. **Single rule per policy type** — The PoC assumes one active rule per policy type. Production would need rule chaining and priority ordering.
2. **No rule versioning history** — Only the current version is kept. Previous DRL content is overwritten.
3. **Synchronous audit writes** — Audit records are written synchronously. Production should use async/event-driven writes.
4. **No horizontal scaling** — Single-instance cache means no cache coherence across multiple instances.
5. **No DRL import restrictions enforced** — The sandbox note above is advisory; actual class-loading restrictions are not implemented.

---

_End of TRD_
