import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { TabNav } from "../../../components/layout/TabNav";
import {
  fetchSubscriptionAddons,
  fetchSubscriptionCoupons,
  fetchSubscriptionPlans,
  fetchSubscriptionProduct,
} from "../../../api/subscriptions";
import {
  formatPricingModel,
  type SubscriptionAddon,
  type SubscriptionCoupon,
  type SubscriptionPlan,
  type SubscriptionProduct,
} from "../../../types/subscriptions";
import { SubscriptionAddonModal, SubscriptionCouponModal } from "./SubscriptionModals";

type Props = {
  product: SubscriptionProduct;
  canCreate: boolean;
  onOpenPlan: (plan: SubscriptionPlan) => void;
  onAssetsChanged?: () => void;
};

function statusBadge(label: string) {
  const tone = label === "ACTIVE" ? "bg-emerald-700 text-emerald-100" : "bg-slate-500 text-slate-100";
  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${tone}`}>{label}</span>;
}

export function ProductPeek({ product, canCreate, onOpenPlan, onAssetsChanged }: Props) {
  const [tab, setTab] = useState<"overview" | "plans" | "addons" | "coupons">("overview");
  const [productDetail, setProductDetail] = useState<SubscriptionProduct | null>(null);

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [addons, setAddons] = useState<SubscriptionAddon[]>([]);
  const [addonsLoading, setAddonsLoading] = useState(false);
  const [coupons, setCoupons] = useState<SubscriptionCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);

  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [couponModalOpen, setCouponModalOpen] = useState(false);

  useEffect(() => {
    setTab("overview");
    setProductDetail(null);
  }, [product.id]);

  useEffect(() => {
    let cancelled = false;
    if (!product.id) return;

    (async () => {
      try {
        const data = await fetchSubscriptionProduct(product.id!);
        if (!cancelled) setProductDetail(data);
      } catch {
        if (!cancelled) setProductDetail(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [product.id]);

  const activeProduct = productDetail ?? product;
  const productId = activeProduct.id ?? null;

  const loadPlans = async () => {
    if (!productId) return;
    setPlansLoading(true);
    try {
      const data = await fetchSubscriptionPlans({ product: productId, page_size: 200 });
      setPlans(data.results ?? []);
    } catch {
      setPlans([]);
    } finally {
      setPlansLoading(false);
    }
  };

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

  useEffect(() => {
    if (tab === "plans") {
      void loadPlans();
    }
    if (tab === "addons") {
      void loadAddons();
    }
    if (tab === "coupons") {
      void loadCoupons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, productId]);

  const plansCount = useMemo(() => activeProduct.plans_count ?? plans.length, [activeProduct.plans_count, plans.length]);
  const addonsCount = useMemo(() => activeProduct.addons_count ?? addons.length, [activeProduct.addons_count, addons.length]);
  const couponsCount = useMemo(() => activeProduct.coupons_count ?? coupons.length, [activeProduct.coupons_count, coupons.length]);

  return (
    <div className="flex h-full flex-col gap-7 p-5 pb-7">
      <div className="flex flex-col items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold">{activeProduct.name}</h2>
          <p className="text-sm text-kk-dark-text-muted">Subscription Product</p>
        </div>

        <div className="flex flex-wrap gap-x-7 gap-y-2">
          <TabNav action={() => setTab("overview")} isActive={tab === "overview"}>
            Overview
          </TabNav>
          <TabNav action={() => setTab("plans")} isActive={tab === "plans"}>
            Plans
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
            <p className="col-span-2 text-kk-dark-text-muted">Status</p>
            <p className="col-span-8">{statusBadge(activeProduct.status)}</p>
          </div>
          <div className="grid grid-cols-10">
            <p className="col-span-2 text-kk-dark-text-muted">Plans</p>
            <p className="col-span-8">{plansCount}</p>
          </div>
          <div className="grid grid-cols-10">
            <p className="col-span-2 text-kk-dark-text-muted">Add-ons</p>
            <p className="col-span-8">{addonsCount}</p>
          </div>
          <div className="grid grid-cols-10">
            <p className="col-span-2 text-kk-dark-text-muted">Coupons</p>
            <p className="col-span-8">{couponsCount}</p>
          </div>
          {activeProduct.description ? (
            <div className="flex flex-col gap-1">
              <p className="text-kk-dark-text-muted">Description</p>
              <p>{activeProduct.description}</p>
            </div>
          ) : (
            <p className="text-sm text-kk-dark-text-muted">No description.</p>
          )}
        </div>
      )}

      {tab === "plans" && (
        <div className="flex h-full flex-col gap-3 pb-7">
          <h3 className="text-lg font-bold">Plans for this product</h3>
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Plan Name</th>
                <th>Plan Code</th>
                <th>Status</th>
                <th>Pricing Scheme</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((row) => (
                <tr key={row.id} className="cursor-pointer" onClick={() => onOpenPlan(row)}>
                  <td>{row.name}</td>
                  <td>{row.code}</td>
                  <td>{statusBadge(row.status)}</td>
                  <td>{formatPricingModel(row.pricing_model)}</td>
                </tr>
              ))}
              {plansLoading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-xs text-kk-dark-text-muted">
                    Loading plans...
                  </td>
                </tr>
              ) : null}
              {!plansLoading && !plans.length ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-xs text-kk-dark-text-muted">
                    No plans found for this product.
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
        productId={productId}
        onClose={() => setAddonModalOpen(false)}
        onSaved={() => {
          void loadAddons();
          onAssetsChanged?.();
        }}
      />

      <SubscriptionCouponModal
        open={couponModalOpen}
        productId={productId}
        onClose={() => setCouponModalOpen(false)}
        onSaved={() => {
          void loadCoupons();
          onAssetsChanged?.();
        }}
      />
    </div>
  );
}
