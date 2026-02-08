package com.islamic.policyengine.model.entity;

import com.islamic.policyengine.model.enums.PolicyType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "policy_audit_log")
public class AuditLog {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(name = "policy_type", nullable = false, length = 50)
    private PolicyType policyType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id")
    private Rule rule;

    @Column(name = "rule_version")
    private Integer ruleVersion;

    @Column(name = "input_data", nullable = false, columnDefinition = "jsonb")
    private String inputData;

    @Column(name = "output_data", nullable = false, columnDefinition = "jsonb")
    private String outputData;

    @Column(name = "evaluation_ms", nullable = false)
    private Integer evaluationMs;

    @Column(name = "caller_id", length = 100)
    private String callerId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
