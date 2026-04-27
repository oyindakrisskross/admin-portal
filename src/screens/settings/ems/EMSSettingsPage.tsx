import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { useAuth } from "../../../auth/AuthContext";
import { TabNav } from "../../../components/layout/TabNav";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";
import {
  fetchEmsSettings,
  updateEmsSettings,
} from "../../../api/ems";
import type {
  Department,
  EmsHoliday,
  EmsSettings,
  JobPosition,
  LeaveAccrualMode,
  LeavePolicyConfig,
  LeavePolicyOverride,
  LeavePolicyScope,
  LeaveResetFrequency,
  LeavePolicyTier,
} from "../../../types/ems";

const EMPTY_POLICY = (): LeavePolicyConfig => ({
  unit: "DAYS",
  wait_period_months: 0,
  starting_balance: 0,
  accrual_mode: "YEARLY",
  accrual_rate: {},
  tiers: [],
  cap: null,
  reset: {
    enabled: true,
    frequency: "YEARLY",
    interval_months: 12,
    amount: null,
  },
  rollover: {
    enabled: false,
    cap: null,
    expiry_months: null,
  },
});

const EMPTY_SETTINGS = (): EmsSettings => ({
  pto_scope: "COMPANY_WIDE",
  pto_policy: EMPTY_POLICY(),
  pto_fallback_policy: EMPTY_POLICY(),
  pto_overrides: [],
  sick_scope: "COMPANY_WIDE",
  sick_policy: EMPTY_POLICY(),
  sick_fallback_policy: EMPTY_POLICY(),
  sick_overrides: [],
  regular_day_multiplier: 1.5,
  holiday_multiplier: 2,
  holiday_calendar: [],
});

const ACCRUAL_MODE_OPTIONS: { value: LeaveAccrualMode; label: string }[] = [
  { value: "NONE", label: "No accrual" },
  { value: "HOURS_WORKED", label: "Based on hours worked" },
  { value: "MONTHLY", label: "Every month" },
  { value: "YEARLY", label: "Every year" },
  { value: "TENURE_SCHEDULE", label: "Tenure milestones" },
];

const RESET_FREQUENCY_OPTIONS: { value: LeaveResetFrequency; label: string }[] = [
  { value: "NONE", label: "Never" },
  { value: "MONTHLY", label: "Every month" },
  { value: "YEARLY", label: "Every year" },
  { value: "CUSTOM_MONTHS", label: "Every X months" },
  { value: "HIRE_ANNIVERSARY", label: "On hire anniversary" },
];

const SCOPE_OPTIONS: { value: LeavePolicyScope; label: string }[] = [
  { value: "COMPANY_WIDE", label: "Company-wide" },
  { value: "DEPARTMENT", label: "Department specific" },
  { value: "POSITION", label: "Job position specific" },
];

type PolicyEditorProps = {
  title: string;
  description: string;
  policy: LeavePolicyConfig;
  disabled: boolean;
  onChange: (next: LeavePolicyConfig) => void;
};

function normalizePolicy(policy?: Partial<LeavePolicyConfig> | null): LeavePolicyConfig {
  return {
    ...EMPTY_POLICY(),
    ...(policy || {}),
    accrual_rate: {
      ...(policy?.accrual_rate || {}),
    },
    tiers: (policy?.tiers || []).map((tier) => ({
      after_months: Number(tier.after_months ?? 0),
      grant: tier.grant ?? 0,
      cap: tier.cap ?? null,
    })),
    reset: {
      ...EMPTY_POLICY().reset,
      ...(policy?.reset || {}),
    },
    rollover: {
      ...EMPTY_POLICY().rollover,
      ...(policy?.rollover || {}),
    },
  };
}

function normalizeOverride(scope: LeavePolicyScope, override?: Partial<LeavePolicyOverride>): LeavePolicyOverride {
  return {
    department: scope === "DEPARTMENT" ? Number(override?.department ?? 0) || null : null,
    position: scope === "POSITION" ? Number(override?.position ?? 0) || null : null,
    policy: normalizePolicy(override?.policy),
  };
}

function normalizeSettings(settings?: Partial<EmsSettings> | null): EmsSettings {
  return {
    ...EMPTY_SETTINGS(),
    ...(settings || {}),
    pto_policy: normalizePolicy(settings?.pto_policy),
    pto_fallback_policy: normalizePolicy(settings?.pto_fallback_policy),
    pto_overrides: (settings?.pto_overrides || []).map((row) =>
      normalizeOverride(settings?.pto_scope || "DEPARTMENT", row)
    ),
    sick_policy: normalizePolicy(settings?.sick_policy),
    sick_fallback_policy: normalizePolicy(settings?.sick_fallback_policy),
    sick_overrides: (settings?.sick_overrides || []).map((row) =>
      normalizeOverride(settings?.sick_scope || "DEPARTMENT", row)
    ),
    holiday_calendar: (settings?.holiday_calendar || []).map((row) => ({
      name: row.name || "",
      date: row.date || "",
      repeats_annually: Boolean(row.repeats_annually),
    })),
  };
}

function PolicyEditor({ title, description, policy, disabled, onChange }: PolicyEditorProps) {
  const patch = (patchValue: Partial<LeavePolicyConfig>) => {
    onChange({ ...policy, ...patchValue });
  };

  const patchAccrualRate = (patchValue: Partial<LeavePolicyConfig["accrual_rate"]>) => {
    patch({
      accrual_rate: {
        ...policy.accrual_rate,
        ...patchValue,
      },
    });
  };

  const patchReset = (patchValue: Partial<LeavePolicyConfig["reset"]>) => {
    patch({
      reset: {
        ...policy.reset,
        ...patchValue,
      },
    });
  };

  const patchRollover = (patchValue: Partial<LeavePolicyConfig["rollover"]>) => {
    patch({
      rollover: {
        ...policy.rollover,
        ...patchValue,
      },
    });
  };

  const updateTier = (index: number, patchValue: Partial<LeavePolicyTier>) => {
    const next = [...policy.tiers];
    next[index] = { ...next[index], ...patchValue };
    patch({ tiers: next });
  };

  const removeTier = (index: number) => {
    patch({ tiers: policy.tiers.filter((_, currentIndex) => currentIndex !== index) });
  };

  const addTier = () => {
    patch({
      tiers: [
        ...policy.tiers,
        {
          after_months: 12,
          grant: 0,
          cap: null,
        },
      ],
    });
  };

  return (
    <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-xs text-kk-dark-text-muted">{description}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1">
          <span className="text-xs text-kk-dark-text-muted">Unit</span>
          <select
            className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
            value={policy.unit}
            disabled={disabled}
            onChange={(e) => patch({ unit: e.target.value as LeavePolicyConfig["unit"] })}
          >
            <option value="DAYS">Days</option>
            <option value="HOURS">Hours</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs text-kk-dark-text-muted">Waiting Period (months)</span>
          <input
            type="number"
            min="0"
            className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
            value={policy.wait_period_months}
            disabled={disabled}
            onChange={(e) => patch({ wait_period_months: Number(e.target.value || 0) })}
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-kk-dark-text-muted">Starting Balance</span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
            value={policy.starting_balance ?? 0}
            disabled={disabled}
            onChange={(e) => patch({ starting_balance: e.target.value })}
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs text-kk-dark-text-muted">Balance Cap</span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
            value={policy.cap ?? ""}
            disabled={disabled}
            onChange={(e) => patch({ cap: e.target.value || null })}
            placeholder="Optional"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="space-y-1">
          <span className="text-xs text-kk-dark-text-muted">Accrual Mode</span>
          <select
            className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
            value={policy.accrual_mode}
            disabled={disabled}
            onChange={(e) => patch({ accrual_mode: e.target.value as LeaveAccrualMode })}
          >
            {ACCRUAL_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {policy.accrual_mode === "HOURS_WORKED" ? (
          <>
            <label className="space-y-1">
              <span className="text-xs text-kk-dark-text-muted">Every X Hours Worked</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                value={policy.accrual_rate.hours_worked ?? ""}
                disabled={disabled}
                onChange={(e) => patchAccrualRate({ hours_worked: e.target.value })}
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-kk-dark-text-muted">Earns</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                value={policy.accrual_rate.hours_earned ?? ""}
                disabled={disabled}
                onChange={(e) => patchAccrualRate({ hours_earned: e.target.value })}
              />
            </label>
          </>
        ) : null}

        {policy.accrual_mode === "MONTHLY" || policy.accrual_mode === "YEARLY" ? (
          <label className="space-y-1">
            <span className="text-xs text-kk-dark-text-muted">Amount Per Period</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              value={policy.accrual_rate.amount ?? ""}
              disabled={disabled}
              onChange={(e) => patchAccrualRate({ amount: e.target.value })}
            />
          </label>
        ) : null}
      </div>

      <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold">Tenure Schedule</h4>
            <p className="text-xs text-kk-dark-text-muted">
              Use this for milestone-based grants like 14 days after year one and 21 after year two.
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={addTier}
            className="inline-flex items-center gap-1 rounded-full border border-kk-dark-input-border px-3 py-1.5 text-xs hover:bg-kk-dark-hover disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Tier
          </button>
        </div>

        {policy.tiers.length === 0 ? (
          <div className="text-xs text-kk-dark-text-muted">No tiers added.</div>
        ) : (
          <div className="space-y-3">
            {policy.tiers.map((tier, index) => (
              <div key={`${tier.after_months}-${index}`} className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <label className="space-y-1">
                  <span className="text-xs text-kk-dark-text-muted">After Months</span>
                  <input
                    type="number"
                    min="0"
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    value={tier.after_months}
                    disabled={disabled}
                    onChange={(e) => updateTier(index, { after_months: Number(e.target.value || 0) })}
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs text-kk-dark-text-muted">Grant</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    value={tier.grant ?? ""}
                    disabled={disabled}
                    onChange={(e) => updateTier(index, { grant: e.target.value })}
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs text-kk-dark-text-muted">Tier Cap</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    value={tier.cap ?? ""}
                    disabled={disabled}
                    onChange={(e) => updateTier(index, { cap: e.target.value || null })}
                    placeholder="Optional"
                  />
                </label>

                <div className="flex items-end">
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeTier(index)}
                    className="inline-flex items-center gap-1 rounded-full border border-red-500/50 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove Tier
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={policy.reset.enabled}
            disabled={disabled}
            onChange={(e) => patchReset({ enabled: e.target.checked })}
          />
          Reset balance periodically
        </label>

        {policy.reset.enabled ? (
          <>
            <label className="space-y-1">
              <span className="text-xs text-kk-dark-text-muted">Reset Frequency</span>
              <select
                className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                value={policy.reset.frequency}
                disabled={disabled}
                onChange={(e) => patchReset({ frequency: e.target.value as LeaveResetFrequency })}
              >
                {RESET_FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {policy.reset.frequency === "CUSTOM_MONTHS" ? (
              <label className="space-y-1">
                <span className="text-xs text-kk-dark-text-muted">Reset Every X Months</span>
                <input
                  type="number"
                  min="1"
                  className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  value={policy.reset.interval_months ?? 12}
                  disabled={disabled}
                  onChange={(e) => patchReset({ interval_months: Number(e.target.value || 1) })}
                />
              </label>
            ) : null}

            <label className="space-y-1">
              <span className="text-xs text-kk-dark-text-muted">Reset To Balance</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                value={policy.reset.amount ?? ""}
                disabled={disabled}
                onChange={(e) => patchReset({ amount: e.target.value || null })}
                placeholder="Optional"
              />
            </label>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={policy.rollover.enabled}
            disabled={disabled}
            onChange={(e) => patchRollover({ enabled: e.target.checked })}
          />
          Allow rollover
        </label>

        {policy.rollover.enabled ? (
          <>
            <label className="space-y-1">
              <span className="text-xs text-kk-dark-text-muted">Carryover Cap</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                value={policy.rollover.cap ?? ""}
                disabled={disabled}
                onChange={(e) => patchRollover({ cap: e.target.value || null })}
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs text-kk-dark-text-muted">Expiry (months)</span>
              <input
                type="number"
                min="1"
                className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                value={policy.rollover.expiry_months ?? ""}
                disabled={disabled}
                onChange={(e) => patchRollover({ expiry_months: e.target.value ? Number(e.target.value) : null })}
                placeholder="Optional"
              />
            </label>
          </>
        ) : null}
      </div>
    </div>
  );
}

type LeaveSectionProps = {
  title: string;
  description: string;
  scope: LeavePolicyScope;
  policy: LeavePolicyConfig;
  fallbackPolicy: LeavePolicyConfig;
  overrides: LeavePolicyOverride[];
  disabled: boolean;
  departments: Department[];
  positions: JobPosition[];
  onScopeChange: (scope: LeavePolicyScope) => void;
  onPolicyChange: (policy: LeavePolicyConfig) => void;
  onFallbackPolicyChange: (policy: LeavePolicyConfig) => void;
  onOverridesChange: (overrides: LeavePolicyOverride[]) => void;
  action?: React.ReactNode;
};

function LeaveSection({
  title,
  description,
  scope,
  policy,
  fallbackPolicy,
  overrides,
  disabled,
  departments,
  positions,
  onScopeChange,
  onPolicyChange,
  onFallbackPolicyChange,
  onOverridesChange,
  action,
}: LeaveSectionProps) {
  const targetOptions = scope === "POSITION" ? positions : departments;
  const targetLabel = scope === "POSITION" ? "Job Position" : "Department";

  const addOverride = () => {
    onOverridesChange([...overrides, normalizeOverride(scope)]);
  };

  const updateOverride = (index: number, patchValue: Partial<LeavePolicyOverride>) => {
    const next = [...overrides];
    next[index] = {
      ...next[index],
      ...patchValue,
      policy: patchValue.policy ? normalizePolicy(patchValue.policy) : normalizePolicy(next[index].policy),
    };
    onOverridesChange(next);
  };

  const removeOverride = (index: number) => {
    onOverridesChange(overrides.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <section className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-kk-dark-text-muted">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <label className="block space-y-1 max-w-sm">
        <span className="text-xs text-kk-dark-text-muted">Policy Scope</span>
        <select
          className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
          value={scope}
          disabled={disabled}
          onChange={(e) => onScopeChange(e.target.value as LeavePolicyScope)}
        >
          {SCOPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {scope === "COMPANY_WIDE" ? (
        <PolicyEditor
          title={`${title} Policy`}
          description={`This rule applies to everyone in the company.`}
          policy={policy}
          disabled={disabled}
          onChange={onPolicyChange}
        />
      ) : (
        <div className="space-y-5">
          <PolicyEditor
            title="Fallback Policy"
            description={`Use this when a ${targetLabel.toLowerCase()} has no dedicated ${title.toLowerCase()} override.`}
            policy={fallbackPolicy}
            disabled={disabled}
            onChange={onFallbackPolicyChange}
          />

          <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold">{targetLabel} Overrides</h3>
                <p className="text-xs text-kk-dark-text-muted">
                  Define rules that replace the fallback for specific {scope === "POSITION" ? "job positions" : "departments"}.
                </p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={addOverride}
                className="inline-flex items-center gap-1 rounded-full border border-kk-dark-input-border px-3 py-1.5 text-xs hover:bg-kk-dark-hover disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Override
              </button>
            </div>

            {overrides.length === 0 ? (
              <div className="text-xs text-kk-dark-text-muted">No overrides defined yet.</div>
            ) : (
              <div className="space-y-5">
                {overrides.map((override, index) => (
                  <div key={index} className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 space-y-4">
                    <div className="flex items-end justify-between gap-3">
                      <label className="block w-full max-w-sm space-y-1">
                        <span className="text-xs text-kk-dark-text-muted">{targetLabel}</span>
                        <select
                          className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                          value={scope === "POSITION" ? override.position ?? "" : override.department ?? ""}
                          disabled={disabled}
                          onChange={(e) =>
                            updateOverride(index, scope === "POSITION"
                              ? { position: e.target.value ? Number(e.target.value) : null, department: null }
                              : { department: e.target.value ? Number(e.target.value) : null, position: null })
                          }
                        >
                          <option value="">Select {targetLabel.toLowerCase()}</option>
                          {targetOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => removeOverride(index)}
                        className="inline-flex items-center gap-1 rounded-full border border-red-500/50 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    </div>

                    <PolicyEditor
                      title={`${targetLabel} Policy`}
                      description={`This rule replaces the fallback when this ${targetLabel.toLowerCase()} is matched.`}
                      policy={override.policy}
                      disabled={disabled}
                      onChange={(nextPolicy) => updateOverride(index, { policy: nextPolicy })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

type SettingsTabKey = "pto" | "sick" | "overtime";

type SectionSaveButtonProps = {
  label: string;
  disabled: boolean;
  saving: boolean;
  onClick: () => void;
};

function SectionSaveButton({ label, disabled, saving, onClick }: SectionSaveButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      onClick={onClick}
    >
      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {label}
    </button>
  );
}

export default function EMSSettingsPage() {
  const { can } = useAuth();
  const canViewTimeOff =
    can("Time-Off (PTO)", "view") || can("Time-Off (PTO)", "create") || can("Time-Off (PTO)", "edit");
  const canEditTimeOff = can("Time-Off (PTO)", "create") || can("Time-Off (PTO)", "edit");
  const canViewOvertime =
    can("Overtime", "view") ||
    can("Overtime", "create") ||
    can("Overtime", "edit") ||
    can("Payroll", "view") ||
    can("Payroll", "create") ||
    can("Payroll", "edit");
  const canEditOvertime =
    can("Overtime", "create") || can("Overtime", "edit") || can("Payroll", "create") || can("Payroll", "edit");

  const [settings, setSettings] = useState<EmsSettings>(EMPTY_SETTINGS());
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingTab, setSavingTab] = useState<SettingsTabKey | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);
  const [tab, setTab] = useState<SettingsTabKey>("pto");

  const visibleTabs: Array<{ key: SettingsTabKey; label: string }> = [
    ...(canViewTimeOff ? [{ key: "pto" as SettingsTabKey, label: "PTO" }] : []),
    ...(canViewTimeOff ? [{ key: "sick" as SettingsTabKey, label: "Sick Days" }] : []),
    ...(canViewOvertime ? [{ key: "overtime" as SettingsTabKey, label: "Overtime" }] : []),
  ];

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const settingsResponse = await fetchEmsSettings();
        if (cancelled) return;

        const normalized = normalizeSettings(settingsResponse);
        setSettings(normalized);
        setDepartments(settingsResponse.department_options || []);
        setPositions(settingsResponse.position_options || []);
      } catch (error: any) {
        if (cancelled) return;
        setToast({
          message: error?.response?.data?.detail || error?.message || "Failed to load EMS settings.",
          variant: "error",
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!visibleTabs.some((entry) => entry.key === tab)) {
      setTab(visibleTabs[0]?.key ?? "pto");
    }
  }, [tab, visibleTabs]);

  const patchSettings = (patchValue: Partial<EmsSettings>) => {
    setSettings((current) => normalizeSettings({ ...current, ...patchValue }));
  };

  const updateHoliday = (index: number, patchValue: Partial<EmsHoliday>) => {
    const next = [...settings.holiday_calendar];
    next[index] = { ...next[index], ...patchValue };
    patchSettings({ holiday_calendar: next });
  };

  const removeHoliday = (index: number) => {
    patchSettings({
      holiday_calendar: settings.holiday_calendar.filter((_, currentIndex) => currentIndex !== index),
    });
  };

  const addHoliday = () => {
    patchSettings({
      holiday_calendar: [
        ...settings.holiday_calendar,
        {
          name: "",
          date: "",
          repeats_annually: false,
        },
      ],
    });
  };

  const saveTab = async (section: SettingsTabKey) => {
    const payload: Partial<EmsSettings> = {};
    let successMessage = "";
    let errorMessage = "";

    if (section === "pto") {
      if (!canEditTimeOff) {
        setToast({ message: "You do not have permission to save PTO settings.", variant: "error" });
        return;
      }
      payload.pto_scope = settings.pto_scope;
      payload.pto_policy = settings.pto_policy;
      payload.pto_fallback_policy = settings.pto_fallback_policy;
      payload.pto_overrides = settings.pto_overrides;
      successMessage = "PTO settings saved.";
      errorMessage = "Failed to save PTO settings.";
    }

    if (section === "sick") {
      if (!canEditTimeOff) {
        setToast({ message: "You do not have permission to save sick-day settings.", variant: "error" });
        return;
      }
      payload.sick_scope = settings.sick_scope;
      payload.sick_policy = settings.sick_policy;
      payload.sick_fallback_policy = settings.sick_fallback_policy;
      payload.sick_overrides = settings.sick_overrides;
      successMessage = "Sick-day settings saved.";
      errorMessage = "Failed to save sick-day settings.";
    }

    if (section === "overtime") {
      if (!canEditOvertime) {
        setToast({ message: "You do not have permission to save overtime settings.", variant: "error" });
        return;
      }
      payload.regular_day_multiplier = settings.regular_day_multiplier;
      payload.holiday_multiplier = settings.holiday_multiplier;
      payload.holiday_calendar = settings.holiday_calendar;
      successMessage = "Overtime settings saved.";
      errorMessage = "Failed to save overtime settings.";
    }

    setSavingTab(section);
    try {
      const next = await updateEmsSettings(payload);
      setSettings(normalizeSettings(next));
      setDepartments(next.department_options || []);
      setPositions(next.position_options || []);
      setToast({ message: successMessage, variant: "success" });
    } catch (error: any) {
      setToast({
        message: error?.response?.data?.detail || error?.message || errorMessage,
        variant: "error",
      });
    } finally {
      setSavingTab(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <ListPageHeader
        title="EMS Settings"
        subtitle="Configure PTO, sick-day accrual, overtime multipliers, and holiday definitions."
      />

      {loading ? (
        <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-6 text-sm text-kk-dark-text-muted">
          Loading EMS settings...
        </div>
      ) : (
        <>
          {visibleTabs.length > 0 ? (
            <div className="border-b border-kk-dark-border px-1 pb-2">
              <div className="flex flex-wrap gap-4 text-sm">
                {visibleTabs.map((entry) => (
                  <TabNav key={entry.key} action={() => setTab(entry.key)} isActive={tab === entry.key}>
                    {entry.label}
                  </TabNav>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "pto" && canViewTimeOff ? (
            <LeaveSection
              title="PTO"
              description="Define the PTO rule company-wide or provide a fallback plus department or job-position overrides."
              scope={settings.pto_scope}
              policy={settings.pto_policy}
              fallbackPolicy={settings.pto_fallback_policy}
              overrides={settings.pto_overrides}
              disabled={!canEditTimeOff}
              departments={departments}
              positions={positions}
              onScopeChange={(scope) =>
                patchSettings({
                  pto_scope: scope,
                  pto_overrides:
                    scope === "COMPANY_WIDE"
                      ? []
                      : settings.pto_overrides.map((row) => normalizeOverride(scope, row)),
                })
              }
              onPolicyChange={(policy) => patchSettings({ pto_policy: policy })}
              onFallbackPolicyChange={(policy) => patchSettings({ pto_fallback_policy: policy })}
              onOverridesChange={(overrides) => patchSettings({ pto_overrides: overrides })}
              action={
                <SectionSaveButton
                  label="Save PTO"
                  disabled={!canEditTimeOff || loading || savingTab !== null}
                  saving={savingTab === "pto"}
                  onClick={() => saveTab("pto")}
                />
              }
            />
          ) : null}

          {tab === "sick" && canViewTimeOff ? (
            <LeaveSection
              title="Sick Days"
              description="Define sick-day accrual or fixed-period allowances using the same company-wide or fallback-plus-override structure."
              scope={settings.sick_scope}
              policy={settings.sick_policy}
              fallbackPolicy={settings.sick_fallback_policy}
              overrides={settings.sick_overrides}
              disabled={!canEditTimeOff}
              departments={departments}
              positions={positions}
              onScopeChange={(scope) =>
                patchSettings({
                  sick_scope: scope,
                  sick_overrides:
                    scope === "COMPANY_WIDE"
                      ? []
                      : settings.sick_overrides.map((row) => normalizeOverride(scope, row)),
                })
              }
              onPolicyChange={(policy) => patchSettings({ sick_policy: policy })}
              onFallbackPolicyChange={(policy) => patchSettings({ sick_fallback_policy: policy })}
              onOverridesChange={(overrides) => patchSettings({ sick_overrides: overrides })}
              action={
                <SectionSaveButton
                  label="Save Sick Days"
                  disabled={!canEditTimeOff || loading || savingTab !== null}
                  saving={savingTab === "sick"}
                  onClick={() => saveTab("sick")}
                />
              }
            />
          ) : null}

          {tab === "overtime" && canViewOvertime ? (
            <section className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 space-y-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <h2 className="text-base font-semibold">Overtime</h2>
                  <p className="text-sm text-kk-dark-text-muted">
                    Define normal and holiday overtime multipliers, then maintain the holiday dates your company observes.
                  </p>
                </div>
                <div className="shrink-0">
                  <SectionSaveButton
                    label="Save Overtime"
                    disabled={!canEditOvertime || loading || savingTab !== null}
                    saving={savingTab === "overtime"}
                    onClick={() => saveTab("overtime")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="space-y-1">
                  <span className="text-xs text-kk-dark-text-muted">Normal Working Day Multiplier</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    value={settings.regular_day_multiplier}
                    disabled={!canEditOvertime}
                    onChange={(e) => patchSettings({ regular_day_multiplier: e.target.value })}
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs text-kk-dark-text-muted">Holiday Multiplier</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    value={settings.holiday_multiplier}
                    disabled={!canEditOvertime}
                    onChange={(e) => patchSettings({ holiday_multiplier: e.target.value })}
                  />
                </label>
              </div>

              <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-4 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Holiday Calendar</h3>
                    <p className="text-xs text-kk-dark-text-muted">
                      These dates are used when the system needs to apply the holiday overtime multiplier.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={!canEditOvertime}
                    onClick={addHoliday}
                    className="inline-flex items-center gap-1 rounded-full border border-kk-dark-input-border px-3 py-1.5 text-xs hover:bg-kk-dark-hover disabled:opacity-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Holiday
                  </button>
                </div>

                {settings.holiday_calendar.length === 0 ? (
                  <div className="text-xs text-kk-dark-text-muted">No company holidays added yet.</div>
                ) : (
                  <div className="space-y-3">
                    {settings.holiday_calendar.map((holiday, index) => (
                      <div key={`${holiday.name}-${holiday.date}-${index}`} className="grid grid-cols-1 gap-3 md:grid-cols-4">
                        <label className="space-y-1">
                          <span className="text-xs text-kk-dark-text-muted">Holiday Name</span>
                          <input
                            type="text"
                            className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                            value={holiday.name}
                            disabled={!canEditOvertime}
                            onChange={(e) => updateHoliday(index, { name: e.target.value })}
                          />
                        </label>

                        <label className="space-y-1">
                          <span className="text-xs text-kk-dark-text-muted">Date</span>
                          <input
                            type="date"
                            className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                            value={holiday.date}
                            disabled={!canEditOvertime}
                            onChange={(e) => updateHoliday(index, { date: e.target.value })}
                          />
                        </label>

                        <label className="flex items-end gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(holiday.repeats_annually)}
                            disabled={!canEditOvertime}
                            onChange={(e) => updateHoliday(index, { repeats_annually: e.target.checked })}
                          />
                          Repeats every year
                        </label>

                        <div className="flex items-end">
                          <button
                            type="button"
                            disabled={!canEditOvertime}
                            onClick={() => removeHoliday(index)}
                            className="inline-flex items-center gap-1 rounded-full border border-red-500/50 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {!canViewTimeOff && !canViewOvertime ? (
            <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-6 text-sm text-kk-dark-text-muted">
              Your role does not currently include any EMS settings permissions.
            </div>
          ) : null}
        </>
      )}

      <ToastModal message={toast?.message ?? null} onClose={() => setToast(null)} variant={toast?.variant ?? "error"} />
    </div>
  );
}
