package com.islamic.policyengine.service;

import com.islamic.policyengine.model.dto.FactMetadataDTO;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Simplified metadata service. No longer uses reflection or static fact class registration.
 * Returns only operator mappings and supported field types.
 * Field metadata for a specific rule comes from the rule's own field definitions.
 */
@Service
public class FactMetadataService {

    private static final Map<String, List<String>> OPERATORS = Map.of(
            "BIG_DECIMAL", List.of("==", "!=", ">", "<", ">=", "<="),
            "INTEGER", List.of("==", "!=", ">", "<", ">=", "<="),
            "STRING", List.of("==", "!="),
            "BOOLEAN", List.of("=="),
            "ENUM", List.of("==", "!=")
    );

    private static final List<String> SUPPORTED_FIELD_TYPES = List.of(
            "STRING", "INTEGER", "BIG_DECIMAL", "BOOLEAN", "ENUM", "LIST_STRING"
    );

    public FactMetadataDTO getMetadata() {
        return FactMetadataDTO.builder()
                .operators(OPERATORS)
                .fieldTypes(SUPPORTED_FIELD_TYPES)
                .build();
    }
}
