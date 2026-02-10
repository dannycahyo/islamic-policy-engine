# Rule Management

## Viewing Rules

Navigate to **Rules** (`/rules`). Rules display as cards in a responsive grid (1/2/3 columns).

### Filtering

Use the dropdown at the top to filter by policy type:
- All Policy Types (default)
- Transaction Limit
- Financing Eligibility
- Risk Flag

### Pagination

When there are many rules, Previous/Next buttons appear at the bottom showing current page and total count.

## Creating a Rule

1. Click **+ New Rule** on the rules page (or **Create New Rule** on dashboard)
2. Fill in the form:

| Field | Required | Description |
|---|---|---|
| Name | Yes | Human-readable rule name |
| Policy Type | Yes | Select from dropdown |
| Description | No | What this rule does |
| Parameters | No | Key/value globals (see below) |
| DRL Source | Yes | Drools rule code |

3. Click **Create Rule**

### Parameters

Parameters become Drools `global` variables. Each parameter has:

| Field | Description |
|---|---|
| Key | Must match the `global` variable name in DRL exactly |
| Value | The value as a string |
| Type | How the value is cast (see mapping below) |
| Description | Human-readable explanation |

#### Parameter Type Mapping

| Dashboard Type | Java Type | Example |
|---|---|---|
| `STRING` | `String` | `"IRAN,NORTH_KOREA"` |
| `INTEGER` | `Integer` | `"21"` |
| `DECIMAL` | `BigDecimal` | `"10000000"` |
| `BOOLEAN` | `Boolean` | `"true"` |

## Editing a Rule

Click any rule card to open the detail page (`/rules/:id`).

### Metadata & Parameters

On the detail page you can edit:
- Name
- Description
- Parameters (add, remove, modify)

Click **Save Changes** to persist. This increments the rule version.

### DRL Source

Click **Edit DRL** to open the dedicated DRL editor (`/rules/:id/drl`).

The editor provides:
- Syntax-highlighted code editor
- **Validate** button (basic client-side check)
- **Save DRL** to persist changes

Saving DRL also increments the rule version.

## Activate / Deactivate

On the rule detail page, click the **Activate** or **Deactivate** button in the top-right.

- **Active** rules are used when the API evaluates a policy type
- **Inactive** rules are skipped during evaluation
- The first active rule for a given policy type is the one used for evaluation

## Versioning

The version number auto-increments on every update (metadata or DRL). The current version is displayed:
- On the detail page header (e.g., `v3`)
- In test results
- In audit log entries
