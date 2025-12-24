// src/components/filter/FilterPill.tsx

import React from "react";
import type { FilterClause, ColumnMeta } from "../../types/filters";
import { EllipsisHorizontalIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface Props {
  clause: FilterClause;
  columns: ColumnMeta[];
  onEdit: () => void;
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
  "<=": "≤",
  ">": ">",
  ">=": "≥",
  between: "is between",
  on: "is",
  before: "is before",
  after: "is after",
  relative: "is relative to today",
};

function formatValue(value: any): string {
  if (value == null || value === "") return "";
  if (Array.isArray(value)) {
    if (value.length === 2) return `${value[0]} → ${value[1]}`;
    return value.join(", ");
  }
  if (typeof value === "object" && value.label) return value.label;
  return String(value);
}

export const FilterPill: React.FC<Props> = ({
  clause,
  columns,
  onEdit,
  onDelete,
}) => {
  const column = columns.find((c) => c.id === clause.field);
  const label = column?.label ?? clause.field;
  const opLabel = operatorLabels[clause.operator] ?? clause.operator;
  const textValue = formatValue(clause.value);

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-kk-dark-bg px-2 py-0.5 text-[11px] text-kk-muted border border-kk-dark-input-border">
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-1"
      >
        <span className="font-medium text-kk-foreground">{label}</span>
        {/* <span className="text-kk-muted">{opLabel}</span>
        {textValue && <span className="text-kk-foreground">{textValue}</span>} */}
      </button>
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={onDelete}
          className="p-0.5 hover:bg-kk-dark-hover rounded-full"
        >
          <XMarkIcon className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
};
