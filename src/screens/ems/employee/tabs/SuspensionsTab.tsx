import React, { useEffect, useState } from "react";

import { useAuth } from "../../../../auth/AuthContext";
import { approveSuspension, createSuspension, fetchSuspensions, revokeSuspension } from "../../../../api/ems";
import type { EmployeeSuspension } from "../../../../types/ems";
import ToastModal from "../../../../components/ui/ToastModal";
import { statusLabel } from "../employeeUtils";

export const SuspensionsTab: React.FC<{ employeeId: number }> = ({ employeeId }) => {
  const { can } = useAuth();
  const [rows, setRows] = useState<EmployeeSuspension[]>([]);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);

  const [form, setForm] = useState({
    start_date: "",
    end_date: "",
    reason: "",
  });

  const load = async () => {
    try {
      const data = await fetchSuspensions(employeeId);
      setRows(data.results ?? []);
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to load suspensions.", variant: "error" });
    }
  };

  useEffect(() => {
    void load();
  }, [employeeId]);

  const handleCreate = async () => {
    if (!can("Employee", "create")) return;
    try {
      await createSuspension({ employee: employeeId, start_date: form.start_date, end_date: form.end_date, reason: form.reason } as any);
      setForm({ start_date: "", end_date: "", reason: "" });
      await load();
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to create suspension.", variant: "error" });
    }
  };

  const handleApprove = async (id: number) => {
    if (!can("Employee", "approve")) return;
    await approveSuspension(id);
    await load();
  };

  const handleRevoke = async (id: number) => {
    if (!can("Employee", "approve")) return;
    if (!window.confirm("Revoke this suspension?")) return;
    await revokeSuspension(id);
    await load();
  };

  return (
    <div className="px-6 py-6 flex flex-col gap-6">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th>Dates</th>
            <th>Status</th>
            <th>Reason</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.start_date} to {row.end_date}</td>
              <td>{statusLabel(row)}</td>
              <td>{row.reason || "-"}</td>
              <td className="text-right">
                {row.approved_by == null && can("Employee", "approve") && (
                  <button className="text-emerald-400" onClick={() => handleApprove(row.id!)}>Approve</button>
                )}
                {row.status_value === "ACTIVE" && can("Employee", "approve") && (
                  <button className="ml-2 text-red-400" onClick={() => handleRevoke(row.id!)}>Revoke</button>
                )}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={4} className="px-3 py-6 text-center text-kk-dark-text-muted">No suspensions.</td>
            </tr>
          )}
        </tbody>
      </table>

      {can("Employee", "create") && (
        <div className="grid grid-cols-12 gap-4 rounded-lg border border-kk-dark-border p-4 text-xs">
          <input type="date" className="col-span-2 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.start_date} onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))} />
          <input type="date" className="col-span-2 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.end_date} onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))} />
          <input type="text" className="col-span-6 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.reason} onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Reason" />
          <button type="button" className="col-span-2 inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1 text-xs text-white" onClick={handleCreate}>Suspend</button>
        </div>
      )}

      <ToastModal message={toast?.message ?? null} onClose={() => setToast(null)} variant={toast?.variant ?? "error"} />
    </div>
  );
};
