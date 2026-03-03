import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, Ticket } from "lucide-react";

import ListPageHeader from "../../../components/layout/ListPageHeader";
import SidePeek from "../../../components/layout/SidePeek";
import {
  createCustomerSubscription,
  fetchCustomerSubscriptions,
  fetchSubscriptionPlans,
} from "../../../api/subscriptions";
import type { CustomerRecord } from "../../../types/customerPortal";
import type { CustomerSubscriptionRecord, SubscriptionPlan } from "../../../types/subscriptions";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";
import { useAuth } from "../../../auth/AuthContext";
import { CustomerCreateModal } from "../../../components/crm/CustomerCreateModal";
import { CustomerSearchSelect } from "../../../components/crm/CustomerSearchSelect";
import { SubscriptionPeek } from "./SubscriptionPeek";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const statusBadge = (label: string) => {
  const tone =
    label === "ACTIVE"
      ? "bg-emerald-700 text-emerald-100"
      : label === "DEPLETED"
        ? "bg-amber-700 text-amber-100"
        : label === "EXPIRED"
          ? "bg-rose-700 text-rose-100"
          : "bg-slate-500 text-slate-100";
  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${tone}`}>{label}</span>;
};

export const SubscriptionListPage: React.FC = () => {
  const { can } = useAuth();

  const [rows, setRows] = useState<CustomerSubscriptionRecord[]>([]);
  const [selectedSubscription, setSelectedSubscription] = useState<CustomerSubscriptionRecord | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<
    SortState<"customer" | "plan" | "type" | "status" | "started" | "expires" | "uses"> | null
  >(null);

  const [showStartModal, setShowStartModal] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | "">("");
  const [startedDate, setStartedDate] = useState("");
  const [planOptions, setPlanOptions] = useState<SubscriptionPlan[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);

  const hasPeek = Boolean(selectedSubscription);

  const loadRows = async (params: { search?: string; page: number; page_size: number }) => {
    const data = await fetchCustomerSubscriptions({
      search: params.search,
      page: params.page,
      page_size: params.page_size,
    });
    setRows(data.results ?? []);
    setTotalCount(Number(data.count ?? 0));
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
        const data = await fetchCustomerSubscriptions({
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

  useEffect(() => {
    let cancelled = false;
    if (!showStartModal) return;

    (async () => {
      setLookupLoading(true);
      try {
        const plansData = await fetchSubscriptionPlans({
          status: "ACTIVE",
          page_size: 300,
        });
        if (cancelled) return;
        setPlanOptions(plansData.results ?? []);
      } catch {
        if (cancelled) return;
        setPlanOptions([]);
      } finally {
        if (!cancelled) setLookupLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showStartModal]);

  const sortedRows = useMemo(() => {
    return sortBy(rows, sort, {
      customer: (r) => `${r.customer_name ?? ""} ${r.customer_email ?? ""}`,
      plan: (r) => `${r.plan_name ?? ""} ${r.plan_code ?? ""}`,
      type: (r) => r.plan_type ?? "",
      status: (r) => r.status ?? "",
      started: (r) => new Date(r.started_at),
      expires: (r) => (r.expires_at ? new Date(r.expires_at) : new Date(0)),
      uses: (r) => Number(r.total_uses ?? Number.MAX_SAFE_INTEGER),
    });
  }, [rows, sort]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);
  const paginationControls = !hasPeek ? (
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
  ) : null;

  const closeStartModal = () => {
    setShowStartModal(false);
    setShowCreateCustomerModal(false);
    setStartError(null);
    setSelectedCustomer(null);
    setSelectedPlanId("");
    setStartedDate("");
  };

  const handleCustomerCreated = (customer: CustomerRecord) => {
    setSelectedCustomer(customer);
  };

  const handleStartSubscription = async () => {
    if (!selectedCustomer?.id) {
      setStartError("Please select a customer.");
      return;
    }
    if (!selectedPlanId) {
      setStartError("Please select a plan.");
      return;
    }

    setStarting(true);
    setStartError(null);
    try {
      await createCustomerSubscription({
        customer: Number(selectedCustomer.id),
        plan: Number(selectedPlanId),
        started_at: startedDate ? new Date(`${startedDate}T00:00:00`).toISOString() : undefined,
      });
      closeStartModal();
      await loadRows({ search: debouncedSearch || undefined, page, page_size: pageSize });
    } catch (err: any) {
      const detail = err?.response?.data;
      if (typeof detail?.detail === "string") {
        setStartError(detail.detail);
      } else if (detail && typeof detail === "object") {
        const first = Object.values(detail)[0];
        if (Array.isArray(first) && typeof first[0] === "string") {
          setStartError(first[0]);
        } else {
          setStartError("Unable to start subscription.");
        }
      } else {
        setStartError("Unable to start subscription.");
      }
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex-1 flex gap-4">
      <div
        className={`flex flex-col gap-4 ${!hasPeek ? "w-full" : "w-1/4"} ${
          hasPeek ? "h-screen overflow-hidden" : ""
        }`}
      >
        <ListPageHeader
          icon={<Ticket className="h-5 w-5" />}
          section="Sales"
          title="Subscriptions"
          subtitle="Customer subscriptions and manual subscription start."
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
                    className="w-64 rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-8 py-1.5 text-xs"
                    placeholder="Search customer or plan"
                  />
                </div>
                {can("Subscriptions", "create") ? (
                  <button
                    type="button"
                    onClick={() => setShowStartModal(true)}
                    className="new inline-flex items-center gap-1 rounded-full"
                  >
                    <Plus className="h-3 w-3" />
                    Start Subscription
                  </button>
                ) : null}
              </div>
            ) : (
              ""
            )
          }
        />

        {paginationControls}

        <div className={hasPeek ? "flex-1 overflow-y-auto" : "overflow-hidden"}>
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "customer"))}>
                  {!hasPeek ? "Customer" : "Subscription"}
                  {sortIndicator(sort, "customer")}
                </th>
                {!hasPeek ? (
                  <>
                    <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "plan"))}>
                      Plan{sortIndicator(sort, "plan")}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "type"))}>
                      Type{sortIndicator(sort, "type")}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "status"))}>
                      Status{sortIndicator(sort, "status")}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "uses"))}>
                      Uses{sortIndicator(sort, "uses")}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "started"))}>
                      Started{sortIndicator(sort, "started")}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "expires"))}>
                      Expires{sortIndicator(sort, "expires")}
                    </th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.id} className="cursor-pointer" onClick={() => setSelectedSubscription(row)}>
                  {!hasPeek ? (
                    <>
                      <td>
                        <div className="flex flex-col">
                          <span>{row.customer_name}</span>
                          <span className="text-xs text-kk-dark-text-muted">{row.customer_email}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span>{row.plan_name}</span>
                          <span className="text-xs text-kk-dark-text-muted">{row.plan_code}</span>
                        </div>
                      </td>
                      <td>{row.plan_type === "USAGE" ? "Usage" : "Cycle"}</td>
                      <td>{statusBadge(row.status)}</td>
                      <td>
                        {row.total_uses == null ? "Unlimited" : `${row.used_uses}/${row.total_uses} (rem: ${row.remaining_uses ?? 0})`}
                      </td>
                      <td>{new Date(row.started_at).toLocaleDateString()}</td>
                      <td>{row.expires_at ? new Date(row.expires_at).toLocaleDateString() : "No expiry"}</td>
                    </>
                  ) : (
                    <td>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{row.plan_name}</span>
                          <span className="text-xs text-kk-dark-text-muted">{row.customer_name}</span>
                          <span className="text-xs text-kk-dark-text-muted">{row.customer_email}</span>
                          <span className="text-xs text-kk-dark-text-muted">
                            {new Date(row.started_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {statusBadge(row.status)}
                          <span className="text-xs text-kk-dark-text-muted">
                            {row.total_uses == null ? "Unlimited" : `${row.used_uses}/${row.total_uses}`}
                          </span>
                        </div>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {loading ? (
                <tr>
                  <td colSpan={hasPeek ? 1 : 7} className="px-3 py-8 text-center text-xs text-kk-dark-text-muted">
                    Loading subscriptions...
                  </td>
                </tr>
              ) : null}

              {!loading && !sortedRows.length ? (
                <tr>
                  <td colSpan={hasPeek ? 1 : 7} className="px-3 py-8 text-center text-xs text-kk-dark-text-muted">
                    No subscriptions found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {paginationControls}
      </div>

      {selectedSubscription ? (
        <SidePeek
          isOpen={hasPeek}
          onClose={() => setSelectedSubscription(null)}
          widthClass="w-3/4"
          actions={<div className="text-xs font-medium text-kk-dark-text">#{selectedSubscription.id}</div>}
        >
          <SubscriptionPeek subscriptionId={selectedSubscription.id} />
        </SidePeek>
      ) : null}

      {showStartModal ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" onClick={closeStartModal}>
          <div
            className="w-full max-w-xl rounded-xl border border-kk-dark-border bg-kk-dark-bg-elevated p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">Start Customer Subscription</h3>
            <p className="mt-1 text-xs text-kk-dark-text-muted">
              Manually create an active subscription for a customer.
            </p>

            <div className="mt-4 grid gap-3">
              <label className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-kk-dark-text-muted">Customer *</span>
                  {can("Contacts", "create") ? (
                    <button
                      type="button"
                      onClick={() => setShowCreateCustomerModal(true)}
                      className="inline-flex items-center gap-1 rounded-md border border-kk-dark-input-border px-2 py-1 text-[11px] hover:bg-kk-dark-hover"
                      disabled={starting}
                    >
                      <Plus className="h-3 w-3" />
                      New Customer
                    </button>
                  ) : null}
                </div>

                <CustomerSearchSelect
                  value={selectedCustomer}
                  onChange={setSelectedCustomer}
                  disabled={starting}
                  onError={(message) => setStartError(message)}
                  placeholder="Search and select customer"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Plan *</span>
                <select
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value ? Number(e.target.value) : "")}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={starting || lookupLoading}
                >
                  <option value="">Select plan</option>
                  {planOptions.map((plan) => (
                    <option key={plan.id!} value={plan.id!}>
                      {plan.name} ({plan.code}){plan.plan_type === "USAGE" ? " - Usage" : " - Cycle"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Start Date (optional)</span>
                <input
                  type="date"
                  value={startedDate}
                  onChange={(e) => setStartedDate(e.target.value)}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={starting}
                />
              </label>
            </div>

            {startError ? (
              <div className="mt-4 rounded-md border border-red-700/50 bg-red-900/30 px-3 py-2 text-xs text-red-200">
                {startError}
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-kk-dark-input-border px-3 py-2 text-xs hover:bg-kk-dark-hover"
                onClick={closeStartModal}
                disabled={starting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-purple-600 px-3 py-2 text-xs text-white hover:bg-purple-700 disabled:opacity-60"
                onClick={handleStartSubscription}
                disabled={starting}
              >
                {starting ? "Starting..." : "Start Subscription"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CustomerCreateModal
        open={showCreateCustomerModal}
        onClose={() => setShowCreateCustomerModal(false)}
        onCreated={(customer) => {
          setShowCreateCustomerModal(false);
          handleCustomerCreated(customer);
        }}
      />
    </div>
  );
};
