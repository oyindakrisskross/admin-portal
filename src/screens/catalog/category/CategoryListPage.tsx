// src/screens/catalog/category/CategoryListPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { fetchCategories } from "../../../api/catalog";
import type { Category } from "../../../types/catalog";
import { useAuth } from "../../../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import { Plus } from "lucide-react";
import { buildCategoryTree } from "../../../utils/categoryTree";

export const CategoryListPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[] | null>([]);

  const nameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of categories ?? []) {
      if (c?.id != null) m.set(Number(c.id), String(c.name ?? `Category #${c.id}`));
    }
    return m;
  }, [categories]);

  const treeRows = useMemo(() => {
    const rows = categories ?? [];
    return buildCategoryTree(rows).options;
  }, [categories]);

  useEffect(() => {
    (async () => {
      const data = await fetchCategories();
      setCategories(data.results);
    })();
  },[]);

  const handleOnClick = (id: number) => {
    if (!can("Category", "edit")) return;

    navigate(`/catalog/categories/${id}/edit`)
  };

  return (
    <div className="flex-1 flex gap-4">
      <div className="flex flex-col gap-4 w-full">
        <ListPageHeader 
          title="Categories"
          right= {
            <>
              {can("Category", "create") && (
                <button
                  onClick={() => navigate("/catalog/categories/new")} 
                  className="new inline-flex items-center gap-1 rounded-full"
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
              )}
            </>
          }
        />

        {/* Table */}
        <div className="overflow-hidden px-4">
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Parent</th>
              </tr>
            </thead>
            {categories?.length ? (
              <tbody>
                {treeRows.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => handleOnClick(c.id)}
                  >
                    <td style={c.depth ? { paddingLeft: `${c.depth * 18}px` } : undefined}>
                      {c.label}
                    </td>
                    <td>
                      {c.parentId ? nameById.get(c.parentId) ?? "-" : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            ) : (
              <tbody>
                <tr>
                  <td
                    colSpan={2}
                    className="px-3 py-10 text-center text-xs text-kk-dark-text-muted"
                  >
                    No Categories yet. Click "New" to create your first one.
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
