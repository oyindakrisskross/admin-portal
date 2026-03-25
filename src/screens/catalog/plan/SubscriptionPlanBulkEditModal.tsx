import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";

import { fetchTaxRules, searchItems } from "../../../api/catalog";
import { fetchSubscriptionCoupons } from "../../../api/subscriptions";
import { ItemSearchSelect, type ItemOption } from "../../../components/catalog/ItemSearchSelect";
import type { TaxRule } from "../../../types/catalog";
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
  type SubscriptionCoupon,
  type SubscriptionPlan,
  type SubscriptionPlanRedeemInterval,
  type SubscriptionPlanRedeemableItemInput,
  type SubscriptionPlanWeekday,
  type SubscriptionStatus,
  type SubscriptionType,
} from "../../../types/subscriptions";

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

type BulkPlanUpdatePayload = {
  ids: number[];
  status?: SubscriptionStatus;
  plan_type?: PlanType;
  included_uses?: number | null;
  billing_frequency_value?: number;
  billing_frequency_unit?: BillingFrequencyUnit;
  billing_cycles_mode?: BillingCyclesMode;
  billing_cycles?: number | null;
  setup_fee?: string;
  redeemable_items_append?: SubscriptionPlanRedeemableItemInput[];
  coupon_ids?: number[];
  sales_tax_rule?: number | null;
  type_id?: SubscriptionType;
  pricing_model?: PlanPricingModel;
  uses_physical_card?: boolean;
  requires_card_serial?: boolean;
};

const rowId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const buildSchedules = (): ScheduleRow[] =>
  SUBSCRIPTION_PLAN_WEEKDAY_CHOICES.map(({ value }) => ({
    weekday: value,
    enabled: false,
    all_day: true,
    start_time: "",
    end_time: "",
  }));

const emptyRedeemableItem = (): RedeemableRow => ({
  row_id: rowId(),
  item: null,
  item_label: "",
  item_sku: "",
  max_redemptions: 0,
  interval_unit: "NONE",
  interval_value: 1,
  use_schedule: false,
  schedules: buildSchedules(),
});

type Props = {
  open: boolean;
  selectedPlans: SubscriptionPlan[];
  onClose: () => void;
  onApply: (payload: BulkPlanUpdatePayload) => Promise<void> | void;
};

export function SubscriptionPlanBulkEditModal(props: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [availableCoupons, setAvailableCoupons] = useState<SubscriptionCoupon[]>([]);

  const [applyStatus, setApplyStatus] = useState(false);
  const [status, setStatus] = useState<SubscriptionStatus>("ACTIVE");

  const [applyPlanType, setApplyPlanType] = useState(false);
  const [planType, setPlanType] = useState<PlanType>("CYCLE");
  const [includedUses, setIncludedUses] = useState<number | "">("");
  const [billingFrequencyValue, setBillingFrequencyValue] = useState<number | "">(1);
  const [billingFrequencyUnit, setBillingFrequencyUnit] = useState<BillingFrequencyUnit>("MONTH");
  const [billingCyclesMode, setBillingCyclesMode] = useState<BillingCyclesMode>("AUTO_RENEW");
  const [billingCycles, setBillingCycles] = useState<number | "">("");

  const [applySetupFee, setApplySetupFee] = useState(false);
  const [setupFee, setSetupFee] = useState("");

  const [applyRedeemableItems, setApplyRedeemableItems] = useState(false);
  const [redeemableItems, setRedeemableItems] = useState<RedeemableRow[]>([]);

  const [applyCoupons, setApplyCoupons] = useState(false);
  const [couponIds, setCouponIds] = useState<number[]>([]);

  const [applyTaxRule, setApplyTaxRule] = useState(false);
  const [salesTaxRule, setSalesTaxRule] = useState<number | "">("");

  const [applyType, setApplyType] = useState(false);
  const [typeId, setTypeId] = useState<SubscriptionType>("SERVICE");

  const [applyPricingModel, setApplyPricingModel] = useState(false);
  const [pricingModel, setPricingModel] = useState<PlanPricingModel>("FLAT");

  const [applyPhysicalCard, setApplyPhysicalCard] = useState(false);
  const [usesPhysicalCard, setUsesPhysicalCard] = useState(false);
  const [requiresCardSerial, setRequiresCardSerial] = useState(false);

  const selectedIds = useMemo(
    () => props.selectedPlans.map((plan) => Number(plan.id)).filter(Number.isFinite),
    [props.selectedPlans]
  );

  const firstPlan = props.selectedPlans[0] ?? null;
  const commonProductId = useMemo(() => {
    const ids = Array.from(
      new Set(props.selectedPlans.map((plan) => Number(plan.product || 0)).filter((id) => id > 0))
    );
    return ids.length === 1 ? ids[0] : null;
  }, [props.selectedPlans]);
  const commonProductName = useMemo(() => {
    if (!commonProductId) return null;
    const match = props.selectedPlans.find((plan) => Number(plan.product) === commonProductId);
    return match?.product_name ?? `Product #${commonProductId}`;
  }, [commonProductId, props.selectedPlans]);

  useEffect(() => {
    if (!props.open) return;
    setError(null);
    setSaving(false);

    setApplyStatus(false);
    setStatus(firstPlan?.status ?? "ACTIVE");

    setApplyPlanType(false);
    setPlanType(firstPlan?.plan_type ?? "CYCLE");
    setIncludedUses(firstPlan?.included_uses ?? "");
    setBillingFrequencyValue(firstPlan?.billing_frequency_value ?? 1);
    setBillingFrequencyUnit(firstPlan?.billing_frequency_unit ?? "MONTH");
    setBillingCyclesMode(firstPlan?.billing_cycles_mode ?? "AUTO_RENEW");
    setBillingCycles(firstPlan?.billing_cycles ?? "");

    setApplySetupFee(false);
    setSetupFee(firstPlan?.setup_fee ?? "");

    setApplyRedeemableItems(false);
    setRedeemableItems([]);

    setApplyCoupons(false);
    setCouponIds([]);

    setApplyTaxRule(false);
    setSalesTaxRule(firstPlan?.sales_tax_rule ?? "");

    setApplyType(false);
    setTypeId(firstPlan?.type_id ?? "SERVICE");

    setApplyPricingModel(false);
    setPricingModel(firstPlan?.pricing_model ?? "FLAT");

    setApplyPhysicalCard(false);
    setUsesPhysicalCard(Boolean(firstPlan?.uses_physical_card));
    setRequiresCardSerial(Boolean(firstPlan?.requires_card_serial));
  }, [firstPlan, props.open]);

  useEffect(() => {
    if (!props.open) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchTaxRules({ page_size: 300 });
        if (!cancelled) setTaxRules(data.results ?? []);
      } catch {
        if (!cancelled) setTaxRules([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.open]);

  useEffect(() => {
    if (!props.open || !commonProductId) {
      setAvailableCoupons([]);
      setCouponIds([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchSubscriptionCoupons({ product: commonProductId, page_size: 300 });
        if (!cancelled) setAvailableCoupons(data.results ?? []);
      } catch {
        if (!cancelled) setAvailableCoupons([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [commonProductId, props.open]);

  const billingModeChoices = planType === "USAGE"
    ? [
        { value: "AUTO_RENEW" as BillingCyclesMode, label: "No expiry (ends when uses are exhausted)" },
        { value: "FIXED" as BillingCyclesMode, label: "Set a fixed expiry interval" },
      ]
    : BILLING_CYCLES_MODE_CHOICES;
  const showBillingCyclesField = billingCyclesMode === "FIXED";

  const loadItemOptions = useCallback(async (query: string, signal?: AbortSignal): Promise<ItemOption[]> => {
    const q = query.trim();
    if (!q) return [];
    const out = await searchItems(q, { page_size: 25, signal });
    return (out.results ?? []).map((item) => ({
      id: Number(item.id),
      label: item.name || item.sku || `Item #${item.id}`,
      subLabel: item.sku ? `SKU: ${item.sku}` : undefined,
    }));
  }, []);

  const patchItem = (idValue: string, patch: Partial<RedeemableRow>) =>
    setRedeemableItems((prev) => prev.map((row) => (row.row_id === idValue ? { ...row, ...patch } : row)));

  const patchSchedule = (
    idValue: string,
    day: SubscriptionPlanWeekday,
    patch: Partial<ScheduleRow>
  ) =>
    setRedeemableItems((prev) =>
      prev.map((row) =>
        row.row_id !== idValue
          ? row
          : {
              ...row,
              schedules: row.schedules.map((schedule) =>
                schedule.weekday === day ? { ...schedule, ...patch } : schedule
              ),
            }
      )
    );

  const buildRedeemableItemsInput = (): SubscriptionPlanRedeemableItemInput[] =>
    redeemableItems
      .filter((row) => row.item != null)
      .map((row) => ({
        item: Number(row.item),
        max_redemptions: Number(row.max_redemptions || 0),
        interval_unit: row.interval_unit,
        interval_value: row.interval_unit === "NONE" ? 1 : Number(row.interval_value || 1),
        schedules: row.use_schedule
          ? row.schedules
              .filter((schedule) => schedule.enabled)
              .map((schedule) => ({
                weekday: schedule.weekday,
                all_day: schedule.all_day,
                start_time: schedule.all_day ? null : schedule.start_time || null,
                end_time: schedule.all_day ? null : schedule.end_time || null,
              }))
          : [],
      }));

  const validate = () => {
    if (
      !applyStatus &&
      !applyPlanType &&
      !applySetupFee &&
      !applyRedeemableItems &&
      !applyCoupons &&
      !applyTaxRule &&
      !applyType &&
      !applyPricingModel &&
      !applyPhysicalCard
    ) {
      return "Select at least one change to apply.";
    }

    if (applyPlanType) {
      if (!billingFrequencyValue || Number(billingFrequencyValue) < 1) {
        return planType === "USAGE"
          ? "Usage expiry interval must be at least 1."
          : "Billing frequency value must be at least 1.";
      }
      if (planType === "USAGE" && (!includedUses || Number(includedUses) < 1)) {
        return "Included uses must be at least 1 for usage plans.";
      }
      if (billingCyclesMode === "FIXED" && (!billingCycles || Number(billingCycles) < 1)) {
        return planType === "USAGE"
          ? "No. of expiry intervals must be at least 1."
          : "No. of billing cycles must be at least 1.";
      }
    }

    if (applySetupFee) {
      const nextSetupFee = Number(setupFee);
      if (!Number.isFinite(nextSetupFee) || nextSetupFee < 0) {
        return "Setup fee must be a valid number greater than or equal to 0.";
      }
    }

    if (applyRedeemableItems) {
      if (!redeemableItems.length) {
        return "Add at least one redeemable item rule.";
      }
      const seen = new Set<number>();
      for (let index = 0; index < redeemableItems.length; index += 1) {
        const row = redeemableItems[index];
        if (!row.item) return `Redeemable item #${index + 1}: item is required.`;
        if (seen.has(row.item)) return `Redeemable item #${index + 1}: duplicate item selected.`;
        seen.add(row.item);
        if (row.max_redemptions < 0) return `Redeemable item #${index + 1}: total redemptions cannot be negative.`;
        if (row.interval_unit !== "NONE" && row.interval_value < 1) {
          return `Redeemable item #${index + 1}: max per interval must be at least 1.`;
        }
        if (row.use_schedule) {
          const enabled = row.schedules.filter((schedule) => schedule.enabled);
          if (!enabled.length) return `Redeemable item #${index + 1}: enable at least one day.`;
          for (const day of enabled) {
            if (day.all_day) continue;
            if (!day.start_time || !day.end_time) {
              return `Redeemable item #${index + 1}: ${day.weekday} needs start/end time.`;
            }
            if (day.start_time >= day.end_time) {
              return `Redeemable item #${index + 1}: ${day.weekday} start must be before end.`;
            }
          }
        }
      }
    }

    if (applyCoupons && !commonProductId) {
      return "Attached coupons can only be bulk updated when all selected plans belong to the same subscription product.";
    }

    if (applyPhysicalCard && requiresCardSerial && !usesPhysicalCard) {
      return "Card serial capture requires physical cards to be enabled.";
    }

    return null;
  };

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm">
      <div className="mt-8 flex max-h-[calc(100vh-4rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-kk-dark-border bg-kk-dark-bg-elevated shadow-xl">
        <div className="flex items-center justify-between border-b border-kk-dark-border px-6 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">Bulk Edit Plans</h2>
            <p className="text-xs text-kk-dark-text-muted">
              Update {selectedIds.length} selected subscription plan{selectedIds.length === 1 ? "" : "s"}.
            </p>
            {commonProductName ? (
              <p className="text-xs text-kk-dark-text-muted">Common product: {commonProductName}</p>
            ) : (
              <p className="text-xs text-amber-300">
                Coupon updates are unavailable because the selected plans span multiple products.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!saving) props.onClose();
            }}
            className="rounded-full p-1.5 hover:bg-kk-dark-hover"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5">
          <div className="space-y-4">
            <section className="rounded-lg border border-kk-dark-input-border p-4">
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={applyStatus} onChange={(e) => setApplyStatus(e.target.checked)} disabled={saving} />
                Change status
              </label>
              {applyStatus ? (
                <div className="mt-3">
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as SubscriptionStatus)}
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    disabled={saving}
                  >
                    {SUBSCRIPTION_STATUS_CHOICES.map((choice) => (
                      <option key={choice.value} value={choice.value}>
                        {choice.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-kk-dark-input-border p-4">
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={applyPlanType} onChange={(e) => setApplyPlanType(e.target.checked)} disabled={saving} />
                Change plan type and its options
              </label>
              {applyPlanType ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-kk-dark-text-muted">Plan Type</span>
                    <select
                      value={planType}
                      onChange={(e) => {
                        const nextPlanType = e.target.value as PlanType;
                        setPlanType(nextPlanType);
                        if (nextPlanType !== "USAGE") setIncludedUses("");
                      }}
                      className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      disabled={saving}
                    >
                      {PLAN_TYPE_CHOICES.map((choice) => (
                        <option key={choice.value} value={choice.value}>
                          {choice.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {planType === "USAGE" ? (
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-kk-dark-text-muted">Included Uses</span>
                      <input
                        type="number"
                        min={1}
                        value={includedUses}
                        onChange={(e) => setIncludedUses(e.target.value ? Number(e.target.value) : "")}
                        className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                        disabled={saving}
                      />
                    </label>
                  ) : null}

                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-kk-dark-text-muted">
                      {planType === "USAGE" ? "Usage Expiry Interval" : "Billing Frequency"}
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={billingFrequencyValue}
                      onChange={(e) => setBillingFrequencyValue(e.target.value ? Number(e.target.value) : "")}
                      className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      disabled={saving}
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-kk-dark-text-muted">Frequency Unit</span>
                    <select
                      value={billingFrequencyUnit}
                      onChange={(e) => setBillingFrequencyUnit(e.target.value as BillingFrequencyUnit)}
                      className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      disabled={saving}
                    >
                      {BILLING_FREQUENCY_UNIT_CHOICES.map((choice) => (
                        <option key={choice.value} value={choice.value}>
                          {choice.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-kk-dark-text-muted">
                      {planType === "USAGE" ? "Usage Expiry Mode" : "Billing Cycles"}
                    </span>
                    <select
                      value={billingCyclesMode}
                      onChange={(e) => setBillingCyclesMode(e.target.value as BillingCyclesMode)}
                      className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      disabled={saving}
                    >
                      {billingModeChoices.map((choice) => (
                        <option key={choice.value} value={choice.value}>
                          {choice.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {showBillingCyclesField ? (
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-kk-dark-text-muted">
                        {planType === "USAGE" ? "No. of Expiry Intervals" : "No. of Billing Cycles"}
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={billingCycles}
                        onChange={(e) => setBillingCycles(e.target.value ? Number(e.target.value) : "")}
                        className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                        disabled={saving}
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-kk-dark-input-border p-4">
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" checked={applySetupFee} onChange={(e) => setApplySetupFee(e.target.checked)} disabled={saving} />
                Change setup fee
              </label>
              {applySetupFee ? (
                <div className="mt-3">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={setupFee}
                    onChange={(e) => setSetupFee(e.target.value)}
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    disabled={saving}
                  />
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-kk-dark-input-border p-4">
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={applyRedeemableItems}
                  onChange={(e) => setApplyRedeemableItems(e.target.checked)}
                  disabled={saving}
                />
                Add redeemable items
              </label>
              {applyRedeemableItems ? (
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-kk-dark-text-muted">
                      Added items are merged into each selected plan. If an item already exists on a plan, its limits are updated.
                    </p>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-md border border-kk-dark-input-border px-3 py-1.5 text-xs hover:bg-kk-dark-hover"
                      onClick={() => setRedeemableItems((prev) => [...prev, emptyRedeemableItem()])}
                      disabled={saving}
                    >
                      <Plus className="h-3 w-3" />
                      Add Item
                    </button>
                  </div>

                  {redeemableItems.map((row, index) => (
                    <div key={row.row_id} className="space-y-2 rounded-md border border-kk-dark-input-border bg-kk-dark-bg p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-kk-dark-text-muted">Rule #{index + 1}</p>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border border-kk-dark-input-border px-2 py-1 text-xs hover:bg-kk-dark-hover"
                          onClick={() => setRedeemableItems((prev) => prev.filter((item) => item.row_id !== row.row_id))}
                          disabled={saving}
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      </div>

                      <ItemSearchSelect
                        valueId={row.item}
                        valueLabel={row.item_label}
                        valueSubLabel={row.item_sku ? `SKU: ${row.item_sku}` : ""}
                        onChange={(idValue, option) =>
                          patchItem(row.row_id, {
                            item: idValue,
                            item_label: option?.label ?? "",
                            item_sku: option?.subLabel ? option.subLabel.replace(/^SKU:\\s*/, "") : "",
                          })
                        }
                        loadOptions={loadItemOptions}
                        cacheKey={`bulk-plan-item-${row.row_id}`}
                        placeholder="Search item"
                        disabled={saving}
                      />

                      <div className="grid gap-2 md:grid-cols-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-xs text-kk-dark-text-muted">Total Redemptions (0 = unlimited)</span>
                          <input
                            type="number"
                            min={0}
                            value={row.max_redemptions}
                            onChange={(e) => patchItem(row.row_id, { max_redemptions: e.target.value ? Number(e.target.value) : 0 })}
                            className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                            disabled={saving}
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs text-kk-dark-text-muted">Interval Restriction</span>
                          <select
                            value={row.interval_unit}
                            onChange={(e) =>
                              patchItem(row.row_id, {
                                interval_unit: e.target.value as SubscriptionPlanRedeemInterval,
                                interval_value: e.target.value === "NONE" ? 1 : row.interval_value || 1,
                              })
                            }
                            className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                            disabled={saving}
                          >
                            {SUBSCRIPTION_PLAN_REDEEM_INTERVAL_CHOICES.map((choice) => (
                              <option key={choice.value} value={choice.value}>
                                {choice.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        {row.interval_unit !== "NONE" ? (
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-kk-dark-text-muted">Max Per Interval</span>
                            <input
                              type="number"
                              min={1}
                              value={row.interval_value}
                              onChange={(e) => patchItem(row.row_id, { interval_value: e.target.value ? Number(e.target.value) : 1 })}
                              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                              disabled={saving}
                            />
                          </label>
                        ) : null}
                      </div>

                      <label className="inline-flex items-center gap-2 text-xs text-kk-dark-text-muted">
                        <input
                          type="checkbox"
                          checked={row.use_schedule}
                          onChange={(e) =>
                            patchItem(row.row_id, {
                              use_schedule: e.target.checked,
                              schedules: e.target.checked ? row.schedules : buildSchedules(),
                            })
                          }
                          disabled={saving}
                        />
                        Restrict by day/time
                      </label>

                      {row.use_schedule ? (
                        <div className="grid gap-2 md:grid-cols-2">
                          {row.schedules.map((schedule) => (
                            <div key={schedule.weekday} className="rounded border border-kk-dark-input-border p-2">
                              <div className="mb-1 text-xs">
                                {SUBSCRIPTION_PLAN_WEEKDAY_CHOICES.find((choice) => choice.value === schedule.weekday)?.label ?? schedule.weekday}
                              </div>
                              <div className="mb-1 flex items-center gap-2 text-xs">
                                <label className="inline-flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={schedule.enabled}
                                    onChange={(e) => patchSchedule(row.row_id, schedule.weekday, { enabled: e.target.checked })}
                                    disabled={saving}
                                  />
                                  Enabled
                                </label>
                                <label className="inline-flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={schedule.all_day}
                                    onChange={(e) => patchSchedule(row.row_id, schedule.weekday, { all_day: e.target.checked })}
                                    disabled={saving || !schedule.enabled}
                                  />
                                  All day
                                </label>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  type="time"
                                  value={schedule.start_time}
                                  onChange={(e) => patchSchedule(row.row_id, schedule.weekday, { start_time: e.target.value })}
                                  className="rounded border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
                                  disabled={saving || !schedule.enabled || schedule.all_day}
                                />
                                <input
                                  type="time"
                                  value={schedule.end_time}
                                  onChange={(e) => patchSchedule(row.row_id, schedule.weekday, { end_time: e.target.value })}
                                  className="rounded border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
                                  disabled={saving || !schedule.enabled || schedule.all_day}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="rounded-lg border border-kk-dark-input-border p-4">
              <label className="inline-flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={applyCoupons}
                  onChange={(e) => setApplyCoupons(e.target.checked)}
                  disabled={saving || !commonProductId}
                />
                Update attached coupons
              </label>
              {applyCoupons ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-kk-dark-text-muted">
                    The selected coupons replace the attached coupons on each selected plan.
                  </p>
                  {!availableCoupons.length ? (
                    <p className="text-xs text-kk-dark-text-muted">No coupons found for {commonProductName ?? "this product"}.</p>
                  ) : (
                    <div className="grid gap-2 md:grid-cols-2">
                      {availableCoupons.map((coupon) => {
                        const checked = couponIds.includes(Number(coupon.id));
                        return (
                          <label key={coupon.id} className="flex items-start gap-2 rounded border border-kk-dark-input-border p-2 text-xs">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setCouponIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(Number(coupon.id));
                                  else next.delete(Number(coupon.id));
                                  return Array.from(next);
                                })
                              }
                              disabled={saving}
                            />
                            <span className="flex flex-col">
                              <span className="text-kk-dark-text">{coupon.name}</span>
                              <span className="text-kk-dark-text-muted">
                                {coupon.code ? `Code: ${coupon.code}` : "No code"} | {coupon.action_type}
                              </span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : null}
            </section>

            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-lg border border-kk-dark-input-border p-4">
                <label className="inline-flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={applyTaxRule} onChange={(e) => setApplyTaxRule(e.target.checked)} disabled={saving} />
                  Set tax rule
                </label>
                {applyTaxRule ? (
                  <div className="mt-3">
                    <select
                      value={salesTaxRule}
                      onChange={(e) => setSalesTaxRule(e.target.value ? Number(e.target.value) : "")}
                      className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      disabled={saving}
                    >
                      <option value="">No tax rule</option>
                      {taxRules.map((taxRule) => (
                        <option key={taxRule.id} value={taxRule.id}>
                          {taxRule.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </section>

              <section className="rounded-lg border border-kk-dark-input-border p-4">
                <label className="inline-flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" checked={applyType} onChange={(e) => setApplyType(e.target.checked)} disabled={saving} />
                  Set type
                </label>
                {applyType ? (
                  <div className="mt-3">
                    <select
                      value={typeId}
                      onChange={(e) => setTypeId(e.target.value as SubscriptionType)}
                      className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      disabled={saving}
                    >
                      {SUBSCRIPTION_TYPE_CHOICES.map((choice) => (
                        <option key={choice.value} value={choice.value}>
                          {choice.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </section>

              <section className="rounded-lg border border-kk-dark-input-border p-4">
                <label className="inline-flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={applyPricingModel}
                    onChange={(e) => setApplyPricingModel(e.target.checked)}
                    disabled={saving}
                  />
                  Set pricing model
                </label>
                {applyPricingModel ? (
                  <div className="mt-3">
                    <select
                      value={pricingModel}
                      onChange={(e) => setPricingModel(e.target.value as PlanPricingModel)}
                      className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      disabled={saving}
                    >
                      {PLAN_PRICING_MODEL_CHOICES.map((choice) => (
                        <option key={choice.value} value={choice.value}>
                          {choice.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </section>

              <section className="rounded-lg border border-kk-dark-input-border p-4">
                <label className="inline-flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={applyPhysicalCard}
                    onChange={(e) => setApplyPhysicalCard(e.target.checked)}
                    disabled={saving}
                  />
                  Set physical card options
                </label>
                {applyPhysicalCard ? (
                  <div className="mt-3 space-y-2">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={usesPhysicalCard}
                        onChange={(e) => {
                          setUsesPhysicalCard(e.target.checked);
                          if (!e.target.checked) setRequiresCardSerial(false);
                        }}
                        disabled={saving}
                      />
                      This plan uses a physical card.
                    </label>
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={requiresCardSerial}
                        onChange={(e) => setRequiresCardSerial(e.target.checked)}
                        disabled={saving || !usesPhysicalCard}
                      />
                      Require a physical card serial number at checkout.
                    </label>
                  </div>
                ) : null}
              </section>
            </div>

            {error ? <p className="text-sm text-rose-400">{error}</p> : null}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-kk-dark-border px-6 py-4">
          <button
            type="button"
            className="rounded-md border border-kk-dark-input-border px-4 py-2 text-sm hover:bg-kk-dark-hover"
            onClick={props.onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="rounded-md bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
            disabled={saving}
            onClick={async () => {
              const nextError = validate();
              if (nextError) {
                setError(nextError);
                return;
              }

              const payload: BulkPlanUpdatePayload = { ids: selectedIds };

              if (applyStatus) payload.status = status;
              if (applyPlanType) {
                payload.plan_type = planType;
                payload.included_uses = planType === "USAGE" ? Number(includedUses) : null;
                payload.billing_frequency_value = Number(billingFrequencyValue);
                payload.billing_frequency_unit = billingFrequencyUnit;
                payload.billing_cycles_mode = billingCyclesMode;
                payload.billing_cycles = billingCyclesMode === "FIXED" ? Number(billingCycles) : null;
              }
              if (applySetupFee) payload.setup_fee = Number(setupFee || 0).toFixed(2);
              if (applyRedeemableItems) payload.redeemable_items_append = buildRedeemableItemsInput();
              if (applyCoupons) payload.coupon_ids = couponIds;
              if (applyTaxRule) payload.sales_tax_rule = salesTaxRule ? Number(salesTaxRule) : null;
              if (applyType) payload.type_id = typeId;
              if (applyPricingModel) payload.pricing_model = pricingModel;
              if (applyPhysicalCard) {
                payload.uses_physical_card = usesPhysicalCard;
                payload.requires_card_serial = usesPhysicalCard ? requiresCardSerial : false;
              }

              setSaving(true);
              setError(null);
              try {
                await props.onApply(payload);
                props.onClose();
              } catch (err: unknown) {
                const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
                setError(typeof detail === "string" ? detail : "Failed to apply bulk updates.");
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Applying...
              </span>
            ) : (
              "Apply Changes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
