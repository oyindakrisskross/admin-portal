// src/screens/settings/access-control/PermCategoryListPage.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import type { PermissionCategory } from "../../../types/accounts";
import { fetchPermissionCategories } from "../../../api/accounts";
import { Plus } from "lucide-react";
import { FilterBar } from "../../../components/filter/FilterBar";
import type { FilterSet, ColumnMeta } from "../../../types/filters";
import { useAuth } from "../../../auth/AuthContext";

export const PermCategoryListPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<PermissionCategory[]>([]);
  const [filters, setFilters] = useState<FilterSet>({ clauses: [] })

  const filterColumns: ColumnMeta[] = [
      { id: "portal_name", label: "Portal Name", type: "text" },
    ];

  useEffect(() => {
    (async () => {
      const data = await fetchPermissionCategories();
      setCategories(data.results);
    })();
  },[]);

  const handleOnClick = (id: number) => {
    if (!can("Permission Categories", "edit")) return;
    
    navigate(`/settings/permission-categories/${id}/edit`)
  };

  return (
    <div className="flex-1 flex gap-4">
      <div className="flex flex-col gap-4 w-full">
        <ListPageHeader 
          title = "Permission Categories"
          right = {
            <div className="flex items-center gap-1 text-xs">
              <FilterBar 
                columns={filterColumns}
                filters={filters}
                onChange={setFilters}
              />
              {can("Permission Categories", "create") && (
                <button
                  onClick={() => navigate("/settings/permission-categories/new")} 
                  className="new inline-flex items-center gap-1 rounded-full"
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
              )}
            </div>
          }
        />

        {/* Table */}
        <div className="overflow-hidden px-4">
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Permission Category</th>
                <th>Portal Name</th>
              </tr>
            </thead>
            {categories?.length ? (
              <tbody>
                {categories?.map((c) => (
                  <tr
                    key={c.id}
                    className="cursor-pointer"
                    onClick={() => handleOnClick(c.id!)}
                  >
                    <td>{c.name}</td>
                    <td>{c.portal_name}</td>
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
                    No Permission Categories yet. Click "New" to create your first one.
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