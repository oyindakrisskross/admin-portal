import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";

import { useAuth } from "../../../auth/AuthContext";
import { deleteDepartment, fetchDepartments } from "../../../api/ems";
import type { Department } from "../../../types/ems";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";

export const DepartmentListPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);

  const load = async () => {
    try {
      const data = await fetchDepartments();
      setDepartments(data.results ?? []);
    } catch (e: any) {
      setToast({
        message: e?.response?.data?.detail || e?.message || "Failed to load departments.",
        variant: "error",
      });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleDelete = async (id: number) => {
    if (!can("Employee", "delete")) return;
    if (!window.confirm("Deactivate this department?")) return;
    try {
      await deleteDepartment(id);
      setDepartments((prev) => prev.filter((d) => d.id !== id));
      setToast({ message: "Department deactivated.", variant: "success" });
    } catch (e: any) {
      setToast({
        message: e?.response?.data?.detail || e?.message || "Failed to deactivate department.",
        variant: "error",
      });
    }
  };

  return (
    <div className="flex-1 flex gap-4">
      <div className="flex flex-col gap-4 w-full">
        <ListPageHeader
          section="EMS"
          title="Departments"
          right={
            can("Employee", "create") ? (
              <button
                onClick={() => navigate("/ems/departments/new")}
                className="new inline-flex items-center gap-1 rounded-full"
              >
                <Plus className="h-3 w-3" />
                New
              </button>
            ) : null
          }
        />

        <div className="overflow-hidden px-4">
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Parent</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr
                  key={d.id}
                  className="cursor-pointer hover:bg-kk-dark-bg-elevated"
                  onClick={() => navigate(`/ems/departments/${d.id}/edit`)}
                >
                  <td>{d.name}</td>
                  <td>{d.parent_name || "-"}</td>
                  <td>{d.is_active === false ? "Inactive" : "Active"}</td>
                  <td className="text-right">
                    {can("Employee", "delete") && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(d.id!);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!departments.length && (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center text-xs text-kk-dark-text-muted">
                    No departments yet. Click "New" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ToastModal message={toast?.message ?? null} onClose={() => setToast(null)} variant={toast?.variant ?? "error"} />
    </div>
  );
};
