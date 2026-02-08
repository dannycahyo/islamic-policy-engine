package com.islamic.policyengine.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParameterDto {

    private String key;
    private String value;
    private String type;
    private String description;
}
