export type Department = {
  id?: number;
  name: string;
  parent_department?: number | null;
  parent_name?: string | null;
  is_active?: boolean;
};

export type JobPosition = {
  id?: number;
  name: string;
  department?: number | null;
  department_name?: string | null;
  is_active?: boolean;
};

export type Employee = {
  id?: number;
  contact: number;
  employee_code?: string | null;
  department?: number | null;
  department_name?: string | null;
  position?: number | null;
  position_name?: string | null;
  supervisor?: number | null;
  supervisor_name?: string | null;
  status?: number | string | null;
  status_value?: string | null;
  status_name?: string | null;
  hire_date?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  work_pattern_weekdays?: number[];
  standard_daily_hours?: number | string | null;
  rate_amount?: number | string;
  rate_term?: number | string | null;
  rate_term_value?: string | null;
  rate_term_name?: string | null;
  overtime_eligible?: boolean;
  is_active?: boolean;
  location_ids?: number[];
  primary_location_id?: number | null;
  primary_location_name?: string | null;
  locations?: EmployeeLocationAssignment[];
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  pto_used_days?: number | string | null;
  sick_used_days?: number | string | null;
  compensation_history?: EmployeeCompensationHistory[];
  change_reason?: string | null;
};

export type EmployeeCompensationHistory = {
  id?: number;
  employee: number;
  effective_from: string;
  effective_to?: string | null;
  rate_amount: number | string;
  rate_term: number | string;
  rate_term_value?: string | null;
  rate_term_name?: string | null;
  changed_by?: number | null;
  changed_by_email?: string | null;
  change_reason?: string | null;
};

export type EmployeeLocationAssignment = {
  id?: number;
  employee: number;
  employee_name?: string | null;
  location: number;
  location_name?: string | null;
  is_primary?: boolean;
  valid_from?: string;
  valid_to?: string | null;
  is_active?: boolean;
};

export type EmployeeShift = {
  id?: number;
  employee: number;
  employee_name?: string | null;
  location: number;
  location_name?: string | null;
  weekday: number;
  shift_start: string;
  shift_end: string;
  valid_from: string;
  valid_to?: string | null;
  is_active?: boolean;
};

export type EmployeeShiftOverride = {
  id?: number;
  employee: number;
  employee_name?: string | null;
  location: number;
  location_name?: string | null;
  shift_date: string;
  shift_start?: string | null;
  shift_end?: string | null;
  override_type: "REPLACE" | "CANCEL" | "ADD";
  note?: string | null;
  is_active?: boolean;
};

export type TimeOffRequest = {
  id?: number;
  employee: number;
  employee_name?: string | null;
  type: number | string;
  type_value?: string | null;
  type_name?: string | null;
  start_date: string;
  end_date: string;
  partial_day?: boolean;
  hours?: number | string | null;
  reason?: string | null;
  status?: number | string | null;
  status_value?: string | null;
  status_name?: string | null;
  requested_by?: number | null;
  requested_by_email?: string | null;
  approved_by?: number | null;
  approved_by_email?: string | null;
  approved_at?: string | null;
  declined_by?: number | null;
  declined_by_email?: string | null;
  declined_at?: string | null;
  decision_note?: string | null;
};

export type Attendance = {
  id?: number;
  employee: number;
  employee_name?: string | null;
  location: number;
  location_name?: string | null;
  shift_date: string;
  time_in?: string | null;
  time_out?: string | null;
  lunch_start?: string | null;
  lunch_end?: string | null;
  source?: number | string | null;
  source_value?: string | null;
  source_name?: string | null;
};

export type AttendanceEdit = {
  id?: number;
  attendance: number;
  old_values: Record<string, any>;
  new_values: Record<string, any>;
  edited_by?: number | null;
  edited_by_email?: string | null;
  edited_on?: string;
  reason: string;
};

export type Overtime = {
  id?: number;
  employee: number;
  employee_name?: string | null;
  location: number;
  location_name?: string | null;
  date: string;
  hours: number | string;
  reason?: string | null;
  status?: number | string | null;
  status_value?: string | null;
  status_name?: string | null;
  requested_by?: number | null;
  requested_by_email?: string | null;
  approved_by?: number | null;
  approved_by_email?: string | null;
  approved_at?: string | null;
  declined_by?: number | null;
  declined_by_email?: string | null;
  declined_at?: string | null;
  decision_note?: string | null;
};

export type SalaryPayment = {
  id?: number;
  employee: number;
  employee_name?: string | null;
  pay_period_start: string;
  pay_period_end: string;
  gross_amt: number | string;
  deductions_amt?: number | string;
  net_amt: number | string;
  paid_on: string;
  paid_by?: number | null;
  paid_by_email?: string | null;
  reference?: string | null;
  note?: string | null;
};

export type SalaryAdvance = {
  id?: number;
  employee: number;
  employee_name?: string | null;
  request_date: string;
  amount: number | string;
  reason?: string | null;
  status?: number | string | null;
  status_value?: string | null;
  status_name?: string | null;
  requested_by?: number | null;
  requested_by_email?: string | null;
  approved_by?: number | null;
  approved_by_email?: string | null;
  approved_at?: string | null;
  declined_by?: number | null;
  declined_by_email?: string | null;
  declined_at?: string | null;
  repayment_method?: number | string | null;
  repayment_method_value?: string | null;
  repayment_method_name?: string | null;
  repayment_period_months?: number | null;
  decision_note?: string | null;
};

export type Wallet = {
  id?: number;
  employee: number;
  employee_name?: string | null;
  balance: number | string;
};

export type WalletTransaction = {
  id?: number;
  wallet: number;
  employee: number;
  employee_name?: string | null;
  location?: number | null;
  location_name?: string | null;
  source_type?: number | string | null;
  source_type_value?: string | null;
  source_type_name?: string | null;
  txn_type?: number | string | null;
  txn_type_value?: string | null;
  txn_type_name?: string | null;
  amount: number | string;
  reference?: string | null;
  note?: string | null;
  created_at?: string;
  created_by?: number | null;
  created_by_email?: string | null;
};

export type EmployeeNote = {
  id?: number;
  employee: number;
  employee_name?: string | null;
  note_type: number | string;
  note_type_value?: string | null;
  title: string;
  body: string;
  visibility?: string;
  is_active?: boolean;
};

export type EmployeeDocument = {
  id?: number;
  employee: number;
  employee_name?: string | null;
  doc_type: number | string;
  doc_type_value?: string | null;
  doc_type_name?: string | null;
  file?: string;
  file_name?: string | null;
  file_size?: number | null;
  expiry_date?: string | null;
  uploaded_by?: number | null;
  uploaded_by_email?: string | null;
  uploaded_on?: string | null;
  is_active?: boolean;
};

export type EmployeeSuspension = {
  id?: number;
  employee: number;
  employee_name?: string | null;
  start_date: string;
  end_date: string;
  reason?: string | null;
  status?: number | string | null;
  status_value?: string | null;
  status_name?: string | null;
  requested_by?: number | null;
  requested_by_email?: string | null;
  approved_by?: number | null;
  approved_by_email?: string | null;
  approved_at?: string | null;
  declined_by?: number | null;
  declined_by_email?: string | null;
  declined_at?: string | null;
  decision_note?: string | null;
  revoke_note?: string | null;
};

export type ShiftInstance = {
  date: string;
  employee_id: number;
  employee_name: string;
  location_id: number;
  location_name: string;
  shift_start: string | null;
  shift_end: string | null;
  source: "RECURRING" | "OVERRIDE";
  override_type?: "REPLACE" | "CANCEL" | "ADD" | null;
};

export type ApprovalHistory = {
  id?: number;
  entity_type: string;
  entity_id: number;
  action: string;
  actor?: number | null;
  actor_email?: string | null;
  acted_on?: string;
  note?: string | null;
};

export type AuditLog = {
  id?: number;
  actor?: number | null;
  actor_email?: string | null;
  action: string;
  entity_type: string;
  entity_id: number;
  metadata?: Record<string, any>;
  created_at?: string;
};

export type EmployeeStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED" | "TERMINATED";
export const EMPLOYEE_STATUS_CHOICES: { value: EmployeeStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "TERMINATED", label: "Terminated" },
];

export type RateTerm = "MONTHLY" | "HOURLY";
export const RATE_TERM_CHOICES: { value: RateTerm; label: string }[] = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "HOURLY", label: "Hourly" },
];

export type TimeOffType = "PTO" | "SICK" | "UNPAID" | "OTHER";
export const TIME_OFF_TYPE_CHOICES: { value: TimeOffType; label: string }[] = [
  { value: "PTO", label: "PTO" },
  { value: "SICK", label: "Sick" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "OTHER", label: "Other" },
];

export type TimeOffStatus = "REQUESTED" | "APPROVED" | "DECLINED" | "CANCELLED";
export const TIME_OFF_STATUS_CHOICES: { value: TimeOffStatus; label: string }[] = [
  { value: "REQUESTED", label: "Requested" },
  { value: "APPROVED", label: "Approved" },
  { value: "DECLINED", label: "Declined" },
  { value: "CANCELLED", label: "Cancelled" },
];

export type OvertimeStatus = "REQUESTED" | "APPROVED" | "DECLINED";
export const OVERTIME_STATUS_CHOICES: { value: OvertimeStatus; label: string }[] = [
  { value: "REQUESTED", label: "Requested" },
  { value: "APPROVED", label: "Approved" },
  { value: "DECLINED", label: "Declined" },
];

export type SalaryAdvanceStatus = "REQUESTED" | "APPROVED" | "DECLINED";
export const SALARY_ADVANCE_STATUS_CHOICES: { value: SalaryAdvanceStatus; label: string }[] = [
  { value: "REQUESTED", label: "Requested" },
  { value: "APPROVED", label: "Approved" },
  { value: "DECLINED", label: "Declined" },
];

export type SuspensionStatus = "ACTIVE" | "REVOKED" | "COMPLETED";
export const SUSPENSION_STATUS_CHOICES: { value: SuspensionStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "REVOKED", label: "Revoked" },
  { value: "COMPLETED", label: "Completed" },
];

export type NoteType = "NOTE" | "WARNING";
export const NOTE_TYPE_CHOICES: { value: NoteType; label: string }[] = [
  { value: "NOTE", label: "Note" },
  { value: "WARNING", label: "Warning" },
];

export type WalletTxnType = "CREDIT" | "DEBIT";
export const WALLET_TXN_TYPE_CHOICES: { value: WalletTxnType; label: string }[] = [
  { value: "CREDIT", label: "Credit" },
  { value: "DEBIT", label: "Debit" },
];

export type WalletTxnSource = "POS" | "MANUAL" | "ADJUSTMENT";
export const WALLET_TXN_SOURCE_CHOICES: { value: WalletTxnSource; label: string }[] = [
  { value: "POS", label: "POS" },
  { value: "MANUAL", label: "Manual" },
  { value: "ADJUSTMENT", label: "Adjustment" },
];

export type AttendanceSource = "SYSTEM" | "MANUAL";
export const ATTENDANCE_SOURCE_CHOICES: { value: AttendanceSource; label: string }[] = [
  { value: "SYSTEM", label: "System" },
  { value: "MANUAL", label: "Manual" },
];

export type AdvanceRepaymentMethod = "PAYROLL_DEDUCTION" | "ONE_TIME" | "OTHER";
export const ADVANCE_REPAYMENT_METHOD_CHOICES: { value: AdvanceRepaymentMethod; label: string }[] = [
  { value: "PAYROLL_DEDUCTION", label: "Payroll Deduction" },
  { value: "ONE_TIME", label: "One-time" },
  { value: "OTHER", label: "Other" },
];

export type DocumentType = "CONTRACT" | "ID" | "OTHER";
export const DOCUMENT_TYPE_CHOICES: { value: DocumentType; label: string }[] = [
  { value: "CONTRACT", label: "Contract" },
  { value: "ID", label: "ID" },
  { value: "OTHER", label: "Other" },
];

export type ShiftOverrideType = "REPLACE" | "CANCEL" | "ADD";
export const SHIFT_OVERRIDE_TYPE_CHOICES: { value: ShiftOverrideType; label: string }[] = [
  { value: "REPLACE", label: "Replace" },
  { value: "CANCEL", label: "Cancel" },
  { value: "ADD", label: "Add" },
];

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const WEEKDAY_CHOICES: { value: Weekday; label: string }[] = [
  { value: 0, label: "Mon" },
  { value: 1, label: "Tue" },
  { value: 2, label: "Wed" },
  { value: 3, label: "Thu" },
  { value: 4, label: "Fri" },
  { value: 5, label: "Sat" },
  { value: 6, label: "Sun" },
];
