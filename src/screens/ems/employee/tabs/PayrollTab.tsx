import React, { useEffect, useState } from "react";

import { useAuth } from "../../../../auth/AuthContext";
import { createPayment, fetchPayments } from "../../../../api/ems";
import type { SalaryPayment } from "../../../../types/ems";
import ToastModal from "../../../../components/ui/ToastModal";
import { money } from "../employeeUtils";

export const PayrollTab: React.FC<{ employeeId: number }> = ({ employeeId }) => {
  const { can } = useAuth();
  const [rows, setRows] = useState<SalaryPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);

  const [form, setForm] = useState({
    pay_period_start: "",
    pay_period_end: "",
    gross_amt: "",
    deductions_amt: "",
    net_amt: "",
    paid_on: "",
    reference: "",
    note: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchPayments({ filters: { clauses: [{ field: "employee", operator: "=", value: employeeId }] } });
      setRows(data.results ?? []);
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to load payroll.", variant: "error" });
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
      await createPayment({
        employee: employeeId,
        pay_period_start: form.pay_period_start,
        pay_period_end: form.pay_period_end,
        gross_amt: form.gross_amt,
        deductions_amt: form.deductions_amt || 0,
        net_amt: form.net_amt,
        paid_on: form.paid_on,
        reference: form.reference,
        note: form.note,
      } as any);
      setForm({ pay_period_start: "", pay_period_end: "", gross_amt: "", deductions_amt: "", net_amt: "", paid_on: "", reference: "", note: "" });
      await load();
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to save payment.", variant: "error" });
    }
  };

  return (
    <div className="px-6 py-6 flex flex-col gap-6">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th>Period</th>
            <th>Gross</th>
            <th>Deductions</th>
            <th>Net</th>
            <th>Paid On</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.pay_period_start} to {row.pay_period_end}</td>
              <td>NGN {money(row.gross_amt)}</td>
              <td>NGN {money(row.deductions_amt)}</td>
              <td>NGN {money(row.net_amt)}</td>
              <td>{row.paid_on}</td>
            </tr>
          ))}
          {!loading && !rows.length && (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-center text-kk-dark-text-muted">No payments yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      {can("Employee", "create") && (
        <div className="grid grid-cols-12 gap-4 rounded-lg border border-kk-dark-border p-4 text-xs">
          <input type="date" className="col-span-2 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.pay_period_start} onChange={(e) => setForm((prev) => ({ ...prev, pay_period_start: e.target.value }))} />
          <input type="date" className="col-span-2 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.pay_period_end} onChange={(e) => setForm((prev) => ({ ...prev, pay_period_end: e.target.value }))} />
          <input type="number" step="0.01" className="col-span-2 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.gross_amt} onChange={(e) => setForm((prev) => ({ ...prev, gross_amt: e.target.value }))} placeholder="Gross" />
          <input type="number" step="0.01" className="col-span-2 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.deductions_amt} onChange={(e) => setForm((prev) => ({ ...prev, deductions_amt: e.target.value }))} placeholder="Deductions" />
          <input type="number" step="0.01" className="col-span-2 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.net_amt} onChange={(e) => setForm((prev) => ({ ...prev, net_amt: e.target.value }))} placeholder="Net" />
          <input type="date" className="col-span-2 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.paid_on} onChange={(e) => setForm((prev) => ({ ...prev, paid_on: e.target.value }))} />
          <input type="text" className="col-span-3 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.reference} onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))} placeholder="Reference" />
          <input type="text" className="col-span-5 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.note} onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))} placeholder="Note" />
          <button type="button" className="col-span-2 inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1 text-xs text-white" onClick={handleCreate}>Add Payment</button>
        </div>
      )}

      <ToastModal message={toast?.message ?? null} onClose={() => setToast(null)} variant={toast?.variant ?? "error"} />
    </div>
  );
};
