import { useReducer } from "react";
import type { AuditLog } from "~/lib/types";
import { POLICY_TYPE_LABELS } from "~/lib/types";
import { PolicyTypeBadge } from "./StatusBadge";

interface AuditTableState {
  expandedRows: Set<number>;
}

type AuditTableAction =
  | { type: "TOGGLE_ROW"; id: number };

function auditTableReducer(
  state: AuditTableState,
  action: AuditTableAction
): AuditTableState {
  switch (action.type) {
    case "TOGGLE_ROW": {
      const expandedRows = new Set(state.expandedRows);
      if (expandedRows.has(action.id)) {
        expandedRows.delete(action.id);
      } else {
        expandedRows.add(action.id);
      }
      return { expandedRows };
    }
    default:
      return state;
  }
}

export function AuditTable({ logs }: { logs: AuditLog[] }) {
  const [state, dispatch] = useReducer(auditTableReducer, {
    expandedRows: new Set(),
  });

  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 py-12 text-center">
        <p className="text-sm text-gray-500">No audit logs found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Timestamp
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Policy Type
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Rule ID
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Eval Time
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Caller
            </th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {logs.map((log) => (
            <AuditRow
              key={log.id}
              log={log}
              isExpanded={state.expandedRows.has(log.id)}
              onToggle={() => dispatch({ type: "TOGGLE_ROW", id: log.id })}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditRow({
  log,
  isExpanded,
  onToggle,
}: {
  log: AuditLog;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
          {new Date(log.createdAt).toLocaleString()}
        </td>
        <td className="px-4 py-3">
          <PolicyTypeBadge policyType={log.policyType} />
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">#{log.ruleId}</td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {log.evaluationMs}ms
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {log.callerId || "—"}
        </td>
        <td className="px-4 py-3">
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="bg-gray-50 px-4 py-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">Input</p>
                <pre className="overflow-auto rounded bg-gray-900 p-3 text-xs text-green-400">
                  {JSON.stringify(log.inputData, null, 2)}
                </pre>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">Output</p>
                <pre className="overflow-auto rounded bg-gray-900 p-3 text-xs text-green-400">
                  {JSON.stringify(log.outputData, null, 2)}
                </pre>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
