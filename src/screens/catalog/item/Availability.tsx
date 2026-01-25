import React, { useEffect, useMemo, useState } from "react";

import type { Item, ItemAvailability } from "../../../types/catalog";
import { fetchItem } from "../../../api/catalog";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";

interface Props {
  itemId: number;
}

export const Availability: React.FC<Props> = ({ itemId }) => {
  const [item, setItem] = useState<Item | null>(null);
  const [sort, setSort] = useState<SortState<"location"> | null>(null);

  useEffect(() => {
    (async () => {
      const data = await fetchItem(itemId);
      setItem(data);
    })();
  }, [itemId]);

  const rows = useMemo(() => {
    const list: ItemAvailability[] = item?.availabilities ?? [];
    const base = [...list];
    return sortBy(base, sort, {
      location: (a) => a.location_name ?? a.location,
    });
  }, [item?.availabilities, sort]);

  if (!item) {
    return (
      <div className="text-xs text-kk-dark-text-muted">Loading availability…</div>
    );
  }

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
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id ?? a.location}>
              <td>{a.location_name ?? a.location}</td>
            </tr>
          ))}

          {!rows.length && (
            <tr>
              <td className="px-3 py-10 text-center text-xs text-kk-dark-text-muted">
                No availability configured.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

