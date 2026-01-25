// src/screens/settings/access-control/RoleListPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import type { Role } from "../../../types/accounts";
import { fetchRoles } from "../../../api/accounts";
import { Plus } from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";

export const RoleListPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [roles, setRoles] = useState<Role[] | null>([]);
  const [sort, setSort] = useState<SortState<"name" | "portal" | "description"> | null>(null);

  const sortedRoles = useMemo(() => {
    const rows = roles ?? [];
    return sortBy(rows, sort, {
      name: (r) => r.name ?? "",
      portal: (r) => r.portal_name ?? "",
      description: (r) => r.description ?? "",
    });
  }, [roles, sort]);

  useEffect(() => {
    (async () => {
      const data = await fetchRoles();
      setRoles(data.results);
    })();
  },[]);

  const handleOnClick = (id: number) => {
    if (!can("Roles", "edit")) return;
    
    navigate(`/settings/roles/${id}/edit`)
  };

  return (
    <div className="flex-1 flex gap-4">
      <div className="flex flex-col gap-4 w-full">
        <ListPageHeader 
          title= "Roles"
          right= {
            <>
              {can("Roles", "create") && (
                <button
                  onClick={() => navigate("/settings/roles/new")} 
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
                <th
                  className="cursor-pointer select-none"
                  onClick={() => setSort((s) => nextSort(s, "name"))}
                >
                  Role Name{sortIndicator(sort, "name")}
                </th>
                <th
                  className="cursor-pointer select-none"
                  onClick={() => setSort((s) => nextSort(s, "portal"))}
                >
                  Portal{sortIndicator(sort, "portal")}
                </th>
                <th
                  className="cursor-pointer select-none"
                  onClick={() => setSort((s) => nextSort(s, "description"))}
                >
                  Description{sortIndicator(sort, "description")}
                </th>
              </tr>
            </thead>
            {roles?.length ? (
              <tbody>
                {sortedRoles.map((r) => (
                  <tr
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => handleOnClick(r.id!)}
                  >
                    <td>{r.name}</td>
                    <td>{r.portal_name}</td>
                    <td>{r.description}</td>
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
                    No Roles yet. Click "New" to create your first one.
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
