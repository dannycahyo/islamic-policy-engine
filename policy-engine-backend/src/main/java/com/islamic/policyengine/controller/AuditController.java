package com.islamic.policyengine.controller;

import com.islamic.policyengine.model.dto.AuditLogDto;
import com.islamic.policyengine.model.entity.AuditLog;
import com.islamic.policyengine.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditLogRepository auditLogRepository;

    @GetMapping
    public ResponseEntity<Page<AuditLogDto>> getAuditLogs(
            @RequestParam(required = false) String policyType,
            @RequestParam(required = false) UUID ruleId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());

        Specification<AuditLog> spec = Specification.where(null);

        if (policyType != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("policyType"), policyType));
        }
        if (ruleId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("rule").get("id"), ruleId));
        }
        if (dateFrom != null) {
            spec = spec.and((root, query, cb) ->
                    cb.greaterThanOrEqualTo(root.get("createdAt"), dateFrom.atStartOfDay()));
        }
        if (dateTo != null) {
            spec = spec.and((root, query, cb) ->
                    cb.lessThanOrEqualTo(root.get("createdAt"), dateTo.atTime(LocalTime.MAX)));
        }

        Page<AuditLog> auditLogs = auditLogRepository.findAll(spec, pageable);

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
