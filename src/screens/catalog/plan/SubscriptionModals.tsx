import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Loader2, X } from "lucide-react";
import {
  ADDON_TYPE_CHOICES,
  PLAN_PRICING_MODEL_CHOICES,
  SUBSCRIPTION_STATUS_CHOICES,
  type SubscriptionAddon,
  type SubscriptionCoupon,
  type SubscriptionCouponSchedule,
  type SubscriptionProduct,
} from "../../../types/subscriptions";
import {
  createSubscriptionCouponSchedule,
  createSubscriptionAddon,
  createSubscriptionCoupon,
  createSubscriptionProduct,
  deleteSubscriptionCouponSchedule,
  fetchSubscriptionCouponSchedules,
  updateSubscriptionCouponSchedule,
  updateSubscriptionAddon,
  updateSubscriptionCoupon,
  updateSubscriptionProduct,
} from "../../../api/subscriptions";
import { fetchLocations } from "../../../api/location";
import type { Location } from "../../../types/location";
import { fetchCategories, fetchItemGroups, fetchItems } from "../../../api/catalog";
import {
  buildActionConfig,
  actionDraftFromCoupon,
  buildConditionTree,
  conditionDraftsFromTree,
  validateConditions,
} from "../../../components/promotions/CouponForm";
import {
  CouponActionEditor,
  type ActionDraft,
} from "../../../components/promotions/CouponActionEditor";
import {
  CouponConditionsEditor,
  type ConditionDraft,
  type ConditionOp,
} from "../../../components/promotions/CouponConditionsEditor";
import {
  CouponScheduleEditor,
  buildScheduleRows,
  type ScheduleRow,
} from "../../../components/promotions/CouponScheduleEditor";
import { SearchMultiSelectDropdown, type SelectOption } from "../../../components/promotions/SearchMultiSelectDropdown";
import { buildCategoryTree } from "../../../utils/categoryTree";
import type { Coupon } from "../../../types/promotions";

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
  const [coupon, setCoupon] = useState<SubscriptionCoupon>({
    product: 0,
    name: "",
    code: "",
    description: "",
    status: "ACTIVE",
    active: true,
    auto_apply: true,
    available_online: false,
    auto_apply_online: false,
    allow_combine: false,
    max_uses: 0,
    use_count: 0,
    start_at: undefined,
    end_at: undefined,
    apply_all_locations: true,
    locations: [],
    excluded_items: [],
    excluded_categories: [],
    excluded_groups: [],
    min_subtotal: "0.00",
    min_qty: 0,
    condition_tree: {},
    action_type: "CART_PERCENT",
    action_config: { percent: 0 },
    priority: 0,
    schedules: [],
  });
  const [locations, setLocations] = useState<Location[]>([]);
  const [itemOptions, setItemOptions] = useState<SelectOption[]>([]);
  const [groupOptions, setGroupOptions] = useState<SelectOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [categoryCascade, setCategoryCascade] = useState<{ descendantsById: Record<number, number[]> }>({
    descendantsById: {},
  });
  const initialSchedulesRef = useRef<SubscriptionCouponSchedule[]>([]);
  const [conditionOp, setConditionOp] = useState<ConditionOp>("AND");
  const [conditions, setConditions] = useState<ConditionDraft[]>([]);
  const [actionDraft, setActionDraft] = useState<ActionDraft>(actionDraftFromCoupon({
    name: "",
    active: true,
    auto_apply: true,
    available_online: false,
    auto_apply_online: false,
    action_type: "CART_PERCENT",
    action_config: { percent: 0 },
    apply_all_locations: true,
  } as Coupon));
  const [useSchedule, setUseSchedule] = useState(false);
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>(buildScheduleRows([]));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toInputDateTime = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  const fromInputDateTime = (value: string) => {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  };

  useEffect(() => {
    if (!props.open) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchLocations();
        if (!cancelled) {
          const rows = ((data as { results?: Location[] })?.results ?? []).filter(
            (l) => l.type_id !== "PORTAL"
          );
          setLocations(rows);
        }
      } catch {
        if (!cancelled) setLocations([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.open]);

  useEffect(() => {
    if (!props.open) return;
    let cancelled = false;
    (async () => {
      try {
        const [itemsRes, groupsRes, categoriesRes] = await Promise.all([
          fetchItems(),
          fetchItemGroups(),
          fetchCategories(),
        ]);
        if (cancelled) return;
        const items = (itemsRes?.results ?? []) as any[];
        const groups = (groupsRes?.results ?? []) as any[];
        const categories = (categoriesRes?.results ?? []) as any[];
        const catTree = buildCategoryTree(categories as any);
        setItemOptions(
          items
            .filter((i) => i?.id != null)
            .map((i) => ({ id: Number(i.id), label: String(i.name ?? `Item #${i.id}`) }))
        );
        setGroupOptions(
          groups
            .filter((g) => g?.id != null)
            .map((g) => ({ id: Number(g.id), label: String(g.name ?? `Group #${g.id}`) }))
        );
        setCategoryOptions(
          catTree.options.map((c) => ({
            id: c.id,
            label: c.label,
            depth: c.depth,
            parentId: c.parentId,
          }))
        );
        setCategoryCascade({ descendantsById: catTree.descendantsById });
      } catch {
        if (!cancelled) {
          setItemOptions([]);
          setGroupOptions([]);
          setCategoryOptions([]);
          setCategoryCascade({ descendantsById: {} });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.open]);

  useEffect(() => {
    if (!props.open) return;
    let cancelled = false;
    (async () => {
      const source = props.initial ?? null;
      const sourceId = Number(source?.id || 0);
      let scheduleSource: SubscriptionCouponSchedule[] = source?.schedules ?? [];
      if (sourceId) {
        try {
          const schedulesData = await fetchSubscriptionCouponSchedules(sourceId);
          scheduleSource = schedulesData.results ?? [];
        } catch {
          scheduleSource = source?.schedules ?? [];
        }
      }
      if (cancelled) return;

      const base: SubscriptionCoupon = {
        product: Number(props.productId || source?.product || 0),
        name: source?.name ?? "",
        code: source?.code ?? "",
        description: source?.description ?? "",
        status: source?.status ?? "ACTIVE",
        active: Boolean(source?.active ?? true),
        auto_apply: Boolean(source?.auto_apply ?? true),
        available_online: Boolean(source?.available_online ?? false),
        auto_apply_online: Boolean(source?.auto_apply_online ?? false),
        allow_combine: Boolean(source?.allow_combine ?? false),
        max_uses: Number(source?.max_uses ?? 0),
        use_count: Number(source?.use_count ?? 0),
        start_at: source?.start_at ?? undefined,
        end_at: source?.end_at ?? undefined,
        apply_all_locations: Boolean(source?.apply_all_locations ?? true),
        locations: source?.locations ?? [],
        excluded_items: source?.excluded_items ?? [],
        excluded_categories: source?.excluded_categories ?? [],
        excluded_groups: source?.excluded_groups ?? [],
        min_subtotal: source?.min_subtotal ?? "0.00",
        min_qty: Number(source?.min_qty ?? 0),
        condition_tree: source?.condition_tree ?? {},
        action_type: source?.action_type ?? "CART_PERCENT",
        action_config: source?.action_config ?? { percent: 0 },
        priority: Number(source?.priority ?? 0),
        schedules: scheduleSource,
      };

      setCoupon(base);
      const drafts = conditionDraftsFromTree(base.condition_tree);
      setConditionOp(drafts.op);
      setConditions(drafts.conditions);
      setActionDraft(actionDraftFromCoupon(base as unknown as Coupon));
      setUseSchedule(Boolean(scheduleSource.length));
      setScheduleRows(buildScheduleRows(scheduleSource as any));
      initialSchedulesRef.current = scheduleSource;
      setError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [props.open, props.initial]);

  const title = props.initial?.id ? "Edit Coupon" : "New Coupon";
  const selectedLocations = useMemo(() => coupon.locations ?? [], [coupon.locations]);

  const toggleLocation = (locationId: number) => {
    setCoupon((prev) => {
      const current = prev.locations ?? [];
      return current.includes(locationId)
        ? { ...prev, locations: current.filter((x) => x !== locationId) }
        : { ...prev, locations: [...current, locationId] };
    });
  };

  const syncSchedules = async (couponId: number) => {
    const desired = useSchedule
      ? scheduleRows
          .filter((r) => r.enabled)
          .map((r) => ({
            id: r.id,
            coupon: couponId,
            weekday: r.weekday,
            all_day: r.all_day,
            start_time: r.all_day ? null : r.start_time || null,
            end_time: r.all_day ? null : r.end_time || null,
          }))
      : [];
    const original = initialSchedulesRef.current ?? [];
    const originalByWeekday = new Map(original.map((s) => [s.weekday, s] as const));
    const desiredByWeekday = new Map(desired.map((s) => [s.weekday, s] as const));
    const deletions: number[] = [];
    for (const [weekday, s] of originalByWeekday.entries()) {
      if (!desiredByWeekday.has(weekday) && s.id != null) deletions.push(s.id);
    }
    const creations = [];
    const updates: Array<{ id: number; patch: Partial<SubscriptionCouponSchedule> }> = [];
    for (const [weekday, s] of desiredByWeekday.entries()) {
      const prev = originalByWeekday.get(weekday);
      if (prev?.id != null) {
        updates.push({
          id: prev.id,
          patch: { all_day: s.all_day, start_time: s.start_time, end_time: s.end_time },
        });
      } else {
        creations.push(s);
      }
    }
    await Promise.all([
      ...deletions.map((id) => deleteSubscriptionCouponSchedule(id)),
      ...creations.map((s) => createSubscriptionCouponSchedule(s as SubscriptionCouponSchedule)),
      ...updates.map((u) => updateSubscriptionCouponSchedule(u.id, u.patch)),
    ]);
  };

  const validateSchedules = () => {
    if (!useSchedule) return null;
    for (const row of scheduleRows) {
      if (!row.enabled || row.all_day) continue;
      if (!row.start_time || !row.end_time) {
        return `Schedule for ${row.weekday} requires start and end times.`;
      }
      if (row.start_time >= row.end_time) {
        return `Schedule for ${row.weekday} start time must be earlier than end time.`;
      }
    }
    return null;
  };

  return (
    <ModalShell
      open={props.open}
      title={title}
      subtitle="Advanced subscription coupon editor"
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
          if (!coupon.name.trim()) {
            setError("Coupon name is required.");
            return;
          }
          const requiresCodeForOnline = Boolean(coupon.available_online) && !Boolean(coupon.auto_apply_online);
          if ((!coupon.auto_apply || requiresCodeForOnline) && !(coupon.code ?? "").trim()) {
            setError("Coupon code is required when POS or Online Auto Apply is off.");
            return;
          }
          if (!coupon.apply_all_locations && !(coupon.locations ?? []).length) {
            setError("Select at least one location, or enable Apply to all locations.");
            return;
          }
          const maxUses = Number(coupon.max_uses ?? 0);
          if (!Number.isFinite(maxUses) || maxUses < 0) {
            setError("Usage limit must be 0 or more.");
            return;
          }
          const minSubtotal = String(coupon.min_subtotal ?? "0.00").trim();
          if (minSubtotal && !Number.isFinite(Number(minSubtotal))) {
            setError("Min subtotal must be a valid number.");
            return;
          }
          const minQty = Number(coupon.min_qty ?? 0);
          if (!Number.isFinite(minQty) || minQty < 0) {
            setError("Min qty must be 0 or more.");
            return;
          }
          const conditionError = validateConditions(conditionOp, conditions);
          if (conditionError) {
            setError(conditionError);
            return;
          }
          const scheduleError = validateSchedules();
          if (scheduleError) {
            setError(scheduleError);
            return;
          }
          const { config: action_config, error: actionError } = buildActionConfig(actionDraft);
          if (actionError) {
            setError(actionError);
            return;
          }

          setSaving(true);
          setError(null);
          try {
            const payload: Partial<SubscriptionCoupon> = {
              product: props.productId,
              name: coupon.name.trim(),
              code: (coupon.code ?? "").trim() || null,
              description: coupon.description || "",
              status: coupon.active ? "ACTIVE" : "INACTIVE",
              active: Boolean(coupon.active),
              auto_apply: Boolean(coupon.auto_apply),
              available_online: Boolean(coupon.available_online),
              auto_apply_online: Boolean(coupon.auto_apply_online),
              allow_combine: Boolean(coupon.allow_combine),
              max_uses: Math.floor(Math.max(0, Number(coupon.max_uses ?? 0))),
              start_at: fromInputDateTime(toInputDateTime(coupon.start_at)),
              end_at: fromInputDateTime(toInputDateTime(coupon.end_at)),
              apply_all_locations: Boolean(coupon.apply_all_locations),
              locations: coupon.apply_all_locations ? [] : coupon.locations ?? [],
              excluded_items: coupon.excluded_items ?? [],
              excluded_categories: coupon.excluded_categories ?? [],
              excluded_groups: coupon.excluded_groups ?? [],
              min_subtotal: minSubtotal || "0.00",
              min_qty: minQty,
              condition_tree: buildConditionTree(conditionOp, conditions),
              action_type: actionDraft.action_type,
              action_config,
              priority: Number(coupon.priority || 0),
            };

            const saved = props.initial?.id
              ? await updateSubscriptionCoupon(props.initial.id, payload)
              : await createSubscriptionCoupon(payload);
            await syncSchedules(saved.id!);

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
              value={coupon.name}
              onChange={(e) => setCoupon((c) => ({ ...c, name: e.target.value }))}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Coupon Code *</span>
            <input
              value={coupon.code ?? ""}
              onChange={(e) => setCoupon((c) => ({ ...c, code: e.target.value }))}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>

          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="text-xs text-kk-dark-text-muted">Description</span>
            <textarea
              value={coupon.description ?? ""}
              onChange={(e) => setCoupon((c) => ({ ...c, description: e.target.value }))}
              rows={3}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Status</span>
            <label className="inline-flex items-center gap-2 text-xs text-kk-dark-text-muted">
              <input
                type="checkbox"
                checked={coupon.active}
                onChange={(e) => setCoupon((c) => ({ ...c, active: e.target.checked }))}
                disabled={saving}
              />
              Active
            </label>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Usage Limit</span>
            <input
              type="number"
              min={0}
              value={coupon.max_uses ?? 0}
              onChange={(e) => setCoupon((c) => ({ ...c, max_uses: Number(e.target.value || 0) }))}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Priority</span>
            <input
              type="number"
              value={coupon.priority ?? 0}
              onChange={(e) => setCoupon((c) => ({ ...c, priority: Number(e.target.value || 0) }))}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Current Uses</span>
            <span className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm text-kk-dark-text-muted">
              {typeof coupon.use_count === "number" ? coupon.use_count : 0}
            </span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="inline-flex items-center gap-2 text-xs text-kk-dark-text-muted">
            <input type="checkbox" checked={coupon.auto_apply} onChange={(e) => setCoupon((c) => ({ ...c, auto_apply: e.target.checked }))} disabled={saving} />
            POS Auto Apply
          </label>
          <label className="inline-flex items-center gap-2 text-xs text-kk-dark-text-muted">
            <input type="checkbox" checked={coupon.allow_combine ?? false} onChange={(e) => setCoupon((c) => ({ ...c, allow_combine: e.target.checked }))} disabled={saving} />
            Allow Combine
          </label>
          <label className="inline-flex items-center gap-2 text-xs text-kk-dark-text-muted">
            <input type="checkbox" checked={coupon.available_online} onChange={(e) => setCoupon((c) => ({ ...c, available_online: e.target.checked, auto_apply_online: e.target.checked ? c.auto_apply_online : false }))} disabled={saving} />
            Available Online
          </label>
          <label className="inline-flex items-center gap-2 text-xs text-kk-dark-text-muted">
            <input type="checkbox" checked={coupon.auto_apply_online} disabled={!coupon.available_online || saving} onChange={(e) => setCoupon((c) => ({ ...c, auto_apply_online: e.target.checked, available_online: e.target.checked ? true : c.available_online }))} />
            Online Auto Apply
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Start Date</span>
            <input type="datetime-local" value={toInputDateTime(coupon.start_at)} onChange={(e) => setCoupon((c) => ({ ...c, start_at: fromInputDateTime(e.target.value) || undefined }))} className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm" disabled={saving} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">End Date</span>
            <input type="datetime-local" value={toInputDateTime(coupon.end_at)} onChange={(e) => setCoupon((c) => ({ ...c, end_at: fromInputDateTime(e.target.value) || undefined }))} className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm" disabled={saving} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Min Subtotal</span>
            <input
              type="text"
              value={coupon.min_subtotal ?? "0.00"}
              onChange={(e) => setCoupon((c) => ({ ...c, min_subtotal: e.target.value }))}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              placeholder="0.00"
              disabled={saving}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Min Qty</span>
            <input
              type="number"
              min={0}
              value={coupon.min_qty ?? 0}
              onChange={(e) => setCoupon((c) => ({ ...c, min_qty: Number(e.target.value || 0) }))}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={saving}
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-1">
          <label className="inline-flex items-center gap-2 text-xs text-kk-dark-text-muted">
            <input type="checkbox" checked={coupon.apply_all_locations} onChange={(e) => setCoupon((c) => ({ ...c, apply_all_locations: e.target.checked }))} disabled={saving} />
            Apply to all locations
          </label>
          {!coupon.apply_all_locations ? (
            <div className="rounded-lg border border-kk-dark-border p-3">
              <div className="text-xs text-kk-dark-text-muted mb-2">Select locations</div>
              <div className="max-h-[140px] overflow-auto space-y-1">
                {locations.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 text-xs text-kk-dark-text-muted">
                    <input type="checkbox" checked={selectedLocations.includes(l.id!)} onChange={() => toggleLocation(l.id!)} />
                    <span className="text-kk-dark-text">{l.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <div className="grid gap-2 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-kk-dark-text-muted">Excluded Items</p>
              <SearchMultiSelectDropdown options={itemOptions} selectedIds={coupon.excluded_items ?? []} onChange={(ids) => setCoupon((c) => ({ ...c, excluded_items: ids }))} placeholder="Select items..." />
            </div>
            <div>
              <p className="mb-1 text-xs text-kk-dark-text-muted">Excluded Groups</p>
              <SearchMultiSelectDropdown options={groupOptions} selectedIds={coupon.excluded_groups ?? []} onChange={(ids) => setCoupon((c) => ({ ...c, excluded_groups: ids }))} placeholder="Select groups..." />
            </div>
          </div>
          <div>
            <p className="mb-1 text-xs text-kk-dark-text-muted">Excluded Categories</p>
            <SearchMultiSelectDropdown options={categoryOptions} cascade={categoryCascade} selectedIds={coupon.excluded_categories ?? []} onChange={(ids) => setCoupon((c) => ({ ...c, excluded_categories: ids }))} placeholder="Select categories..." />
          </div>
        </div>

        <CouponConditionsEditor
          op={conditionOp}
          conditions={conditions}
          itemOptions={itemOptions}
          groupOptions={groupOptions}
          categoryOptions={categoryOptions}
          categoryCascade={categoryCascade}
          onChange={(next) => {
            setConditionOp(next.op);
            setConditions(next.conditions);
          }}
        />

        <CouponActionEditor
          value={actionDraft}
          onChange={setActionDraft}
          itemOptions={itemOptions}
          categoryOptions={categoryOptions}
          categoryCascade={categoryCascade}
        />

        <CouponScheduleEditor
          useSchedule={useSchedule}
          rows={scheduleRows}
          onChange={(next) => {
            setUseSchedule(next.useSchedule);
            setScheduleRows(next.rows);
          }}
        />

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
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : "Save Coupon"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
