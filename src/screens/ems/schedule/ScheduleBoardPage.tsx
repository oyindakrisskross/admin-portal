import React, { useEffect, useMemo, useState } from "react";

import { createShiftOverride, fetchDepartments, fetchEmployees, fetchShiftInstances } from "../../../api/ems";
import { fetchLocations } from "../../../api/location";
import type { Department, Employee, ShiftInstance } from "../../../types/ems";
import type { Location } from "../../../types/location";
import { useAuth } from "../../../auth/AuthContext";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import SidePeek from "../../../components/layout/SidePeek";
import ToastModal from "../../../components/ui/ToastModal";

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value: string) => {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfWeek = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
};

const endOfWeek = (date: Date) => addDays(startOfWeek(date), 6);

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const formatShiftTime = (inst: ShiftInstance) => {
  if (inst.shift_start && inst.shift_end) return `${inst.shift_start} - ${inst.shift_end}`;
  if (inst.shift_start) return inst.shift_start;
  if (inst.shift_end) return inst.shift_end;
  return "-";
};

const COLOR_PALETTE = [
  { solid: "#22c55e", soft: "rgba(34,197,94,0.16)" },
  { solid: "#3b82f6", soft: "rgba(59,130,246,0.16)" },
  { solid: "#f59e0b", soft: "rgba(245,158,11,0.16)" },
  { solid: "#ef4444", soft: "rgba(239,68,68,0.16)" },
  { solid: "#14b8a6", soft: "rgba(20,184,166,0.16)" },
  { solid: "#8b5cf6", soft: "rgba(139,92,246,0.16)" },
  { solid: "#f97316", soft: "rgba(249,115,22,0.16)" },
  { solid: "#84cc16", soft: "rgba(132,204,22,0.16)" },
];

export const ScheduleBoardPage: React.FC = () => {
  const today = useMemo(() => new Date(), []);
  const { can } = useAuth();
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [mode, setMode] = useState<"list" | "calendar">("calendar");
  const [colorBy, setColorBy] = useState<"none" | "location" | "department">("location");
  const [anchor, setAnchor] = useState(toDateInput(today));
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("");
  const [instances, setInstances] = useState<ShiftInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [draggedShift, setDraggedShift] = useState<ShiftInstance | null>(null);
  const [dragOriginDate, setDragOriginDate] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const baseDate = useMemo(() => parseDateInput(anchor) ?? today, [anchor, today]);
  const employeeById = useMemo(() => {
    const map = new Map<number, Employee>();
    employees.forEach((emp) => {
      if (emp.id != null) map.set(emp.id, emp);
    });
    return map;
  }, [employees]);

  const getAccent = (inst: ShiftInstance) => {
    if (colorBy === "none") return null;
    let key: number | null | undefined = inst.location_id;
    if (colorBy === "department") {
      key = employeeById.get(inst.employee_id)?.department ?? null;
    }
    if (!key) return null;
    const idx = Math.abs(key) % COLOR_PALETTE.length;
    return COLOR_PALETTE[idx];
  };

  useEffect(() => {
    (async () => {
      try {
        const [empRes, deptRes, locRes] = await Promise.all([
          fetchEmployees(),
          fetchDepartments(),
          fetchLocations(),
        ]);
        setEmployees(empRes.results ?? []);
        setDepartments(deptRes.results ?? []);
        setLocations(locRes.results ?? []);
      } catch (e: any) {
        setToast({
          message: e?.response?.data?.detail || e?.message || "Failed to load schedule filters.",
          variant: "error",
        });
      }
    })();
  }, []);

  const dateRange = useMemo(() => {
    if (view === "day") {
      return { start: baseDate, end: baseDate };
    }
    if (view === "month") {
      return { start: startOfMonth(baseDate), end: endOfMonth(baseDate) };
    }
    return { start: startOfWeek(baseDate), end: endOfWeek(baseDate) };
  }, [baseDate, view]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const data = await fetchShiftInstances({
          start: toDateInput(dateRange.start),
          end: toDateInput(dateRange.end),
          employee_id: employeeId ? Number(employeeId) : undefined,
          location_id: locationId ? Number(locationId) : undefined,
          department_id: departmentId ? Number(departmentId) : undefined,
        });
        if (!cancelled) setInstances(data ?? []);
      } catch (e: any) {
        if (!cancelled) {
          setToast({
            message: e?.response?.data?.detail || e?.message || "Failed to load schedule instances.",
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
  }, [dateRange.end, dateRange.start, departmentId, employeeId, locationId]);

  const dates = useMemo(() => {
    const days: string[] = [];
    let cursor = new Date(dateRange.start);
    while (cursor <= dateRange.end) {
      days.push(toDateInput(cursor));
      cursor = addDays(cursor, 1);
    }
    return days;
  }, [dateRange.end, dateRange.start]);

  const grouped = useMemo(() => {
    const byDate: Record<string, ShiftInstance[]> = {};
    for (const inst of instances) {
      const key = typeof inst.date === "string" ? inst.date : String(inst.date);
      if (!byDate[key]) byDate[key] = [];
      byDate[key].push(inst);
    }
    return byDate;
  }, [instances]);

  const selectedRows = selectedDate ? grouped[selectedDate] ?? [] : [];

  const handleDropShift = async (targetDate: string) => {
    if (!draggedShift || !dragOriginDate) return;
    if (targetDate === dragOriginDate) return;
    if (!can("Employee", "edit")) {
      setToast({ message: "You don't have permission to adjust schedules.", variant: "error" });
      return;
    }
    if (!draggedShift.shift_start && !draggedShift.shift_end) {
      setToast({ message: "This shift has no time range to copy.", variant: "error" });
      return;
    }
    if (!window.confirm(`Add this shift on ${targetDate}? (Original on ${dragOriginDate} stays)`)) {
      return;
    }
    try {
      await createShiftOverride({
        employee: draggedShift.employee_id,
        location: draggedShift.location_id,
        shift_date: targetDate,
        shift_start: draggedShift.shift_start,
        shift_end: draggedShift.shift_end,
        override_type: "ADD",
        note: `Copied from ${dragOriginDate}`,
      } as any);
      const data = await fetchShiftInstances({
        start: toDateInput(dateRange.start),
        end: toDateInput(dateRange.end),
        employee_id: employeeId ? Number(employeeId) : undefined,
        location_id: locationId ? Number(locationId) : undefined,
        department_id: departmentId ? Number(departmentId) : undefined,
      });
      setInstances(data ?? []);
      setToast({ message: "Override added.", variant: "success" });
    } catch (e: any) {
      setToast({
        message: e?.response?.data?.detail || e?.message || "Failed to add override.",
        variant: "error",
      });
    } finally {
      setDraggedShift(null);
      setDragOriginDate(null);
      setDragOverDate(null);
    }
  };

  const calendarDates = useMemo(() => {
    if (view !== "month") return dates;
    const start = startOfWeek(startOfMonth(baseDate));
    const end = endOfWeek(endOfMonth(baseDate));
    const days: string[] = [];
    let cursor = new Date(start);
    while (cursor <= end) {
      days.push(toDateInput(cursor));
      cursor = addDays(cursor, 1);
    }
    return days;
  }, [baseDate, dates, view]);

  const monthRows = useMemo(() => {
    if (view !== "month") return [];
    const rows: string[][] = [];
    for (let i = 0; i < calendarDates.length; i += 7) {
      rows.push(calendarDates.slice(i, i + 7));
    }
    return rows;
  }, [calendarDates, view]);

  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="flex-1 flex gap-4">
      <div className="flex flex-col gap-4 w-full">
        <ListPageHeader
          section="EMS"
          title="Schedule Board"
          subtitle="Recurring shifts and overrides by location and department."
          right={
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1"
                value={view}
                onChange={(e) => setView(e.target.value as any)}
              >
                <option value="day">Day</option>
                <option value="week">Week</option>
                <option value="month">Month</option>
              </select>
              <select
                className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1"
                value={colorBy}
                onChange={(e) => setColorBy(e.target.value as any)}
              >
                <option value="none">Color: None</option>
                <option value="location">Color: Location</option>
                <option value="department">Color: Department</option>
              </select>
              <div className="inline-flex overflow-hidden rounded-full border border-kk-dark-border">
                <button
                  type="button"
                  onClick={() => setMode("list")}
                  className={`px-3 py-1 ${mode === "list" ? "bg-kk-dark-bg-elevated text-white" : "text-kk-dark-text-muted"}`}
                >
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setMode("calendar")}
                  className={`px-3 py-1 ${mode === "calendar" ? "bg-kk-dark-bg-elevated text-white" : "text-kk-dark-text-muted"}`}
                >
                  Calendar
                </button>
              </div>
              <input
                type="date"
                className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1"
                value={anchor}
                onChange={(e) => setAnchor(e.target.value)}
              />
              <select
                className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                <option value="">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              <select
                className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-2 py-1"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
              >
                <option value="">All Employees</option>
                {employees.map((emp) => {
                  const name = [emp.first_name, emp.last_name].filter(Boolean).join(" ").trim();
                  return (
                    <option key={emp.id} value={emp.id}>
                      {name || `#${emp.id}`}
                    </option>
                  );
                })}
              </select>
            </div>
          }
        />

        {mode === "list" ? (
          <div className="overflow-hidden px-4">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Shifts</th>
                </tr>
              </thead>
              <tbody>
                {dates.map((date) => {
                  const rows = grouped[date] ?? [];
                  return (
                    <tr key={date}>
                      <td className="align-top">{date}</td>
                      <td>
                        {rows.length ? (
                          <div className="flex flex-col gap-2">
                            {rows.map((inst, idx) => (
                              <div
                                key={`${inst.employee_id}-${inst.location_id}-${idx}`}
                                className="flex flex-wrap items-center gap-2 rounded-md border border-kk-dark-border px-3 py-2 text-xs"
                              >
                                <span className="font-medium">{inst.employee_name || `#${inst.employee_id}`}</span>
                                <span className="text-kk-dark-text-muted">@ {inst.location_name}</span>
                                <span>{inst.shift_start || "-"} - {inst.shift_end || "-"}</span>
                                {inst.source === "OVERRIDE" && (
                                  <span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[10px] uppercase text-purple-200">
                                    {inst.override_type || "Override"}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-kk-dark-text-muted">No shifts</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {loading && (
                  <tr>
                    <td colSpan={2} className="px-3 py-6 text-center text-xs text-kk-dark-text-muted">
                      Loading schedule...
                    </td>
                  </tr>
                )}
                {!loading && !dates.length && (
                  <tr>
                    <td colSpan={2} className="px-3 py-10 text-center text-xs text-kk-dark-text-muted">
                      No dates selected.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : view === "month" ? (
          <div className="px-4">
            <div className="overflow-x-auto">
              <div className="min-w-[900px] overflow-hidden rounded-xl border border-kk-dark-border">
                <div className="grid grid-cols-7 bg-kk-dark-bg-elevated px-2 py-2 text-[10px] uppercase text-kk-dark-text-muted">
                  {weekdayLabels.map((label) => (
                    <div key={label} className="px-1">
                      {label}
                    </div>
                  ))}
                </div>
                {monthRows.map((week, idx) => (
                  <div key={`week-${idx}`} className="grid grid-cols-7 border-t border-kk-dark-border">
                    {week.map((date) => {
                      const rows = grouped[date] ?? [];
                      const dateObj = parseDateInput(date);
                      const isOutsideMonth = dateObj ? dateObj.getMonth() !== baseDate.getMonth() : false;
                      const isToday = date === toDateInput(today);
                      const dayLabel = dateObj ? String(dateObj.getDate()) : date;
                      const maxItems = 5;
                      const visible = rows.slice(0, maxItems);
                      const hiddenCount = rows.length - visible.length;
                      return (
                        <div
                          key={date}
                          onClick={() => {
                            if (draggedShift) return;
                            setSelectedDate(date);
                          }}
                          onDragOver={(e) => {
                            if (!draggedShift) return;
                            e.preventDefault();
                            setDragOverDate(date);
                          }}
                          onDragEnter={() => {
                            if (!draggedShift) return;
                            setDragOverDate(date);
                          }}
                          onDragLeave={() => {
                            setDragOverDate((prev) => (prev === date ? null : prev));
                          }}
                          onDrop={(e) => {
                            if (!draggedShift) return;
                            e.preventDefault();
                            void handleDropShift(date);
                          }}
                          className={`min-h-[160px] border-r border-kk-dark-border bg-kk-dark-bg p-2 last:border-r-0 ${
                            isOutsideMonth ? "opacity-50" : ""
                          } ${isToday ? "ring-1 ring-emerald-500/40" : ""} ${
                            dragOverDate === date ? "ring-2 ring-emerald-400/60" : ""
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-semibold ${isToday ? "text-emerald-400" : ""}`}>
                              {dayLabel}
                            </span>
                            <span className="text-[10px] text-kk-dark-text-muted">{rows.length} shifts</span>
                          </div>
                          <div className="mt-2 flex max-h-[110px] flex-col gap-2 overflow-hidden">
                            {rows.length ? (
                              visible.map((inst, rowIdx) => {
                                const accent = getAccent(inst);
                                return (
                                  <div
                                    key={`${inst.employee_id}-${inst.location_id}-${rowIdx}`}
                                    draggable={can("Employee", "edit")}
                                    onDragStart={(e) => {
                                      if (!can("Employee", "edit")) return;
                                      e.dataTransfer.effectAllowed = "move";
                                      try {
                                        e.dataTransfer.setData("text/plain", "shift");
                                      } catch {}
                                      setDraggedShift(inst);
                                      setDragOriginDate(date);
                                    }}
                                    onDragEnd={() => {
                                      setDraggedShift(null);
                                      setDragOriginDate(null);
                                      setDragOverDate(null);
                                    }}
                                    className={`rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated/60 px-2 py-1 text-[10px] ${
                                      accent ? "border-l-4" : ""
                                    } ${can("Employee", "edit") ? "cursor-grab active:cursor-grabbing" : ""}`}
                                    style={
                                      accent
                                        ? { borderLeftColor: accent.solid, backgroundColor: accent.soft }
                                        : undefined
                                    }
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-medium truncate">
                                        {inst.employee_name || `#${inst.employee_id}`}
                                      </span>
                                      <span className="shrink-0 text-[9px] text-kk-dark-text-muted">
                                        {formatShiftTime(inst)}
                                      </span>
                                    </div>
                                    <div className="text-[9px] text-kk-dark-text-muted truncate">
                                      {inst.location_name || "-"}
                                    </div>
                                    {inst.source === "OVERRIDE" && (
                                      <span className="mt-1 inline-block rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] uppercase text-purple-200">
                                        {inst.override_type || "Override"}
                                      </span>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-[10px] text-kk-dark-text-muted">No shifts</div>
                            )}
                            {hiddenCount > 0 && (
                              <span className="text-[10px] text-kk-dark-text-muted">+{hiddenCount} more</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            {loading && (
              <div className="px-3 py-6 text-center text-xs text-kk-dark-text-muted">Loading schedule...</div>
            )}
            {!loading && !calendarDates.length && (
              <div className="px-3 py-10 text-center text-xs text-kk-dark-text-muted">No dates selected.</div>
            )}
          </div>
        ) : (
          <div className="px-4">
            <div className={`grid gap-2 ${view === "day" ? "grid-cols-1" : "grid-cols-7"}`}>
              {view !== "day" &&
                weekdayLabels.map((label) => (
                  <div key={label} className="text-[10px] uppercase text-kk-dark-text-muted">
                    {label}
                  </div>
                ))}
              {calendarDates.map((date) => {
                const rows = grouped[date] ?? [];
                const dateObj = parseDateInput(date);
                const isOutsideMonth =
                  view === "month" && dateObj ? dateObj.getMonth() !== baseDate.getMonth() : false;
                const isToday = date === toDateInput(today);
                const dateLabel = view === "month" && dateObj ? dateObj.getDate() : date;
                const maxItems = view === "month" ? 3 : 6;
                const visible = rows.slice(0, maxItems);
                const hiddenCount = rows.length - visible.length;
                return (
                  <div
                    key={date}
                    onClick={() => {
                      if (draggedShift) return;
                      setSelectedDate(date);
                    }}
                    onDragOver={(e) => {
                      if (!draggedShift) return;
                      e.preventDefault();
                      setDragOverDate(date);
                    }}
                    onDragEnter={() => {
                      if (!draggedShift) return;
                      setDragOverDate(date);
                    }}
                    onDragLeave={() => {
                      setDragOverDate((prev) => (prev === date ? null : prev));
                    }}
                    onDrop={(e) => {
                      if (!draggedShift) return;
                      e.preventDefault();
                      void handleDropShift(date);
                    }}
                    className={`min-h-[120px] rounded-lg border border-kk-dark-border bg-kk-dark-bg p-2 ${
                      isOutsideMonth ? "opacity-50" : ""
                    } ${isToday ? "ring-1 ring-emerald-500/40" : ""} ${dragOverDate === date ? "ring-2 ring-emerald-400/60" : ""}`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-kk-dark-text-muted">
                      <span>{dateLabel}</span>
                      <span className="rounded-full bg-kk-dark-bg-elevated px-2 py-0.5 text-[10px]">
                        {rows.length}
                      </span>
                    </div>
                    {rows.length ? (
                      <div className="mt-2 flex flex-col gap-2">
                        {visible.map((inst, idx) => {
                          const accent = getAccent(inst);
                          return (
                            <div
                              key={`${inst.employee_id}-${inst.location_id}-${idx}`}
                              draggable={can("Employee", "edit")}
                              onDragStart={(e) => {
                                if (!can("Employee", "edit")) return;
                                e.dataTransfer.effectAllowed = "move";
                                try {
                                  e.dataTransfer.setData("text/plain", "shift");
                                } catch {}
                                setDraggedShift(inst);
                                setDragOriginDate(date);
                              }}
                              onDragEnd={() => {
                                setDraggedShift(null);
                                setDragOriginDate(null);
                                setDragOverDate(null);
                              }}
                              className={`rounded-md border border-kk-dark-border px-2 py-1 text-[10px] ${
                                accent ? "border-l-4" : ""
                              } ${can("Employee", "edit") ? "cursor-grab active:cursor-grabbing" : ""}`}
                              style={
                                accent
                                  ? { borderLeftColor: accent.solid, backgroundColor: accent.soft }
                                  : undefined
                              }
                            >
                              <div className="font-medium">{inst.employee_name || `#${inst.employee_id}`}</div>
                              <div className="text-kk-dark-text-muted">{inst.location_name}</div>
                              <div>{inst.shift_start || "-"} - {inst.shift_end || "-"}</div>
                              {inst.source === "OVERRIDE" && (
                                <span className="mt-1 inline-block rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] uppercase text-purple-200">
                                  {inst.override_type || "Override"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                        {hiddenCount > 0 && (
                          <span className="text-[10px] text-kk-dark-text-muted">+{hiddenCount} more</span>
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 text-[10px] text-kk-dark-text-muted">No shifts</div>
                    )}
                  </div>
                );
              })}
            </div>
            {loading && (
              <div className="px-3 py-6 text-center text-xs text-kk-dark-text-muted">Loading schedule...</div>
            )}
            {!loading && !calendarDates.length && (
              <div className="px-3 py-10 text-center text-xs text-kk-dark-text-muted">No dates selected.</div>
            )}
          </div>
        )}
      </div>

      {selectedDate && (
        <SidePeek
          isOpen={Boolean(selectedDate)}
          onClose={() => setSelectedDate(null)}
          widthClass="w-[420px]"
          actions={
            <div className="flex flex-col">
              <span className="text-[10px] uppercase text-kk-dark-text-muted">Day Detail</span>
              <span className="text-sm font-semibold">{selectedDate}</span>
              <span className="text-[11px] text-kk-dark-text-muted">
                {selectedRows.length} shift{selectedRows.length === 1 ? "" : "s"}
              </span>
            </div>
          }
        >
          {selectedRows.length ? (
            <div className="flex flex-col gap-3">
              {selectedRows.map((inst, idx) => {
                const accent = getAccent(inst);
                return (
                  <div
                    key={`${inst.employee_id}-${inst.location_id}-${idx}`}
                    className={`rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated px-3 py-2 text-xs ${
                      accent ? "border-l-4" : ""
                    }`}
                    style={
                      accent ? { borderLeftColor: accent.solid, backgroundColor: accent.soft } : undefined
                    }
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{inst.employee_name || `#${inst.employee_id}`}</span>
                      <span className="text-[11px] text-kk-dark-text-muted">{formatShiftTime(inst)}</span>
                    </div>
                    <div className="text-[11px] text-kk-dark-text-muted">{inst.location_name || "-"}</div>
                    {inst.source === "OVERRIDE" && (
                      <span className="mt-1 inline-block rounded-full bg-purple-500/20 px-2 py-0.5 text-[9px] uppercase text-purple-200">
                        {inst.override_type || "Override"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-kk-dark-text-muted">No shifts scheduled.</div>
          )}
        </SidePeek>
      )}

      <ToastModal message={toast?.message ?? null} onClose={() => setToast(null)} variant={toast?.variant ?? "error"} />
    </div>
  );
};
