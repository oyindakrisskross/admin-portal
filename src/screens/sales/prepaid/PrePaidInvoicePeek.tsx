import React from "react";
import type { InvoiceResponse } from "../../../types/invoice";
import { formatMoneyNGN, toDateStr } from "../../../helpers";

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
  if (value === "PARTIALLY_REDEEMED") return "bg-amber-50 text-amber-700";
  return "bg-blue-50 text-blue-700";
};

const titleCaseRedeem = (status?: string) =>
  String(status || "UNUSED")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (s) => s.toUpperCase());

export const PrePaidInvoicePeek: React.FC<Props> = ({ invoice }) => {
  const topLevelItems = invoice.items.filter((ln) => ln.parent_line === null);

  return (
    <div className="flex h-full flex-col gap-7 p-5 pb-7">
      <div className="flex flex-col items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold">{invoice.number}</h2>
          <p className="text-sm">{toDateStr(invoice.invoice_date)}</p>
        </div>

        <div className="w-full grid grid-cols-3 gap-2 text-sm">
          <p className="text-kk-dark-text-muted">Pre-Paid Number</p>
          <p className="col-span-2 font-medium">{invoice.prepaid_number || "-"}</p>

          <p className="text-kk-dark-text-muted">Location</p>
          <p className="col-span-2">{invoice.location_name}</p>

          <p className="text-kk-dark-text-muted">Assigned Customer</p>
          <p className="col-span-2">{invoice.portal_customer_name || "-"}</p>

          <p className="text-kk-dark-text-muted">Redeem Flag</p>
          <p className="col-span-2">
            <span
              className={[
                "inline-flex rounded-md px-2 py-1 text-[11px] font-medium",
                invoiceStatusClass(invoice.prepaid_redeem_status),
              ].join(" ")}
            >
              {titleCaseRedeem(invoice.prepaid_redeem_status)}
            </span>
          </p>

          <p className="text-kk-dark-text-muted">Last Redeemed</p>
          <p className="col-span-2">
            {invoice.last_redeemed_at ? toDateStr(invoice.last_redeemed_at) : "-"}
          </p>

          <p className="text-kk-dark-text-muted">Fully Redeemed On</p>
          <p className="col-span-2">
            {invoice.fully_redeemed_at ? toDateStr(invoice.fully_redeemed_at) : "-"}
          </p>
        </div>

        <div className="my-3 min-w-full">
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
                      {titleCaseRedeem(line.redeem_status)}
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

          <div className="w-full flex justify-end mr-10 mt-3">
            <div className="flex flex-col w-1/3">
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
              <div className="flex justify-between items-end">
                <p className="text-xl">Paid Total</p>
                <p>{formatMoneyNGN(+invoice.grand_total)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
