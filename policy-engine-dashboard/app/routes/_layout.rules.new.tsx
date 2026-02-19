import {
  Link,
  Form,
  redirect,
  useActionData,
  useNavigation,
  useOutletContext,
  useFetcher,
  isRouteErrorResponse,
} from "react-router";
import { useReducer, useEffect, useRef } from "react";
import type { Route } from "./+types/_layout.rules.new";
import { createRule } from "~/lib/api";
import type { RuleField } from "~/lib/types";
import { FieldSchemaBuilder } from "~/components/FieldSchemaBuilder";
import { ConditionBuilder } from "~/components/ConditionBuilder";
import type { LayoutContext } from "./_layout";

function generateFactTypeName(ruleName: string): string {
  if (!ruleName.trim()) return "NewRuleFact";
  return (
    ruleName
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("") + "Fact"
  );
}

interface FormState {
  drlSource: string;
  policyType: string;
  ruleName: string;
  inputFields: RuleField[];
  resultFields: RuleField[];
  validating: boolean;
  validationErrors: string[];
}

type FormAction =
  | { type: "SET_DRL"; value: string }
  | { type: "SET_POLICY_TYPE"; value: string }
  | { type: "SET_RULE_NAME"; value: string }
  | {
      type: "SET_FIELDS";
      inputFields: RuleField[];
      resultFields: RuleField[];
    }
  | { type: "SET_VALIDATING"; value: boolean }
  | { type: "SET_VALIDATION_ERRORS"; errors: string[] };

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_DRL":
      return { ...state, drlSource: action.value, validationErrors: [] };
    case "SET_POLICY_TYPE":
      return { ...state, policyType: action.value };
    case "SET_RULE_NAME":
      return { ...state, ruleName: action.value };
    case "SET_FIELDS":
      return {
        ...state,
        inputFields: action.inputFields,
        resultFields: action.resultFields,
      };
    case "SET_VALIDATING":
      return { ...state, validating: action.value };
    case "SET_VALIDATION_ERRORS":
      return { ...state, validationErrors: action.errors, validating: false };
    default:
      return state;
  }
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const policyType = formData.get("policyType") as string;
  const drlSource = formData.get("drlSource") as string;
  const factTypeName = formData.get("factTypeName") as string;
  const fieldsJson = formData.get("fields") as string;

  try {
    const fields: RuleField[] = JSON.parse(fieldsJson || "[]");
    const rule = await createRule({
      name,
      description,
      policyType,
      drlSource,
      factTypeName,
      fields,
    });
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
      <Link
        to="/rules"
        className="mt-4 inline-block text-sm font-medium text-red-700 hover:text-red-800"
      >
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
    drlSource: "",
    policyType: "",
    ruleName: "",
    inputFields: [],
    resultFields: [],
    validating: false,
    validationErrors: [],
  });

  const nameRef = useRef<HTMLInputElement>(null);
  const validateFetcher = useFetcher<{ valid: boolean; errors: string[] }>();

  useEffect(() => {
    if (actionData && !actionData.success) {
      dispatch({
        type: "ADD_TOAST",
        payload: { message: actionData.message, type: "error" },
      });
    }
  }, [actionData, dispatch]);

  // Handle validate fetcher response
  useEffect(() => {
    if (validateFetcher.data) {
      if (validateFetcher.data.valid) {
        dispatch({
          type: "ADD_TOAST",
          payload: { message: "DRL validation passed", type: "success" },
        });
        formDispatch({ type: "SET_VALIDATION_ERRORS", errors: [] });
      } else {
        formDispatch({
          type: "SET_VALIDATION_ERRORS",
          errors: validateFetcher.data.errors,
        });
      }
      formDispatch({ type: "SET_VALIDATING", value: false });
    }
  }, [validateFetcher.data, dispatch]);

  const factType = generateFactTypeName(state.ruleName);

  const allFields: RuleField[] = [
    ...state.inputFields,
    ...state.resultFields,
  ];

  function handleValidate() {
    if (!state.drlSource.trim()) {
      formDispatch({
        type: "SET_VALIDATION_ERRORS",
        errors: ["No DRL generated yet. Add conditions and actions first."],
      });
      return;
    }
    formDispatch({ type: "SET_VALIDATING", value: true });
    validateFetcher.submit(JSON.stringify({ drlSource: state.drlSource }), {
      method: "POST",
      action: "/api/validate-drl",
      encType: "application/json",
    });
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link to="/rules" className="hover:text-gray-700">
          Rules
        </Link>
        <span>/</span>
        <span className="text-gray-900">New Rule</span>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Rule</h1>
        <p className="mt-1 text-sm text-gray-500">
          Define a new policy evaluation rule using the visual builder
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
              <label
                htmlFor="new-rule-name"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Name
              </label>
              <input
                ref={nameRef}
                id="new-rule-name"
                type="text"
                name="name"
                required
                onChange={(e) =>
                  formDispatch({
                    type: "SET_RULE_NAME",
                    value: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="e.g., Loan Eligibility Check"
              />
            </div>
            <div>
              <label
                htmlFor="new-rule-policy-type"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Policy Type
              </label>
              <input
                id="new-rule-policy-type"
                type="text"
                name="policyType"
                required
                value={state.policyType}
                onChange={(e) =>
                  formDispatch({
                    type: "SET_POLICY_TYPE",
                    value: e.target.value,
                  })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="e.g., LOAN_ELIGIBILITY"
                list="policy-type-suggestions"
              />
              <datalist id="policy-type-suggestions">
                <option value="TRANSACTION_LIMIT" />
                <option value="FINANCING_ELIGIBILITY" />
                <option value="RISK_FLAG" />
              </datalist>
            </div>
            <div className="sm:col-span-2">
              <label
                htmlFor="new-rule-description"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
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

        {/* Field Schema Builder */}
        <FieldSchemaBuilder
          onChange={(inputFields, resultFields) =>
            formDispatch({
              type: "SET_FIELDS",
              inputFields,
              resultFields,
            })
          }
        />

        {/* Hidden fields for form submission */}
        <input type="hidden" name="drlSource" value={state.drlSource} />
        <input type="hidden" name="factTypeName" value={factType} />
        <input
          type="hidden"
          name="fields"
          value={JSON.stringify(allFields)}
        />

        {/* Visual Rule Builder */}
        <ConditionBuilder
          inputFields={state.inputFields}
          resultFields={state.resultFields}
          ruleName={state.ruleName || "New Rule"}
          policyType={state.policyType}
          factType={factType}
          onDrlChange={(drl) =>
            formDispatch({ type: "SET_DRL", value: drl })
          }
        />

        {/* Validation errors */}
        {state.validationErrors.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <h3 className="mb-2 text-sm font-medium text-red-800">
              Validation Errors
            </h3>
            <ul className="list-inside list-disc space-y-1">
              {state.validationErrors.map((err, idx) => (
                <li key={idx} className="text-sm text-red-700">
                  {err}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleValidate}
            disabled={state.validating || !state.drlSource}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {state.validating ? "Validating..." : "Validate"}
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !state.drlSource}
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
