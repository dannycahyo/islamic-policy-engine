package com.islamic.policyengine.service;

import com.islamic.policyengine.exception.PolicyNotFoundException;
import com.islamic.policyengine.model.dto.EvaluationRequest;
import com.islamic.policyengine.model.dto.EvaluationResponse;
import com.islamic.policyengine.model.dto.PolicySchemaDTO;
import com.islamic.policyengine.model.dto.RuleFieldDTO;
import com.islamic.policyengine.model.entity.Rule;
import com.islamic.policyengine.model.entity.RuleField;
import com.islamic.policyengine.model.entity.RuleParameter;
import com.islamic.policyengine.repository.RuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.kie.api.KieBase;
import org.kie.api.definition.type.FactType;
import org.kie.api.runtime.KieSession;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PolicyEvaluationService {

    private static final long EVALUATION_TIMEOUT_MS = 5000;
    private static final String RULES_PACKAGE = "com.islamic.policyengine.rules";

    private final DroolsEngineService droolsEngineService;
    private final RuleRepository ruleRepository;
    private final AuditService auditService;

    private final ExecutorService ruleExecutor = Executors.newCachedThreadPool();

    public EvaluationResponse evaluate(String policyType, EvaluationRequest request) {
        List<Rule> rules = ruleRepository.findByPolicyTypeAndIsActiveTrue(policyType);
        if (rules.isEmpty()) {
            throw new PolicyNotFoundException("No active rule found for policy type: " + policyType);
        }
        Rule rule = rules.get(0);

        return evaluateWithRule(rule, request, true);
    }

    public EvaluationResponse evaluateRuleById(UUID ruleId, EvaluationRequest request) {
        Rule rule = ruleRepository.findWithParametersById(ruleId)
                .orElseThrow(() -> new PolicyNotFoundException("Rule not found with id: " + ruleId));
        return evaluateWithRule(rule, request, true);
    }

    public EvaluationResponse testRuleById(UUID ruleId, EvaluationRequest request) {
        Rule rule = ruleRepository.findWithParametersById(ruleId)
                .orElseThrow(() -> new PolicyNotFoundException("Rule not found with id: " + ruleId));
        return evaluateWithRule(rule, request, false);
    }

    public EvaluationResponse evaluateWithRule(Rule rule, EvaluationRequest request, boolean writeAudit) {
        KieBase kieBase = droolsEngineService.compileRule(rule);
        KieSession session = kieBase.newKieSession();

        try {
            // Set globals for backward compatibility with old rules that use parameters
            setGlobals(session, rule.getParameters());

            String factTypeName = rule.getFactTypeName();
            Map<String, Object> data = request.getData();
            Object fact;

            // Determine if this rule uses dynamic declared types or legacy Java fact classes
            FactType declaredFactType = (factTypeName != null)
                    ? kieBase.getFactType(RULES_PACKAGE, factTypeName)
                    : null;

            List<RuleField> resultFieldDefs;

            if (declaredFactType != null) {
                // Dynamic evaluation using Drools declared types
                fact = declaredFactType.newInstance();

                // Set input field values
                for (RuleField field : rule.getFields()) {
                    if ("INPUT".equals(field.getFieldCategory())) {
                        Object rawValue = data.get(field.getFieldName());
                        if (rawValue != null) {
                            Object converted = convertForFieldType(rawValue, field.getFieldType());
                            declaredFactType.set(fact, field.getFieldName(), converted);
                        }
                    }
                }

                resultFieldDefs = rule.getFields().stream()
                        .filter(f -> "RESULT".equals(f.getFieldCategory()))
                        .collect(java.util.stream.Collectors.toList());
            } else {
                // Legacy evaluation path: use FactMetadataService reflection (backward compat)
                throw new RuntimeException("Rule '" + rule.getName() + "' has no factTypeName and no declared type. "
                        + "Legacy Java fact class evaluation is no longer supported for rules without field definitions.");
            }

            session.insert(fact);

            long start = System.nanoTime();

            // Fire rules with timeout to prevent infinite loops (TRD §11)
            Future<?> future = ruleExecutor.submit(() -> session.fireAllRules());
            try {
                future.get(EVALUATION_TIMEOUT_MS, TimeUnit.MILLISECONDS);
            } catch (TimeoutException e) {
                future.cancel(true);
                session.halt();
                throw new ResponseStatusException(HttpStatus.GATEWAY_TIMEOUT,
                        "Rule evaluation timed out after " + EVALUATION_TIMEOUT_MS + "ms");
            } catch (ExecutionException e) {
                throw new RuntimeException("Rule evaluation failed", e.getCause());
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Rule evaluation interrupted", e);
            }

            long durationMs = (System.nanoTime() - start) / 1_000_000;

            // Extract result fields
            Map<String, Object> result = new HashMap<>();
            for (RuleField field : resultFieldDefs) {
                Object value = declaredFactType.get(fact, field.getFieldName());
                result.put(field.getFieldName(), value);
            }

            EvaluationResponse response = EvaluationResponse.builder()
                    .policyType(rule.getPolicyType())
                    .ruleId(rule.getId())
                    .ruleVersion(rule.getVersion())
                    .result(result)
                    .evaluationMs(durationMs)
                    .timestamp(LocalDateTime.now())
                    .build();

            if (writeAudit) {
                auditService.log(rule.getPolicyType(), rule, request, response, durationMs);
            }

            return response;
        } catch (InstantiationException | IllegalAccessException e) {
            throw new RuntimeException("Failed to create declared fact instance for rule: " + rule.getName(), e);
        } finally {
            session.dispose();
        }
    }

    private void setGlobals(KieSession session, Collection<RuleParameter> parameters) {
        for (RuleParameter param : parameters) {
            Object value = castParameterValue(param);
            try {
                session.setGlobal(param.getParamKey(), value);
            } catch (RuntimeException e) {
                log.debug("Could not set global '{}': {}", param.getParamKey(), e.getMessage());
            }
        }
    }

    private Object castParameterValue(RuleParameter param) {
        String type = param.getParamType().toUpperCase();
        String value = param.getParamValue();

        switch (type) {
            case "DECIMAL":
                return new BigDecimal(value);
            case "INTEGER":
                return Integer.parseInt(value);
            case "STRING":
                return value;
            case "BOOLEAN":
                return Boolean.parseBoolean(value);
            default:
                return value;
        }
    }

    private Object convertForFieldType(Object rawValue, String fieldType) {
        if (rawValue == null) return null;
        String strValue = String.valueOf(rawValue);

        switch (fieldType) {
            case "BIG_DECIMAL":
                return new BigDecimal(strValue);
            case "INTEGER":
                if (rawValue instanceof Integer) return rawValue;
                if (rawValue instanceof Number) return ((Number) rawValue).intValue();
                return Integer.parseInt(strValue);
            case "BOOLEAN":
                if (rawValue instanceof Boolean) return rawValue;
                return Boolean.parseBoolean(strValue);
            case "STRING":
            case "ENUM":
                return strValue;
            case "LIST_STRING":
                if (rawValue instanceof List) return rawValue;
                return new ArrayList<>(Arrays.asList(strValue.split(",")));
            default:
                return strValue;
        }
    }

    public PolicySchemaDTO getSchema(String policyType) {
        List<Rule> rules = ruleRepository.findByPolicyTypeAndIsActiveTrue(policyType);
        if (rules.isEmpty()) {
            throw new PolicyNotFoundException("No active rule found for policy type: " + policyType);
        }
        Rule rule = rules.get(0);
        return buildSchema(rule);
    }

    public PolicySchemaDTO getSchemaByRuleId(UUID ruleId) {
        Rule rule = ruleRepository.findWithParametersById(ruleId)
                .orElseThrow(() -> new PolicyNotFoundException("Rule not found with id: " + ruleId));
        return buildSchema(rule);
    }

    private PolicySchemaDTO buildSchema(Rule rule) {
        List<RuleFieldDTO> inputFields = rule.getFields().stream()
                .filter(f -> "INPUT".equals(f.getFieldCategory()))
                .map(this::toFieldDto)
                .collect(java.util.stream.Collectors.toList());

        List<RuleFieldDTO> resultFields = rule.getFields().stream()
                .filter(f -> "RESULT".equals(f.getFieldCategory()))
                .map(this::toFieldDto)
                .collect(java.util.stream.Collectors.toList());

        return PolicySchemaDTO.builder()
                .policyType(rule.getPolicyType())
                .factTypeName(rule.getFactTypeName())
                .ruleName(rule.getName())
                .ruleVersion(rule.getVersion())
                .inputFields(inputFields)
                .resultFields(resultFields)
                .build();
    }

    private RuleFieldDTO toFieldDto(RuleField field) {
        return RuleFieldDTO.builder()
                .fieldName(field.getFieldName())
                .fieldType(field.getFieldType())
                .fieldCategory(field.getFieldCategory())
                .enumValues(field.getEnumValues() != null
                        ? Arrays.asList(field.getEnumValues().split(",")) : null)
                .fieldOrder(field.getFieldOrder())
                .build();
    }
}
