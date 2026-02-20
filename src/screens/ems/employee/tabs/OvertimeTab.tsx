import React, { useEffect, useState } from "react";

import { useAuth } from "../../../../auth/AuthContext";
import { approveOvertime, createOvertime, declineOvertime, fetchOvertime } from "../../../../api/ems";
import type { Overtime } from "../../../../types/ems";
import type { Location } from "../../../../types/location";
import ToastModal from "../../../../components/ui/ToastModal";
import { statusLabel } from "../employeeUtils";

export const OvertimeTab: React.FC<{ employeeId: number; locations: Location[] }> = ({ employeeId, locations }) => {
  const { can } = useAuth();
  const [rows, setRows] = useState<Overtime[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);

  const [form, setForm] = useState({
    date: "",
    hours: "",
    location: "",
    reason: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchOvertime({ filters: { clauses: [{ field: "employee", operator: "=", value: employeeId }] } });
      setRows(data.results ?? []);
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to load overtime.", variant: "error" });
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
      await createOvertime({
        employee: employeeId,
        date: form.date,
        hours: form.hours,
        location: form.location,
        reason: form.reason,
      } as any);
      setForm({ date: "", hours: "", location: "", reason: "" });
      await load();
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to create overtime.", variant: "error" });
    }
  };

  const handleApprove = async (id: number) => {
    if (!can("Employee", "approve")) return;
    await approveOvertime(id);
    await load();
  };

  const handleDecline = async (id: number) => {
    if (!can("Employee", "approve")) return;
    if (!window.confirm("Decline this request?")) return;
    await declineOvertime(id);
    await load();
  };

  return (
    <div className="px-6 py-6 flex flex-col gap-6">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th>Date</th>
            <th>Hours</th>
            <th>Location</th>
            <th>Status</th>
            <th>Reason</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.date}</td>
              <td>{row.hours}</td>
              <td>{row.location_name || row.location}</td>
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
              <td colSpan={6} className="px-3 py-6 text-center text-kk-dark-text-muted">No overtime records.</td>
            </tr>
          )}
        </tbody>
      </table>

      {can("Employee", "create") && (
        <div className="grid grid-cols-12 gap-4 rounded-lg border border-kk-dark-border p-4 text-xs">
          <input
            type="date"
            className="col-span-2 rounded-md border border-kk-dark-input-border px-2 py-1"
            value={form.date}
            onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
          />
          <input
            type="number"
            step="0.25"
            className="col-span-2 rounded-md border border-kk-dark-input-border px-2 py-1"
            value={form.hours}
            onChange={(e) => setForm((prev) => ({ ...prev, hours: e.target.value }))}
            placeholder="Hours"
          />
          <select
            className="col-span-3 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1"
            value={form.location}
            onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
          >
            <option value="">Location</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          <input
            type="text"
            className="col-span-4 rounded-md border border-kk-dark-input-border px-2 py-1"
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="Reason"
          />
          <button
            type="button"
            className="col-span-1 inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1 text-xs text-white"
            onClick={handleCreate}
          >
            Add
          </button>
        </div>
      )}

      <ToastModal message={toast?.message ?? null} onClose={() => setToast(null)} variant={toast?.variant ?? "error"} />
    </div>
  );
};
