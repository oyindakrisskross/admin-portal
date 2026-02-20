import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

import { useAuth } from "../../../auth/AuthContext";
import { fetchEmployee } from "../../../api/ems";
import { fetchLocations } from "../../../api/location";
import type { Employee } from "../../../types/ems";
import type { Location } from "../../../types/location";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import { TabNav } from "../../../components/layout/TabNav";
import ToastModal from "../../../components/ui/ToastModal";

import { ProfileTab } from "./tabs/ProfileTab";
import { ScheduleTab } from "./tabs/ScheduleTab";
import { AttendanceTab } from "./tabs/AttendanceTab";
import { TimeOffTab } from "./tabs/TimeOffTab";
import { OvertimeTab } from "./tabs/OvertimeTab";
import { PayrollTab } from "./tabs/PayrollTab";
import { AdvancesTab } from "./tabs/AdvancesTab";
import { WalletTab } from "./tabs/WalletTab";
import { NotesTab } from "./tabs/NotesTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import { SuspensionsTab } from "./tabs/SuspensionsTab";
import { AuditTab } from "./tabs/AuditTab";

type TabKey =
  | "profile"
  | "schedule"
  | "attendance"
  | "timeoff"
  | "overtime"
  | "payroll"
  | "advances"
  | "wallet"
  | "notes"
  | "documents"
  | "suspensions"
  | "audit";

export default function EmployeeDetailPage() {
  const { can } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const employeeId = Number(id);

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("profile");
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [emp, locRes] = await Promise.all([
          fetchEmployee(employeeId),
          fetchLocations(),
        ]);
        if (!cancelled) {
          setEmployee(emp);
          setLocations(locRes.results ?? []);
        }
      } catch (e: any) {
        if (!cancelled) {
          setToast({
            message: e?.response?.data?.detail || e?.message || "Failed to load employee.",
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
  }, [employeeId]);

  if (loading) {
    return <div className="p-6 text-sm">Loading employee...</div>;
  }

  if (!employee) {
    return <div className="p-6 text-sm">Employee not found.</div>;
  }

  const name = [employee.first_name, employee.last_name].filter(Boolean).join(" ").trim() || `Employee #${employee.id}`;

  return (
    <div className="flex flex-col">
      <ListPageHeader
        section="EMS"
        title={name}
        subtitle={employee.position_name || employee.department_name || "Employee profile"}
        right={
          <div className="flex items-center gap-2">
            {can("Employee", "edit") && (
              <button
                onClick={() => navigate(`/ems/employees/${employee.id}/edit`)}
                className="inline-flex items-center gap-1 rounded-full border border-kk-dark-border px-3 py-1 text-xs"
              >
                <PencilSquareIcon className="h-4 w-4" />
                Edit
              </button>
            )}
          </div>
        }
      />

      <div className="px-6 pt-4 pb-2 border-b border-kk-dark-border flex flex-wrap gap-4 text-sm">
        <TabNav action={() => setTab("profile")} isActive={tab === "profile"}>Profile</TabNav>
        <TabNav action={() => setTab("schedule")} isActive={tab === "schedule"}>Schedule</TabNav>
        <TabNav action={() => setTab("attendance")} isActive={tab === "attendance"}>Attendance</TabNav>
        <TabNav action={() => setTab("timeoff")} isActive={tab === "timeoff"}>Time Off</TabNav>
        <TabNav action={() => setTab("overtime")} isActive={tab === "overtime"}>Overtime</TabNav>
        <TabNav action={() => setTab("payroll")} isActive={tab === "payroll"}>Payroll</TabNav>
        <TabNav action={() => setTab("advances")} isActive={tab === "advances"}>Advances</TabNav>
        <TabNav action={() => setTab("wallet")} isActive={tab === "wallet"}>Wallet</TabNav>
        <TabNav action={() => setTab("notes")} isActive={tab === "notes"}>Notes</TabNav>
        <TabNav action={() => setTab("documents")} isActive={tab === "documents"}>Documents</TabNav>
        <TabNav action={() => setTab("suspensions")} isActive={tab === "suspensions"}>Suspensions</TabNav>
        <TabNav action={() => setTab("audit")} isActive={tab === "audit"}>Audit Log</TabNav>
      </div>

      {tab === "profile" && <ProfileTab employee={employee} />}
      {tab === "schedule" && <ScheduleTab employeeId={employeeId} locations={locations} />}
      {tab === "attendance" && <AttendanceTab employeeId={employeeId} locations={locations} />}
      {tab === "timeoff" && <TimeOffTab employeeId={employeeId} />}
      {tab === "overtime" && <OvertimeTab employeeId={employeeId} locations={locations} />}
      {tab === "payroll" && <PayrollTab employeeId={employeeId} />}
      {tab === "advances" && <AdvancesTab employeeId={employeeId} />}
      {tab === "wallet" && <WalletTab employeeId={employeeId} locations={locations} />}
      {tab === "notes" && <NotesTab employeeId={employeeId} />}
      {tab === "documents" && <DocumentsTab employeeId={employeeId} />}
      {tab === "suspensions" && <SuspensionsTab employeeId={employeeId} />}
      {tab === "audit" && <AuditTab employeeId={employeeId} />}

      <ToastModal message={toast?.message ?? null} onClose={() => setToast(null)} variant={toast?.variant ?? "error"} />
    </div>
  );
}
