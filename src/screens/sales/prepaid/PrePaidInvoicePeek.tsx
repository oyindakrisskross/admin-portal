import React, { useState } from "react";
import ToastModal from "../../../components/ui/ToastModal";
import { resendPrepaidPassEmail } from "../../../api/invoice";
import type { InvoiceResponse } from "../../../types/invoice";
import { formatMoneyNGN, getPrepaidDisplayStatus, humanizeStatus, toDateStr } from "../../../helpers";

interface Props {
  invoice: InvoiceResponse;
}

const lineStatusClass = (status?: string) => {
  const value = String(status || "").toUpperCase();
  if (value === "REDEEMED") return "bg-emerald-50 text-emerald-700";
  if (value === "PARTIALLY_REDEEMED") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-600";
};

const invoiceStatusClass = (status?: string) => {
  const value = String(status || "").toUpperCase();
  if (value === "REDEEMED") return "bg-emerald-50 text-emerald-700";
  if (value === "UNUSED") return "bg-blue-50 text-blue-700";
  if (value === "PARTIALLY_PAID" || value === "PARTIALLY_REDEEMED") return "bg-amber-50 text-amber-700";
  if (value === "UNPAID") return "bg-slate-100 text-slate-600";
  return "bg-slate-100 text-slate-600";
};

const paymentMethodClass = (method?: string) => {
  const value = String(method || "").toUpperCase();
  if (value === "CASH") return "bg-emerald-50 text-emerald-700";
  if (value === "CARD") return "bg-blue-50 text-blue-700";
  if (value === "TRANSFER") return "bg-purple-50 text-purple-700";
  return "bg-slate-100 text-slate-600";
};

const formatStatus = (status?: string, fallback = "") => humanizeStatus(status, fallback);

export const PrePaidInvoicePeek: React.FC<Props> = ({ invoice }) => {
  const [sendingEmail, setSendingEmail] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("info");
  const topLevelItems = invoice.items.filter((ln) => ln.parent_line === null);
  const displayStatus = getPrepaidDisplayStatus(invoice);
  const paymentHistory = [...(invoice.payments || [])].sort(
    (a, b) => new Date(b.paid_on).getTime() - new Date(a.paid_on).getTime()
  );

  const canSendEmail = Boolean(invoice.portal_customer || invoice.customer);

  const handleSendEmail = async () => {
    setSendingEmail(true);
    try {
      const result = await resendPrepaidPassEmail(invoice.id);
      setToastVariant("success");
      setToastMessage(result.detail || "Pre-paid QR email sent.");
    } catch (err: any) {
      setToastVariant("error");
      setToastMessage(err?.response?.data?.detail || "Failed to send pre-paid QR email.");
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-7 p-5 pb-7">
      <div className="flex flex-col items-start justify-between gap-3">
        <div className="flex w-full items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-semibold">{invoice.number}</h2>
            <p className="text-sm">{toDateStr(invoice.invoice_date)}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleSendEmail()}
            disabled={sendingEmail || !canSendEmail}
            className="rounded-full border border-kk-dark-input-border px-4 py-2 text-xs font-medium hover:bg-kk-dark-hover disabled:opacity-60"
          >
            {sendingEmail ? "Sending..." : "Send Email"}
          </button>
        </div>

        <div className="grid w-full grid-cols-3 gap-2 text-sm">
          <p className="text-kk-dark-text-muted">Pre-Paid Number</p>
          <p className="col-span-2 font-medium">{invoice.prepaid_number || "-"}</p>

          <p className="text-kk-dark-text-muted">Location</p>
          <p className="col-span-2">{invoice.location_name}</p>

          <p className="text-kk-dark-text-muted">Assigned Customer</p>
          <p className="col-span-2">{invoice.portal_customer_name || "-"}</p>

          <p className="text-kk-dark-text-muted">Status</p>
          <p className="col-span-2">
            <span
              className={[
                "inline-flex rounded-md px-2 py-1 text-[11px] font-medium",
                invoiceStatusClass(displayStatus),
              ].join(" ")}
            >
              {formatStatus(displayStatus)}
            </span>
          </p>

          <p className="text-kk-dark-text-muted">Redeem Flag</p>
          <p className="col-span-2">
            <span
              className={[
                "inline-flex rounded-md px-2 py-1 text-[11px] font-medium",
                invoiceStatusClass(invoice.prepaid_redeem_status),
              ].join(" ")}
            >
              {formatStatus(invoice.prepaid_redeem_status, "UNUSED")}
            </span>
          </p>

          <p className="text-kk-dark-text-muted">Grand Total</p>
          <p className="col-span-2 font-medium">{formatMoneyNGN(+invoice.grand_total)}</p>

          <p className="text-kk-dark-text-muted">Amount Paid</p>
          <p className="col-span-2 font-medium">{formatMoneyNGN(+invoice.amount_paid)}</p>

          <p className="text-kk-dark-text-muted">Balance Due</p>
          <p className="col-span-2 font-medium">{formatMoneyNGN(+invoice.balance_due)}</p>

          <p className="text-kk-dark-text-muted">Last Redeemed</p>
          <p className="col-span-2">
            {invoice.last_redeemed_at ? toDateStr(invoice.last_redeemed_at) : "-"}
          </p>

          <p className="text-kk-dark-text-muted">Fully Redeemed On</p>
          <p className="col-span-2">
            {invoice.fully_redeemed_at ? toDateStr(invoice.fully_redeemed_at) : "-"}
          </p>
        </div>

        <div className="my-3 min-w-full space-y-6">
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                <th>Item Details</th>
                <th>Quantity</th>
                <th>Redeemed</th>
                <th>Flag</th>
                <th>Redeemed At</th>
                <th>Redeemed Location</th>
                <th>Rate</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {topLevelItems.map((line) => (
                <tr key={line.id}>
                  <td>{line.item_name}</td>
                  <td>{line.quantity}</td>
                  <td>{line.redeemed_quantity ?? "0.00"}</td>
                  <td>
                    <span
                      className={[
                        "inline-flex rounded-md px-2 py-1 text-[11px] font-medium",
                        lineStatusClass(line.redeem_status),
                      ].join(" ")}
                    >
                      {formatStatus(line.redeem_status, "UNUSED")}
                    </span>
                  </td>
                  <td>{line.last_redeemed_at ? toDateStr(line.last_redeemed_at) : "-"}</td>
                  <td>{line.last_redeemed_location_name || "-"}</td>
                  <td>{formatMoneyNGN(+line.unit_price)}</td>
                  <td className="text-right">{formatMoneyNGN(+line.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mr-10 flex w-full justify-end">
            <div className="flex w-1/3 flex-col">
              <div className="flex justify-between">
                <p>Subtotal</p>
                <p>{formatMoneyNGN(+invoice.subtotal)}</p>
              </div>
              <div className="flex justify-between">
                <p>Discount</p>
                <p>{formatMoneyNGN(+invoice.discount_total)}</p>
              </div>
              <div className="flex justify-between">
                <p>VAT (7.5%)</p>
                <p>{formatMoneyNGN(+invoice.tax_total)}</p>
              </div>
              <div className="flex justify-between">
                <p>Amount Paid</p>
                <p>{formatMoneyNGN(+invoice.amount_paid)}</p>
              </div>
              <div className="flex justify-between">
                <p>Balance Due</p>
                <p>{formatMoneyNGN(+invoice.balance_due)}</p>
              </div>
              <div className="flex justify-between items-end">
                <p className="text-xl">Grand Total</p>
                <p>{formatMoneyNGN(+invoice.grand_total)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-kk-dark-border bg-kk-dark-bg px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Payment History</h3>
                <p className="text-xs text-kk-dark-text-muted">
                  Every installment recorded against this pre-paid invoice.
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
                            {formatStatus(payment.method)}
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
          </div>
        </div>
      </div>
      <ToastModal message={toastMessage} variant={toastVariant} onClose={() => setToastMessage(null)} />
    </div>
  );
};
