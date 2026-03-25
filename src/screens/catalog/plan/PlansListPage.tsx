import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Layers, Plus, Search } from "lucide-react";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import SidePeek from "../../../components/layout/SidePeek";
import ToastModal from "../../../components/ui/ToastModal";
import { BulkActionBar } from "../../../components/catalog/bulk/BulkActionBar";
import { RowSelectCheckbox } from "../../../components/catalog/bulk/RowSelectCheckbox";
import { useAuth } from "../../../auth/AuthContext";
import {
  bulkUpdateSubscriptionPlans,
  deleteSubscriptionPlan,
  deleteSubscriptionProduct,
  fetchSubscriptionPlans,
  fetchSubscriptionProducts,
} from "../../../api/subscriptions";
import {
  formatBillingFrequency,
  formatPricingModel,
  type SubscriptionPlan,
  type SubscriptionProduct,
} from "../../../types/subscriptions";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";
import { PlanPeek } from "./PlanPeek";
import { ProductPeek } from "./ProductPeek";
import { SubscriptionProductModal } from "./SubscriptionModals";
import { SubscriptionPlanBulkEditModal } from "./SubscriptionPlanBulkEditModal";

type ListTab = "plans" | "products";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

function statusBadge(label: string) {
  const tone = label === "ACTIVE" ? "bg-emerald-700 text-emerald-100" : "bg-slate-500 text-slate-100";
  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${tone}`}>{label}</span>;
}

function formatMoney(value?: string, currency = "NGN") {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function PlansListPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [tab, setTab] = useState<ListTab>("plans");
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<SubscriptionProduct | null>(null);

  const [planSort, setPlanSort] = useState<
    SortState<
      "product" | "name" | "code" | "description" | "status" | "pricing_model" | "billing_frequency" | "price"
    > | null
  >(null);
  const [productSort, setProductSort] = useState<
    SortState<"name" | "description" | "status" | "plans" | "addons" | "coupons"> | null
  >(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("success");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productModalInitial, setProductModalInitial] = useState<SubscriptionProduct | null>(null);

  const showToast = (message: string, variant: "error" | "success" | "info" = "success") => {
    setToastVariant(variant);
    setToastMessage(message);
  };

  const hasPeek = Boolean(selectedPlan || selectedProduct);
  const canCreate = can("Subscriptions", "create");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setSelectedPlan(null);
    setSelectedProduct(null);
    setSelectedIds([]);
    setPage(1);
  }, [tab]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (tab === "plans") {
          const data = await fetchSubscriptionPlans({
            search: debouncedSearch || undefined,
            page,
            page_size: pageSize,
          });
          if (cancelled) return;
          setPlans(data.results ?? []);
          setTotalCount(Number(data.count ?? 0));
          const visible = new Set((data.results ?? []).map((row) => Number(row.id)).filter(Number.isFinite));
          setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
        } else {
          const data = await fetchSubscriptionProducts({
            search: debouncedSearch || undefined,
            page,
            page_size: pageSize,
          });
          if (cancelled) return;
          setProducts(data.results ?? []);
          setTotalCount(Number(data.count ?? 0));
          setSelectedIds([]);
        }
      } catch {
        if (cancelled) return;
        setPlans([]);
        setProducts([]);
        setTotalCount(0);
        setSelectedIds([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tab, debouncedSearch, page, pageSize, refreshKey]);

  useEffect(() => {
    const state = location.state as { selectedPlanId?: number } | null;
    if (!state?.selectedPlanId || tab !== "plans" || !plans.length) return;
    const match = plans.find((p) => p.id === state.selectedPlanId);
    if (match) {
      setSelectedPlan(match);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.pathname, location.state, navigate, plans, tab]);

  const rows = useMemo(() => {
    if (tab === "plans") {
      return sortBy(plans, planSort, {
        product: (r) => r.product_name ?? "",
        name: (r) => r.name ?? "",
        code: (r) => r.code ?? "",
        description: (r) => r.description ?? "",
        status: (r) => r.status ?? "",
        pricing_model: (r) => r.pricing_model ?? "",
        billing_frequency: (r) => formatBillingFrequency(r.billing_frequency_value, r.billing_frequency_unit),
        price: (r) => r.price ?? "",
      });
    }
    return sortBy(products, productSort, {
      name: (r) => r.name ?? "",
      description: (r) => r.description ?? "",
      status: (r) => r.status ?? "",
      plans: (r) => r.plans_count ?? 0,
      addons: (r) => r.addons_count ?? 0,
      coupons: (r) => r.coupons_count ?? 0,
    });
  }, [tab, plans, products, planSort, productSort]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);

  const deleteSelectedPlan = async () => {
    if (!selectedPlan?.id) return;
    if (!confirm("Delete this subscription plan?")) return;
    try {
      await deleteSubscriptionPlan(selectedPlan.id);
      setPlans((prev) => prev.filter((p) => p.id !== selectedPlan.id));
      setSelectedPlan(null);
      setTotalCount((prev) => Math.max(0, prev - 1));
      showToast("Plan deleted.");
      setRefreshKey((x) => x + 1);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      showToast(typeof detail === "string" ? detail : "Unable to delete plan.", "error");
    }
  };

  const toggleSelected = (id: number, checked?: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const nextChecked = checked ?? !next.has(id);
      if (nextChecked) next.add(id);
      else next.delete(id);
      return Array.from(next);
    });
  };

  const clearSelection = () => setSelectedIds([]);

  const selectedPlansForBulk = useMemo(
    () => plans.filter((plan) => selectedIdSet.has(Number(plan.id))),
    [plans, selectedIdSet]
  );

  const deleteSelectedProduct = async () => {
    if (!selectedProduct?.id) return;
    if (!confirm("Delete this subscription product?")) return;
    try {
      await deleteSubscriptionProduct(selectedProduct.id);
      setProducts((prev) => prev.filter((p) => p.id !== selectedProduct.id));
      setSelectedProduct(null);
      setTotalCount((prev) => Math.max(0, prev - 1));
      showToast("Product deleted.");
      setRefreshKey((x) => x + 1);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      showToast(typeof detail === "string" ? detail : "Unable to delete product.", "error");
    }
  };

  return (
    <div className="flex flex-1 gap-4">
      <div
        className={`flex flex-col gap-4 ${!hasPeek ? "w-full" : "w-1/4"} ${hasPeek ? "h-screen overflow-hidden" : ""}`}
      >
        <ListPageHeader
          icon={<Layers className="h-5 w-5" />}
          section="Catalog"
          title="Plans"
          subtitle="Manage subscription plans and products."
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
                    placeholder={tab === "plans" ? "Search plans" : "Search products"}
                  />
                </div>
                {canCreate ? (
                  tab === "plans" ? (
                    <button
                      onClick={() => navigate("/catalog/plans/new")}
                      className="new inline-flex items-center gap-1 rounded-full"
                    >
                      <Plus className="h-3 w-3" /> New Plan
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setProductModalInitial(null);
                        setProductModalOpen(true);
                      }}
                      className="new inline-flex items-center gap-1 rounded-full"
                    >
                      <Plus className="h-3 w-3" /> New Product
                    </button>
                  )
                ) : null}
              </div>
            ) : null
          }
        />

        <div className="px-4">
          <div className="inline-flex rounded-lg border border-kk-dark-input-border bg-kk-dark-bg p-1">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs ${
                tab === "plans" ? "bg-kk-dark-hover text-kk-dark-text" : "text-kk-dark-text-muted"
              }`}
              onClick={() => setTab("plans")}
            >
              Plans
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs ${
                tab === "products" ? "bg-kk-dark-hover text-kk-dark-text" : "text-kk-dark-text-muted"
              }`}
              onClick={() => setTab("products")}
            >
              Products
            </button>
          </div>
        </div>

        {!hasPeek ? (
          <div className="flex items-center justify-between px-4 text-xs text-kk-dark-text-muted">
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
        ) : null}

        {!hasPeek && tab === "plans" && selectedIds.length > 0 ? (
          <BulkActionBar
            count={selectedIds.length}
            onClear={clearSelection}
            actions={[
              {
                key: "bulk_edit",
                label: "Bulk Update",
                icon: <PencilSquareIcon className="h-4 w-4" />,
                disabled: bulkBusy || !can("Subscriptions", "edit"),
                onClick: () => setBulkModalOpen(true),
              },
            ]}
          />
        ) : null}

        <div className={hasPeek ? "flex-1 overflow-y-auto" : "overflow-hidden px-4"}>
          <table className="min-w-full">
            <thead>
              {tab === "plans" ? (
                <tr>
                  {!hasPeek ? <th className="w-10" /> : null}
                  <th className="cursor-pointer select-none" onClick={() => setPlanSort((s) => nextSort(s, "product"))}>
                    {!hasPeek ? "Product Name" : "Plan"}
                    {sortIndicator(planSort, "product")}
                  </th>
                  {!hasPeek ? (
                    <>
                      <th className="cursor-pointer select-none" onClick={() => setPlanSort((s) => nextSort(s, "name"))}>
                        Plan Name{sortIndicator(planSort, "name")}
                      </th>
                      <th className="cursor-pointer select-none" onClick={() => setPlanSort((s) => nextSort(s, "code"))}>
                        Plan Code{sortIndicator(planSort, "code")}
                      </th>
                      <th
                        className="cursor-pointer select-none"
                        onClick={() => setPlanSort((s) => nextSort(s, "description"))}
                      >
                        Description{sortIndicator(planSort, "description")}
                      </th>
                      <th className="cursor-pointer select-none" onClick={() => setPlanSort((s) => nextSort(s, "status"))}>
                        Status{sortIndicator(planSort, "status")}
                      </th>
                      <th
                        className="cursor-pointer select-none"
                        onClick={() => setPlanSort((s) => nextSort(s, "pricing_model"))}
                      >
                        Pricing Model{sortIndicator(planSort, "pricing_model")}
                      </th>
                      <th
                        className="cursor-pointer select-none"
                        onClick={() => setPlanSort((s) => nextSort(s, "billing_frequency"))}
                      >
                        Billing Frequency{sortIndicator(planSort, "billing_frequency")}
                      </th>
                      <th className="cursor-pointer select-none" onClick={() => setPlanSort((s) => nextSort(s, "price"))}>
                        Price{sortIndicator(planSort, "price")}
                      </th>
                    </>
                  ) : null}
                </tr>
              ) : (
                <tr>
                  <th className="cursor-pointer select-none" onClick={() => setProductSort((s) => nextSort(s, "name"))}>
                    {!hasPeek ? "Product Name" : "Product"}
                    {sortIndicator(productSort, "name")}
                  </th>
                  {!hasPeek ? (
                    <>
                      <th
                        className="cursor-pointer select-none"
                        onClick={() => setProductSort((s) => nextSort(s, "description"))}
                      >
                        Description{sortIndicator(productSort, "description")}
                      </th>
                      <th
                        className="cursor-pointer select-none"
                        onClick={() => setProductSort((s) => nextSort(s, "status"))}
                      >
                        Status{sortIndicator(productSort, "status")}
                      </th>
                      <th className="cursor-pointer select-none" onClick={() => setProductSort((s) => nextSort(s, "plans"))}>
                        Plans{sortIndicator(productSort, "plans")}
                      </th>
                      <th
                        className="cursor-pointer select-none"
                        onClick={() => setProductSort((s) => nextSort(s, "addons"))}
                      >
                        Addons{sortIndicator(productSort, "addons")}
                      </th>
                      <th
                        className="cursor-pointer select-none"
                        onClick={() => setProductSort((s) => nextSort(s, "coupons"))}
                      >
                        Coupons{sortIndicator(productSort, "coupons")}
                      </th>
                    </>
                  ) : null}
                </tr>
              )}
            </thead>
            <tbody>
              {tab === "plans"
                ? (rows as SubscriptionPlan[]).map((row) => (
                    <tr
                      key={row.id}
                      className={[
                        "cursor-pointer group",
                        !hasPeek && selectedIdSet.has(Number(row.id)) ? "bg-blue-600/10" : "",
                      ].join(" ")}
                      onClick={() => {
                        if (!hasPeek && selectedIds.length) {
                          toggleSelected(Number(row.id), !selectedIdSet.has(Number(row.id)));
                          return;
                        }
                        setSelectedProduct(null);
                        setSelectedPlan(row);
                      }}
                    >
                      {!hasPeek ? (
                        <td className="w-10 px-2">
                          <div className={selectedIdSet.has(Number(row.id)) ? "" : "opacity-0 group-hover:opacity-100"}>
                            <RowSelectCheckbox
                              checked={selectedIdSet.has(Number(row.id))}
                              onChange={(checked) => toggleSelected(Number(row.id), checked)}
                            />
                          </div>
                        </td>
                      ) : null}
                      <td>
                        {!hasPeek ? (
                          row.product_name || "-"
                        ) : (
                          <div className="flex flex-col gap-2">
                            <span>{row.name}</span>
                            <span className="text-[11px] text-kk-dark-text-muted">Code: {row.code}</span>
                            {statusBadge(row.status)}
                          </div>
                        )}
                      </td>
                      {!hasPeek ? (
                        <>
                          <td>{row.name}</td>
                          <td>{row.code}</td>
                          <td className="max-w-[360px]">
                            <span className="line-clamp-2 text-[11px] text-kk-dark-text-muted">
                              {row.description || "-"}
                            </span>
                          </td>
                          <td>{statusBadge(row.status)}</td>
                          <td>{formatPricingModel(row.pricing_model)}</td>
                          <td>{formatBillingFrequency(row.billing_frequency_value, row.billing_frequency_unit)}</td>
                          <td>{formatMoney(row.price)}</td>
                        </>
                      ) : null}
                    </tr>
                  ))
                : (rows as SubscriptionProduct[]).map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedPlan(null);
                        setSelectedProduct(row);
                      }}
                    >
                      <td>
                        {!hasPeek ? (
                          row.name
                        ) : (
                          <div className="flex flex-col gap-2">
                            <span>{row.name}</span>
                            {statusBadge(row.status)}
                          </div>
                        )}
                      </td>
                      {!hasPeek ? (
                        <>
                          <td className="max-w-[360px]">
                            <span className="line-clamp-2 text-[11px] text-kk-dark-text-muted">
                              {row.description || "-"}
                            </span>
                          </td>
                          <td>{statusBadge(row.status)}</td>
                          <td>{row.plans_count ?? 0}</td>
                          <td>{row.addons_count ?? 0}</td>
                          <td>{row.coupons_count ?? 0}</td>
                        </>
                      ) : null}
                    </tr>
                  ))}

              {loading ? (
                <tr>
                  <td
                    colSpan={hasPeek ? 1 : tab === "plans" ? 9 : 6}
                    className="px-3 py-8 text-center text-xs text-kk-dark-text-muted"
                  >
                    Loading {tab}...
                  </td>
                </tr>
              ) : null}

              {!loading && !rows.length ? (
                <tr>
                  <td
                    colSpan={hasPeek ? 1 : tab === "plans" ? 9 : 6}
                    className="px-3 py-10 text-center text-xs text-kk-dark-text-muted"
                  >
                    {tab === "plans"
                      ? "No plans yet. Click \"New Plan\" to create your first one."
                      : "No products yet. Click \"New Product\" to create your first one."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPlan ? (
        <SidePeek
          isOpen={Boolean(selectedPlan)}
          onClose={() => setSelectedPlan(null)}
          widthClass="w-3/4"
          actions={
            <div className="flex items-center gap-1">
              {can("Subscriptions", "edit") ? (
                <button type="button" onClick={() => navigate(`/catalog/plans/${selectedPlan.id}/edit`)}>
                  <span className="tooltip-b">Edit</span>
                  <PencilSquareIcon className="h-5 w-5 text-kk-muted" />
                </button>
              ) : null}
              {can("Subscriptions", "delete") ? (
                <button type="button" onClick={() => void deleteSelectedPlan()}>
                  <span className="tooltip-b">Delete</span>
                  <TrashIcon className="h-5 w-5 text-kk-muted" />
                </button>
              ) : null}
            </div>
          }
        >
          <PlanPeek
            plan={selectedPlan}
            canCreate={canCreate}
            onAssetsChanged={() => {
              setRefreshKey((x) => x + 1);
            }}
          />
        </SidePeek>
      ) : null}

      {selectedProduct ? (
        <SidePeek
          isOpen={Boolean(selectedProduct)}
          onClose={() => setSelectedProduct(null)}
          widthClass="w-3/4"
          actions={
            <div className="flex items-center gap-1">
              {can("Subscriptions", "edit") ? (
                <button
                  type="button"
                  onClick={() => {
                    setProductModalInitial(selectedProduct);
                    setProductModalOpen(true);
                  }}
                >
                  <span className="tooltip-b">Edit</span>
                  <PencilSquareIcon className="h-5 w-5 text-kk-muted" />
                </button>
              ) : null}
              {can("Subscriptions", "delete") ? (
                <button type="button" onClick={() => void deleteSelectedProduct()}>
                  <span className="tooltip-b">Delete</span>
                  <TrashIcon className="h-5 w-5 text-kk-muted" />
                </button>
              ) : null}
            </div>
          }
        >
          <ProductPeek
            product={selectedProduct}
            canCreate={canCreate}
            onOpenPlan={(plan) => {
              setSelectedProduct(null);
              setSelectedPlan(plan);
            }}
            onAssetsChanged={() => {
              setRefreshKey((x) => x + 1);
            }}
          />
        </SidePeek>
      ) : null}

      <SubscriptionProductModal
        open={productModalOpen}
        initial={productModalInitial}
        onClose={() => {
          setProductModalOpen(false);
          setProductModalInitial(null);
        }}
        onSaved={(saved) => {
          setProducts((prev) => {
            const exists = prev.some((x) => x.id === saved.id);
            if (exists) return prev.map((x) => (x.id === saved.id ? saved : x));
            return [saved, ...prev];
          });
          if (selectedProduct?.id === saved.id) setSelectedProduct(saved);
          showToast(productModalInitial ? "Product updated." : "Product created.");
          setRefreshKey((x) => x + 1);
        }}
      />

      <SubscriptionPlanBulkEditModal
        open={bulkModalOpen}
        selectedPlans={selectedPlansForBulk}
        onClose={() => setBulkModalOpen(false)}
        onApply={async (payload) => {
          setBulkBusy(true);
          try {
            const result = await bulkUpdateSubscriptionPlans(payload);
            const okCount = result.ok_ids?.length ?? 0;
            const failed = result.failed ?? [];
            const failedIds = failed.map((row) => Number(row.id)).filter(Number.isFinite);

            setRefreshKey((x) => x + 1);

            if (okCount && !failed.length) {
              showToast(`Updated ${okCount} plan${okCount === 1 ? "" : "s"}.`);
              clearSelection();
              return;
            }

            if (okCount && failed.length) {
              const firstFailure = failed[0]?.detail || "Some plans could not be updated.";
              showToast(`Updated ${okCount} plan(s). ${failed.length} failed. ${firstFailure}`, "info");
              setSelectedIds(failedIds);
              return;
            }

            showToast(failed[0]?.detail || "Bulk update failed.", "error");
            setSelectedIds(failedIds);
          } finally {
            setBulkBusy(false);
          }
        }}
      />

      <ToastModal
        message={toastMessage}
        variant={toastVariant}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
}
