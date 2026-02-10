package com.islamic.policyengine.model.annotation;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a field in a Drools fact class as a result field.
 * Result fields are set by DRL rule actions ("then" block) and read back as evaluation output.
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface ResultField {
}
