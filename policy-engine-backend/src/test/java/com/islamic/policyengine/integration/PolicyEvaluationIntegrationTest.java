package com.islamic.policyengine.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.islamic.policyengine.model.dto.EvaluationRequest;
import com.islamic.policyengine.repository.AuditLogRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Testcontainers
class PolicyEvaluationIntegrationTest {

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
    private AuditLogRepository auditLogRepository;

    @Test
    void evaluateTransactionLimit_shouldReturnResultAndCreateAudit() throws Exception {
        long auditCountBefore = auditLogRepository.count();

        EvaluationRequest request = EvaluationRequest.builder()
                .data(Map.of(
                        "accountTier", "SILVER",
                        "transactionAmount", 3000000,
                        "dailyCumulativeAmount", 5000000
                ))
                .build();

        mockMvc.perform(post("/api/v1/policies/TRANSACTION_LIMIT/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.policyType").value("TRANSACTION_LIMIT"))
                .andExpect(jsonPath("$.result.allowed").value(true));

        long auditCountAfter = auditLogRepository.count();
        assertThat(auditCountAfter).isGreaterThan(auditCountBefore);
    }

    @Test
    void evaluateFinancingEligibility_shouldReturnResult() throws Exception {
        EvaluationRequest request = EvaluationRequest.builder()
                .data(Map.of(
                        "age", 30,
                        "monthlyIncome", 10000000,
                        "accountStatus", "ACTIVE",
                        "requestedAmount", 50000000
                ))
                .build();

        mockMvc.perform(post("/api/v1/policies/FINANCING_ELIGIBILITY/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.policyType").value("FINANCING_ELIGIBILITY"))
                .andExpect(jsonPath("$.result.eligible").value(true));
    }

    @Test
    void evaluateRiskFlag_shouldReturnResult() throws Exception {
        EvaluationRequest request = EvaluationRequest.builder()
                .data(Map.of(
                        "transactionAmount", 150000000,
                        "destinationRegion", "IRAN",
                        "transactionFrequency", 3,
                        "isNewBeneficiary", false
                ))
                .build();

        mockMvc.perform(post("/api/v1/policies/RISK_FLAG/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.policyType").value("RISK_FLAG"))
                .andExpect(jsonPath("$.result.flagged").value(true))
                .andExpect(jsonPath("$.result.riskScore").value(50));
    }

    @Test
    void evaluateInvalidPolicyType_shouldReturn400() throws Exception {
        EvaluationRequest request = EvaluationRequest.builder()
                .data(Map.of("test", "data"))
                .build();

        mockMvc.perform(post("/api/v1/policies/INVALID_TYPE/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getAuditLogs_shouldReturnPaginatedResults() throws Exception {
        // First create some audit entries by evaluating
        EvaluationRequest request = EvaluationRequest.builder()
                .data(Map.of(
                        "accountTier", "GOLD",
                        "transactionAmount", 20000000,
                        "dailyCumulativeAmount", 10000000
                ))
                .build();

        mockMvc.perform(post("/api/v1/policies/TRANSACTION_LIMIT/evaluate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/audit")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
}
