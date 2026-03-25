import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchCustomer } from "../../../api/customerPortal";
import { fetchOrders } from "../../../api/invoice";
import { fetchCustomerSubscriptions } from "../../../api/subscriptions";
import { TabNav } from "../../../components/layout/TabNav";
import { formatMoneyNGN, getPrepaidDisplayStatus, humanizeStatus } from "../../../helpers";
import type { CustomerMinorRecord, CustomerRecord } from "../../../types/customerPortal";
import type { InvoiceResponse } from "../../../types/invoice";
import type { CustomerSubscriptionRecord } from "../../../types/subscriptions";

interface Props {
  customerId: number;
}

const toDateTime = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

const toDate = (value?: string | null) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
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
      : label === "UNPAID"
        ? "bg-orange-700 text-orange-100"
      : label === "DEPLETED"
        ? "bg-amber-700 text-amber-100"
        : label === "EXPIRED"
          ? "bg-rose-700 text-rose-100"
          : "bg-slate-500 text-slate-100";
  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${tone}`}>{label}</span>;
};

const invoiceStatusBadge = (invoice: InvoiceResponse) => {
  const label =
    invoice.type_id === "PREPAID"
      ? getPrepaidDisplayStatus(invoice)
      : String(invoice.status || "").toUpperCase();

  const tone =
    label === "PAID" || label === "UNUSED"
      ? "bg-emerald-700 text-emerald-100"
      : label === "OPEN" ||
          label === "DRAFT" ||
          label === "PARTIALLY_PAID" ||
          label === "PARTIALLY_REDEEMED"
        ? "bg-amber-700 text-amber-100"
        : label === "VOID" || label === "REFUNDED" || label === "EXPIRED"
          ? "bg-rose-700 text-rose-100"
          : "bg-slate-500 text-slate-100";

  return (
    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${tone}`}>
      {humanizeStatus(label)}
    </span>
  );
};

export const CustomerPeek: React.FC<Props> = ({ customerId }) => {
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<CustomerRecord | null>(null);
  const [subscriptions, setSubscriptions] = useState<CustomerSubscriptionRecord[]>([]);
  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"overview" | "minors" | "subscriptions" | "invoices">("overview");

  useEffect(() => {
    setTab("overview");
  }, [customerId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setCustomer(null);
      setSubscriptions([]);
      setInvoices([]);
      try {
        const customerData = await fetchCustomer(customerId);
        if (cancelled) return;
        setCustomer(customerData);

        try {
          const [subscriptionsData, invoicesData] = await Promise.all([
            fetchCustomerSubscriptions({ customer: customerId, page_size: 500 }),
            fetchOrders({ portal_customer: customerId, page_size: 500 }),
          ]);
          if (cancelled) return;
          setSubscriptions(subscriptionsData.results ?? []);
          setInvoices(invoicesData.results ?? []);
        } catch {
          if (cancelled) return;
          setSubscriptions([]);
          setInvoices([]);
        }
      } catch {
        if (!cancelled) {
          setCustomer(null);
          setSubscriptions([]);
          setInvoices([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const sortedSubscriptions = useMemo(
    () =>
      [...subscriptions].sort(
        (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
      ),
    [subscriptions]
  );
  const sortedInvoices = useMemo(
    () =>
      [...invoices].sort(
        (a, b) => new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime()
      ),
    [invoices]
  );
  const sortedMinors = useMemo(
    () => {
      const sourceRows = [
        ...(Array.isArray(customer?.minors) ? customer.minors : []),
        ...(Array.isArray(customer?.customer_minors) ? customer.customer_minors : []),
      ];
      const deduped = new Map<string, CustomerMinorRecord>();
      sourceRows.forEach((minor) => {
        if (!minor) return;
        const key =
          minor.id != null
            ? `id:${minor.id}`
            : `${minor.first_name ?? ""}|${minor.last_name ?? ""}|${minor.dob ?? ""}`;
        if (!deduped.has(key)) {
          deduped.set(key, minor);
        }
      });

      return [...deduped.values()].sort(
        (a: CustomerMinorRecord, b: CustomerMinorRecord) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    [customer]
  );
  const activeMinorsCount = useMemo(() => {
    if (sortedMinors.length) {
      return sortedMinors.filter((minor) => Boolean(minor.is_active)).length;
    }
    return Number(customer?.active_minors_count ?? customer?.minors_count ?? 0);
  }, [customer, sortedMinors]);

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

      <div className="flex flex-wrap gap-x-7 gap-y-2">
        <TabNav action={() => setTab("overview")} isActive={tab === "overview"}>
          Overview
        </TabNav>
        <TabNav action={() => setTab("subscriptions")} isActive={tab === "subscriptions"}>
          Subscriptions
        </TabNav>
        <TabNav action={() => setTab("minors")} isActive={tab === "minors"}>
          Minors
        </TabNav>
        <TabNav action={() => setTab("invoices")} isActive={tab === "invoices"}>
          Invoices
        </TabNav>
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-10 gap-y-2">
          <p className="col-span-3 text-kk-dark-text-muted">Status</p>
          <div className="col-span-7">{statusBadge(Boolean(customer.is_active))}</div>

          <p className="col-span-3 text-kk-dark-text-muted">Phone</p>
          <p className="col-span-7">{customer.phone || "-"}</p>

          <p className="col-span-3 text-kk-dark-text-muted">Active Minors</p>
          <p className="col-span-7">{activeMinorsCount}</p>

          <p className="col-span-3 text-kk-dark-text-muted">Created</p>
          <p className="col-span-7">{toDateTime(customer.created_at)}</p>

          <p className="col-span-3 text-kk-dark-text-muted">Updated</p>
          <p className="col-span-7">{toDateTime(customer.updated_at)}</p>
        </div>
      )}

      {tab === "minors" && (
        <div className="flex flex-col gap-2">
          {sortedMinors.length ? (
            <table className="min-w-full">
              <thead>
                <tr>
                  <th>Minor</th>
                  <th>Date of Birth</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {sortedMinors.map((minor) => (
                  <tr key={minor.id}>
                    <td>{`${minor.first_name ?? ""} ${minor.last_name ?? ""}`.trim() || `Minor #${minor.id}`}</td>
                    <td>{toDate(minor.dob)}</td>
                    <td>{statusBadge(Boolean(minor.is_active))}</td>
                    <td>{toDateTime(minor.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-kk-dark-text-muted">No minors found for this customer.</p>
          )}
        </div>
      )}

      {tab === "subscriptions" && (
        <div className="flex flex-col gap-2">
          {sortedSubscriptions.length ? (
            <table className="min-w-full">
              <thead>
                <tr>
                  <th>Subscription</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Source Invoice</th>
                </tr>
              </thead>
              <tbody>
                {sortedSubscriptions.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button
                        type="button"
                        className="flex flex-col text-left hover:underline"
                        onClick={() => navigate(`/sales/subscriptions/${row.id}`)}
                      >
                        <span>{row.plan_name}</span>
                        <span className="text-xs text-kk-dark-text-muted">{row.plan_code}</span>
                      </button>
                    </td>
                    <td>{subscriptionStatusBadge(row.status)}</td>
                    <td>{toDateTime(row.started_at)}</td>
                    <td>
                      {row.source_invoice ? (
                        <button
                          type="button"
                          className="hover:underline"
                          onClick={() => navigate(`/sales/invoices/${row.source_invoice}`)}
                        >
                          {row.source_invoice_number || `#${row.source_invoice}`}
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-kk-dark-text-muted">No subscriptions found for this customer.</p>
          )}
        </div>
      )}

      {tab === "invoices" && (
        <div className="flex flex-col gap-2">
          {sortedInvoices.length ? (
            <table className="min-w-full">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedInvoices.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button
                        type="button"
                        className="flex flex-col text-left hover:underline"
                        onClick={() => navigate(`/sales/invoices/${row.id}`)}
                      >
                        <span>{row.prepaid_number || row.number}</span>
                        {row.prepaid_number ? (
                          <span className="text-xs text-kk-dark-text-muted">{row.number}</span>
                        ) : null}
                      </button>
                    </td>
                    <td>{row.type_id === "PREPAID" ? "Pre-Paid" : humanizeStatus(row.type_id, "-")}</td>
                    <td>{invoiceStatusBadge(row)}</td>
                    <td>{toDateTime(row.invoice_date)}</td>
                    <td>{formatMoneyNGN(Number(row.net_grand_total ?? row.grand_total ?? 0))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-kk-dark-text-muted">No invoices found for this customer.</p>
          )}
        </div>
      )}
    </div>
  );
};
