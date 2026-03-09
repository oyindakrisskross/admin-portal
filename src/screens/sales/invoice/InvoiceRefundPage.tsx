import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";
import { createInvoiceRefund, fetchInvoice, fetchInvoiceRefunds } from "../../../api/invoice";
import type { InvoiceItem, InvoiceResponse } from "../../../types/invoice";
import { formatMoneyNGN, toDateStr } from "../../../helpers";

type LineInput = { qty: string; amount: string };

function asNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function money2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function closeEnough(a: number, b: number, eps = 0.01) {
  return Math.abs(a - b) <= eps;
}

export default function InvoiceRefundPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const invoiceId = Number(id);

  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);
  const [refunds, setRefunds] = useState<InvoiceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [restock, setRestock] = useState(true);
  const [reason, setReason] = useState("");
  const [inputs, setInputs] = useState<Record<number, LineInput>>({});

  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" | "info" } | null>(null);

  const load = async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const inv = await fetchInvoice(invoiceId);
      const r = await fetchInvoiceRefunds(invoiceId);
      setInvoice(inv);
      setRefunds(r);
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to load invoice.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  const topLevelItems = useMemo(() => {
    const items = invoice?.items ?? [];
    return items.filter((ln) => ln.parent_line === null);
  }, [invoice?.items]);

  const refundedQtyByLineId = useMemo(() => {
    const map = new Map<number, number>();
    for (const ref of refunds) {
      for (const ln of ref.items ?? []) {
        const from = ln.refunded_from_line;
        if (!from) continue;
        const prev = map.get(from) ?? 0;
        map.set(from, prev + asNumber(ln.quantity));
      }
    }
    return map;
  }, [refunds]);

  const lines = useMemo(() => {
    return topLevelItems.map((ln) => {
      const purchasedQty = asNumber(ln.quantity);
      const refundedQty = refundedQtyByLineId.get(ln.id) ?? 0;
      const redeemedQty = invoice?.type_id === "PREPAID" ? asNumber(ln.redeemed_quantity) : 0;
      const remainingQty = Math.max(0, money2(purchasedQty - refundedQty - redeemedQty));

      const tax = asNumber(ln.tax_amount);
      const lineTotalInclTax = asNumber(ln.line_total);
      const baseTotal = money2(lineTotalInclTax - tax);
      const basePerUnit = purchasedQty > 0 ? money2(baseTotal / purchasedQty) : 0;
      const taxPerUnit = purchasedQty > 0 ? money2(tax / purchasedQty) : 0;

      const childDiscount = (ln.children ?? []).reduce((sum, c) => sum + asNumber(c.discount_amount), 0);
      const effectiveDiscount = money2(asNumber(ln.discount_amount) + childDiscount);

      const returnable = ln.item_returnable !== false;
      const eligible = returnable && effectiveDiscount <= 0 && remainingQty > 0;

      const availableBase = money2(basePerUnit * remainingQty);
      const availableTax = money2(taxPerUnit * remainingQty);
      const availableTotal = money2(availableBase + availableTax);

      const input = inputs[ln.id] ?? { qty: "", amount: "" };
      const rawQty = input.qty.trim() === "" ? 0 : asNumber(input.qty);
      const clampedQty = Math.max(0, Math.min(remainingQty, rawQty));

      const fullBaseForQty = money2(basePerUnit * clampedQty);
      const rawAmt = input.amount.trim() === "" ? 0 : asNumber(input.amount);
      const clampedAmt = Math.max(0, Math.min(fullBaseForQty, rawAmt));

      const taxRefund = clampedQty > 0 && closeEnough(clampedAmt, fullBaseForQty) ? money2(taxPerUnit * clampedQty) : 0;
      const refundTotal = money2(clampedAmt + taxRefund);

      return {
        ln,
        purchasedQty,
        refundedQty,
        redeemedQty,
        remainingQty,
        basePerUnit,
        taxPerUnit,
        baseTotal,
        tax,
        effectiveDiscount,
        eligible,
        availableTotal,
        input,
        clampedQty,
        clampedAmt,
        taxRefund,
        refundTotal,
        fullBaseForQty,
      };
    });
  }, [inputs, refundedQtyByLineId, topLevelItems]);

  const anyInventoryTracked = useMemo(
    () => lines.some((l) => l.eligible && l.ln.item_inventory_tracking),
    [lines]
  );

  const amountAlreadyRefunded = useMemo(() => {
    return money2(refunds.reduce((sum, r) => sum + asNumber(r.grand_total), 0));
  }, [refunds]);

  const totalAvailable = useMemo(() => {
    return money2(lines.reduce((sum, l) => sum + (l.eligible ? l.availableTotal : 0), 0));
  }, [lines]);

  const refundAmount = useMemo(() => { 
    return money2(lines.reduce((sum, l) => sum + l.refundTotal, 0)); 
  }, [lines]); 
 
  const nothingRefundable = useMemo(() => lines.every((l) => !l.eligible), [lines]); 
 
  const setQty = (lineId: number, nextQtyRaw: string, basePerUnit: number, remainingQty: number) => { 
    setInputs((prev) => { 
      const current = prev[lineId] ?? { qty: "", amount: "" }; 
      if (nextQtyRaw.trim() === "") { 
        return { ...prev, [lineId]: { qty: "", amount: "" } }; 
      } 
 
      const nextQtyNum = asNumber(nextQtyRaw); 
      const nextClampedQty = Math.max(0, Math.min(remainingQty, nextQtyNum)); 
      const nextFullBase = money2(basePerUnit * nextClampedQty); 
 
      const currentQtyNum = current.qty.trim() === "" ? 0 : asNumber(current.qty); 
      const currentClampedQty = Math.max(0, Math.min(remainingQty, currentQtyNum)); 
      const currentFullBase = money2(basePerUnit * currentClampedQty); 
      const currentAmt = current.amount.trim() === "" ? null : asNumber(current.amount); 
 
      let nextAmount = current.amount; 
      if (nextClampedQty <= 0) { 
        nextAmount = ""; 
      } else if (currentAmt === null || currentAmt === 0) { 
        nextAmount = nextFullBase > 0 ? String(nextFullBase) : ""; 
      } else if (closeEnough(currentAmt, currentFullBase)) { 
        // preserve “full refund” intent when qty changes 
        nextAmount = nextFullBase > 0 ? String(nextFullBase) : ""; 
      } else if (currentAmt > nextFullBase) { 
        // cap custom refund amount to the selected quantity 
        nextAmount = nextFullBase > 0 ? String(nextFullBase) : ""; 
      } 
 
      const next: LineInput = { qty: String(nextClampedQty), amount: nextAmount }; 
      return { ...prev, [lineId]: next }; 
    }); 
  }; 

  const onSubmit = async () => {
    if (!invoice) return;
    if (refundAmount <= 0) {
      setToast({ message: "Refund amount must be greater than 0.", variant: "error" });
      return;
    }
    if (refundAmount > totalAvailable + 0.01) {
      setToast({ message: "Refund amount exceeds total available.", variant: "error" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        restock: Boolean(restock && anyInventoryTracked),
        reason: reason.trim() ? reason.trim() : undefined,
        lines: lines
          .filter((l) => l.eligible && l.clampedQty > 0 && l.clampedAmt > 0)
          .map((l) => ({
            line_id: l.ln.id,
            refund_qty: String(l.clampedQty),
            refund_base_amount: String(l.clampedAmt),
          })),
      };

      const created = await createInvoiceRefund(invoice.id, payload);
      setToast({ message: `Refund created (${created.number}).`, variant: "success" });
      setInputs({});
      setReason("");
      await load();
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ||
        (Array.isArray(e?.response?.data?.lines) ? e.response.data.lines[0] : null) ||
        e?.message ||
        "Failed to create refund.";
      setToast({ message: String(msg), variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (!invoiceId) {
    return <div className="p-6 text-sm">Invalid invoice.</div>;
  }

  return (
    <div className="min-h-full">
      <ToastModal message={toast?.message ?? null} onClose={() => setToast(null)} variant={toast?.variant ?? "error"} />

      <ListPageHeader
        section="Sales"
        title={invoice ? `Refund ${invoice.number}` : "Refund Invoice"}
        subtitle={invoice ? `${toDateStr(invoice.invoice_date)} · ${invoice.location_name}` : undefined}
        right={
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-xs hover:bg-kk-dark-hover"
          >
            Back
          </button>
        }
      />

      <div className="p-6">
        {loading ? (
          <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 text-sm text-kk-dark-text-muted">
            Loading…
          </div>
        ) : null}

        {!loading && invoice ? (
          <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-kk-dark-text-muted">Item</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-kk-dark-text-muted">Price</th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-kk-dark-text-muted">Qty</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-kk-dark-text-muted">Total</th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-kk-dark-text-muted">VAT</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((row) => {
                    const ln = row.ln as InvoiceItem;
                    const disabled = !row.eligible;

                    const fullBaseForQty = money2(row.basePerUnit * row.clampedQty);
                    const showDiscounted = row.effectiveDiscount > 0;
                    const showNotReturnable = ln.item_returnable === false;
                    const noRemaining = row.remainingQty <= 0;

                    return (
                      <tr key={ln.id} className="border-t border-kk-dark-border/50">
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-col gap-1">
                            <div className="font-medium">{ln.item_name}</div>
                            {ln.item_sku ? (
                              <div className="text-xs text-kk-dark-text-muted">SKU: {ln.item_sku}</div>
                            ) : null}
                            {showDiscounted ? (
                              <div className="mt-1 inline-flex w-fit rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                                Discounted (not refundable)
                              </div>
                            ) : null}
                            {showNotReturnable ? (
                              <div className="mt-1 inline-flex w-fit rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                                Not returnable
                              </div>
                            ) : null}
                          {noRemaining ? (
                              <div className="mt-1 inline-flex w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                                Fully refunded
                              </div>
                            ) : null}
                            {row.refundTotal > 0 ? (
                              <div className="mt-2 text-xs text-kk-dark-text-muted">
                                Refund: <span className="font-medium text-kk-dark-text">{formatMoneyNGN(row.refundTotal)}</span>
                              </div>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-3 py-3 text-right align-top">
                          {formatMoneyNGN(row.basePerUnit)}
                        </td>

                        <td className="px-3 py-3 text-center align-top">
                          <div className="flex flex-col items-center gap-2">
                            <div className="text-xs text-kk-dark-text-muted">
                              × {row.remainingQty} / {row.purchasedQty}
                              {invoice?.type_id === "PREPAID" && row.redeemedQty > 0
                                ? ` (Redeemed: ${row.redeemedQty})`
                                : ""}
                            </div>
                            <input 
                              type="number" 
                              min={0} 
                              max={row.remainingQty} 
                              step="1" 
                              disabled={disabled} 
                              value={row.input.qty} 
                              onChange={(e) => { 
                                const nextQtyRaw = e.target.value; 
                                setQty(ln.id, nextQtyRaw, row.basePerUnit, row.remainingQty); 
                              }} 
                              className={[ 
                                "w-16 rounded-md border px-2 py-1 text-sm text-right outline-none", 
                                "border-kk-dark-input-border bg-kk-dark-bg", 
                                disabled ? "opacity-50 cursor-not-allowed" : "", 
                              ].join(" ")}
                            />
                          </div>
                        </td>

                        <td className="px-3 py-3 text-right align-top">
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-xs text-kk-dark-text-muted">
                              {formatMoneyNGN(row.baseTotal)}
                            </div>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              disabled={disabled || row.clampedQty <= 0}
                              value={row.input.amount}
                              onChange={(e) =>
                                setInputs((prev) => ({
                                  ...prev,
                                  [ln.id]: { qty: prev[ln.id]?.qty ?? "", amount: e.target.value },
                                }))
                              }
                              className={[
                                "w-28 rounded-md border px-2 py-1 text-sm text-right outline-none",
                                "border-kk-dark-input-border bg-kk-dark-bg",
                                disabled ? "opacity-50 cursor-not-allowed" : "",
                              ].join(" ")}
                            />
                          </div>
                        </td>

                        <td className="px-3 py-3 text-right align-top">
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-xs text-kk-dark-text-muted">{formatMoneyNGN(row.tax)}</div>
                            <div
                              className={[
                                "w-28 rounded-md border px-2 py-1 text-sm text-right",
                                "border-kk-dark-input-border bg-kk-dark-bg",
                                disabled ? "opacity-50" : "",
                              ].join(" ")}
                              title={row.clampedQty > 0 && !closeEnough(row.clampedAmt, fullBaseForQty) ? "VAT is refunded only for full refunds." : ""}
                            >
                              {formatMoneyNGN(row.taxRefund)}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!lines.length ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-10 text-center text-sm text-kk-dark-text-muted">
                        No items found on this invoice.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="border-t border-kk-dark-border/50 px-6 py-5">
              {nothingRefundable ? (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                  This invoice has no refundable line items. Discounted items cannot be refunded.
                </div>
              ) : null}

              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div className="flex flex-col gap-3"> 
                  {anyInventoryTracked ? ( 
                    <label className="flex items-center gap-2 text-sm"> 
                      <input 
                        type="checkbox" 
                        checked={restock} 
                        onChange={(e) => setRestock(e.target.checked)} 
                        className="h-4 w-4 rounded border border-kk-dark-input-border bg-kk-dark-bg" 
                      /> 
                      <span className="text-kk-dark-text-muted">Restock returned items</span> 
                    </label> 
                  ) : null} 
 
                  <div className="flex items-center gap-2 text-sm"> 
                    <label className="text-kk-dark-text-muted">Reason for refund (optional)</label> 
                    <input 
                      className="w-72 rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm outline-none"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason…"
                    />
                  </div>
                </div>

                <div className="w-full max-w-md">
                  <div className="flex justify-between text-sm">
                    <span className="text-kk-dark-text-muted">Amount already refunded:</span>
                    <span>-{formatMoneyNGN(amountAlreadyRefunded)}</span>
                  </div>
                  <div className="mt-1 flex justify-between text-sm">
                    <span className="text-kk-dark-text-muted">Total available to refund:</span>
                    <span className="font-semibold">{formatMoneyNGN(totalAvailable)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-kk-dark-text-muted">Refund amount:</span>
                    <div className="w-36 rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm text-right">
                      {formatMoneyNGN(refundAmount)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-4 py-2 text-sm hover:bg-kk-dark-hover"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={saving || refundAmount <= 0 || nothingRefundable}
                  onClick={onSubmit}
                  className="rounded-md bg-kk-accent px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  Refund {formatMoneyNGN(refundAmount)} manually
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
