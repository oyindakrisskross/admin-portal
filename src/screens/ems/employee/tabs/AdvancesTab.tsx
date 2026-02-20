import React, { useEffect, useState } from "react";

import { useAuth } from "../../../../auth/AuthContext";
import { approveAdvance, createAdvance, declineAdvance, fetchAdvances } from "../../../../api/ems";
import type { SalaryAdvance } from "../../../../types/ems";
import { ADVANCE_REPAYMENT_METHOD_CHOICES } from "../../../../types/ems";
import ToastModal from "../../../../components/ui/ToastModal";
import { money, statusLabel } from "../employeeUtils";

export const AdvancesTab: React.FC<{ employeeId: number }> = ({ employeeId }) => {
  const { can } = useAuth();
  const [rows, setRows] = useState<SalaryAdvance[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);

  const [form, setForm] = useState({
    request_date: "",
    amount: "",
    reason: "",
    repayment_method: "",
    repayment_period_months: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAdvances({ filters: { clauses: [{ field: "employee", operator: "=", value: employeeId }] } });
      setRows(data.results ?? []);
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to load advances.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [employeeId]);

  const handleCreate = async () => {
    if (!can("Employee", "create")) return;
    try {
      await createAdvance({
        employee: employeeId,
        request_date: form.request_date,
        amount: form.amount,
        reason: form.reason,
        repayment_method: form.repayment_method || null,
        repayment_period_months: form.repayment_period_months || null,
      } as any);
      setForm({ request_date: "", amount: "", reason: "", repayment_method: "", repayment_period_months: "" });
      await load();
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to create advance.", variant: "error" });
    }
  };

  const handleApprove = async (id: number) => {
    if (!can("Employee", "approve")) return;
    await approveAdvance(id);
    await load();
  };

  const handleDecline = async (id: number) => {
    if (!can("Employee", "approve")) return;
    if (!window.confirm("Decline this request?")) return;
    await declineAdvance(id);
    await load();
  };

  return (
    <div className="px-6 py-6 flex flex-col gap-6">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th>Date</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Reason</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.request_date}</td>
              <td>NGN {money(row.amount)}</td>
              <td>{statusLabel(row)}</td>
              <td>{row.reason || "-"}</td>
              <td className="text-right">
                {row.status_value === "REQUESTED" && can("Employee", "approve") && (
                  <div className="flex justify-end gap-2">
                    <button className="text-emerald-400" onClick={() => handleApprove(row.id!)}>Approve</button>
                    <button className="text-red-400" onClick={() => handleDecline(row.id!)}>Decline</button>
                  </div>
                )}
              </td>
            </tr>
          ))}
          {!loading && !rows.length && (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-center text-kk-dark-text-muted">No advances yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      {can("Employee", "create") && (
        <div className="grid grid-cols-12 gap-4 rounded-lg border border-kk-dark-border p-4 text-xs">
          <input type="date" className="col-span-2 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.request_date} onChange={(e) => setForm((prev) => ({ ...prev, request_date: e.target.value }))} />
          <input type="number" step="0.01" className="col-span-2 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.amount} onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))} placeholder="Amount" />
          <select className="col-span-3 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1" value={form.repayment_method} onChange={(e) => setForm((prev) => ({ ...prev, repayment_method: e.target.value }))}>
            <option value="">Repayment method</option>
            {ADVANCE_REPAYMENT_METHOD_CHOICES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input type="number" className="col-span-2 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.repayment_period_months} onChange={(e) => setForm((prev) => ({ ...prev, repayment_period_months: e.target.value }))} placeholder="Months" />
          <input type="text" className="col-span-3 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.reason} onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Reason" />
          <button type="button" className="col-span-2 inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1 text-xs text-white" onClick={handleCreate}>Request</button>
        </div>
      )}

      <ToastModal message={toast?.message ?? null} onClose={() => setToast(null)} variant={toast?.variant ?? "error"} />
    </div>
  );
};
