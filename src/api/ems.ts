import api from "./client";
import { buildQueryPath } from "./query";
import type { PaginatedResult } from "./types";
import type { FilterSet } from "../types/filters";
import type * as EMS from "../types/ems";

// Departments
export async function fetchDepartments(params?: { filters?: FilterSet }) {
  const res = await api.get<PaginatedResult<EMS.Department>>(
    buildQueryPath("/api/ems/departments/", {
      filters: params?.filters,
    })
  );
  return res.data;
}

export async function fetchDepartment(id: number) {
  const res = await api.get<EMS.Department>(`/api/ems/departments/${id}/`);
  return res.data;
}

export async function createDepartment(payload: EMS.Department) {
  const res = await api.post<EMS.Department>("/api/ems/departments/", payload);
  return res.data;
}

export async function updateDepartment(id: number, payload: Partial<EMS.Department>) {
  const res = await api.patch<EMS.Department>(`/api/ems/departments/${id}/`, payload);
  return res.data;
}

export async function deleteDepartment(id: number) {
  await api.delete(`/api/ems/departments/${id}/`);
}

// Positions
export async function fetchPositions(params?: { filters?: FilterSet }) {
  const res = await api.get<PaginatedResult<EMS.JobPosition>>(
    buildQueryPath("/api/ems/positions/", {
      filters: params?.filters,
    })
  );
  return res.data;
}

export async function fetchPosition(id: number) {
  const res = await api.get<EMS.JobPosition>(`/api/ems/positions/${id}/`);
  return res.data;
}

export async function createPosition(payload: EMS.JobPosition) {
  const res = await api.post<EMS.JobPosition>("/api/ems/positions/", payload);
  return res.data;
}

export async function updatePosition(id: number, payload: Partial<EMS.JobPosition>) {
  const res = await api.patch<EMS.JobPosition>(`/api/ems/positions/${id}/`, payload);
  return res.data;
}

export async function deletePosition(id: number) {
  await api.delete(`/api/ems/positions/${id}/`);
}

// Employees
export async function fetchEmployees(params?: { filters?: FilterSet; search?: string }) {
  const res = await api.get<PaginatedResult<EMS.Employee>>(
    buildQueryPath("/api/ems/employees/", {
      params: { search: params?.search },
      filters: params?.filters,
    })
  );
  return res.data;
}

export async function fetchEmployee(id: number) {
  const res = await api.get<EMS.Employee>(`/api/ems/employees/${id}/`);
  return res.data;
}

export async function createEmployee(payload: EMS.Employee) {
  const res = await api.post<EMS.Employee>("/api/ems/employees/", payload);
  return res.data;
}

export async function updateEmployee(id: number, payload: Partial<EMS.Employee>) {
  const res = await api.patch<EMS.Employee>(`/api/ems/employees/${id}/`, payload);
  return res.data;
}

export async function deleteEmployee(id: number) {
  await api.delete(`/api/ems/employees/${id}/`);
}

export async function fetchEmployeeLocations(employeeId: number) {
  const res = await api.get<PaginatedResult<EMS.EmployeeLocationAssignment>>(
    `/api/ems/employee-locations/?employee=${employeeId}`
  );
  return res.data;
}

// Shifts
export async function fetchShifts(params?: { filters?: FilterSet }) {
  const res = await api.get<PaginatedResult<EMS.EmployeeShift>>(
    buildQueryPath("/api/ems/shifts/", {
      filters: params?.filters,
    })
  );
  return res.data;
}

export async function createShift(payload: EMS.EmployeeShift) {
  const res = await api.post<EMS.EmployeeShift>("/api/ems/shifts/", payload);
  return res.data;
}

export async function updateShift(id: number, payload: Partial<EMS.EmployeeShift>) {
  const res = await api.patch<EMS.EmployeeShift>(`/api/ems/shifts/${id}/`, payload);
  return res.data;
}

export async function deleteShift(id: number) {
  await api.delete(`/api/ems/shifts/${id}/`);
}

export async function fetchShiftInstances(params: {
  start: string;
  end: string;
  employee_id?: number;
  location_id?: number;
  department_id?: number;
}) {
  const res = await api.get<EMS.ShiftInstance[]>(`/api/ems/shifts/instances/`, { params });
  return res.data;
}

// Shift overrides
export async function fetchShiftOverrides(params?: { filters?: FilterSet }) {
  const res = await api.get<PaginatedResult<EMS.EmployeeShiftOverride>>(
    buildQueryPath("/api/ems/shift-overrides/", {
      filters: params?.filters,
    })
  );
  return res.data;
}

export async function createShiftOverride(payload: EMS.EmployeeShiftOverride) {
  const res = await api.post<EMS.EmployeeShiftOverride>("/api/ems/shift-overrides/", payload);
  return res.data;
}

export async function updateShiftOverride(id: number, payload: Partial<EMS.EmployeeShiftOverride>) {
  const res = await api.patch<EMS.EmployeeShiftOverride>(`/api/ems/shift-overrides/${id}/`, payload);
  return res.data;
}

export async function deleteShiftOverride(id: number) {
  await api.delete(`/api/ems/shift-overrides/${id}/`);
}

// Time off
export async function fetchTimeOff(params?: { filters?: FilterSet }) {
  const res = await api.get<PaginatedResult<EMS.TimeOffRequest>>(
    buildQueryPath("/api/ems/time-off/", {
      filters: params?.filters,
    })
  );
  return res.data;
}

export async function createTimeOff(payload: EMS.TimeOffRequest) {
  const res = await api.post<EMS.TimeOffRequest>("/api/ems/time-off/", payload);
  return res.data;
}

export async function approveTimeOff(id: number, note?: string) {
  const res = await api.post<EMS.TimeOffRequest>(`/api/ems/time-off/${id}/approve/`, { note });
  return res.data;
}

export async function declineTimeOff(id: number, note?: string) {
  const res = await api.post<EMS.TimeOffRequest>(`/api/ems/time-off/${id}/decline/`, { note });
  return res.data;
}

export async function cancelTimeOff(id: number, note?: string) {
  const res = await api.post<EMS.TimeOffRequest>(`/api/ems/time-off/${id}/cancel/`, { note });
  return res.data;
}

// Attendance
export async function fetchAttendance(params?: { filters?: FilterSet }) {
  const res = await api.get<PaginatedResult<EMS.Attendance>>(
    buildQueryPath("/api/ems/attendance/", {
      filters: params?.filters,
    })
  );
  return res.data;
}

export async function createAttendance(payload: EMS.Attendance) {
  const res = await api.post<EMS.Attendance>("/api/ems/attendance/", payload);
  return res.data;
}

export async function editAttendance(id: number, payload: { new_values: Record<string, any>; reason: string }) {
  const res = await api.post<EMS.Attendance>(`/api/ems/attendance/${id}/edit/`, payload);
  return res.data;
}

export async function fetchAttendanceEdits(attendanceId: number) {
  const res = await api.get<PaginatedResult<EMS.AttendanceEdit>>(
    `/api/ems/attendance-edits/?attendance=${attendanceId}`
  );
  return res.data;
}

// Overtime
export async function fetchOvertime(params?: { filters?: FilterSet }) {
  const res = await api.get<PaginatedResult<EMS.Overtime>>(
    buildQueryPath("/api/ems/overtime/", {
      filters: params?.filters,
    })
  );
  return res.data;
}

export async function createOvertime(payload: EMS.Overtime) {
  const res = await api.post<EMS.Overtime>("/api/ems/overtime/", payload);
  return res.data;
}

export async function approveOvertime(id: number, note?: string) {
  const res = await api.post<EMS.Overtime>(`/api/ems/overtime/${id}/approve/`, { note });
  return res.data;
}

export async function declineOvertime(id: number, note?: string) {
  const res = await api.post<EMS.Overtime>(`/api/ems/overtime/${id}/decline/`, { note });
  return res.data;
}

// Payroll payments
export async function fetchPayments(params?: { filters?: FilterSet }) {
  const res = await api.get<PaginatedResult<EMS.SalaryPayment>>(
    buildQueryPath("/api/ems/payments/", {
      filters: params?.filters,
    })
  );
  return res.data;
}

export async function createPayment(payload: EMS.SalaryPayment) {
  const res = await api.post<EMS.SalaryPayment>("/api/ems/payments/", payload);
  return res.data;
}

// Salary advances
export async function fetchAdvances(params?: { filters?: FilterSet }) {
  const res = await api.get<PaginatedResult<EMS.SalaryAdvance>>(
    buildQueryPath("/api/ems/advances/", {
      filters: params?.filters,
    })
  );
  return res.data;
}

export async function createAdvance(payload: EMS.SalaryAdvance) {
  const res = await api.post<EMS.SalaryAdvance>("/api/ems/advances/", payload);
  return res.data;
}

export async function approveAdvance(id: number, note?: string) {
  const res = await api.post<EMS.SalaryAdvance>(`/api/ems/advances/${id}/approve/`, { note });
  return res.data;
}

export async function declineAdvance(id: number, note?: string) {
  const res = await api.post<EMS.SalaryAdvance>(`/api/ems/advances/${id}/decline/`, { note });
  return res.data;
}

// Wallet
export async function fetchWallet(employeeId: number) {
  const res = await api.get<{ wallet: EMS.Wallet; transactions: EMS.WalletTransaction[] }>(
    `/api/ems/wallet/${employeeId}/`
  );
  return res.data;
}

export async function fetchWalletTransactions(params?: { employee?: number; location?: number }) {
  const res = await api.get<PaginatedResult<EMS.WalletTransaction>>("/api/ems/wallet/transactions/", {
    params,
  });
  return res.data;
}

export async function adjustWallet(payload: {
  employee_id: number;
  amount: number | string;
  txn_type: "CREDIT" | "DEBIT";
  source_type: "MANUAL" | "ADJUSTMENT" | "POS";
  location_id?: number | null;
  reference?: string;
  note?: string;
}) {
  const res = await api.post("/api/ems/wallet/adjust/", payload);
  return res.data;
}

// Notes
export async function fetchNotes(employeeId: number) {
  const res = await api.get<PaginatedResult<EMS.EmployeeNote>>(`/api/ems/notes/?employee=${employeeId}`);
  return res.data;
}

export async function createNote(payload: EMS.EmployeeNote) {
  const res = await api.post<EMS.EmployeeNote>("/api/ems/notes/", payload);
  return res.data;
}

export async function updateNote(id: number, payload: Partial<EMS.EmployeeNote>) {
  const res = await api.patch<EMS.EmployeeNote>(`/api/ems/notes/${id}/`, payload);
  return res.data;
}

export async function deleteNote(id: number) {
  await api.delete(`/api/ems/notes/${id}/`);
}

// Documents
export async function fetchDocuments(employeeId: number) {
  const res = await api.get<PaginatedResult<EMS.EmployeeDocument>>(`/api/ems/documents/?employee=${employeeId}`);
  return res.data;
}

export async function uploadDocument(payload: {
  employee: number;
  doc_type: number | string;
  file: File;
  expiry_date?: string | null;
}) {
  const form = new FormData();
  form.append("employee", String(payload.employee));
  form.append("doc_type", String(payload.doc_type));
  form.append("file", payload.file);
  if (payload.expiry_date) form.append("expiry_date", payload.expiry_date);
  const res = await api.post<EMS.EmployeeDocument>("/api/ems/documents/", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function deleteDocument(id: number) {
  await api.delete(`/api/ems/documents/${id}/`);
}

// Suspensions
export async function fetchSuspensions(employeeId: number) {
  const res = await api.get<PaginatedResult<EMS.EmployeeSuspension>>(
    `/api/ems/suspensions/?employee=${employeeId}`
  );
  return res.data;
}

export async function createSuspension(payload: EMS.EmployeeSuspension) {
  const res = await api.post<EMS.EmployeeSuspension>("/api/ems/suspensions/", payload);
  return res.data;
}

export async function approveSuspension(id: number, note?: string) {
  const res = await api.post<EMS.EmployeeSuspension>(`/api/ems/suspensions/${id}/approve/`, { note });
  return res.data;
}

export async function revokeSuspension(id: number, note?: string) {
  const res = await api.post<EMS.EmployeeSuspension>(`/api/ems/suspensions/${id}/revoke/`, { note });
  return res.data;
}

// Audit & approvals
export async function fetchAuditLogs(params?: { entity_type?: string; entity_id?: number; employee?: number }) {
  const res = await api.get<PaginatedResult<EMS.AuditLog>>("/api/ems/audit/", { params });
  return res.data;
}

export async function fetchApprovalHistory(params?: { entity_type?: string; entity_id?: number }) {
  const res = await api.get<PaginatedResult<EMS.ApprovalHistory>>("/api/ems/approvals/", { params });
  return res.data;
}
