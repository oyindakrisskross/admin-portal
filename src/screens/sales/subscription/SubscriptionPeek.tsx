import React, { useEffect, useMemo, useState } from "react";

import { fetchCustomerSubscription } from "../../../api/subscriptions";
import type { CustomerSubscriptionRecord, SubscriptionUsageHistoryEntry } from "../../../types/subscriptions";

interface Props {
  subscriptionId: number;
}

const toDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const statusBadge = (label: string) => {
  const tone =
    label === "ACTIVE"
      ? "bg-emerald-700 text-emerald-100"
      : label === "DEPLETED"
        ? "bg-amber-700 text-amber-100"
        : label === "EXPIRED"
          ? "bg-rose-700 text-rose-100"
          : "bg-slate-500 text-slate-100";
  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${tone}`}>{label}</span>;
};

export const SubscriptionPeek: React.FC<Props> = ({ subscriptionId }) => {
  const [subscription, setSubscription] = useState<CustomerSubscriptionRecord | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchCustomerSubscription(subscriptionId);
        if (!cancelled) setSubscription(data);
      } catch {
        if (!cancelled) setSubscription(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subscriptionId]);

  const usageHistory = useMemo(
    () => (Array.isArray(subscription?.usage_history) ? subscription?.usage_history : []),
    [subscription?.usage_history]
  );

  if (loading && !subscription) {
    return <div className="px-3 py-6 text-sm text-kk-dark-text-muted">Loading subscription...</div>;
  }

  if (!subscription) {
    return <div className="px-3 py-6 text-sm text-kk-dark-text-muted">Unable to load subscription.</div>;
  }

  return (
    <div className="flex h-full flex-col gap-6 p-5 pb-7">
      <div>
        <h2 className="text-2xl font-semibold">{subscription.plan_name}</h2>
        <p className="text-sm text-kk-dark-text-muted">{subscription.plan_code}</p>
      </div>

      <div className="grid grid-cols-10 gap-y-2">
        <p className="col-span-3 text-kk-dark-text-muted">Customer</p>
        <p className="col-span-7">{subscription.customer_name || subscription.customer_email}</p>

        <p className="col-span-3 text-kk-dark-text-muted">Email</p>
        <p className="col-span-7">{subscription.customer_email}</p>

        <p className="col-span-3 text-kk-dark-text-muted">Plan Type</p>
        <p className="col-span-7">{subscription.plan_type === "USAGE" ? "Usage" : "Cycle"}</p>

        <p className="col-span-3 text-kk-dark-text-muted">Status</p>
        <div className="col-span-7">{statusBadge(subscription.status)}</div>

        <p className="col-span-3 text-kk-dark-text-muted">Subscription Created</p>
        <p className="col-span-7">{toDateTime(subscription.created_on)}</p>

        <p className="col-span-3 text-kk-dark-text-muted">Subscription Start</p>
        <p className="col-span-7">{toDateTime(subscription.started_at)}</p>

        <p className="col-span-3 text-kk-dark-text-muted">Payment Date</p>
        <p className="col-span-7">
          {toDateTime(subscription.source_invoice_paid_at || subscription.source_invoice_date || null)}
        </p>

        <p className="col-span-3 text-kk-dark-text-muted">Source Invoice</p>
        <p className="col-span-7">{subscription.source_invoice_number || "-"}</p>

        <p className="col-span-3 text-kk-dark-text-muted">Expires</p>
        <p className="col-span-7">{toDateTime(subscription.expires_at)}</p>

        <p className="col-span-3 text-kk-dark-text-muted">Uses</p>
        <p className="col-span-7">
          {subscription.total_uses == null
            ? "Unlimited"
            : `${subscription.used_uses}/${subscription.total_uses} (remaining: ${subscription.remaining_uses ?? 0})`}
        </p>
      </div>

      {subscription.plan_type === "USAGE" ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold">Usage History</h3>
          {usageHistory.length ? (
            <table className="min-w-full">
              <thead>
                <tr>
                  <th>Used At</th>
                  <th>Location</th>
                  <th>POS Ref</th>
                </tr>
              </thead>
              <tbody>
                {usageHistory.map((entry: SubscriptionUsageHistoryEntry) => (
                  <tr key={entry.id}>
                    <td>{toDateTime(entry.visited_at)}</td>
                    <td>{entry.location_name || "-"}</td>
                    <td>{entry.pos_reference || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-kk-dark-text-muted">No usage recorded yet.</p>
          )}
        </div>
      ) : null}
    </div>
  );
};
