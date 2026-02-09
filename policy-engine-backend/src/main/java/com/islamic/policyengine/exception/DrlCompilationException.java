package com.islamic.policyengine.exception;

import java.util.List;
import java.util.stream.Collectors;

import org.kie.api.builder.Message;

public class DrlCompilationException extends RuntimeException {

    private final List<String> errors;

    public DrlCompilationException(List<Message> messages) {
        super("DRL compilation failed: " + messages.stream()
                .map(Message::getText)
                .collect(Collectors.joining("; ")));
        this.errors = messages.stream()
                .map(Message::getText)
                .collect(Collectors.toList());
    }

    public DrlCompilationException(String message, List<String> errors) {
        super(message);
        this.errors = errors;
    }

    public List<String> getErrors() {
        return errors;
    }
}
