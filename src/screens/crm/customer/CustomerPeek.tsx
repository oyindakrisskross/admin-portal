import React, { useEffect, useState } from "react";

import { fetchCustomer } from "../../../api/customerPortal";
import { fetchCustomerSubscriptions } from "../../../api/subscriptions";
import type { CustomerRecord } from "../../../types/customerPortal";
import type { CustomerSubscriptionRecord } from "../../../types/subscriptions";

interface Props {
  customerId: number;
}

const toDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const statusBadge = (active: boolean) =>
  active ? (
    <span className="inline-flex rounded-full px-2 py-1 text-[11px] font-medium bg-emerald-700 text-emerald-100">
      ACTIVE
    </span>
  ) : (
    <span className="inline-flex rounded-full px-2 py-1 text-[11px] font-medium bg-slate-500 text-slate-100">
      INACTIVE
    </span>
  );

const subscriptionStatusBadge = (label: string) => {
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

export const CustomerPeek: React.FC<Props> = ({ customerId }) => {
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [subscriptions, setSubscriptions] = useState<CustomerSubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [customerData, subscriptionsData] = await Promise.all([
          fetchCustomer(customerId),
          fetchCustomerSubscriptions({ customer: customerId, page_size: 100 }),
        ]);
        if (cancelled) return;
        setCustomer(customerData);
        setSubscriptions(subscriptionsData.results ?? []);
      } catch {
        if (!cancelled) {
          setCustomer(null);
          setSubscriptions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (loading && !customer) {
    return <div className="px-3 py-6 text-sm text-kk-dark-text-muted">Loading customer...</div>;
  }

  if (!customer) {
    return <div className="px-3 py-6 text-sm text-kk-dark-text-muted">Unable to load customer details.</div>;
  }

  const fullName = `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim();

  return (
    <div className="flex h-full flex-col gap-6 p-5 pb-7">
      <div>
        <h2 className="text-2xl font-semibold">{fullName || customer.email}</h2>
        <p className="text-sm text-kk-dark-text-muted">{customer.email}</p>
      </div>

      <div className="grid grid-cols-10 gap-y-2">
        <p className="col-span-3 text-kk-dark-text-muted">Status</p>
        <div className="col-span-7">{statusBadge(Boolean(customer.is_active))}</div>

        <p className="col-span-3 text-kk-dark-text-muted">Phone</p>
        <p className="col-span-7">{customer.phone || "-"}</p>

        <p className="col-span-3 text-kk-dark-text-muted">Active Minors</p>
        <p className="col-span-7">{customer.minors_count ?? 0}</p>

        <p className="col-span-3 text-kk-dark-text-muted">Created</p>
        <p className="col-span-7">{toDateTime(customer.created_at)}</p>

        <p className="col-span-3 text-kk-dark-text-muted">Updated</p>
        <p className="col-span-7">{toDateTime(customer.updated_at)}</p>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-lg font-semibold">Subscriptions</h3>
        {subscriptions.length ? (
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Status</th>
                <th>Started</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="flex flex-col">
                      <span>{row.plan_name}</span>
                      <span className="text-xs text-kk-dark-text-muted">{row.plan_code}</span>
                    </div>
                  </td>
                  <td>{subscriptionStatusBadge(row.status)}</td>
                  <td>{toDateTime(row.started_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-kk-dark-text-muted">No subscriptions found for this customer.</p>
        )}
      </div>
    </div>
  );
};
