// src/screens/sales/invoice/InvoicePeek.tsx

import React from "react";

import type { InvoiceItemChild, InvoiceResponse } from "../../../types/invoice";
import { formatMoneyNGN, toDateStr } from "../../../helpers";

interface Props {
  invoice: InvoiceResponse;
}

export const InvoicePeek: React.FC<Props> = ({ invoice }) => {
  const topLevelItems = invoice.items.filter((ln) => ln.parent_line === null);

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

        <div className="w-1/3 flex flex-col gap-y-2">
          <div className="grid grid-cols-2 gap-2">
            <p className="text-kk-dark-text-muted">Sale Location</p>
            <p>{invoice.location_name}</p>
          </div>
        </div>

        {/* Items */}
        <div className="my-3 min-w-full">
          <table className="min-w-full min-h-full table-auto">
            <thead>
              <tr>
                <th>Item Details</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Discount</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {topLevelItems.map((i) => (
                <tr key={i.id}>
                  <td>
                    <div className="flex flex-col">
                      <span>{i.item_name}</span>
                      {i.children && 
                        i.children.map((child: InvoiceItemChild) => (
                          <span>
                            - {" "}
                            {child.customization_label
                              ? child.customization_label
                              : child.item_name}
                          </span>
                        ))}
                    </div>
                  </td>
                  <td>{i.quantity}</td>
                  <td>{formatMoneyNGN(+i.unit_price)}</td>
                  <td>{formatMoneyNGN(+i.discount_amount)}</td>
                  <td className="text-right">{formatMoneyNGN(+i.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="w-full flex justify-end mr-10">
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
                <p className="text-xl">Total</p>
                <p>{formatMoneyNGN(+invoice.grand_total)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}