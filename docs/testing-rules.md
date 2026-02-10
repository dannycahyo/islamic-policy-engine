# Testing Rules

The dashboard includes a built-in test runner for dry-running rules without creating audit records.

## Accessing the Test Runner

1. Navigate to **Rules** > click a rule card
2. On the rule detail page, click **Test Rule** in the top-right
3. This opens `/rules/:id/test`

The test page shows:
- Rule name, policy type badge, status badge, and version
- A note confirming this is a dry-run (no audit record written)

## Pre-populated Sample Inputs

The test runner auto-fills sample JSON based on the rule's policy type:

### TRANSACTION_LIMIT
```json
{
  "customerId": "CUST-001",
  "customerTier": "GOLD",
  "transactionAmount": 5000.0,
  "transactionCurrency": "MYR"
}
```

### FINANCING_ELIGIBILITY
```json
{
  "customerId": "CUST-001",
  "monthlyIncome": 8000.0,
  "existingDebt": 1000.0,
  "requestedAmount": 50000.0,
  "financingType": "MURABAHAH",
  "employmentYears": 3
}
```

### RISK_FLAG
```json
{
  "customerId": "CUST-001",
  "transactionAmount": 25000.0,
  "transactionType": "TRANSFER",
  "destinationCountry": "MY",
  "isNewBeneficiary": true
}
```

These are starting templates. Edit the JSON freely to test different scenarios.

## Running a Test

1. Edit the JSON input in the textarea
2. Click **Run Test**
3. A spinner shows while evaluating

## Reading Results

On success, the result panel shows:
- **Evaluation time** in milliseconds
- **Rule version** that was tested
- **Output JSON** - the result fields from the fact class

Example output for a transaction limit test:
```json
{
  "allowed": true,
  "reason": "Transaction within daily limit for GOLD tier",
  "remainingLimit": 45000000
}
```

## Error Handling

- **Invalid JSON** - if the input isn't valid JSON, an error is shown immediately
- **Server errors** - if the rule fails to compile or evaluate, the error message from the backend is displayed

## Important Notes

- Tests are **dry-run only** - no audit log entries are created
- Tests use the rule's **current DRL source and parameters**, even if the rule is inactive
- You can test inactive rules (useful for development before activating)
