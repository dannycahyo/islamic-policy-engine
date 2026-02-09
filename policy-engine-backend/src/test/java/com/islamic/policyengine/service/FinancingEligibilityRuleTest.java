package com.islamic.policyengine.service;

import com.islamic.policyengine.model.enums.AccountStatus;
import com.islamic.policyengine.model.fact.FinancingRequestFact;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.kie.api.KieBase;
import org.kie.api.io.ResourceType;
import org.kie.api.runtime.KieSession;
import org.kie.internal.utils.KieHelper;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class FinancingEligibilityRuleTest {

    private static final String DRL = """
            package com.islamic.policyengine.rules;

            import com.islamic.policyengine.model.fact.FinancingRequestFact;
            import com.islamic.policyengine.model.enums.AccountStatus;
            import java.math.BigDecimal;
            import java.util.ArrayList;

            global Integer minAge;
            global Integer maxAge;
            global java.math.BigDecimal minMonthlyIncome;
            global java.math.BigDecimal maxDtiMultiplier;

            rule "Financing - Calculate Max Amount"
                salience 100
                when
                    $req : FinancingRequestFact(monthlyIncome != null)
                then
                    $req.setMaxFinancingAmount($req.getMonthlyIncome().multiply(maxDtiMultiplier));
                    $req.setEligible(true);
                    $req.setReasons(new ArrayList<>());
            end

            rule "Financing - Age Below Minimum"
                salience 50
                when
                    $req : FinancingRequestFact(age != null, age < minAge)
                then
                    $req.setEligible(false);
                    $req.getReasons().add("Age " + $req.getAge() + " is below minimum age of " + minAge);
            end

            rule "Financing - Age Above Maximum"
                salience 50
                when
                    $req : FinancingRequestFact(age != null, age > maxAge)
                then
                    $req.setEligible(false);
                    $req.getReasons().add("Age " + $req.getAge() + " exceeds maximum age of " + maxAge);
            end

            rule "Financing - Income Below Minimum"
                salience 50
                when
                    $req : FinancingRequestFact(
                        monthlyIncome != null,
                        monthlyIncome.compareTo(minMonthlyIncome) < 0
                    )
                then
                    $req.setEligible(false);
                    $req.getReasons().add("Monthly income below minimum of " + minMonthlyIncome);
            end

            rule "Financing - Account Not Active"
                salience 50
                when
                    $req : FinancingRequestFact(accountStatus != null, accountStatus != AccountStatus.ACTIVE)
                then
                    $req.setEligible(false);
                    $req.getReasons().add("Account status is " + $req.getAccountStatus() + ", must be ACTIVE");
            end

            rule "Financing - Amount Exceeds DTI Cap"
                salience 40
                when
                    $req : FinancingRequestFact(
                        requestedAmount != null,
                        monthlyIncome != null,
                        requestedAmount.compareTo(monthlyIncome.multiply(maxDtiMultiplier)) > 0
                    )
                then
                    $req.setEligible(false);
                    $req.getReasons().add("Requested amount exceeds maximum financing of " + $req.getMonthlyIncome().multiply(maxDtiMultiplier));
            end

            rule "Financing - All Checks Passed"
                salience 10
                when
                    $req : FinancingRequestFact(
                        eligible == true,
                        reasons != null,
                        reasons.size() == 0
                    )
                then
                    $req.getReasons().add("All eligibility criteria met");
            end
            """;

    private KieSession session;

    @BeforeEach
    void setUp() {
        KieHelper kieHelper = new KieHelper();
        kieHelper.addContent(DRL, ResourceType.DRL);
        KieBase kieBase = kieHelper.build();
        session = kieBase.newKieSession();

        session.setGlobal("minAge", 21);
        session.setGlobal("maxAge", 65);
        session.setGlobal("minMonthlyIncome", new BigDecimal("5000000"));
        session.setGlobal("maxDtiMultiplier", new BigDecimal("10"));
    }

    @AfterEach
    void tearDown() {
        if (session != null) {
            session.dispose();
        }
    }

    @Test
    void eligibleCustomer_shouldPass() {
        FinancingRequestFact fact = FinancingRequestFact.builder()
                .age(30)
                .monthlyIncome(new BigDecimal("10000000"))
                .accountStatus(AccountStatus.ACTIVE)
                .requestedAmount(new BigDecimal("50000000"))
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getEligible()).isTrue();
        assertThat(fact.getMaxFinancingAmount()).isEqualByComparingTo(new BigDecimal("100000000"));
        assertThat(fact.getReasons()).contains("All eligibility criteria met");
    }

    @Test
    void ageBelowMinimum_shouldFail() {
        FinancingRequestFact fact = FinancingRequestFact.builder()
                .age(18)
                .monthlyIncome(new BigDecimal("10000000"))
                .accountStatus(AccountStatus.ACTIVE)
                .requestedAmount(new BigDecimal("50000000"))
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getEligible()).isFalse();
        assertThat(fact.getReasons()).anyMatch(r -> r.contains("below minimum age"));
    }

    @Test
    void ageAboveMaximum_shouldFail() {
        FinancingRequestFact fact = FinancingRequestFact.builder()
                .age(70)
                .monthlyIncome(new BigDecimal("10000000"))
                .accountStatus(AccountStatus.ACTIVE)
                .requestedAmount(new BigDecimal("50000000"))
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getEligible()).isFalse();
        assertThat(fact.getReasons()).anyMatch(r -> r.contains("exceeds maximum age"));
    }

    @Test
    void incomeBelowMinimum_shouldFail() {
        FinancingRequestFact fact = FinancingRequestFact.builder()
                .age(30)
                .monthlyIncome(new BigDecimal("3000000"))
                .accountStatus(AccountStatus.ACTIVE)
                .requestedAmount(new BigDecimal("10000000"))
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getEligible()).isFalse();
        assertThat(fact.getReasons()).anyMatch(r -> r.contains("income below minimum"));
    }

    @Test
    void dormantAccount_shouldFail() {
        FinancingRequestFact fact = FinancingRequestFact.builder()
                .age(30)
                .monthlyIncome(new BigDecimal("10000000"))
                .accountStatus(AccountStatus.DORMANT)
                .requestedAmount(new BigDecimal("50000000"))
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getEligible()).isFalse();
        assertThat(fact.getReasons()).anyMatch(r -> r.contains("DORMANT"));
    }

    @Test
    void amountExceedsDtiCap_shouldFail() {
        FinancingRequestFact fact = FinancingRequestFact.builder()
                .age(30)
                .monthlyIncome(new BigDecimal("10000000"))
                .accountStatus(AccountStatus.ACTIVE)
                .requestedAmount(new BigDecimal("150000000"))
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getEligible()).isFalse();
        assertThat(fact.getReasons()).anyMatch(r -> r.contains("exceeds maximum financing"));
    }

    @Test
    void multipleFailures_shouldReportAll() {
        FinancingRequestFact fact = FinancingRequestFact.builder()
                .age(18)
                .monthlyIncome(new BigDecimal("3000000"))
                .accountStatus(AccountStatus.CLOSED)
                .requestedAmount(new BigDecimal("150000000"))
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getEligible()).isFalse();
        assertThat(fact.getReasons().size()).isGreaterThanOrEqualTo(3);
    }

    @Test
    void boundaryAge21_shouldPass() {
        FinancingRequestFact fact = FinancingRequestFact.builder()
                .age(21)
                .monthlyIncome(new BigDecimal("10000000"))
                .accountStatus(AccountStatus.ACTIVE)
                .requestedAmount(new BigDecimal("50000000"))
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getEligible()).isTrue();
    }

    @Test
    void boundaryAge65_shouldPass() {
        FinancingRequestFact fact = FinancingRequestFact.builder()
                .age(65)
                .monthlyIncome(new BigDecimal("10000000"))
                .accountStatus(AccountStatus.ACTIVE)
                .requestedAmount(new BigDecimal("50000000"))
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getEligible()).isTrue();
    }
}
