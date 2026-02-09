import { Link, useLoaderData, isRouteErrorResponse } from "react-router";
import type { Route } from "./+types/_layout.dashboard";
import { getRules, getAuditLogs } from "~/lib/api";
import { PolicyType } from "~/lib/types";
import type { AuditLog } from "~/lib/types";
import { PolicyTypeBadge } from "~/components/StatusBadge";

interface DashboardData {
  stats: { type: PolicyType; total: number; active: number }[];
  recentAudit: AuditLog[];
  error?: string;
}

export async function loader(): Promise<DashboardData> {
  try {
    const [rulesRes, auditRes] = await Promise.all([
      getRules({ size: 100 }),
      getAuditLogs({ size: 10 }),
    ]);

    const rules = rulesRes.content;
    const stats = Object.values(PolicyType).map((type) => {
      const typeRules = rules.filter((r) => r.policyType === type);
      return {
        type,
        total: typeRules.length,
        active: typeRules.filter((r) => r.isActive).length,
      };
    });

    return { stats, recentAudit: auditRes.content };
  } catch {
    return {
      stats: Object.values(PolicyType).map((type) => ({
        type,
        total: 0,
        active: 0,
      })),
      recentAudit: [],
      error: "Unable to connect to backend API. Is the server running?",
    };
  }
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Failed to load dashboard";
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

export default function DashboardPage() {
  const data = useLoaderData<DashboardData>();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Islamic Policy Engine overview
        </p>
      </div>

      {data.error && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm text-amber-800">{data.error}</p>
        </div>
      )}

      {/* Stats cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {data.stats.map((stat) => (
          <Link
            key={stat.type}
            to={`/rules?policyType=${stat.type}`}
            className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <PolicyTypeBadge policyType={stat.type} />
            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-bold text-gray-900">
                {stat.total}
              </span>
              <span className="mb-1 text-sm text-gray-500">
                rule{stat.total !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {stat.active} active
            </p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-8 flex gap-3">
        <Link
          to="/rules"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          View All Rules
        </Link>
        <Link
          to="/rules/new"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Create New Rule
        </Link>
        <Link
          to="/audit"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          View Audit Log
        </Link>
      </div>

      {/* Recent audit */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900">
          Recent Activity
        </h2>
        {data.recentAudit.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center">
            <p className="text-sm text-gray-500">
              No recent audit activity.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Rule
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Eval Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.recentAudit.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <PolicyTypeBadge policyType={log.policyType} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      #{log.ruleId} (v{log.ruleVersion})
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.evaluationMs}ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
