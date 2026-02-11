package com.islamic.policyengine.repository;

import com.islamic.policyengine.model.entity.Rule;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RuleRepository extends JpaRepository<Rule, UUID> {

    @EntityGraph(attributePaths = {"parameters", "fields"})
    List<Rule> findByPolicyTypeAndIsActiveTrue(String policyType);

    List<Rule> findByPolicyType(String policyType);

    Page<Rule> findByPolicyType(String policyType, Pageable pageable);

    List<Rule> findByIsActive(Boolean isActive);

    Page<Rule> findByIsActive(Boolean isActive, Pageable pageable);

    Page<Rule> findByPolicyTypeAndIsActive(String policyType, Boolean isActive, Pageable pageable);

    Optional<Rule> findByName(String name);

    @EntityGraph(attributePaths = {"parameters", "fields"})
    Optional<Rule> findWithParametersById(UUID id);
}
