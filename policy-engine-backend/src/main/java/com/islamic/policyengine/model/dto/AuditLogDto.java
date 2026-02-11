package com.islamic.policyengine.model.dto;

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
public class AuditLogDto {

    private UUID id;
    private String policyType;
    private UUID ruleId;
    private Integer ruleVersion;
    private String inputData;
    private String outputData;
    private Long evaluationMs;
    private String callerId;
    private LocalDateTime createdAt;
}
