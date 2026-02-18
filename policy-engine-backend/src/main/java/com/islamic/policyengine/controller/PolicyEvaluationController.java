package com.islamic.policyengine.controller;

import com.islamic.policyengine.model.dto.EvaluationRequest;
import com.islamic.policyengine.model.dto.EvaluationResponse;
import com.islamic.policyengine.model.dto.PolicySchemaDTO;
import com.islamic.policyengine.service.PolicyEvaluationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/policies")
@RequiredArgsConstructor
public class PolicyEvaluationController {

    private final PolicyEvaluationService policyEvaluationService;

    @PostMapping("/{policyType}/evaluate")
    public ResponseEntity<EvaluationResponse> evaluate(
            @PathVariable String policyType,
            @RequestBody EvaluationRequest request) {
        EvaluationResponse response = policyEvaluationService.evaluate(policyType, request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{policyType}/schema")
    public ResponseEntity<PolicySchemaDTO> getSchema(@PathVariable String policyType) {
        PolicySchemaDTO schema = policyEvaluationService.getSchema(policyType);
        return ResponseEntity.ok(schema);
    }
}
