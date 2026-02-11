import {
  Link,
  useLoaderData,
  useActionData,
  useNavigation,
  useOutletContext,
  Form,
  isRouteErrorResponse,
} from "react-router";
import { useReducer, useEffect } from "react";
import type { Route } from "./+types/_layout.rules.$ruleId.drl";
import { getRule, updateRule, getFactMetadata, validateDrl } from "~/lib/api";
import type { Rule, FactMetadata } from "~/lib/types";
import { POLICY_TYPE_TO_FACT } from "~/lib/types";
import { DrlEditor } from "~/components/DrlEditor";
import { ConditionBuilder } from "~/components/ConditionBuilder";
import type { LayoutContext } from "./_layout";

interface DrlPageData {
  rule: Rule;
  metadata: FactMetadata;
}

type EditorMode = "visual" | "code";

interface DrlState {
  drlSource: string;
  validationError: string | null;
  editorMode: EditorMode;
  validating: boolean;
}

type DrlAction =
  | { type: "SET_SOURCE"; value: string }
  | { type: "SET_VALIDATION_ERROR"; error: string | null }
  | { type: "SET_EDITOR_MODE"; mode: EditorMode }
  | { type: "SET_VALIDATING"; value: boolean };

function drlReducer(state: DrlState, action: DrlAction): DrlState {
  switch (action.type) {
    case "SET_SOURCE":
      return { ...state, drlSource: action.value, validationError: null };
    case "SET_VALIDATION_ERROR":
      return {
        ...state,
        validationError: action.error,
        validating: false,
      };
    case "SET_EDITOR_MODE":
      return { ...state, editorMode: action.mode };
    case "SET_VALIDATING":
      return { ...state, validating: action.value };
    default:
      return state;
  }
}

export async function loader({
  params,
}: Route.LoaderArgs): Promise<DrlPageData> {
  const [rule, metadata] = await Promise.all([
    getRule(params.ruleId),
    getFactMetadata(),
  ]);
  return { rule, metadata };
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const drlSource = formData.get("drlSource") as string;
  const name = formData.get("ruleName") as string;
  const description = formData.get("ruleDescription") as string;
  const parametersJson = formData.get("ruleParameters") as string;

  try {
    const parameters = JSON.parse(parametersJson || "[]");
    await updateRule(params.ruleId, {
      name,
      description,
      drlSource,
      parameters,
    });
    return { success: true, message: "DRL source saved successfully" };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to save DRL",
    };
  }
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Failed to load DRL editor";
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

export default function DrlEditorPage() {
  const { rule, metadata } = useLoaderData<DrlPageData>();
  const actionData = useActionData<{ success: boolean; message: string }>();
  const navigation = useNavigation();
  const { dispatch } = useOutletContext<LayoutContext>();
  const isSubmitting = navigation.state === "submitting";

  const [state, drlDispatch] = useReducer(drlReducer, {
    drlSource: rule.drlSource || "",
    validationError: null,
    editorMode: "code" as EditorMode,
    validating: false,
  });

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

  async function handleValidate() {
    if (!state.drlSource.trim()) {
      drlDispatch({
        type: "SET_VALIDATION_ERROR",
        error: "DRL source cannot be empty",
      });
      return;
    }
    drlDispatch({ type: "SET_VALIDATING", value: true });
    try {
      const result = await validateDrl(state.drlSource);
      if (result.valid) {
        drlDispatch({ type: "SET_VALIDATION_ERROR", error: null });
        dispatch({
          type: "ADD_TOAST",
          payload: { message: "DRL validation passed", type: "success" },
        });
      } else {
        drlDispatch({
          type: "SET_VALIDATION_ERROR",
          error: result.errors.join("; "),
        });
      }
    } catch (err) {
      drlDispatch({
        type: "SET_VALIDATION_ERROR",
        error:
          err instanceof Error ? err.message : "Validation request failed",
      });
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
        <Link to="/rules" className="hover:text-gray-700">
          Rules
        </Link>
        <span>/</span>
        <Link to={`/rules/${rule.id}`} className="hover:text-gray-700">
          {rule.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900">DRL Editor</span>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Edit DRL Source
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {rule.name} - Drools Rule Language editor
          </p>
        </div>

        {/* Editor mode toggle */}
        <div className="flex rounded-lg border border-gray-300 bg-white">
          <button
            type="button"
            onClick={() =>
              drlDispatch({ type: "SET_EDITOR_MODE", mode: "visual" })
            }
            className={`px-4 py-2 text-sm font-medium ${
              state.editorMode === "visual"
                ? "bg-emerald-600 text-white"
                : "text-gray-700 hover:bg-gray-50"
            } rounded-l-lg`}
          >
            Visual Editor
          </button>
          <button
            type="button"
            onClick={() =>
              drlDispatch({ type: "SET_EDITOR_MODE", mode: "code" })
            }
            className={`px-4 py-2 text-sm font-medium ${
              state.editorMode === "code"
                ? "bg-emerald-600 text-white"
                : "text-gray-700 hover:bg-gray-50"
            } rounded-r-lg`}
          >
            Code Editor
          </button>
        </div>
      </div>

      <Form method="post">
        <input type="hidden" name="drlSource" value={state.drlSource} />
        <input type="hidden" name="ruleName" value={rule.name} />
        <input
          type="hidden"
          name="ruleDescription"
          value={rule.description}
        />
        <input
          type="hidden"
          name="ruleParameters"
          value={JSON.stringify(rule.parameters)}
        />

        {state.editorMode === "visual" ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-700">
                The visual editor creates new rules from scratch. Existing
                DRL code from the code editor will be replaced when you build
                conditions and actions below.
              </p>
            </div>
            <ConditionBuilder
              metadata={metadata}
              ruleName={rule.name}
              policyType={rule.policyType}
              initialFactType={factType}
              parameters={rule.parameters}
              onDrlChange={(drl) =>
                drlDispatch({ type: "SET_SOURCE", value: drl })
              }
            />
          </div>
        ) : (
          <DrlEditor
            value={state.drlSource}
            onChange={(v) =>
              drlDispatch({ type: "SET_SOURCE", value: v })
            }
            height="500px"
          />
        )}

        {state.validationError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{state.validationError}</p>
          </div>
        )}

        <div className="mt-4 flex gap-3">
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
            disabled={isSubmitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save DRL"}
          </button>
          <Link
            to={`/rules/${rule.id}`}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </Form>
    </div>
  );
}
