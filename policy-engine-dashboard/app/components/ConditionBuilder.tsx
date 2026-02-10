import { useReducer, useEffect, useCallback, useRef } from "react";
import type {
  FactMetadata,
  ConditionRow,
  ActionRow,
  RuleDefinition,
  FieldDefinition,
} from "~/lib/types";
import { generateDrl } from "~/lib/api";
import { DrlEditor } from "./DrlEditor";

// State

interface BuilderState {
  factType: string;
  conditions: ConditionRow[];
  actions: ActionRow[];
  generatedDrl: string;
  drlLoading: boolean;
  drlError: string | null;
}

type BuilderAction =
  | { type: "SET_FACT_TYPE"; factType: string }
  | { type: "ADD_CONDITION" }
  | { type: "REMOVE_CONDITION"; id: string }
  | {
      type: "UPDATE_CONDITION";
      id: string;
      field: keyof ConditionRow;
      value: string;
    }
  | { type: "ADD_ACTION" }
  | { type: "REMOVE_ACTION"; id: string }
  | { type: "UPDATE_ACTION"; id: string; field: keyof ActionRow; value: string }
  | { type: "SET_DRL"; drl: string }
  | { type: "SET_DRL_LOADING"; loading: boolean }
  | { type: "SET_DRL_ERROR"; error: string | null }
  | { type: "RESET"; factType: string };

let nextId = 1;
function makeId() {
  return String(nextId++);
}

function builderReducer(
  state: BuilderState,
  action: BuilderAction
): BuilderState {
  switch (action.type) {
    case "SET_FACT_TYPE":
      return {
        ...state,
        factType: action.factType,
        conditions: [],
        actions: [],
        generatedDrl: "",
        drlError: null,
      };
    case "ADD_CONDITION":
      return {
        ...state,
        conditions: [
          ...state.conditions,
          {
            id: makeId(),
            field: "",
            operator: "",
            value: "",
            valueType: "",
          },
        ],
      };
    case "REMOVE_CONDITION":
      return {
        ...state,
        conditions: state.conditions.filter((c) => c.id !== action.id),
      };
    case "UPDATE_CONDITION":
      return {
        ...state,
        conditions: state.conditions.map((c) =>
          c.id === action.id ? { ...c, [action.field]: action.value } : c
        ),
      };
    case "ADD_ACTION":
      return {
        ...state,
        actions: [
          ...state.actions,
          { id: makeId(), field: "", value: "", valueType: "" },
        ],
      };
    case "REMOVE_ACTION":
      return {
        ...state,
        actions: state.actions.filter((a) => a.id !== action.id),
      };
    case "UPDATE_ACTION":
      return {
        ...state,
        actions: state.actions.map((a) =>
          a.id === action.id ? { ...a, [action.field]: action.value } : a
        ),
      };
    case "SET_DRL":
      return { ...state, generatedDrl: action.drl, drlLoading: false };
    case "SET_DRL_LOADING":
      return { ...state, drlLoading: action.loading };
    case "SET_DRL_ERROR":
      return { ...state, drlError: action.error, drlLoading: false };
    case "RESET":
      return {
        factType: action.factType,
        conditions: [],
        actions: [],
        generatedDrl: "",
        drlLoading: false,
        drlError: null,
      };
    default:
      return state;
  }
}

// Component

export function ConditionBuilder({
  metadata,
  ruleName,
  policyType,
  initialFactType,
  onDrlChange,
}: {
  metadata: FactMetadata;
  ruleName: string;
  policyType: string;
  initialFactType: string;
  onDrlChange?: (drl: string) => void;
}) {
  const [state, dispatch] = useReducer(builderReducer, {
    factType: initialFactType,
    conditions: [],
    actions: [],
    generatedDrl: "",
    drlLoading: false,
    drlError: null,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when fact type changes from outside (policy type change)
  useEffect(() => {
    if (initialFactType && initialFactType !== state.factType) {
      dispatch({ type: "RESET", factType: initialFactType });
    }
  }, [initialFactType]);

  const factDef = metadata.facts[state.factType];
  const inputFields = factDef?.inputFields ?? {};
  const resultFields = factDef?.resultFields ?? {};

  // Generate DRL preview (debounced)
  const generatePreview = useCallback(() => {
    const hasConditions = state.conditions.some(
      (c) => c.field && c.operator && c.value
    );
    const hasActions = state.actions.some((a) => a.field && a.value);

    if (!hasConditions && !hasActions) {
      dispatch({ type: "SET_DRL", drl: "" });
      onDrlChange?.("");
      return;
    }

    const definition: RuleDefinition = {
      ruleName: ruleName || "New Rule",
      policyType,
      factType: state.factType,
      conditions: state.conditions
        .filter((c) => c.field && c.operator && c.value)
        .map(({ field, operator, value, valueType }) => ({
          field,
          operator,
          value,
          valueType,
        })),
      actions: state.actions
        .filter((a) => a.field && a.value)
        .map(({ field, value, valueType }) => ({ field, value, valueType })),
    };

    dispatch({ type: "SET_DRL_LOADING", loading: true });
    dispatch({ type: "SET_DRL_ERROR", error: null });

    generateDrl(definition)
      .then((res) => {
        dispatch({ type: "SET_DRL", drl: res.drl });
        onDrlChange?.(res.drl);
      })
      .catch((err) => {
        dispatch({
          type: "SET_DRL_ERROR",
          error: err instanceof Error ? err.message : "Failed to generate DRL",
        });
      });
  }, [
    state.conditions,
    state.actions,
    state.factType,
    ruleName,
    policyType,
    onDrlChange,
  ]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(generatePreview, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [generatePreview]);

  function getOperatorsForField(fieldName: string): string[] {
    const fieldDef = inputFields[fieldName];
    if (!fieldDef) return [];
    return metadata.operators[fieldDef.type] ?? [];
  }

  function handleConditionFieldChange(id: string, newField: string) {
    const fieldDef = inputFields[newField];
    const valueType = fieldDef?.type ?? "";
    const operators = metadata.operators[valueType] ?? [];
    dispatch({
      type: "UPDATE_CONDITION",
      id,
      field: "field",
      value: newField,
    });
    dispatch({
      type: "UPDATE_CONDITION",
      id,
      field: "valueType",
      value: valueType,
    });
    dispatch({
      type: "UPDATE_CONDITION",
      id,
      field: "operator",
      value: operators[0] ?? "",
    });
    dispatch({ type: "UPDATE_CONDITION", id, field: "value", value: "" });
  }

  function handleActionFieldChange(id: string, newField: string) {
    const fieldDef = resultFields[newField];
    const valueType = fieldDef?.type ?? "";
    dispatch({ type: "UPDATE_ACTION", id, field: "field", value: newField });
    dispatch({
      type: "UPDATE_ACTION",
      id,
      field: "valueType",
      value: valueType,
    });
    dispatch({ type: "UPDATE_ACTION", id, field: "value", value: "" });
  }

  return (
    <div className="space-y-6">
      {/* Conditions Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Conditions (when)
          </h2>
          <button
            type="button"
            onClick={() => dispatch({ type: "ADD_CONDITION" })}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
          >
            + Add Condition
          </button>
        </div>

        {state.conditions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-sm text-gray-400">
            No conditions defined. Click &quot;+ Add Condition&quot; to add
            one.
          </p>
        ) : (
          <div className="space-y-3">
            {state.conditions.map((condition, index) => (
              <ConditionRowUI
                key={condition.id}
                condition={condition}
                index={index}
                inputFields={inputFields}
                operators={getOperatorsForField(condition.field)}
                onFieldChange={(field) =>
                  handleConditionFieldChange(condition.id, field)
                }
                onOperatorChange={(op) =>
                  dispatch({
                    type: "UPDATE_CONDITION",
                    id: condition.id,
                    field: "operator",
                    value: op,
                  })
                }
                onValueChange={(val) =>
                  dispatch({
                    type: "UPDATE_CONDITION",
                    id: condition.id,
                    field: "value",
                    value: val,
                  })
                }
                onRemove={() =>
                  dispatch({ type: "REMOVE_CONDITION", id: condition.id })
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Actions (then)
          </h2>
          <button
            type="button"
            onClick={() => dispatch({ type: "ADD_ACTION" })}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
          >
            + Add Action
          </button>
        </div>

        {state.actions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-sm text-gray-400">
            No actions defined. Click &quot;+ Add Action&quot; to add one.
          </p>
        ) : (
          <div className="space-y-3">
            {state.actions.map((action, index) => (
              <ActionRowUI
                key={action.id}
                action={action}
                index={index}
                resultFields={resultFields}
                onFieldChange={(field) =>
                  handleActionFieldChange(action.id, field)
                }
                onValueChange={(val) =>
                  dispatch({
                    type: "UPDATE_ACTION",
                    id: action.id,
                    field: "value",
                    value: val,
                  })
                }
                onRemove={() =>
                  dispatch({ type: "REMOVE_ACTION", id: action.id })
                }
              />
            ))}
          </div>
        )}
      </div>

      {/* DRL Preview */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          DRL Preview
        </h2>
        {state.drlLoading && (
          <div className="mb-2 text-sm text-gray-500">Generating DRL...</div>
        )}
        {state.drlError && (
          <div className="mb-2 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{state.drlError}</p>
          </div>
        )}
        {state.generatedDrl ? (
          <DrlEditor value={state.generatedDrl} readOnly height="250px" />
        ) : (
          <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-sm text-gray-400">
            Add conditions and actions to preview the generated DRL.
          </p>
        )}
      </div>
    </div>
  );
}

// Sub-components

function ConditionRowUI({
  condition,
  index,
  inputFields,
  operators,
  onFieldChange,
  onOperatorChange,
  onValueChange,
  onRemove,
}: {
  condition: ConditionRow;
  index: number;
  inputFields: Record<string, FieldDefinition>;
  operators: string[];
  onFieldChange: (field: string) => void;
  onOperatorChange: (op: string) => void;
  onValueChange: (val: string) => void;
  onRemove: () => void;
}) {
  const fieldDef = condition.field ? inputFields[condition.field] : null;

  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-xs font-medium text-gray-500">
        {index === 0 ? "IF" : "AND"}
      </span>

      {/* Field selector */}
      <select
        value={condition.field}
        onChange={(e) => onFieldChange(e.target.value)}
        className="w-44 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <option value="">Select field...</option>
        {Object.keys(inputFields).map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      {/* Operator selector */}
      <select
        value={condition.operator}
        onChange={(e) => onOperatorChange(e.target.value)}
        disabled={!condition.field}
        className="w-20 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
      >
        <option value="">--</option>
        {operators.map((op) => (
          <option key={op} value={op}>
            {op}
          </option>
        ))}
      </select>

      {/* Value input */}
      <ValueInput
        fieldDef={fieldDef}
        value={condition.value}
        onChange={onValueChange}
        disabled={!condition.field}
      />

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 text-red-400 hover:text-red-600"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
          />
        </svg>
      </button>
    </div>
  );
}

function ActionRowUI({
  action,
  index,
  resultFields,
  onFieldChange,
  onValueChange,
  onRemove,
}: {
  action: ActionRow;
  index: number;
  resultFields: Record<string, FieldDefinition>;
  onFieldChange: (field: string) => void;
  onValueChange: (val: string) => void;
  onRemove: () => void;
}) {
  const fieldDef = action.field ? resultFields[action.field] : null;

  return (
    <div className="flex items-center gap-2">
      <span className="w-10 shrink-0 text-xs font-medium text-gray-500">
        {index === 0 ? "SET" : "SET"}
      </span>

      {/* Field selector */}
      <select
        value={action.field}
        onChange={(e) => onFieldChange(e.target.value)}
        className="w-44 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <option value="">Select field...</option>
        {Object.keys(resultFields).map((f) => (
          <option key={f} value={f}>
            {f}
          </option>
        ))}
      </select>

      <span className="text-sm text-gray-500">=</span>

      {/* Value input */}
      <ValueInput
        fieldDef={fieldDef}
        value={action.value}
        onChange={onValueChange}
        disabled={!action.field}
      />

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 text-red-400 hover:text-red-600"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
          />
        </svg>
      </button>
    </div>
  );
}

function ValueInput({
  fieldDef,
  value,
  onChange,
  disabled,
}: {
  fieldDef: FieldDefinition | null;
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
}) {
  if (!fieldDef || disabled) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled
        placeholder="Select a field first"
        className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-50"
      />
    );
  }

  switch (fieldDef.type) {
    case "ENUM":
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">Select value...</option>
          {fieldDef.enumValues?.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      );
    case "BOOLEAN":
      return (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">Select value...</option>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      );
    case "BIG_DECIMAL":
    case "INTEGER":
      return (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter number"
          step={fieldDef.type === "BIG_DECIMAL" ? "any" : "1"}
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      );
    case "STRING":
    case "LIST_STRING":
    default:
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter value"
          className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      );
  }
}
