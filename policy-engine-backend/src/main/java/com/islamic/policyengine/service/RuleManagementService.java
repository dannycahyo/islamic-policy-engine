package com.islamic.policyengine.service;

import com.islamic.policyengine.exception.DrlCompilationException;
import com.islamic.policyengine.exception.PolicyNotFoundException;
import com.islamic.policyengine.model.dto.ParameterDto;
import com.islamic.policyengine.model.dto.RuleDto;
import com.islamic.policyengine.model.entity.Rule;
import com.islamic.policyengine.model.entity.RuleParameter;
import com.islamic.policyengine.model.enums.PolicyType;
import com.islamic.policyengine.repository.RuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RuleManagementService {

    private final RuleRepository ruleRepository;
    private final DrlValidationService drlValidationService;
    private final DroolsEngineService droolsEngineService;

    public Page<RuleDto> getRules(PolicyType policyType, Boolean isActive, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("updatedAt").descending());

        Page<Rule> rules;
        if (policyType != null && isActive != null) {
            rules = ruleRepository.findByPolicyTypeAndIsActive(policyType, isActive, pageable);
        } else if (policyType != null) {
            rules = ruleRepository.findByPolicyType(policyType, pageable);
        } else if (isActive != null) {
            rules = ruleRepository.findByIsActive(isActive, pageable);
        } else {
            rules = ruleRepository.findAll(pageable);
        }

        return rules.map(this::toDto);
    }

    public RuleDto getRuleById(UUID id) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new PolicyNotFoundException("Rule not found with id: " + id));
        return toDtoWithDrl(rule);
    }

    @Transactional
    public RuleDto createRule(RuleDto ruleDto) {
        // Validate DRL
        List<String> errors = drlValidationService.validateDrl(ruleDto.getDrlSource());
        if (!errors.isEmpty()) {
            throw new DrlCompilationException("DRL validation failed", errors);
        }

        Rule rule = Rule.builder()
                .name(ruleDto.getName())
                .description(ruleDto.getDescription())
                .policyType(ruleDto.getPolicyType())
                .drlSource(ruleDto.getDrlSource())
                .isActive(ruleDto.getIsActive() != null ? ruleDto.getIsActive() : true)
                .version(1)
                .build();

        if (ruleDto.getParameters() != null) {
            for (ParameterDto paramDto : ruleDto.getParameters()) {
                RuleParameter param = RuleParameter.builder()
                        .rule(rule)
                        .paramKey(paramDto.getKey())
                        .paramValue(paramDto.getValue())
                        .paramType(paramDto.getType())
                        .description(paramDto.getDescription())
                        .build();
                rule.getParameters().add(param);
            }
        }

        Rule saved = ruleRepository.save(rule);
        return toDtoWithDrl(saved);
    }

    @Transactional
    public RuleDto updateRule(UUID id, RuleDto ruleDto) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new PolicyNotFoundException("Rule not found with id: " + id));

        // Validate DRL if provided
        if (ruleDto.getDrlSource() != null) {
            List<String> errors = drlValidationService.validateDrl(ruleDto.getDrlSource());
            if (!errors.isEmpty()) {
                throw new DrlCompilationException("DRL validation failed", errors);
            }
            rule.setDrlSource(ruleDto.getDrlSource());
        }

        int oldVersion = rule.getVersion();

        if (ruleDto.getName() != null) {
            rule.setName(ruleDto.getName());
        }
        if (ruleDto.getDescription() != null) {
            rule.setDescription(ruleDto.getDescription());
        }

        // Update parameters
        if (ruleDto.getParameters() != null) {
            rule.getParameters().clear();
            for (ParameterDto paramDto : ruleDto.getParameters()) {
                RuleParameter param = RuleParameter.builder()
                        .rule(rule)
                        .paramKey(paramDto.getKey())
                        .paramValue(paramDto.getValue())
                        .paramType(paramDto.getType())
                        .description(paramDto.getDescription())
                        .build();
                rule.getParameters().add(param);
            }
        }

        // Increment version
        rule.setVersion(oldVersion + 1);

        // Evict cache for old version
        droolsEngineService.evictCache(id, oldVersion);

        Rule saved = ruleRepository.save(rule);
        return toDtoWithDrl(saved);
    }

    @Transactional
    public RuleDto toggleStatus(UUID id, boolean isActive) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new PolicyNotFoundException("Rule not found with id: " + id));

        rule.setIsActive(isActive);
        Rule saved = ruleRepository.save(rule);
        return toDto(saved);
    }

    private RuleDto toDto(Rule rule) {
        return RuleDto.builder()
                .id(rule.getId())
                .name(rule.getName())
                .policyType(rule.getPolicyType())
                .isActive(rule.getIsActive())
                .version(rule.getVersion())
                .parameters(rule.getParameters().stream()
                        .map(p -> ParameterDto.builder()
                                .key(p.getParamKey())
                                .value(p.getParamValue())
                                .type(p.getParamType())
                                .description(p.getDescription())
                                .build())
                        .collect(Collectors.toList()))
                .updatedAt(rule.getUpdatedAt())
                .build();
    }

    private RuleDto toDtoWithDrl(Rule rule) {
        RuleDto dto = toDto(rule);
        dto.setDrlSource(rule.getDrlSource());
        dto.setDescription(rule.getDescription());
        return dto;
    }
}
