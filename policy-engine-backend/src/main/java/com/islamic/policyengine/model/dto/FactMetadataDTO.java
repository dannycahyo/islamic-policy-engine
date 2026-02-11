package com.islamic.policyengine.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FactMetadataDTO {

    private Map<String, FactDefinition> facts;
    private Map<String, List<String>> operators;
    private List<String> policyTypes;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FactDefinition {
        private String packageName;
        private Map<String, FieldDefinition> inputFields;
        private Map<String, FieldDefinition> resultFields;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FieldDefinition {
        private String type;
        private List<String> enumValues;
    }
}
