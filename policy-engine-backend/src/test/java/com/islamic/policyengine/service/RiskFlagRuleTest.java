package com.islamic.policyengine.service;

import com.islamic.policyengine.model.fact.RiskAssessmentFact;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.kie.api.KieBase;
import org.kie.api.io.ResourceType;
import org.kie.api.runtime.KieSession;
import org.kie.internal.utils.KieHelper;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class RiskFlagRuleTest {

    private static final String DRL = """
            package com.islamic.policyengine.rules;

            import com.islamic.policyengine.model.fact.RiskAssessmentFact;
            import java.math.BigDecimal;
            import java.util.Arrays;

            global java.math.BigDecimal highValueThreshold;
            global String highRiskRegions;
            global Integer maxFrequency;

            rule "Risk - High Value Transaction"
                salience 100
                when
                    $ra : RiskAssessmentFact(
                        transactionAmount != null,
                        transactionAmount.compareTo(highValueThreshold) > 0
                    )
                then
                    $ra.setRiskScore($ra.getRiskScore() + 25);
                    $ra.getFlags().add("High-value transaction: amount exceeds " + highValueThreshold);
                    $ra.setFlagged(true);
            end

            rule "Risk - High Risk Region"
                salience 90
                when
                    $ra : RiskAssessmentFact(
                        destinationRegion != null
                    )
                    eval(Arrays.asList(highRiskRegions.split(",")).contains($ra.getDestinationRegion()))
                then
                    $ra.setRiskScore($ra.getRiskScore() + 25);
                    $ra.getFlags().add("High-risk destination region: " + $ra.getDestinationRegion());
                    $ra.setFlagged(true);
            end

            rule "Risk - High Frequency New Beneficiary"
                salience 80
                when
                    $ra : RiskAssessmentFact(
                        transactionFrequency != null,
                        transactionFrequency > maxFrequency,
                        isNewBeneficiary != null,
                        isNewBeneficiary == true
                    )
                then
                    $ra.setRiskScore($ra.getRiskScore() + 25);
                    $ra.getFlags().add("High frequency (" + $ra.getTransactionFrequency() + " txns/hr) with new beneficiary");
                    $ra.setFlagged(true);
            end
            """;

    private KieSession session;

    @BeforeEach
    void setUp() {
        KieHelper kieHelper = new KieHelper();
        kieHelper.addContent(DRL, ResourceType.DRL);
        KieBase kieBase = kieHelper.build();
        session = kieBase.newKieSession();

        session.setGlobal("highValueThreshold", new BigDecimal("100000000"));
        session.setGlobal("highRiskRegions", "IRAN,NORTH_KOREA,SYRIA");
        session.setGlobal("maxFrequency", 10);
    }

    @AfterEach
    void tearDown() {
        if (session != null) {
            session.dispose();
        }
    }

    @Test
    void cleanTransaction_noFlags() {
        RiskAssessmentFact fact = RiskAssessmentFact.builder()
                .transactionAmount(new BigDecimal("50000000"))
                .destinationRegion("INDONESIA")
                .transactionFrequency(3)
                .isNewBeneficiary(false)
                .riskScore(0)
                .flagged(false)
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getFlagged()).isFalse();
        assertThat(fact.getRiskScore()).isEqualTo(0);
        assertThat(fact.getFlags()).isEmpty();
    }

    @Test
    void highValueTransaction_singleFlag() {
        RiskAssessmentFact fact = RiskAssessmentFact.builder()
                .transactionAmount(new BigDecimal("150000000"))
                .destinationRegion("INDONESIA")
                .transactionFrequency(3)
                .isNewBeneficiary(false)
                .riskScore(0)
                .flagged(false)
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getFlagged()).isTrue();
        assertThat(fact.getRiskScore()).isEqualTo(25);
        assertThat(fact.getFlags()).hasSize(1);
        assertThat(fact.getFlags().get(0)).contains("High-value");
    }

    @Test
    void highRiskRegion_singleFlag() {
        RiskAssessmentFact fact = RiskAssessmentFact.builder()
                .transactionAmount(new BigDecimal("50000000"))
                .destinationRegion("IRAN")
                .transactionFrequency(3)
                .isNewBeneficiary(false)
                .riskScore(0)
                .flagged(false)
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getFlagged()).isTrue();
        assertThat(fact.getRiskScore()).isEqualTo(25);
        assertThat(fact.getFlags()).hasSize(1);
        assertThat(fact.getFlags().get(0)).contains("High-risk destination");
    }

    @Test
    void highFrequencyNewBeneficiary_singleFlag() {
        RiskAssessmentFact fact = RiskAssessmentFact.builder()
                .transactionAmount(new BigDecimal("50000000"))
                .destinationRegion("INDONESIA")
                .transactionFrequency(15)
                .isNewBeneficiary(true)
                .riskScore(0)
                .flagged(false)
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getFlagged()).isTrue();
        assertThat(fact.getRiskScore()).isEqualTo(25);
        assertThat(fact.getFlags()).hasSize(1);
        assertThat(fact.getFlags().get(0)).contains("High frequency");
    }

    @Test
    void highFrequencyExistingBeneficiary_noFlag() {
        RiskAssessmentFact fact = RiskAssessmentFact.builder()
                .transactionAmount(new BigDecimal("50000000"))
                .destinationRegion("INDONESIA")
                .transactionFrequency(15)
                .isNewBeneficiary(false)
                .riskScore(0)
                .flagged(false)
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getFlagged()).isFalse();
        assertThat(fact.getRiskScore()).isEqualTo(0);
    }

    @Test
    void allThreeFlags_additiveScore() {
        RiskAssessmentFact fact = RiskAssessmentFact.builder()
                .transactionAmount(new BigDecimal("150000000"))
                .destinationRegion("IRAN")
                .transactionFrequency(15)
                .isNewBeneficiary(true)
                .riskScore(0)
                .flagged(false)
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getFlagged()).isTrue();
        assertThat(fact.getRiskScore()).isEqualTo(75);
        assertThat(fact.getFlags()).hasSize(3);
    }

    @Test
    void twoFlags_highValueAndRegion() {
        RiskAssessmentFact fact = RiskAssessmentFact.builder()
                .transactionAmount(new BigDecimal("150000000"))
                .destinationRegion("NORTH_KOREA")
                .transactionFrequency(3)
                .isNewBeneficiary(false)
                .riskScore(0)
                .flagged(false)
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getFlagged()).isTrue();
        assertThat(fact.getRiskScore()).isEqualTo(50);
        assertThat(fact.getFlags()).hasSize(2);
    }

    @Test
    void boundaryValue_exactThreshold_noFlag() {
        RiskAssessmentFact fact = RiskAssessmentFact.builder()
                .transactionAmount(new BigDecimal("100000000"))
                .destinationRegion("INDONESIA")
                .transactionFrequency(3)
                .isNewBeneficiary(false)
                .riskScore(0)
                .flagged(false)
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getFlagged()).isFalse();
        assertThat(fact.getRiskScore()).isEqualTo(0);
    }

    @Test
    void boundaryFrequency_exactMax_noFlag() {
        RiskAssessmentFact fact = RiskAssessmentFact.builder()
                .transactionAmount(new BigDecimal("50000000"))
                .destinationRegion("INDONESIA")
                .transactionFrequency(10)
                .isNewBeneficiary(true)
                .riskScore(0)
                .flagged(false)
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getFlagged()).isFalse();
        assertThat(fact.getRiskScore()).isEqualTo(0);
    }
}
