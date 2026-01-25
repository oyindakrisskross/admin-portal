// src/screens/catalog/item/Locations.tsx

import React, { useEffect, useMemo, useState } from "react";

import type { Inventory } from "../../../types/catalog";
import { fetchInventory } from "../../../api/catalog";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";

interface Props {
  itemId: number;
}

export const Locations: React.FC<Props> = ({ itemId }) => {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [sort, setSort] = useState<SortState<"location" | "stock" | "wasted" | "reorder"> | null>(null);

  useEffect(() => {
    (async () => {
      const data = await fetchInventory({"item": itemId});
      setInventories(data.results);
    })();
  }, [itemId]);

  const rows = useMemo(() => {
    return sortBy(inventories, sort, {
      location: (r) => r.location_name ?? "",
      stock: (r) => r.stock_qty ?? "",
      wasted: (r) => r.wasted ?? "",
      reorder: (r) => r.reorder_point ?? "",
    });
  }, [inventories, sort]);

  return (
    <div>
      <table className="min-w-full">
        <thead>
          <tr>
            <th
              className="cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "location"))}
            >
              Location{sortIndicator(sort, "location")}
            </th>
            <th
              className="cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "stock"))}
            >
              Stock Qty{sortIndicator(sort, "stock")}
            </th>
            <th
              className="cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "wasted"))}
            >
              Wasted Qty{sortIndicator(sort, "wasted")}
            </th>
            <th
              className="cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "reorder"))}
            >
              Reorder Point{sortIndicator(sort, "reorder")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td>{t.location_name}</td>
              <td>{t.stock_qty}</td>
              <td>{t.wasted}</td>
              <td>{t.reorder_point}</td>
            </tr>
          ))}

          {!inventories.length && (
            <tr>
              <td
                colSpan={4}
                className="px-3 py-10 text-center text-xs text-kk-dark-text-muted"
              >
                No inventory yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
