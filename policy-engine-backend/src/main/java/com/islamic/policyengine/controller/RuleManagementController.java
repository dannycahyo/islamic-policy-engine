package com.islamic.policyengine.controller;

import com.islamic.policyengine.model.dto.EvaluationRequest;
import com.islamic.policyengine.model.dto.EvaluationResponse;
import com.islamic.policyengine.model.dto.RuleDto;
import com.islamic.policyengine.model.enums.PolicyType;
import com.islamic.policyengine.service.PolicyEvaluationService;
import com.islamic.policyengine.service.RuleManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rules")
@RequiredArgsConstructor
public class RuleManagementController {

    private final RuleManagementService ruleManagementService;
    private final PolicyEvaluationService policyEvaluationService;

    @GetMapping
    public ResponseEntity<Page<RuleDto>> getRules(
            @RequestParam(required = false) PolicyType policyType,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<RuleDto> rules = ruleManagementService.getRules(policyType, isActive, page, size);
        return ResponseEntity.ok(rules);
    }

    @GetMapping("/{id}")
    public ResponseEntity<RuleDto> getRuleById(@PathVariable UUID id) {
        RuleDto rule = ruleManagementService.getRuleById(id);
        return ResponseEntity.ok(rule);
    }

    @PostMapping
    public ResponseEntity<RuleDto> createRule(@RequestBody RuleDto ruleDto) {
        RuleDto created = ruleManagementService.createRule(ruleDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    public ResponseEntity<RuleDto> updateRule(@PathVariable UUID id, @RequestBody RuleDto ruleDto) {
        RuleDto updated = ruleManagementService.updateRule(id, ruleDto);
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<RuleDto> toggleStatus(@PathVariable UUID id,
                                                 @RequestBody Map<String, Boolean> body) {
        Boolean isActive = body.get("isActive");
        if (isActive == null) {
            throw new IllegalArgumentException("'isActive' field is required");
        }
        RuleDto updated = ruleManagementService.toggleStatus(id, isActive);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/test")
    public ResponseEntity<EvaluationResponse> testRule(@PathVariable UUID id,
                                                        @RequestBody EvaluationRequest request) {
        EvaluationResponse response = policyEvaluationService.testRuleById(id, request);
        return ResponseEntity.ok(response);
    }
}
