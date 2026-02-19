import {
  useLoaderData,
  useSearchParams,
  isRouteErrorResponse,
} from "react-router";
import type { Route } from "./+types/_layout.audit";
import { getAuditLogs, getRules } from "~/lib/api";
import { POLICY_TYPE_LABELS } from "~/lib/types";
import type { AuditLog, PaginatedResponse } from "~/lib/types";
import { AuditTable } from "~/components/AuditTable";

interface AuditPageData {
  logs: PaginatedResponse<AuditLog>;
  policyTypes: string[];
  error?: string;
}

export async function loader({ request }: Route.LoaderArgs): Promise<AuditPageData> {
  const url = new URL(request.url);
  const policyType = url.searchParams.get("policyType");
  const ruleId = url.searchParams.get("ruleId");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const page = Number(url.searchParams.get("page") || "0");

  try {
    const [logs, rulesRes] = await Promise.all([
      getAuditLogs({
        policyType: policyType || undefined,
        ruleId: ruleId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        size: 20,
      }),
      getRules({ size: 100 }),
    ]);
    const policyTypes = Array.from(
      new Set(rulesRes.content.map((r) => r.policyType))
    ).sort();
    return { logs, policyTypes };
  } catch {
    return {
      logs: { content: [], totalElements: 0, totalPages: 0, number: 0 },
      policyTypes: [],
      error: "Unable to load audit logs. Is the backend running?",
    };
  }
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Failed to load audit logs";
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

export default function AuditPage() {
  const data = useLoaderData<AuditPageData>();
  const [searchParams, setSearchParams] = useSearchParams();

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    setSearchParams(params);
  }

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(page));
    setSearchParams(params);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="mt-1 text-sm text-gray-500">
          Policy evaluation history and audit trail
        </p>
      </div>

      {data.error && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">{data.error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <select
          value={searchParams.get("policyType") || ""}
          onChange={(e) => updateFilter("policyType", e.target.value)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">All Policy Types</option>
          {data.policyTypes.map((type) => (
            <option key={type} value={type}>
              {POLICY_TYPE_LABELS[type] || type}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Rule ID"
          value={searchParams.get("ruleId") || ""}
          onChange={(e) => updateFilter("ruleId", e.target.value)}
          className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />

        <input
          type="date"
          value={searchParams.get("dateFrom") || ""}
          onChange={(e) => updateFilter("dateFrom", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />

        <input
          type="date"
          value={searchParams.get("dateTo") || ""}
          onChange={(e) => updateFilter("dateTo", e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />

        {(searchParams.get("policyType") ||
          searchParams.get("ruleId") ||
          searchParams.get("dateFrom") ||
          searchParams.get("dateTo")) && (
          <button
            onClick={() => setSearchParams({})}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Audit table */}
      <AuditTable logs={data.logs.content} />

      {/* Pagination */}
      {data.logs.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {data.logs.number + 1} of {data.logs.totalPages} ({data.logs.totalElements} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => goToPage(data.logs.number - 1)}
              disabled={data.logs.number === 0}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => goToPage(data.logs.number + 1)}
              disabled={data.logs.number >= data.logs.totalPages - 1}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
