package com.islamic.policyengine.model.fact;

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

    // Input fields
    private Integer age;
    private BigDecimal monthlyIncome;
    private AccountStatus accountStatus;
    private BigDecimal requestedAmount;

    // Result fields
    private Boolean eligible;
    @Builder.Default
    private List<String> reasons = new ArrayList<>();
    private BigDecimal maxFinancingAmount;
}
