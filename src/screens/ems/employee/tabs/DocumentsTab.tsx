import React, { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { useAuth } from "../../../../auth/AuthContext";
import { deleteDocument, fetchDocuments, uploadDocument } from "../../../../api/ems";
import type { EmployeeDocument } from "../../../../types/ems";
import { DOCUMENT_TYPE_CHOICES } from "../../../../types/ems";
import ToastModal from "../../../../components/ui/ToastModal";

export const DocumentsTab: React.FC<{ employeeId: number }> = ({ employeeId }) => {
  const { can } = useAuth();
  const [rows, setRows] = useState<EmployeeDocument[]>([]);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState("CONTRACT");
  const [expiry, setExpiry] = useState("");

  const load = async () => {
    try {
      const data = await fetchDocuments(employeeId);
      setRows(data.results ?? []);
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to load documents.", variant: "error" });
    }
  };

  useEffect(() => {
    void load();
  }, [employeeId]);

  const handleUpload = async () => {
    if (!can("Employee", "create")) return;
    if (!file) {
      setToast({ message: "Select a file to upload.", variant: "error" });
      return;
    }
    try {
      await uploadDocument({ employee: employeeId, doc_type: docType, file, expiry_date: expiry || null } as any);
      setFile(null);
      setExpiry("");
      await load();
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Upload failed.", variant: "error" });
    }
  };

  const handleDelete = async (id: number) => {
    if (!can("Employee", "delete")) return;
    if (!window.confirm("Delete this document?")) return;
    try {
      await deleteDocument(id);
      setRows((prev) => prev.filter((d) => d.id !== id));
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to delete document.", variant: "error" });
    }
  };

  return (
    <div className="px-6 py-6 flex flex-col gap-6">
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th>Type</th>
            <th>File</th>
            <th>Expiry</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.doc_type_name || row.doc_type_value || row.doc_type}</td>
              <td>{row.file_name || row.file}</td>
              <td>{row.expiry_date || "-"}</td>
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
              <td colSpan={4} className="px-3 py-6 text-center text-kk-dark-text-muted">No documents yet.</td>
            </tr>
          )}
        </tbody>
      </table>

      {can("Employee", "create") && (
        <div className="grid grid-cols-12 gap-4 rounded-lg border border-kk-dark-border p-4 text-xs">
          <select className="col-span-3 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1" value={docType} onChange={(e) => setDocType(e.target.value)}>
            {DOCUMENT_TYPE_CHOICES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <input type="date" className="col-span-3 rounded-md border border-kk-dark-input-border px-2 py-1" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
          <input type="file" className="col-span-4 rounded-md border border-kk-dark-input-border px-2 py-1" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button type="button" className="col-span-2 inline-flex items-center justify-center rounded-full bg-emerald-600 px-3 py-1 text-xs text-white" onClick={handleUpload}>Upload</button>
        </div>
      )}

      <ToastModal message={toast?.message ?? null} onClose={() => setToast(null)} variant={toast?.variant ?? "error"} />
    </div>
  );
};
