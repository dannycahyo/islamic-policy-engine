package com.islamic.policyengine.model.dto;

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
    private String description;
    private String policyType;
    private String drlSource;
    private Boolean isActive;
    private Integer version;
    private String factTypeName;
    private List<ParameterDto> parameters;
    private List<RuleFieldDTO> fields;
    private LocalDateTime updatedAt;
}
