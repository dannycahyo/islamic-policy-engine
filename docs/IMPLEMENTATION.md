# Implementation Plan

## Islamic Policy Engine — Proof of Concept

| Field         | Value            |
| ------------- | ---------------- |
| Document      | IMP-ISL-PE-001   |
| Version       | 1.0              |
| Last Updated  | 2026-02-08       |
| Related PRD   | PRD-ISL-PE-001   |
| Related TRD   | TRD-ISL-PE-001   |

---

## Execution Strategy

This plan is organized into **two parallel tracks** that converge at the end. After the shared foundation (Phases 1–2), backend and frontend work can happen simultaneously.

```
                          ┌─────────────────── BACKEND TRACK ───────────────────┐
                          │                                                     │
Phase 1 ──► Phase 2 ──┬──► Phase 3 ──► Phase 4 ──► Phase 5 ──┐               │
       Shared Foundation│                                       ├──► Phase 9    │
                        └──► Phase 6 ──► Phase 7 ──► Phase 8 ──┘  (converge)  │
                          │                                                     │
                          └────────────────── FRONTEND TRACK ───────────────────┘
```

**Backend Track** (Phases 3 → 4 → 5): Drools engine, evaluation API, rule management API, integration tests. These phases are sequential — each builds on the previous.

**Frontend Track** (Phases 6 → 7 → 8): Dashboard scaffolding, rule management UI, testing & audit pages. Phase 6 can start as soon as Phase 1 is done (it doesn't need the domain model). Phases 7–8 need the backend API (Phase 5) to be ready for real data.

**Convergence** (Phase 9): Both tracks must be complete before final end-to-end verification.

### When to Start Each Phase

| Phase | Can Start When...                          | Track    |
| ----- | ------------------------------------------ | -------- |
| 1     | Immediately                                | Shared   |
| 2     | Phase 1 is done                            | Shared   |
| 3     | Phase 2 is done                            | Backend  |
| 4     | Phase 3 is done                            | Backend  |
| 5     | Phase 4 is done                            | Backend  |
| 6     | Phase 1 is done (parallel with Phase 2–3)  | Frontend |
| 7     | Phase 5 **and** Phase 6 are done           | Frontend |
| 8     | Phase 7 is done                            | Frontend |
| 9     | Phase 5 **and** Phase 8 are done           | Both     |

---

### Status Legend

| Status      | Meaning                             |
| ----------- | ----------------------------------- |
| Not Started | Work has not begun                  |
| In Progress | Currently being worked on           |
| Done        | Completed and verified              |
| Blocked     | Cannot proceed — see Notes          |
| Skipped     | Intentionally skipped (with reason) |

---

## Phase 1: Project Scaffolding & Configuration `[Shared]`

Bootstrap the Spring Boot project with all dependencies and infrastructure config. By the end of this phase, `mvn compile` succeeds and Docker Compose starts PostgreSQL + an empty Spring Boot app.

| #   | Task                                                    | Status      | Notes |
| --- | ------------------------------------------------------- | ----------- | ----- |
| 1.1 | Initialize Spring Boot 2.6.x project via Maven archetype | Done |       |
| 1.2 | Add dependencies: Drools 8.44.x, Caffeine, Liquibase, SpringDoc, Lombok | Done |       |
| 1.3 | Create `application.yml` and `application-docker.yml`   | Done |       |
| 1.4 | Configure Spring Cache with Caffeine (`CacheConfig`)    | Done |       |
| 1.5 | Configure CORS (`CorsConfig`)                           | Done |       |
| 1.6 | Create `Dockerfile` (backend) and `docker-compose.yml`  | Done |       |

**Exit criteria:** `docker compose up` starts PostgreSQL and the Spring Boot app with no errors. Swagger UI loads at `/swagger-ui.html` (empty).

---

## Phase 2: Database Schema & Domain Model `[Shared]`

Define the database schema via Liquibase and create all JPA entities, enums, fact classes, and DTOs. By the end of this phase, the app starts with tables created and the domain model is compile-ready.

| #   | Task                                                     | Status      | Notes |
| --- | -------------------------------------------------------- | ----------- | ----- |
| 2.1 | Create Liquibase master changelog and 001 (rules table)  | Done |       |
| 2.2 | Create Liquibase 002 (rule_parameters + audit_log tables) | Done |       |
| 2.3 | Create JPA entities: `Rule`, `RuleParameter`, `AuditLog` | Done |       |
| 2.4 | Create enums: `PolicyType`, `AccountTier`, `AccountStatus` | Done |       |
| 2.5 | Create Drools fact classes: `TransactionFact`, `FinancingRequestFact`, `RiskAssessmentFact` | Done |       |
| 2.6 | Create DTOs: `EvaluationRequest`, `EvaluationResponse`, `RuleDto`, `AuditLogDto` | Done |       |
| 2.7 | Create JPA repositories: `RuleRepository`, `AuditLogRepository` | Done |       |

**Exit criteria:** App starts, Liquibase runs migrations successfully, tables exist in PostgreSQL. All model classes compile.

---

## Phase 3: Drools Engine & Rule Definitions `[Backend Track]`

Build the core Drools integration: DRL compilation, caching, validation, and the three rule definitions. By the end of this phase, rules can be compiled and fired in-memory.

| #   | Task                                                       | Status      | Notes |
| --- | ---------------------------------------------------------- | ----------- | ----- |
| 3.1 | Implement `DroolsEngineService` (compile DRL → cached KieBase) | Not Started |       |
| 3.2 | Implement `DroolsConfig` (KieServices bean setup)          | Not Started |       |
| 3.3 | Write Transaction Limit DRL (with global params)           | Not Started |       |
| 3.4 | Write Financing Eligibility DRL (Murabahah)                | Not Started |       |
| 3.5 | Write Risk Flag DRL (multi-pattern)                        | Not Started |       |
| 3.6 | Implement DRL validation service (compile check)           | Not Started |       |

**Exit criteria:** Each DRL compiles without errors via `KieHelper`. `DroolsEngineService` can build and cache a `KieBase` from DRL source.

---

## Phase 4: Policy Evaluation API & Unit Tests `[Backend Track]`

Wire up the evaluation endpoint and prove all three rules work correctly with unit tests. By the end of this phase, the core use case (call API → Drools evaluates → return result) works.

| #   | Task                                                    | Status      | Notes |
| --- | ------------------------------------------------------- | ----------- | ----- |
| 4.1 | Implement `PolicyEvaluationService` (full evaluation flow) | Not Started |       |
| 4.2 | Implement `PolicyEvaluationController` (`POST /evaluate`) | Not Started |       |
| 4.3 | Implement `AuditService` (write audit record)            | Not Started |       |
| 4.4 | Create Liquibase 003 (seed default rules + parameters)   | Not Started |       |
| 4.5 | Unit test: Transaction Limit rule (all tiers, edge cases) | Not Started |       |
| 4.6 | Unit test: Financing Eligibility rule (pass/fail combos)  | Not Started |       |
| 4.7 | Unit test: Risk Flag rule (single flag, multi-flag, clean) | Not Started |       |

**Exit criteria:** `POST /api/v1/policies/{type}/evaluate` returns correct results for all three policy types. All unit tests pass. Audit records appear in the database.

---

## Phase 5: Rule Management & Audit API `[Backend Track]`

Add the CRUD endpoints for rule management and the audit log query endpoint. By the end of this phase, the full backend API is functional.

| #   | Task                                                      | Status      | Notes |
| --- | --------------------------------------------------------- | ----------- | ----- |
| 5.1 | Implement `RuleManagementService` (CRUD + cache eviction) | Not Started |       |
| 5.2 | Implement `RuleManagementController` (GET/PUT/POST/PATCH) | Not Started |       |
| 5.3 | Implement dry-run test endpoint (`POST /rules/{id}/test`) | Not Started |       |
| 5.4 | Implement `AuditController` (paginated + filtered query)  | Not Started |       |
| 5.5 | Implement `GlobalExceptionHandler` (consistent errors)    | Not Started |       |
| 5.6 | Integration test: evaluation flow (Testcontainers)        | Not Started |       |
| 5.7 | Integration test: rule CRUD + cache invalidation          | Not Started |       |

**Exit criteria:** All REST endpoints from the TRD work correctly. Swagger UI shows all endpoints. Integration tests pass with Testcontainers.

---

## Phase 6: Dashboard Foundation & Layout `[Frontend Track]`

Scaffold the React Router V7 project and build the shell (sidebar, header, routing). By the end of this phase, navigation works and the API client can talk to the backend.

| #   | Task                                                      | Status      | Notes |
| --- | --------------------------------------------------------- | ----------- | ----- |
| 6.1 | Scaffold React Router V7 project (framework mode + Vite)  | Not Started |       |
| 6.2 | Create root layout with sidebar navigation and header     | Not Started |       |
| 6.3 | Create API client (`lib/api.ts`) with typed fetch wrapper | Not Started |       |
| 6.4 | Define shared TypeScript types (`lib/types.ts`)           | Not Started |       |
| 6.5 | Create `Dockerfile` (frontend) and update docker-compose  | Not Started |       |

**Exit criteria:** Dashboard renders with sidebar navigation. Routes resolve correctly. API client successfully fetches from the backend.

---

## Phase 7: Dashboard — Rule Management Pages `[Frontend Track]`

Build the core rule management UI: listing, detail editing, and the DRL code editor. By the end of this phase, admins can view and modify rules from the browser.

| #   | Task                                                       | Status      | Notes |
| --- | ---------------------------------------------------------- | ----------- | ----- |
| 7.1 | Build Dashboard overview page (rule counts, recent audit)  | Not Started |       |
| 7.2 | Build Rule listing page with policy type filter            | Not Started |       |
| 7.3 | Build Rule detail page (parameter form + active toggle)    | Not Started |       |
| 7.4 | Build DRL editor page (Monaco integration + validation)    | Not Started |       |
| 7.5 | Build Create new rule page (form + DRL editor)             | Not Started |       |

**Exit criteria:** Can list all rules, edit parameters, toggle active/inactive, write and validate DRL, and create new rules — all from the browser.

---

## Phase 8: Dashboard — Testing, Audit & Polish `[Frontend Track]`

Build the remaining pages (dry-run testing, audit log) and polish the overall UI. By the end of this phase, the dashboard is feature-complete.

| #   | Task                                                      | Status      | Notes |
| --- | --------------------------------------------------------- | ----------- | ----- |
| 8.1 | Build Rule test page (JSON input form + result display)   | Not Started |       |
| 8.2 | Build Audit log viewer (paginated table + filters)        | Not Started |       |
| 8.3 | Add loading states, error boundaries, and toast feedback  | Not Started |       |
| 8.4 | Verify all dashboard routes work with backend API         | Not Started |       |

**Exit criteria:** All dashboard pages from the TRD are functional. Dry-run returns results without audit. Audit log filters by policy type and date range.

---

## Phase 9: End-to-End Verification & Documentation `[Convergence]`

Run the full stack via Docker Compose and verify every success criterion from the PRD. Finalize documentation.

| #   | Task                                                        | Status      | Notes |
| --- | ----------------------------------------------------------- | ----------- | ----- |
| 9.1 | `docker compose up --build` — full stack smoke test         | Not Started |       |
| 9.2 | Verify rule change via UI → immediate API behavior change   | Not Started |       |
| 9.3 | Verify DRL hot-reload without application restart           | Not Started |       |
| 9.4 | Verify audit log captures all evaluations (not dry-runs)    | Not Started |       |
| 9.5 | Verify Swagger UI shows all endpoints with correct schemas  | Not Started |       |
| 9.6 | Update README with final setup notes and any known issues   | Not Started |       |

**Exit criteria:** All 6 success criteria from the PRD are met. README is accurate. A new developer can clone the repo, run `docker compose up`, and have a working system.

---

## Phase Summary

| Phase | Name                                | Track    | Tasks | Depends On   |
| ----- | ----------------------------------- | -------- | ----- | ------------ |
| 1     | Project Scaffolding & Config        | Shared   | 6     | —            |
| 2     | Database Schema & Domain Model      | Shared   | 7     | Phase 1      |
| 3     | Drools Engine & Rule Definitions    | Backend  | 6     | Phase 2      |
| 4     | Policy Evaluation API & Tests       | Backend  | 7     | Phase 3      |
| 5     | Rule Management & Audit API         | Backend  | 7     | Phase 4      |
| 6     | Dashboard Foundation & Layout       | Frontend | 5     | Phase 1      |
| 7     | Dashboard — Rule Management Pages   | Frontend | 5     | Phase 5 + 6  |
| 8     | Dashboard — Testing, Audit & Polish | Frontend | 4     | Phase 7      |
| 9     | End-to-End Verification & Docs      | Both     | 6     | Phase 5 + 8  |

**Total: 53 tasks across 9 phases (2 shared → 3 backend + 3 frontend in parallel → 1 convergence)**
