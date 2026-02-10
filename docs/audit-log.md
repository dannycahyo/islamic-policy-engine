# Audit Log

Every real policy evaluation (via the API, not test runs) is logged in the audit trail.

## What Gets Logged

Each audit entry records:
- Policy type
- Rule ID and version used
- Full input data
- Full output/result data
- Evaluation time in milliseconds
- Caller ID (if provided)
- Timestamp

**Note**: Test runner evaluations are excluded from the audit log.

## Viewing the Audit Log

Navigate to **Audit Log** (`/audit`) from the sidebar.

### Table Columns

| Column | Description |
|---|---|
| Timestamp | When the evaluation occurred |
| Policy Type | Color-coded badge |
| Rule ID | The rule that was evaluated |
| Eval Time | Evaluation duration in milliseconds |
| Caller | Caller identifier (if provided), or "—" |

## Filtering

Four filter controls at the top:

| Filter | Type | Description |
|---|---|---|
| Policy Type | Dropdown | Filter by `TRANSACTION_LIMIT`, `FINANCING_ELIGIBILITY`, or `RISK_FLAG` |
| Rule ID | Text input | Filter by specific rule ID |
| Date From | Date picker | Start date for date range |
| Date To | Date picker | End date for date range |

A **Clear Filters** button appears when any filter is active.

## Expanding Rows

Click the chevron on any row to expand it. The expanded view shows two panels side by side:

- **Input** - the full JSON that was sent for evaluation
- **Output** - the full result JSON from the evaluation

Both are displayed in a dark-themed code block for readability.

## Pagination

When there are more than 20 entries:
- Page info shows at the bottom: "Page X of Y (Z total)"
- **Previous** / **Next** buttons to navigate
- Changing filters resets to page 1
