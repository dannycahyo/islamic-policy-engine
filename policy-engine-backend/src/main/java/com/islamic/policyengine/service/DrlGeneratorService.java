package com.islamic.policyengine.service;

import com.islamic.policyengine.model.dto.ActionDTO;
import com.islamic.policyengine.model.dto.ConditionDTO;
import com.islamic.policyengine.model.dto.FactMetadataDTO;
import com.islamic.policyengine.model.dto.RuleDefinitionDTO;
import com.islamic.policyengine.model.fact.FinancingRequestFact;
import com.islamic.policyengine.model.fact.RiskAssessmentFact;
import com.islamic.policyengine.model.fact.TransactionFact;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.lang.reflect.Field;
import java.util.*;

@Service
@RequiredArgsConstructor
public class DrlGeneratorService {

    private static final String ENUMS_PACKAGE = "com.islamic.policyengine.model.enums";

    private final FactMetadataService factMetadataService;

    // Derive enum field → enum class name mapping from fact classes via reflection
    private static final Map<String, String> ENUM_FIELD_TO_CLASS = buildEnumFieldMap();

    private static Map<String, String> buildEnumFieldMap() {
        Map<String, String> map = new HashMap<>();
        for (Class<?> factClass : List.of(
                TransactionFact.class, FinancingRequestFact.class, RiskAssessmentFact.class)) {
            for (Field field : factClass.getDeclaredFields()) {
                if (field.getType().isEnum()) {
                    map.put(field.getName(), field.getType().getSimpleName());
                }
            }
        }
        return Collections.unmodifiableMap(map);
    }

    public String generateDrl(RuleDefinitionDTO definition) {
        StringBuilder drl = new StringBuilder();
        String factType = definition.getFactType();
        String factPackage = factMetadataService.getFactPackage();

        // Package declaration
        drl.append("package com.islamic.policyengine.rules;\n\n");

        // Collect required imports
        Set<String> imports = new LinkedHashSet<>();
        imports.add(factPackage + "." + factType);

        boolean needsBigDecimal = false;
        Set<String> enumImports = new LinkedHashSet<>();

        // Check conditions for import needs
        if (definition.getConditions() != null) {
            for (ConditionDTO condition : definition.getConditions()) {
                if ("BIG_DECIMAL".equals(condition.getValueType())) {
                    needsBigDecimal = true;
                }
                if ("ENUM".equals(condition.getValueType())) {
                    String enumClass = ENUM_FIELD_TO_CLASS.get(condition.getField());
                    if (enumClass != null) {
                        enumImports.add(ENUMS_PACKAGE + "." + enumClass);
                    }
                }
            }
        }

        // Check actions for import needs
        if (definition.getActions() != null) {
            for (ActionDTO action : definition.getActions()) {
                if ("BIG_DECIMAL".equals(action.getValueType())) {
                    needsBigDecimal = true;
                }
            }
        }

        // Write imports
        for (String imp : imports) {
            drl.append("import ").append(imp).append(";\n");
        }
        for (String imp : enumImports) {
            drl.append("import ").append(imp).append(";\n");
        }
        if (needsBigDecimal) {
            drl.append("import java.math.BigDecimal;\n");
        }

        drl.append("\n");

        // Rule declaration
        drl.append("rule \"").append(escapeString(definition.getRuleName())).append("\"\n");

        // When block
        drl.append("    when\n");
        drl.append("        $fact : ").append(factType).append("(\n");

        if (definition.getConditions() != null && !definition.getConditions().isEmpty()) {
            List<ConditionDTO> conditions = definition.getConditions();
            for (int i = 0; i < conditions.size(); i++) {
                ConditionDTO cond = conditions.get(i);
                drl.append("            ");
                drl.append(cond.getField());
                drl.append(" ").append(cond.getOperator()).append(" ");
                drl.append(formatValue(cond.getValue(), cond.getValueType(), cond.getField()));
                if (i < conditions.size() - 1) {
                    drl.append(",");
                }
                drl.append("\n");
            }
        }

        drl.append("        )\n");

        // Then block
        drl.append("    then\n");

        if (definition.getActions() != null) {
            FactMetadataDTO metadata = factMetadataService.getMetadata();
            FactMetadataDTO.FactDefinition factDef = metadata.getFacts().get(factType);

            for (ActionDTO action : definition.getActions()) {
                String setterName = "set" + capitalize(action.getField());
                String formattedValue = formatValue(action.getValue(), action.getValueType(), action.getField());

                // For LIST_STRING result fields, use .add() pattern
                if (factDef != null && factDef.getResultFields().containsKey(action.getField())) {
                    String fieldType = factDef.getResultFields().get(action.getField()).getType();
                    if ("LIST_STRING".equals(fieldType)) {
                        drl.append("        $fact.get")
                                .append(capitalize(action.getField()))
                                .append("().add(\"")
                                .append(escapeString(action.getValue()))
                                .append("\");\n");
                        continue;
                    }
                }

                drl.append("        $fact.").append(setterName)
                        .append("(").append(formattedValue).append(");\n");
            }
        }

        drl.append("end\n");

        return drl.toString();
    }

    private String formatValue(String value, String valueType, String field) {
        if (value == null) return "null";

        switch (valueType) {
            case "BIG_DECIMAL":
                return "new BigDecimal(\"" + value + "\")";
            case "ENUM":
                String enumClass = ENUM_FIELD_TO_CLASS.get(field);
                if (enumClass != null) {
                    return enumClass + "." + value;
                }
                return value;
            case "STRING":
                return "\"" + escapeString(value) + "\"";
            case "BOOLEAN":
                return value.toLowerCase();
            case "INTEGER":
                return value;
            default:
                return "\"" + escapeString(value) + "\"";
        }
    }

    private String capitalize(String str) {
        if (str == null || str.isEmpty()) return str;
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }

    private String escapeString(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
