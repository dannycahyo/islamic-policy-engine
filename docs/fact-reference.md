# Fact Reference

Each policy type has a corresponding Java fact class. The API input JSON is mapped to fact fields, rules execute, and output fields are returned in the response.

## TransactionFact

**Policy Type**: `TRANSACTION_LIMIT`
**Class**: `com.islamic.policyengine.model.fact.TransactionFact`

| Field | Java Type | Direction | Description |
|---|---|---|---|
| `accountTier` | `AccountTier` | Input | Account tier: `SILVER`, `GOLD`, `PLATINUM` |
| `transactionAmount` | `BigDecimal` | Input | Amount of the current transaction |
| `dailyCumulativeAmount` | `BigDecimal` | Input | Total amount already transacted today |
| `allowed` | `Boolean` | Output | Whether the transaction is permitted |
| `reason` | `String` | Output | Human-readable explanation |
| `remainingLimit` | `BigDecimal` | Output | Remaining daily limit after this transaction |

### Sample Input JSON

```json
{
  "accountTier": "GOLD",
  "transactionAmount": 5000000,
  "dailyCumulativeAmount": 20000000
}
```

---

## FinancingRequestFact

**Policy Type**: `FINANCING_ELIGIBILITY`
**Class**: `com.islamic.policyengine.model.fact.FinancingRequestFact`

| Field | Java Type | Direction | Description |
|---|---|---|---|
| `age` | `Integer` | Input | Applicant's age |
| `monthlyIncome` | `BigDecimal` | Input | Monthly income |
| `accountStatus` | `AccountStatus` | Input | Account status: `ACTIVE`, `DORMANT`, `CLOSED` |
| `requestedAmount` | `BigDecimal` | Input | Financing amount requested |
| `eligible` | `Boolean` | Output | Whether applicant is eligible |
| `reasons` | `List<String>` | Output | List of eligibility reasons/failures |
| `maxFinancingAmount` | `BigDecimal` | Output | Maximum financing amount based on income |

### Sample Input JSON

```json
{
  "age": 30,
  "monthlyIncome": 8000000,
  "accountStatus": "ACTIVE",
  "requestedAmount": 50000000
}
```

---

## RiskAssessmentFact

**Policy Type**: `RISK_FLAG`
**Class**: `com.islamic.policyengine.model.fact.RiskAssessmentFact`

| Field | Java Type | Direction | Description |
|---|---|---|---|
| `transactionAmount` | `BigDecimal` | Input | Transaction amount |
| `destinationRegion` | `String` | Input | Destination region code |
| `transactionFrequency` | `Integer` | Input | Transactions per hour |
| `isNewBeneficiary` | `Boolean` | Input | Whether beneficiary is new |
| `flagged` | `Boolean` | Output | Whether transaction is flagged |
| `riskScore` | `Integer` | Output | Accumulated risk score (0-100) |
| `flags` | `List<String>` | Output | List of triggered risk flags |

### Sample Input JSON

```json
{
  "transactionAmount": 150000000,
  "destinationRegion": "IRAN",
  "transactionFrequency": 15,
  "isNewBeneficiary": true
}
```

---

## Input JSON Mapping

When sending an evaluation request via API:

```json
POST /api/evaluate/TRANSACTION_LIMIT
{
  "data": {
    "accountTier": "GOLD",
    "transactionAmount": 5000000,
    "dailyCumulativeAmount": 20000000
  }
}
```

The `data` object keys must match the fact field names exactly (camelCase). Values are automatically converted:
- Numbers -> `BigDecimal` or `Integer`
- Strings -> `String` or enum values (e.g., `"GOLD"` -> `AccountTier.GOLD`)
- Booleans -> `Boolean`

## Enum Values

### AccountTier
`SILVER` | `GOLD` | `PLATINUM`

### AccountStatus
`ACTIVE` | `DORMANT` | `CLOSED`
