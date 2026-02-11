package com.islamic.policyengine.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.islamic.policyengine.model.dto.EvaluationRequest;
import com.islamic.policyengine.model.dto.EvaluationResponse;
import com.islamic.policyengine.model.entity.AuditLog;
import com.islamic.policyengine.model.entity.Rule;
import com.islamic.policyengine.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;

    public void log(String policyType, Rule rule, EvaluationRequest request,
                    EvaluationResponse response, long evaluationMs) {
        try {
            AuditLog auditLog = AuditLog.builder()
                    .policyType(policyType)
                    .rule(rule)
                    .ruleVersion(rule.getVersion())
                    .inputData(objectMapper.writeValueAsString(request.getData()))
                    .outputData(objectMapper.writeValueAsString(response.getResult()))
                    .evaluationMs((int) evaluationMs)
                    .build();

            auditLogRepository.save(auditLog);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize audit data", e);
        }
    }
}
