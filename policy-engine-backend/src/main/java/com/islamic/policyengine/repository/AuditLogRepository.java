package com.islamic.policyengine.repository;

import com.islamic.policyengine.model.entity.AuditLog;
import com.islamic.policyengine.model.enums.PolicyType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, UUID> {

    Page<AuditLog> findByPolicyType(PolicyType policyType, Pageable pageable);

    Page<AuditLog> findByRuleId(UUID ruleId, Pageable pageable);

    Page<AuditLog> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
}
