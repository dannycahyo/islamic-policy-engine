# Dashboard Overview

## Sidebar Navigation

The left sidebar contains three navigation items:

| Item | Route | Description |
|---|---|---|
| Dashboard | `/` | Home page with stats and recent activity |
| Rules | `/rules` | List, create, and manage rules |
| Audit Log | `/audit` | Evaluation history and audit trail |

On mobile, the sidebar collapses. Tap the hamburger menu in the header to open it.

## Dashboard Home

### Stats Cards

Three cards at the top, one per policy type:
- **Transaction Limit** (blue badge) - total rules and active count
- **Financing Eligibility** (purple badge) - total rules and active count
- **Risk Flag** (amber badge) - total rules and active count

Clicking a card navigates to the rules list filtered by that policy type.

### Quick Actions

Three buttons below stats:
- **View All Rules** - go to `/rules`
- **Create New Rule** - go to `/rules/new`
- **View Audit Log** - go to `/audit`

### Recent Activity

A table showing the 10 most recent audit log entries with:
- Timestamp
- Policy type badge
- Rule ID and version
- Evaluation time (ms)

## Color Coding

### Policy Type Badges
- `TRANSACTION_LIMIT` - blue (`bg-blue-100 text-blue-800`)
- `FINANCING_ELIGIBILITY` - purple (`bg-purple-100 text-purple-800`)
- `RISK_FLAG` - amber (`bg-amber-100 text-amber-800`)

### Status Badges
- **Active** - green dot + green background
- **Inactive** - gray dot + gray background
