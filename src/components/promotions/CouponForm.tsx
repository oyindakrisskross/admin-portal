import React, { useMemo, useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { TicketPercent, Loader2 } from "lucide-react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import type { Coupon, CouponSchedule } from "../../types/promotions";
import ListPageHeader from "../layout/ListPageHeader";
import ToastModal from "../ui/ToastModal";
import { createCoupon, updateCoupon } from "../../api/promotions";
import {
  createCouponSchedule,
  deleteCouponSchedule,
  updateCouponSchedule,
} from "../../api/promotions";
import { fetchLocations } from "../../api/location";
import type { Location } from "../../types/location";
import { fetchItemGroups, fetchItems } from "../../api/catalog";

import {
  CouponConditionsEditor,
  type ConditionDraft,
  type ConditionOp,
} from "./CouponConditionsEditor";
import { CouponActionEditor, type ActionDraft } from "./CouponActionEditor";
import {
  buildScheduleRows,
  CouponScheduleEditor,
  type ScheduleRow,
} from "./CouponScheduleEditor";
import { SearchMultiSelectDropdown, type SelectOption } from "./SearchMultiSelectDropdown";

interface Props {
  initial?: Coupon | null;
}

const EMPTY: Coupon = {
  name: "",
  code: "",
  active: true,
  auto_apply: true,
  description: "",
  start_at: undefined,
  end_at: undefined,
  apply_all_locations: true,
  locations: [],
  excluded_items: [],
  min_subtotal: "0.00",
  min_qty: 0,
  condition_tree: {},
  action_type: "CART_PERCENT",
  action_config: { percent: 0 },
  priority: 0,
  schedules: [],
};

function toInputDateTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromInputDateTime(v: string) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function conditionDraftsFromTree(tree: any): { op: ConditionOp; conditions: ConditionDraft[] } {
  if (!tree || Object.keys(tree).length === 0) return { op: "AND", conditions: [] };

  const op: ConditionOp = (tree.op || "AND").toUpperCase() === "OR" ? "OR" : "AND";
  const children = Array.isArray(tree.children) ? tree.children : [tree];

  const conditions: ConditionDraft[] = children
    .filter(Boolean)
    .map((leaf: any) => {
      const key = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const type = (leaf.type || "CART_MIN_SUBTOTAL") as any;
      if (type === "IN_CART_ITEMS_MIN_QTY") {
        return {
          key,
          type,
          min_qty: Number(leaf.min_qty ?? 1),
          mode: (leaf.mode || "SUM") as any,
          item_ids: Array.isArray(leaf.item_ids) ? leaf.item_ids : [],
        };
      }
      if (type === "IN_CART_GROUPS_MIN_QTY") {
        return {
          key,
          type,
          min_qty: Number(leaf.min_qty ?? 1),
          mode: (leaf.mode || "SUM") as any,
          group_ids: Array.isArray(leaf.group_ids) ? leaf.group_ids : [],
        };
      }
      return { key, type, value: leaf.value != null ? String(leaf.value) : "" };
    });

  return { op, conditions };
}

function buildConditionTree(op: ConditionOp, conditions: ConditionDraft[]) {
  if (!conditions.length) return {};

  const children = conditions.map((c) => {
    if (c.type === "IN_CART_ITEMS_MIN_QTY") {
      return {
        type: c.type,
        item_ids: c.item_ids ?? [],
        min_qty: Number(c.min_qty ?? 1),
        mode: (c.mode || "SUM").toUpperCase(),
      };
    }
    if (c.type === "IN_CART_GROUPS_MIN_QTY") {
      return {
        type: c.type,
        group_ids: c.group_ids ?? [],
        min_qty: Number(c.min_qty ?? 1),
        mode: (c.mode || "SUM").toUpperCase(),
      };
    }
    if (c.type === "CART_MIN_QTY") {
      return { type: c.type, value: Number(c.value || 0) };
    }
    return { type: c.type, value: c.value ?? "" };
  });

  return { op, children };
}

function validateConditions(op: ConditionOp, conditions: ConditionDraft[]) {
  void op;
  for (const c of conditions) {
    if (c.type === "CART_MIN_SUBTOTAL" || c.type === "CART_MAX_SUBTOTAL") {
      const v = (c.value ?? "").trim();
      if (!v || !Number.isFinite(Number(v))) return "Subtotal condition requires a valid amount.";
    }
    if (c.type === "CART_MIN_QTY") {
      const v = Number((c.value ?? "").trim());
      if (!Number.isFinite(v) || v < 0) return "Cart min qty condition requires a valid quantity.";
    }
    if (c.type === "IN_CART_ITEMS_MIN_QTY") {
      if (!(c.item_ids ?? []).length) return "Item condition requires at least one item.";
      const minQty = Number(c.min_qty ?? 1);
      if (!Number.isFinite(minQty) || minQty <= 0)
        return "Item condition requires Min Qty greater than 0.";
    }
    if (c.type === "IN_CART_GROUPS_MIN_QTY") {
      if (!(c.group_ids ?? []).length) return "Group condition requires at least one group.";
      const minQty = Number(c.min_qty ?? 1);
      if (!Number.isFinite(minQty) || minQty <= 0)
        return "Group condition requires Min Qty greater than 0.";
    }
  }
  return null;
}

function actionDraftFromCoupon(c: Coupon): ActionDraft {
  const cfg: any = c.action_config || {};
  const action_type = c.action_type || "CART_PERCENT";

  const itemIds = Array.isArray(cfg.items) ? cfg.items : [];

  const bxgy = (() => {
    const buy = cfg.buy || {};
    const get = cfg.get || {};
    const discount = get.discount || {};
    const dtype = String(discount.type || "FREE").toUpperCase();
    const discount_type =
      dtype === "PERCENT" || dtype === "AMOUNT" || dtype === "FREE" ? dtype : "FREE";
    return {
      buy_item_ids: Array.isArray(buy.items) ? buy.items : [],
      get_item_ids: Array.isArray(get.items) ? get.items : [],
      buy_qty: Number(buy.qty ?? 1) || 1,
      get_qty: Number(get.qty ?? 1) || 1,
      discount_type: discount_type as any,
      discount_value: discount.value != null ? String(discount.value) : "",
      repeat: Boolean(cfg.repeat ?? true),
      apply_cheapest: Boolean(cfg.apply_cheapest ?? true),
    };
  })();

  return {
    action_type,
    cartPercent: {
      percent: cfg.percent != null ? String(cfg.percent) : "",
      cap: cfg.cap != null ? String(cfg.cap) : "",
    },
    cartAmount: {
      amount: cfg.amount != null ? String(cfg.amount) : "",
    },
    itemPercent: {
      item_ids: itemIds,
      percent: cfg.percent != null ? String(cfg.percent) : "",
      cap: cfg.cap != null ? String(cfg.cap) : "",
    },
    itemAmount: {
      item_ids: itemIds,
      amount: cfg.amount != null ? String(cfg.amount) : "",
    },
    bxgy,
  };
}

function buildActionConfig(draft: ActionDraft): { config: any; error?: string } {
  if (draft.action_type === "CART_PERCENT") {
    const percent = Number(draft.cartPercent.percent || 0);
    if (!Number.isFinite(percent) || percent < 0) return { config: null, error: "Invalid percent value." };
    const cap = draft.cartPercent.cap.trim();
    return { config: cap ? { percent, cap } : { percent } };
  }

  if (draft.action_type === "CART_AMOUNT") {
    const amount = draft.cartAmount.amount.trim();
    if (!amount) return { config: null, error: "Amount off is required for Cart Amount Off." };
    return { config: { amount } };
  }

  if (draft.action_type === "ITEM_PERCENT") {
    if (!draft.itemPercent.item_ids.length) {
      return { config: null, error: "Select at least one product for Item Percent Off." };
    }
    const percent = Number(draft.itemPercent.percent || 0);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
      return { config: null, error: "Percent Off must be between 0 and 100." };
    }
    const cap = draft.itemPercent.cap.trim();
    return {
      config: cap
        ? { items: draft.itemPercent.item_ids, percent, cap }
        : { items: draft.itemPercent.item_ids, percent },
    };
  }

  if (draft.action_type === "ITEM_AMOUNT") {
    if (!draft.itemAmount.item_ids.length) {
      return { config: null, error: "Select at least one product for Item Amount Off." };
    }
    const amount = draft.itemAmount.amount.trim();
    if (!amount || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return { config: null, error: "Amount Off must be a valid number greater than 0." };
    }
    return { config: { items: draft.itemAmount.item_ids, amount } };
  }

  if (draft.action_type === "BXGY") {
    const buyQty = Number(draft.bxgy.buy_qty || 0);
    const getQty = Number(draft.bxgy.get_qty || 0);
    if (!draft.bxgy.buy_item_ids.length) return { config: null, error: "Select at least one Product to Buy." };
    if (!draft.bxgy.get_item_ids.length) return { config: null, error: "Select at least one Product to Get." };
    if (!Number.isFinite(buyQty) || buyQty <= 0) return { config: null, error: "Buy quantity must be greater than 0." };
    if (!Number.isFinite(getQty) || getQty <= 0) return { config: null, error: "Get quantity must be greater than 0." };

    const discountType = (draft.bxgy.discount_type || "FREE").toUpperCase();
    let discountValue: any = 0;
    if (discountType === "PERCENT") {
      const v = Number((draft.bxgy.discount_value || "").trim());
      if (!Number.isFinite(v) || v <= 0 || v > 100) {
        return { config: null, error: "Percent Off must be between 0 and 100." };
      }
      discountValue = v;
    } else if (discountType === "AMOUNT") {
      const v = (draft.bxgy.discount_value || "").trim();
      if (!v || !Number.isFinite(Number(v))) {
        return { config: null, error: "Fixed Amount Off must be a valid number." };
      }
      discountValue = v;
    } else {
      discountValue = 0;
    }

    return {
      config: {
        buy: {
          items: draft.bxgy.buy_item_ids,
          groups: [],
          qty: buyQty,
          mode: "SUM",
        },
        get: {
          items: draft.bxgy.get_item_ids,
          groups: [],
          qty: getQty,
          discount: {
            type: discountType,
            value: discountType === "FREE" ? 100 : discountValue,
          },
        },
        repeat: Boolean(draft.bxgy.repeat),
        apply_cheapest: Boolean(draft.bxgy.apply_cheapest),
      },
    };
  }

  return { config: {} };
}

export const CouponForm: React.FC<Props> = ({ initial }) => {
  const navigate = useNavigate();

  const [coupon, setCoupon] = useState<Coupon>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [locations, setLocations] = useState<Location[]>([]);
  const [itemOptions, setItemOptions] = useState<SelectOption[]>([]);
  const [groupOptions, setGroupOptions] = useState<SelectOption[]>([]);

  const initialSchedulesRef = useRef<CouponSchedule[]>(initial?.schedules ?? []);

  const initialConditions = useMemo(
    () => conditionDraftsFromTree((initial ?? EMPTY).condition_tree),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const [conditionOp, setConditionOp] = useState<ConditionOp>(initialConditions.op);
  const [conditions, setConditions] = useState<ConditionDraft[]>(initialConditions.conditions);

  const [actionDraft, setActionDraft] = useState<ActionDraft>(
    actionDraftFromCoupon(initial ?? EMPTY)
  );

  const [useSchedule, setUseSchedule] = useState<boolean>(
    Boolean((initial?.schedules ?? []).length)
  );
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>(
    buildScheduleRows(initial?.schedules)
  );

  useEffect(() => {
    (async () => {
      const data = (await fetchLocations()) as { results: Location[] };
      setLocations((data.results ?? []).filter((l: Location) => l.type_id !== "PORTAL"));
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [itemsRes, groupsRes] = await Promise.all([fetchItems(), fetchItemGroups()]);
        const items = (itemsRes?.results ?? []) as any[];
        const groups = (groupsRes?.results ?? []) as any[];

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
      } catch {
        // ignore; dropdown will show empty options
      }
    })();
  }, []);

  const selectedLocations = useMemo(() => coupon.locations ?? [], [coupon.locations]);

  const toggleLocation = (id: number) => {
    setCoupon((c) => {
      const current = c.locations ?? [];
      return current.includes(id)
        ? { ...c, locations: current.filter((x) => x !== id) }
        : { ...c, locations: [...current, id] };
    });
  };

  const validateSchedules = () => {
    if (!useSchedule) return null;
    for (const r of scheduleRows) {
      if (!r.enabled) continue;
      if (r.all_day) continue;
      if (!r.start_time || !r.end_time) {
        return `Schedule for ${r.weekday} requires start and end times.`;
      }
      if (r.start_time >= r.end_time) {
        return `Schedule for ${r.weekday} start time must be earlier than end time.`;
      }
    }
    return null;
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
    const updates: Array<{ id: number; patch: Partial<CouponSchedule> }> = [];
    for (const [weekday, s] of desiredByWeekday.entries()) {
      const prev = originalByWeekday.get(weekday);
      if (prev?.id != null) {
        updates.push({
          id: prev.id,
          patch: {
            all_day: s.all_day,
            start_time: s.start_time,
            end_time: s.end_time,
          },
        });
      } else {
        creations.push(s);
      }
    }

    await Promise.all([
      ...deletions.map((id) => deleteCouponSchedule(id)),
      ...creations.map((s) => createCouponSchedule(s as any)),
      ...updates.map((u) => updateCouponSchedule(u.id, u.patch)),
    ]);
  };

  const handleSave = async () => {
    const name = coupon.name.trim();
    if (!name) return setError("Coupon name is required.");
    if (!coupon.auto_apply && !coupon.code?.trim()) {
      return setError("Coupon code is required when Auto Apply is off.");
    }
    if (!coupon.apply_all_locations && !(coupon.locations ?? []).length) {
      return setError("Select at least one location, or enable Apply to all locations.");
    }

    const conditionError = validateConditions(conditionOp, conditions);
    if (conditionError) return setError(conditionError);

    const scheduleError = validateSchedules();
    if (scheduleError) return setError(scheduleError);

    const { config: action_config, error: actionError } = buildActionConfig(actionDraft);
    if (actionError) return setError(actionError);

    const condition_tree = buildConditionTree(conditionOp, conditions);

    const payload: any = {
      name,
      code: coupon.code?.trim() || null,
      active: Boolean(coupon.active),
      auto_apply: Boolean(coupon.auto_apply),
      description: coupon.description || "",
      start_at: fromInputDateTime(toInputDateTime(coupon.start_at)),
      end_at: fromInputDateTime(toInputDateTime(coupon.end_at)),
      apply_all_locations: Boolean(coupon.apply_all_locations),
      locations: coupon.apply_all_locations ? [] : coupon.locations ?? [],
      excluded_items: coupon.excluded_items ?? [],
      min_subtotal: coupon.min_subtotal != null ? String(coupon.min_subtotal) : "0.00",
      min_qty: Number(coupon.min_qty || 0),
      condition_tree,
      action_type: actionDraft.action_type,
      action_config,
      priority: Number(coupon.priority || 0),
    };

    setSaving(true);
    try {
      const saved = coupon.id
        ? await updateCoupon(coupon.id, payload)
        : await createCoupon(payload);

      await syncSchedules(saved.id!);

      navigate("/promotions/coupons");
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        e?.response?.data?.non_field_errors?.[0] ||
        "Failed to save coupon.";
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPageHeader
        icon={<TicketPercent className="h-5 w-5" />}
        section="Promotions"
        title={initial ? `Edit ${initial?.name}` : "New Coupon"}
        right={
          <button
            onClick={() => navigate("/promotions/coupons")}
            className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-kk-muted hover:text-gray-100"
            aria-label="Close"
          >
            <XMarkIcon className="h-7 w-7" />
          </button>
        }
      />

      <div className="flex flex-col gap-6 text-sm px-6 pt-4 pb-3">
        {/* Overview */}
        <section className="flex gap-6 py-7">
          <div className="w-2/3 flex flex-col gap-5">
            <div className="text-base font-semibold">Overview</div>

            <div className="grid grid-cols-6 gap-2">
              <p>Coupon Name</p>
              <input
                type="text"
                className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-5"
                value={coupon.name}
                onChange={(e) => setCoupon((c) => ({ ...c, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-6 gap-2">
              <p>Coupon Code</p>
              <input
                type="text"
                className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-3"
                value={coupon.code ?? ""}
                onChange={(e) => setCoupon((c) => ({ ...c, code: e.target.value }))}
              />
              <label className="flex items-center gap-2 col-span-2 text-xs text-kk-dark-text-muted">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={coupon.auto_apply}
                  onChange={(e) => setCoupon((c) => ({ ...c, auto_apply: e.target.checked }))}
                />
                Auto Apply
              </label>
            </div>

            <div className="grid grid-cols-6 gap-2">
              <p>Status</p>
              <label className="flex items-center gap-2 col-span-5 text-xs text-kk-dark-text-muted">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={coupon.active}
                  onChange={(e) => setCoupon((c) => ({ ...c, active: e.target.checked }))}
                />
                Active
              </label>
            </div>

            <div className="grid grid-cols-6 gap-2">
              <p>Description</p>
              <textarea
                className="min-h-[90px] col-span-5 rounded-md border border-kk-dark-input-border px-3 py-2"
                value={coupon.description ?? ""}
                onChange={(e) => setCoupon((c) => ({ ...c, description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Start Date</p>
              <input
                type="datetime-local"
                className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-2"
                value={toInputDateTime(coupon.start_at)}
                onChange={(e) => setCoupon((c) => ({ ...c, start_at: fromInputDateTime(e.target.value) || undefined }))}
              />
              <p className="text-right">End Date</p>
              <input
                type="datetime-local"
                className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-2"
                value={toInputDateTime(coupon.end_at)}
                onChange={(e) => setCoupon((c) => ({ ...c, end_at: fromInputDateTime(e.target.value) || undefined }))}
              />
            </div>

            {/* <div className="grid grid-cols-6 gap-2 items-center">
              <p>Min Subtotal</p>
              <input
                className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-2"
                placeholder="0.00"
                value={coupon.min_subtotal ?? ""}
                onChange={(e) => setCoupon((c) => ({ ...c, min_subtotal: e.target.value }))}
              />
              <p className="text-right">Min Qty</p>
              <input
                type="number"
                min={0}
                className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-2"
                value={coupon.min_qty ?? 0}
                onChange={(e) => setCoupon((c) => ({ ...c, min_qty: Number(e.target.value || 0) }))}
              />
            </div> */}

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Locations</p>
              <label className="flex items-center gap-2 col-span-5 text-xs text-kk-dark-text-muted">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={coupon.apply_all_locations}
                  onChange={(e) =>
                    setCoupon((c) => ({ ...c, apply_all_locations: e.target.checked }))
                  }
                />
                Apply to all locations
              </label>
            </div>

            {!coupon.apply_all_locations && (
              <div className="grid grid-cols-6 gap-2">
                <p />
                <div className="col-span-5 rounded-lg border border-kk-dark-border p-3">
                  <div className="text-xs text-kk-dark-text-muted mb-2">
                    Select locations
                  </div>
                  <div className="max-h-[180px] overflow-auto space-y-1">
                    {locations.map((l) => (
                      <label
                        key={l.id}
                        className="flex items-center gap-2 text-xs text-kk-dark-text-muted"
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300"
                          checked={selectedLocations.includes(l.id!)}
                          onChange={() => toggleLocation(l.id!)}
                        />
                        <span className="text-kk-dark-text">{l.name}</span>
                      </label>
                    ))}
                    {!locations.length && (
                      <div className="text-xs text-kk-dark-text-muted">
                        No locations loaded.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Excluded Items</p>
              <div className="col-span-5">
                <SearchMultiSelectDropdown
                  options={itemOptions}
                  selectedIds={coupon.excluded_items ?? []}
                  onChange={(ids) => setCoupon((c) => ({ ...c, excluded_items: ids }))}
                  placeholder="Select items to exclude..."
                />
                <div className="mt-1 text-[11px] text-kk-dark-text-muted">
                  Excluded items are ignored when calculating cart-level discounts and eligibility.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Priority</p>
              <input
                type="number"
                className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-2"
                value={coupon.priority ?? 0}
                onChange={(e) => setCoupon((c) => ({ ...c, priority: Number(e.target.value || 0) }))}
              />
              <span className="col-span-3 text-xs text-kk-dark-text-muted">
                Higher wins when savings are equal.
              </span>
            </div>
          </div>

          <div className="w-1/3" />
        </section>

        <CouponConditionsEditor
          op={conditionOp}
          conditions={conditions}
          itemOptions={itemOptions}
          groupOptions={groupOptions}
          onChange={(next) => {
            setConditionOp(next.op);
            setConditions(next.conditions);
          }}
        />

        <CouponActionEditor
          value={actionDraft}
          onChange={setActionDraft}
          itemOptions={itemOptions}
        />

        <CouponScheduleEditor
          useSchedule={useSchedule}
          rows={scheduleRows}
          onChange={(next) => {
            setUseSchedule(next.useSchedule);
            setScheduleRows(next.rows);
          }}
        />

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="danger rounded-full border border-red-600 px-4 py-1.5 text-xs font-medium text-red-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save Coupon
          </button>
        </div>

        <ToastModal message={error} onClose={() => setError(null)} variant="error" />
      </div>
    </>
  );
};
