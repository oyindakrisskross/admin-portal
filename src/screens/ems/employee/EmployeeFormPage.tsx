import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { useAuth } from "../../../auth/AuthContext";
import { fetchContact } from "../../../api/contact";
import { fetchLocations } from "../../../api/location";
import {
  createEmployee,
  fetchDepartments,
  fetchEmployee,
  fetchEmployees,
  fetchPositions,
  updateEmployee,
} from "../../../api/ems";
import type { Contact } from "../../../types/contact";
import type { Location } from "../../../types/location";
import type { Department, Employee, JobPosition } from "../../../types/ems";
import {
  EMPLOYEE_STATUS_CHOICES,
  RATE_TERM_CHOICES,
  WEEKDAY_CHOICES,
} from "../../../types/ems";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";
import { ContactSearchSelect } from "../../../components/crm/ContactSearchSelect";
import { SearchMultiSelectDropdown } from "../../../components/promotions/SearchMultiSelectDropdown";

const DEFAULT_EMPLOYEE: Employee = {
  contact: 0,
  employee_code: "",
  department: null,
  position: null,
  supervisor: null,
  status: "ACTIVE",
  hire_date: "",
  start_date: "",
  end_date: "",
  work_pattern_weekdays: [0, 1, 2, 3, 4],
  standard_daily_hours: 8,
  rate_amount: "",
  rate_term: "MONTHLY",
  overtime_eligible: true,
  is_active: true,
};

export default function EmployeeFormPage() {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [employee, setEmployee] = useState<Employee>(DEFAULT_EMPLOYEE);
  const [contact, setContact] = useState<Contact | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [supervisors, setSupervisors] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationIds, setLocationIds] = useState<number[]>([]);
  const [primaryLocationId, setPrimaryLocationId] = useState<number | null>(null);
  const [changeReason, setChangeReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [deptRes, posRes, locRes, supRes] = await Promise.all([
          fetchDepartments(),
          fetchPositions(),
          fetchLocations(),
          fetchEmployees(),
        ]);
        setDepartments(deptRes.results ?? []);
        setPositions(posRes.results ?? []);
        setLocations(locRes.results ?? []);
        setSupervisors(supRes.results ?? []);
      } catch (e: any) {
        setToast({
          message: e?.response?.data?.detail || e?.message || "Failed to load employee setup data.",
          variant: "error",
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        const data = await fetchEmployee(Number(id));
        setEmployee((prev) => ({ ...prev, ...data }));

        if (data.contact) {
          try {
            const c = await fetchContact(Number(data.contact));
            setContact(c);
          } catch {
            setContact(null);
          }
        }

        const assigned = data.locations ?? [];
        const ids = assigned.map((row) => row.location).filter(Boolean) as number[];
        setLocationIds(ids);
        const primary = assigned.find((row) => row.is_primary)?.location ?? null;
        setPrimaryLocationId(primary);
      } catch (e: any) {
        setToast({
          message: e?.response?.data?.detail || e?.message || "Failed to load employee.",
          variant: "error",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  const locationOptions = useMemo(
    () => locations.map((loc) => ({ id: loc.id!, label: loc.name })),
    [locations]
  );

  const selectedLocationOptions = useMemo(
    () => locations.filter((loc) => locationIds.includes(loc.id!)),
    [locations, locationIds]
  );

  const patchEmployee = (patch: Partial<Employee>) => {
    setEmployee((prev) => ({ ...prev, ...patch }));
  };

  const toggleWeekday = (day: number) => {
    const set = new Set(employee.work_pattern_weekdays ?? []);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    patchEmployee({ work_pattern_weekdays: Array.from(set).sort() });
  };

  const handleSave = async () => {
    if (!contact?.id && !employee.contact) {
      setToast({ message: "Select a contact before saving.", variant: "error" });
      return;
    }

    if (!can("Employee", isEdit ? "edit" : "create")) {
      setToast({ message: "You do not have permission to save employees.", variant: "error" });
      return;
    }

    setSaving(true);
    try {
      let primary = primaryLocationId;
      if (primary && !locationIds.includes(primary)) {
        primary = locationIds[0] ?? null;
      }

      const payload: any = {
        contact: contact?.id ?? employee.contact,
        employee_code: employee.employee_code || undefined,
        department: employee.department || null,
        position: employee.position || null,
        supervisor: employee.supervisor || null,
        status: employee.status || null,
        hire_date: employee.hire_date || null,
        start_date: employee.start_date || null,
        end_date: employee.end_date || null,
        work_pattern_weekdays: employee.work_pattern_weekdays ?? [],
        standard_daily_hours: employee.standard_daily_hours ?? null,
        rate_amount: employee.rate_amount ?? null,
        rate_term: employee.rate_term ?? null,
        overtime_eligible: employee.overtime_eligible ?? false,
        is_active: employee.is_active ?? true,
        location_ids: locationIds,
        primary_location_id: primary,
        change_reason: changeReason || undefined,
      };

      let saved: Employee;
      if (isEdit && employee.id) {
        saved = await updateEmployeeApi(employee.id, payload);
      } else {
        saved = await createEmployee(payload);
      }

      navigate(`/ems/employees/${saved.id}`);
    } catch (e: any) {
      setToast({
        message: e?.response?.data?.detail || e?.message || "Failed to save employee.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isEdit && loading) {
    return <div className="p-6 text-sm">Loading employee...</div>;
  }

  return (
    <>
      <ListPageHeader
        section="EMS"
        title={isEdit ? `Edit ${employee.first_name ?? "Employee"}` : "New Employee"}
        right={
          <button
            onClick={() => navigate(isEdit ? `/ems/employees/${id}` : "/ems/employees")}
            className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-kk-muted hover:text-gray-100"
          >
            <XMarkIcon className="h-7 w-7" />
          </button>
        }
      />

      <div className="flex flex-col gap-6 text-sm px-6 pt-6 pb-8">
        <section className="grid grid-cols-12 gap-4 items-center">
          <p className="col-span-2">Contact</p>
          <div className="col-span-5">
            <ContactSearchSelect
              value={contact}
              onChange={(c) => {
                setContact(c);
                if (c?.id) patchEmployee({ contact: c.id });
              }}
              placeholder="Search contacts to link"
            />
          </div>
        </section>

        <section className="grid grid-cols-12 gap-4 items-center">
          <p className="col-span-2">Employee Code</p>
          <input
            type="text"
            className="col-span-3 rounded-md border border-kk-dark-input-border px-3 py-2"
            value={employee.employee_code ?? ""}
            onChange={(e) => patchEmployee({ employee_code: e.target.value })}
            placeholder="EMP-000001"
          />
          <label className="col-span-3 inline-flex items-center gap-2 text-xs text-kk-dark-text-muted">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={employee.is_active ?? true}
              onChange={(e) => patchEmployee({ is_active: e.target.checked })}
            />
            Active
          </label>
        </section>

        <section className="grid grid-cols-12 gap-4">
          <p className="col-span-2">Department</p>
          <select
            className="col-span-3 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2"
            value={employee.department ?? ""}
            onChange={(e) => patchEmployee({ department: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <p className="col-span-2">Position</p>
          <select
            className="col-span-3 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2"
            value={employee.position ?? ""}
            onChange={(e) => patchEmployee({ position: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">Select position</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </section>

        <section className="grid grid-cols-12 gap-4">
          <p className="col-span-2">Supervisor</p>
          <select
            className="col-span-3 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2"
            value={employee.supervisor ?? ""}
            onChange={(e) => patchEmployee({ supervisor: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">None</option>
            {supervisors
              .filter((s) => s.id !== employee.id)
              .map((s) => {
                const name = [s.first_name, s.last_name].filter(Boolean).join(" ").trim();
                return (
                  <option key={s.id} value={s.id}>
                    {name || `#${s.id}`}
                  </option>
                );
              })}
          </select>

          <p className="col-span-2">Status</p>
          <select
            className="col-span-3 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2"
            value={employee.status ?? ""}
            onChange={(e) => patchEmployee({ status: e.target.value })}
          >
            {EMPLOYEE_STATUS_CHOICES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </section>

        <section className="grid grid-cols-12 gap-4">
          <p className="col-span-2">Hire Date</p>
          <input
            type="date"
            className="col-span-3 rounded-md border border-kk-dark-input-border px-3 py-2"
            value={employee.hire_date ?? ""}
            onChange={(e) => patchEmployee({ hire_date: e.target.value })}
          />

          <p className="col-span-2">Start Date</p>
          <input
            type="date"
            className="col-span-3 rounded-md border border-kk-dark-input-border px-3 py-2"
            value={employee.start_date ?? ""}
            onChange={(e) => patchEmployee({ start_date: e.target.value })}
          />
        </section>

        <section className="grid grid-cols-12 gap-4">
          <p className="col-span-2">End Date</p>
          <input
            type="date"
            className="col-span-3 rounded-md border border-kk-dark-input-border px-3 py-2"
            value={employee.end_date ?? ""}
            onChange={(e) => patchEmployee({ end_date: e.target.value })}
          />
        </section>

        <section className="grid grid-cols-12 gap-4">
          <p className="col-span-2">Workdays</p>
          <div className="col-span-6 flex flex-wrap gap-3">
            {WEEKDAY_CHOICES.map((day) => (
              <label key={day.value} className="inline-flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={(employee.work_pattern_weekdays ?? []).includes(day.value)}
                  onChange={() => toggleWeekday(day.value)}
                />
                {day.label}
              </label>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-12 gap-4">
          <p className="col-span-2">Daily Hours</p>
          <input
            type="number"
            step="0.25"
            className="col-span-3 rounded-md border border-kk-dark-input-border px-3 py-2"
            value={employee.standard_daily_hours ?? ""}
            onChange={(e) => patchEmployee({ standard_daily_hours: e.target.value })}
          />

          <p className="col-span-2">Overtime Eligible</p>
          <label className="col-span-3 inline-flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={employee.overtime_eligible ?? false}
              onChange={(e) => patchEmployee({ overtime_eligible: e.target.checked })}
            />
            Eligible
          </label>
        </section>

        <section className="grid grid-cols-12 gap-4">
          <p className="col-span-2">Rate</p>
          <input
            type="number"
            step="0.01"
            className="col-span-3 rounded-md border border-kk-dark-input-border px-3 py-2"
            value={employee.rate_amount ?? ""}
            onChange={(e) => patchEmployee({ rate_amount: e.target.value })}
            placeholder="0.00"
          />

          <p className="col-span-2">Rate Term</p>
          <select
            className="col-span-3 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2"
            value={employee.rate_term ?? ""}
            onChange={(e) => patchEmployee({ rate_term: e.target.value })}
          >
            {RATE_TERM_CHOICES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </section>

        <section className="grid grid-cols-12 gap-4">
          <p className="col-span-2">Rate Change Reason</p>
          <input
            type="text"
            className="col-span-6 rounded-md border border-kk-dark-input-border px-3 py-2"
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            placeholder="Required if you update pay rate"
          />
        </section>

        <section className="grid grid-cols-12 gap-4 items-start">
          <p className="col-span-2">Locations</p>
          <div className="col-span-4">
            <SearchMultiSelectDropdown
              options={locationOptions}
              selectedIds={locationIds}
              onChange={setLocationIds}
              placeholder="Assign locations"
            />
          </div>
          <p className="col-span-2">Primary Location</p>
          <select
            className="col-span-3 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2"
            value={primaryLocationId ?? ""}
            onChange={(e) => setPrimaryLocationId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">None</option>
            {selectedLocationOptions.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
        </section>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(isEdit ? `/ems/employees/${id}` : "/ems/employees")}
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
            Save Employee
          </button>
        </div>
      </div>

      <ToastModal message={toast?.message ?? null} onClose={() => setToast(null)} variant={toast?.variant ?? "error"} />
    </>
  );
}

const updateEmployeeApi = async (id: number, payload: any) => {
  return updateEmployee(id, payload);
};
