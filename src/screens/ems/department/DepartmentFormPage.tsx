import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { createDepartment, fetchDepartment, fetchDepartments, updateDepartment } from "../../../api/ems";
import type { Department } from "../../../types/ems";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";

const DEFAULT_DEPARTMENT: Department = {
  name: "",
  parent_department: null,
  is_active: true,
};

export default function DepartmentFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [department, setDepartment] = useState<Department>(DEFAULT_DEPARTMENT);
  const [parents, setParents] = useState<Department[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchDepartments();
        setParents(data.results ?? []);
      } catch (e: any) {
        setToast({
          message: e?.response?.data?.detail || e?.message || "Failed to load departments.",
          variant: "error",
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        const data = await fetchDepartment(Number(id));
        setDepartment(data);
      } catch (e: any) {
        setToast({
          message: e?.response?.data?.detail || e?.message || "Failed to load department.",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        name: department.name,
        parent_department: department.parent_department || null,
        is_active: department.is_active ?? true,
      };

      if (department.id) {
        await updateDepartment(department.id, payload);
      } else {
        await createDepartment(payload);
      }

      navigate("/ems/departments");
    } catch (e: any) {
      setToast({
        message: e?.response?.data?.detail || e?.message || "Failed to save department.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && loading) {
    return <div className="p-6 text-sm">Loading department...</div>;
  }

  return (
    <>
      <ListPageHeader
        section="EMS"
        title={isEdit ? `Edit ${department.name}` : "New Department"}
        right={
          <button
            onClick={() => navigate("/ems/departments")}
            className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-kk-muted hover:text-gray-100"
          >
            <XMarkIcon className="h-7 w-7" />
          </button>
        }
      />

      <div className="flex flex-col gap-6 text-sm px-6 pt-6 pb-8">
        <section className="grid grid-cols-12 gap-4 items-center">
          <p className="col-span-2">Name</p>
          <input
            type="text"
            className="col-span-4 rounded-md border border-kk-dark-input-border px-3 py-2"
            value={department.name}
            onChange={(e) => setDepartment((prev) => ({ ...prev, name: e.target.value }))}
          />
        </section>

        <section className="grid grid-cols-12 gap-4 items-center">
          <p className="col-span-2">Parent</p>
          <select
            className="col-span-4 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2"
            value={department.parent_department ?? ""}
            onChange={(e) =>
              setDepartment((prev) => ({
                ...prev,
                parent_department: e.target.value ? Number(e.target.value) : null,
              }))
            }
          >
            <option value="">None</option>
            {parents
              .filter((p) => p.id !== department.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </section>

        <section className="grid grid-cols-12 gap-4 items-center">
          <p className="col-span-2">Active</p>
          <label className="col-span-4 inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={department.is_active ?? true}
              onChange={(e) => setDepartment((prev) => ({ ...prev, is_active: e.target.checked }))}
            />
            Active
          </label>
        </section>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="danger rounded-full border border-red-600 px-4 py-1.5 text-xs font-medium text-red-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save Department
          </button>
        </div>
      </div>

      <ToastModal message={toast?.message ?? null} onClose={() => setToast(null)} variant={toast?.variant ?? "error"} />
    </>
  );
}
