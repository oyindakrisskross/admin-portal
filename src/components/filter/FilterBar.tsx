import React, { useEffect, useRef, useState } from "react";

import type { FilterSet, ColumnMeta, FilterClause } from "../../types/filters";
import { FilterPill } from "./FilterPill";
import { FilterDropdown } from "./FilterDropdown";
import { FunnelIcon } from "@heroicons/react/24/outline";

interface Props {
  columns: ColumnMeta[];
  filters: FilterSet;
  onChange: (filters: FilterSet) => void;
  showTrigger?: boolean;
  showPills?: boolean;
}

export const FilterBar: React.FC<Props> = ({
  columns,
  filters,
  onChange,
  showTrigger = true,
  showPills = true,
}) => {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [dropdownAnchorLeft, setDropdownAnchorLeft] = useState(0);

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

  const setAnchorFrom = (target: HTMLElement | null, maxDropdownWidth = 384) => {
    if (!target || !barRef.current) {
      setDropdownAnchorLeft(0);
      return;
    }

    const viewportPadding = 8;
    const barRect = barRef.current.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const desiredLeft = targetRect.left - barRect.left;

    const minLeft = viewportPadding - barRect.left;
    const maxLeft = window.innerWidth - viewportPadding - maxDropdownWidth - barRect.left;
    const clampedLeft = Math.min(Math.max(desiredLeft, minLeft), maxLeft);
    setDropdownAnchorLeft(clampedLeft);
  };

  const openForNew = (target: HTMLElement | null) => {
    setEditingIndex(null);
    // New filter starts at compact width; anchor under trigger rather than
    // clamping with the wider edit panel width.
    setAnchorFrom(target, 192);
    setDropdownOpen(true);
  };

  const openForEdit = (index: number, target: HTMLElement | null) => {
    setEditingIndex(index);
    setAnchorFrom(target);
    setDropdownOpen(true);
  };

  const currentInitial =
    editingIndex != null ? filters.clauses[editingIndex] : null;

  const hasFilters = filters.clauses.length > 0;

  useEffect(() => {
    if (!dropdownOpen) return;

    const onMouseDown = (event: MouseEvent) => {
      if (!barRef.current) return;
      if (!barRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
        setEditingIndex(null);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDropdownOpen(false);
      setEditingIndex(null);
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [dropdownOpen]);

  return (
    <div
      ref={barRef}
      className={`relative flex flex-wrap items-center gap-2 ${showTrigger && !showPills ? "order-first" : ""}`}
    >
      {showTrigger ? (
        <button
          type="button"
          onClick={(event) => {
            if (dropdownOpen) {
              setDropdownOpen(false);
              return;
            }
            if (!dropdownOpen) {
              openForNew(event.currentTarget);
            }
          }}
          className={`rounded-md p-2 ${hasFilters ? "text-purple-500" : "text-kk-muted"} hover:bg-kk-dark-hover`}
        >
          <span className="tooltip-t">Filter</span>
          <FunnelIcon className="h-4 w-4" />
        </button>
      ) : null}

      {showPills ? (
        <>
          {filters.clauses.map((clause, idx) => (
            <FilterPill
              key={idx}
              clause={clause}
              columns={columns}
              onEdit={(event) => openForEdit(idx, event.currentTarget)}
              onDelete={() =>
                onChange({
                  clauses: filters.clauses.filter((_, i) => i !== idx),
                })
              }
            />
          ))}

          {hasFilters && (
            <button
              type="button"
              onClick={(event) => openForNew(event.currentTarget)}
              className="text-[11px] rounded-full bg-kk-dark-bg px-2 py-1 text-kk-muted hover:bg-kk-dark-hover"
            >
              + Filter
            </button>
          )}
        </>
      ) : null}

      {/* Dropdown */}
      <FilterDropdown
        key={editingIndex ?? "new"}
        open={dropdownOpen}
        columns={columns}
        initial={currentInitial}
        anchorLeft={dropdownAnchorLeft}
        onSubmit={handleAddOrEdit}
        onClose={() => {
          setDropdownOpen(false);
          setEditingIndex(null);
        }}
      />
    </div>
  );
};
