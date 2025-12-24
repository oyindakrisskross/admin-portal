import React, { useState } from "react";

import type { FilterSet, ColumnMeta, FilterClause } from "../../types/filters";
import { FilterPill } from "./FilterPill";
import { FilterDropdown } from "./FilterDropdown";
import { FunnelIcon } from "@heroicons/react/24/outline";

interface Props {
  columns: ColumnMeta[];
  filters: FilterSet;
  onChange: (filters: FilterSet) => void;
}

export const FilterBar: React.FC<Props> = ({
  columns,
  filters,
  onChange,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleAddOrEdit = (clause: FilterClause) => {
    if (editingIndex != null) {
      const next = [...filters.clauses];
      next[editingIndex] = clause;
      onChange({ clauses: next });
    } else {
      onChange({ clauses: [...filters.clauses, clause] });
    }
    setEditingIndex(null);
  };

  const openForNew = () => {
    setEditingIndex(null);
    setDropdownOpen(true);
  };

  const openForEdit = (index: number) => {
    setEditingIndex(index);
    setDropdownOpen(true);
  };

  const currentInitial =
    editingIndex != null ? filters.clauses[editingIndex] : null;

  const hasFilters = filters.clauses.length > 0;

  return (
    <div className="relative flex items-center gap-2">
      {/* Funnel button */}
      <button
        type="button"
        disabled={hasFilters}
        onClick={ () => {
          if (dropdownOpen) {
            setDropdownOpen(false);
          } 
          if (!dropdownOpen && !hasFilters) {
            openForNew();
          }
        }}
        className={`p-[0.6em]  ${
          hasFilters
            ? "text-purple-500 cursor-default"
            : "text-kk-muted"
        }`}
      >
        <span className="tooltip-t">Filter</span>
        <FunnelIcon className="h-4 w-4" />
      </button>

      {/* Pills */}
      {filters.clauses.map((clause, idx) => (
        <FilterPill
          key={idx}
          clause={clause}
          columns={columns}
          onEdit={() => openForEdit(idx)}
          onDelete={() =>
            onChange({
              clauses: filters.clauses.filter((_, i) => i !== idx),
            })
          }
        />
      ))}

      {/* + Filter pill */}
      {hasFilters && (
        <button
          type="button"
          onClick={openForNew}
          className="text-[11px] rounded-full bg-kk-dark-bg px-2 py-1 text-kk-muted hover:bg-kk-dark-hover"
        >
          + Filter
        </button>
      )}

      {/* Dropdown */}
      <FilterDropdown
        key={editingIndex ?? "new"}
        open={dropdownOpen}
        columns={columns}
        initial={currentInitial}
        onSubmit={handleAddOrEdit}
        onClose={() => {
          setDropdownOpen(false);
          setEditingIndex(null);
        }}
      />
    </div>
  );
};
