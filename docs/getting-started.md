# Getting Started

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

That's it. Everything else runs in containers.

## Start the System

```bash
docker compose up --build
```

This starts:
- **Backend** (Spring Boot + Drools) on port `8080`
- **Dashboard** (React Router) on port `5173`
- **PostgreSQL** database on port `5432`

## Access Points

| Service | URL |
|---|---|
| Dashboard | http://localhost:5173 |
| Swagger UI | http://localhost:8080/swagger-ui.html |
| API base | http://localhost:8080/api |

## First Load

On first startup, the database is seeded with 3 rules:

| Rule | Policy Type |
|---|---|
| Transaction Limit - Standard | `TRANSACTION_LIMIT` |
| Financing Eligibility - Murabahah | `FINANCING_ELIGIBILITY` |
| Risk Flag - Transaction Monitoring | `RISK_FLAG` |

All three are active by default. You can view them immediately on the Dashboard home page or under **Rules**.

## Stopping

```bash
docker compose down
```

Add `-v` to also remove the database volume:

```bash
docker compose down -v
```
