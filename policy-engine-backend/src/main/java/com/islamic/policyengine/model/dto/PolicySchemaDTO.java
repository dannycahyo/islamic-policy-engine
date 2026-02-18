package com.islamic.policyengine.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PolicySchemaDTO {

    private String policyType;
    private String factTypeName;
    private String ruleName;
    private int ruleVersion;
    private List<RuleFieldDTO> inputFields;
    private List<RuleFieldDTO> resultFields;
}
