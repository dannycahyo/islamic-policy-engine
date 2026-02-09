import {
  Link,
  useLoaderData,
  isRouteErrorResponse,
} from "react-router";
import type { Route } from "./+types/_layout.rules.$ruleId.test";
import { getRule } from "~/lib/api";
import type { Rule } from "~/lib/types";
import { PolicyTypeBadge, StatusBadge } from "~/components/StatusBadge";
import { TestRunner } from "~/components/TestRunner";

interface TestPageData {
  rule: Rule;
}

export async function loader({ params }: Route.LoaderArgs): Promise<TestPageData> {
  const rule = await getRule(params.ruleId);
  return { rule };
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Failed to load rule for testing";
  if (isRouteErrorResponse(error)) {
    message = error.data?.message || message;
  }
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-semibold text-red-800">Error</h2>
      <p className="mt-2 text-sm text-red-600">{message}</p>
      <Link to="/rules" className="mt-4 inline-block text-sm font-medium text-red-700 hover:text-red-800">
        Back to Rules
      </Link>
    </div>
  );
}

export default function RuleTestPage() {
  const { rule } = useLoaderData<TestPageData>();

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link to="/rules" className="hover:text-gray-700">Rules</Link>
        <span>/</span>
        <Link to={`/rules/${rule.id}`} className="hover:text-gray-700">{rule.name}</Link>
        <span>/</span>
        <span className="text-gray-900">Test</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Test Rule</h1>
        <p className="mt-1 text-sm text-gray-500">
          Dry-run test for "{rule.name}" — no audit record will be written
        </p>
        <div className="mt-2 flex items-center gap-3">
          <PolicyTypeBadge policyType={rule.policyType} />
          <StatusBadge isActive={rule.isActive} />
          <span className="text-xs text-gray-400">v{rule.version}</span>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <TestRunner ruleId={rule.id} policyType={rule.policyType} />
      </div>
    </div>
  );
}
