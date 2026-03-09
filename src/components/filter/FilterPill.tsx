// src/components/filter/FilterPill.tsx

import React from "react";
import type { FilterClause, ColumnMeta } from "../../types/filters";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface Props {
  clause: FilterClause;
  columns: ColumnMeta[];
  onEdit: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onDelete: () => void;
}

const operatorLabels: Record<string, string> = {
  contains: "contains",
  equals: "is",
  starts_with: "starts with",
  ends_with: "ends with",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  "=": "is",
  "!=": "is not",
  "<": "<",
  "<=": "<=",
  ">": ">",
  ">=": ">=",
  between: "is between",
  on: "is",
  before: "is before",
  after: "is after",
  on_or_before: "is on or before",
  on_or_after: "is on or after",
  relative: "is relative to today",
};

function formatValue(value: any, operator?: string): string {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) {
    if (operator === "between" && value.length === 2) return `${value[0]} -> ${value[1]}`;
    return value.join(", ");
  }
  if (typeof value === "object" && value.label) return value.label;
  return String(value);
}

export const FilterPill: React.FC<Props> = ({ clause, columns, onEdit, onDelete }) => {
  const column = columns.find((c) => c.id === clause.field);
  const label = column?.label ?? clause.field;
  const opLabel = operatorLabels[clause.operator] ?? clause.operator;
  const choiceLabelFor = (raw: any) => {
    const match = column?.choices?.find((opt) => String(opt.value) === String(raw));
    return match?.label ?? String(raw);
  };
  const textValue =
    column?.type === "choice"
      ? Array.isArray(clause.value)
        ? clause.value.map((v) => choiceLabelFor(v)).join(", ")
        : clause.value == null || clause.value === ""
          ? ""
          : choiceLabelFor(clause.value)
      : formatValue(clause.value, clause.operator);

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-kk-dark-input-border bg-kk-dark-bg px-2 py-0.5 text-[11px] text-kk-muted">
      <button type="button" onClick={(event) => onEdit(event)} className="flex items-center gap-1">
        <span className="font-medium text-kk-foreground">{label}</span>
        <span className="text-kk-muted">{opLabel}</span>
        {textValue ? <span className="text-kk-foreground">{textValue}</span> : null}
      </button>
      <div className="flex items-center gap-0.5">
        <button type="button" onClick={onDelete} className="rounded-full p-0.5 hover:bg-kk-dark-hover">
          <XMarkIcon className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
