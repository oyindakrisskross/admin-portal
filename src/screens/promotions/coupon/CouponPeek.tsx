import React, { useEffect, useMemo, useRef, useState } from "react";

import type { Coupon } from "../../../types/promotions";
import { ACTION_CHOICES, CDTN_MODE_CHOICES, CDTN_TYPE_CHOICES, DAY_CHOICES } from "../../../types/promotions";
import { fetchCoupon } from "../../../api/promotions";
import { fetchItem, fetchItemGroup } from "../../../api/catalog";
import { TabNav } from "../../../components/layout/TabNav";
import { CouponTransactions } from "./CouponTransactions";

interface Props {
  coupon: Coupon;
}

type RenderLine = { label: string; value: React.ReactNode };
type NameMap = Record<number, string>;
type NameResolver = (id: number) => string | undefined;

const actionLabel = (v?: string) =>
  ACTION_CHOICES.find((a) => a.value === v)?.label ?? v ?? "-";

const conditionTypeLabel = (v?: string) =>
  CDTN_TYPE_CHOICES.find((c) => c.value === v)?.label ?? v ?? "-";

const conditionModeLabel = (v?: string) =>
  CDTN_MODE_CHOICES.find((c) => c.value === v)?.label ?? v ?? "-";

const weekdayLabel = (v?: string) =>
  DAY_CHOICES.find((d) => d.value === v)?.label ?? v ?? "-";

const toDate = (v?: string) => (v ? new Date(v).toLocaleString() : "-");
const yn = (v: any) => (v ? "Yes" : "No");

function normalizeId(v: any): number | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function normalizeIdArray(v: any): number[] {
  const arr = Array.isArray(v) ? v : v == null ? [] : [v];
  const ids: number[] = [];
  for (const x of arr) {
    const id = normalizeId(x);
    if (id != null) ids.push(id);
  }
  return ids;
}

function uniqSorted(ids: number[]) {
  return Array.from(new Set(ids)).sort((a, b) => a - b);
}

function formatNamedIds(ids: any, resolve: NameResolver, fallbackPrefix: string) {
  const arr = normalizeIdArray(ids);
  if (!arr.length) return "-";
  return arr
    .map((id) => {
      const name = resolve(id);
      return name ? name : `${fallbackPrefix} #${id}`;
    })
    .join(", ");
}

function conditionLeafToText(leaf: any, resolveItemName: NameResolver, resolveGroupName: NameResolver) {
  const type = String(leaf?.type ?? "").toUpperCase();
  if (!type) return "Condition";

  if (type === "CART_MIN_SUBTOTAL") return `Cart subtotal is at least ${leaf?.value ?? "0"}`;
  if (type === "CART_MAX_SUBTOTAL") return `Cart subtotal is at most ${leaf?.value ?? "0"}`;
  if (type === "CART_MIN_QTY") return `Cart quantity is at least ${leaf?.value ?? "0"}`;

  if (type === "IN_CART_ITEMS_MIN_QTY") {
    const items = formatNamedIds(leaf?.item_ids, resolveItemName, "Item");
    const minQty = Number(leaf?.min_qty ?? 1);
    const mode = conditionModeLabel(String(leaf?.mode ?? "SUM").toUpperCase());
    return `At least ${minQty} of items (${items}) [Mode: ${mode}]`;
  }

  if (type === "IN_CART_GROUPS_MIN_QTY") {
    const groups = formatNamedIds(leaf?.group_ids, resolveGroupName, "Group");
    const minQty = Number(leaf?.min_qty ?? 1);
    const mode = conditionModeLabel(String(leaf?.mode ?? "SUM").toUpperCase());
    return `At least ${minQty} of groups (${groups}) [Mode: ${mode}]`;
  }

  const value = leaf?.value != null ? String(leaf.value) : "";
  return value ? `${conditionTypeLabel(type)}: ${value}` : conditionTypeLabel(type);
}

function flattenConditionTree(
  tree: any,
  resolveItemName: NameResolver,
  resolveGroupName: NameResolver
): { op: "AND" | "OR"; lines: string[] } {
  if (!tree || typeof tree !== "object") return { op: "AND", lines: [] };
  const opRaw = String((tree as any).op ?? "AND").toUpperCase();
  const op: "AND" | "OR" = opRaw === "OR" ? "OR" : "AND";

  const children = Array.isArray((tree as any).children)
    ? (tree as any).children
    : (tree as any).type
      ? [tree]
      : [];

  const lines = children
    .filter(Boolean)
    .map((leaf: any) => conditionLeafToText(leaf, resolveItemName, resolveGroupName));
  return { op, lines };
}

function actionConfigToLines(
  actionType: any,
  cfg: any,
  resolveItemName: NameResolver,
  resolveGroupName: NameResolver
): RenderLine[] {
  const t = String(actionType ?? "").toUpperCase();
  const c = cfg && typeof cfg === "object" ? cfg : {};
  const lines: RenderLine[] = [];

  if (t === "CART_PERCENT") {
    lines.push({ label: "Cart percent off", value: `${(c as any).percent ?? 0}%` });
    if ((c as any).cap != null && String((c as any).cap).trim() !== "")
      lines.push({ label: "Max discount (cap)", value: String((c as any).cap) });
  } else if (t === "CART_AMOUNT") {
    lines.push({ label: "Cart amount off", value: String((c as any).amount ?? 0) });
  } else if (t === "ITEM_PERCENT") {
    lines.push({ label: "Items", value: formatNamedIds((c as any).items, resolveItemName, "Item") });
    lines.push({ label: "Percent off", value: `${(c as any).percent ?? 0}%` });
    if ((c as any).cap != null && String((c as any).cap).trim() !== "")
      lines.push({ label: "Max discount (cap)", value: String((c as any).cap) });
  } else if (t === "ITEM_AMOUNT") {
    lines.push({ label: "Items", value: formatNamedIds((c as any).items, resolveItemName, "Item") });
    lines.push({ label: "Amount off", value: String((c as any).amount ?? 0) });
  } else if (t === "BXGY") {
    const buy: any = (c as any).buy ?? {};
    const get: any = (c as any).get ?? {};
    const discount: any = get.discount ?? {};
    const discountType = String(discount.type ?? "FREE").toUpperCase();
    const discountValue =
      discountType === "FREE"
        ? "Free"
        : discountType === "PERCENT"
          ? `${discount.value ?? 0}% off`
          : String(discount.value ?? 0);

    if (buy.items != null) lines.push({ label: "Buy items", value: formatNamedIds(buy.items, resolveItemName, "Item") });
    if (buy.groups != null) lines.push({ label: "Buy groups", value: formatNamedIds(buy.groups, resolveGroupName, "Group") });
    lines.push({ label: "Buy quantity", value: String(buy.qty ?? 0) });
    if (get.items != null) lines.push({ label: "Get items", value: formatNamedIds(get.items, resolveItemName, "Item") });
    lines.push({ label: "Get quantity", value: String(get.qty ?? 0) });
    lines.push({ label: "Get discount", value: discountValue });
    lines.push({ label: "Repeat", value: yn((c as any).repeat) });
    lines.push({ label: "Apply cheapest", value: yn((c as any).apply_cheapest) });
  } else {
    for (const [k, v] of Object.entries(c)) {
      lines.push({
        label: k.replace(/_/g, " "),
        value: typeof v === "object" ? JSON.stringify(v) : String(v),
      });
    }
  }

  const customized: any = (c as any).customized;
  if (customized && typeof customized === "object") {
    lines.push({ label: "Customized items in conditions", value: yn(customized.include_in_conditions) });
    lines.push({ label: "Apply discount to customized items", value: yn(customized.apply_discount) });
    if (customized.discount_scope != null) lines.push({ label: "Discount scope", value: String(customized.discount_scope) });
  }

  return lines;
}

export const CouponPeek: React.FC<Props> = ({ coupon }) => {
  const [tab, setTab] = useState("overview");
  const [peekCoupon, setPeekCoupon] = useState<Coupon | null>(null);

  const [itemNames, setItemNames] = useState<NameMap>({});
  const [groupNames, setGroupNames] = useState<NameMap>({});
  const failedItemIdsRef = useRef<Set<number>>(new Set());
  const failedGroupIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    failedItemIdsRef.current = new Set();
    failedGroupIdsRef.current = new Set();
  }, [coupon.id]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchCoupon(Number(coupon.id));
        if (!cancelled) setPeekCoupon(data);
      } catch {
        if (!cancelled) setPeekCoupon(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [coupon.id]);

  const c = peekCoupon ?? coupon;

  const referencedItemIds = useMemo(() => {
    const ids: number[] = [];

    // Scope
    ids.push(...normalizeIdArray((c as any).excluded_items));

    // Condition tree
    const tree: any = (c as any).condition_tree;
    const leaves = Array.isArray(tree?.children) ? tree.children : tree?.type ? [tree] : [];
    for (const leaf of leaves) {
      if (!leaf) continue;
      ids.push(...normalizeIdArray(leaf.item_ids));
    }

    // Action config
    const cfg: any = (c as any).action_config ?? {};
    ids.push(...normalizeIdArray(cfg.items));
    ids.push(...normalizeIdArray(cfg.buy?.items));
    ids.push(...normalizeIdArray(cfg.get?.items));

    return uniqSorted(ids);
  }, [c]);

  const referencedGroupIds = useMemo(() => {
    const ids: number[] = [];

    // Condition tree
    const tree: any = (c as any).condition_tree;
    const leaves = Array.isArray(tree?.children) ? tree.children : tree?.type ? [tree] : [];
    for (const leaf of leaves) {
      if (!leaf) continue;
      ids.push(...normalizeIdArray(leaf.group_ids));
    }

    // Action config (future-proof)
    const cfg: any = (c as any).action_config ?? {};
    ids.push(...normalizeIdArray(cfg.buy?.groups));

    return uniqSorted(ids);
  }, [c]);

  useEffect(() => {
    let cancelled = false;
    const missing = referencedItemIds.filter(
      (id) => !itemNames[id] && !failedItemIdsRef.current.has(id)
    );
    if (!missing.length) return;

    (async () => {
      const pairs = await Promise.all(
        missing.map(async (id) => {
          try {
            const item: any = await fetchItem(id);
            const name = String(item?.name ?? `Item ${id}`);
            return [id, name] as const;
          } catch {
            failedItemIdsRef.current.add(id);
            return null;
          }
        })
      );

      if (cancelled) return;
      setItemNames((prev) => {
        const next = { ...prev };
        for (const p of pairs) {
          if (!p) continue;
          next[p[0]] = p[1];
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [referencedItemIds, itemNames]);

  useEffect(() => {
    let cancelled = false;
    const missing = referencedGroupIds.filter(
      (id) => !groupNames[id] && !failedGroupIdsRef.current.has(id)
    );
    if (!missing.length) return;

    (async () => {
      const pairs = await Promise.all(
        missing.map(async (id) => {
          try {
            const group: any = await fetchItemGroup(id);
            const name = String(group?.name ?? `Group ${id}`);
            return [id, name] as const;
          } catch {
            failedGroupIdsRef.current.add(id);
            return null;
          }
        })
      );

      if (cancelled) return;
      setGroupNames((prev) => {
        const next = { ...prev };
        for (const p of pairs) {
          if (!p) continue;
          next[p[0]] = p[1];
        }
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [referencedGroupIds, groupNames]);

  const hasCode = Boolean(c.code && String(c.code).trim());

  const conditionSummary = useMemo(() => {
    const parts: string[] = [];
    if (c.min_subtotal) parts.push(`Min subtotal: ${c.min_subtotal}`);
    if (typeof c.min_qty === "number") parts.push(`Min qty: ${c.min_qty}`);
    return parts.length ? parts.join(" · ") : "";
  }, [c.min_qty, c.min_subtotal]);

  const resolveItemName: NameResolver = (id) => itemNames[id];
  const resolveGroupName: NameResolver = (id) => groupNames[id];

  const conditionDetails = useMemo(
    () => flattenConditionTree(c.condition_tree, resolveItemName, resolveGroupName),
    [c.condition_tree, itemNames, groupNames]
  );

  const actionLines = useMemo(
    () => (c.action_config ? actionConfigToLines(c.action_type, c.action_config, resolveItemName, resolveGroupName) : []),
    [c.action_config, c.action_type, itemNames, groupNames]
  );

  return (
    <div className="flex h-full flex-col gap-7 p-5 pb-7">
      <div className="flex flex-col items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold">{c.name}</h2>
          <p className="text-sm text-kk-dark-text-muted">
            {c.code ? `Code: ${c.code}` : "No coupon code"}
          </p>
        </div>

        <div className="flex flex-wrap gap-x-7 gap-y-2">
          <TabNav action={() => setTab("overview")} isActive={tab === "overview"}>
            Overview
          </TabNav>
          <TabNav action={() => setTab("conditions")} isActive={tab === "conditions"}>
            Conditions
          </TabNav>
          <TabNav action={() => setTab("actions")} isActive={tab === "actions"}>
            Actions
          </TabNav>
          <TabNav action={() => setTab("schedule")} isActive={tab === "schedule"}>
            Schedule
          </TabNav>
          <TabNav action={() => setTab("transactions")} isActive={tab === "transactions"}>
            Transactions
          </TabNav>
        </div>
      </div>

      {tab === "overview" && (
        <div className="flex h-full flex-col gap-4 pb-7">
          <div className="grid grid-cols-10">
            <p className="text-kk-dark-text-muted col-span-2">Status</p>
            <p className="col-span-4">{c.active ? "Active" : "Inactive"}</p>
          </div>
          <div className="grid grid-cols-10">
            <p className="text-kk-dark-text-muted col-span-2">Auto Apply</p>
            <p className="col-span-4">{yn(c.auto_apply)}</p>
          </div>
          <div className="grid grid-cols-10">
            <p className="text-kk-dark-text-muted col-span-2">Action Type</p>
            <p className="col-span-4">{actionLabel(c.action_type)}</p>
          </div>
          {typeof c.priority === "number" && (
            <div className="grid grid-cols-10">
              <p className="text-kk-dark-text-muted col-span-2">Priority</p>
              <p className="col-span-4">{c.priority}</p>
            </div>
          )}
          <div className="grid grid-cols-10">
            <p className="text-kk-dark-text-muted col-span-2">Start</p>
            <p className="col-span-4">{toDate(c.start_at)}</p>
          </div>
          <div className="grid grid-cols-10">
            <p className="text-kk-dark-text-muted col-span-2">End</p>
            <p className="col-span-4">{toDate(c.end_at)}</p>
          </div>

          {c.description && (
            <div className="flex flex-col gap-0.5">
              <p className="text-kk-dark-text-muted">Description</p>
              <p>{c.description}</p>
            </div>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <h3 className="text-lg font-bold">Scope</h3>
            <div className="grid grid-cols-10">
              <p className="text-kk-dark-text-muted col-span-2">All Locations</p>
              <p className="col-span-4">{yn(c.apply_all_locations)}</p>
            </div>
            {!c.apply_all_locations && (
              <div className="grid grid-cols-10">
                <p className="text-kk-dark-text-muted col-span-2">Locations</p>
                <p className="col-span-8">
                  {c.locations?.length ? c.locations.join(", ") : "-"}
                </p>
              </div>
            )}
            <div className="grid grid-cols-10">
              <p className="text-kk-dark-text-muted col-span-2">Excluded Items</p>
              <p className="col-span-8">
                {c.excluded_items?.length
                  ? formatNamedIds(c.excluded_items, resolveItemName, "Item")
                  : "-"}
              </p>
            </div>
          </div>
        </div>
      )}

      {tab === "conditions" && (
        <div className="flex h-full flex-col gap-3 pb-7">
          <h3 className="text-lg font-bold">Conditions</h3>
          {conditionSummary && (
            <p className="text-sm text-kk-dark-text-muted">{conditionSummary}</p>
          )}

          {!c.condition_tree || (typeof c.condition_tree === "object" && !Object.keys(c.condition_tree).length) ? (
            <p className="text-sm text-kk-dark-text-muted">No condition tree.</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-10">
                <p className="text-kk-dark-text-muted col-span-2">Combine</p>
                <p className="col-span-8">{conditionDetails.op}</p>
              </div>

              {conditionDetails.lines.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {conditionDetails.lines.map((line, idx) => (
                    <li key={`${idx}-${line}`}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-kk-dark-text-muted">
                  Condition tree is present but could not be parsed.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "actions" && (
        <div className="flex h-full flex-col gap-3 pb-7">
          <h3 className="text-lg font-bold">Actions</h3>
          <div className="grid grid-cols-10">
            <p className="text-kk-dark-text-muted col-span-2">Action Type</p>
            <p className="col-span-8">{actionLabel(c.action_type)}</p>
          </div>

          {c.action_config ? (
            actionLines.length ? (
              <div className="space-y-2">
                {actionLines.map((l) => (
                  <div key={l.label} className="grid grid-cols-10">
                    <p className="text-kk-dark-text-muted col-span-3">{l.label}</p>
                    <p className="col-span-7">{l.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-kk-dark-text-muted">No action details found.</p>
            )
          ) : (
            <p className="text-sm text-kk-dark-text-muted">No action config.</p>
          )}
        </div>
      )}

      {tab === "schedule" && (
        <div className="flex h-full flex-col gap-3 pb-7">
          <h3 className="text-lg font-bold">Schedule</h3>
          {c.schedules?.length ? (
            <table className="min-w-full">
              <thead>
                <tr>
                  <th>Day</th>
                  <th>All Day</th>
                  <th>Start</th>
                  <th>End</th>
                </tr>
              </thead>
              <tbody>
                {c.schedules.map((s) => (
                  <tr key={String(s.id ?? `${s.weekday}-${s.start_time}-${s.end_time}`)}>
                    <td>{weekdayLabel(s.weekday)}</td>
                    <td>{yn(s.all_day)}</td>
                    <td>{s.start_time ?? "-"}</td>
                    <td>{s.end_time ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-kk-dark-text-muted">No schedules.</p>
          )}
        </div>
      )}

      {tab === "transactions" && (
        <>
          {!hasCode ? (
            <div className="px-3 py-10 text-center text-xs text-kk-dark-text-muted">
              This coupon has no code, so there are no transactions to show.
            </div>
          ) : (
            <CouponTransactions couponCode={String(c.code)} />
          )}
        </>
      )}
    </div>
  );
};

