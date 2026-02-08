package com.islamic.policyengine.model.dto;

import com.islamic.policyengine.model.enums.PolicyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RuleDto {

    private UUID id;
    private String name;
    private PolicyType policyType;
    private Boolean isActive;
    private Integer version;
    private List<ParameterDto> parameters;
    private LocalDateTime updatedAt;
}
