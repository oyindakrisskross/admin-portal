// src/components/catalog/CategoryForm.tsx

import React, { useEffect, useMemo, useState } from "react";
import type { Category } from "../../types/catalog";
import { useNavigate } from "react-router-dom";
import { createCategory, deleteCategory, fetchCategories, updateCategory } from "../../api/catalog";
import ListPageHeader from "../layout/ListPageHeader";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Loader2 } from "lucide-react";
import { buildCategoryTree } from "../../utils/categoryTree";
import { useAuth } from "../../auth/AuthContext";

interface Props {
  initial?: Category | null;
};

const EMPTY_CATEGORY: Category = {
  name: "",
};

export const CategoryForm: React.FC<Props> = ({ initial }) => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category>(initial ?? EMPTY_CATEGORY);
  const [parent, setParent] = useState<boolean>(initial?.parent_id ? true : false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const disallowedParentIds = useMemo(() => {
    const id = category.id;
    if (!id) return new Set<number>();
    const descendants = categoryTree.descendantsById[id] ?? [];
    return new Set<number>([id, ...descendants]);
  }, [category.id, categoryTree.descendantsById]);

  const handleChange = (patch: Partial<Category>) => {
    setCategory((c) => ({ ...c, ...patch }));
  };

  const handleParentChange = (event) => {
    setParent(event.target.checked);

    if (!event.target.checked) {
      handleChange({ parent_id: null });
    }
  }

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload: Category = category;

      if (category.id) {
        await updateCategory(category.id, payload);
      } else {
        await createCategory(payload);
      }

      navigate(`/catalog/categories`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!category.id) return;
    if (!confirm("Delete this category?")) return;
    setSaving(true);
    setError(null);
    try {
      await deleteCategory(category.id);
      navigate(`/catalog/categories`);
    } catch (err: any) {
      const data = err?.response?.data;
      const detail = typeof data === "string" ? data : data?.detail;
      setError(String(detail ?? "Unable to delete category."));
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    (async () => {
      const data = await fetchCategories();
      setCategories(data.results);
    })();
  },[]);

  return (
    <>
      <ListPageHeader 
        title={initial ? `Edit ${initial?.name}` : "New Category"}
        right = {
          <button
            onClick={() => navigate("/catalog/categories")}
            className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-kk-muted hover:text-gray-100"
          >
            <XMarkIcon className="h-7 w-7" />
          </button>
        }
      />

      <div className="flex flex-col gap-6 text-sm px-6 pt-4 pb-8">
        {error && (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Name</p>
          <div className="col-span-5">
            <input
              type="text"
              className="rounded-md border border-kk-dark-input-border px-3 py-2 w-full"
              value={category.name}
              onChange={(e) => handleChange({ name: e.target.value })}
            />
            <label>
              <input 
                type="checkbox"
                className="h-3 w-3 rounded border-slate-300 mx-2 mt-3"
                checked={parent}
                onChange={handleParentChange}
              />
              This is a child Category
            </label>
          </div>
        </div>

        { parent && (
          <div className="grid grid-cols-12 gap-2">
            <p className="col-span-2">Parent Category</p>
            <select
              className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 col-span-5"
              defaultValue={undefined}
              value={category.parent_id ? category.parent_id : undefined}
              onChange={(e) => handleChange({ parent_id: +e.target.value })}
            >
              <option value={undefined} disabled>Select a Category</option>
              {categoryTree.options
                .filter((opt) => !disallowedParentIds.has(opt.id))
                .map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {`${"— ".repeat(opt.depth)}${opt.label}`}
                  </option>
                ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Description</p>
          <textarea 
            className="min-h-[100px] col-span-5 rounded-md border border-kk-dark-input-border px-3 py-2"
            value={category.description ?? ""}
            onChange={(e) => handleChange({ description: e.target.value })}
          />
        </div>

        {/* Footer buttons */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="danger rounded-full border border-red-600 px-4 py-1.5 text-xs font-medium text-red-600"
          >
            Cancel
          </button>
          {category.id && can("Category", "delete") && (
            <button
              type="button"
              disabled={saving}
              onClick={handleDelete}
              className="rounded-full border border-red-600 px-4 py-1.5 text-xs font-medium text-red-600 hover:bg-[rgba(255,0,0,0.06)] disabled:opacity-60"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </>
  );
};
