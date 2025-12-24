// src/screens/settings/TaxListPage.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import type { TaxRule } from "../../../types/catalog";
import { fetchTaxRules } from "../../../api/catalog";
import { Plus } from "lucide-react";
import { useAuth } from "../../../auth/AuthContext";

export const TaxListPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [taxes, setTaxes] = useState<TaxRule[] | null>([]);

  useEffect(() => {
    (async () => {
      const data = await  fetchTaxRules();
      setTaxes(data.results);
    })();
  }, []);

  const handleOnClick = (id: number) => {
    if (!can("Taxes", "edit")) return;
    
    navigate(`/settings/taxes/${id}/edit`)
  };

  return (
    <div className="flex-1 flex gap-4">
      <div className="flex flex-col gap-4 w-full">
        <ListPageHeader 
          title= "Tax Rules"
          right= {
            <>
              {can("Taxes","create") && (
                <button
                  onClick={() => navigate("/settings/taxes/new")} 
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
                <th>Tax Name</th>
                <th>Rate (%)</th>
              </tr>
            </thead>
            {taxes?.length ? (
              <tbody>
                {taxes?.map((t) => (
                  <tr
                    key={t.id}
                    className="cursor-pointer"
                    onClick={() => handleOnClick(t.id!)}
                  >
                    <td>{t.name}</td>
                    <td>{t.rate}</td>
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
                    No Tax Rules yet. Click "New" to create your first one.
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