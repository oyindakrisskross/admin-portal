// src/components/catalog/bulk/BulkEditCategoriesModal.tsx

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import type { Category } from "../../../types/catalog";
import { fetchCategories } from "../../../api/catalog";
import { buildCategoryTree } from "../../../utils/categoryTree";

export function BulkEditCategoriesModal(props: {
  open: boolean;
  title: string;
  onClose: () => void;
  onApply: (categoryIds: number[], categories: Category[]) => Promise<void> | void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!props.open) return;
    (async () => {
      try {
        const data = await fetchCategories();
        setCategories(data.results ?? []);
      } catch {
        setCategories([]);
      }
    })();
  }, [props.open]);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);

  const toggleCategoryTree = (categoryId: number, checked: boolean) => {
    const ids = [categoryId, ...(categoryTree.descendantsById[categoryId] ?? [])];
    setSelectedCategoryIds((prev) => {
      const idSet = new Set(prev);
      if (checked) ids.forEach((id) => idSet.add(id));
      else ids.forEach((id) => idSet.delete(id));
      return Array.from(idSet);
    });
  };

  const selectedCategories = useMemo(() => {
    const idSet = new Set(selectedCategoryIds);
    return categories.filter((c) => c.id && idSet.has(c.id));
  }, [categories, selectedCategoryIds]);

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm">
      <div className="mt-12 w-full max-w-2xl rounded-2xl shadow-xl border border-kk-dark-border bg-kk-dark-bg-elevated">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{props.title}</h2>
            <p className="text-xs text-kk-dark-text-muted">Select categories to apply to the selected rows.</p>
          </div>
          <button type="button" onClick={props.onClose} className="rounded-full p-1.5 hover:bg-kk-dark-hover">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-kk-dark-input-border px-3 py-1.5 text-xs hover:bg-kk-dark-hover"
              onClick={() => setSelectedCategoryIds(categoryTree.options.map((o) => o.id))}
            >
              Select all
            </button>
            <button
              type="button"
              className="rounded-lg border border-kk-dark-input-border px-3 py-1.5 text-xs hover:bg-kk-dark-hover"
              onClick={() => setSelectedCategoryIds([])}
            >
              Clear
            </button>
            <span className="text-xs text-kk-dark-text-muted">{selectedCategoryIds.length} selected</span>
          </div>

          <div className="max-h-[45vh] overflow-auto rounded-xl border border-kk-dark-input-border p-3">
            {categoryTree.options.map((c) => {
              const checked = selectedCategoryIds.includes(c.id);
              return (
                <label key={c.id} className="flex items-center gap-2 text-sm py-1">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={checked}
                    onChange={(e) => toggleCategoryTree(c.id, e.target.checked)}
                  />
                  <span style={c.depth ? { paddingLeft: `${c.depth * 18}px` } : undefined}>
                    {c.label}
                  </span>
                </label>
              );
            })}
            {!categoryTree.options.length && (
              <div className="py-6 text-center text-xs text-kk-dark-text-muted">No categories available.</div>
            )}
          </div>

          {selectedCategories.length ? (
            <div className="text-xs text-kk-dark-text-muted">
              Applying: {selectedCategories.map((c) => c.name).join(", ")}
            </div>
          ) : (
            <div className="text-xs text-kk-dark-text-muted">Applying: (none)</div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={props.onClose}
              className="rounded-lg border border-kk-dark-input-border px-4 py-2 text-sm hover:bg-kk-dark-hover"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                setSaving(true);
                try {
                  await props.onApply(selectedCategoryIds, selectedCategories);
                  props.onClose();
                } finally {
                  setSaving(false);
                }
              }}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
              disabled={saving}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

