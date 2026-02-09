package com.islamic.policyengine.service;

import com.islamic.policyengine.exception.DrlCompilationException;
import com.islamic.policyengine.model.entity.Rule;
import org.kie.api.KieBase;
import org.kie.api.builder.Message;
import org.kie.api.builder.Results;
import org.kie.api.io.ResourceType;
import org.kie.internal.utils.KieHelper;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class DroolsEngineService {

    @Cacheable(value = "kieBases", key = "#rule.id + '-' + #rule.version")
    public KieBase compileRule(Rule rule) {
        KieHelper kieHelper = new KieHelper();
        kieHelper.addContent(rule.getDrlSource(), ResourceType.DRL);

        Results results = kieHelper.verify();
        if (results.hasMessages(Message.Level.ERROR)) {
            List<Message> errors = results.getMessages(Message.Level.ERROR);
            throw new DrlCompilationException(errors);
        }

        return kieHelper.build();
    }

    @CacheEvict(value = "kieBases", key = "#ruleId + '-' + #oldVersion")
    public void evictCache(UUID ruleId, int oldVersion) {
        // Cache entry removed; next evaluation triggers recompilation
    }
}
