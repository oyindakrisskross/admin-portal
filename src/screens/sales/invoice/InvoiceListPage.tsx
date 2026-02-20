// src/screens/sales/invoice/InvoiceListPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../auth/AuthContext";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { InvoiceResponse } from "../../../types/invoice";
import { fetchOrders } from "../../../api/invoice";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import { Plus, ReceiptText, Search } from "lucide-react";
import { formatMoneyNGN } from "../../../helpers";
import SidePeek from "../../../components/layout/SidePeek";
import { InvoicePeek } from "./InvoicePeek";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";
import { FilterBar } from "../../../components/filter/FilterBar";
import type { ColumnMeta, FilterSet } from "../../../types/filters";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const filterColumns: ColumnMeta[] = [
  { id: "invoice_date", label: "Invoice date", type: "date" },
  { id: "net_grand_total", label: "Total (after refunds)", type: "number" },
  { id: "item_name", label: "Item on invoice", type: "text" },
  { id: "has_discount", label: "Discount applied", type: "boolean" },
];

export const InvoiceListPage: React.FC = () => {
  const { can } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const hasId = Boolean(id);

  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponse | null>(null);
  const [sort, setSort] = useState<SortState<"number" | "date" | "status" | "location" | "total" | "sales"> | null>(null);
  const [filters, setFilters] = useState<FilterSet>({ clauses: [] });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const hasPeek = !!selectedInvoice;

  const openPeek = (invoice: InvoiceResponse) => {
    setSelectedInvoice(invoice);
  };

  const closePeek = () => {
    setSelectedInvoice(null);
  };

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

  const toDateStrShort = (str: string) => {
    const date = new Date(str);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const q = new URLSearchParams(location.search);
        const coupon_code = q.get("coupon_code") || undefined;
        const start = q.get("start") || undefined;
        const end = q.get("end") || undefined;

        const data = await fetchOrders({
          ...(coupon_code ? { coupon_code } : {}),
          ...(start && end ? { start, end } : {}),
          filters,
          search: debouncedSearch || undefined,
          page,
          page_size: pageSize,
        });
        if (!cancelled) {
          setInvoices(data.results ?? []);
          setTotalCount(Number(data.count ?? 0));
        }
      } catch {
        if (!cancelled) {
          setInvoices([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.search, filters, debouncedSearch, page, pageSize]);

  useEffect(() => {
    if (!hasId || !invoices.length) return;

    const invoiceId = Number(id);
    const match = invoices.find((i) => i.id === invoiceId);

    if (match) {
      setSelectedInvoice(match);
    }
  }, [hasId, id, invoices]);

  const sortedInvoices = useMemo(() => {
    return sortBy(invoices, sort, {
      number: (i) => i.number ?? "",
      date: (i) => new Date(i.invoice_date),
      status: (i) => i.status ?? "",
      location: (i) => i.location_name ?? "",
      total: (i) => Number(i.net_grand_total ?? i.grand_total ?? 0),
      sales: (i) => i.created_by_name ?? "",
    });
  }, [invoices, sort]);

  const refundedTotal = (inv: InvoiceResponse) => Number(inv.refunded_total ?? 0);
  const netTotal = (inv: InvoiceResponse) =>
    Math.max(0, Number(inv.net_grand_total ?? (Number(inv.grand_total ?? 0) - refundedTotal(inv))));
  const displayStatus = (inv: InvoiceResponse) => {
    if (inv.type_id === "SALE" && refundedTotal(inv) > 0.01) return "REFUNDED";
    return inv.status;
  };

  const renderTotal = (inv: InvoiceResponse) => {
    const refunded = refundedTotal(inv);
    const net = netTotal(inv);
    const isRefunded = inv.type_id === "SALE" && refunded > 0.01;

    if (!isRefunded) return <span>{formatMoneyNGN(+inv.grand_total)}</span>;

    return (
      <div className="flex flex-col items-end leading-tight">
        <span className="text-xs text-kk-dark-text-muted line-through">
          {formatMoneyNGN(+inv.grand_total)}
        </span>
        <span className="text-sm font-medium text-red-500">{formatMoneyNGN(net)}</span>
      </div>
    );
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);
  const paginationControls = !hasPeek && (
    <div className="flex items-center justify-between px-3 pb-2 text-xs text-kk-dark-text-muted">
      <div>
        Showing {rangeStart}-{rangeEnd} of {totalCount}
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
          disabled={!canPrev || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <button
          type="button"
          className="rounded border border-kk-dark-input-border px-2 py-1 disabled:opacity-50"
          disabled={!canNext || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex gap-4">
      <div
        className={`flex flex-col gap-4 ${!hasPeek ? "w-full" : "w-1/4"} ${
          hasPeek ? "h-screen overflow-hidden" : ""
        }`}
      >
        <ListPageHeader
          icon={<ReceiptText className="h-5 w-5" />}
          section="Sales"
          title="Invoices"
          subtitle={(() => {
            const q = new URLSearchParams(location.search);
            const code = q.get("coupon_code");
            const start = q.get("start");
            const end = q.get("end");
            if (!code) return undefined;
            if (start && end) return `Filtered by coupon: ${code} (${start} to ${end})`;
            return `Filtered by coupon: ${code}`;
          })()}
          right={
            !hasPeek ? (
              <div className="flex items-center gap-2 text-xs">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-kk-muted" />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-56 rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-8 py-1.5 text-xs"
                    placeholder="Search invoice or customer"
                  />
                </div>
                <FilterBar
                  columns={filterColumns}
                  filters={filters}
                  onChange={(next) => {
                    setFilters(next);
                    setPage(1);
                  }}
                />
                {can("Item", "create") && (
                  <button
                    onClick={() => navigate("/sales/invoices/new")}
                    className="new inline-flex items-center gap-1 rounded-full"
                  >
                    <Plus className="h-3 w-3" />
                    New
                  </button>
                )}
              </div>
            ) : (
              ""
            )
          }
        />

        {paginationControls}

        <div className={hasPeek ? "flex-1 overflow-y-auto" : "overflow-hidden"}>
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                <th
                  className="cursor-pointer select-none"
                  onClick={() => setSort((s) => nextSort(s, "number"))}
                >
                  {!hasPeek ? "Invoice Number" : "Invoice"}
                  {sortIndicator(sort, "number")}
                </th>
                {!hasPeek && (
                  <>
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
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "total"))}
                    >
                      Total{sortIndicator(sort, "total")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "sales"))}
                    >
                      Sales Person{sortIndicator(sort, "sales")}
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedInvoices.map((i) => (
                <tr key={i.id} className="cursor-pointer" onClick={() => openPeek(i)}>
                  <td>
                    {!hasPeek ? (
                      i.number
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-2 items-start">
                          <span>{i.number}</span>
                          <span>{toDateStrShort(i.invoice_date)}</span>
                          <span
                            className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium ${
                              i.status === "PAID"
                                ? "bg-emerald-50 text-emerald-700"
                                : displayStatus(i) === "REFUNDED"
                                ? "bg-orange-50 text-orange-700"
                                : i.status === "VOID"
                                ? "bg-red-400 text-red-50"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {displayStatus(i)}
                          </span>
                        </div>
                        <div className="text-base font-medium">{renderTotal(i)}</div>
                      </div>
                    )}
                  </td>

                  {!hasPeek && (
                    <>
                      <td>{toDateStr(i.invoice_date)}</td>
                      <td>
                        <span
                          className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium ${
                            i.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700"
                              : displayStatus(i) === "REFUNDED"
                              ? "bg-orange-50 text-orange-700"
                              : i.status === "VOID"
                              ? "bg-red-400 text-red-50"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {displayStatus(i)}
                        </span>
                      </td>
                      <td>{i.location_name}</td>
                      <td>{renderTotal(i)}</td>
                      <td>{i.created_by_name}</td>
                    </>
                  )}
                </tr>
              ))}

              {loading && (
                <tr>
                  <td
                    colSpan={hasPeek ? 1 : 6}
                    className="px-3 py-6 text-center text-xs text-kk-dark-text-muted"
                  >
                    Loading invoices...
                  </td>
                </tr>
              )}

              {!loading && !invoices.length && (
                <tr>
                  <td
                    colSpan={hasPeek ? 1 : 6}
                    className="px-3 py-10 text-center text-xs text-kk-dark-text-muted"
                  >
                    No invoices yet. Make a sale to create your first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {paginationControls}
      </div>

      {selectedInvoice && (
        <SidePeek
          isOpen={hasPeek}
          onClose={closePeek}
          widthClass="w-3/4"
          actions={
            <div className="flex items-center gap-2">
              <div className="text-xs font-medium text-kk-dark-text">{selectedInvoice.number}</div>
              {can("Sales Return", "create") &&
                selectedInvoice.type_id === "SALE" &&
                (selectedInvoice.status === "PAID" || selectedInvoice.status === "REFUNDED") && (
                  <button
                    type="button"
                    onClick={() => {
                      closePeek();
                      navigate(`/sales/invoices/${selectedInvoice.id}/refund`);
                    }}
                    className="rounded-md bg-kk-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                  >
                    Refund
                  </button>
                )}
            </div>
          }
        >
          <InvoicePeek invoice={selectedInvoice} />
        </SidePeek>
      )}
    </div>
  );
};
