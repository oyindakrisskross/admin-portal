import React, { useEffect, useState } from "react";

import { useAuth } from "../../../../auth/AuthContext";
import { adjustWallet, fetchWallet } from "../../../../api/ems";
import type { Wallet, WalletTransaction } from "../../../../types/ems";
import { WALLET_TXN_SOURCE_CHOICES, WALLET_TXN_TYPE_CHOICES } from "../../../../types/ems";
import type { Location } from "../../../../types/location";
import ToastModal from "../../../../components/ui/ToastModal";
import { formatDateTime, money } from "../employeeUtils";

export const WalletTab: React.FC<{ employeeId: number; locations: Location[] }> = ({ employeeId, locations }) => {
  const { can } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);

  const [form, setForm] = useState({
    amount: "",
    txn_type: "CREDIT",
    source_type: "MANUAL",
    location_id: "",
    reference: "",
    note: "",
  });

  const load = async () => {
    try {
      const data = await fetchWallet(employeeId);
      setWallet(data.wallet);
      setTransactions(data.transactions ?? []);
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to load wallet.", variant: "error" });
    }
  };

  useEffect(() => {
    void load();
  }, [employeeId]);

  const handleAdjust = async () => {
    if (!can("Employee", "edit")) return;
    try {
      await adjustWallet({
        employee_id: employeeId,
        amount: form.amount,
        txn_type: form.txn_type as any,
        source_type: form.source_type as any,
        location_id: form.location_id ? Number(form.location_id) : null,
        reference: form.reference,
        note: form.note,
      });
      setForm({ amount: "", txn_type: "CREDIT", source_type: "MANUAL", location_id: "", reference: "", note: "" });
      await load();
      setToast({ message: "Wallet adjusted.", variant: "success" });
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to adjust wallet.", variant: "error" });
    }
  };

  return (
    <div className="px-6 py-6 flex flex-col gap-6">
      <div className="text-sm">
        <span className="text-kk-dark-text-muted">Balance:</span> <span className="font-semibold">NGN {money(wallet?.balance)}</span>
      </div>

      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Source</th>
            <th>Amount</th>
            <th>Note</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((row) => (
            <tr key={row.id}>
              <td>{formatDateTime(row.created_at)}</td>
              <td>{row.txn_type_name || row.txn_type_value || row.txn_type}</td>
              <td>{row.source_type_name || row.source_type_value || row.source_type}</td>
              <td>NGN {money(row.amount)}</td>
              <td>{row.note || row.reference || "-"}</td>
            </tr>
          ))}
          {!transactions.length && (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-center text-kk-dark-text-muted">No wallet transactions.</td>
            </tr>
          )}
        </tbody>
      </table>

      {can("Employee", "edit") && (
        <div className="grid grid-cols-12 gap-4 rounded-lg border border-kk-dark-border p-4 text-xs">
          <input type="number" step="0.01" className="col-span-2 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} placeholder="Amount" />
          <select className="col-span-2 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1" value={form.txn_type} onChange={(e) => setForm((prev) => ({ ...prev, txn_type: e.target.value }))}>
            {WALLET_TXN_TYPE_CHOICES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select className="col-span-2 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1" value={form.source_type} onChange={(e) => setForm((prev) => ({ ...prev, source_type: e.target.value }))}>
            {WALLET_TXN_SOURCE_CHOICES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select className="col-span-3 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1" value={form.location_id} onChange={(e) => setForm((prev) => ({ ...prev, location_id: e.target.value }))}>
            <option value="">Location (optional)</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          <input type="text" className="col-span-3 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.reference} onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))} placeholder="Reference" />
          <input type="text" className="col-span-6 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Note" />
          <button type="button" className="col-span-2 inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1 text-xs text-white" onClick={handleAdjust}>Adjust</button>
        </div>
      )}

      <ToastModal message={toast?.message ?? null} onClose={() => setToast(null)} variant={toast?.variant ?? "error"} />
    </div>
  );
};
