export interface RuleParameter {
  key: string;
  value: string;
  type: string;
  description: string;
}

export interface RuleField {
  fieldName: string;
  fieldType: "STRING" | "INTEGER" | "BIG_DECIMAL" | "BOOLEAN" | "ENUM" | "LIST_STRING";
  fieldCategory: "INPUT" | "RESULT";
  enumValues?: string[];
  fieldOrder: number;
}

export interface Rule {
  id: number;
  name: string;
  description: string;
  policyType: string;
  drlSource: string;
  isActive: boolean;
  version: number;
  factTypeName?: string;
  parameters: RuleParameter[];
  fields: RuleField[];
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationRequest {
  data: Record<string, unknown>;
}

export interface EvaluationResponse {
  policyType: string;
  ruleId: number;
  ruleVersion: number;
  result: Record<string, unknown>;
  evaluationMs: number;
  timestamp: string;
}

export interface AuditLog {
  id: number;
  policyType: string;
  ruleId: number;
  ruleVersion: number;
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  evaluationMs: number;
  callerId: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface ErrorResponse {
  error: string;
  message: string;
  details: string[];
  timestamp: string;
}

export const POLICY_TYPE_LABELS: Record<string, string> = {
  TRANSACTION_LIMIT: "Transaction Limit",
  FINANCING_ELIGIBILITY: "Financing Eligibility",
  RISK_FLAG: "Risk Flag",
};

// Visual Rule Builder types

export const OPERATORS: Record<string, string[]> = {
  BIG_DECIMAL: ["==", "!=", ">", "<", ">=", "<="],
  INTEGER: ["==", "!=", ">", "<", ">=", "<="],
  STRING: ["==", "!="],
  BOOLEAN: ["=="],
  ENUM: ["==", "!="],
};

export const SUPPORTED_FIELD_TYPES = [
  "STRING",
  "INTEGER",
  "BIG_DECIMAL",
  "BOOLEAN",
  "ENUM",
  "LIST_STRING",
] as const;

export interface ConditionRow {
  id: string;
  field: string;
  operator: string;
  value: string;
  valueType: string;
}

export interface ActionRow {
  id: string;
  field: string;
  value: string;
  valueType: string;
}

export interface RuleDefinition {
  ruleName: string;
  policyType: string;
  factType: string;
  conditions: { field: string; operator: string; value: string; valueType: string }[];
  actions: { field: string; value: string; valueType: string }[];
  inputFields: RuleField[];
  resultFields: RuleField[];
}

export interface FactMetadata {
  operators: Record<string, string[]>;
  fieldTypes: string[];
}
