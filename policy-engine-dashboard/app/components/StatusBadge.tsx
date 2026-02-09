import { PolicyType, POLICY_TYPE_LABELS } from "~/lib/types";

export function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive
          ? "bg-emerald-100 text-emerald-800"
          : "bg-gray-100 text-gray-800"
      }`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${
          isActive ? "bg-emerald-500" : "bg-gray-400"
        }`}
      />
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

const POLICY_TYPE_COLORS: Record<PolicyType, string> = {
  [PolicyType.TRANSACTION_LIMIT]: "bg-blue-100 text-blue-800",
  [PolicyType.FINANCING_ELIGIBILITY]: "bg-purple-100 text-purple-800",
  [PolicyType.RISK_FLAG]: "bg-amber-100 text-amber-800",
};

export function PolicyTypeBadge({ policyType }: { policyType: PolicyType }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${POLICY_TYPE_COLORS[policyType]}`}
    >
      {POLICY_TYPE_LABELS[policyType]}
    </span>
  );
}
