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
    private List<ParameterInfo> parameters;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ParameterInfo {
        private String key;
        private String type; // STRING, INTEGER, DOUBLE/DECIMAL, BOOLEAN
    }
}
