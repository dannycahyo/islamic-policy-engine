import { useReducer } from "react";
import type { RuleField } from "~/lib/types";
import { SUPPORTED_FIELD_TYPES } from "~/lib/types";

interface FieldSchemaState {
  inputFields: RuleField[];
  resultFields: RuleField[];
}

type FieldSchemaAction =
  | { type: "ADD_INPUT_FIELD" }
  | { type: "ADD_RESULT_FIELD" }
  | { type: "REMOVE_FIELD"; category: "INPUT" | "RESULT"; index: number }
  | {
      type: "UPDATE_FIELD";
      category: "INPUT" | "RESULT";
      index: number;
      key: keyof RuleField;
      value: string | string[] | number;
    }
  | { type: "SET_FIELDS"; inputFields: RuleField[]; resultFields: RuleField[] };

function makeField(category: "INPUT" | "RESULT", order: number): RuleField {
  return {
    fieldName: "",
    fieldType: "STRING",
    fieldCategory: category,
    fieldOrder: order,
  };
}

function schemaReducer(
  state: FieldSchemaState,
  action: FieldSchemaAction
): FieldSchemaState {
  switch (action.type) {
    case "ADD_INPUT_FIELD":
      return {
        ...state,
        inputFields: [
          ...state.inputFields,
          makeField("INPUT", state.inputFields.length),
        ],
      };
    case "ADD_RESULT_FIELD":
      return {
        ...state,
        resultFields: [
          ...state.resultFields,
          makeField("RESULT", state.resultFields.length),
        ],
      };
    case "REMOVE_FIELD": {
      const key =
        action.category === "INPUT" ? "inputFields" : "resultFields";
      const updated = state[key].filter((_, i) => i !== action.index);
      return { ...state, [key]: updated.map((f, i) => ({ ...f, fieldOrder: i })) };
    }
    case "UPDATE_FIELD": {
      const key =
        action.category === "INPUT" ? "inputFields" : "resultFields";
      const fields = [...state[key]];
      fields[action.index] = {
        ...fields[action.index],
        [action.key]: action.value,
      } as RuleField;
      // If type changed away from ENUM, clear enumValues
      if (
        action.key === "fieldType" &&
        action.value !== "ENUM" &&
        fields[action.index].enumValues
      ) {
        fields[action.index] = { ...fields[action.index], enumValues: undefined };
      }
      return { ...state, [key]: fields };
    }
    case "SET_FIELDS":
      return {
        inputFields: action.inputFields,
        resultFields: action.resultFields,
      };
    default:
      return state;
  }
}

function FieldRow({
  field,
  category,
  index,
  dispatch,
}: {
  field: RuleField;
  category: "INPUT" | "RESULT";
  index: number;
  dispatch: React.Dispatch<FieldSchemaAction>;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="flex-1">
        <label className="mb-1 block text-xs font-medium text-gray-500">
          Field Name
        </label>
        <input
          type="text"
          value={field.fieldName}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_FIELD",
              category,
              index,
              key: "fieldName",
              value: e.target.value,
            })
          }
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="e.g., creditScore"
        />
      </div>
      <div className="w-36">
        <label className="mb-1 block text-xs font-medium text-gray-500">
          Type
        </label>
        <select
          value={field.fieldType}
          onChange={(e) =>
            dispatch({
              type: "UPDATE_FIELD",
              category,
              index,
              key: "fieldType",
              value: e.target.value,
            })
          }
          className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          {SUPPORTED_FIELD_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      {field.fieldType === "ENUM" && (
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">
            Enum Values (comma-separated)
          </label>
          <input
            type="text"
            value={field.enumValues?.join(",") ?? ""}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_FIELD",
                category,
                index,
                key: "enumValues",
                value: e.target.value
                  .split(",")
                  .map((v) => v.trim())
                  .filter(Boolean),
              })
            }
            className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="e.g., SILVER,GOLD,PLATINUM"
          />
        </div>
      )}
      <div className="pt-5">
        <button
          type="button"
          onClick={() => dispatch({ type: "REMOVE_FIELD", category, index })}
          className="text-red-400 hover:text-red-600"
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
    </div>
  );
}

export function FieldSchemaBuilder({
  initialInputFields,
  initialResultFields,
  onChange,
}: {
  initialInputFields?: RuleField[];
  initialResultFields?: RuleField[];
  onChange: (inputFields: RuleField[], resultFields: RuleField[]) => void;
}) {
  const [state, dispatch] = useReducer(schemaReducer, {
    inputFields: initialInputFields ?? [],
    resultFields: initialResultFields ?? [],
  });

  // Notify parent on every change
  const dispatchAndNotify = (action: FieldSchemaAction) => {
    // We use a workaround: compute next state manually for notification
    const nextState = schemaReducer(state, action);
    dispatch(action);
    onChange(nextState.inputFields, nextState.resultFields);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">
        Field Schema
      </h2>
      <p className="mb-4 text-sm text-gray-500">
        Define input fields (used in conditions) and result fields (set by
        actions). These define the data structure for your rule.
      </p>

      {/* Input Fields */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Input Fields</h3>
          <button
            type="button"
            onClick={() => dispatchAndNotify({ type: "ADD_INPUT_FIELD" })}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
          >
            + Add Input Field
          </button>
        </div>

        {state.inputFields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 py-4 text-center text-sm text-gray-400">
            No input fields defined. Click &quot;+ Add Input Field&quot; to
            create one.
          </p>
        ) : (
          <div className="space-y-2">
            {state.inputFields.map((field, index) => (
              <FieldRow
                key={index}
                field={field}
                category="INPUT"
                index={index}
                dispatch={dispatchAndNotify}
              />
            ))}
          </div>
        )}
      </div>

      {/* Result Fields */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Result Fields</h3>
          <button
            type="button"
            onClick={() => dispatchAndNotify({ type: "ADD_RESULT_FIELD" })}
            className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
          >
            + Add Result Field
          </button>
        </div>

        {state.resultFields.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 py-4 text-center text-sm text-gray-400">
            No result fields defined. Click &quot;+ Add Result Field&quot; to
            create one.
          </p>
        ) : (
          <div className="space-y-2">
            {state.resultFields.map((field, index) => (
              <FieldRow
                key={index}
                field={field}
                category="RESULT"
                index={index}
                dispatch={dispatchAndNotify}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
