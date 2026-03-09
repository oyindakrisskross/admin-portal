import React, { useEffect, useMemo, useState } from "react";

import type { ColumnMeta, ColumnDataType, FilterClause } from "../../types/filters";
import { FilterDateConditionPicker } from "../date/FilterDateConditionPicker";

interface Props {
  open: boolean;
  columns: ColumnMeta[];
  initial?: FilterClause | null;
  anchorLeft?: number;
  onSubmit: (clause: FilterClause) => void;
  onClose: () => void;
}

interface OperatorDef {
  id: string;
  label: string;
  needs: "none" | "one" | "range";
};

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
  { id: ">=", label: ">=", needs: "one" },
  { id: "<", label: "<", needs: "one" },
  { id: "<=", label: "<=", needs: "one" },
  { id: "between", label: "is between", needs: "range" },
];

const DATE_OPERATORS: OperatorDef[] = [
  { id: "on", label: "is", needs: "one" },
  { id: "before", label: "is before", needs: "one" },
  { id: "after", label: "is after", needs: "one" },
  { id: "on_or_before", label: "is on or before", needs: "one" },
  { id: "on_or_after", label: "is on or after", needs: "one" },
  { id: "between", label: "is between", needs: "range" },
  { id: "relative", label: "is relative to today", needs: "one" },
];

const BOOLEAN_OPERATORS: OperatorDef[] = [{ id: "=", label: "is", needs: "one" }];

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
  anchorLeft = 0,
  onSubmit,
  onClose,
}) => {
  const [fieldId, setFieldId] = useState<string | null>(initial?.field ?? null);
  const [operator, setOperator] = useState<string | null>(initial?.operator ?? null);
  const [value, setValue] = useState<any>(initial?.value ?? "");
  const [columnSearch, setColumnSearch] = useState("");

  const column = useMemo(() => columns.find((c) => c.id === fieldId) ?? null, [columns, fieldId]);
  const operators = useMemo(() => (column ? getOperators(column.type) : []), [column]);
  const currentOperatorDef = operators.find((o) => o.id === operator);
  const filteredColumns = useMemo(() => {
    const query = columnSearch.trim().toLowerCase();
    if (!query) return columns;
    return columns.filter((col) => col.label.toLowerCase().includes(query));
  }, [columnSearch, columns]);

  useEffect(() => {
    if (!open) return;
    setFieldId(initial?.field ?? null);
    setOperator(initial?.operator ?? null);
    setValue(initial?.value ?? "");
    setColumnSearch("");
  }, [open, initial]);

  if (!open) return null;

  const handleOperatorSelect = (op: OperatorDef) => {
    setOperator(op.id);
  };

  const handleApply = () => {
    if (!fieldId || !operator) return;
    onSubmit({ field: fieldId, operator, value: currentOperatorDef?.needs === "none" ? null : value });
    onClose();
  };

  const handleFieldSelect = (nextFieldId: string) => {
    setFieldId(nextFieldId);
    setOperator(null);
    setValue("");
  };
  const leftAlignStyle = { textAlign: "left" as const };

  const renderValueEditor = () => {
    if (!column || !currentOperatorDef || currentOperatorDef.needs === "none") return null;

    if (currentOperatorDef.needs === "one") {
      if (column.type === "boolean") {
        return (
          <select
            className="w-full rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-left text-xs"
            style={leftAlignStyle}
            value={value === true ? "true" : value === false ? "false" : ""}
            onChange={(e) => setValue(e.target.value === "true" ? true : e.target.value === "false" ? false : "")}
          >
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );
      }

      if (column.type === "choice" && column.choices) {
        if (column.multi) {
          const selectedValues = Array.isArray(value)
            ? value.map((v) => String(v))
            : value != null && value !== ""
              ? [String(value)]
              : [];
          return (
            <select
              multiple
              size={Math.min(6, Math.max(3, column.choices.length))}
              className="w-full rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-left text-xs"
              style={leftAlignStyle}
              value={selectedValues}
              onChange={(e) => {
                const nextValues = Array.from(e.target.selectedOptions).map((opt) => opt.value);
                setValue(nextValues);
              }}
            >
              {column.choices.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          );
        }

        return (
          <select
            className="w-full rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-left text-xs"
            style={leftAlignStyle}
            value={value ?? ""}
            onChange={(e) => setValue(e.target.value || null)}
          >
            <option value="">Select...</option>
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
            onChange={(e) => setValue(e.target.value === "" ? null : Number(e.target.value))}
          />
        );
      }

      return (
        <input
          type="text"
          className="w-full rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
          value={value ?? ""}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type a value..."
        />
      );
    }

    if (currentOperatorDef.needs === "range") {
      const v0 = Array.isArray(value) ? value[0] : "";
      const v1 = Array.isArray(value) ? value[1] : "";

      const onStartChange = (next: string) =>
        setValue((prev: any) => [next, Array.isArray(prev) ? prev[1] : ""]);
      const onEndChange = (next: string) =>
        setValue((prev: any) => [Array.isArray(prev) ? prev[0] : "", next]);

      if (column.type === "number") {
        return (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              className="w-full rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
              value={v0}
              onChange={(e) => onStartChange(e.target.value)}
            />
            <span className="text-[10px] text-kk-muted">to</span>
            <input
              type="number"
              className="w-full rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
              value={v1}
              onChange={(e) => onEndChange(e.target.value)}
            />
          </div>
        );
      }

      return (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            className="w-full rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
            value={v0}
            onChange={(e) => onStartChange(e.target.value)}
            placeholder="Start..."
          />
          <span className="text-[10px] text-kk-muted">to</span>
          <input
            type="text"
            className="w-full rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
            value={v1}
            onChange={(e) => onEndChange(e.target.value)}
            placeholder="End..."
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className={`absolute left-0 top-full z-40 mt-2 rounded-xl border border-kk-dark-input-border bg-kk-dark-bg-elevated shadow-xl max-w-[calc(100vw-1rem)] ${
        column ? (column.type === "date" ? "w-[18.5rem]" : "w-[12rem]") : "w-[12rem]"
      }`}
      style={{ left: `${anchorLeft}px` }}
    >
      {!column ? (
        <div className="p-2">
          <input
            type="text"
            value={columnSearch}
            onChange={(e) => setColumnSearch(e.target.value)}
            placeholder="Filter by..."
            className="w-full rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm text-kk-foreground placeholder:text-kk-muted"
          />
          <div className="mt-2 max-h-80 space-y-1 overflow-y-auto pr-1">
            {filteredColumns.map((col) => (
              <button
                key={col.id}
                type="button"
                onClick={() => handleFieldSelect(col.id)}
                className="w-full rounded-md px-2 py-2 text-left text-sm text-kk-foreground hover:bg-kk-dark-hover"
                style={leftAlignStyle}
              >
                {col.label}
              </button>
            ))}
            {filteredColumns.length === 0 ? (
              <div className="px-2 py-2 text-xs text-kk-muted">No matching columns.</div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="max-h-[30rem] space-y-2 overflow-y-auto p-3">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => {
                setFieldId(null);
                setOperator(null);
                setValue("");
              }}
              className="rounded-md px-2 py-1 text-[11px] text-kk-muted hover:bg-kk-dark-hover"
            >
              Change field
            </button>
            <div className="text-right text-[11px] font-medium text-kk-foreground">{column.label}</div>
          </div>
          {column.type === "date" ? (
            <FilterDateConditionPicker
              initialOperator={operator}
              initialValue={value}
              onApply={(nextOperator, nextValue) => {
                if (!fieldId) return;
                onSubmit({ field: fieldId, operator: nextOperator, value: nextValue });
                onClose();
              }}
              onCancel={onClose}
            />
          ) : (
            <>
              <div className="space-y-1">
                <div className="text-[10px] text-kk-muted">Condition</div>
                <select
                  className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-left text-xs"
                  style={leftAlignStyle}
                  value={operator ?? ""}
                  onChange={(event) => {
                    const nextOp = operators.find((op) => op.id === event.target.value);
                    if (!nextOp) {
                      setOperator(null);
                      return;
                    }
                    handleOperatorSelect(nextOp);
                  }}
                >
                  <option value="" disabled>
                    Select condition...
                  </option>
                  {operators.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>

              {currentOperatorDef ? (
                <div className="space-y-2">
                  {currentOperatorDef.needs !== "none" ? (
                    <>
                      <div className="text-[10px] text-kk-muted">Value</div>
                      {renderValueEditor()}
                    </>
                  ) : null}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-full px-2 py-1 text-[11px] text-kk-muted hover:bg-kk-dark-hover"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApply}
                      className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
};
