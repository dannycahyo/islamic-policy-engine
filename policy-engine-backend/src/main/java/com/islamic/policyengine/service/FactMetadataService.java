package com.islamic.policyengine.service;

import com.islamic.policyengine.model.annotation.InputField;
import com.islamic.policyengine.model.annotation.ResultField;
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

    // Single registry: fact class name → Java class.
    // To add a new fact, add its class here and annotate fields with @InputField / @ResultField.
    private static final Map<String, Class<?>> FACT_CLASSES = new LinkedHashMap<>();

    static {
        FACT_CLASSES.put("TransactionFact", TransactionFact.class);
        FACT_CLASSES.put("FinancingRequestFact", FinancingRequestFact.class);
        FACT_CLASSES.put("RiskAssessmentFact", RiskAssessmentFact.class);
    }

    private static final Map<String, String> POLICY_TYPE_TO_FACT = Map.of(
            "TRANSACTION_LIMIT", "TransactionFact",
            "FINANCING_ELIGIBILITY", "FinancingRequestFact",
            "RISK_FLAG", "RiskAssessmentFact"
    );

    public FactMetadataDTO getMetadata() {
        Map<String, FactDefinition> facts = new LinkedHashMap<>();

        for (Map.Entry<String, Class<?>> entry : FACT_CLASSES.entrySet()) {
            String factName = entry.getKey();
            Class<?> clazz = entry.getValue();

            Map<String, FieldDefinition> inputFields = new LinkedHashMap<>();
            Map<String, FieldDefinition> resultFields = new LinkedHashMap<>();

            for (Field field : clazz.getDeclaredFields()) {
                FieldDefinition fieldDef = buildFieldDefinition(field);

                if (field.isAnnotationPresent(InputField.class)) {
                    inputFields.put(field.getName(), fieldDef);
                } else if (field.isAnnotationPresent(ResultField.class)) {
                    resultFields.put(field.getName(), fieldDef);
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

    /**
     * Returns the Java Class for a given fact type name (e.g. "TransactionFact").
     */
    public Class<?> getFactClass(String factTypeName) {
        return FACT_CLASSES.get(factTypeName);
    }

    /**
     * Returns the default fact type name for a given policy type string.
     */
    public String getDefaultFactForPolicyType(String policyType) {
        return POLICY_TYPE_TO_FACT.getOrDefault(policyType, null);
    }

    /**
     * Returns the fact class for a given PolicyType enum.
     */
    public Class<?> getFactClassForPolicyType(PolicyType policyType) {
        String factName = POLICY_TYPE_TO_FACT.get(policyType.name());
        return factName != null ? FACT_CLASSES.get(factName) : null;
    }

    public String getFactPackage() {
        return FACT_PACKAGE;
    }

    /**
     * Returns all registered fact classes (for enum scanning, etc.).
     */
    public Collection<Class<?>> getAllFactClasses() {
        return FACT_CLASSES.values();
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

    static String mapJavaType(Class<?> type) {
        if (type == BigDecimal.class) return "BIG_DECIMAL";
        if (type == Integer.class || type == int.class) return "INTEGER";
        if (type == String.class) return "STRING";
        if (type == Boolean.class || type == boolean.class) return "BOOLEAN";
        if (type.isEnum()) return "ENUM";
        if (List.class.isAssignableFrom(type)) return "LIST_STRING";
        return "STRING";
    }
}
