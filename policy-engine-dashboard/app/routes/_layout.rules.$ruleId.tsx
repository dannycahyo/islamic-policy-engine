import {
  Link,
  useLoaderData,
  useActionData,
  Form,
  redirect,
  isRouteErrorResponse,
  useNavigation,
  useOutletContext,
} from "react-router";
import { useEffect } from "react";
import type { Route } from "./+types/_layout.rules.$ruleId";
import { getRule, updateRule, toggleRuleStatus } from "~/lib/api";
import type { Rule } from "~/lib/types";
import { POLICY_TYPE_LABELS } from "~/lib/types";
import { StatusBadge, PolicyTypeBadge } from "~/components/StatusBadge";
import { ParameterForm } from "~/components/ParameterForm";
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

  if (intent === "update-parameters") {
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    // Collect parameters from form
    const parameters: { key: string; value: string; type: string; description: string }[] = [];
    let i = 0;
    while (formData.has(`parameters[${i}].key`)) {
      parameters.push({
        key: formData.get(`parameters[${i}].key`) as string,
        value: formData.get(`parameters[${i}].value`) as string,
        type: formData.get(`parameters[${i}].type`) as string,
        description: formData.get(`parameters[${i}].description`) as string,
      });
      i++;
    }

    const rule = await getRule(params.ruleId);
    await updateRule(params.ruleId, {
      name,
      description,
      drlSource: rule.drlSource,
      parameters,
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
  }, [actionData]);

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

      {/* Parameter form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <Form method="post">
          <input type="hidden" name="intent" value="update-parameters" />

          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                type="text"
                name="name"
                defaultValue={rule.name}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <input
                type="text"
                name="description"
                defaultValue={rule.description}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <ParameterForm
            initialParameters={rule.parameters}
            name="parameters"
          />

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

      {/* Metadata */}
      <div className="mt-4 text-xs text-gray-400">
        <p>Created: {new Date(rule.createdAt).toLocaleString()}</p>
        <p>Updated: {new Date(rule.updatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}
