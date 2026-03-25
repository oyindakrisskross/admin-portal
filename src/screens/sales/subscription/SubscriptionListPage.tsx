import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Plus, Search, Ticket, Trash2 } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { useNavigate, useParams } from "react-router-dom";

import ListPageHeader from "../../../components/layout/ListPageHeader";
import SidePeek from "../../../components/layout/SidePeek";
import {
  checkoutCustomerSubscriptions,
  fetchCustomerSubscription,
  fetchCustomerSubscriptions,
  fetchSubscriptionPlans,
  fetchSubscriptionProducts,
  generateSubscriptionPassQR,
} from "../../../api/subscriptions";
import type { CustomerRecord } from "../../../types/customerPortal";
import type { CustomerSubscriptionRecord, SubscriptionPlan } from "../../../types/subscriptions";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";
import { useAuth } from "../../../auth/AuthContext";
import { CustomerCreateModal } from "../../../components/crm/CustomerCreateModal";
import { CustomerSearchSelect } from "../../../components/crm/CustomerSearchSelect";
import { SubscriptionPeek } from "./SubscriptionPeek";
import { FilterBar } from "../../../components/filter/FilterBar";
import type { ColumnMeta, FilterSet } from "../../../types/filters";

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const SUBSCRIPTION_QR_CANVAS_ID = "subscription-pass-qr-canvas";
const formatCurrency = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 2,
});

const statusBadge = (label: string) => {
  const tone =
    label === "ACTIVE"
      ? "bg-emerald-700 text-emerald-100"
      : label === "UNPAID"
        ? "bg-orange-700 text-orange-100"
      : label === "DEPLETED"
        ? "bg-amber-700 text-amber-100"
        : label === "EXPIRED"
          ? "bg-rose-700 text-rose-100"
          : "bg-slate-500 text-slate-100";
  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${tone}`}>{label}</span>;
};

const normalizeSubscriptionError = (message: string) => {
  const text = String(message || "").trim();
  const lowered = text.toLowerCase();
  if (
    lowered.includes("physical card serial") ||
    lowered.includes("card serial number is already in use") ||
    lowered.includes("uniq_subscription_plan_card_serial") ||
    lowered.includes("duplicate key value violates unique constraint") ||
    lowered.includes("unique constraint failed")
  ) {
    return "This card serial number is already in use.";
  }
  return text;
};

const estimatePlanGrandTotal = (plan: SubscriptionPlan | null | undefined) => {
  if (!plan) return 0;
  const subtotal = (Number(plan.price || 0) || 0) + (Number(plan.setup_fee || 0) || 0);
  const taxRate = Number(plan.sales_tax_rate || 0) || 0;
  return subtotal + (subtotal * taxRate) / 100;
};

type SelectedPlanEntry = {
  planId: number | "";
  physical_card_serial: string;
};

export const SubscriptionListPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const hasId = Boolean(id);

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
  const [filters, setFilters] = useState<FilterSet>({ clauses: [] });
  const [filterPlanChoices, setFilterPlanChoices] = useState<{ value: string; label: string }[]>([]);
  const [filterProductChoices, setFilterProductChoices] = useState<{ value: string; label: string }[]>([]);

  const [showStartModal, setShowStartModal] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [selectedPlanEntries, setSelectedPlanEntries] = useState<SelectedPlanEntry[]>([
    { planId: "", physical_card_serial: "" },
  ]);
  const [startedDate, setStartedDate] = useState("");
  const [paymentMade, setPaymentMade] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD" | "TRANSFER" | "OTHER">("OTHER");
  const [paymentReference, setPaymentReference] = useState("");
  const [planOptions, setPlanOptions] = useState<SubscriptionPlan[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrValue, setQrValue] = useState("");
  const [qrPassCode, setQrPassCode] = useState("");

  const handleSubscriptionUpdated = useCallback((updated: CustomerSubscriptionRecord) => {
    setSelectedSubscription((current) => (current?.id === updated.id ? updated : current));
    setRows((current) => current.map((row) => (row.id === updated.id ? updated : row)));
  }, []);

  const filterColumns: ColumnMeta[] = useMemo(
    () => [
      { id: "assigned_customer", label: "Assigned customer", type: "text" },
      { id: "started_at", label: "Date started", type: "date" },
      { id: "expires_at", label: "Date expires", type: "date" },
      {
        id: "type",
        label: "Type",
        type: "choice",
        choices: [
          { value: "CYCLE", label: "Cycle-based" },
          { value: "USAGE", label: "Usage-based" },
        ],
      },
      {
        id: "status",
        label: "Status",
        type: "choice",
        choices: [
          { value: "ACTIVE", label: "Active" },
          { value: "UNPAID", label: "Unpaid" },
          { value: "EXPIRED", label: "Expired" },
          { value: "DEPLETED", label: "Depleted" },
          { value: "CANCELLED", label: "Cancelled" },
        ],
      },
      {
        id: "plan",
        label: "Plan",
        type: "choice",
        choices: filterPlanChoices,
      },
      {
        id: "subscription_product",
        label: "Subscription product",
        type: "choice",
        choices: filterProductChoices,
      },
    ],
    [filterPlanChoices, filterProductChoices]
  );

  const hasPeek = Boolean(selectedSubscription);
  const selectedCheckoutPlans = useMemo(
    () =>
      selectedPlanEntries
        .map((entry) => planOptions.find((plan) => plan.id === entry.planId) ?? null)
        .filter((plan): plan is SubscriptionPlan => plan != null),
    [planOptions, selectedPlanEntries]
  );
  const estimatedCheckoutTotal = useMemo(
    () => selectedCheckoutPlans.reduce((sum, plan) => sum + estimatePlanGrandTotal(plan), 0),
    [selectedCheckoutPlans]
  );

  useEffect(() => {
    setQrOpen(false);
    setQrLoading(false);
    setQrValue("");
    setQrPassCode("");
    setQrError(null);
  }, [selectedSubscription?.id]);

  const loadRows = async (params: { search?: string; page: number; page_size: number; filters?: FilterSet }) => {
    const data = await fetchCustomerSubscriptions({
      search: params.search,
      page: params.page,
      page_size: params.page_size,
      filters: params.filters,
    });
    setRows(data.results ?? []);
    setTotalCount(Number(data.count ?? 0));
  };

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!hasId || !rows.length) return;

    const subscriptionId = Number(id);
    const match = rows.find((row) => row.id === subscriptionId);
    if (match) {
      setSelectedSubscription(match);
    }
  }, [hasId, id, rows]);

  useEffect(() => {
    if (!hasId) return;

    const subscriptionId = Number(id);
    if (!Number.isFinite(subscriptionId) || subscriptionId <= 0) return;
    if (selectedSubscription?.id === subscriptionId) return;

    const match = rows.find((row) => row.id === subscriptionId);
    if (match) {
      setSelectedSubscription(match);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCustomerSubscription(subscriptionId);
        if (!cancelled) setSelectedSubscription(data);
      } catch {
        if (!cancelled) setSelectedSubscription(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasId, id, rows, selectedSubscription?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchCustomerSubscriptions({
          search: debouncedSearch || undefined,
          page,
          page_size: pageSize,
          filters,
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
  }, [debouncedSearch, page, pageSize, filters]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [plansData, productsData] = await Promise.all([
          fetchSubscriptionPlans({ page_size: 500 }),
          fetchSubscriptionProducts({ page_size: 500 }),
        ]);
        if (cancelled) return;

        const planChoices = (plansData.results ?? [])
          .filter((plan) => plan.id != null)
          .map((plan) => ({
            value: String(plan.id),
            label: `${plan.name}${plan.code ? ` (${plan.code})` : ""}`,
          }));

        const productChoices = (productsData.results ?? [])
          .filter((product) => product.id != null)
          .map((product) => ({
            value: String(product.id),
            label: String(product.name || `Product #${product.id}`),
          }));

        setFilterPlanChoices(planChoices);
        setFilterProductChoices(productChoices);
      } catch {
        if (!cancelled) {
          setFilterPlanChoices([]);
          setFilterProductChoices([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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

  const updateSelectedPlan = (index: number, value: number | "") => {
    setSelectedPlanEntries((current) => {
      const next = [...current];
      next[index] = { ...next[index], planId: value, physical_card_serial: "" };
      return next;
    });
  };

  const updateSelectedPlanSerial = (index: number, value: string) => {
    setSelectedPlanEntries((current) => {
      const next = [...current];
      next[index] = { ...next[index], physical_card_serial: value };
      return next;
    });
  };

  const addSelectedPlan = () => {
    setSelectedPlanEntries((current) => [...current, { planId: "", physical_card_serial: "" }]);
  };

  const removeSelectedPlan = (index: number) => {
    setSelectedPlanEntries((current) => {
      if (current.length <= 1) {
        return [{ planId: "", physical_card_serial: "" }];
      }
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  };

  const closeStartModal = () => {
    setShowStartModal(false);
    setShowCreateCustomerModal(false);
    setStartError(null);
    setSelectedCustomer(null);
    setSelectedPlanEntries([{ planId: "", physical_card_serial: "" }]);
    setStartedDate("");
    setPaymentMade(true);
    setPaymentAmount("");
    setPaymentMethod("OTHER");
    setPaymentReference("");
  };

  const closeQrModal = () => {
    setQrOpen(false);
    setQrError(null);
  };

  const openSubscriptionQr = async () => {
    if (!selectedSubscription?.id) return;
    setQrOpen(true);
    setQrLoading(true);
    setQrError(null);
    setQrValue("");
    setQrPassCode("");
    try {
      const data = await generateSubscriptionPassQR(selectedSubscription.id);
      setQrValue(String(data?.qr_value || ""));
      setQrPassCode(String(data?.pass_code || ""));
    } catch (err: any) {
      const detail = err?.response?.data;
      if (typeof detail?.detail === "string") {
        setQrError(detail.detail);
      } else {
        setQrError("Unable to generate subscription pass QR.");
      }
    } finally {
      setQrLoading(false);
    }
  };

  const downloadSubscriptionQr = () => {
    setQrError(null);
    if (!selectedSubscription?.id) return;
    if (!qrValue) {
      setQrError("Unable to generate subscription pass QR.");
      return;
    }
    const canvas = document.getElementById(SUBSCRIPTION_QR_CANVAS_ID) as HTMLCanvasElement | null;
    if (!canvas) {
      setQrError("Unable to render QR canvas.");
      return;
    }
    const href = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = href;
    link.download = `SUB-${selectedSubscription.id}-pass.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCustomerCreated = (customer: CustomerRecord) => {
    setSelectedCustomer(customer);
  };

  const handleStartSubscription = async () => {
    if (!selectedCustomer?.id) {
      setStartError("Please select a customer.");
      return;
    }
    const chosenPlanEntries = selectedPlanEntries
      .filter((entry): entry is SelectedPlanEntry & { planId: number } => typeof entry.planId === "number")
      .map((entry) => {
        const plan = planOptions.find((row) => row.id === entry.planId) ?? null;
        return { entry, plan };
      })
      .filter((row) => row.plan != null);
    if (!chosenPlanEntries.length) {
      setStartError("Please select at least one subscription plan.");
      return;
    }
    const missingSerialPlan = chosenPlanEntries.find(
      ({ entry, plan }) => Boolean(plan?.requires_card_serial) && !entry.physical_card_serial.trim()
    );
    if (missingSerialPlan) {
      setStartError(`Physical card serial is required for ${missingSerialPlan.plan?.name || "the selected plan"}.`);
      return;
    }

    setStarting(true);
    setStartError(null);
    try {
      await checkoutCustomerSubscriptions({
        customer: Number(selectedCustomer.id),
        plan_entries: chosenPlanEntries.map(({ entry }) => ({
          plan: Number(entry.planId),
          physical_card_serial: entry.physical_card_serial.trim() || undefined,
        })),
        started_at: startedDate ? new Date(`${startedDate}T00:00:00`).toISOString() : undefined,
        payment_made: paymentMade,
        amount_paid: paymentMade && paymentAmount.trim() ? paymentAmount.trim() : undefined,
        payment_method: paymentMethod,
        payment_reference: paymentReference.trim() || undefined,
      });
      closeStartModal();
      await loadRows({ search: debouncedSearch || undefined, page, page_size: pageSize, filters });
    } catch (err: any) {
      const detail = err?.response?.data;
      if (typeof detail?.detail === "string") {
        setStartError(normalizeSubscriptionError(detail.detail));
      } else if (detail && typeof detail === "object") {
        const first = Object.values(detail)[0];
        if (Array.isArray(first) && typeof first[0] === "string") {
          setStartError(normalizeSubscriptionError(first[0]));
        } else if (typeof first === "string") {
          setStartError(normalizeSubscriptionError(first));
        } else {
          setStartError("Unable to start subscription.");
        }
      } else {
        setStartError(normalizeSubscriptionError(err?.message || "Unable to start subscription."));
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
                <FilterBar
                  columns={filterColumns}
                  filters={filters}
                  showPills={false}
                  onChange={(next) => {
                    setFilters(next);
                    setPage(1);
                  }}
                />
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
          below={
            !hasPeek ? (
              <FilterBar
                columns={filterColumns}
                filters={filters}
                showTrigger={false}
                onChange={(next) => {
                  setFilters(next);
                  setPage(1);
                }}
              />
            ) : null
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
          onClose={() => {
            setQrOpen(false);
            setQrLoading(false);
            setQrValue("");
            setQrPassCode("");
            setQrError(null);
            if (hasId) {
              navigate("/sales/subscriptions", { replace: true });
            } else {
              setSelectedSubscription(null);
            }
          }}
          widthClass="w-3/4"
          actions={
            <div className="flex items-center gap-2">
              <div className="text-xs font-medium text-kk-dark-text">#{selectedSubscription.id}</div>
              <button
                type="button"
                onClick={() => void openSubscriptionQr()}
                className="inline-flex items-center gap-1 rounded-md border border-kk-dark-input-border px-3 py-1.5 text-xs hover:bg-kk-dark-hover disabled:opacity-60"
                disabled={qrLoading}
              >
                <Download className="h-3.5 w-3.5" />
                QR PNG
              </button>
            </div>
          }
        >
          <SubscriptionPeek
            subscriptionId={selectedSubscription.id}
            onUpdated={handleSubscriptionUpdated}
          />
        </SidePeek>
      ) : null}

      {selectedSubscription && qrOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-kk-dark-bg/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-kk-dark-border bg-kk-dark-bg-elevated shadow-soft">
            <div className="border-b border-kk-dark-border px-5 py-4">
              <h2 className="text-lg font-semibold">Subscription Pass QR</h2>
              <p className="text-xs text-kk-dark-text-muted">
                This single QR code represents all redeemable items and redemption conditions configured for this
                subscription.
              </p>
            </div>
            <div className="space-y-3 px-5 py-4">
              {qrLoading ? (
                <div className="rounded-lg border border-kk-dark-input-border px-3 py-6 text-center text-sm text-kk-dark-text-muted">
                  Generating QR code...
                </div>
              ) : (
                <div className="flex justify-center rounded-lg border border-kk-dark-input-border bg-white p-3">
                  <QRCodeCanvas
                    id={SUBSCRIPTION_QR_CANVAS_ID}
                    value={qrValue}
                    size={240}
                    includeMargin
                  />
                </div>
              )}
              <div className="text-center text-xs text-kk-dark-text-muted break-all">
                {qrPassCode || "-"}
              </div>
              {qrError ? <p className="text-xs font-medium text-red-500">{qrError}</p> : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-kk-dark-border px-5 py-4">
              <button
                type="button"
                onClick={closeQrModal}
                className="rounded-md border border-kk-dark-input-border px-3 py-2 text-sm hover:bg-kk-dark-hover"
              >
                Close
              </button>
              <button
                type="button"
                onClick={downloadSubscriptionQr}
                className="inline-flex items-center gap-1 rounded-md bg-kk-accent px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
                disabled={!qrValue || qrLoading}
              >
                <Download className="h-4 w-4" />
                Download PNG
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showStartModal ? (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center" onClick={closeStartModal}>
          <div
            className="flex max-h-[calc(100vh-2rem)] w-full max-w-xl flex-col rounded-xl border border-kk-dark-border bg-kk-dark-bg-elevated p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">Start Customer Subscription</h3>
            <p className="mt-1 text-xs text-kk-dark-text-muted">
              Start one or more subscriptions for a customer on the same invoice. Each subscription still sends its own
              QR email.
            </p>

            <div className="mt-4 grid flex-1 gap-3 overflow-y-auto pr-1">
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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-kk-dark-text-muted">Plans *</span>
                  <button
                    type="button"
                    onClick={addSelectedPlan}
                    className="inline-flex items-center gap-1 rounded-md border border-kk-dark-input-border px-2 py-1 text-[11px] hover:bg-kk-dark-hover"
                    disabled={starting || lookupLoading}
                  >
                    <Plus className="h-3 w-3" />
                    Add Plan
                  </button>
                </div>

                {selectedPlanEntries.map((entry, index) => {
                  const selectedPlan = planOptions.find((plan) => plan.id === entry.planId) ?? null;
                  return (
                    <div key={index} className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg p-3">
                      <div className="flex items-end gap-2">
                        <label className="flex-1">
                          <span className="mb-1 block text-xs text-kk-dark-text-muted">
                            Subscription {index + 1}{index === 0 ? " *" : ""}
                          </span>
                          <select
                            value={entry.planId}
                            onChange={(e) => updateSelectedPlan(index, e.target.value ? Number(e.target.value) : "")}
                            className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
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
                        <button
                          type="button"
                          onClick={() => removeSelectedPlan(index)}
                          className="inline-flex h-10 items-center justify-center rounded-md border border-kk-dark-input-border px-3 hover:bg-kk-dark-hover disabled:opacity-50"
                          disabled={starting || selectedPlanEntries.length === 1}
                          title={`Remove subscription ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      {selectedPlan?.requires_card_serial ? (
                        <label className="mt-3 flex flex-col gap-1">
                          <span className="text-xs text-kk-dark-text-muted">Physical Card Serial *</span>
                          <input
                            type="text"
                            value={entry.physical_card_serial}
                            onChange={(e) => updateSelectedPlanSerial(index, e.target.value)}
                            className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                            disabled={starting}
                            placeholder="Enter the assigned physical card serial"
                          />
                        </label>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {selectedCheckoutPlans.length ? (
                <div className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-kk-dark-text-muted">
                      {selectedCheckoutPlans.length} subscription{selectedCheckoutPlans.length === 1 ? "" : "s"} selected
                    </span>
                    <span className="text-sm font-medium text-kk-dark-text">
                      {formatCurrency.format(estimatedCheckoutTotal)}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1 text-[11px] text-kk-dark-text-muted">
                    {selectedCheckoutPlans.map((plan, index) => (
                      <p key={`${plan.id ?? plan.code}-${index}`}>
                        {plan.name} ({plan.code}){plan.plan_type === "USAGE" ? " - Usage" : " - Cycle"}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}

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

              <div className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-kk-dark-text-muted">Record Payment</span>
                  <label className="inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={paymentMade}
                      onChange={(e) => setPaymentMade(e.target.checked)}
                      disabled={starting}
                    />
                    Payment made
                  </label>
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-kk-dark-text-muted">Amount Paid</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      placeholder="Leave blank to use checkout total"
                      disabled={starting || !paymentMade}
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-kk-dark-text-muted">Payment Method</span>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as "CASH" | "CARD" | "TRANSFER" | "OTHER")}
                      className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      disabled={starting || !paymentMade}
                    >
                      <option value="OTHER">Other</option>
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="TRANSFER">Transfer</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-[11px] text-kk-dark-text-muted">Reference (optional)</span>
                    <input
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      placeholder="Txn/ref no."
                      disabled={starting || !paymentMade}
                    />
                  </label>
                </div>
              </div>
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
