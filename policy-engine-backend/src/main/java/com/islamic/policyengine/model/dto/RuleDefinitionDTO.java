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
public class RuleDefinitionDTO {

    private String ruleName;
    private String policyType;
    private String factType;
    private List<ConditionDTO> conditions;
    private List<ActionDTO> actions;
    private List<RuleFieldDTO> inputFields;
    private List<RuleFieldDTO> resultFields;
}
