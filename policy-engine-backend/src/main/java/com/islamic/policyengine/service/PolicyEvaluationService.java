package com.islamic.policyengine.service;

import com.islamic.policyengine.exception.PolicyNotFoundException;
import com.islamic.policyengine.model.dto.EvaluationRequest;
import com.islamic.policyengine.model.dto.EvaluationResponse;
import com.islamic.policyengine.model.entity.Rule;
import com.islamic.policyengine.model.entity.RuleParameter;
import com.islamic.policyengine.model.enums.AccountStatus;
import com.islamic.policyengine.model.enums.AccountTier;
import com.islamic.policyengine.model.enums.PolicyType;
import com.islamic.policyengine.model.fact.FinancingRequestFact;
import com.islamic.policyengine.model.fact.RiskAssessmentFact;
import com.islamic.policyengine.model.fact.TransactionFact;
import com.islamic.policyengine.repository.RuleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.kie.api.KieBase;
import org.kie.api.runtime.KieSession;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class PolicyEvaluationService {

    private static final long EVALUATION_TIMEOUT_MS = 5000;

    private final DroolsEngineService droolsEngineService;
    private final RuleRepository ruleRepository;
    private final AuditService auditService;

    private final ExecutorService ruleExecutor = Executors.newCachedThreadPool();

    public EvaluationResponse evaluate(PolicyType policyType, EvaluationRequest request) {
        List<Rule> rules = ruleRepository.findByPolicyTypeAndIsActiveTrue(policyType);
        if (rules.isEmpty()) {
            throw new PolicyNotFoundException(policyType);
        }
        Rule rule = rules.get(0);

        return evaluateWithRule(rule, policyType, request, true);
    }

    public EvaluationResponse testRuleById(UUID ruleId, EvaluationRequest request) {
        Rule rule = ruleRepository.findWithParametersById(ruleId)
                .orElseThrow(() -> new PolicyNotFoundException("Rule not found with id: " + ruleId));
        return evaluateWithRule(rule, rule.getPolicyType(), request, false);
    }

    public EvaluationResponse evaluateWithRule(Rule rule, PolicyType policyType,
                                                EvaluationRequest request, boolean writeAudit) {
        KieBase kieBase = droolsEngineService.compileRule(rule);
        KieSession session = kieBase.newKieSession();

        try {
            setGlobals(session, rule.getParameters(), policyType);

            Object fact = mapToFact(policyType, request);
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

            Object result = mapToResult(policyType, fact);

            EvaluationResponse response = EvaluationResponse.builder()
                    .policyType(policyType)
                    .ruleId(rule.getId())
                    .ruleVersion(rule.getVersion())
                    .result(result)
                    .evaluationMs(durationMs)
                    .timestamp(LocalDateTime.now())
                    .build();

            if (writeAudit) {
                auditService.log(policyType, rule, request, response, durationMs);
            }

            return response;
        } finally {
            session.dispose();
        }
    }

    private void setGlobals(KieSession session, List<RuleParameter> parameters, PolicyType policyType) {
        for (RuleParameter param : parameters) {
            Object value = castParameterValue(param);
            session.setGlobal(param.getParamKey(), value);
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
            case "LIST":
                return value;
            default:
                return value;
        }
    }

    private Object mapToFact(PolicyType policyType, EvaluationRequest request) {
        Map<String, Object> data = request.getData();

        switch (policyType) {
            case TRANSACTION_LIMIT:
                return TransactionFact.builder()
                        .accountTier(AccountTier.valueOf(String.valueOf(data.get("accountTier"))))
                        .transactionAmount(toBigDecimal(data.get("transactionAmount")))
                        .dailyCumulativeAmount(toBigDecimal(data.get("dailyCumulativeAmount")))
                        .build();

            case FINANCING_ELIGIBILITY:
                return FinancingRequestFact.builder()
                        .age(toInteger(data.get("age")))
                        .monthlyIncome(toBigDecimal(data.get("monthlyIncome")))
                        .accountStatus(AccountStatus.valueOf(String.valueOf(data.get("accountStatus"))))
                        .requestedAmount(toBigDecimal(data.get("requestedAmount")))
                        .build();

            case RISK_FLAG:
                return RiskAssessmentFact.builder()
                        .transactionAmount(toBigDecimal(data.get("transactionAmount")))
                        .destinationRegion(String.valueOf(data.get("destinationRegion")))
                        .transactionFrequency(toInteger(data.get("transactionFrequency")))
                        .isNewBeneficiary(toBoolean(data.get("isNewBeneficiary")))
                        .riskScore(0)
                        .flagged(false)
                        .build();

            default:
                throw new IllegalArgumentException("Unsupported policy type: " + policyType);
        }
    }

    private Object mapToResult(PolicyType policyType, Object fact) {
        Map<String, Object> result = new HashMap<>();

        switch (policyType) {
            case TRANSACTION_LIMIT:
                TransactionFact txFact = (TransactionFact) fact;
                result.put("allowed", txFact.getAllowed());
                result.put("reason", txFact.getReason());
                result.put("remainingLimit", txFact.getRemainingLimit());
                break;

            case FINANCING_ELIGIBILITY:
                FinancingRequestFact frFact = (FinancingRequestFact) fact;
                result.put("eligible", frFact.getEligible());
                result.put("reasons", frFact.getReasons());
                result.put("maxFinancingAmount", frFact.getMaxFinancingAmount());
                break;

            case RISK_FLAG:
                RiskAssessmentFact raFact = (RiskAssessmentFact) fact;
                result.put("flagged", raFact.getFlagged());
                result.put("riskScore", raFact.getRiskScore());
                result.put("flags", raFact.getFlags());
                break;
        }

        return result;
    }

    private BigDecimal toBigDecimal(Object value) {
        if (value == null) return BigDecimal.ZERO;
        return new BigDecimal(String.valueOf(value));
    }

    private Integer toInteger(Object value) {
        if (value == null) return 0;
        if (value instanceof Integer) return (Integer) value;
        return Integer.parseInt(String.valueOf(value));
    }

    private Boolean toBoolean(Object value) {
        if (value == null) return false;
        if (value instanceof Boolean) return (Boolean) value;
        return Boolean.parseBoolean(String.valueOf(value));
    }
}
