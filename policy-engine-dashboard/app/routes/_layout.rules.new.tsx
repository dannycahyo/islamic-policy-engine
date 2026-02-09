import {
  Link,
  Form,
  redirect,
  useActionData,
  useNavigation,
  useOutletContext,
  isRouteErrorResponse,
} from "react-router";
import { useReducer, useEffect } from "react";
import type { Route } from "./+types/_layout.rules.new";
import { createRule } from "~/lib/api";
import { PolicyType, POLICY_TYPE_LABELS } from "~/lib/types";
import type { RuleParameter } from "~/lib/types";
import { ParameterForm } from "~/components/ParameterForm";
import { DrlEditor } from "~/components/DrlEditor";
import type { LayoutContext } from "./_layout";

const DEFAULT_DRL = `package com.islamic.policy.rules;

// Import your fact classes
// import com.islamic.policy.model.TransactionRequest;
// import com.islamic.policy.model.PolicyResult;

rule "New Rule"
    when
        // Define conditions here
    then
        // Define actions here
end`;

interface FormState {
  drlSource: string;
}

type FormAction = { type: "SET_DRL"; value: string };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_DRL":
      return { ...state, drlSource: action.value };
    default:
      return state;
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const policyType = formData.get("policyType") as PolicyType;
  const drlSource = formData.get("drlSource") as string;

  // Collect parameters
  const parameters: RuleParameter[] = [];
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

  try {
    const rule = await createRule({ name, description, policyType, drlSource, parameters });
    return redirect(`/rules/${rule.id}`);
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to create rule",
    };
  }
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Failed to create rule";
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

export default function NewRulePage() {
  const actionData = useActionData<{ success: boolean; message: string }>();
  const navigation = useNavigation();
  const { dispatch } = useOutletContext<LayoutContext>();
  const isSubmitting = navigation.state === "submitting";

  const [state, formDispatch] = useReducer(formReducer, {
    drlSource: DEFAULT_DRL,
  });

  useEffect(() => {
    if (actionData && !actionData.success) {
      dispatch({
        type: "ADD_TOAST",
        payload: { message: actionData.message, type: "error" },
      });
    }
  }, [actionData, dispatch]);

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link to="/rules" className="hover:text-gray-700">Rules</Link>
        <span>/</span>
        <span className="text-gray-900">New Rule</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Rule</h1>
        <p className="mt-1 text-sm text-gray-500">
          Define a new policy evaluation rule
        </p>
      </div>

      <Form method="post" className="space-y-6">
        {/* Basic info */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            Basic Information
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="new-rule-name" className="mb-1 block text-sm font-medium text-gray-700">
                Name
              </label>
              <input
                id="new-rule-name"
                type="text"
                name="name"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="e.g., Gold Tier Transaction Limit"
              />
            </div>
            <div>
              <label htmlFor="new-rule-policy-type" className="mb-1 block text-sm font-medium text-gray-700">
                Policy Type
              </label>
              <select
                id="new-rule-policy-type"
                name="policyType"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {Object.values(PolicyType).map((type) => (
                  <option key={type} value={type}>
                    {POLICY_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="new-rule-description" className="mb-1 block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="new-rule-description"
                name="description"
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Describe what this rule does..."
              />
            </div>
          </div>
        </div>

        {/* Parameters */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <ParameterForm initialParameters={[]} name="parameters" />
        </div>

        {/* DRL Editor */}
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            DRL Source
          </h2>
          <input type="hidden" name="drlSource" value={state.drlSource} />
          <DrlEditor
            value={state.drlSource}
            onChange={(v) => formDispatch({ type: "SET_DRL", value: v })}
            height="400px"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? "Creating..." : "Create Rule"}
          </button>
          <Link
            to="/rules"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </Form>
    </div>
  );
}
