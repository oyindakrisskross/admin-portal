import React, { useMemo, useState, useEffect } from "react";

import type { ColumnMeta, ColumnDataType, FilterClause } from "../../types/filters";

interface Props {
  open: boolean;
  columns: ColumnMeta[];
  initial?: FilterClause | null;
  onSubmit: (clause: FilterClause) => void;
  onClose: () => void;
}

interface OperatorDef {
  id: string;
  label: string;
  needs: "none" | "one" | "range" | "relativeDate";
}

const TEXT_OPERATORS: OperatorDef[] = [
  { id: "contains", label: "contains", needs: "one" },
  { id: "equals", label: "is exactly", needs: "one" },
  { id: "starts_with", label: "starts with", needs: "one" },
  { id: "ends_with", label: "ends with", needs: "one" },
  { id: "is_empty", label: "is empty", needs: "none" },
  { id: "is_not_empty", label: "is not empty", needs: "none" },
];

const NUMBER_OPERATORS: OperatorDef[] = [
  { id: "=", label: "is", needs: "one" },
  { id: "!=", label: "is not", needs: "one" },
  { id: ">", label: ">", needs: "one" },
  { id: ">=", label: "≥", needs: "one" },
  { id: "<", label: "<", needs: "one" },
  { id: "<=", label: "≤", needs: "one" },
  { id: "between", label: "is between", needs: "range" },
];

const DATE_OPERATORS: OperatorDef[] = [
  { id: "on", label: "is", needs: "one" },
  { id: "before", label: "is before", needs: "one" },
  { id: "after", label: "is after", needs: "one" },
  { id: "between", label: "is between", needs: "range" },
  { id: "relative", label: "is relative to today", needs: "relativeDate" },
];

const BOOLEAN_OPERATORS: OperatorDef[] = [
  { id: "=", label: "is", needs: "one" },
];

const CHOICE_OPERATORS: OperatorDef[] = [
  { id: "in", label: "is", needs: "one" },
  { id: "not_in", label: "is not", needs: "one" },
];

function getOperators(type: ColumnDataType): OperatorDef[] {
  switch (type) {
    case "text":
      return TEXT_OPERATORS;
    case "number":
      return NUMBER_OPERATORS;
    case "date":
      return DATE_OPERATORS;
    case "boolean":
      return BOOLEAN_OPERATORS;
    case "choice":
      return CHOICE_OPERATORS;
    default:
      return TEXT_OPERATORS;
  }
}

export const FilterDropdown: React.FC<Props> = ({
  open,
  columns,
  initial,
  onSubmit,
  onClose,
}) => {
  const [step, setStep] = useState<"field" | "operator">(
    initial ? "operator" : "field"
  );

  const [fieldId, setFieldId] = useState<string | null>(initial?.field ?? null);
  const [operator, setOperator] = useState<string | null>(
    initial?.operator ?? null
  );
  const [value, setValue] = useState<any>(initial?.value ?? "");

  const filterColumns: ColumnMeta[] = [
    { id: "name", label: "Name", type: "text" },
    { id: "type_id", label: "Type", type: "choice", choices: [
        { value: "GOOD", label: "Good" },
        { value: "SERVICE", label: "Service" },
      ]
    },
    { id: "status", label: "Status", type: "choice", choices: [
        { value: "ACTIVE", label: "Active" },
        { value: "INACTIVE", label: "Inactive" },
      ]
    },
    { id: "min_price", label: "Min price", type: "number" },
    { id: "max_price", label: "Max price", type: "number" },
    { id: "created_by", label: "Created date", type: "date" },
  ];

  const column = useMemo(
    () => columns.find((c) => c.id === fieldId) ?? null,
    [columns, fieldId]
  );

  const operators = useMemo(
    () => (column ? getOperators(column.type) : []),
    [column]
  );

  if (!open) return null;

  const handleFieldSelect = (id: string) => {
    setFieldId(id);
    setStep("operator");
    setOperator(null);
    setValue("");
  };

  const handleOperatorSelect = (op: OperatorDef) => {
    setOperator(op.id);
    if (op.needs === "none") {
      onSubmit({
        field: fieldId!,
        operator: op.id,
        value: null,
      });
      onClose();
    }
  };

  const handleApply = () => {
    if (!fieldId || !operator) return;
    onSubmit({
      field: fieldId,
      operator,
      value,
    });
    onClose();
  };

  // --- value editors ----

  const currentOperatorDef = operators.find((o) => o.id === operator);

  const renderValueEditor = () => {
    if (!column || !currentOperatorDef) return null;

    // No value needed
    if (currentOperatorDef.needs === "none") return null;

    // Text / number / single date
    if (currentOperatorDef.needs === "one") {
      if (column.type === "boolean") {
        return (
          <select
            className="w-full rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
            value={value === true ? "true" : value === false ? "false" : ""}
            onChange={(e) =>
              setValue(e.target.value === "true" ? true : e.target.value === "false" ? false : "")
            }
          >
            <option value="">Select…</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      }

      if (column.type === "choice" && column.choices) {
        return (
          <select
            className="w-full rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
            value={value ?? ""}
            onChange={(e) => setValue(e.target.value || null)}
          >
            <option value="">Select…</option>
            {column.choices.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      }

      if (column.type === "number") {
        return (
          <input
            type="number"
            className="w-full rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
            value={value ?? ""}
            onChange={(e) =>
              setValue(e.target.value === "" ? null : Number(e.target.value))
            }
          />
        );
      }

      if (column.type === "date") {
        return (
          <input
            type="date"
            className="w-full rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
            value={value ?? ""}
            onChange={(e) => setValue(e.target.value || null)}
          />
        );
      }

      // default text
      return (
        <input
          type="text"
          className="w-full rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
          value={value ?? ""}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type a value…"
        />
      );
    }

    // Range (number / date)
    if (currentOperatorDef.needs === "range") {
      const v0 = Array.isArray(value) ? value[0] : "";
      const v1 = Array.isArray(value) ? value[1] : "";
      const commonProps = {
        className:
          "w-full rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs",
      };

      const onChange0 = (val: string) =>
        setValue((prev: any) => [val, Array.isArray(prev) ? prev[1] : ""]);
      const onChange1 = (val: string) =>
        setValue((prev: any) => [Array.isArray(prev) ? prev[0] : "", val]);

      if (column.type === "number") {
        return (
          <div className="flex flex-wrap gap-1 items-center">
            <input
              type="number"
              {...commonProps}
              value={v0}
              onChange={(e) => onChange0(e.target.value)}
            />
            <span className="text-[10px] text-kk-muted">to</span>
            <input
              type="number"
              {...commonProps}
              value={v1}
              onChange={(e) => onChange1(e.target.value)}
            />
          </div>
        );
      }

      // date
      return (
        <div className="flex flex-wrap gap-1 items-center">
          <input
            type="date"
            {...commonProps}
            value={v0}
            onChange={(e) => onChange0(e.target.value)}
          />
          <span className="text-[10px] text-kk-muted">to</span>
          <input
            type="date"
            {...commonProps}
            value={v1}
            onChange={(e) => onChange1(e.target.value)}
          />
        </div>
      );
    }

    // Relative date (basic version)
    if (currentOperatorDef.needs === "relativeDate") {
      const rel = value || { direction: "this", unit: "week" };
      return (
        <div className="flex gap-1 items-center text-[11px]">
          <select
            className="rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-1.5 py-0.5"
            value={rel.direction}
            onChange={(e) =>
              setValue({ ...rel, direction: e.target.value })
            }
          >
            <option value="past">Past</option>
            <option value="next">Next</option>
            <option value="this">This</option>
          </select>
          <select
            className="rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-1.5 py-0.5"
            value={rel.unit}
            onChange={(e) => setValue({ ...rel, unit: e.target.value })}
          >
            <option value="day">day</option>
            <option value="week">week</option>
            <option value="month">month</option>
          </select>
        </div>
      );
    }

    return null;
  };

  // --- layout ---

  return (
    <div className="absolute z-40 mt-2 w-80 top-full -right-1/2 rounded-xl border border-kk-dark-input-border bg-kk-dark-bg-elevated shadow-xl">
      <div className="flex border-b border-kk-dark-input-border">
        {/* Field list */}
        <div className="w-1/2 max-h-64 overflow-y-auto p-2">
          <div className="mb-1 text-[10px] uppercase tracking-wide text-kk-muted">
            Filter by…
          </div>
          {columns.map((col) => (
            <button
              key={col.id}
              type="button"
              onClick={() => handleFieldSelect(col.id)}
              className={`w-full rounded-md px-2 py-1 text-left text-xs hover:bg-kk-dark-hover ${
                fieldId === col.id ? "bg-kk-dark-hover" : ""
              }`}
            >
              {col.label}
            </button>
          ))}
        </div>

        {/* Operator + value */}
        <div className="w-1/2 border-l border-kk-dark-input-border p-2 flex flex-col gap-2">
          {column ? (
            <>
              <div className="text-[11px] font-medium text-kk-foreground">
                {column.label}
              </div>
              <div className="flex flex-col gap-1">
                {operators.map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => handleOperatorSelect(op)}
                    className={`w-full rounded-md px-2 py-0.5 text-left text-[11px] hover:bg-kk-dark-hover ${
                      operator === op.id ? "bg-kk-dark-hover" : ""
                    }`}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
              {currentOperatorDef && currentOperatorDef.needs !== "none" && (
                <>
                  <div className="mt-1 text-[10px] text-kk-muted">Value</div>
                  {renderValueEditor()}
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-full px-2 py-0.5 text-[11px] text-kk-muted hover:bg-kk-dark-hover"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApply}
                      className="rounded-full bg-emerald-600 px-3 py-0.5 text-[11px] font-semibold text-white hover:bg-emerald-700"
                    >
                      Apply
                    </button>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-[11px] text-kk-muted mt-4">
              Choose a field to filter.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
