import React, { useEffect, useMemo, useState } from "react";
import { CreditCard, Search } from "lucide-react";

import ListPageHeader from "../../../components/layout/ListPageHeader";
import SidePeek from "../../../components/layout/SidePeek";
import { formatMoneyNGN } from "../../../helpers";
import { fetchSalesPayment, fetchSalesPayments } from "../../../api/invoice";
import type { PaymentRecord } from "../../../types/invoice";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const methodBadgeClass = (method?: string) => {
  const value = String(method || "").toUpperCase();
  if (value === "CASH") return "bg-emerald-50 text-emerald-700";
  if (value === "CARD") return "bg-blue-50 text-blue-700";
  if (value === "TRANSFER") return "bg-purple-50 text-purple-700";
  return "bg-slate-100 text-slate-600";
};

const invoiceTypeLabel = (typeId?: string) => {
  const value = String(typeId || "").toUpperCase();
  if (value === "PREPAID") return "Pre-Paid";
  if (value === "REFUND") return "Refund";
  return "Sale";
};

const customerName = (row: PaymentRecord) =>
  row.portal_customer_name || row.customer_name || "-";

export const PaymentListPage: React.FC = () => {
  const [rows, setRows] = useState<PaymentRecord[]>([]);
  const [selected, setSelected] = useState<PaymentRecord | null>(null);
  const [sort, setSort] = useState<
    SortState<"invoice" | "date" | "method" | "amount" | "location" | "customer"> | null
  >(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const hasPeek = !!selected;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchSalesPayments({
          search: debouncedSearch || undefined,
          page,
          page_size: pageSize,
        });
        if (cancelled) return;
        setRows(data.results ?? []);
        setTotalCount(Number(data.count ?? 0));
      } catch {
        if (cancelled) return;
        setRows([]);
        setTotalCount(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, page, pageSize]);

  const sortedRows = useMemo(
    () =>
      sortBy(rows, sort, {
        invoice: (p) => `${p.invoice_number || ""}-${p.prepaid_number || ""}`,
        date: (p) => new Date(p.paid_on),
        method: (p) => p.method || "",
        amount: (p) => Number(p.amount || 0),
        location: (p) => p.location_name || "",
        customer: (p) => customerName(p),
      }),
    [rows, sort]
  );

  const openPeek = async (payment: PaymentRecord) => {
    setSelected(payment);
    try {
      const fresh = await fetchSalesPayment(payment.id);
      setSelected((prev) => (prev?.id === fresh.id ? fresh : prev));
      setRows((prev) => prev.map((row) => (row.id === fresh.id ? fresh : row)));
    } catch {
      // Keep list payload if detail fetch fails.
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="flex-1 flex gap-4">
      <div
        className={`flex flex-col gap-4 ${!hasPeek ? "w-full" : "w-1/3"} ${
          hasPeek ? "h-screen overflow-hidden" : ""
        }`}
      >
        <ListPageHeader
          icon={<CreditCard className="h-5 w-5" />}
          section="Sales"
          title="Payments"
          subtitle="Recorded payments across invoices."
          right={
            !hasPeek ? (
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-kk-muted" />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-64 rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-8 py-1.5 text-xs"
                  placeholder="Search invoice, customer, reference"
                />
              </div>
            ) : (
              ""
            )
          }
        />

        {!hasPeek ? (
          <div className="flex items-center justify-between px-3 pb-2 text-xs text-kk-dark-text-muted">
            <div>
              Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}-
              {totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount)} of {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <span>Rows</span>
              <select
                className="rounded border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="rounded border border-kk-dark-input-border px-2 py-1 disabled:opacity-50"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded border border-kk-dark-input-border px-2 py-1 disabled:opacity-50"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}

        <div className={hasPeek ? "flex-1 overflow-y-auto" : "overflow-hidden"}>
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "invoice"))}>
                  {!hasPeek ? "Invoice" : "Payment"}
                  {sortIndicator(sort, "invoice")}
                </th>
                {!hasPeek ? (
                  <>
                    <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "date"))}>
                      Date{sortIndicator(sort, "date")}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "method"))}>
                      Method{sortIndicator(sort, "method")}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "amount"))}>
                      Amount{sortIndicator(sort, "amount")}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "location"))}>
                      Location{sortIndicator(sort, "location")}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "customer"))}>
                      Customer{sortIndicator(sort, "customer")}
                    </th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((payment) => (
                <tr key={payment.id} className="cursor-pointer" onClick={() => void openPeek(payment)}>
                  <td>
                    {!hasPeek ? (
                      <div className="flex flex-col items-start gap-1">
                        <span>{payment.invoice_number}</span>
                        <span className="text-[11px] text-kk-dark-text-muted">
                          {invoiceTypeLabel(payment.invoice_type_id)}
                          {payment.prepaid_number ? ` • ${payment.prepaid_number}` : ""}
                        </span>
                        {payment.reference ? (
                          <span className="text-[11px] text-kk-dark-text-muted">Ref: {payment.reference}</span>
                        ) : null}
                      </div>
                    ) : (
                      <div className="flex flex-col items-start gap-1">
                        <span>{payment.invoice_number}</span>
                        <span className="text-xs text-kk-dark-text-muted">
                          {new Date(payment.paid_on).toLocaleString()}
                        </span>
                        <span
                          className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium ${methodBadgeClass(
                            payment.method
                          )}`}
                        >
                          {payment.method}
                        </span>
                        <span className="text-sm font-medium">{formatMoneyNGN(Number(payment.amount || 0))}</span>
                      </div>
                    )}
                  </td>
                  {!hasPeek ? (
                    <>
                      <td>{new Date(payment.paid_on).toLocaleString()}</td>
                      <td>
                        <span
                          className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium ${methodBadgeClass(
                            payment.method
                          )}`}
                        >
                          {payment.method}
                        </span>
                      </td>
                      <td>{formatMoneyNGN(Number(payment.amount || 0))}</td>
                      <td>{payment.location_name || "-"}</td>
                      <td>{customerName(payment)}</td>
                    </>
                  ) : null}
                </tr>
              ))}

              {loading ? (
                <tr>
                  <td colSpan={hasPeek ? 1 : 6} className="px-3 py-6 text-center text-xs text-kk-dark-text-muted">
                    Loading payments...
                  </td>
                </tr>
              ) : null}

              {!loading && !rows.length ? (
                <tr>
                  <td colSpan={hasPeek ? 1 : 6} className="px-3 py-10 text-center text-xs text-kk-dark-text-muted">
                    No payments recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <SidePeek
          isOpen={hasPeek}
          onClose={() => setSelected(null)}
          widthClass="w-2/3"
          actions={
            <div className="text-xs font-medium text-kk-dark-text">
              {selected.invoice_number} • {formatMoneyNGN(Number(selected.amount || 0))}
            </div>
          }
        >
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-kk-dark-text-muted">Invoice</p>
                <p className="font-medium">{selected.invoice_number}</p>
              </div>
              <div>
                <p className="text-xs text-kk-dark-text-muted">Type</p>
                <p className="font-medium">{invoiceTypeLabel(selected.invoice_type_id)}</p>
              </div>
              <div>
                <p className="text-xs text-kk-dark-text-muted">Payment Date</p>
                <p className="font-medium">{new Date(selected.paid_on).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-kk-dark-text-muted">Method</p>
                <p className="font-medium">{selected.method || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-kk-dark-text-muted">Amount</p>
                <p className="font-medium">{formatMoneyNGN(Number(selected.amount || 0))}</p>
              </div>
              <div>
                <p className="text-xs text-kk-dark-text-muted">Reference</p>
                <p className="font-medium">{selected.reference || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-kk-dark-text-muted">Location</p>
                <p className="font-medium">{selected.location_name || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-kk-dark-text-muted">Customer</p>
                <p className="font-medium">{customerName(selected)}</p>
              </div>
              <div>
                <p className="text-xs text-kk-dark-text-muted">Recorded By</p>
                <p className="font-medium">{selected.received_by_name || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-kk-dark-text-muted">Invoice Status</p>
                <p className="font-medium">{selected.invoice_status || "-"}</p>
              </div>
            </div>
          </div>
        </SidePeek>
      ) : null}
    </div>
  );
};
