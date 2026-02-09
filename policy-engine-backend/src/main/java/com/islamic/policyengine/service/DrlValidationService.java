package com.islamic.policyengine.service;

import org.kie.api.builder.Message;
import org.kie.api.builder.Results;
import org.kie.api.io.ResourceType;
import org.kie.internal.utils.KieHelper;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class DrlValidationService {

    public List<String> validateDrl(String drlSource) {
        KieHelper kieHelper = new KieHelper();
        kieHelper.addContent(drlSource, ResourceType.DRL);
        Results results = kieHelper.verify();
        return results.getMessages().stream()
                .map(Message::getText)
                .collect(Collectors.toList());
    }
}
