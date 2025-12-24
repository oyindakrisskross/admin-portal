// src/screens/settings/UnitListPage.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import type { Unit } from "../../../types/catalog";
import { fetchUnits } from "../../../api/catalog";
import { Plus } from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";

export const UnitListPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [units, setUnits] = useState<Unit[] | null>([]);

  useEffect(() => {
    (async () => {
      const data = await  fetchUnits();
      setUnits(data.results);
    })();
  }, []);

  const handleOnClick = (id: number) => {
    if (!can("Units", "edit")) return;
    
    navigate(`/settings/units/${id}/edit`)
  };

  return (
    <div className="flex-1 flex gap-4">
      <div className="flex flex-col gap-4 w-full">
        <ListPageHeader 
          title= "Units"
          right= {
            <>
            {can("Units", "create") && (
              <button
                onClick={() => navigate("/settings/units/new")} 
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
                <th>Unit Name</th>
                <th>Symbol</th>
              </tr>
            </thead>
            {units?.length ? (
              <tbody>
                {units?.map((t) => (
                  <tr
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => handleOnClick(t.id!)}
                  >
                    <td>{t.name}</td>
                    <td>{t.symbol}</td>
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
                    No Units yet. Click "New" to create your first one.
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