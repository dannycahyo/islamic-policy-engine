import {
  Link,
  useLoaderData,
  useSearchParams,
  isRouteErrorResponse,
} from "react-router";
import type { Route } from "./+types/_layout.rules";
import { getRules } from "~/lib/api";
import { PolicyType, POLICY_TYPE_LABELS } from "~/lib/types";
import type { Rule, PaginatedResponse } from "~/lib/types";
import { RuleCard } from "~/components/RuleCard";

interface RulesData {
  rules: PaginatedResponse<Rule>;
  error?: string;
}

export async function loader({ request }: Route.LoaderArgs): Promise<RulesData> {
  const url = new URL(request.url);
  const policyType = url.searchParams.get("policyType") as PolicyType | null;
  const page = Number(url.searchParams.get("page") || "0");

  try {
    const rules = await getRules({
      policyType: policyType || undefined,
      page,
      size: 20,
    });
    return { rules };
  } catch {
    return {
      rules: { content: [], totalElements: 0, totalPages: 0, number: 0 },
      error: "Unable to load rules. Is the backend running?",
    };
  }
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Failed to load rules";
  if (isRouteErrorResponse(error)) {
    message = error.data?.message || message;
  }
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-semibold text-red-800">Error</h2>
      <p className="mt-2 text-sm text-red-600">{message}</p>
    </div>
  );
}

export default function RulesPage() {
  const data = useLoaderData<RulesData>();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentType = searchParams.get("policyType") || "";

  function handleFilterChange(value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("policyType", value);
    } else {
      params.delete("policyType");
    }
    params.delete("page");
    setSearchParams(params);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rules</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage policy evaluation rules
          </p>
        </div>
        <Link
          to="/rules/new"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + New Rule
        </Link>
      </div>

      {data.error && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">{data.error}</p>
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-6">
        <select
          value={currentType}
          onChange={(e) => handleFilterChange(e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">All Policy Types</option>
          {Object.values(PolicyType).map((type) => (
            <option key={type} value={type}>
              {POLICY_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      {/* Rules grid */}
      {data.rules.content.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
          <p className="text-sm text-gray-500">No rules found.</p>
          <Link
            to="/rules/new"
            className="mt-2 inline-block text-sm font-medium text-emerald-600 hover:text-emerald-700"
          >
            Create your first rule
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.rules.content.map((rule) => (
              <RuleCard key={rule.id} rule={rule} />
            ))}
          </div>

          {/* Pagination */}
          {data.rules.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {data.rules.number + 1} of {data.rules.totalPages} ({data.rules.totalElements} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set("page", String(data.rules.number - 1));
                    setSearchParams(params);
                  }}
                  disabled={data.rules.number === 0}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => {
                    const params = new URLSearchParams(searchParams);
                    params.set("page", String(data.rules.number + 1));
                    setSearchParams(params);
                  }}
                  disabled={data.rules.number >= data.rules.totalPages - 1}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
