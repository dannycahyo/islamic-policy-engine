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
import org.kie.api.KieBase;
import org.kie.api.runtime.KieSession;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PolicyEvaluationService {

    private final DroolsEngineService droolsEngineService;
    private final RuleRepository ruleRepository;
    private final AuditService auditService;

    public EvaluationResponse evaluate(PolicyType policyType, EvaluationRequest request) {
        List<Rule> rules = ruleRepository.findByPolicyTypeAndIsActiveTrue(policyType);
        if (rules.isEmpty()) {
            throw new PolicyNotFoundException(policyType);
        }
        Rule rule = rules.get(0);

        return evaluateWithRule(rule, policyType, request, true);
    }

    public EvaluationResponse evaluateWithRule(Rule rule, PolicyType policyType,
                                                EvaluationRequest request, boolean writeAudit) {
        KieBase kieBase = droolsEngineService.compileRule(rule);
        KieSession session = kieBase.newKieSession();

        try {
            // Set globals from rule parameters
            setGlobals(session, rule.getParameters(), policyType);

            // Map request data to fact
            Object fact = mapToFact(policyType, request);
            session.insert(fact);

            long start = System.nanoTime();
            session.fireAllRules();
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
