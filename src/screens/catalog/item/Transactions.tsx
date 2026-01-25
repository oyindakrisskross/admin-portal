// src/screens/catalog/item/Transactions.tsx

import React, { useEffect, useMemo, useState } from "react";

import type { InventoryTransaction } from "../../../types/catalog";
import { fetchItemTrnxs } from "../../../api/catalog";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";

interface Props {
  itemId: number;
}

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

export const Transactions: React.FC<Props> = ({ itemId }) => {
  const [trnxs, setTranxs] = useState<InventoryTransaction[]>([]);
  const [sort, setSort] = useState<SortState<"date" | "reference" | "reason" | "qty"> | null>(null);
  
  useEffect(() => {
    (async () => {
      const data = await fetchItemTrnxs({"item": itemId});
      setTranxs(data.results);
    })();
  }, [itemId]);

  const rows = useMemo(() => {
    return sortBy(trnxs, sort, {
      date: (t) => new Date(t.created_on),
      reference: (t) => t.reference ?? "",
      reason: (t) => t.reason ?? "",
      qty: (t) => t.qty_change ?? "",
    });
  }, [trnxs, sort]);

  return (
    <div>
      <table className="min-w-full">
        <thead>
          <tr>
            <th
              className="cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "date"))}
            >
              Date{sortIndicator(sort, "date")}
            </th>
            <th
              className="cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "reference"))}
            >
              Reference{sortIndicator(sort, "reference")}
            </th>
            <th
              className="cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "reason"))}
            >
              Reason{sortIndicator(sort, "reason")}
            </th>
            <th
              className="cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "qty"))}
            >
              Quantity Change{sortIndicator(sort, "qty")}
            </th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id}>
              <td>
                {
                  Intl.DateTimeFormat('en-GB', DATE_OPTS)
                  .format(new Date(t.created_on))
                }
              </td>
              <td>
                {t.reference}
              </td>
              <td>{t.reason}</td>
              <td>
                {t.qty_change}
              </td>
              <td></td>
              <td></td>
            </tr>
          ))}

          {!trnxs.length && (
            <tr>
              <td
                colSpan={5}
                className="px-3 py-10 text-center text-xs text-kk-dark-text-muted"
              >
                No transactions yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
