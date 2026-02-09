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
