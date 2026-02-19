package com.islamic.policyengine.model.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import javax.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(exclude = "rule")
@ToString(exclude = "rule")
@Entity
@Table(name = "rule_fields",
        uniqueConstraints = @UniqueConstraint(columnNames = {"rule_id", "field_name"}))
public class RuleField {

    @Id
    @GeneratedValue
    @Column(columnDefinition = "uuid")
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rule_id", nullable = false)
    private Rule rule;

    @Column(name = "field_name", nullable = false, length = 100)
    private String fieldName;

    @Column(name = "field_type", nullable = false, length = 30)
    private String fieldType;

    @Column(name = "field_category", nullable = false, length = 10)
    private String fieldCategory;

    @Column(name = "enum_values", columnDefinition = "text")
    private String enumValues;

    @Column(name = "field_order", nullable = false)
    @Builder.Default
    private Integer fieldOrder = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
