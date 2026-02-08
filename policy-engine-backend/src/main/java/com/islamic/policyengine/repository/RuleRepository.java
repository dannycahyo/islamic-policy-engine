package com.islamic.policyengine.repository;

import com.islamic.policyengine.model.entity.Rule;
import com.islamic.policyengine.model.enums.PolicyType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RuleRepository extends JpaRepository<Rule, UUID> {

    List<Rule> findByPolicyTypeAndIsActiveTrue(PolicyType policyType);

    List<Rule> findByPolicyType(PolicyType policyType);

    List<Rule> findByIsActive(Boolean isActive);

    Optional<Rule> findByName(String name);
}
