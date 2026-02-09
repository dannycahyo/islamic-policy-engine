package com.islamic.policyengine.controller;

import com.islamic.policyengine.model.dto.AuditLogDto;
import com.islamic.policyengine.model.entity.AuditLog;
import com.islamic.policyengine.model.enums.PolicyType;
import com.islamic.policyengine.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    public ResponseEntity<Page<AuditLogDto>> getAuditLogs(
            @RequestParam(required = false) PolicyType policyType,
            @RequestParam(required = false) UUID ruleId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        Page<AuditLog> auditLogs;

        if (policyType != null) {
            auditLogs = auditLogRepository.findByPolicyType(policyType, pageable);
        } else if (ruleId != null) {
            auditLogs = auditLogRepository.findByRuleId(ruleId, pageable);
        } else if (dateFrom != null && dateTo != null) {
            auditLogs = auditLogRepository.findByCreatedAtBetween(dateFrom, dateTo, pageable);
        } else {
            auditLogs = auditLogRepository.findAll(pageable);
        }

        return ResponseEntity.ok(auditLogs.map(this::toDto));
    }

    private AuditLogDto toDto(AuditLog auditLog) {
        return AuditLogDto.builder()
                .id(auditLog.getId())
                .policyType(auditLog.getPolicyType())
                .ruleId(auditLog.getRule() != null ? auditLog.getRule().getId() : null)
                .ruleVersion(auditLog.getRuleVersion())
                .inputData(auditLog.getInputData())
                .outputData(auditLog.getOutputData())
                .evaluationMs(Long.valueOf(auditLog.getEvaluationMs()))
                .callerId(auditLog.getCallerId())
                .createdAt(auditLog.getCreatedAt())
                .build();
    }
}
