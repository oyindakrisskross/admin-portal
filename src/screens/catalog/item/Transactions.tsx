// src/screens/catalog/item/Transactions.tsx

import React, { useEffect, useMemo, useState } from "react";

import type { InventoryTransaction } from "../../../types/catalog";
import { fetchItemTrnxs } from "../../../api/catalog";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";

interface Props {
  itemId: number;
  currentStockOnHand: string;
  showBalance: boolean;
}

const DATE_OPTS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

const formatQty = (value: string | number | null | undefined) => {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num)) return "0.00";
  return Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const Transactions: React.FC<Props> = ({ itemId, currentStockOnHand, showBalance }) => {
  const [trnxs, setTranxs] = useState<InventoryTransaction[]>([]);
  const [sort, setSort] = useState<SortState<"date" | "reference" | "reason" | "qty"> | null>(null);
  
  useEffect(() => {
    (async () => {
      const data = await fetchItemTrnxs({"item": itemId});
      setTranxs(data.results);
    })();
  }, [itemId]);

  const rows = useMemo(() => {
    const chronologicalRows = [...trnxs].sort((a, b) => {
      const timeA = new Date(a.created_on).getTime();
      const timeB = new Date(b.created_on).getTime();
      if (timeA !== timeB) return timeB - timeA;
      return b.id - a.id;
    });

    let runningBalance = Number(currentStockOnHand ?? 0);
    const balanceById = new Map<number, number>();

    chronologicalRows.forEach((trx) => {
      balanceById.set(trx.id, runningBalance);
      const qtyChange = Number(trx.qty_change ?? 0);
      if (Number.isFinite(qtyChange)) {
        runningBalance -= qtyChange;
      }
    });

    return sortBy(trnxs, sort, {
      date: (t) => new Date(t.created_on),
      reference: (t) => t.reference ?? "",
      reason: (t) => t.reason ?? "",
      qty: (t) => t.qty_change ?? "",
    }).map((trx) => ({
      ...trx,
      balance_after: balanceById.get(trx.id),
    }));
  }, [currentStockOnHand, trnxs, sort]);

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
            {showBalance ? <th>Balance</th> : null}
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
                {formatQty(t.qty_change)}
              </td>
              {showBalance ? <td>{formatQty(t.balance_after)}</td> : null}
            </tr>
          ))}

          {!trnxs.length && (
            <tr>
              <td
                colSpan={showBalance ? 5 : 4}
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
