package com.islamic.policyengine.model.fact;

import com.islamic.policyengine.model.enums.AccountTier;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionFact {

    // Input fields
    private AccountTier accountTier;
    private BigDecimal transactionAmount;
    private BigDecimal dailyCumulativeAmount;

    // Result fields
    private Boolean allowed;
    private String reason;
    private BigDecimal remainingLimit;
}
