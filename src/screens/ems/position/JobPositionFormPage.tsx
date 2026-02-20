import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import {
  createPosition,
  fetchDepartments,
  fetchPosition,
  updatePosition,
} from "../../../api/ems";
import type { Department, JobPosition } from "../../../types/ems";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";

const DEFAULT_POSITION: JobPosition = {
  name: "",
  department: null,
  is_active: true,
};

export default function JobPositionFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [position, setPosition] = useState<JobPosition>(DEFAULT_POSITION);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchDepartments();
        setDepartments(data.results ?? []);
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
        const data = await fetchPosition(Number(id));
        setPosition(data);
      } catch (e: any) {
        setToast({
          message: e?.response?.data?.detail || e?.message || "Failed to load position.",
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
        name: position.name,
        department: position.department || null,
        is_active: position.is_active ?? true,
      };

      if (position.id) {
        await updatePosition(position.id, payload);
      } else {
        await createPosition(payload);
      }

      navigate("/ems/positions");
    } catch (e: any) {
      setToast({
        message: e?.response?.data?.detail || e?.message || "Failed to save position.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && loading) {
    return <div className="p-6 text-sm">Loading position...</div>;
  }

  return (
    <>
      <ListPageHeader
        section="EMS"
        title={isEdit ? `Edit ${position.name}` : "New Job Position"}
        right={
          <button
            onClick={() => navigate("/ems/positions")}
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
            value={position.name}
            onChange={(e) => setPosition((prev) => ({ ...prev, name: e.target.value }))}
          />
        </section>

        <section className="grid grid-cols-12 gap-4 items-center">
          <p className="col-span-2">Department</p>
          <select
            className="col-span-4 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2"
            value={position.department ?? ""}
            onChange={(e) =>
              setPosition((prev) => ({
                ...prev,
                department: e.target.value ? Number(e.target.value) : null,
              }))
            }
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
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
              checked={position.is_active ?? true}
              onChange={(e) => setPosition((prev) => ({ ...prev, is_active: e.target.checked }))}
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
            Save Position
          </button>
        </div>
      </div>

      <ToastModal message={toast?.message ?? null} onClose={() => setToast(null)} variant={toast?.variant ?? "error"} />
    </>
  );
}
