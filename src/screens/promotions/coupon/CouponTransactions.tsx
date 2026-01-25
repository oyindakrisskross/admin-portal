import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { InvoiceResponse } from "../../../types/invoice";
import { fetchOrders } from "../../../api/invoice";
import { formatMoneyNGN } from "../../../helpers";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";

interface Props {
  couponCode: string;
}

export const CouponTransactions: React.FC<Props> = ({ couponCode }) => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [sort, setSort] = useState<
    SortState<"number" | "date" | "status" | "location" | "total"> | null
  >(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchOrders({ coupon_code: couponCode, page_size: 500 });
        if (!cancelled) setInvoices(data.results);
      } catch {
        if (!cancelled) setInvoices([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [couponCode]);

  const rows = useMemo(() => {
    return sortBy(invoices, sort, {
      number: (i) => i.number ?? "",
      date: (i) => new Date(i.invoice_date),
      status: (i) => i.status ?? "",
      location: (i) => i.location_name ?? "",
      total: (i) => i.grand_total ?? "",
    });
  }, [invoices, sort]);

  const toDateStr = (str: string) => {
    const date = new Date(str);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div>
      <table className="min-w-full">
        <thead>
          <tr>
            <th
              className="cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "number"))}
            >
              Invoice{sortIndicator(sort, "number")}
            </th>
            <th
              className="cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "date"))}
            >
              Date{sortIndicator(sort, "date")}
            </th>
            <th
              className="cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "status"))}
            >
              Status{sortIndicator(sort, "status")}
            </th>
            <th
              className="cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "location"))}
            >
              Location{sortIndicator(sort, "location")}
            </th>
            <th
              className="cursor-pointer select-none text-right"
              onClick={() => setSort((s) => nextSort(s, "total"))}
            >
              Total{sortIndicator(sort, "total")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr
              key={i.id}
              className="cursor-pointer"
              onClick={() => navigate(`/sales/invoices/${i.id}`)}
            >
              <td className="hover:underline hover:underline-offset-4 hover:decoration-dotted">
                {i.number}
              </td>
              <td>{toDateStr(i.invoice_date)}</td>
              <td>
                <span
                  className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium ${
                    i.status === "PAID"
                      ? "bg-emerald-50 text-emerald-700"
                      : i.status === "VOID"
                        ? "bg-red-400 text-red-50"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {i.status}
                </span>
              </td>
              <td>{i.location_name}</td>
              <td className="text-right">{formatMoneyNGN(+i.grand_total)}</td>
            </tr>
          ))}

          {!rows.length && (
            <tr>
              <td
                colSpan={5}
                className="px-3 py-10 text-center text-xs text-kk-dark-text-muted"
              >
                No invoices found for this coupon.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

