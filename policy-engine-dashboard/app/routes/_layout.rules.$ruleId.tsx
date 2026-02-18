import {
  Link,
  useLoaderData,
  useActionData,
  Form,
  isRouteErrorResponse,
  useNavigation,
  useOutletContext,
} from "react-router";
import { useEffect } from "react";
import type { Route } from "./+types/_layout.rules.$ruleId";
import { getRule, updateRule, toggleRuleStatus } from "~/lib/api";
import type { Rule } from "~/lib/types";
import { StatusBadge, PolicyTypeBadge } from "~/components/StatusBadge";
import type { LayoutContext } from "./_layout";

interface RuleDetailData {
  rule: Rule;
}

export async function loader({ params }: Route.LoaderArgs): Promise<RuleDetailData> {
  const rule = await getRule(params.ruleId);
  return { rule };
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "toggle-status") {
    const isActive = formData.get("isActive") === "true";
    await toggleRuleStatus(params.ruleId, isActive);
    return { success: true, message: `Rule ${isActive ? "activated" : "deactivated"}` };
  }

  if (intent === "update-info") {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    await updateRule(params.ruleId, {
      name,
      description,
    });

    return { success: true, message: "Rule updated successfully" };
  }

  return { success: false, message: "Unknown action" };
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Failed to load rule";
  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Rule not found" : (error.data?.message || message);
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

export default function RuleDetailPage() {
  const { rule } = useLoaderData<RuleDetailData>();
  const actionData = useActionData<{ success: boolean; message: string }>();
  const navigation = useNavigation();
  const { dispatch } = useOutletContext<LayoutContext>();
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (actionData?.success) {
      dispatch({
        type: "ADD_TOAST",
        payload: { message: actionData.message, type: "success" },
      });
    } else if (actionData && !actionData.success) {
      dispatch({
        type: "ADD_TOAST",
        payload: { message: actionData.message, type: "error" },
      });
    }
  }, [actionData, dispatch]);

  const inputFields = (rule.fields ?? []).filter((f) => f.fieldCategory === "INPUT");
  const resultFields = (rule.fields ?? []).filter((f) => f.fieldCategory === "RESULT");

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link to="/rules" className="hover:text-gray-700">
          Rules
        </Link>
        <span>/</span>
        <span className="text-gray-900">{rule.name}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{rule.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{rule.description}</p>
          <div className="mt-2 flex items-center gap-3">
            <PolicyTypeBadge policyType={rule.policyType} />
            <StatusBadge isActive={rule.isActive} />
            <span className="text-xs text-gray-400">v{rule.version}</span>
            {rule.factTypeName && (
              <span className="text-xs text-gray-400">Fact: {rule.factTypeName}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/rules/${rule.id}/drl`}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Edit DRL
          </Link>
          <Link
            to={`/rules/${rule.id}/test`}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Test Rule
          </Link>
          <Form method="post">
            <input type="hidden" name="intent" value="toggle-status" />
            <input
              type="hidden"
              name="isActive"
              value={String(!rule.isActive)}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className={`rounded-lg px-3 py-2 text-sm font-medium text-white disabled:opacity-50 ${
                rule.isActive
                  ? "bg-gray-600 hover:bg-gray-700"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {rule.isActive ? "Deactivate" : "Activate"}
            </button>
          </Form>
        </div>
      </div>

      {/* Basic info form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <Form method="post">
          <input type="hidden" name="intent" value="update-info" />

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="rule-name" className="mb-1 block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                id="rule-name"
                type="text"
                name="name"
                defaultValue={rule.name}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="rule-description" className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                id="rule-description"
                type="text"
                name="description"
                defaultValue={rule.description}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </Form>
      </div>

      {/* Field Schema (read-only) */}
      {(inputFields.length > 0 || resultFields.length > 0) && (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Field Schema</h2>

          {inputFields.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-medium text-gray-700">Input Fields</h3>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Enum Values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {inputFields.map((f) => (
                      <tr key={f.fieldName}>
                        <td className="px-4 py-2 text-sm text-gray-900">{f.fieldName}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{f.fieldType}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{f.enumValues?.join(", ") ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {resultFields.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-gray-700">Result Fields</h3>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Type</th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Enum Values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {resultFields.map((f) => (
                      <tr key={f.fieldName}>
                        <td className="px-4 py-2 text-sm text-gray-900">{f.fieldName}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{f.fieldType}</td>
                        <td className="px-4 py-2 text-sm text-gray-600">{f.enumValues?.join(", ") ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* API Integration */}
      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">API Integration</h2>
        <p className="mb-3 text-sm text-gray-500">
          External services can discover this rule&apos;s field schema and evaluate policies via these endpoints.
        </p>

        <div className="space-y-4">
          <div>
            <h3 className="mb-1 text-sm font-medium text-gray-700">Schema Discovery</h3>
            <div className="rounded-lg bg-gray-900 p-3">
              <code className="text-sm text-green-400">
                GET /api/v1/policies/{rule.policyType}/schema
              </code>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Returns input/result field definitions. Callers can cache and refresh periodically.
            </p>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-medium text-gray-700">Evaluate Policy</h3>
            <div className="rounded-lg bg-gray-900 p-3">
              <code className="text-sm text-green-400">
                POST /api/v1/policies/{rule.policyType}/evaluate
              </code>
            </div>
          </div>

          <div>
            <h3 className="mb-1 text-sm font-medium text-gray-700">Sample curl</h3>
            <div className="overflow-x-auto rounded-lg bg-gray-900 p-3">
              <pre className="text-xs text-green-400">{`# 1. Discover schema
curl -s /api/v1/policies/${rule.policyType}/schema | jq

# 2. Evaluate
curl -X POST /api/v1/policies/${rule.policyType}/evaluate \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({ data: Object.fromEntries(inputFields.map((f) => [f.fieldName, f.fieldType === "INTEGER" ? 0 : f.fieldType === "BIG_DECIMAL" ? 0.0 : f.fieldType === "BOOLEAN" ? false : "value"])) }, null, 2)}'`}</pre>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-4 text-xs text-gray-400">
        <p>Created: {new Date(rule.createdAt).toLocaleString()}</p>
        <p>Updated: {new Date(rule.updatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}
