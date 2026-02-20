import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

import { useAuth } from "../../../../auth/AuthContext";
import {
  createShift,
  createShiftOverride,
  deleteShift,
  deleteShiftOverride,
  fetchShiftOverrides,
  fetchShifts,
} from "../../../../api/ems";
import type { EmployeeShift, EmployeeShiftOverride } from "../../../../types/ems";
import { SHIFT_OVERRIDE_TYPE_CHOICES, WEEKDAY_CHOICES } from "../../../../types/ems";
import type { Location } from "../../../../types/location";
import ToastModal from "../../../../components/ui/ToastModal";

export const ScheduleTab: React.FC<{ employeeId: number; locations: Location[] }> = ({ employeeId, locations }) => {
  const { can } = useAuth();
  const [shifts, setShifts] = useState<EmployeeShift[]>([]);
  const [overrides, setOverrides] = useState<EmployeeShiftOverride[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);

  const [newShift, setNewShift] = useState<Partial<EmployeeShift>>({
    weekday: 0,
    shift_start: "09:00",
    shift_end: "17:00",
    valid_from: "",
  });

  const [newOverride, setNewOverride] = useState<Partial<EmployeeShiftOverride>>({
    shift_date: "",
    shift_start: "09:00",
    shift_end: "17:00",
    override_type: "REPLACE",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [shiftRes, overrideRes] = await Promise.all([
        fetchShifts({ filters: { clauses: [{ field: "employee", operator: "=", value: employeeId }] } }),
        fetchShiftOverrides({ filters: { clauses: [{ field: "employee", operator: "=", value: employeeId }] } }),
      ]);
      setShifts(shiftRes.results ?? []);
      setOverrides(overrideRes.results ?? []);
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to load shifts.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [employeeId]);

  const handleCreateShift = async () => {
    if (!can("Employee", "edit")) return;
    try {
      const payload: any = {
        employee: employeeId,
        location: newShift.location,
        weekday: newShift.weekday,
        shift_start: newShift.shift_start,
        shift_end: newShift.shift_end,
      };
      if (newShift.valid_from) payload.valid_from = newShift.valid_from;
      if (newShift.valid_to) payload.valid_to = newShift.valid_to;
      await createShift(payload as any);
      setNewShift({ weekday: 0, shift_start: "09:00", shift_end: "17:00", valid_from: "" });
      await load();
      setToast({ message: "Shift created.", variant: "success" });
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to create shift.", variant: "error" });
    }
  };

  const handleCreateOverride = async () => {
    if (!can("Employee", "edit")) return;
    try {
      const payload: any = {
        employee: employeeId,
        location: newOverride.location,
        shift_date: newOverride.shift_date,
        shift_start: newOverride.shift_start,
        shift_end: newOverride.shift_end,
        override_type: newOverride.override_type,
        note: newOverride.note || "",
      };
      await createShiftOverride(payload as any);
      setNewOverride({ shift_date: "", shift_start: "09:00", shift_end: "17:00", override_type: "REPLACE" });
      await load();
      setToast({ message: "Override created.", variant: "success" });
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to create override.", variant: "error" });
    }
  };

  const handleDeleteShift = async (id: number) => {
    if (!can("Employee", "delete")) return;
    if (!window.confirm("Delete this shift?")) return;
    try {
      await deleteShift(id);
      setShifts((prev) => prev.filter((s) => s.id !== id));
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to delete shift.", variant: "error" });
    }
  };

  const handleDeleteOverride = async (id: number) => {
    if (!can("Employee", "delete")) return;
    if (!window.confirm("Delete this override?")) return;
    try {
      await deleteShiftOverride(id);
      setOverrides((prev) => prev.filter((s) => s.id !== id));
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to delete override.", variant: "error" });
    }
  };

  return (
    <div className="px-6 py-6 flex flex-col gap-6">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6">
          <h3 className="text-sm font-semibold mb-3">Recurring Shifts</h3>
          <table className="min-w-full text-xs">
            <thead>
              <tr>
                <th>Weekday</th>
                <th>Location</th>
                <th>Time</th>
                <th>Valid</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {shifts.map((s) => (
                <tr key={s.id}>
                  <td>{s.weekday}</td>
                  <td>{s.location_name || s.location}</td>
                  <td>{s.shift_start} - {s.shift_end}</td>
                  <td>{s.valid_from} {s.valid_to ? `to ${s.valid_to}` : ""}</td>
                  <td className="text-right">
                    {can("Employee", "delete") && (
                      <button type="button" onClick={() => handleDeleteShift(s.id!)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && !shifts.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-kk-dark-text-muted">No shifts yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="col-span-6">
          <h3 className="text-sm font-semibold mb-3">Shift Overrides</h3>
          <table className="min-w-full text-xs">
            <thead>
              <tr>
                <th>Date</th>
                <th>Location</th>
                <th>Time</th>
                <th>Type</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {overrides.map((o) => (
                <tr key={o.id}>
                  <td>{o.shift_date}</td>
                  <td>{o.location_name || o.location}</td>
                  <td>{o.shift_start || "-"} {o.shift_end ? `- ${o.shift_end}` : ""}</td>
                  <td>{o.override_type}</td>
                  <td className="text-right">
                    {can("Employee", "delete") && (
                      <button type="button" onClick={() => handleDeleteOverride(o.id!)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!loading && !overrides.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-kk-dark-text-muted">No overrides yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {can("Employee", "edit") && (
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6 rounded-lg border border-kk-dark-border p-4">
            <h4 className="text-xs font-semibold mb-3">Add Recurring Shift</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <select
                className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1"
                value={newShift.weekday ?? 0}
                onChange={(e) => setNewShift((prev) => ({ ...prev, weekday: Number(e.target.value) }))}
              >
                {WEEKDAY_CHOICES.map((day) => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
              <select
                className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1"
                value={newShift.location ?? ""}
                onChange={(e) => setNewShift((prev) => ({ ...prev, location: Number(e.target.value) }))}
              >
                <option value="">Location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              <input
                type="time"
                className="rounded-md border border-kk-dark-input-border px-2 py-1"
                value={newShift.shift_start ?? ""}
                onChange={(e) => setNewShift((prev) => ({ ...prev, shift_start: e.target.value }))}
              />
              <input
                type="time"
                className="rounded-md border border-kk-dark-input-border px-2 py-1"
                value={newShift.shift_end ?? ""}
                onChange={(e) => setNewShift((prev) => ({ ...prev, shift_end: e.target.value }))}
              />
              <input
                type="date"
                className="rounded-md border border-kk-dark-input-border px-2 py-1"
                value={newShift.valid_from ?? ""}
                onChange={(e) => setNewShift((prev) => ({ ...prev, valid_from: e.target.value }))}
              />
              <input
                type="date"
                className="rounded-md border border-kk-dark-input-border px-2 py-1"
                value={newShift.valid_to ?? ""}
                onChange={(e) => setNewShift((prev) => ({ ...prev, valid_to: e.target.value }))}
              />
            </div>
            <button type="button" onClick={handleCreateShift} className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs text-white">
              <Plus className="h-3 w-3" />
              Add Shift
            </button>
          </div>

          <div className="col-span-6 rounded-lg border border-kk-dark-border p-4">
            <h4 className="text-xs font-semibold mb-3">Add Override</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <input
                type="date"
                className="rounded-md border border-kk-dark-input-border px-2 py-1"
                value={newOverride.shift_date ?? ""}
                onChange={(e) => setNewOverride((prev) => ({ ...prev, shift_date: e.target.value }))}
              />
              <select
                className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1"
                value={newOverride.location ?? ""}
                onChange={(e) => setNewOverride((prev) => ({ ...prev, location: Number(e.target.value) }))}
              >
                <option value="">Location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
              <input
                type="time"
                className="rounded-md border border-kk-dark-input-border px-2 py-1"
                value={newOverride.shift_start ?? ""}
                onChange={(e) => setNewOverride((prev) => ({ ...prev, shift_start: e.target.value }))}
              />
              <input
                type="time"
                className="rounded-md border border-kk-dark-input-border px-2 py-1"
                value={newOverride.shift_end ?? ""}
                onChange={(e) => setNewOverride((prev) => ({ ...prev, shift_end: e.target.value }))}
              />
              <select
                className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1"
                value={newOverride.override_type ?? "REPLACE"}
                onChange={(e) => setNewOverride((prev) => ({ ...prev, override_type: e.target.value as any }))}
              >
                {SHIFT_OVERRIDE_TYPE_CHOICES.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <input
                type="text"
                className="rounded-md border border-kk-dark-input-border px-2 py-1"
                value={newOverride.note ?? ""}
                onChange={(e) => setNewOverride((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Note"
              />
            </div>
            <button type="button" onClick={handleCreateOverride} className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs text-white">
              <Plus className="h-3 w-3" />
              Add Override
            </button>
          </div>
        </div>
      )}

      <ToastModal message={toast?.message ?? null} onClose={() => setToast(null)} variant={toast?.variant ?? "error"} />
    </div>
  );
};
