package com.islamic.policyengine.model.fact;

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

    // Input fields
    private BigDecimal transactionAmount;
    private String destinationRegion;
    private Integer transactionFrequency;
    private Boolean isNewBeneficiary;

    // Result fields
    private Boolean flagged;
    private Integer riskScore;
    @Builder.Default
    private List<String> flags = new ArrayList<>();
}
