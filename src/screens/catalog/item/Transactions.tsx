// src/screens/catalog/item/Transactions.tsx

import React, { useEffect, useState } from "react";

import type { InventoryTransaction } from "../../../types/catalog";
import { fetchItemTrnxs } from "../../../api/catalog";

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
  
  useEffect(() => {
    (async () => {
      const data = await fetchItemTrnxs({"item": itemId});
      setTranxs(data.results);
    })();
  }, [itemId]);

  return (
    <div>
      <table className="min-w-full">
        <thead>
          <tr>
            <th>Date</th>
            <th>Reference</th>
            <th>Reason</th>
            <th>Quantity Change</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {trnxs.map((t) => (
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