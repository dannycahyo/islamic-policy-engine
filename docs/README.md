# Islamic Policy Engine - Documentation

Shariah-compliant policy evaluation engine with a Drools-based rule engine backend and React dashboard.

## Table of Contents

| Document | Description |
|---|---|
| [Getting Started](getting-started.md) | Prerequisites, setup, and first access |
| [Dashboard Overview](dashboard-overview.md) | Navigation, stats cards, and layout |
| [Rule Management](rule-management.md) | Create, edit, activate/deactivate rules |
| [DRL Guide](drl-guide.md) | Drools Rule Language syntax and examples |
| [Fact Reference](fact-reference.md) | All fact classes with field types |
| [Testing Rules](testing-rules.md) | Test runner usage and sample inputs |
| [Audit Log](audit-log.md) | Viewing and filtering evaluation history |
| [Extending the System](extending.md) | Adding new policy types and fact classes |

## Quick Start

```bash
docker compose up --build
```

- Dashboard: http://localhost:5173
- Swagger UI: http://localhost:8080/swagger-ui.html
