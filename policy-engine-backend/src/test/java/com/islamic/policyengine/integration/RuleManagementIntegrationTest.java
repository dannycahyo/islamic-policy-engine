package com.islamic.policyengine.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.islamic.policyengine.model.dto.EvaluationRequest;
import com.islamic.policyengine.model.dto.ParameterDto;
import com.islamic.policyengine.model.dto.RuleDto;
import com.islamic.policyengine.model.entity.Rule;
import com.islamic.policyengine.model.enums.PolicyType;
import com.islamic.policyengine.repository.RuleRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Testcontainers
class RuleManagementIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("policy_engine_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private RuleRepository ruleRepository;

    @Test
    void listRules_shouldReturnSeededRules() throws Exception {
        mockMvc.perform(get("/api/v1/rules")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").value(3));
    }

    @Test
    void getRuleById_shouldReturnRule() throws Exception {
        List<Rule> rules = ruleRepository.findByPolicyType(PolicyType.TRANSACTION_LIMIT);
        assertThat(rules).isNotEmpty();
        UUID ruleId = rules.get(0).getId();

        mockMvc.perform(get("/api/v1/rules/" + ruleId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Transaction Limit - Standard"))
                .andExpect(jsonPath("$.policyType").value("TRANSACTION_LIMIT"));
    }

    @Test
    void updateRule_shouldIncrementVersionAndEvictCache() throws Exception {
        List<Rule> rules = ruleRepository.findByPolicyType(PolicyType.TRANSACTION_LIMIT);
        UUID ruleId = rules.get(0).getId();
        int originalVersion = rules.get(0).getVersion();

        RuleDto updateDto = RuleDto.builder()
                .name("Transaction Limit - Standard")
                .parameters(List.of(
                        ParameterDto.builder()
                                .key("silverDailyLimit")
                                .value("15000000")
                                .type("DECIMAL")
                                .description("Updated SILVER daily limit")
                                .build(),
                        ParameterDto.builder()
                                .key("goldDailyLimit")
                                .value("50000000")
                                .type("DECIMAL")
                                .build(),
                        ParameterDto.builder()
                                .key("platinumDailyLimit")
                                .value("200000000")
                                .type("DECIMAL")
                                .build()
                ))
                .build();

        mockMvc.perform(put("/api/v1/rules/" + ruleId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.version").value(originalVersion + 1));

        // Now evaluate with the updated limit
        EvaluationRequest request = EvaluationRequest.builder()
                .data(Map.of(
                        "accountTier", "SILVER",
                        "transactionAmount", 12000000,
                        "dailyCumulativeAmount", 0
                ))
                .build();

        mockMvc.perform(post("/api/v1/policies/TRANSACTION_LIMIT/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.allowed").value(true));
    }

    @Test
    void toggleRuleStatus_shouldUpdateFlag() throws Exception {
        List<Rule> rules = ruleRepository.findByPolicyType(PolicyType.TRANSACTION_LIMIT);
        UUID ruleId = rules.get(0).getId();

        // Deactivate
        mockMvc.perform(patch("/api/v1/rules/" + ruleId + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isActive\": false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(false));

        // Reactivate
        mockMvc.perform(patch("/api/v1/rules/" + ruleId + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"isActive\": true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isActive").value(true));
    }

    @Test
    void testRuleEndpoint_shouldReturnResultWithoutAudit() throws Exception {
        List<Rule> rules = ruleRepository.findByPolicyType(PolicyType.RISK_FLAG);
        UUID ruleId = rules.get(0).getId();

        long auditCountBefore = ruleRepository.count(); // just a baseline

        EvaluationRequest request = EvaluationRequest.builder()
                .data(Map.of(
                        "transactionAmount", 150000000,
                        "destinationRegion", "INDONESIA",
                        "transactionFrequency", 3,
                        "isNewBeneficiary", false
                ))
                .build();

        mockMvc.perform(post("/api/v1/rules/" + ruleId + "/test")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.flagged").value(true))
                .andExpect(jsonPath("$.result.riskScore").value(25));
    }

    @Test
    void getRuleNotFound_shouldReturn404() throws Exception {
        mockMvc.perform(get("/api/v1/rules/" + UUID.randomUUID()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("POLICY_NOT_FOUND"));
    }
}
