package com.islamic.policyengine.model.fact;

import com.islamic.policyengine.model.annotation.InputField;
import com.islamic.policyengine.model.annotation.ResultField;
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
public class RiskAssessmentFact {

    @InputField
    private BigDecimal transactionAmount;
    @InputField
    private String destinationRegion;
    @InputField
    private Integer transactionFrequency;
    @InputField
    private Boolean isNewBeneficiary;

    @ResultField
    private Boolean flagged;
    @ResultField
    private Integer riskScore;
    @ResultField
    @Builder.Default
    private List<String> flags = new ArrayList<>();
}
