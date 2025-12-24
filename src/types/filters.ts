// src/types/filters.ts

export type ColumnDataType = "text" | "number" | "date" | "boolean" | "choice";

export interface ColumnMeta {
  id: string;                    // field name used in API, e.g. "name"
  label: string;                 // display label, e.g. "Name"
  type: ColumnDataType;
  choices?: { value: string; label: string }[]; // for "choice"
}

export interface FilterClause {
  field: string;                 // matches a ColumnMeta.id
  operator: string;              // e.g. "contains", "=", "between"
  value: any;                    // depends on operator and type
}

export interface FilterSet {
  clauses: FilterClause[];
}
