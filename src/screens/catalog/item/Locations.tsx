// src/screens/catalog/item/Locations.tsx

import React, { useEffect, useMemo, useState } from "react";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";

import type { Inventory } from "../../../types/catalog";
import { fetchInventory } from "../../../api/catalog";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";

interface Props {
  itemId: number;
}

export const Locations: React.FC<Props> = ({ itemId }) => {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [sort, setSort] = useState<SortState<"location" | "available" | "current" | "wasted" | "reorder"> | null>(null);

  useEffect(() => {
    (async () => {
      const data = await fetchInventory({"item": itemId});
      setInventories(data.results);
    })();
  }, [itemId]);

  const rows = useMemo(() => {
    return sortBy(inventories, sort, {
      location: (r) => r.location_name ?? "",
      available: (r) => r.available_qty ?? r.stock_qty ?? "",
      current: (r) => r.stock_qty ?? "",
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
              onClick={() => setSort((s) => nextSort(s, "available"))}
            >
              <span className="inline-flex items-center gap-1">
                Available Qty{sortIndicator(sort, "available")}
                <span className="help inline-flex items-center">
                  <QuestionMarkCircleIcon className="h-4 w-4 text-kk-dark-text-muted" />
                  <span className="tooltip-r w-[220px]">
                    Stock available after subtracting units currently reserved on held POS orders.
                  </span>
                </span>
              </span>
            </th>
            <th
              className="cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "current"))}
            >
              <span className="inline-flex items-center gap-1">
                Current Qty{sortIndicator(sort, "current")}
                <span className="help inline-flex items-center">
                  <QuestionMarkCircleIcon className="h-4 w-4 text-kk-dark-text-muted" />
                  <span className="tooltip-r w-[220px]">
                    Total stock on hand before subtracting units currently reserved on held POS orders.
                  </span>
                </span>
              </span>
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
              <td>{t.available_qty ?? t.stock_qty}</td>
              <td>{t.stock_qty}</td>
              <td>{t.wasted}</td>
              <td>{t.reorder_point}</td>
            </tr>
          ))}

          {!inventories.length && (
            <tr>
              <td
                colSpan={5}
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
