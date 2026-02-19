import { useReducer } from "react";
import { useFetcher } from "react-router";
import type { EvaluationResponse, RuleField } from "~/lib/types";

interface TestState {
  input: string;
}

type TestAction = { type: "SET_INPUT"; value: string };

function testReducer(state: TestState, action: TestAction): TestState {
  switch (action.type) {
    case "SET_INPUT":
      return { ...state, input: action.value };
    default:
      return state;
  }
}

function generateSampleInput(fields: RuleField[]): string {
  const inputFields = fields.filter((f) => f.fieldCategory === "INPUT");
  if (inputFields.length === 0) return "{}";

  const sample: Record<string, unknown> = {};
  for (const field of inputFields) {
    switch (field.fieldType) {
      case "STRING":
        sample[field.fieldName] = "example";
        break;
      case "INTEGER":
        sample[field.fieldName] = 0;
        break;
      case "BIG_DECIMAL":
        sample[field.fieldName] = 0.0;
        break;
      case "BOOLEAN":
        sample[field.fieldName] = false;
        break;
      case "ENUM":
        sample[field.fieldName] =
          field.enumValues && field.enumValues.length > 0
            ? field.enumValues[0]
            : "VALUE";
        break;
      case "LIST_STRING":
        sample[field.fieldName] = [];
        break;
      default:
        sample[field.fieldName] = null;
    }
  }
  return JSON.stringify(sample, null, 2);
}

interface ActionData {
  success: boolean;
  result?: EvaluationResponse;
  message?: string;
}

export function TestRunner({
  ruleId,
  fields,
}: {
  ruleId: string | number;
  fields: RuleField[];
}) {
  const fetcher = useFetcher<ActionData>();
  const [state, dispatch] = useReducer(testReducer, {
    input: generateSampleInput(fields),
  });

  const isLoading = fetcher.state !== "idle";
  const actionData = fetcher.data;

  function handleRun() {
    try {
      JSON.parse(state.input);
    } catch {
      return;
    }
    fetcher.submit(
      { inputData: state.input },
      { method: "POST" }
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Test Input (JSON)
        </label>
        <textarea
          value={state.input}
          onChange={(e) => dispatch({ type: "SET_INPUT", value: e.target.value })}
          rows={12}
          className="w-full rounded-lg border border-gray-300 bg-gray-900 px-4 py-3 font-mono text-sm text-green-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="Enter JSON input..."
        />
      </div>

      <button
        onClick={handleRun}
        disabled={isLoading}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Running...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
            </svg>
            Run Test
          </>
        )}
      </button>

      {actionData && !actionData.success && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">Error</p>
          <p className="mt-1 text-sm text-red-600">{actionData.message}</p>
        </div>
      )}

      {actionData?.success && actionData.result && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-700">Result</h4>
          <div className="rounded-lg border border-gray-200 bg-gray-900 p-4">
            <div className="mb-2 flex items-center gap-4 text-xs text-gray-400">
              <span>Evaluation: {actionData.result.evaluationMs}ms</span>
              <span>Rule v{actionData.result.ruleVersion}</span>
            </div>
            <pre className="overflow-auto text-sm text-green-400">
              {JSON.stringify(actionData.result.result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
