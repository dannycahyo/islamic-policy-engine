package com.islamic.policyengine.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RuleFieldDTO {

    private String fieldName;
    private String fieldType;
    private String fieldCategory;
    private List<String> enumValues;
    private Integer fieldOrder;
}
