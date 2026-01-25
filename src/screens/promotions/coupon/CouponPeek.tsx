import React, { useEffect, useMemo, useState } from "react";

import type { Coupon } from "../../../types/promotions";
import { ACTION_CHOICES, CDTN_MODE_CHOICES, CDTN_TYPE_CHOICES, DAY_CHOICES } from "../../../types/promotions";
import { fetchCoupon } from "../../../api/promotions";
import { TabNav } from "../../../components/layout/TabNav";
import { CouponTransactions } from "./CouponTransactions";

interface Props {
  coupon: Coupon;
}

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

const toJson = (v: any) => {
  if (v == null) return "-";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
};

export const CouponPeek: React.FC<Props> = ({ coupon }) => {
  const [tab, setTab] = useState("overview");
  const [peekCoupon, setPeekCoupon] = useState<Coupon | null>(null);

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

  const hasCode = Boolean(c.code && String(c.code).trim());

  const conditionSummary = useMemo(() => {
    const parts: string[] = [];
    if (c.min_subtotal) parts.push(`Min subtotal: ${c.min_subtotal}`);
    if (typeof c.min_qty === "number") parts.push(`Min qty: ${c.min_qty}`);
    return parts.length ? parts.join(" · ") : "";
  }, [c.min_qty, c.min_subtotal]);

  return (
    <div className="flex h-full flex-col gap-7 p-5 pb-7">
      <div className="flex flex-col items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold">{c.name}</h2>
          <p className="text-sm text-kk-dark-text-muted">
            {c.code ? `Code: ${c.code}` : "No coupon code"}
          </p>
        </div>

        <div className="flex gap-7">
          <TabNav action={() => setTab("overview")} isActive={tab === "overview"}>
            Overview
          </TabNav>
          <TabNav
            action={() => setTab("transactions")}
            isActive={tab === "transactions"}
          >
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
                {c.excluded_items?.length ? c.excluded_items.join(", ") : "-"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <h3 className="text-lg font-bold">Conditions</h3>
            {conditionSummary && (
              <p className="text-sm text-kk-dark-text-muted">{conditionSummary}</p>
            )}
            {c.condition_tree ? (
              <>
                <div className="grid grid-cols-10">
                  <p className="text-kk-dark-text-muted col-span-2">Type</p>
                  <p className="col-span-8">
                    {conditionTypeLabel(c.condition_tree?.type)}
                  </p>
                </div>
                <div className="grid grid-cols-10">
                  <p className="text-kk-dark-text-muted col-span-2">Mode</p>
                  <p className="col-span-8">
                    {conditionModeLabel(c.condition_tree?.mode)}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <p className="text-kk-dark-text-muted">Condition Tree</p>
                  <pre className="whitespace-pre-wrap rounded-md bg-kk-dark-hover p-3 text-xs">
                    {toJson(c.condition_tree)}
                  </pre>
                </div>
              </>
            ) : (
              <p className="text-sm text-kk-dark-text-muted">No condition tree.</p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <h3 className="text-lg font-bold">Action Configuration</h3>
            {c.action_config ? (
              <pre className="whitespace-pre-wrap rounded-md bg-kk-dark-hover p-3 text-xs">
                {toJson(c.action_config)}
              </pre>
            ) : (
              <p className="text-sm text-kk-dark-text-muted">No action config.</p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-2">
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

