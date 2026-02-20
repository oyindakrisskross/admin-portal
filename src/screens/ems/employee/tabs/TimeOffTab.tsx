import React, { useEffect, useState } from "react";

import { useAuth } from "../../../../auth/AuthContext";
import { approveTimeOff, cancelTimeOff, createTimeOff, declineTimeOff, fetchTimeOff } from "../../../../api/ems";
import type { TimeOffRequest } from "../../../../types/ems";
import { TIME_OFF_TYPE_CHOICES } from "../../../../types/ems";
import ToastModal from "../../../../components/ui/ToastModal";
import { statusLabel } from "../employeeUtils";

export const TimeOffTab: React.FC<{ employeeId: number }> = ({ employeeId }) => {
  const { can } = useAuth();
  const [rows, setRows] = useState<TimeOffRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);

  const [form, setForm] = useState({
    type: "PTO",
    start_date: "",
    end_date: "",
    partial_day: false,
    hours: "",
    reason: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchTimeOff({ filters: { clauses: [{ field: "employee", operator: "=", value: employeeId }] } });
      setRows(data.results ?? []);
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to load time off.", variant: "error" });
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
      await createTimeOff({
        employee: employeeId,
        type: form.type,
        start_date: form.start_date,
        end_date: form.end_date,
        partial_day: form.partial_day,
        hours: form.partial_day ? form.hours : null,
        reason: form.reason,
      } as any);
      setForm({ type: "PTO", start_date: "", end_date: "", partial_day: false, hours: "", reason: "" });
      await load();
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to create request.", variant: "error" });
    }
  };

  const handleApprove = async (id: number) => {
    if (!can("Employee", "approve")) return;
    await approveTimeOff(id);
    await load();
  };

  const handleDecline = async (id: number) => {
    if (!can("Employee", "approve")) return;
    if (!window.confirm("Decline this request?")) return;
    await declineTimeOff(id);
    await load();
  };

  const handleCancel = async (id: number) => {
    if (!can("Employee", "edit")) return;
    if (!window.confirm("Cancel this request?")) return;
    await cancelTimeOff(id);
    await load();
  };

  return (
    <div className="px-6 py-6 flex flex-col gap-6">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th>Type</th>
            <th>Dates</th>
            <th>Status</th>
            <th>Reason</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.type_name || row.type_value || row.type}</td>
              <td>{row.start_date} to {row.end_date}</td>
              <td>{statusLabel(row)}</td>
              <td>{row.reason || "-"}</td>
              <td className="text-right">
                {row.status_value === "REQUESTED" && can("Employee", "approve") && (
                  <div className="flex justify-end gap-2">
                    <button className="text-emerald-400" onClick={() => handleApprove(row.id!)}>Approve</button>
                    <button className="text-red-400" onClick={() => handleDecline(row.id!)}>Decline</button>
                  </div>
                )}
                {row.status_value === "REQUESTED" && can("Employee", "edit") && (
                  <button className="text-kk-dark-text-muted" onClick={() => handleCancel(row.id!)}>Cancel</button>
                )}
              </td>
            </tr>
          ))}
          {!loading && !rows.length && (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-center text-kk-dark-text-muted">No requests yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      {can("Employee", "create") && (
        <div className="grid grid-cols-12 gap-4 rounded-lg border border-kk-dark-border p-4 text-xs">
          <select
            className="col-span-2 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1"
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
          >
            {TIME_OFF_TYPE_CHOICES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input
            type="date"
            className="col-span-2 rounded-md border border-kk-dark-input-border px-2 py-1"
            value={form.start_date}
            onChange={(e) => setForm((prev) => ({ ...prev, start_date: e.target.value }))}
          />
          <input
            type="date"
            className="col-span-2 rounded-md border border-kk-dark-input-border px-2 py-1"
            value={form.end_date}
            onChange={(e) => setForm((prev) => ({ ...prev, end_date: e.target.value }))}
          />
          <input
            type="text"
            className="col-span-4 rounded-md border border-kk-dark-input-border px-2 py-1"
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="Reason"
          />
          <label className="col-span-2 inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={form.partial_day}
              onChange={(e) => setForm((prev) => ({ ...prev, partial_day: e.target.checked }))}
            />
            Partial day
          </label>
          {form.partial_day && (
            <input
              type="number"
              step="0.25"
              className="col-span-2 rounded-md border border-kk-dark-input-border px-2 py-1"
              value={form.hours}
              onChange={(e) => setForm((prev) => ({ ...prev, hours: e.target.value }))}
              placeholder="Hours"
            />
          )}
          <button
            type="button"
            className="col-span-2 inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1 text-xs text-white"
            onClick={handleCreate}
          >
            Request
          </button>
        </div>
      )}

      <ToastModal message={toast?.message ?? null} onClose={() => setToast(null)} variant={toast?.variant ?? "error"} />
    </div>
  );
};
