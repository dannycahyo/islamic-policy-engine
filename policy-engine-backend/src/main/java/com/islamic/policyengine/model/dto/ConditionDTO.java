package com.islamic.policyengine.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConditionDTO {

    private String field;
    private String operator;
    private String value;
    private String valueType;
}
