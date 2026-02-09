package com.islamic.policyengine.repository;

import com.islamic.policyengine.model.entity.Rule;
import com.islamic.policyengine.model.enums.PolicyType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RuleRepository extends JpaRepository<Rule, UUID> {

    List<Rule> findByPolicyTypeAndIsActiveTrue(PolicyType policyType);

    List<Rule> findByPolicyType(PolicyType policyType);

    Page<Rule> findByPolicyType(PolicyType policyType, Pageable pageable);

    List<Rule> findByIsActive(Boolean isActive);

    Page<Rule> findByIsActive(Boolean isActive, Pageable pageable);

    Page<Rule> findByPolicyTypeAndIsActive(PolicyType policyType, Boolean isActive, Pageable pageable);

    Optional<Rule> findByName(String name);
}
