import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layers, Plus, Trash2 } from "lucide-react";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";
import { fetchTaxRules, searchItems } from "../../../api/catalog";
import {
  createSubscriptionPlan,
  fetchSubscriptionCoupons,
  fetchSubscriptionPlan,
  fetchSubscriptionProducts,
  updateSubscriptionPlan,
} from "../../../api/subscriptions";
import { ItemSearchSelect, type ItemOption } from "../../../components/catalog/ItemSearchSelect";
import {
  BILLING_CYCLES_MODE_CHOICES,
  BILLING_FREQUENCY_UNIT_CHOICES,
  PLAN_PRICING_MODEL_CHOICES,
  PLAN_TYPE_CHOICES,
  SUBSCRIPTION_PLAN_REDEEM_INTERVAL_CHOICES,
  SUBSCRIPTION_PLAN_WEEKDAY_CHOICES,
  SUBSCRIPTION_STATUS_CHOICES,
  SUBSCRIPTION_TYPE_CHOICES,
  type BillingCyclesMode,
  type BillingFrequencyUnit,
  type PlanPricingModel,
  type PlanType,
  type SubscriptionPlan,
  type SubscriptionPlanRedeemInterval,
  type SubscriptionPlanRedeemableItemInput,
  type SubscriptionCoupon,
  type SubscriptionPlanWeekday,
  type SubscriptionProduct,
  type SubscriptionStatus,
  type SubscriptionType,
} from "../../../types/subscriptions";
import type { TaxRule } from "../../../types/catalog";
import { SubscriptionProductModal } from "./SubscriptionModals";

type ScheduleRow = {
  weekday: SubscriptionPlanWeekday;
  enabled: boolean;
  all_day: boolean;
  start_time: string;
  end_time: string;
};
type RedeemableRow = {
  row_id: string;
  item: number | null;
  item_label: string;
  item_sku: string;
  max_redemptions: number;
  interval_unit: SubscriptionPlanRedeemInterval;
  interval_value: number;
  use_schedule: boolean;
  schedules: ScheduleRow[];
};
type FormState = {
  product: number | "";
  name: string;
  code: string;
  plan_type: PlanType;
  included_uses: number | "";
  billing_frequency_value: number | "";
  billing_frequency_unit: BillingFrequencyUnit;
  billing_cycles_mode: BillingCyclesMode;
  billing_cycles: number | "";
  description: string;
  pricing_model: PlanPricingModel;
  price: string;
  setup_fee: string;
  type_id: SubscriptionType;
  sales_tax_rule: number | "";
  allow_plan_switch: boolean;
  uses_physical_card: boolean;
  requires_card_serial: boolean;
  status: SubscriptionStatus;
  redeemable_items: RedeemableRow[];
  coupon_ids: number[];
};

const rowId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const schedules = (): ScheduleRow[] =>
  SUBSCRIPTION_PLAN_WEEKDAY_CHOICES.map(({ value }) => ({ weekday: value, enabled: false, all_day: true, start_time: "", end_time: "" }));
const emptyItem = (): RedeemableRow => ({
  row_id: rowId(),
  item: null,
  item_label: "",
  item_sku: "",
  max_redemptions: 0,
  interval_unit: "NONE",
  interval_value: 1,
  use_schedule: false,
  schedules: schedules(),
});
const EMPTY: FormState = {
  product: "",
  name: "",
  code: "",
  plan_type: "CYCLE",
  included_uses: "",
  billing_frequency_value: 1,
  billing_frequency_unit: "MONTH",
  billing_cycles_mode: "AUTO_RENEW",
  billing_cycles: "",
  description: "",
  pricing_model: "FLAT",
  price: "",
  setup_fee: "",
  type_id: "SERVICE",
  sales_tax_rule: "",
  allow_plan_switch: false,
  uses_physical_card: false,
  requires_card_serial: false,
  status: "ACTIVE",
  redeemable_items: [],
  coupon_ids: [],
};

const errMsg = (err: unknown) => {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (!data) return "Failed to save plan.";
  if (typeof data === "string") return data;
  const obj = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null;
  const detail = obj?.detail;
  if (typeof detail === "string") return detail;
  const first = obj ? Object.values(obj)[0] : null;
  if (Array.isArray(first) && first[0] && typeof first[0] === "string") return first[0];
  return "Failed to save plan.";
};

export default function PlanFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [availableCoupons, setAvailableCoupons] = useState<SubscriptionCoupon[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, t] = await Promise.all([fetchSubscriptionProducts({ page_size: 300 }), fetchTaxRules({ page_size: 300 })]);
        if (!cancelled) {
          setProducts(p.results ?? []);
          setTaxRules(t.results ?? []);
        }
      } catch {
        if (!cancelled) {
          setProducts([]);
          setTaxRules([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchSubscriptionPlan(Number(id));
        if (cancelled) return;
        setForm({
          product: data.product ?? "",
          name: data.name ?? "",
          code: data.code ?? "",
          plan_type: data.plan_type ?? "CYCLE",
          included_uses: data.included_uses ?? "",
          billing_frequency_value: data.billing_frequency_value ?? 1,
          billing_frequency_unit: data.billing_frequency_unit ?? "MONTH",
          billing_cycles_mode: data.billing_cycles_mode ?? "AUTO_RENEW",
          billing_cycles: data.billing_cycles ?? "",
          description: data.description ?? "",
          pricing_model: data.pricing_model ?? "FLAT",
          price: data.price ?? "",
          setup_fee: data.setup_fee ?? "",
          type_id: data.type_id ?? "SERVICE",
          sales_tax_rule: data.sales_tax_rule ?? "",
          allow_plan_switch: Boolean(data.allow_plan_switch),
          uses_physical_card: Boolean(data.uses_physical_card),
          requires_card_serial: Boolean(data.requires_card_serial),
          status: data.status ?? "ACTIVE",
          coupon_ids: (data.coupons ?? []).map((c) => Number(c.id)).filter((x) => Number.isFinite(x)),
          redeemable_items: (data.redeemable_items ?? []).map((r) => {
            const byDay = new Map((r.schedules ?? []).map((s) => [s.weekday, s] as const));
            return {
              row_id: rowId(),
              item: r.item ?? null,
              item_label: r.item_name ?? "",
              item_sku: r.item_sku ?? "",
              max_redemptions: Number(r.max_redemptions ?? 0),
              interval_unit: r.interval_unit ?? "NONE",
              interval_value: Number(r.interval_value ?? 1),
              use_schedule: Boolean((r.schedules ?? []).length),
              schedules: SUBSCRIPTION_PLAN_WEEKDAY_CHOICES.map(({ value }) => {
                const s = byDay.get(value);
                return { weekday: value, enabled: Boolean(s), all_day: s?.all_day ?? true, start_time: s?.start_time ?? "", end_time: s?.end_time ?? "" };
              }),
            };
          }),
        });
      } catch {
        if (!cancelled) setError("Unable to load plan.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    const productId = Number(form.product || 0);
    if (!productId) {
      setAvailableCoupons([]);
      setForm((p) => ({ ...p, coupon_ids: [] }));
      return;
    }
    (async () => {
      try {
        const data = await fetchSubscriptionCoupons({ product: productId, page_size: 300 });
        if (cancelled) return;
        const rows = data.results ?? [];
        setAvailableCoupons(rows);
        const validIds = new Set(rows.map((c) => Number(c.id)));
        setForm((p) => ({
          ...p,
          coupon_ids: (p.coupon_ids ?? []).filter((idValue) => validIds.has(Number(idValue))),
        }));
      } catch {
        if (!cancelled) setAvailableCoupons([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.product]);

  const selectedProductExists = useMemo(() => products.some((p) => p.id === form.product), [form.product, products]);
  const billingModeChoices = form.plan_type === "USAGE"
    ? [{ value: "AUTO_RENEW" as BillingCyclesMode, label: "No expiry (ends when uses are exhausted)" }, { value: "FIXED" as BillingCyclesMode, label: "Set a fixed expiry interval" }]
    : BILLING_CYCLES_MODE_CHOICES;
  const showUsageExpiryInterval = form.plan_type !== "USAGE" || form.billing_cycles_mode === "FIXED";
  const loadItemOptions = useCallback(async (q: string, signal?: AbortSignal): Promise<ItemOption[]> => {
    const query = q.trim();
    if (!query) return [];
    const out = await searchItems(query, { page_size: 25, signal });
    return (out.results ?? []).map((i) => ({ id: Number(i.id), label: i.name || i.sku || `Item #${i.id}`, subLabel: i.sku ? `SKU: ${i.sku}` : undefined }));
  }, []);
  const patchItem = (idValue: string, patch: Partial<RedeemableRow>) =>
    setForm((p) => ({ ...p, redeemable_items: p.redeemable_items.map((r) => (r.row_id === idValue ? { ...r, ...patch } : r)) }));
  const patchSchedule = (idValue: string, day: SubscriptionPlanWeekday, patch: Partial<ScheduleRow>) =>
    setForm((p) => ({ ...p, redeemable_items: p.redeemable_items.map((r) => r.row_id !== idValue ? r : { ...r, schedules: r.schedules.map((s) => (s.weekday === day ? { ...s, ...patch } : s)) }) }));

  const validate = () => {
    if (!form.product || !selectedProductExists) return "Product is required.";
    if (!form.name.trim() || !form.code.trim()) return "Plan name and code are required.";
    if (form.plan_type === "USAGE" && (!form.included_uses || Number(form.included_uses) < 1)) return "Included uses must be at least 1.";
    if (showUsageExpiryInterval && (!form.billing_frequency_value || Number(form.billing_frequency_value) < 1)) return "Billing frequency value must be at least 1.";
    if (form.billing_cycles_mode === "FIXED" && (!form.billing_cycles || Number(form.billing_cycles) < 1)) return "Billing cycles must be at least 1.";
    const price = Number(form.price); if (!Number.isFinite(price) || price < 0) return "Price is required.";
    const setup = form.setup_fee.trim() ? Number(form.setup_fee) : 0; if (!Number.isFinite(setup) || setup < 0) return "Setup fee must be valid.";
    if (form.requires_card_serial && !form.uses_physical_card) return "Card serial capture requires physical cards to be enabled.";
    const seen = new Set<number>();
    for (let i = 0; i < form.redeemable_items.length; i += 1) {
      const r = form.redeemable_items[i];
      if (!r.item) return `Redeemable item #${i + 1}: item is required.`;
      if (seen.has(r.item)) return `Redeemable item #${i + 1}: duplicate item selected.`;
      seen.add(r.item);
      if (r.max_redemptions < 0) return `Redeemable item #${i + 1}: total redemptions cannot be negative.`;
      if (r.interval_unit !== "NONE" && r.interval_value < 1) return `Redeemable item #${i + 1}: interval limit must be at least 1.`;
      if (r.use_schedule) {
        const enabled = r.schedules.filter((s) => s.enabled); if (!enabled.length) return `Redeemable item #${i + 1}: enable at least one day.`;
        for (const d of enabled) {
          if (d.all_day) continue;
          if (!d.start_time || !d.end_time) return `Redeemable item #${i + 1}: ${d.weekday} needs start/end time.`;
          if (d.start_time >= d.end_time) return `Redeemable item #${i + 1}: ${d.weekday} start must be before end.`;
        }
      }
    }

    const availableCouponIds = new Set(availableCoupons.map((c) => Number(c.id)));
    const invalidCouponIds = (form.coupon_ids ?? []).filter((x) => !availableCouponIds.has(Number(x)));
    if (invalidCouponIds.length) {
      return "Selected coupons must belong to the selected subscription product.";
    }

    return null;
  };

  const buildRedeemableItemsInput = (): SubscriptionPlanRedeemableItemInput[] =>
    form.redeemable_items.filter((r) => r.item != null).map((r) => ({
      item: Number(r.item),
      max_redemptions: Number(r.max_redemptions || 0),
      interval_unit: r.interval_unit,
      interval_value: r.interval_unit === "NONE" ? 1 : Number(r.interval_value || 1),
      schedules: r.use_schedule ? r.schedules.filter((s) => s.enabled).map((s) => ({ weekday: s.weekday, all_day: s.all_day, start_time: s.all_day ? null : s.start_time || null, end_time: s.all_day ? null : s.end_time || null })) : [],
    }));

  const onSubmit = async () => {
    const e = validate(); if (e) return setError(e);
    const payload: Partial<SubscriptionPlan> = {
      product: Number(form.product), name: form.name.trim(), code: form.code.trim(),
      plan_type: form.plan_type, included_uses: form.plan_type === "USAGE" ? Number(form.included_uses) : null,
      billing_frequency_value: Number(showUsageExpiryInterval ? form.billing_frequency_value : form.billing_frequency_value || 1),
      billing_frequency_unit: form.billing_frequency_unit, billing_cycles_mode: form.billing_cycles_mode,
      billing_cycles: form.billing_cycles_mode === "FIXED" ? Number(form.billing_cycles) : null, description: form.description.trim(),
      pricing_model: form.pricing_model, price: Number(form.price).toFixed(2), setup_fee: (form.setup_fee.trim() ? Number(form.setup_fee) : 0).toFixed(2),
      type_id: form.type_id, sales_tax_rule: form.sales_tax_rule ? Number(form.sales_tax_rule) : null, allow_plan_switch: form.allow_plan_switch,
      uses_physical_card: form.uses_physical_card, requires_card_serial: form.uses_physical_card ? form.requires_card_serial : false,
      status: form.status, redeemable_items_input: buildRedeemableItemsInput(), coupon_ids: form.coupon_ids ?? [],
    };
    setSaving(true); setError(null);
    try {
      const saved = isEdit && id ? await updateSubscriptionPlan(Number(id), payload) : await createSubscriptionPlan(payload);
      navigate("/catalog/plans", { replace: true, state: { selectedPlanId: saved.id } });
    } catch (err: unknown) { setError(errMsg(err)); } finally { setSaving(false); }
  };

  return (
    <div className="flex h-full flex-col">
      <ListPageHeader icon={<Layers className="h-5 w-5" />} section="Catalog" title={isEdit ? "Edit Plan" : "New Plan"} subtitle="Create and maintain subscription plans." right={<button type="button" className="rounded-full border border-kk-dark-input-border px-3 py-1.5 text-xs hover:bg-kk-dark-hover" onClick={() => navigate("/catalog/plans")}>Back to Plans</button>} />
      <div className="mx-auto w-full max-w-5xl flex-1 overflow-auto px-6 py-6">
        {loading ? (
          <div className="text-sm text-kk-dark-text-muted">Loading plan...</div>
        ) : (
          <form
            className="space-y-4 rounded-xl border border-kk-dark-border bg-kk-dark-bg-elevated p-5"
            onSubmit={(e) => {
              e.preventDefault();
              void onSubmit();
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Product *</span>
                <select
                  value={form.product}
                  onChange={(e) => setForm((p) => ({ ...p, product: e.target.value ? Number(e.target.value) : "" }))}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-kk-dark-input-border px-3 py-2 text-xs hover:bg-kk-dark-hover"
                  disabled={saving}
                >
                  <Plus className="h-3 w-3" /> New Product
                </button>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Plan Name *</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Plan Code *</span>
                <input
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Plan Type *</span>
                <select
                  value={form.plan_type}
                  onChange={(e) => setForm((p) => ({ ...p, plan_type: e.target.value as PlanType, included_uses: e.target.value === "USAGE" ? (p.included_uses || 1) : "" }))}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                >
                  {PLAN_TYPE_CHOICES.map((x) => (
                    <option key={x.value} value={x.value}>{x.label}</option>
                  ))}
                </select>
              </label>
              {form.plan_type === "USAGE" ? (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-kk-dark-text-muted">Included Uses *</span>
                  <input
                    type="number"
                    min={1}
                    value={form.included_uses}
                    onChange={(e) => setForm((p) => ({ ...p, included_uses: e.target.value ? Number(e.target.value) : "" }))}
                    className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    disabled={saving}
                  />
                </label>
              ) : null}

              {showUsageExpiryInterval ? (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-kk-dark-text-muted">{form.plan_type === "USAGE" ? "Usage Expiry Interval *" : "Billing Frequency *"}</span>
                    <input
                      type="number"
                      min={1}
                      value={form.billing_frequency_value}
                      onChange={(e) => setForm((p) => ({ ...p, billing_frequency_value: e.target.value ? Number(e.target.value) : "" }))}
                      className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      disabled={saving}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-kk-dark-text-muted">Frequency Unit</span>
                    <select
                      value={form.billing_frequency_unit}
                      onChange={(e) => setForm((p) => ({ ...p, billing_frequency_unit: e.target.value as BillingFrequencyUnit }))}
                      className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      disabled={saving}
                    >
                      {BILLING_FREQUENCY_UNIT_CHOICES.map((x) => (
                        <option key={x.value} value={x.value}>{x.label}</option>
                      ))}
                    </select>
                  </label>
                </>
              ) : null}

              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">{form.plan_type === "USAGE" ? "Usage Expiry Mode *" : "Billing Cycles *"}</span>
                <select
                  value={form.billing_cycles_mode}
                  onChange={(e) => setForm((p) => ({ ...p, billing_cycles_mode: e.target.value as BillingCyclesMode }))}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                >
                  {billingModeChoices.map((x) => (
                    <option key={x.value} value={x.value}>{x.label}</option>
                  ))}
                </select>
              </label>
              {form.billing_cycles_mode === "FIXED" ? (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-kk-dark-text-muted">{form.plan_type === "USAGE" ? "No. of Expiry Intervals *" : "No. of Billing Cycles *"}</span>
                  <input
                    type="number"
                    min={1}
                    value={form.billing_cycles}
                    onChange={(e) => setForm((p) => ({ ...p, billing_cycles: e.target.value ? Number(e.target.value) : "" }))}
                    className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    disabled={saving}
                  />
                </label>
              ) : null}

              <label className="md:col-span-2 flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Plan Description</span>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Pricing Model *</span>
                <select
                  value={form.pricing_model}
                  onChange={(e) => setForm((p) => ({ ...p, pricing_model: e.target.value as PlanPricingModel }))}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                >
                  {PLAN_PRICING_MODEL_CHOICES.map((x) => (
                    <option key={x.value} value={x.value}>{x.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Price *</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Setup Fee</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.setup_fee}
                  onChange={(e) => setForm((p) => ({ ...p, setup_fee: e.target.value }))}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Type *</span>
                <select
                  value={form.type_id}
                  onChange={(e) => setForm((p) => ({ ...p, type_id: e.target.value as SubscriptionType }))}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                >
                  {SUBSCRIPTION_TYPE_CHOICES.map((x) => (
                    <option key={x.value} value={x.value}>{x.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Sales Tax Rule</span>
                <select
                  value={form.sales_tax_rule}
                  onChange={(e) => setForm((p) => ({ ...p, sales_tax_rule: e.target.value ? Number(e.target.value) : "" }))}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                >
                  <option value="">No tax rule</option>
                  {taxRules.map((tax) => (
                    <option key={tax.id} value={tax.id}>{tax.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Status</span>
                <select
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as SubscriptionStatus }))}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                >
                  {SUBSCRIPTION_STATUS_CHOICES.map((x) => (
                    <option key={x.value} value={x.value}>{x.label}</option>
                  ))}
                </select>
              </label>
              <label className="md:col-span-2 inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.allow_plan_switch}
                  onChange={(e) => setForm((p) => ({ ...p, allow_plan_switch: e.target.checked }))}
                  disabled={saving}
                />
                Allow customers to switch to this plan from the portal.
              </label>
              <div className="md:col-span-2 rounded-lg border border-kk-dark-input-border bg-kk-dark-bg p-3">
                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.uses_physical_card}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          uses_physical_card: e.target.checked,
                          requires_card_serial: e.target.checked ? p.requires_card_serial : false,
                        }))
                      }
                      disabled={saving}
                    />
                    This subscription plan uses a physical card.
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.requires_card_serial}
                      onChange={(e) => setForm((p) => ({ ...p, requires_card_serial: e.target.checked }))}
                      disabled={saving || !form.uses_physical_card}
                    />
                    Require a physical card serial number at checkout.
                  </label>
                  <p className="text-xs text-kk-dark-text-muted">
                    Plans with required serial capture will force cashiers to enter or scan the assigned card serial before the subscription can be sold or redeemed by card lookup.
                  </p>
                </div>
              </div>
            </div>

            <section className="space-y-3 rounded-lg border border-kk-dark-input-border p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Redeemable Items</p>
                  <p className="text-xs text-kk-dark-text-muted">Attach items and define usage limits/restrictions.</p>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-md border border-kk-dark-input-border px-3 py-1.5 text-xs hover:bg-kk-dark-hover"
                  onClick={() => setForm((p) => ({ ...p, redeemable_items: [...p.redeemable_items, emptyItem()] }))}
                  disabled={saving}
                >
                  <Plus className="h-3 w-3" /> Add Item
                </button>
              </div>

              {form.redeemable_items.map((r, idx) => (
                <div key={r.row_id} className="space-y-2 rounded-md border border-kk-dark-input-border bg-kk-dark-bg p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-kk-dark-text-muted">Rule #{idx + 1}</p>
                    <button type="button" className="inline-flex items-center gap-1 rounded-md border border-kk-dark-input-border px-2 py-1 text-xs hover:bg-kk-dark-hover" onClick={() => setForm((p) => ({ ...p, redeemable_items: p.redeemable_items.filter((x) => x.row_id !== r.row_id) }))} disabled={saving}>
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>

                  <ItemSearchSelect
                    valueId={r.item}
                    valueLabel={r.item_label}
                    valueSubLabel={r.item_sku ? `SKU: ${r.item_sku}` : ""}
                    onChange={(idValue, option) =>
                      patchItem(r.row_id, {
                        item: idValue,
                        item_label: option?.label ?? "",
                        item_sku: option?.subLabel ? option.subLabel.replace(/^SKU:\\s*/, "") : "",
                      })
                    }
                    loadOptions={loadItemOptions}
                    cacheKey={`sub-plan-item-${r.row_id}`}
                    placeholder="Search item"
                    disabled={saving}
                  />

                  <div className="grid gap-2 md:grid-cols-3">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-kk-dark-text-muted">Total Redemptions (0 = unlimited)</span>
                      <input type="number" min={0} value={r.max_redemptions} onChange={(e) => patchItem(r.row_id, { max_redemptions: e.target.value ? Number(e.target.value) : 0 })} className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm" disabled={saving} />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-kk-dark-text-muted">Interval Restriction</span>
                      <select value={r.interval_unit} onChange={(e) => patchItem(r.row_id, { interval_unit: e.target.value as SubscriptionPlanRedeemInterval, interval_value: e.target.value === "NONE" ? 1 : r.interval_value || 1 })} className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm" disabled={saving}>
                        {SUBSCRIPTION_PLAN_REDEEM_INTERVAL_CHOICES.map((x) => (
                          <option key={x.value} value={x.value}>{x.label}</option>
                        ))}
                      </select>
                    </label>
                    {r.interval_unit !== "NONE" ? (
                      <label className="flex flex-col gap-1">
                        <span className="text-xs text-kk-dark-text-muted">Max Per Interval</span>
                        <input type="number" min={1} value={r.interval_value} onChange={(e) => patchItem(r.row_id, { interval_value: e.target.value ? Number(e.target.value) : 1 })} className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm" disabled={saving} />
                      </label>
                    ) : null}
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs text-kk-dark-text-muted">
                    <input type="checkbox" checked={r.use_schedule} onChange={(e) => patchItem(r.row_id, { use_schedule: e.target.checked, schedules: e.target.checked ? r.schedules : schedules() })} disabled={saving} />
                    Restrict by day/time
                  </label>
                  {r.use_schedule ? (
                    <div className="grid gap-2 md:grid-cols-2">
                      {r.schedules.map((d) => (
                        <div key={d.weekday} className="rounded border border-kk-dark-input-border p-2">
                          <div className="mb-1 text-xs">{SUBSCRIPTION_PLAN_WEEKDAY_CHOICES.find((x) => x.value === d.weekday)?.label ?? d.weekday}</div>
                          <div className="mb-1 flex items-center gap-2 text-xs">
                            <label className="inline-flex items-center gap-1"><input type="checkbox" checked={d.enabled} onChange={(e) => patchSchedule(r.row_id, d.weekday, { enabled: e.target.checked })} disabled={saving} />Enabled</label>
                            <label className="inline-flex items-center gap-1"><input type="checkbox" checked={d.all_day} onChange={(e) => patchSchedule(r.row_id, d.weekday, { all_day: e.target.checked })} disabled={saving || !d.enabled} />All day</label>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="time" value={d.start_time} onChange={(e) => patchSchedule(r.row_id, d.weekday, { start_time: e.target.value })} className="rounded border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs" disabled={saving || !d.enabled || d.all_day} />
                            <input type="time" value={d.end_time} onChange={(e) => patchSchedule(r.row_id, d.weekday, { end_time: e.target.value })} className="rounded border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs" disabled={saving || !d.enabled || d.all_day} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </section>

            <section className="space-y-3 rounded-lg border border-kk-dark-input-border p-3">
              <div>
                <p className="text-sm font-medium">Attached Coupons</p>
                <p className="text-xs text-kk-dark-text-muted">
                  Attach only coupons created under this plan&apos;s subscription product.
                </p>
              </div>
              {!form.product ? (
                <p className="text-xs text-kk-dark-text-muted">Select a subscription product first to attach coupons.</p>
              ) : null}
              {form.product && !availableCoupons.length ? (
                <p className="text-xs text-kk-dark-text-muted">No coupons found for this subscription product.</p>
              ) : null}
              {!!availableCoupons.length ? (
                <div className="grid gap-2 md:grid-cols-2">
                  {availableCoupons.map((c) => {
                    const checked = (form.coupon_ids ?? []).includes(Number(c.id));
                    return (
                      <label key={c.id} className="flex items-start gap-2 rounded border border-kk-dark-input-border p-2 text-xs">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setForm((p) => {
                              const current = new Set((p.coupon_ids ?? []).map((x) => Number(x)));
                              if (e.target.checked) current.add(Number(c.id));
                              else current.delete(Number(c.id));
                              return { ...p, coupon_ids: Array.from(current) };
                            })
                          }
                          disabled={saving}
                        />
                        <span className="flex flex-col">
                          <span className="text-kk-dark-text">{c.name}</span>
                          <span className="text-kk-dark-text-muted">
                            {c.code ? `Code: ${c.code}` : "No code"} | {c.action_type}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : null}
            </section>

            <div className="flex items-center justify-end gap-2">
              <button type="button" className="rounded-md border border-kk-dark-input-border px-4 py-2 text-sm hover:bg-kk-dark-hover" onClick={() => navigate("/catalog/plans")} disabled={saving}>Cancel</button>
              <button type="submit" className="rounded-md bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50" disabled={saving}>{saving ? "Saving..." : isEdit ? "Save Changes" : "Create Plan"}</button>
            </div>
          </form>
        )}
      </div>
      <SubscriptionProductModal open={productModalOpen} onClose={() => setProductModalOpen(false)} onSaved={(product) => { setProducts((prev) => prev.some((p) => p.id === product.id) ? prev.map((p) => (p.id === product.id ? product : p)) : [product, ...prev]); if (product.id) setForm((prev) => ({ ...prev, product: product.id! })); }} />
      <ToastModal message={error} onClose={() => setError(null)} variant="error" />
    </div>
  );
}
