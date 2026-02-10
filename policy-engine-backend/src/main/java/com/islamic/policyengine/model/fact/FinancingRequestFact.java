package com.islamic.policyengine.model.fact;

import com.islamic.policyengine.model.annotation.InputField;
import com.islamic.policyengine.model.annotation.ResultField;
import com.islamic.policyengine.model.enums.AccountStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancingRequestFact {

    @InputField
    private Integer age;
    @InputField
    private BigDecimal monthlyIncome;
    @InputField
    private AccountStatus accountStatus;
    @InputField
    private BigDecimal requestedAmount;

    @ResultField
    private Boolean eligible;
    @ResultField
    @Builder.Default
    private List<String> reasons = new ArrayList<>();
    @ResultField
    private BigDecimal maxFinancingAmount;
}
