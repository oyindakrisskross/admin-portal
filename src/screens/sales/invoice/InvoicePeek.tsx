// src/screens/sales/invoice/InvoicePeek.tsx

import React from "react";

import { TabNav } from "../../../components/layout/TabNav";
import type { InvoiceItemChild, InvoiceResponse } from "../../../types/invoice";
import { formatMoneyNGN, humanizeStatus, toDateStr } from "../../../helpers";

interface Props {
  invoice: InvoiceResponse;
}

type InvoiceNoteRow = {
  id: string;
  timestamp: string;
  message: string;
};

const INVOICE_NOTE_PREFIX = /^\[(.+?)\]\s*(.*)$/;

const normalizeNoteTimestamp = (value: string) => {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed.replace(" ", "T");
  }
  return trimmed;
};

const formatNoteTimestamp = (value?: string | null) => {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "-";
  const normalized = normalizeNoteTimestamp(trimmed);
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return toDateStr(parsed.toISOString());
};

const parseInvoiceNotes = (notes: string, fallbackTimestamp?: string | null): InvoiceNoteRow[] =>
  notes
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(INVOICE_NOTE_PREFIX);
      if (match) {
        return {
          id: `note-${index}`,
          timestamp: match[1].trim(),
          message: match[2].trim() || "-",
        };
      }

      return {
        id: `note-${index}`,
        timestamp: String(fallbackTimestamp || "").trim(),
        message: line,
      };
    });

export const InvoicePeek: React.FC<Props> = ({ invoice }) => {
  const [tab, setTab] = React.useState<"overview" | "notes" | "payments">("overview");
  const topLevelItems = invoice.items.filter((ln) => ln.parent_line === null);
  const refundedTotal = Number(invoice.refunded_total ?? 0);
  const netTotal = Math.max(0, Number(invoice.net_grand_total ?? invoice.grand_total ?? 0));
  const paymentHistory = [...(invoice.payments || [])].sort(
    (a, b) => new Date(b.paid_on).getTime() - new Date(a.paid_on).getTime()
  );
  const invoiceNotes = String(invoice.notes || "").trim();
  const invoiceNoteRows = React.useMemo(
    () => parseInvoiceNotes(invoiceNotes, invoice.invoice_date),
    [invoice.invoice_date, invoiceNotes]
  );
  const assignedCustomerName = String(
    invoice.portal_customer_name || invoice.customer_name || ""
  ).trim();
  const assignedCustomerRef =
    invoice.portal_customer != null
      ? `#${invoice.portal_customer}`
      : invoice.customer != null
        ? `#${invoice.customer}`
        : "";
  const assignedCustomerLabel =
    assignedCustomerName || (assignedCustomerRef ? `Customer ${assignedCustomerRef}` : "");
  const appliedCouponCodes = (invoice.coupon_codes && invoice.coupon_codes.length
    ? invoice.coupon_codes
    : invoice.coupon_code
      ? [invoice.coupon_code]
      : []
  ).filter(Boolean);
  const paymentMethodClass = (method?: string) => {
    const value = String(method || "").toUpperCase();
    if (value === "CASH") return "bg-emerald-50 text-emerald-700";
    if (value === "CARD") return "bg-blue-50 text-blue-700";
    if (value === "TRANSFER") return "bg-purple-50 text-purple-700";
    return "bg-slate-100 text-slate-600";
  };

  React.useEffect(() => {
    setTab("overview");
  }, [invoice.id]);

  return (
    <div className="flex h-full flex-col gap-7 p-5 pb-7">
      <div className="flex flex-col items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold">
            {invoice.number}
          </h2>
          <p className="text-sm">
            {toDateStr(invoice.invoice_date)}
          </p>
        </div>

        <div className="flex flex-wrap gap-x-7 gap-y-2">
          <TabNav action={() => setTab("overview")} isActive={tab === "overview"}>
            Overview
          </TabNav>
          <TabNav action={() => setTab("notes")} isActive={tab === "notes"}>
            Notes
          </TabNav>
          <TabNav action={() => setTab("payments")} isActive={tab === "payments"}>
            Payment History
          </TabNav>
        </div>

        <div className="mt-4 w-full">
          {tab === "overview" ? (
            <div className="space-y-6">
              <div className="w-full max-w-sm space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <p className="text-kk-dark-text-muted">Sale Location</p>
                  <p>{invoice.location_name}</p>
                </div>
                {assignedCustomerLabel ? (
                  <div className="grid grid-cols-2 gap-2">
                    <p className="text-kk-dark-text-muted">Customer</p>
                    <p>{assignedCustomerLabel}</p>
                  </div>
                ) : null}
              </div>

              <section className="space-y-4">
                <div className="w-full overflow-x-auto px-1">
                  <table className="w-full table-auto text-sm">
                    <thead>
                      <tr className="border-b border-kk-dark-border/70 text-left text-kk-dark-text-muted">
                        <th className="py-2 pr-6 font-medium">Item Details</th>
                        <th className="py-2 pr-5 font-medium whitespace-nowrap">Quantity</th>
                        <th className="py-2 pr-5 font-medium whitespace-nowrap">Rate</th>
                        <th className="py-2 pr-5 font-medium whitespace-nowrap">Discount</th>
                        <th className="py-2 pr-5 font-medium whitespace-nowrap">Tax</th>
                        <th className="py-2 text-right font-medium whitespace-nowrap">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topLevelItems.map((i) => (
                        <tr key={i.id} className="border-b border-kk-dark-border/50 last:border-b-0">
                          <td className="py-2.5 pr-6 align-top">
                            <div className="flex flex-col gap-1">
                              <span>{i.item_name}</span>
                              {i.children &&
                                i.children.map((child: InvoiceItemChild) => (
                                  <span key={child.id}>
                                    - {" "}
                                    {child.customization_label
                                      ? child.customization_label
                                      : child.item_name}
                                  </span>
                                ))}
                            </div>
                          </td>
                          <td className="py-2.5 pr-5 align-top whitespace-nowrap">{i.quantity}</td>
                          <td className="py-2.5 pr-5 align-top whitespace-nowrap">{formatMoneyNGN(+i.unit_price)}</td>
                          <td className="py-2.5 pr-5 align-top whitespace-nowrap">
                            {formatMoneyNGN(
                              (+i.discount_amount || 0) +
                                (i.children?.reduce(
                                  (sum, c) => sum + (+c.discount_amount || 0),
                                  0
                                ) ?? 0)
                            )}
                          </td>
                          <td className="py-2.5 pr-5 align-top whitespace-nowrap">
                            {formatMoneyNGN(
                              (+i.tax_amount || 0) +
                                (i.children?.reduce(
                                  (sum, c) => sum + (+c.tax_amount || 0),
                                  0
                                ) ?? 0)
                            )}
                          </td>
                          <td className="py-2.5 text-right align-top whitespace-nowrap">{formatMoneyNGN(+i.line_total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex w-full justify-end px-1">
                  <div className="flex w-full max-w-xs flex-col gap-1">
                    <div className="flex justify-between">
                      <p>Subtotal</p>
                      <p>{formatMoneyNGN(+invoice.subtotal)}</p>
                    </div>
                    <div className="flex justify-between">
                      <p>Discount</p>
                      <p>{formatMoneyNGN(+invoice.discount_total)}</p>
                    </div>
                    {appliedCouponCodes.length > 0 && +invoice.discount_total > 0 && (
                      <div className="flex justify-between text-xs text-kk-dark-text-muted">
                        <p>Code{appliedCouponCodes.length > 1 ? "s" : ""}</p>
                        <p>{appliedCouponCodes.join(", ")}</p>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <p>VAT (7.5%)</p>
                      <p>{formatMoneyNGN(+invoice.tax_total)}</p>
                    </div>
                    {invoice.type_id === "SALE" && refundedTotal > 0.01 && (
                      <div className="flex justify-between text-red-500">
                        <p>Refunded</p>
                        <p>-{formatMoneyNGN(refundedTotal)}</p>
                      </div>
                    )}
                    <div className="flex justify-between items-end pt-1">
                      <p className="text-xl">Total</p>
                      {invoice.type_id === "SALE" && refundedTotal > 0.01 ? (
                        <div className="flex flex-col items-end leading-tight">
                          <span className="text-xs text-kk-dark-text-muted line-through">
                            {formatMoneyNGN(+invoice.grand_total)}
                          </span>
                          <span className="text-lg font-semibold text-red-500">
                            {formatMoneyNGN(netTotal)}
                          </span>
                        </div>
                      ) : (
                        <p>{formatMoneyNGN(+invoice.grand_total)}</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          ) : null}

          {tab === "notes" ? (
            <section className="space-y-3 rounded-xl border border-kk-dark-border bg-kk-dark-bg px-4 py-4">
              <div>
                <h3 className="text-sm font-semibold">Invoice Notes</h3>
                <p className="text-xs text-kk-dark-text-muted">
                  Audit notes and manual remarks recorded against this invoice.
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-kk-dark-input-border">
                <table className="min-w-full table-auto text-left text-sm">
                  <thead className="bg-kk-dark-bg-elevated text-[11px] uppercase tracking-wide text-kk-dark-text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium whitespace-nowrap">Recorded On</th>
                      <th className="px-3 py-2 font-medium">Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceNoteRows.map((note) => (
                      <tr key={note.id} className="border-t border-kk-dark-input-border">
                        <td className="px-3 py-2 align-top whitespace-nowrap text-kk-dark-text-muted">
                          {formatNoteTimestamp(note.timestamp)}
                        </td>
                        <td className="px-3 py-2 align-top whitespace-pre-wrap text-kk-dark-text">
                          {note.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!invoiceNoteRows.length ? (
                <div className="rounded-lg border border-dashed border-kk-dark-input-border px-3 py-4 text-sm text-kk-dark-text-muted">
                  No invoice notes have been recorded yet.
                </div>
              ) : null}
            </section>
          ) : null}

          {tab === "payments" ? (
            <section className="space-y-3 rounded-xl border border-kk-dark-border bg-kk-dark-bg px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold">Payment History</h3>
                  <p className="text-xs text-kk-dark-text-muted">
                    Every payment or refund adjustment recorded against this invoice.
                  </p>
                </div>
                <span className="text-xs text-kk-dark-text-muted">{paymentHistory.length} payment(s)</span>
              </div>

              {paymentHistory.length ? (
                <div className="overflow-x-auto rounded-lg border border-kk-dark-input-border">
                  <table className="min-w-full table-auto text-left text-sm">
                    <thead className="bg-kk-dark-bg-elevated text-[11px] uppercase tracking-wide text-kk-dark-text-muted">
                      <tr>
                        <th className="px-3 py-2 font-medium">Recorded On</th>
                        <th className="px-3 py-2 font-medium">Recorded By</th>
                        <th className="px-3 py-2 font-medium">Method</th>
                        <th className="px-3 py-2 font-medium">Reference</th>
                        <th className="px-3 py-2 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentHistory.map((payment) => (
                        <tr key={payment.id} className="border-t border-kk-dark-input-border">
                          <td className="px-3 py-2">{payment.paid_on ? toDateStr(payment.paid_on) : "-"}</td>
                          <td className="px-3 py-2">{payment.received_by_name || "-"}</td>
                          <td className="px-3 py-2">
                            <span
                              className={[
                                "inline-flex rounded-md px-2 py-1 text-[11px] font-medium",
                                paymentMethodClass(payment.method),
                              ].join(" ")}
                            >
                              {humanizeStatus(payment.method)}
                            </span>
                          </td>
                          <td className="px-3 py-2">{payment.reference || "-"}</td>
                          <td className="px-3 py-2 text-right font-medium">
                            {formatMoneyNGN(+payment.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-kk-dark-input-border px-3 py-4 text-sm text-kk-dark-text-muted">
                  No payments have been recorded on this invoice yet.
                </div>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
