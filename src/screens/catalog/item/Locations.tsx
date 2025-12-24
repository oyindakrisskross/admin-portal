// src/screens/catalog/item/Locations.tsx

import React, { useEffect, useState } from "react";

import type { Inventory } from "../../../types/catalog";
import { fetchInventory } from "../../../api/catalog";

interface Props {
  itemId: number;
}

export const Locations: React.FC<Props> = ({ itemId }) => {
  const [inventories, setInventories] = useState<Inventory[]>([]);

  useEffect(() => {
    (async () => {
      const data = await fetchInventory({"item": itemId});
      setInventories(data.results);
    })();
  }, [itemId]);

  return (
    <div>
      <table className="min-w-full">
        <thead>
          <tr>
            <th>Location</th>
            <th>Stock Qty</th>
            <th>Wasted Qty</th>
            <th>Reorder Point</th>
          </tr>
        </thead>
        <tbody>
          {inventories.map((t) => (
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