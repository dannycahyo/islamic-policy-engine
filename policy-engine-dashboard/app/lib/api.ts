import type {
  Rule,
  RuleField,
  EvaluationResponse,
  AuditLog,
  PaginatedResponse,
  ErrorResponse,
  FactMetadata,
  RuleDefinition,
  PolicySchema,
} from "./types";

const BASE_URL =
  typeof window === "undefined"
    ? process.env?.API_URL || "http://localhost:8080"
    : "";

class ApiError extends Error {
  status: number;
  errorResponse?: ErrorResponse;

  constructor(status: number, message: string, errorResponse?: ErrorResponse) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errorResponse = errorResponse;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorResponse: ErrorResponse | undefined;
    try {
      errorResponse = await res.json();
    } catch {
      // ignore parse errors
    }
    throw new ApiError(
      res.status,
      errorResponse?.message || `Request failed: ${res.status}`,
      errorResponse
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export function getRules(params?: {
  policyType?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
}): Promise<PaginatedResponse<Rule>> {
  const searchParams = new URLSearchParams();
  if (params?.policyType) searchParams.set("policyType", params.policyType);
  if (params?.isActive !== undefined)
    searchParams.set("isActive", String(params.isActive));
  if (params?.page !== undefined)
    searchParams.set("page", String(params.page));
  if (params?.size !== undefined)
    searchParams.set("size", String(params.size));
  const qs = searchParams.toString();
  return request<PaginatedResponse<Rule>>(
    `/api/v1/rules${qs ? `?${qs}` : ""}`
  );
}

export function getRule(id: number | string): Promise<Rule> {
  return request<Rule>(`/api/v1/rules/${id}`);
}

export function createRule(data: {
  name: string;
  description: string;
  policyType: string;
  drlSource: string;
  factTypeName?: string;
  parameters?: { key: string; value: string; type: string; description: string }[];
  fields?: RuleField[];
}): Promise<Rule> {
  return request<Rule>("/api/v1/rules", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function updateRule(
  id: number | string,
  data: {
    name?: string;
    description?: string;
    drlSource?: string;
    factTypeName?: string;
    parameters?: { key: string; value: string; type: string; description: string }[];
    fields?: RuleField[];
  }
): Promise<Rule> {
  return request<Rule>(`/api/v1/rules/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export function toggleRuleStatus(
  id: number | string,
  isActive: boolean
): Promise<Rule> {
  return request<Rule>(`/api/v1/rules/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
}

export function testRule(
  id: number | string,
  data: { data: Record<string, unknown> }
): Promise<EvaluationResponse> {
  return request<EvaluationResponse>(`/api/v1/rules/${id}/test`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function evaluatePolicy(
  policyType: string,
  inputData: Record<string, unknown>
): Promise<EvaluationResponse> {
  return request<EvaluationResponse>(
    `/api/v1/policies/${policyType}/evaluate`,
    {
      method: "POST",
      body: JSON.stringify({ data: inputData }),
    }
  );
}

export function evaluateRule(
  ruleId: number | string,
  data: Record<string, unknown>
): Promise<EvaluationResponse> {
  return request<EvaluationResponse>(`/api/v1/rules/${ruleId}/evaluate`, {
    method: "POST",
    body: JSON.stringify({ data }),
  });
}

export function getAuditLogs(params?: {
  policyType?: string;
  ruleId?: number | string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  size?: number;
}): Promise<PaginatedResponse<AuditLog>> {
  const searchParams = new URLSearchParams();
  if (params?.policyType) searchParams.set("policyType", params.policyType);
  if (params?.ruleId) searchParams.set("ruleId", String(params.ruleId));
  if (params?.dateFrom) searchParams.set("dateFrom", params.dateFrom);
  if (params?.dateTo) searchParams.set("dateTo", params.dateTo);
  if (params?.page !== undefined)
    searchParams.set("page", String(params.page));
  if (params?.size !== undefined)
    searchParams.set("size", String(params.size));
  const qs = searchParams.toString();
  return request<PaginatedResponse<AuditLog>>(
    `/api/v1/audit${qs ? `?${qs}` : ""}`
  );
}

export function getFactMetadata(): Promise<FactMetadata> {
  return request<FactMetadata>("/api/v1/rules/metadata");
}

export function getPolicySchema(policyType: string): Promise<PolicySchema> {
  return request<PolicySchema>(`/api/v1/policies/${policyType}/schema`);
}

export function getRuleSchema(ruleId: number | string): Promise<PolicySchema> {
  return request<PolicySchema>(`/api/v1/rules/${ruleId}/schema`);
}

export function generateDrl(
  definition: RuleDefinition
): Promise<{ drl: string }> {
  return request<{ drl: string }>("/api/v1/rules/generate-drl", {
    method: "POST",
    body: JSON.stringify(definition),
  });
}

export function validateDrl(
  drlSource: string
): Promise<{ valid: boolean; errors: string[] }> {
  return request<{ valid: boolean; errors: string[] }>(
    "/api/v1/rules/validate-drl",
    {
      method: "POST",
      body: JSON.stringify({ drlSource }),
    }
  );
}

export { ApiError };
