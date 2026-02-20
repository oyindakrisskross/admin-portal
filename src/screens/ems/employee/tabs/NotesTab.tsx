import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { useAuth } from "../../../../auth/AuthContext";
import { createNote, deleteNote, fetchNotes } from "../../../../api/ems";
import type { EmployeeNote } from "../../../../types/ems";
import { NOTE_TYPE_CHOICES } from "../../../../types/ems";
import ToastModal from "../../../../components/ui/ToastModal";

export const NotesTab: React.FC<{ employeeId: number }> = ({ employeeId }) => {
  const { can } = useAuth();
  const [rows, setRows] = useState<EmployeeNote[]>([]);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);

  const [form, setForm] = useState({
    note_type: "NOTE",
    title: "",
    body: "",
  });

  const load = async () => {
    try {
      const data = await fetchNotes(employeeId);
      setRows(data.results ?? []);
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to load notes.", variant: "error" });
    }
  };

  useEffect(() => {
    void load();
  }, [employeeId]);

  const handleCreate = async () => {
    if (!can("Employee", "create")) return;
    try {
      await createNote({
        employee: employeeId,
        note_type: form.note_type,
        title: form.title,
        body: form.body,
      } as any);
      setForm({ note_type: "NOTE", title: "", body: "" });
      await load();
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to add note.", variant: "error" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!can("Employee", "delete")) return;
    if (!window.confirm("Delete this note?")) return;
    try {
      await deleteNote(id);
      setRows((prev) => prev.filter((n) => n.id !== id));
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to delete note.", variant: "error" });
    }
  };

  return (
    <div className="px-6 py-6 flex flex-col gap-6">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th>Type</th>
            <th>Title</th>
            <th>Body</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.note_type_name || row.note_type_value || row.note_type}</td>
              <td>{row.title}</td>
              <td>{row.body}</td>
              <td className="text-right">
                {can("Employee", "delete") && (
                  <button className="text-red-400" onClick={() => handleDelete(row.id!)}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={4} className="px-3 py-6 text-center text-kk-dark-text-muted">No notes yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      {can("Employee", "create") && (
        <div className="grid grid-cols-12 gap-4 rounded-lg border border-kk-dark-border p-4 text-xs">
          <select className="col-span-2 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1" value={form.note_type} onChange={(e) => setForm((prev) => ({ ...prev, note_type: e.target.value }))}>
            {NOTE_TYPE_CHOICES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input type="text" className="col-span-3 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Title" />
          <input type="text" className="col-span-5 rounded-md border border-kk-dark-input-border px-2 py-1" value={form.body} onChange={(e) => setForm((prev) => ({ ...prev, body: e.target.value }))} placeholder="Note" />
          <button type="button" className="col-span-2 inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1 text-xs text-white" onClick={handleCreate}>Add Note</button>
        </div>
      )}

      <ToastModal message={toast?.message ?? null} onClose={() => setToast(null)} variant={toast?.variant ?? "error"} />
    </div>
  );
};
