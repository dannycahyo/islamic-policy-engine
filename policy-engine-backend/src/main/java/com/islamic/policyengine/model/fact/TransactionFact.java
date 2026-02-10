package com.islamic.policyengine.model.fact;

import com.islamic.policyengine.model.annotation.InputField;
import com.islamic.policyengine.model.annotation.ResultField;
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

    @InputField
    private AccountTier accountTier;
    @InputField
    private BigDecimal transactionAmount;
    @InputField
    private BigDecimal dailyCumulativeAmount;

    @ResultField
    private Boolean allowed;
    @ResultField
    private String reason;
    @ResultField
    private BigDecimal remainingLimit;
}
