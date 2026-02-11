import {
  Link,
  useLoaderData,
  useActionData,
  Form,
  isRouteErrorResponse,
  useNavigation,
  useOutletContext,
} from "react-router";
import { useReducer, useEffect, useCallback } from "react";
import type { Route } from "./+types/_layout.rules.$ruleId";
import { getRule, updateRule, toggleRuleStatus, getFactMetadata } from "~/lib/api";
import type { Rule, RuleParameter, FactMetadata } from "~/lib/types";
import { POLICY_TYPE_TO_FACT } from "~/lib/types";
import { StatusBadge, PolicyTypeBadge } from "~/components/StatusBadge";
import { ParameterForm } from "~/components/ParameterForm";
import { ConditionBuilder } from "~/components/ConditionBuilder";
import type { LayoutContext } from "./_layout";

interface RuleDetailData {
  rule: Rule;
  metadata: FactMetadata;
}

interface EditState {
  drlSource: string;
  parameters: RuleParameter[];
  editorMode: "visual" | "info";
}

type EditAction =
  | { type: "SET_DRL"; value: string }
  | { type: "SET_PARAMETERS"; parameters: RuleParameter[] }
  | { type: "SET_EDITOR_MODE"; mode: "visual" | "info" };

function editReducer(state: EditState, action: EditAction): EditState {
  switch (action.type) {
    case "SET_DRL":
      return { ...state, drlSource: action.value };
    case "SET_PARAMETERS":
      return { ...state, parameters: action.parameters };
    case "SET_EDITOR_MODE":
      return { ...state, editorMode: action.mode };
    default:
      return state;
  }
}

export async function loader({ params }: Route.LoaderArgs): Promise<RuleDetailData> {
  const [rule, metadata] = await Promise.all([
    getRule(params.ruleId),
    getFactMetadata(),
  ]);
  return { rule, metadata };
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

    const drlSource = formData.get("drlSource") as string;
    await updateRule(params.ruleId, {
      name,
      description,
      drlSource,
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
  const { rule, metadata } = useLoaderData<RuleDetailData>();
  const actionData = useActionData<{ success: boolean; message: string }>();
  const navigation = useNavigation();
  const { dispatch } = useOutletContext<LayoutContext>();
  const isSubmitting = navigation.state === "submitting";

  const [state, editDispatch] = useReducer(editReducer, {
    drlSource: rule.drlSource,
    parameters: rule.parameters,
    editorMode: "info",
  });

  const handleParametersChange = useCallback(
    (parameters: RuleParameter[]) => {
      editDispatch({ type: "SET_PARAMETERS", parameters });
    },
    []
  );

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

  const factType =
    POLICY_TYPE_TO_FACT[rule.policyType] ?? "TransactionFact";

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
            Code Editor
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

      {/* Editor mode toggle */}
      <div className="mb-4 flex rounded-lg border border-gray-200 bg-white p-1">
        <button
          type="button"
          onClick={() =>
            editDispatch({ type: "SET_EDITOR_MODE", mode: "info" })
          }
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            state.editorMode === "info"
              ? "bg-emerald-100 text-emerald-800"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Rule Details
        </button>
        <button
          type="button"
          onClick={() =>
            editDispatch({ type: "SET_EDITOR_MODE", mode: "visual" })
          }
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            state.editorMode === "visual"
              ? "bg-emerald-100 text-emerald-800"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          Visual Builder
        </button>
      </div>

      {/* Rule Details mode */}
      {state.editorMode === "info" && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <Form method="post">
            <input type="hidden" name="intent" value="update-parameters" />
            <input type="hidden" name="drlSource" value={state.drlSource} />

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

            <ParameterForm
              initialParameters={rule.parameters}
              name="parameters"
              onParametersChange={handleParametersChange}
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
      )}

      {/* Visual Builder mode */}
      {state.editorMode === "visual" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-700">
              Build your rule visually using conditions and actions. The DRL
              code will be generated automatically. Parameters defined in Rule
              Details can be referenced in condition and action values.
            </p>
          </div>
          <ConditionBuilder
            metadata={metadata}
            ruleName={rule.name}
            policyType={rule.policyType}
            initialFactType={factType}
            parameters={state.parameters}
            onDrlChange={(drl) =>
              editDispatch({ type: "SET_DRL", value: drl })
            }
          />
          <div className="flex justify-end">
            <Form method="post">
              <input type="hidden" name="intent" value="update-parameters" />
              <input type="hidden" name="name" value={rule.name} />
              <input type="hidden" name="description" value={rule.description} />
              <input type="hidden" name="drlSource" value={state.drlSource} />
              {/* Include current parameters as hidden fields */}
              {state.parameters.map((param, index) => (
                <span key={index}>
                  <input type="hidden" name={`parameters[${index}].key`} value={param.key} />
                  <input type="hidden" name={`parameters[${index}].value`} value={param.value} />
                  <input type="hidden" name={`parameters[${index}].type`} value={param.type} />
                  <input type="hidden" name={`parameters[${index}].description`} value={param.description} />
                </span>
              ))}
              <button
                type="submit"
                disabled={isSubmitting || !state.drlSource}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save DRL"}
              </button>
            </Form>
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="mt-4 text-xs text-gray-400">
        <p>Created: {new Date(rule.createdAt).toLocaleString()}</p>
        <p>Updated: {new Date(rule.updatedAt).toLocaleString()}</p>
      </div>
    </div>
  );
}
