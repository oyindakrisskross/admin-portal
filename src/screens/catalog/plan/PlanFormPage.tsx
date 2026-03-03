import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Layers, Plus } from "lucide-react";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";
import { fetchTaxRules } from "../../../api/catalog";
import {
  createSubscriptionPlan,
  fetchSubscriptionPlan,
  fetchSubscriptionProducts,
  updateSubscriptionPlan,
} from "../../../api/subscriptions";
import {
  BILLING_CYCLES_MODE_CHOICES,
  BILLING_FREQUENCY_UNIT_CHOICES,
  PLAN_TYPE_CHOICES,
  PLAN_PRICING_MODEL_CHOICES,
  SUBSCRIPTION_STATUS_CHOICES,
  SUBSCRIPTION_TYPE_CHOICES,
  type BillingCyclesMode,
  type BillingFrequencyUnit,
  type PlanType,
  type PlanPricingModel,
  type SubscriptionPlan,
  type SubscriptionProduct,
  type SubscriptionStatus,
  type SubscriptionType,
} from "../../../types/subscriptions";
import type { TaxRule } from "../../../types/catalog";
import { SubscriptionProductModal } from "./SubscriptionModals";

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
  status: SubscriptionStatus;
};

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
  status: "ACTIVE",
};

function toErrorMessage(err: unknown) {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (!data) return "Failed to save plan.";
  if (typeof data === "string") return data;
  const asObj = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : null;
  if (!asObj) return "Failed to save plan.";
  const detail = asObj.detail;
  if (typeof detail === "string") return detail;
  const first = Object.values(asObj)[0];
  if (Array.isArray(first) && first.length && typeof first[0] === "string") return first[0];
  return "Failed to save plan.";
}

export default function PlanFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [products, setProducts] = useState<SubscriptionProduct[]>([]);
  const [taxRules, setTaxRules] = useState<TaxRule[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [productRes, taxRes] = await Promise.all([
          fetchSubscriptionProducts({ page_size: 300 }),
          fetchTaxRules({ page_size: 300 }),
        ]);
        if (cancelled) return;
        setProducts(productRes.results ?? []);
        setTaxRules(taxRes.results ?? []);
      } catch {
        if (cancelled) return;
        setProducts([]);
        setTaxRules([]);
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
          status: data.status ?? "ACTIVE",
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

  const selectedProductExists = useMemo(
    () => products.some((p) => p.id === form.product),
    [form.product, products]
  );
  const billingModeChoices =
    form.plan_type === "USAGE"
      ? [
          { value: "AUTO_RENEW" as BillingCyclesMode, label: "No expiry (ends when uses are exhausted)" },
          { value: "FIXED" as BillingCyclesMode, label: "Set a fixed expiry interval" },
        ]
      : BILLING_CYCLES_MODE_CHOICES;
  const showUsageExpiryInterval =
    form.plan_type !== "USAGE" || form.billing_cycles_mode === "FIXED";

  const validate = () => {
    if (!form.product || !selectedProductExists) return "Product is required.";
    if (!form.name.trim()) return "Plan name is required.";
    if (!form.code.trim()) return "Plan code is required.";
    if (form.plan_type === "USAGE") {
      if (!form.included_uses || Number(form.included_uses) < 1) {
        return "Included uses must be at least 1 for usage-based plans.";
      }
    }
    if (showUsageExpiryInterval && (!form.billing_frequency_value || Number(form.billing_frequency_value) < 1)) {
      return "Billing frequency value must be at least 1.";
    }
    if (form.billing_cycles_mode === "FIXED") {
      if (!form.billing_cycles || Number(form.billing_cycles) < 1) {
        return "Billing cycles must be at least 1 when fixed billing cycles is selected.";
      }
    }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) return "Price is required and must be a valid number.";
    const setup = form.setup_fee.trim() ? Number(form.setup_fee) : 0;
    if (!Number.isFinite(setup) || setup < 0) return "Setup fee must be a valid number.";
    return null;
  };

  const submit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload: Partial<SubscriptionPlan> = {
      product: Number(form.product),
      name: form.name.trim(),
      code: form.code.trim(),
      plan_type: form.plan_type,
      included_uses: form.plan_type === "USAGE" ? Number(form.included_uses) : null,
      billing_frequency_value: Number(
        showUsageExpiryInterval ? form.billing_frequency_value : form.billing_frequency_value || 1
      ),
      billing_frequency_unit: form.billing_frequency_unit,
      billing_cycles_mode: form.billing_cycles_mode,
      billing_cycles:
        form.billing_cycles_mode === "FIXED" ? Number(form.billing_cycles) : null,
      description: form.description.trim(),
      pricing_model: form.pricing_model,
      price: Number(form.price).toFixed(2),
      setup_fee: (form.setup_fee.trim() ? Number(form.setup_fee) : 0).toFixed(2),
      type_id: form.type_id,
      sales_tax_rule: form.sales_tax_rule ? Number(form.sales_tax_rule) : null,
      allow_plan_switch: form.allow_plan_switch,
      status: form.status,
    };

    setSaving(true);
    setError(null);
    try {
      const saved = isEdit && id
        ? await updateSubscriptionPlan(Number(id), payload)
        : await createSubscriptionPlan(payload);
      navigate("/catalog/plans", { replace: true, state: { selectedPlanId: saved.id } });
    } catch (err: unknown) {
      setError(toErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <ListPageHeader
        icon={<Layers className="h-5 w-5" />}
        section="Catalog"
        title={isEdit ? "Edit Plan" : "New Plan"}
        subtitle="Create and maintain subscription plans."
        right={
          <button
            type="button"
            className="rounded-full border border-kk-dark-input-border px-3 py-1.5 text-xs hover:bg-kk-dark-hover"
            onClick={() => navigate("/catalog/plans")}
          >
            Back to Plans
          </button>
        }
      />

      <div className="mx-auto w-full max-w-5xl flex-1 overflow-auto px-6 py-6">
        {loading ? (
          <div className="text-sm text-kk-dark-text-muted">Loading plan...</div>
        ) : (
          <form
            className="space-y-6 rounded-xl border border-kk-dark-border bg-kk-dark-bg-elevated p-6"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2 flex items-end gap-2">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-xs text-kk-dark-text-muted">Product *</span>
                  <select
                    value={form.product}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        product: e.target.value ? Number(e.target.value) : "",
                      }))
                    }
                    className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    disabled={saving}
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
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
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  placeholder="Premium"
                  disabled={saving}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Plan Code *</span>
                <input
                  value={form.code}
                  onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  placeholder="WEB-PREMIUM"
                  disabled={saving}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Plan Type *</span>
                <select
                  value={form.plan_type}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      plan_type: e.target.value as PlanType,
                      included_uses:
                        e.target.value === "USAGE" ? (prev.included_uses || 1) : "",
                    }))
                  }
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                >
                  {PLAN_TYPE_CHOICES.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
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
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        included_uses: e.target.value ? Number(e.target.value) : "",
                      }))
                    }
                    className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    disabled={saving}
                  />
                </label>
              ) : null}

              {showUsageExpiryInterval ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-kk-dark-text-muted">
                      {form.plan_type === "USAGE" ? "Usage Expiry Interval *" : "Billing Frequency *"}
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={form.billing_frequency_value}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          billing_frequency_value: e.target.value ? Number(e.target.value) : "",
                        }))
                      }
                      className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      disabled={saving}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-kk-dark-text-muted">&nbsp;</span>
                    <select
                      value={form.billing_frequency_unit}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          billing_frequency_unit: e.target.value as BillingFrequencyUnit,
                        }))
                      }
                      className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      disabled={saving}
                    >
                      {BILLING_FREQUENCY_UNIT_CHOICES.map((x) => (
                        <option key={x.value} value={x.value}>
                          {x.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : null}

              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">
                  {form.plan_type === "USAGE" ? "Usage Expiry Mode *" : "Billing Cycles *"}
                </span>
                <select
                  value={form.billing_cycles_mode}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      billing_cycles_mode: e.target.value as BillingCyclesMode,
                      billing_frequency_value:
                        prev.plan_type === "USAGE" && e.target.value === "AUTO_RENEW"
                          ? prev.billing_frequency_value || 1
                          : prev.billing_frequency_value,
                    }))
                  }
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                >
                  {billingModeChoices.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </label>

              {form.billing_cycles_mode === "FIXED" ? (
                <label className="flex flex-col gap-1">
                  <span className="text-xs text-kk-dark-text-muted">
                    {form.plan_type === "USAGE"
                      ? "No. of Expiry Intervals *"
                      : "No. of Billing Cycles *"}
                  </span>
                  <input
                    type="number"
                    min={1}
                    value={form.billing_cycles}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        billing_cycles: e.target.value ? Number(e.target.value) : "",
                      }))
                    }
                    className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    disabled={saving}
                  />
                </label>
              ) : null}

              <label className="flex flex-col gap-1 md:col-span-2">
                <span className="text-xs text-kk-dark-text-muted">Plan Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Pricing Model *</span>
                <select
                  value={form.pricing_model}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      pricing_model: e.target.value as PlanPricingModel,
                    }))
                  }
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                >
                  {PLAN_PRICING_MODEL_CHOICES.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
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
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
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
                  onChange={(e) => setForm((prev) => ({ ...prev, setup_fee: e.target.value }))}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Type *</span>
                <select
                  value={form.type_id}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      type_id: e.target.value as SubscriptionType,
                    }))
                  }
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                >
                  {SUBSCRIPTION_TYPE_CHOICES.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Sales Tax Rule</span>
                <select
                  value={form.sales_tax_rule}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sales_tax_rule: e.target.value ? Number(e.target.value) : "",
                    }))
                  }
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                >
                  <option value="">No tax rule</option>
                  {taxRules.map((tax) => (
                    <option key={tax.id} value={tax.id}>
                      {tax.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs text-kk-dark-text-muted">Status</span>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      status: e.target.value as SubscriptionStatus,
                    }))
                  }
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  disabled={saving}
                >
                  {SUBSCRIPTION_STATUS_CHOICES.map((x) => (
                    <option key={x.value} value={x.value}>
                      {x.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="md:col-span-2 inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.allow_plan_switch}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, allow_plan_switch: e.target.checked }))
                  }
                  disabled={saving}
                />
                Allow customers to switch to this plan from the portal.
              </label>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-kk-dark-input-border px-4 py-2 text-sm hover:bg-kk-dark-hover"
                onClick={() => navigate("/catalog/plans")}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
                disabled={saving}
              >
                {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Plan"}
              </button>
            </div>
          </form>
        )}
      </div>

      <SubscriptionProductModal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        onSaved={(product) => {
          setProducts((prev) => {
            const exists = prev.some((p) => p.id === product.id);
            if (exists) return prev.map((p) => (p.id === product.id ? product : p));
            return [product, ...prev];
          });
          if (product.id) {
            setForm((prev) => ({ ...prev, product: product.id! }));
          }
        }}
      />

      <ToastModal message={error} onClose={() => setError(null)} variant="error" />
    </div>
  );
}
