export enum PolicyType {
  TRANSACTION_LIMIT = "TRANSACTION_LIMIT",
  FINANCING_ELIGIBILITY = "FINANCING_ELIGIBILITY",
  RISK_FLAG = "RISK_FLAG",
}

export interface RuleParameter {
  key: string;
  value: string;
  type: string;
  description: string;
}

export interface Rule {
  id: number;
  name: string;
  description: string;
  policyType: PolicyType;
  drlSource: string;
  isActive: boolean;
  version: number;
  parameters: RuleParameter[];
  createdAt: string;
  updatedAt: string;
}

export interface EvaluationRequest {
  policyType: PolicyType;
  inputData: Record<string, unknown>;
}

export interface EvaluationResponse {
  policyType: PolicyType;
  ruleId: number;
  ruleVersion: number;
  result: Record<string, unknown>;
  evaluationMs: number;
  timestamp: string;
}

export interface AuditLog {
  id: number;
  policyType: PolicyType;
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

export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  [PolicyType.TRANSACTION_LIMIT]: "Transaction Limit",
  [PolicyType.FINANCING_ELIGIBILITY]: "Financing Eligibility",
  [PolicyType.RISK_FLAG]: "Risk Flag",
};

// Visual Rule Builder types

export interface FieldDefinition {
  type: string;
  enumValues?: string[];
}

export interface FactDefinition {
  packageName: string;
  inputFields: Record<string, FieldDefinition>;
  resultFields: Record<string, FieldDefinition>;
}

export interface FactMetadata {
  facts: Record<string, FactDefinition>;
  operators: Record<string, string[]>;
  policyTypes: string[];
}

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
  parameters?: { key: string; type: string }[];
}

export const POLICY_TYPE_TO_FACT: Record<string, string> = {
  TRANSACTION_LIMIT: "TransactionFact",
  FINANCING_ELIGIBILITY: "FinancingRequestFact",
  RISK_FLAG: "RiskAssessmentFact",
};
