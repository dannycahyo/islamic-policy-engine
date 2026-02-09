package com.islamic.policyengine.service;

import com.islamic.policyengine.model.enums.AccountTier;
import com.islamic.policyengine.model.fact.TransactionFact;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.kie.api.KieBase;
import org.kie.api.io.ResourceType;
import org.kie.api.runtime.KieSession;
import org.kie.internal.utils.KieHelper;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class TransactionLimitRuleTest {

    private static final String DRL = """
            package com.islamic.policyengine.rules;

            import com.islamic.policyengine.model.fact.TransactionFact;
            import com.islamic.policyengine.model.enums.AccountTier;
            import java.math.BigDecimal;

            global java.math.BigDecimal silverDailyLimit;
            global java.math.BigDecimal goldDailyLimit;
            global java.math.BigDecimal platinumDailyLimit;

            rule "Transaction Limit - SILVER - Exceeded"
                when
                    $tx : TransactionFact(
                        accountTier == AccountTier.SILVER,
                        transactionAmount != null,
                        dailyCumulativeAmount != null,
                        transactionAmount.add(dailyCumulativeAmount).compareTo(silverDailyLimit) > 0
                    )
                then
                    $tx.setAllowed(false);
                    $tx.setReason("Daily limit exceeded for SILVER tier");
                    $tx.setRemainingLimit(silverDailyLimit.subtract($tx.getDailyCumulativeAmount()).max(java.math.BigDecimal.ZERO));
            end

            rule "Transaction Limit - SILVER - Allowed"
                when
                    $tx : TransactionFact(
                        accountTier == AccountTier.SILVER,
                        transactionAmount != null,
                        dailyCumulativeAmount != null,
                        transactionAmount.add(dailyCumulativeAmount).compareTo(silverDailyLimit) <= 0
                    )
                then
                    $tx.setAllowed(true);
                    $tx.setReason("Transaction within daily limit for SILVER tier");
                    $tx.setRemainingLimit(silverDailyLimit.subtract($tx.getDailyCumulativeAmount()).subtract($tx.getTransactionAmount()));
            end

            rule "Transaction Limit - GOLD - Exceeded"
                when
                    $tx : TransactionFact(
                        accountTier == AccountTier.GOLD,
                        transactionAmount != null,
                        dailyCumulativeAmount != null,
                        transactionAmount.add(dailyCumulativeAmount).compareTo(goldDailyLimit) > 0
                    )
                then
                    $tx.setAllowed(false);
                    $tx.setReason("Daily limit exceeded for GOLD tier");
                    $tx.setRemainingLimit(goldDailyLimit.subtract($tx.getDailyCumulativeAmount()).max(java.math.BigDecimal.ZERO));
            end

            rule "Transaction Limit - GOLD - Allowed"
                when
                    $tx : TransactionFact(
                        accountTier == AccountTier.GOLD,
                        transactionAmount != null,
                        dailyCumulativeAmount != null,
                        transactionAmount.add(dailyCumulativeAmount).compareTo(goldDailyLimit) <= 0
                    )
                then
                    $tx.setAllowed(true);
                    $tx.setReason("Transaction within daily limit for GOLD tier");
                    $tx.setRemainingLimit(goldDailyLimit.subtract($tx.getDailyCumulativeAmount()).subtract($tx.getTransactionAmount()));
            end

            rule "Transaction Limit - PLATINUM - Exceeded"
                when
                    $tx : TransactionFact(
                        accountTier == AccountTier.PLATINUM,
                        transactionAmount != null,
                        dailyCumulativeAmount != null,
                        transactionAmount.add(dailyCumulativeAmount).compareTo(platinumDailyLimit) > 0
                    )
                then
                    $tx.setAllowed(false);
                    $tx.setReason("Daily limit exceeded for PLATINUM tier");
                    $tx.setRemainingLimit(platinumDailyLimit.subtract($tx.getDailyCumulativeAmount()).max(java.math.BigDecimal.ZERO));
            end

            rule "Transaction Limit - PLATINUM - Allowed"
                when
                    $tx : TransactionFact(
                        accountTier == AccountTier.PLATINUM,
                        transactionAmount != null,
                        dailyCumulativeAmount != null,
                        transactionAmount.add(dailyCumulativeAmount).compareTo(platinumDailyLimit) <= 0
                    )
                then
                    $tx.setAllowed(true);
                    $tx.setReason("Transaction within daily limit for PLATINUM tier");
                    $tx.setRemainingLimit(platinumDailyLimit.subtract($tx.getDailyCumulativeAmount()).subtract($tx.getTransactionAmount()));
            end
            """;

    private KieSession session;

    @BeforeEach
    void setUp() {
        KieHelper kieHelper = new KieHelper();
        kieHelper.addContent(DRL, ResourceType.DRL);
        KieBase kieBase = kieHelper.build();
        session = kieBase.newKieSession();

        session.setGlobal("silverDailyLimit", new BigDecimal("10000000"));
        session.setGlobal("goldDailyLimit", new BigDecimal("50000000"));
        session.setGlobal("platinumDailyLimit", new BigDecimal("200000000"));
    }

    @AfterEach
    void tearDown() {
        if (session != null) {
            session.dispose();
        }
    }

    @Test
    void silverTier_withinLimit_shouldAllow() {
        TransactionFact fact = TransactionFact.builder()
                .accountTier(AccountTier.SILVER)
                .transactionAmount(new BigDecimal("3000000"))
                .dailyCumulativeAmount(new BigDecimal("5000000"))
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getAllowed()).isTrue();
        assertThat(fact.getRemainingLimit()).isEqualByComparingTo(new BigDecimal("2000000"));
    }

    @Test
    void silverTier_exceedsLimit_shouldDeny() {
        TransactionFact fact = TransactionFact.builder()
                .accountTier(AccountTier.SILVER)
                .transactionAmount(new BigDecimal("6000000"))
                .dailyCumulativeAmount(new BigDecimal("5000000"))
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getAllowed()).isFalse();
        assertThat(fact.getReason()).contains("SILVER");
    }

    @Test
    void silverTier_exactLimit_shouldAllow() {
        TransactionFact fact = TransactionFact.builder()
                .accountTier(AccountTier.SILVER)
                .transactionAmount(new BigDecimal("5000000"))
                .dailyCumulativeAmount(new BigDecimal("5000000"))
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getAllowed()).isTrue();
        assertThat(fact.getRemainingLimit()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void goldTier_withinLimit_shouldAllow() {
        TransactionFact fact = TransactionFact.builder()
                .accountTier(AccountTier.GOLD)
                .transactionAmount(new BigDecimal("20000000"))
                .dailyCumulativeAmount(new BigDecimal("10000000"))
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getAllowed()).isTrue();
        assertThat(fact.getRemainingLimit()).isEqualByComparingTo(new BigDecimal("20000000"));
    }

    @Test
    void goldTier_exceedsLimit_shouldDeny() {
        TransactionFact fact = TransactionFact.builder()
                .accountTier(AccountTier.GOLD)
                .transactionAmount(new BigDecimal("30000000"))
                .dailyCumulativeAmount(new BigDecimal("30000000"))
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getAllowed()).isFalse();
        assertThat(fact.getReason()).contains("GOLD");
    }

    @Test
    void platinumTier_withinLimit_shouldAllow() {
        TransactionFact fact = TransactionFact.builder()
                .accountTier(AccountTier.PLATINUM)
                .transactionAmount(new BigDecimal("50000000"))
                .dailyCumulativeAmount(new BigDecimal("100000000"))
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getAllowed()).isTrue();
        assertThat(fact.getRemainingLimit()).isEqualByComparingTo(new BigDecimal("50000000"));
    }

    @Test
    void platinumTier_exceedsLimit_shouldDeny() {
        TransactionFact fact = TransactionFact.builder()
                .accountTier(AccountTier.PLATINUM)
                .transactionAmount(new BigDecimal("150000000"))
                .dailyCumulativeAmount(new BigDecimal("100000000"))
                .build();

        session.insert(fact);
        session.fireAllRules();

        assertThat(fact.getAllowed()).isFalse();
        assertThat(fact.getReason()).contains("PLATINUM");
    }
}
