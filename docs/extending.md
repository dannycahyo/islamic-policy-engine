# Extending the System

Guide for adding new policy types and fact classes.

## Adding a New Policy Type

### 1. Add Enum Value

**File**: `policy-engine-backend/src/main/java/com/islamic/policyengine/model/enums/PolicyType.java`

```java
public enum PolicyType {
    TRANSACTION_LIMIT,
    FINANCING_ELIGIBILITY,
    RISK_FLAG,
    YOUR_NEW_TYPE    // add here
}
```

### 2. Create Fact Class

**Directory**: `policy-engine-backend/src/main/java/com/islamic/policyengine/model/fact/`

Create a new class following this pattern:

```java
package com.islamic.policyengine.model.fact;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class YourNewFact {

    // Input fields
    private String someInput;
    private BigDecimal amount;

    // Result fields
    private Boolean approved;
    private String reason;
}
```

Requirements:
- Use Lombok `@Data`, `@Builder`, `@NoArgsConstructor`, `@AllArgsConstructor`
- Separate input and result fields with comments
- Use `BigDecimal` for monetary values, never `double`
- For list outputs, use `@Builder.Default` with `new ArrayList<>()`

### 3. Add Fact Mapping in Evaluation Service

**File**: `policy-engine-backend/src/main/java/com/islamic/policyengine/service/PolicyEvaluationService.java`

Add a case in `mapToFact()`:

```java
case YOUR_NEW_TYPE:
    return YourNewFact.builder()
            .someInput(String.valueOf(data.get("someInput")))
            .amount(toBigDecimal(data.get("amount")))
            .build();
```

Add a case in `mapToResult()`:

```java
case YOUR_NEW_TYPE:
    YourNewFact fact = (YourNewFact) fact;
    result.put("approved", fact.getApproved());
    result.put("reason", fact.getReason());
    break;
```

### 4. Add Dashboard Type

**File**: `policy-engine-dashboard/app/lib/types.ts`

```typescript
export enum PolicyType {
  TRANSACTION_LIMIT = "TRANSACTION_LIMIT",
  FINANCING_ELIGIBILITY = "FINANCING_ELIGIBILITY",
  RISK_FLAG = "RISK_FLAG",
  YOUR_NEW_TYPE = "YOUR_NEW_TYPE",
}

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  // ... existing entries
  [PolicyType.YOUR_NEW_TYPE]: "Your New Type",
};
```

### 5. Add Badge Color

**File**: `policy-engine-dashboard/app/components/StatusBadge.tsx`

```typescript
const POLICY_TYPE_COLORS: Record<PolicyType, string> = {
  // ... existing entries
  [PolicyType.YOUR_NEW_TYPE]: "bg-teal-100 text-teal-800",
};
```

### 6. Add Sample Test Input

**File**: `policy-engine-dashboard/app/components/TestRunner.tsx`

```typescript
const SAMPLE_INPUTS: Record<string, string> = {
  // ... existing entries
  YOUR_NEW_TYPE: JSON.stringify(
    {
      someInput: "example",
      amount: 1000000,
    },
    null,
    2
  ),
};
```

## Key Files Summary

| File | What to modify |
|---|---|
| `PolicyType.java` | Add enum value |
| `model/fact/YourNewFact.java` | Create fact class |
| `PolicyEvaluationService.java` | Add `mapToFact` + `mapToResult` cases |
| `types.ts` | Add enum value + label |
| `StatusBadge.tsx` | Add badge color |
| `TestRunner.tsx` | Add sample test input |

## Checklist

- [ ] Enum value added to backend `PolicyType.java`
- [ ] Fact class created with input + output fields
- [ ] `mapToFact()` case handles all input fields
- [ ] `mapToResult()` case maps all output fields
- [ ] Frontend `PolicyType` enum updated
- [ ] `POLICY_TYPE_LABELS` has entry
- [ ] `POLICY_TYPE_COLORS` has badge color
- [ ] `SAMPLE_INPUTS` has test data
- [ ] At least one rule created with matching DRL
