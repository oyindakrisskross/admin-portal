// src/components/catalog/CategoryForm.tsx

import React, { useEffect, useState } from "react";
import type { Category } from "../../types/catalog";
import { useNavigate } from "react-router-dom";
import { createCategory, fetchCategories, updateCategory } from "../../api/catalog";
import ListPageHeader from "../layout/ListPageHeader";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Loader2 } from "lucide-react";

interface Props {
  initial?: Category | null;
};

const EMPTY_CATEGORY: Category = {
  name: "",
};

export const CategoryForm: React.FC<Props> = ({ initial }) => {
  const navigate = useNavigate();
  const [category, setCategory] = useState<Category>(initial ?? EMPTY_CATEGORY);
  const [parent, setParent] = useState<boolean>(initial?.parent_id ? true : false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

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
              {categories.map((cat) => (
                <>
                  { cat.id !== category.id && (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  )}
                </>
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