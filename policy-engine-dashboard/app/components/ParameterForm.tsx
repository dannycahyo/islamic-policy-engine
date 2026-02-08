import { useReducer } from "react";
import type { RuleParameter } from "~/lib/types";

interface ParameterFormState {
  parameters: RuleParameter[];
}

type ParameterFormAction =
  | { type: "UPDATE_PARAM"; index: number; field: keyof RuleParameter; value: string }
  | { type: "ADD_PARAM" }
  | { type: "REMOVE_PARAM"; index: number }
  | { type: "SET_PARAMS"; parameters: RuleParameter[] };

function parameterReducer(
  state: ParameterFormState,
  action: ParameterFormAction
): ParameterFormState {
  switch (action.type) {
    case "UPDATE_PARAM": {
      const parameters = [...state.parameters];
      parameters[action.index] = {
        ...parameters[action.index],
        [action.field]: action.value,
      };
      return { parameters };
    }
    case "ADD_PARAM":
      return {
        parameters: [
          ...state.parameters,
          { key: "", value: "", type: "STRING", description: "" },
        ],
      };
    case "REMOVE_PARAM":
      return {
        parameters: state.parameters.filter((_, i) => i !== action.index),
      };
    case "SET_PARAMS":
      return { parameters: action.parameters };
    default:
      return state;
  }
}

export function ParameterForm({
  initialParameters,
  name,
}: {
  initialParameters: RuleParameter[];
  name: string;
}) {
  const [state, dispatch] = useReducer(parameterReducer, {
    parameters: initialParameters,
  });

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Parameters</h3>
        <button
          type="button"
          onClick={() => dispatch({ type: "ADD_PARAM" })}
          className="rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
        >
          + Add Parameter
        </button>
      </div>

      {state.parameters.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-sm text-gray-400">
          No parameters defined. Click "Add Parameter" to create one.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Key
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Value
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Description
                </th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {state.parameters.map((param, index) => (
                <tr key={index}>
                  <td className="px-3 py-2">
                    <input
                      type="hidden"
                      name={`${name}[${index}].key`}
                      value={param.key}
                    />
                    <input
                      type="text"
                      value={param.key}
                      onChange={(e) =>
                        dispatch({
                          type: "UPDATE_PARAM",
                          index,
                          field: "key",
                          value: e.target.value,
                        })
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="key"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="hidden"
                      name={`${name}[${index}].value`}
                      value={param.value}
                    />
                    <input
                      type="text"
                      value={param.value}
                      onChange={(e) =>
                        dispatch({
                          type: "UPDATE_PARAM",
                          index,
                          field: "value",
                          value: e.target.value,
                        })
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="value"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="hidden"
                      name={`${name}[${index}].type`}
                      value={param.type}
                    />
                    <select
                      value={param.type}
                      onChange={(e) =>
                        dispatch({
                          type: "UPDATE_PARAM",
                          index,
                          field: "type",
                          value: e.target.value,
                        })
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="STRING">STRING</option>
                      <option value="INTEGER">INTEGER</option>
                      <option value="DOUBLE">DOUBLE</option>
                      <option value="BOOLEAN">BOOLEAN</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="hidden"
                      name={`${name}[${index}].description`}
                      value={param.description}
                    />
                    <input
                      type="text"
                      value={param.description}
                      onChange={(e) =>
                        dispatch({
                          type: "UPDATE_PARAM",
                          index,
                          field: "description",
                          value: e.target.value,
                        })
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      placeholder="description"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({ type: "REMOVE_PARAM", index })
                      }
                      className="text-red-400 hover:text-red-600"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
