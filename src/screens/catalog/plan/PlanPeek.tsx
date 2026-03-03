import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { TabNav } from "../../../components/layout/TabNav";
import {
  fetchSubscriptionAddons,
  fetchSubscriptionCoupons,
  fetchSubscriptionPlan,
  fetchSubscriptionPlanTransactions,
} from "../../../api/subscriptions";
import {
  formatBillingFrequency,
  formatPricingModel,
  PLAN_TRANSACTION_STATUS_CHOICES,
  type SubscriptionAddon,
  type SubscriptionCoupon,
  type SubscriptionPlan,
  type SubscriptionPlanTransaction,
} from "../../../types/subscriptions";
import { SubscriptionAddonModal, SubscriptionCouponModal } from "./SubscriptionModals";

type Props = {
  plan: SubscriptionPlan;
  canCreate: boolean;
  onAssetsChanged?: () => void;
};

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

function statusBadge(label: string) {
  const tone =
    label === "ACTIVE" || label === "PAID"
      ? "bg-emerald-700 text-emerald-100"
      : label === "PENDING"
        ? "bg-amber-700 text-amber-100"
        : label === "FAILED"
          ? "bg-rose-700 text-rose-100"
          : "bg-slate-500 text-slate-100";
  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${tone}`}>{label}</span>;
}

export function PlanPeek({ plan, canCreate, onAssetsChanged }: Props) {
  const [tab, setTab] = useState<"overview" | "transactions" | "addons" | "coupons">("overview");
  const [planDetail, setPlanDetail] = useState<SubscriptionPlan | null>(null);

  const [addons, setAddons] = useState<SubscriptionAddon[]>([]);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [coupons, setCoupons] = useState<SubscriptionCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [transactions, setTransactions] = useState<SubscriptionPlanTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);

  useEffect(() => {
    setTab("overview");
    setPlanDetail(null);
  }, [plan.id]);

  useEffect(() => {
    let cancelled = false;
    if (!plan.id) return;

    (async () => {
      try {
        const data = await fetchSubscriptionPlan(plan.id!);
        if (!cancelled) setPlanDetail(data);
      } catch {
        if (!cancelled) setPlanDetail(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [plan.id]);

  const activePlan = planDetail ?? plan;
  const productId = activePlan.product;

  const loadAddons = async () => {
    if (!productId) return;
    setAddonsLoading(true);
    try {
      const data = await fetchSubscriptionAddons({ product: productId, page_size: 200 });
      setAddons(data.results ?? []);
    } catch {
      setAddons([]);
    } finally {
      setAddonsLoading(false);
    }
  };

  const loadCoupons = async () => {
    if (!productId) return;
    setCouponsLoading(true);
    try {
      const data = await fetchSubscriptionCoupons({ product: productId, page_size: 200 });
      setCoupons(data.results ?? []);
    } catch {
      setCoupons([]);
    } finally {
      setCouponsLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!plan.id) return;
    setTransactionsLoading(true);
    try {
      const data = await fetchSubscriptionPlanTransactions({ plan: plan.id, page_size: 200 });
      setTransactions(data.results ?? []);
    } catch {
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "addons") {
      void loadAddons();
    }
    if (tab === "coupons") {
      void loadCoupons();
    }
    if (tab === "transactions") {
      void loadTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, productId, plan.id]);

  const billingCyclesText = useMemo(() => {
    if (activePlan.plan_type === "USAGE") {
      if (activePlan.billing_cycles_mode === "AUTO_RENEW") return "No expiry (ends when included uses are exhausted)";
      return activePlan.billing_cycles ? `Expires after ${activePlan.billing_cycles} interval(s)` : "-";
    }
    if (activePlan.billing_cycles_mode === "AUTO_RENEW") return "Auto-renews until canceled";
    return activePlan.billing_cycles ? `Expires after ${activePlan.billing_cycles} billing cycle(s)` : "-";
  }, [activePlan.billing_cycles, activePlan.billing_cycles_mode, activePlan.plan_type]);

  return (
    <div className="flex h-full flex-col gap-7 p-5 pb-7">
      <div className="flex flex-col items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold">{activePlan.name}</h2>
          <p className="text-sm text-kk-dark-text-muted">
            {activePlan.product_name ?? "Subscription Product"} | Code: {activePlan.code}
          </p>
        </div>

        <div className="flex flex-wrap gap-x-7 gap-y-2">
          <TabNav action={() => setTab("overview")} isActive={tab === "overview"}>
            Overview
          </TabNav>
          <TabNav action={() => setTab("transactions")} isActive={tab === "transactions"}>
            Transactions
          </TabNav>
          <TabNav action={() => setTab("addons")} isActive={tab === "addons"}>
            Add-ons
          </TabNav>
          <TabNav action={() => setTab("coupons")} isActive={tab === "coupons"}>
            Coupons
          </TabNav>
        </div>
      </div>

      {tab === "overview" && (
        <div className="flex h-full flex-col gap-4 pb-7">
          <div className="grid grid-cols-10">
            <p className="col-span-2 text-kk-dark-text-muted">Product</p>
            <p className="col-span-8">{activePlan.product_name ?? "-"}</p>
          </div>
          <div className="grid grid-cols-10">
            <p className="col-span-2 text-kk-dark-text-muted">Status</p>
            <p className="col-span-8">{statusBadge(activePlan.status)}</p>
          </div>
          <div className="grid grid-cols-10">
            <p className="col-span-2 text-kk-dark-text-muted">Plan Type</p>
            <p className="col-span-8">
              {activePlan.plan_type === "USAGE" ? "Usage-based (Bundle Card)" : "Cycle-based"}
            </p>
          </div>
          {activePlan.plan_type === "USAGE" ? (
            <div className="grid grid-cols-10">
              <p className="col-span-2 text-kk-dark-text-muted">Included Uses</p>
              <p className="col-span-8">{activePlan.included_uses ?? "-"}</p>
            </div>
          ) : null}
          <div className="grid grid-cols-10">
            <p className="col-span-2 text-kk-dark-text-muted">Billing Frequency</p>
            <p className="col-span-8">
              {formatBillingFrequency(activePlan.billing_frequency_value, activePlan.billing_frequency_unit)}
            </p>
          </div>
          <div className="grid grid-cols-10">
            <p className="col-span-2 text-kk-dark-text-muted">Billing Cycles</p>
            <p className="col-span-8">{billingCyclesText}</p>
          </div>
          <div className="grid grid-cols-10">
            <p className="col-span-2 text-kk-dark-text-muted">Pricing Model</p>
            <p className="col-span-8">{formatPricingModel(activePlan.pricing_model)}</p>
          </div>
          <div className="grid grid-cols-10">
            <p className="col-span-2 text-kk-dark-text-muted">Price</p>
            <p className="col-span-8">{formatMoney(activePlan.price)}</p>
          </div>
          <div className="grid grid-cols-10">
            <p className="col-span-2 text-kk-dark-text-muted">Setup Fee</p>
            <p className="col-span-8">{formatMoney(activePlan.setup_fee ?? "0.00")}</p>
          </div>
          <div className="grid grid-cols-10">
            <p className="col-span-2 text-kk-dark-text-muted">Type</p>
            <p className="col-span-8">{activePlan.type_id === "GOOD" ? "Goods" : "Service"}</p>
          </div>
          <div className="grid grid-cols-10">
            <p className="col-span-2 text-kk-dark-text-muted">Sales Tax Rule</p>
            <p className="col-span-8">{activePlan.sales_tax_rule_name ?? "-"}</p>
          </div>
          <div className="grid grid-cols-10">
            <p className="col-span-2 text-kk-dark-text-muted">Plan Change</p>
            <p className="col-span-8">
              {activePlan.allow_plan_switch ? "Allow switching from customer portal" : "Not allowed"}
            </p>
          </div>
          {activePlan.description ? (
            <div className="flex flex-col gap-1">
              <p className="text-kk-dark-text-muted">Description</p>
              <p>{activePlan.description}</p>
            </div>
          ) : null}
        </div>
      )}

      {tab === "transactions" && (
        <div className="flex h-full flex-col gap-3 pb-7">
          <h3 className="text-lg font-bold">Transactions</h3>
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Subscriber</th>
                <th>Status</th>
                <th>Billed On</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((row) => {
                const statusLabel =
                  PLAN_TRANSACTION_STATUS_CHOICES.find((x) => x.value === row.status)?.label ?? row.status;
                return (
                  <tr key={row.id}>
                    <td>{row.reference}</td>
                    <td>{row.subscriber_name || "-"}</td>
                    <td>{statusBadge(statusLabel.toUpperCase())}</td>
                    <td>{new Date(row.billed_on).toLocaleString()}</td>
                    <td>{formatMoney(row.amount, row.currency || "NGN")}</td>
                  </tr>
                );
              })}
              {transactionsLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-kk-dark-text-muted">
                    Loading transactions...
                  </td>
                </tr>
              ) : null}
              {!transactionsLoading && !transactions.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-kk-dark-text-muted">
                    No transactions found for this plan.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {tab === "addons" && (
        <div className="flex h-full flex-col gap-3 pb-7">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Add-ons</h3>
            {canCreate ? (
              <button
                type="button"
                onClick={() => setAddonModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-full bg-purple-600 px-3 py-1.5 text-xs text-white hover:bg-purple-700"
              >
                <Plus className="h-3 w-3" /> Addon
              </button>
            ) : null}
          </div>
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Addon Code</th>
                <th>Status</th>
                <th>Addon Type</th>
                <th>Pricing Scheme</th>
              </tr>
            </thead>
            <tbody>
              {addons.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.code}</td>
                  <td>{statusBadge(row.status)}</td>
                  <td>{row.addon_type === "ONE_TIME" ? "One-time" : "Recurring"}</td>
                  <td>{formatPricingModel(row.pricing_model)}</td>
                </tr>
              ))}
              {addonsLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-kk-dark-text-muted">
                    Loading add-ons...
                  </td>
                </tr>
              ) : null}
              {!addonsLoading && !addons.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-kk-dark-text-muted">
                    No add-ons found for this product.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {tab === "coupons" && (
        <div className="flex h-full flex-col gap-3 pb-7">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Coupons</h3>
            {canCreate ? (
              <button
                type="button"
                onClick={() => setCouponModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-full bg-purple-600 px-3 py-1.5 text-xs text-white hover:bg-purple-700"
              >
                <Plus className="h-3 w-3" /> Coupon
              </button>
            ) : null}
          </div>
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Coupon Code</th>
                <th>Discount Value</th>
                <th>Discount By</th>
                <th>Redemption Type</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{row.code}</td>
                  <td>{row.discount_value}</td>
                  <td>{row.discount_by === "PERCENT" ? "Percentage" : "Amount"}</td>
                  <td>{row.redemption_type === "ONE_TIME" ? "One-time" : "Recurring"}</td>
                </tr>
              ))}
              {couponsLoading ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-kk-dark-text-muted">
                    Loading coupons...
                  </td>
                </tr>
              ) : null}
              {!couponsLoading && !coupons.length ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-xs text-kk-dark-text-muted">
                    No coupons found for this product.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      <SubscriptionAddonModal
        open={addonModalOpen}
        productId={productId ?? null}
        onClose={() => setAddonModalOpen(false)}
        onSaved={() => {
          void loadAddons();
          onAssetsChanged?.();
        }}
      />

      <SubscriptionCouponModal
        open={couponModalOpen}
        productId={productId ?? null}
        onClose={() => setCouponModalOpen(false)}
        onSaved={() => {
          void loadCoupons();
          onAssetsChanged?.();
        }}
      />
    </div>
  );
}
