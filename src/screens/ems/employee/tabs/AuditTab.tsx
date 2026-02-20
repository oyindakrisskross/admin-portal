import React, { useEffect, useState } from "react";

import {
  fetchAdvances,
  fetchApprovalHistory,
  fetchAuditLogs,
  fetchOvertime,
  fetchSuspensions,
  fetchTimeOff,
} from "../../../../api/ems";
import type { ApprovalHistory, AuditLog } from "../../../../types/ems";
import { formatDateTime } from "../employeeUtils";

export const AuditTab: React.FC<{ employeeId: number }> = ({ employeeId }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [approvals, setApprovals] = useState<ApprovalHistory[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const auditRes = await fetchAuditLogs({ employee: employeeId });
        setLogs(auditRes.results ?? []);
      } catch {
        setLogs([]);
      }
    })();
  }, [employeeId]);

  useEffect(() => {
    (async () => {
      try {
        const [timeOff, overtime, advances, suspensions, approvalsRes] = await Promise.all([
          fetchTimeOff({ filters: { clauses: [{ field: "employee", operator: "=", value: employeeId }] } }),
          fetchOvertime({ filters: { clauses: [{ field: "employee", operator: "=", value: employeeId }] } }),
          fetchAdvances({ filters: { clauses: [{ field: "employee", operator: "=", value: employeeId }] } }),
          fetchSuspensions(employeeId),
          fetchApprovalHistory({}),
        ]);

        const timeOffIds = new Set((timeOff.results ?? []).map((r: any) => r.id));
        const overtimeIds = new Set((overtime.results ?? []).map((r: any) => r.id));
        const advanceIds = new Set((advances.results ?? []).map((r: any) => r.id));
        const suspensionIds = new Set((suspensions.results ?? []).map((r: any) => r.id));

        const filtered = (approvalsRes.results ?? []).filter((row: ApprovalHistory) => {
          if (row.entity_type === "TIME_OFF") return timeOffIds.has(row.entity_id);
          if (row.entity_type === "OVERTIME") return overtimeIds.has(row.entity_id);
          if (row.entity_type === "ADVANCE") return advanceIds.has(row.entity_id);
          if (row.entity_type === "SUSPENSION") return suspensionIds.has(row.entity_id);
          return false;
        });

        setApprovals(filtered);
      } catch {
        setApprovals([]);
      }
    })();
  }, [employeeId]);

  return (
    <div className="px-6 py-6 flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold mb-3">Audit Log</h3>
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((row) => (
              <tr key={row.id}>
                <td>{formatDateTime(row.created_at)}</td>
                <td>{row.actor_email || row.actor || "-"}</td>
                <td>{row.action}</td>
                <td>{row.entity_type} #{row.entity_id}</td>
                <td className="text-kk-dark-text-muted text-[10px]">{row.metadata ? JSON.stringify(row.metadata) : "-"}</td>
              </tr>
            ))}
            {!logs.length && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-kk-dark-text-muted">No audit activity.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Approval History</h3>
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Entity</th>
              <th>Action</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {approvals.map((row) => (
              <tr key={row.id}>
                <td>{formatDateTime(row.acted_on)}</td>
                <td>{row.actor_email || row.actor || "-"}</td>
                <td>{row.entity_type} #{row.entity_id}</td>
                <td>{row.action}</td>
                <td>{row.note || "-"}</td>
              </tr>
            ))}
            {!approvals.length && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-kk-dark-text-muted">No approvals recorded.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
