package com.islamic.policyengine.exception;

import com.islamic.policyengine.model.enums.PolicyType;

public class PolicyNotFoundException extends RuntimeException {

    public PolicyNotFoundException(PolicyType policyType) {
        super("No active rule found for policy type: " + policyType);
    }

    public PolicyNotFoundException(String message) {
        super(message);
    }
}
