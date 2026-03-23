// src/screens/sales/invoice/InvoiceListPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../auth/AuthContext";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { InvoiceResponse } from "../../../types/invoice";
import { bulkInvoices, fetchInvoice, fetchOrders } from "../../../api/invoice";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import { Plus, ReceiptText, Search, Trash2, UserPlus } from "lucide-react";
import { formatMoneyNGN, getPrepaidDisplayStatus, humanizeStatus } from "../../../helpers";
import SidePeek from "../../../components/layout/SidePeek";
import { InvoicePeek } from "./InvoicePeek";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";
import { FilterBar } from "../../../components/filter/FilterBar";
import type { ColumnMeta, FilterSet } from "../../../types/filters";
import { BulkActionBar } from "../../../components/catalog/bulk/BulkActionBar";
import { RowSelectCheckbox } from "../../../components/catalog/bulk/RowSelectCheckbox";
import ToastModal from "../../../components/ui/ToastModal";
import { CustomerSearchSelect } from "../../../components/crm/CustomerSearchSelect";
import type { CustomerRecord } from "../../../types/customerPortal";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const filterColumns: ColumnMeta[] = [
  { id: "invoice_date", label: "Invoice date", type: "date" },
  { id: "assigned_customer", label: "Assigned customer", type: "text" },
  {
    id: "status",
    label: "Status",
    type: "choice",
    choices: [
      { value: "PAID", label: "Paid" },
      { value: "DRAFT", label: "Draft" },
      { value: "OPEN", label: "Open" },
      { value: "VOID", label: "Void" },
      { value: "REFUNDED", label: "Refunded" },
      { value: "UNUSED", label: "Unused" },
      { value: "PARTIALLY_REDEEMED", label: "Partially redeemed" },
      { value: "REDEEMED", label: "Redeemed" },
    ],
  },
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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [assignCustomerOpen, setAssignCustomerOpen] = useState(false);
  const [assignCustomer, setAssignCustomer] = useState<CustomerRecord | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("error");

  const hasPeek = !!selectedInvoice;

  const openPeek = (invoice: InvoiceResponse) => {
    setSelectedInvoice(invoice);
  };

  const closePeek = () => {
    if (hasId) {
      navigate("/sales/invoices", { replace: true });
      return;
    }
    setSelectedInvoice(null);
  };

  const showToast = (message: string, variant: "error" | "success" | "info" = "error") => {
    setToastVariant(variant);
    setToastMessage(message);
  };

  const parseError = (err: any, fallback: string) => {
    const detail = err?.response?.data?.detail;
    if (typeof detail === "string") return detail;
    return err?.message || fallback;
  };

  const toggleSelected = (invoiceId: number, checked?: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const shouldSelect = checked ?? !next.has(invoiceId);
      if (shouldSelect) next.add(invoiceId);
      else next.delete(invoiceId);
      return Array.from(next);
    });
  };

  const clearSelection = () => {
    setSelectedIds([]);
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
    const visible = new Set(invoices.map((inv) => inv.id));
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [invoices]);

  useEffect(() => {
    if (!hasId || !invoices.length) return;

    const invoiceId = Number(id);
    const match = invoices.find((i) => i.id === invoiceId);

    if (match) {
      setSelectedInvoice(match);
    }
  }, [hasId, id, invoices]);

  useEffect(() => {
    if (!hasId) return;

    const invoiceId = Number(id);
    if (!Number.isFinite(invoiceId) || invoiceId <= 0) return;
    if (selectedInvoice?.id === invoiceId) return;

    const match = invoices.find((inv) => inv.id === invoiceId);
    if (match) {
      setSelectedInvoice(match);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await fetchInvoice(invoiceId);
        if (!cancelled) setSelectedInvoice(data);
      } catch {
        if (!cancelled) setSelectedInvoice(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasId, id, invoices, selectedInvoice?.id]);

  const sortedInvoices = useMemo(() => {
    return sortBy(invoices, sort, {
      number: (i) => i.number ?? "",
      date: (i) => new Date(i.invoice_date),
      status: (i) =>
        i.type_id === "PREPAID"
          ? (i.prepaid_redeem_status ?? "UNUSED")
          : i.type_id === "SALE" && Number(i.refunded_total ?? 0) > 0.01
          ? "REFUNDED"
          : (i.status ?? ""),
      location: (i) => i.location_name ?? "",
      total: (i) => Number(i.net_grand_total ?? i.grand_total ?? 0),
      sales: (i) => i.created_by_name ?? "",
    });
  }, [invoices, sort]);

  const visibleIds = useMemo(() => sortedInvoices.map((inv) => inv.id), [sortedInvoices]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((invId) => selectedIdSet.has(invId));
  const someVisibleSelected = visibleIds.some((invId) => selectedIdSet.has(invId));

  const selectedCustomerName = (() => {
    if (!assignCustomer) return null;
    const full = `${assignCustomer.first_name || ""} ${assignCustomer.last_name || ""}`.trim();
    return full || assignCustomer.email || `Customer #${assignCustomer.id}`;
  })();

  const bulkDelete = async () => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    try {
      const res = await bulkInvoices({ ids: selectedIds, action: "delete" });
      const okSet = new Set((res.ok_ids || []).map(Number));
      const failed = res.failed || [];
      const failedIds = failed.map((f) => Number(f.id)).filter(Number.isFinite);

      if (okSet.size) {
        setInvoices((prev) => prev.filter((inv) => !okSet.has(inv.id)));
        setTotalCount((prev) => Math.max(0, prev - okSet.size));
        if (selectedInvoice && okSet.has(selectedInvoice.id)) {
          setSelectedInvoice(null);
        }
        showToast(`Deleted ${okSet.size} invoice(s).`, "success");
      }

      if (failedIds.length) {
        setSelectedIds(failedIds);
        const hasPayments = failed.some((f) => String(f.reason || "").toUpperCase() === "HAS_PAYMENTS");
        showToast(
          hasPayments
            ? "Some invoices were not deleted because payments have already been recorded."
            : "Some invoices could not be deleted.",
          "error"
        );
      } else {
        clearSelection();
      }
    } catch (err: any) {
      showToast(parseError(err, "Bulk delete failed."));
    } finally {
      setBulkBusy(false);
    }
  };

  const submitAssignCustomer = async () => {
    if (!selectedIds.length) return;
    if (!assignCustomer) {
      setAssignError("Select a customer before applying.");
      return;
    }
    setAssignError(null);
    setBulkBusy(true);
    try {
      const res = await bulkInvoices({
        ids: selectedIds,
        action: "assign_customer",
        portal_customer: assignCustomer.id,
      });
      const okSet = new Set((res.ok_ids || []).map(Number));
      const failed = res.failed || [];
      const failedIds = failed.map((f) => Number(f.id)).filter(Number.isFinite);

      if (okSet.size) {
        setInvoices((prev) =>
          prev.map((inv) =>
            okSet.has(inv.id)
              ? {
                  ...inv,
                  portal_customer: assignCustomer.id,
                  portal_customer_name: selectedCustomerName || inv.portal_customer_name,
                  customer_name: selectedCustomerName || inv.customer_name,
                }
              : inv
          )
        );
        if (selectedInvoice && okSet.has(selectedInvoice.id)) {
          setSelectedInvoice((prev) =>
            prev
              ? {
                  ...prev,
                  portal_customer: assignCustomer.id,
                  portal_customer_name: selectedCustomerName || prev.portal_customer_name,
                  customer_name: selectedCustomerName || prev.customer_name,
                }
              : prev
          );
        }
        showToast(`Assigned customer to ${okSet.size} invoice(s).`, "success");
      }

      if (failedIds.length) {
        setSelectedIds(failedIds);
        showToast("Some invoices could not be updated.", "error");
      } else {
        clearSelection();
      }

      setAssignCustomerOpen(false);
      setAssignCustomer(null);
      setAssignError(null);
    } catch (err: any) {
      setAssignError(parseError(err, "Failed to assign customer."));
    } finally {
      setBulkBusy(false);
    }
  };

  const refundedTotal = (inv: InvoiceResponse) => Number(inv.refunded_total ?? 0);
  const netTotal = (inv: InvoiceResponse) =>
    Math.max(0, Number(inv.net_grand_total ?? (Number(inv.grand_total ?? 0) - refundedTotal(inv))));
  const displayStatus = (inv: InvoiceResponse): string => {
    if (inv.type_id === "PREPAID") return getPrepaidDisplayStatus(inv);
    if (inv.type_id === "SALE" && refundedTotal(inv) > 0.01) return "REFUNDED";
    return String(inv.status || "").toUpperCase();
  };
  const statusLabel = (status: string) => humanizeStatus(status, status);
  const statusBadgeClass = (status: string) => {
    if (status === "PAID" || status === "REDEEMED") return "bg-emerald-50 text-emerald-700";
    if (status === "PARTIALLY_PAID" || status === "PARTIALLY_REDEEMED") return "bg-orange-50 text-orange-700";
    if (status === "UNPAID") return "bg-slate-100 text-slate-600";
    if (status === "REFUNDED") return "bg-red-100 text-red-700";
    if (status === "VOID") return "bg-red-400 text-red-50";
    if (status === "UNUSED") return "bg-blue-50 text-blue-700";
    return "bg-slate-100 text-slate-500";
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
                  showPills={false}
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
          below={!hasPeek ? (
            <FilterBar
              columns={filterColumns}
              filters={filters}
              showTrigger={false}
              onChange={(next) => {
                setFilters(next);
                setPage(1);
              }}
            />
          ) : null}
        />

        {!hasPeek && selectedIds.length > 0 && (
          <BulkActionBar
            count={selectedIds.length}
            onClear={clearSelection}
            actions={[
              {
                key: "delete",
                label: "Delete",
                icon: <Trash2 className="h-4 w-4" />,
                disabled: bulkBusy || !can("Invoices", "delete"),
                onClick: bulkDelete,
              },
              {
                key: "assign_customer",
                label: "Assign customer",
                icon: <UserPlus className="h-4 w-4" />,
                disabled: bulkBusy || !can("Invoices", "edit"),
                onClick: () => {
                  setAssignError(null);
                  setAssignCustomerOpen(true);
                },
              },
            ]}
          />
        )}

        {paginationControls}

        <div className={hasPeek ? "flex-1 overflow-y-auto" : "overflow-hidden"}>
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                {!hasPeek && (
                  <th className="w-10">
                    <RowSelectCheckbox
                      checked={allVisibleSelected}
                      onChange={(checked) => {
                        if (checked) {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            visibleIds.forEach((invId) => next.add(invId));
                            return Array.from(next);
                          });
                        } else {
                          setSelectedIds((prev) => prev.filter((invId) => !visibleIds.includes(invId)));
                        }
                      }}
                      label="Select all visible invoices"
                      className={!allVisibleSelected && someVisibleSelected ? "ring-2 ring-blue-500/60" : ""}
                    />
                  </th>
                )}
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
              {sortedInvoices.map((i) => {
                const normalizedStatus = displayStatus(i);
                return (
                  <tr key={i.id} className="cursor-pointer" onClick={() => openPeek(i)}>
                    {!hasPeek && (
                      <td>
                        <RowSelectCheckbox
                          checked={selectedIdSet.has(i.id)}
                          onChange={(checked) => toggleSelected(i.id, checked)}
                          label={`Select invoice ${i.number}`}
                        />
                      </td>
                    )}
                    <td>
                      {!hasPeek ? (
                        i.number
                      ) : (
                        <div className="flex justify-between items-start">
                          <div className="flex flex-col gap-2 items-start">
                            <span>{i.number}</span>
                            <span>{toDateStrShort(i.invoice_date)}</span>
                            <span
                              className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium ${statusBadgeClass(
                                normalizedStatus
                              )}`}
                            >
                              {statusLabel(normalizedStatus)}
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
                            className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium ${statusBadgeClass(
                              normalizedStatus
                            )}`}
                          >
                            {statusLabel(normalizedStatus)}
                          </span>
                        </td>
                        <td>{i.location_name}</td>
                        <td>{renderTotal(i)}</td>
                        <td>{i.created_by_name}</td>
                      </>
                    )}
                  </tr>
                );
              })}

              {loading && (
                <tr>
                  <td
                    colSpan={hasPeek ? 1 : 7}
                    className="px-3 py-6 text-center text-xs text-kk-dark-text-muted"
                  >
                    Loading invoices...
                  </td>
                </tr>
              )}

              {!loading && !invoices.length && (
                <tr>
                  <td
                    colSpan={hasPeek ? 1 : 7}
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

      {assignCustomerOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-kk-dark-bg/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-kk-dark-border bg-kk-dark-bg-elevated shadow-soft">
            <div className="border-b border-kk-dark-border px-5 py-4">
              <h2 className="text-lg font-semibold">Assign Customer</h2>
              <p className="text-xs text-kk-dark-text-muted">
                Assign the selected customer to {selectedIds.length} selected invoice(s).
              </p>
            </div>
            <div className="space-y-3 px-5 py-4">
              <CustomerSearchSelect
                value={assignCustomer}
                onChange={(customer) => {
                  setAssignCustomer(customer);
                  setAssignError(null);
                }}
                disabled={bulkBusy}
                onError={(message) => setAssignError(message)}
                placeholder="Search and select customer"
              />
              {assignError ? <p className="text-xs font-medium text-red-500">{assignError}</p> : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-kk-dark-border px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  if (bulkBusy) return;
                  setAssignCustomerOpen(false);
                  setAssignCustomer(null);
                  setAssignError(null);
                }}
                className="rounded-md border border-kk-dark-input-border px-3 py-2 text-sm hover:bg-kk-dark-hover"
                disabled={bulkBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAssignCustomer}
                className="rounded-md bg-kk-accent px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-70"
                disabled={bulkBusy}
              >
                {bulkBusy ? "Applying..." : "Assign Customer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <ToastModal message={toastMessage} variant={toastVariant} onClose={() => setToastMessage(null)} />
      ) : null}
    </div>
  );
};
