package com.islamic.policyengine.model.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a field in a Drools fact class as an input field.
 * Input fields are populated from the evaluation request and used in the "when" block of DRL rules.
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface InputField {
}
