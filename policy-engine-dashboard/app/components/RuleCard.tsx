import { Link } from "react-router";
import type { Rule } from "~/lib/types";
import { StatusBadge, PolicyTypeBadge } from "./StatusBadge";

export function RuleCard({ rule }: { rule: Rule }) {
  return (
    <Link
      to={`/rules/${rule.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{rule.name}</h3>
        <StatusBadge isActive={rule.isActive} />
      </div>
      <p className="mb-3 line-clamp-2 text-sm text-gray-500">
        {rule.description}
      </p>
      <div className="flex items-center gap-3">
        <PolicyTypeBadge policyType={rule.policyType} />
        <span className="text-xs text-gray-400">v{rule.version}</span>
        <span className="text-xs text-gray-400">
          {(rule.fields ?? []).length} field{(rule.fields ?? []).length !== 1 ? "s" : ""}
        </span>
      </div>
    </Link>
  );
}
