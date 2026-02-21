import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import {
  ADDON_TYPE_CHOICES,
  DISCOUNT_BY_CHOICES,
  PLAN_PRICING_MODEL_CHOICES,
  REDEMPTION_TYPE_CHOICES,
  SUBSCRIPTION_STATUS_CHOICES,
  type SubscriptionAddon,
  type SubscriptionCoupon,
  type SubscriptionProduct,
} from "../../../types/subscriptions";
import {
  createSubscriptionAddon,
  createSubscriptionCoupon,
  createSubscriptionProduct,
  updateSubscriptionAddon,
  updateSubscriptionCoupon,
  updateSubscriptionProduct,
} from "../../../api/subscriptions";

function ModalShell(props: {
  open: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm">
      <div className="mt-12 w-full max-w-2xl rounded-2xl border border-kk-dark-border bg-kk-dark-bg-elevated shadow-xl">
        <div className="flex items-center justify-between border-b border-kk-dark-border px-6 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{props.title}</h2>
            <p className="text-xs text-kk-dark-text-muted">{props.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-full p-1.5 hover:bg-kk-dark-hover"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[calc(100vh-9rem)] overflow-auto px-6 py-5">{props.children}</div>
      </div>
    </div>
  );
}

export function SubscriptionProductModal(props: {
  open: boolean;
  initial?: SubscriptionProduct | null;
  onClose: () => void;
  onSaved: (product: SubscriptionProduct) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.open) return;
    const source = props.initial ?? null;
    setName(source?.name ?? "");
    setDescription(source?.description ?? "");
    setStatus(source?.status ?? "ACTIVE");
    setError(null);
  }, [props.open, props.initial]);

  const title = props.initial?.id ? "Edit Product" : "New Product";

  return (
    <ModalShell
      open={props.open}
      title={title}
      subtitle="Create a subscription product. Name is required."
      onClose={() => {
        if (!saving) props.onClose();
      }}
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) {
            setError("Product name is required.");
            return;
          }

          setSaving(true);
          setError(null);
          try {
            const payload: Partial<SubscriptionProduct> = {
              name: name.trim(),
              description: description.trim(),
              status,
            };

            const saved = props.initial?.id
              ? await updateSubscriptionProduct(props.initial.id, payload)
              : await createSubscriptionProduct(payload);

            props.onSaved(saved);
            props.onClose();
          } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
            setError(typeof detail === "string" ? detail : "Failed to save product.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs text-kk-dark-text-muted">Name *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              placeholder="Web Hosting"
              disabled={saving}
            />
          </label>

          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs text-kk-dark-text-muted">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              placeholder="Optional description"
              disabled={saving}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={saving}
            >
              {SUBSCRIPTION_STATUS_CHOICES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            className="rounded-md border border-kk-dark-input-border px-4 py-2 text-sm hover:bg-kk-dark-hover"
            onClick={props.onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Product"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function SubscriptionAddonModal(props: {
  open: boolean;
  productId: number | null;
  initial?: SubscriptionAddon | null;
  onClose: () => void;
  onSaved: (addon: SubscriptionAddon) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [addonType, setAddonType] = useState<"ONE_TIME" | "RECURRING">("RECURRING");
  const [pricingModel, setPricingModel] = useState<"FLAT" | "PER_UNIT">("FLAT");
  const [price, setPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.open) return;
    const source = props.initial ?? null;
    setName(source?.name ?? "");
    setCode(source?.code ?? "");
    setDescription(source?.description ?? "");
    setStatus(source?.status ?? "ACTIVE");
    setAddonType(source?.addon_type ?? "RECURRING");
    setPricingModel(source?.pricing_model ?? "FLAT");
    setPrice(source?.price ?? "");
    setError(null);
  }, [props.open, props.initial]);

  const title = props.initial?.id ? "Edit Add-on" : "New Add-on";

  return (
    <ModalShell
      open={props.open}
      title={title}
      subtitle="Add-ons are product specific and can be one-time or recurring."
      onClose={() => {
        if (!saving) props.onClose();
      }}
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!props.productId) {
            setError("A product is required.");
            return;
          }
          if (!name.trim()) {
            setError("Add-on name is required.");
            return;
          }
          if (!code.trim()) {
            setError("Add-on code is required.");
            return;
          }
          const priceValue = Number(price);
          if (!Number.isFinite(priceValue) || priceValue < 0) {
            setError("Price must be a valid number greater than or equal to 0.");
            return;
          }

          setSaving(true);
          setError(null);
          try {
            const payload: Partial<SubscriptionAddon> = {
              product: props.productId,
              name: name.trim(),
              code: code.trim(),
              description: description.trim(),
              status,
              addon_type: addonType,
              pricing_model: pricingModel,
              price: priceValue.toFixed(2),
            };

            const saved = props.initial?.id
              ? await updateSubscriptionAddon(props.initial.id, payload)
              : await createSubscriptionAddon(payload);

            props.onSaved(saved);
            props.onClose();
          } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
            setError(typeof detail === "string" ? detail : "Failed to save add-on.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Name *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Add-on Code *</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>

          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs text-kk-dark-text-muted">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Add-on Type *</span>
            <select
              value={addonType}
              onChange={(e) => setAddonType(e.target.value as "ONE_TIME" | "RECURRING")}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={saving}
            >
              {ADDON_TYPE_CHOICES.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Pricing Model *</span>
            <select
              value={pricingModel}
              onChange={(e) => setPricingModel(e.target.value as "FLAT" | "PER_UNIT")}
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
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
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
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            className="rounded-md border border-kk-dark-input-border px-4 py-2 text-sm hover:bg-kk-dark-hover"
            onClick={props.onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Add-on"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

export function SubscriptionCouponModal(props: {
  open: boolean;
  productId: number | null;
  initial?: SubscriptionCoupon | null;
  onClose: () => void;
  onSaved: (coupon: SubscriptionCoupon) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [discountBy, setDiscountBy] = useState<"PERCENT" | "AMOUNT">("PERCENT");
  const [discountValue, setDiscountValue] = useState("");
  const [redemptionType, setRedemptionType] = useState<"ONE_TIME" | "RECURRING">("ONE_TIME");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.open) return;
    const source = props.initial ?? null;
    setName(source?.name ?? "");
    setCode(source?.code ?? "");
    setDescription(source?.description ?? "");
    setStatus(source?.status ?? "ACTIVE");
    setDiscountBy(source?.discount_by ?? "PERCENT");
    setDiscountValue(source?.discount_value ?? "");
    setRedemptionType(source?.redemption_type ?? "ONE_TIME");
    setError(null);
  }, [props.open, props.initial]);

  const title = props.initial?.id ? "Edit Coupon" : "New Coupon";

  return (
    <ModalShell
      open={props.open}
      title={title}
      subtitle="Coupons in this module are subscription specific."
      onClose={() => {
        if (!saving) props.onClose();
      }}
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!props.productId) {
            setError("A product is required.");
            return;
          }
          if (!name.trim()) {
            setError("Coupon name is required.");
            return;
          }
          if (!code.trim()) {
            setError("Coupon code is required.");
            return;
          }
          const value = Number(discountValue);
          if (!Number.isFinite(value) || value < 0) {
            setError("Discount value must be a valid number.");
            return;
          }
          if (discountBy === "PERCENT" && value > 100) {
            setError("Percentage discount cannot be greater than 100.");
            return;
          }

          setSaving(true);
          setError(null);
          try {
            const payload: Partial<SubscriptionCoupon> = {
              product: props.productId,
              name: name.trim(),
              code: code.trim(),
              description: description.trim(),
              status,
              discount_by: discountBy,
              discount_value: value.toFixed(2),
              redemption_type: redemptionType,
            };

            const saved = props.initial?.id
              ? await updateSubscriptionCoupon(props.initial.id, payload)
              : await createSubscriptionCoupon(payload);

            props.onSaved(saved);
            props.onClose();
          } catch (err: unknown) {
            const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
            setError(typeof detail === "string" ? detail : "Failed to save coupon.");
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Name *</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Coupon Code *</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>

          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs text-kk-dark-text-muted">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Discount By *</span>
            <select
              value={discountBy}
              onChange={(e) => setDiscountBy(e.target.value as "PERCENT" | "AMOUNT")}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={saving}
            >
              {DISCOUNT_BY_CHOICES.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Discount Value *</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Redemption Type *</span>
            <select
              value={redemptionType}
              onChange={(e) => setRedemptionType(e.target.value as "ONE_TIME" | "RECURRING")}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={saving}
            >
              {REDEMPTION_TYPE_CHOICES.map((x) => (
                <option key={x.value} value={x.value}>
                  {x.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "ACTIVE" | "INACTIVE")}
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
        </div>

        {error ? <p className="text-sm text-rose-400">{error}</p> : null}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            className="rounded-md border border-kk-dark-input-border px-4 py-2 text-sm hover:bg-kk-dark-hover"
            onClick={props.onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-md bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Coupon"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
