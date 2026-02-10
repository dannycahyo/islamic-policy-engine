# DRL Guide

DRL (Drools Rule Language) is the language used to define policy evaluation logic. This guide covers syntax, patterns, and real examples from the seeded rules.

## DRL Structure

Every DRL file follows this structure:

```drools
package com.islamic.policyengine.rules;

import com.islamic.policyengine.model.fact.SomeFact;
import java.math.BigDecimal;

global Type variableName;

rule "Rule Name"
    salience 100
    when
        // conditions (LHS)
    then
        // actions (RHS)
end
```

### Key Elements

| Element | Purpose |
|---|---|
| `package` | Must be `com.islamic.policyengine.rules` |
| `import` | Java classes used in conditions/actions |
| `global` | External variables injected from rule parameters |
| `rule "..."` | Named rule block |
| `salience` | Priority (higher = runs first, default 0) |
| `when` | Pattern matching conditions on facts |
| `then` | Actions to execute when conditions match |
| `end` | Closes the rule block |

## Using Globals

Globals are injected from rule **parameters**. The parameter `key` must exactly match the `global` variable name.

```drools
global java.math.BigDecimal silverDailyLimit;
global Integer minAge;
global String highRiskRegions;
```

**Important**: The `global` type must match the parameter type mapping:
- `DECIMAL` parameter -> `global java.math.BigDecimal`
- `INTEGER` parameter -> `global Integer`
- `STRING` parameter -> `global String`
- `BOOLEAN` parameter -> `global Boolean`

## Accessing Fact Fields

In the `when` block, bind a fact variable and access fields using the property name (not getter):

```drools
when
    $tx : TransactionFact(
        accountTier == AccountTier.SILVER,
        transactionAmount != null,
        transactionAmount.add(dailyCumulativeAmount).compareTo(silverDailyLimit) > 0
    )
```

- `$tx` is the bound variable (convention: `$` prefix)
- Field names use camelCase property access (Drools calls getters automatically)
- Multiple conditions separated by commas (implicit AND)

## Setting Output Fields

In the `then` block, use setter methods on the bound variable:

```drools
then
    $tx.setAllowed(false);
    $tx.setReason("Daily limit exceeded for SILVER tier");
    $tx.setRemainingLimit(silverDailyLimit.subtract($tx.getDailyCumulativeAmount()));
```

**Note**: In `then` blocks you must use explicit getter/setter calls (`$tx.getDailyCumulativeAmount()`), not property access.

## Salience (Priority)

When multiple rules can fire, `salience` controls order:

```drools
rule "Calculate First"
    salience 100    // runs first
    when ...
    then ...
end

rule "Validate Second"
    salience 50     // runs second
    when ...
    then ...
end

rule "Final Check"
    salience 10     // runs last
    when ...
    then ...
end
```

Use this pattern to:
1. Initialize/calculate values (high salience)
2. Run validation checks (medium salience)
3. Summarize results (low salience)

---

## Example 1: Transaction Limit

Checks if a transaction exceeds the daily limit for the account tier.

**Parameters**: `silverDailyLimit` (DECIMAL), `goldDailyLimit` (DECIMAL), `platinumDailyLimit` (DECIMAL)

```drools
package com.islamic.policyengine.rules;

import com.islamic.policyengine.model.fact.TransactionFact;
import com.islamic.policyengine.model.enums.AccountTier;
import java.math.BigDecimal;

global java.math.BigDecimal silverDailyLimit;
global java.math.BigDecimal goldDailyLimit;
global java.math.BigDecimal platinumDailyLimit;

rule "Transaction Limit - SILVER - Exceeded"
    when
        $tx : TransactionFact(
            accountTier == AccountTier.SILVER,
            transactionAmount != null,
            dailyCumulativeAmount != null,
            transactionAmount.add(dailyCumulativeAmount).compareTo(silverDailyLimit) > 0
        )
    then
        $tx.setAllowed(false);
        $tx.setReason("Daily limit exceeded for SILVER tier");
        $tx.setRemainingLimit(
            silverDailyLimit.subtract($tx.getDailyCumulativeAmount())
                .max(java.math.BigDecimal.ZERO)
        );
end

rule "Transaction Limit - SILVER - Allowed"
    when
        $tx : TransactionFact(
            accountTier == AccountTier.SILVER,
            transactionAmount != null,
            dailyCumulativeAmount != null,
            transactionAmount.add(dailyCumulativeAmount).compareTo(silverDailyLimit) <= 0
        )
    then
        $tx.setAllowed(true);
        $tx.setReason("Transaction within daily limit for SILVER tier");
        $tx.setRemainingLimit(
            silverDailyLimit.subtract($tx.getDailyCumulativeAmount())
                .subtract($tx.getTransactionAmount())
        );
end
```

**Pattern**: Paired exceeded/allowed rules per tier. Each pair is mutually exclusive based on the `compareTo` condition.

---

## Example 2: Financing Eligibility

Multi-condition eligibility check with calculated fields.

**Parameters**: `minAge` (INTEGER), `maxAge` (INTEGER), `minMonthlyIncome` (DECIMAL), `maxDtiMultiplier` (DECIMAL)

```drools
package com.islamic.policyengine.rules;

import com.islamic.policyengine.model.fact.FinancingRequestFact;
import com.islamic.policyengine.model.enums.AccountStatus;
import java.math.BigDecimal;
import java.util.ArrayList;

global Integer minAge;
global Integer maxAge;
global java.math.BigDecimal minMonthlyIncome;
global java.math.BigDecimal maxDtiMultiplier;

rule "Financing - Calculate Max Amount"
    salience 100
    when
        $req : FinancingRequestFact(monthlyIncome != null)
    then
        $req.setMaxFinancingAmount($req.getMonthlyIncome().multiply(maxDtiMultiplier));
        $req.setEligible(true);
        $req.setReasons(new ArrayList<>());
end

rule "Financing - Age Below Minimum"
    salience 50
    when
        $req : FinancingRequestFact(age != null, age < minAge)
    then
        $req.setEligible(false);
        $req.getReasons().add("Age " + $req.getAge() + " is below minimum age of " + minAge);
end

rule "Financing - Income Below Minimum"
    salience 50
    when
        $req : FinancingRequestFact(
            monthlyIncome != null,
            monthlyIncome.compareTo(minMonthlyIncome) < 0
        )
    then
        $req.setEligible(false);
        $req.getReasons().add("Monthly income below minimum of " + minMonthlyIncome);
end

rule "Financing - Age Above Maximum"
    salience 50
    when
        $req : FinancingRequestFact(age != null, age > maxAge)
    then
        $req.setEligible(false);
        $req.getReasons().add("Age " + $req.getAge() + " exceeds maximum age of " + maxAge);
end

rule "Financing - Account Not Active"
    salience 50
    when
        $req : FinancingRequestFact(accountStatus != null, accountStatus != AccountStatus.ACTIVE)
    then
        $req.setEligible(false);
        $req.getReasons().add("Account status is " + $req.getAccountStatus() + ", must be ACTIVE");
end

rule "Financing - Amount Exceeds DTI Cap"
    salience 40
    when
        $req : FinancingRequestFact(
            requestedAmount != null,
            monthlyIncome != null,
            requestedAmount.compareTo(monthlyIncome.multiply(maxDtiMultiplier)) > 0
        )
    then
        $req.setEligible(false);
        $req.getReasons().add("Requested amount exceeds maximum financing of " + $req.getMonthlyIncome().multiply(maxDtiMultiplier));
end

rule "Financing - All Checks Passed"
    salience 10
    when
        $req : FinancingRequestFact(eligible == true, reasons != null, reasons.size() == 0)
    then
        $req.getReasons().add("All eligibility criteria met");
end
```

**Pattern**: Initialize at salience 100, validate at 50 (multiple rules can fire and accumulate reasons), summarize at 10.

---

## Example 3: Risk Flag

Pattern matching with score accumulation.

**Parameters**: `highValueThreshold` (DECIMAL), `highRiskRegions` (STRING), `maxFrequency` (INTEGER)

```drools
package com.islamic.policyengine.rules;

import com.islamic.policyengine.model.fact.RiskAssessmentFact;
import java.math.BigDecimal;
import java.util.Arrays;

global java.math.BigDecimal highValueThreshold;
global String highRiskRegions;
global Integer maxFrequency;

rule "Risk - High Value Transaction"
    salience 100
    when
        $ra : RiskAssessmentFact(
            transactionAmount != null,
            transactionAmount.compareTo(highValueThreshold) > 0
        )
    then
        $ra.setRiskScore($ra.getRiskScore() + 25);
        $ra.getFlags().add("High-value transaction: amount exceeds " + highValueThreshold);
        $ra.setFlagged(true);
end

rule "Risk - High Risk Region"
    salience 90
    when
        $ra : RiskAssessmentFact(destinationRegion != null)
        eval(Arrays.asList(highRiskRegions.split(",")).contains($ra.getDestinationRegion()))
    then
        $ra.setRiskScore($ra.getRiskScore() + 25);
        $ra.getFlags().add("High-risk destination region: " + $ra.getDestinationRegion());
        $ra.setFlagged(true);
end

rule "Risk - High Frequency New Beneficiary"
    salience 80
    when
        $ra : RiskAssessmentFact(
            transactionFrequency != null,
            transactionFrequency > maxFrequency,
            isNewBeneficiary != null,
            isNewBeneficiary == true
        )
    then
        $ra.setRiskScore($ra.getRiskScore() + 25);
        $ra.getFlags().add("High frequency (" + $ra.getTransactionFrequency() + " txns/hr) with new beneficiary");
        $ra.setFlagged(true);
end
```

**Pattern**: Each rule adds 25 to the risk score independently. Multiple rules can fire, accumulating a total score and building a list of flags.

---

## Common Patterns

### BigDecimal Comparisons

Never use `>`, `<`, `==` with `BigDecimal`. Use `compareTo`:

```drools
// Correct
amount.compareTo(threshold) > 0    // amount > threshold
amount.compareTo(threshold) < 0    // amount < threshold
amount.compareTo(threshold) == 0   // amount == threshold

// Wrong - won't work as expected
amount > threshold
```

### List Manipulation

Initialize a list, then add to it across multiple rules:

```drools
// In initialization rule (high salience)
$req.setReasons(new ArrayList<>());

// In validation rules (lower salience)
$req.getReasons().add("Some failure reason");
```

### String Splitting for Comma-Separated Globals

```drools
eval(Arrays.asList(highRiskRegions.split(",")).contains($ra.getDestinationRegion()))
```

### Conditional BigDecimal Math

```drools
silverDailyLimit.subtract($tx.getDailyCumulativeAmount()).max(java.math.BigDecimal.ZERO)
```

## Common Pitfalls

| Pitfall | Fix |
|---|---|
| Parameter key doesn't match `global` name | Key must be exact match (case-sensitive) |
| Wrong parameter type for global | `DECIMAL` -> `BigDecimal`, `INTEGER` -> `Integer` |
| Missing `end` keyword | Every `rule` block must close with `end` |
| Using property access in `then` block | Use getters: `$tx.getAmount()` not `$tx.amount` |
| Using `>` / `<` with BigDecimal in `when` | Use `.compareTo()` instead |
| Missing import for enum | Add `import com.islamic.policyengine.model.enums.AccountTier;` etc. |
| Null pointer on collections | Initialize lists before adding to them (use high-salience init rule) |
