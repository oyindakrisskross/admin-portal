import React from "react";

import type { Employee } from "../../../../types/ems";
import DetailSection from "../../../../components/detail/DetailSection";
import DetailField from "../../../../components/detail/DetailField";
import { formatDate, money } from "../employeeUtils";

export const ProfileTab: React.FC<{ employee: Employee }> = ({ employee }) => {
  const name = [employee.first_name, employee.last_name].filter(Boolean).join(" ").trim();
  const locations = employee.locations ?? [];

  return (
    <div className="px-6 py-6 grid grid-cols-12 gap-6">
      <div className="col-span-6">
        <DetailSection title="Personal">
          <DetailField label="Name" value={name || "-"} />
          <DetailField label="Email" value={employee.email || "-"} />
          <DetailField label="Phone" value={employee.phone || "-"} />
          <DetailField label="Employee Code" value={employee.employee_code || "-"} />
        </DetailSection>

        <DetailSection title="Employment">
          <DetailField label="Department" value={employee.department_name || "-"} />
          <DetailField label="Position" value={employee.position_name || "-"} />
          <DetailField label="Supervisor" value={employee.supervisor_name || "-"} />
          <DetailField label="Status" value={employee.status_name || employee.status_value || "-"} />
          <DetailField label="Hire Date" value={formatDate(employee.hire_date)} />
          <DetailField label="Start Date" value={formatDate(employee.start_date)} />
          <DetailField label="End Date" value={formatDate(employee.end_date)} />
        </DetailSection>
      </div>

      <div className="col-span-6">
        <DetailSection title="Pay & Schedule">
          <DetailField
            label="Rate"
            value={employee.rate_amount != null ? `NGN ${money(employee.rate_amount)}` : "-"}
          />
          <DetailField label="Rate Term" value={employee.rate_term_name || employee.rate_term_value || "-"} />
          <DetailField label="Daily Hours" value={employee.standard_daily_hours ?? "-"} />
          <DetailField
            label="Overtime Eligible"
            value={employee.overtime_eligible ? "Yes" : "No"}
          />
          <DetailField
            label="Workdays"
            value={(employee.work_pattern_weekdays ?? []).join(", ") || "-"}
          />
        </DetailSection>

        <DetailSection title="Locations">
          {locations.length ? (
            <div className="flex flex-col gap-2">
              {locations.map((loc) => (
                <div key={loc.id} className="flex items-center justify-between rounded-md border border-kk-dark-border px-3 py-2 text-xs">
                  <span>{loc.location_name || `#${loc.location}`}</span>
                  {loc.is_primary && (
                    <span className="rounded-full bg-emerald-700/30 px-2 py-0.5 text-[10px] text-emerald-100">Primary</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-kk-dark-text-muted">No assigned locations.</div>
          )}
        </DetailSection>

        <DetailSection title="Balances">
          <DetailField label="PTO Used" value={employee.pto_used_days ?? "-"} />
          <DetailField label="Sick Used" value={employee.sick_used_days ?? "-"} />
        </DetailSection>
      </div>

      <div className="col-span-12">
        <DetailSection title="Compensation History">
          {employee.compensation_history?.length ? (
            <table className="min-w-full text-xs">
              <thead>
                <tr>
                  <th>Effective From</th>
                  <th>Effective To</th>
                  <th>Rate</th>
                  <th>Term</th>
                  <th>Changed By</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {employee.compensation_history.map((row) => (
                  <tr key={row.id}>
                    <td>{row.effective_from}</td>
                    <td>{row.effective_to || "-"}</td>
                    <td>NGN {money(row.rate_amount)}</td>
                    <td>{row.rate_term_name || row.rate_term_value || "-"}</td>
                    <td>{row.changed_by_email || row.changed_by || "-"}</td>
                    <td>{row.change_reason || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-xs text-kk-dark-text-muted">No compensation history yet.</div>
          )}
        </DetailSection>
      </div>
    </div>
  );
};
