import React, { useEffect, useState } from "react";

import { useAuth } from "../../../../auth/AuthContext";
import { createAttendance, editAttendance, fetchAttendance, fetchAttendanceEdits } from "../../../../api/ems";
import type { Attendance, AttendanceEdit } from "../../../../types/ems";
import { ATTENDANCE_SOURCE_CHOICES } from "../../../../types/ems";
import type { Location } from "../../../../types/location";
import ToastModal from "../../../../components/ui/ToastModal";
import { formatDateTime } from "../employeeUtils";

export const AttendanceTab: React.FC<{ employeeId: number; locations: Location[] }> = ({ employeeId, locations }) => {
  const { can } = useAuth();
  const [rows, setRows] = useState<Attendance[]>([]);
  const [edits, setEdits] = useState<AttendanceEdit[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);

  const [newAttendance, setNewAttendance] = useState<Partial<Attendance>>({
    shift_date: "",
    time_in: "",
    time_out: "",
  });

  const [editForm, setEditForm] = useState({
    attendanceId: "",
    time_in: "",
    time_out: "",
    lunch_start: "",
    lunch_end: "",
    reason: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAttendance({ filters: { clauses: [{ field: "employee", operator: "=", value: employeeId }] } });
      setRows(data.results ?? []);
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to load attendance.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [employeeId]);

  useEffect(() => {
    if (!selectedId) return;
    (async () => {
      try {
        const data = await fetchAttendanceEdits(selectedId);
        setEdits(data.results ?? []);
      } catch {
        setEdits([]);
      }
    })();
  }, [selectedId]);

  const handleCreate = async () => {
    if (!can("Employee", "create")) return;
    try {
      const payload: any = {
        employee: employeeId,
        location: newAttendance.location,
        shift_date: newAttendance.shift_date,
        time_in: newAttendance.time_in || null,
        time_out: newAttendance.time_out || null,
        lunch_start: newAttendance.lunch_start || null,
        lunch_end: newAttendance.lunch_end || null,
        source: newAttendance.source || "MANUAL",
      };
      await createAttendance(payload as any);
      setNewAttendance({ shift_date: "", time_in: "", time_out: "" });
      await load();
      setToast({ message: "Attendance created.", variant: "success" });
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to create attendance.", variant: "error" });
    }
  };

  const handleEdit = async () => {
    if (!can("Employee", "edit")) return;
    if (!editForm.attendanceId || !editForm.reason) {
      setToast({ message: "Select attendance and provide a reason.", variant: "error" });
      return;
    }
    const newValues: Record<string, any> = {};
    if (editForm.time_in) newValues.time_in = editForm.time_in;
    if (editForm.time_out) newValues.time_out = editForm.time_out;
    if (editForm.lunch_start) newValues.lunch_start = editForm.lunch_start;
    if (editForm.lunch_end) newValues.lunch_end = editForm.lunch_end;

    try {
      await editAttendance(Number(editForm.attendanceId), { new_values: newValues, reason: editForm.reason });
      setEditForm({ attendanceId: "", time_in: "", time_out: "", lunch_start: "", lunch_end: "", reason: "" });
      await load();
      setToast({ message: "Attendance edit submitted.", variant: "success" });
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to submit edit.", variant: "error" });
    }
  };

  return (
    <div className="px-6 py-6 flex flex-col gap-6">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th>Date</th>
            <th>Location</th>
            <th>Time In</th>
            <th>Time Out</th>
            <th>Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} onClick={() => setSelectedId(row.id!)} className="cursor-pointer hover:bg-kk-dark-bg-elevated">
              <td>{row.shift_date}</td>
              <td>{row.location_name || row.location}</td>
              <td>{row.time_in || "-"}</td>
              <td>{row.time_out || "-"}</td>
              <td>{row.source_name || row.source_value || "-"}</td>
            </tr>
          ))}
          {!loading && !rows.length && (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-center text-kk-dark-text-muted">No attendance records.</td>
            </tr>
          )}
        </tbody>
      </table>

      {selectedId && edits.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold mb-2">Edits for #{selectedId}</h4>
          <table className="min-w-full text-xs">
            <thead>
              <tr>
                <th>Edited On</th>
                <th>Edited By</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {edits.map((edit) => (
                <tr key={edit.id}>
                  <td>{formatDateTime(edit.edited_on)}</td>
                  <td>{edit.edited_by_email || edit.edited_by || "-"}</td>
                  <td>{edit.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {can("Employee", "create") && (
        <div className="grid grid-cols-12 gap-4 rounded-lg border border-kk-dark-border p-4">
          <div className="col-span-12 text-xs font-semibold">Add Attendance</div>
          <input
            type="date"
            className="col-span-3 rounded-md border border-kk-dark-input-border px-2 py-1 text-xs"
            value={newAttendance.shift_date ?? ""}
            onChange={(e) => setNewAttendance((prev) => ({ ...prev, shift_date: e.target.value }))}
          />
          <select
            className="col-span-3 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1 text-xs"
            value={newAttendance.location ?? ""}
            onChange={(e) => setNewAttendance((prev) => ({ ...prev, location: Number(e.target.value) }))}
          >
            <option value="">Location</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>{loc.name}</option>
            ))}
          </select>
          <input
            type="datetime-local"
            className="col-span-3 rounded-md border border-kk-dark-input-border px-2 py-1 text-xs"
            value={newAttendance.time_in ?? ""}
            onChange={(e) => setNewAttendance((prev) => ({ ...prev, time_in: e.target.value }))}
          />
          <input
            type="datetime-local"
            className="col-span-3 rounded-md border border-kk-dark-input-border px-2 py-1 text-xs"
            value={newAttendance.time_out ?? ""}
            onChange={(e) => setNewAttendance((prev) => ({ ...prev, time_out: e.target.value }))}
          />
          <select
            className="col-span-3 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1 text-xs"
            value={newAttendance.source ?? "MANUAL"}
            onChange={(e) => setNewAttendance((prev) => ({ ...prev, source: e.target.value }))}
          >
            {ATTENDANCE_SOURCE_CHOICES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            type="button"
            className="col-span-3 inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1 text-xs text-white"
            onClick={handleCreate}
          >
            Add Attendance
          </button>
        </div>
      )}

      {can("Employee", "edit") && (
        <div className="grid grid-cols-12 gap-4 rounded-lg border border-kk-dark-border p-4">
          <div className="col-span-12 text-xs font-semibold">Edit Attendance</div>
          <select
            className="col-span-3 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1 text-xs"
            value={editForm.attendanceId}
            onChange={(e) => setEditForm((prev) => ({ ...prev, attendanceId: e.target.value }))}
          >
            <option value="">Select attendance</option>
            {rows.map((row) => (
              <option key={row.id} value={row.id}>{row.shift_date} - {row.location_name || row.location}</option>
            ))}
          </select>
          <input
            type="datetime-local"
            className="col-span-3 rounded-md border border-kk-dark-input-border px-2 py-1 text-xs"
            value={editForm.time_in}
            onChange={(e) => setEditForm((prev) => ({ ...prev, time_in: e.target.value }))}
            placeholder="New time in"
          />
          <input
            type="datetime-local"
            className="col-span-3 rounded-md border border-kk-dark-input-border px-2 py-1 text-xs"
            value={editForm.time_out}
            onChange={(e) => setEditForm((prev) => ({ ...prev, time_out: e.target.value }))}
            placeholder="New time out"
          />
          <input
            type="text"
            className="col-span-6 rounded-md border border-kk-dark-input-border px-2 py-1 text-xs"
            value={editForm.reason}
            onChange={(e) => setEditForm((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="Reason for edit"
          />
          <button
            type="button"
            className="col-span-3 inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1 text-xs text-white"
            onClick={handleEdit}
          >
            Submit Edit
          </button>
        </div>
      )}

      <ToastModal message={toast?.message ?? null} onClose={() => setToast(null)} variant={toast?.variant ?? "error"} />
    </div>
  );
};
