package com.islamic.policyengine.model.dto;

import com.islamic.policyengine.model.enums.PolicyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EvaluationResponse {

    private PolicyType policyType;
    private UUID ruleId;
    private Integer ruleVersion;
    private Object result;
    private Long evaluationMs;
    private LocalDateTime timestamp;
}
