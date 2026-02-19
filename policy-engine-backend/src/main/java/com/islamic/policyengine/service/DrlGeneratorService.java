package com.islamic.policyengine.service;

import com.islamic.policyengine.model.dto.ActionDTO;
import com.islamic.policyengine.model.dto.ConditionDTO;
import com.islamic.policyengine.model.dto.RuleDefinitionDTO;
import com.islamic.policyengine.model.dto.RuleFieldDTO;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class DrlGeneratorService {

    private static final Map<String, String> TYPE_TO_JAVA = Map.of(
            "STRING", "String",
            "INTEGER", "int",
            "BIG_DECIMAL", "java.math.BigDecimal",
            "BOOLEAN", "boolean",
            "ENUM", "String",
            "LIST_STRING", "java.util.List"
    );

    public String generateDrl(RuleDefinitionDTO definition) {
        StringBuilder drl = new StringBuilder();
        String factType = definition.getFactType();

        List<RuleFieldDTO> inputFields = definition.getInputFields() != null
                ? definition.getInputFields() : Collections.emptyList();
        List<RuleFieldDTO> resultFields = definition.getResultFields() != null
                ? definition.getResultFields() : Collections.emptyList();

        // Build a map of field name -> field type for formatting
        Map<String, String> fieldTypeMap = new HashMap<>();
        for (RuleFieldDTO f : inputFields) {
            fieldTypeMap.put(f.getFieldName(), f.getFieldType());
        }
        for (RuleFieldDTO f : resultFields) {
            fieldTypeMap.put(f.getFieldName(), f.getFieldType());
        }

        // Determine needed imports
        boolean needsBigDecimal = false;
        boolean needsList = false;

        for (RuleFieldDTO f : inputFields) {
            if ("BIG_DECIMAL".equals(f.getFieldType())) needsBigDecimal = true;
            if ("LIST_STRING".equals(f.getFieldType())) needsList = true;
        }
        for (RuleFieldDTO f : resultFields) {
            if ("BIG_DECIMAL".equals(f.getFieldType())) needsBigDecimal = true;
            if ("LIST_STRING".equals(f.getFieldType())) needsList = true;
        }

        // Package declaration
        drl.append("package com.islamic.policyengine.rules;\n\n");

        // Imports
        if (needsBigDecimal) {
            drl.append("import java.math.BigDecimal;\n");
        }
        if (needsList) {
            drl.append("import java.util.List;\n");
            drl.append("import java.util.ArrayList;\n");
        }
        if (needsBigDecimal || needsList) {
            drl.append("\n");
        }

        // Declare block
        drl.append("declare ").append(factType).append("\n");
        for (RuleFieldDTO f : inputFields) {
            drl.append("    ").append(f.getFieldName()).append(" : ").append(mapType(f.getFieldType()));
            if ("LIST_STRING".equals(f.getFieldType())) {
                drl.append(" = new java.util.ArrayList()");
            }
            drl.append("\n");
        }
        for (RuleFieldDTO f : resultFields) {
            drl.append("    ").append(f.getFieldName()).append(" : ").append(mapType(f.getFieldType()));
            if ("LIST_STRING".equals(f.getFieldType())) {
                drl.append(" = new java.util.ArrayList()");
            }
            drl.append("\n");
        }
        drl.append("end\n\n");

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
                drl.append(formatValue(cond.getValue(), cond.getValueType()));
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
            for (ActionDTO action : definition.getActions()) {
                String fieldType = fieldTypeMap.getOrDefault(action.getField(), action.getValueType());

                // For LIST_STRING result fields, use .add() pattern
                if ("LIST_STRING".equals(fieldType)) {
                    drl.append("        $fact.get")
                            .append(capitalize(action.getField()))
                            .append("().add(\"")
                            .append(escapeString(action.getValue()))
                            .append("\");\n");
                    continue;
                }

                String setterName = "set" + capitalize(action.getField());
                String formattedValue = formatValue(action.getValue(), action.getValueType());
                drl.append("        $fact.").append(setterName)
                        .append("(").append(formattedValue).append(");\n");
            }
        }

        drl.append("end\n");

        return drl.toString();
    }

    private String mapType(String fieldType) {
        return TYPE_TO_JAVA.getOrDefault(fieldType, "String");
    }

    private String formatValue(String value, String valueType) {
        if (value == null) return "null";

        switch (valueType) {
            case "BIG_DECIMAL":
                return "new BigDecimal(\"" + value + "\")";
            case "ENUM":
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
