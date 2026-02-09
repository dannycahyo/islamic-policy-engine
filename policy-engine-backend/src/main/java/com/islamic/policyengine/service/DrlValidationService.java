package com.islamic.policyengine.service;

import org.kie.api.builder.Message;
import org.kie.api.builder.Results;
import org.kie.api.io.ResourceType;
import org.kie.internal.utils.KieHelper;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class DrlValidationService {

    private static final Set<String> ALLOWED_IMPORT_PREFIXES = Set.of(
            "com.islamic.policyengine.model.",
            "java.math.",
            "java.util.",
            "java.lang.String",
            "java.lang.Integer",
            "java.lang.Long",
            "java.lang.Boolean",
            "java.lang.Double",
            "java.lang.Number",
            "java.lang.Math",
            "java.lang.Comparable"
    );

    private static final Set<String> BLOCKED_PATTERNS = Set.of(
            "java.lang.Runtime",
            "java.lang.ProcessBuilder",
            "java.lang.reflect.",
            "java.io.",
            "java.net.",
            "java.nio.",
            "javax.script.",
            "System.exit",
            "Runtime.getRuntime",
            "Thread.sleep",
            "Class.forName"
    );

    private static final Pattern IMPORT_PATTERN = Pattern.compile(
            "import\\s+(static\\s+)?([\\w.]+)");

    public List<String> validateDrl(String drlSource) {
        List<String> errors = new ArrayList<>();

        // Security: check for blocked patterns in source
        for (String blocked : BLOCKED_PATTERNS) {
            if (drlSource.contains(blocked)) {
                errors.add("Blocked pattern detected: " + blocked + " is not allowed in DRL source");
            }
        }

        // Security: validate all imports are from allowed packages
        Matcher matcher = IMPORT_PATTERN.matcher(drlSource);
        while (matcher.find()) {
            String importPath = matcher.group(2);
            boolean allowed = ALLOWED_IMPORT_PREFIXES.stream()
                    .anyMatch(importPath::startsWith);
            if (!allowed) {
                errors.add("Import not allowed: " + importPath
                        + ". Only imports from com.islamic.policyengine.model.*, java.math.*, and java.util.* are permitted");
            }
        }

        if (!errors.isEmpty()) {
            return errors;
        }

        // Syntax validation via KieHelper — only return ERROR-level messages
        KieHelper kieHelper = new KieHelper();
        kieHelper.addContent(drlSource, ResourceType.DRL);
        Results results = kieHelper.verify();
        return results.getMessages(Message.Level.ERROR).stream()
                .map(Message::getText)
                .collect(Collectors.toList());
    }
}
