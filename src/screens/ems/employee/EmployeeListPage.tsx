import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search } from "lucide-react";

import { useAuth } from "../../../auth/AuthContext";
import { fetchEmployees } from "../../../api/ems";
import type { Employee } from "../../../types/ems";
import { EMPLOYEE_STATUS_CHOICES } from "../../../types/ems";
import type { ColumnMeta, FilterSet } from "../../../types/filters";
import { FilterBar } from "../../../components/filter/FilterBar";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";

const formatMoney = (value?: number | string | null) => {
  if (value == null || value === "") return "-";
  const num = Number(value);
  if (Number.isNaN(num)) return String(value);
  return Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const EmployeeListPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filters, setFilters] = useState<FilterSet>({ clauses: [] });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);

  const filterColumns: ColumnMeta[] = useMemo(
    () => [
      { id: "employee_code", label: "Employee Code", type: "text" },
      { id: "first_name", label: "First Name", type: "text" },
      { id: "last_name", label: "Last Name", type: "text" },
      { id: "email", label: "Email", type: "text" },
      { id: "department", label: "Department", type: "number" },
      { id: "position", label: "Position", type: "number" },
      { id: "status", label: "Status", type: "choice", choices: EMPLOYEE_STATUS_CHOICES },
      { id: "supervisor", label: "Supervisor", type: "number" },
      { id: "location", label: "Location", type: "number" },
    ],
    []
  );

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const data = await fetchEmployees({ filters, search: debouncedSearch || undefined });
        if (!cancelled) setEmployees(data.results ?? []);
      } catch (e: any) {
        if (!cancelled) {
          setToast({
            message: e?.response?.data?.detail || e?.message || "Failed to load employees.",
            variant: "error",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters, debouncedSearch]);

  return (
    <div className="flex-1 flex gap-4">
      <div className="flex flex-col gap-4 w-full">
        <ListPageHeader
          section="EMS"
          title="Employees"
          subtitle="Employee directory and quick access to records."
          right={
            <div className="flex items-center gap-2 text-xs">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-kk-muted" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-56 rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-8 py-1.5 text-xs"
                  placeholder="Search name or email"
                />
              </div>
              <FilterBar
                columns={filterColumns}
                filters={filters}
                showPills={false}
                onChange={setFilters}
              />
              {can("Employee", "create") && (
                <button
                  onClick={() => navigate("/ems/employees/new")}
                  className="new inline-flex items-center gap-1 rounded-full"
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
              )}
            </div>
          }
          below={
            <FilterBar
              columns={filterColumns}
              filters={filters}
              showTrigger={false}
              onChange={setFilters}
            />
          }
        />

        <div className="overflow-hidden px-4">
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Position</th>
                <th>Supervisor</th>
                <th>Status</th>
                <th>Location</th>
                <th>Rate</th>
                <th>Start Date</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((e) => {
                const name = [e.first_name, e.last_name].filter(Boolean).join(" ").trim() || `#${e.id}`;
                const statusLabel = e.status_name || e.status_value || (e.status ? String(e.status) : "-");
                return (
                  <tr
                    key={e.id}
                    className="cursor-pointer hover:bg-kk-dark-bg-elevated"
                    onClick={() => navigate(`/ems/employees/${e.id}`)}
                  >
                    <td>{name}</td>
                    <td>{e.department_name || "-"}</td>
                    <td>{e.position_name || "-"}</td>
                    <td>{e.supervisor_name || "-"}</td>
                    <td>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                          statusLabel === "Active" || statusLabel === "ACTIVE"
                            ? "bg-emerald-700 text-emerald-100"
                            : "bg-slate-400 text-slate-50"
                        }`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td>{e.primary_location_name || "-"}</td>
                    <td>
                      {e.rate_amount != null ? `NGN ${formatMoney(e.rate_amount)}` : "-"} {e.rate_term_name ? `/${e.rate_term_name}` : ""}
                    </td>
                    <td>{e.start_date || e.hire_date || "-"}</td>
                  </tr>
                );
              })}
              {loading && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-xs text-kk-dark-text-muted">
                    Loading employees...
                  </td>
                </tr>
              )}
              {!loading && !employees.length && (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-xs text-kk-dark-text-muted">
                    No employees yet. Click "New" to create the first record.
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
