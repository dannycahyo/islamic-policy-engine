package com.islamic.policyengine.service;

import com.islamic.policyengine.model.dto.FactMetadataDTO;
import com.islamic.policyengine.model.dto.FactMetadataDTO.FactDefinition;
import com.islamic.policyengine.model.dto.FactMetadataDTO.FieldDefinition;
import com.islamic.policyengine.model.enums.PolicyType;
import com.islamic.policyengine.model.fact.FinancingRequestFact;
import com.islamic.policyengine.model.fact.RiskAssessmentFact;
import com.islamic.policyengine.model.fact.TransactionFact;
import org.springframework.stereotype.Service;

import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FactMetadataService {

    private static final String FACT_PACKAGE = "com.islamic.policyengine.model.fact";

    private static final Map<String, List<String>> OPERATORS = Map.of(
            "BIG_DECIMAL", List.of("==", "!=", ">", "<", ">=", "<="),
            "INTEGER", List.of("==", "!=", ">", "<", ">=", "<="),
            "STRING", List.of("==", "!="),
            "BOOLEAN", List.of("=="),
            "ENUM", List.of("==", "!=")
    );

    // Registry of fact classes with their input/result field boundaries.
    // To add a new fact, register it here with its input field names.
    private static final Map<String, FactRegistration> FACT_REGISTRY = new LinkedHashMap<>();

    static {
        FACT_REGISTRY.put("TransactionFact", new FactRegistration(
                TransactionFact.class,
                Set.of("accountTier", "transactionAmount", "dailyCumulativeAmount"),
                Set.of("allowed", "reason", "remainingLimit")
        ));
        FACT_REGISTRY.put("FinancingRequestFact", new FactRegistration(
                FinancingRequestFact.class,
                Set.of("age", "monthlyIncome", "accountStatus", "requestedAmount"),
                Set.of("eligible", "reasons", "maxFinancingAmount")
        ));
        FACT_REGISTRY.put("RiskAssessmentFact", new FactRegistration(
                RiskAssessmentFact.class,
                Set.of("transactionAmount", "destinationRegion", "transactionFrequency", "isNewBeneficiary"),
                Set.of("flagged", "riskScore", "flags")
        ));
    }

    private static final Map<String, String> POLICY_TYPE_TO_FACT = Map.of(
            "TRANSACTION_LIMIT", "TransactionFact",
            "FINANCING_ELIGIBILITY", "FinancingRequestFact",
            "RISK_FLAG", "RiskAssessmentFact"
    );

    public FactMetadataDTO getMetadata() {
        Map<String, FactDefinition> facts = new LinkedHashMap<>();

        for (Map.Entry<String, FactRegistration> entry : FACT_REGISTRY.entrySet()) {
            String factName = entry.getKey();
            FactRegistration reg = entry.getValue();
            Class<?> clazz = reg.factClass;

            Map<String, FieldDefinition> inputFields = new LinkedHashMap<>();
            Map<String, FieldDefinition> resultFields = new LinkedHashMap<>();

            for (Field field : clazz.getDeclaredFields()) {
                String fieldName = field.getName();
                FieldDefinition fieldDef = buildFieldDefinition(field);

                if (reg.inputFields.contains(fieldName)) {
                    inputFields.put(fieldName, fieldDef);
                } else if (reg.resultFields.contains(fieldName)) {
                    resultFields.put(fieldName, fieldDef);
                }
            }

            facts.put(factName, FactDefinition.builder()
                    .packageName(FACT_PACKAGE)
                    .inputFields(inputFields)
                    .resultFields(resultFields)
                    .build());
        }

        List<String> policyTypes = Arrays.stream(PolicyType.values())
                .map(Enum::name)
                .collect(Collectors.toList());

        return FactMetadataDTO.builder()
                .facts(facts)
                .operators(OPERATORS)
                .policyTypes(policyTypes)
                .build();
    }

    public String getDefaultFactForPolicyType(String policyType) {
        return POLICY_TYPE_TO_FACT.getOrDefault(policyType, null);
    }

    public String getFactPackage() {
        return FACT_PACKAGE;
    }

    private FieldDefinition buildFieldDefinition(Field field) {
        Class<?> type = field.getType();
        String typeName = mapJavaType(type);
        List<String> enumValues = null;

        if (type.isEnum()) {
            enumValues = Arrays.stream(type.getEnumConstants())
                    .map(Object::toString)
                    .collect(Collectors.toList());
        }

        return FieldDefinition.builder()
                .type(typeName)
                .enumValues(enumValues)
                .build();
    }

    private String mapJavaType(Class<?> type) {
        if (type == BigDecimal.class) return "BIG_DECIMAL";
        if (type == Integer.class || type == int.class) return "INTEGER";
        if (type == String.class) return "STRING";
        if (type == Boolean.class || type == boolean.class) return "BOOLEAN";
        if (type.isEnum()) return "ENUM";
        if (List.class.isAssignableFrom(type)) return "LIST_STRING";
        return "STRING";
    }

    private static class FactRegistration {
        final Class<?> factClass;
        final Set<String> inputFields;
        final Set<String> resultFields;

        FactRegistration(Class<?> factClass, Set<String> inputFields, Set<String> resultFields) {
            this.factClass = factClass;
            this.inputFields = inputFields;
            this.resultFields = resultFields;
        }
    }
}
