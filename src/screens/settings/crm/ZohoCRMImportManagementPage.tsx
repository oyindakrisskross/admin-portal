import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";
import { useImportJobs } from "../../../contexts/ImportJobsContext";
import {
  fetchCRMConnectionImportManagement,
  fetchCRMConnectionImportModuleFields,
  runCRMConnectionImports,
  updateCRMConnectionImportManagement,
  type CRMCategory,
  type CRMImportJob,
  type CRMConnectionImportManagementRecord,
  type CRMConnectionImportMapping,
  type CRMConnectionImportModule,
  type CRMConnectionImportModuleFieldCatalog,
  type CRMConnectionImportSourceField,
  type CRMConnectionImportTargetField,
  type CRMImportSyncMode,
} from "../../../api/contact";

type DraftMapping = {
  module_id: string;
  module_api_name: string;
  module_label: string;
  crm_category: CRMCategory | "";
  sync_mode: CRMImportSyncMode;
  is_active: boolean;
  field_map: Record<string, string>;
};

const LEGACY_FIELD_ALIASES: Record<string, string> = {
  email: "contact.email",
  first_name: "contact.first_name",
  last_name: "contact.last_name",
  full_name: "contact.full_name",
  phone: "contact.phone_1",
  mobile: "contact.phone_2",
  company_name: "contact.company_name",
  contact_type: "contact.contact_type",
};

function normalizeFieldMap(fieldMap?: Record<string, string> | null): Record<string, string> {
  const source = fieldMap || {};
  const normalized: Record<string, string> = {};

  for (const [rawKey, rawValue] of Object.entries(source)) {
    const key = String(rawKey || "").trim();
    const value = String(rawValue || "").trim();
    if (!key || !value) continue;
    if (LEGACY_FIELD_ALIASES[key]) continue;
    normalized[key] = value;
  }

  for (const [rawKey, rawValue] of Object.entries(source)) {
    const key = String(rawKey || "").trim();
    const value = String(rawValue || "").trim();
    if (!key || !value) continue;
    const mappedKey = LEGACY_FIELD_ALIASES[key] || key;
    if (!normalized[mappedKey]) {
      normalized[mappedKey] = value;
    }
  }

  return normalized;
}

function buildDrafts(
  modules: CRMConnectionImportModule[],
  mappings: CRMConnectionImportMapping[]
): Record<string, DraftMapping> {
  const savedByApiName = new Map(mappings.map((row) => [row.module_api_name, row]));
  const next: Record<string, DraftMapping> = {};

  for (const module of modules) {
    const saved = savedByApiName.get(module.api_name);
    next[module.api_name] = {
      module_id: module.id,
      module_api_name: module.api_name,
      module_label: module.label,
      crm_category: saved?.crm_category ?? "",
      sync_mode: saved?.sync_mode ?? "ONE_TIME",
      is_active: saved?.is_active ?? false,
      field_map: normalizeFieldMap(saved?.field_map),
    };
  }

  return next;
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function importJobStatusBadge(status: CRMImportJob["status"]) {
  const tone =
    status === "SUCCESS"
      ? "bg-emerald-700 text-emerald-100"
      : status === "PARTIAL_SUCCESS"
        ? "bg-amber-700 text-amber-100"
        : status === "ERROR"
          ? "bg-rose-700 text-rose-100"
          : "bg-slate-600 text-slate-100";
  const label =
    status === "SUCCESS"
      ? "Success"
      : status === "PARTIAL_SUCCESS"
        ? "Completed With Issues"
        : status === "ERROR"
          ? "Error"
          : status === "RUNNING"
            ? "Running"
            : "Queued";
  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${tone}`}>{label}</span>;
}

function statusBadge(status?: CRMConnectionImportMapping["last_import_status"]) {
  const tone =
    status === "SUCCESS"
      ? "bg-emerald-700 text-emerald-100"
      : status === "ERROR"
        ? "bg-rose-700 text-rose-100"
        : "bg-slate-500 text-slate-100";
  const label = status === "SUCCESS" ? "Success" : status === "ERROR" ? "Error" : "Idle";
  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${tone}`}>{label}</span>;
}

function watchStatusBadge(status?: CRMConnectionImportMapping["watch_status"]) {
  const tone =
    status === "HEALTHY"
      ? "bg-emerald-700 text-emerald-100"
      : status === "EXPIRING_SOON"
        ? "bg-amber-700 text-amber-100"
        : status === "BROKEN"
          ? "bg-rose-700 text-rose-100"
          : "bg-slate-500 text-slate-100";
  const label =
    status === "HEALTHY"
      ? "Healthy"
      : status === "EXPIRING_SOON"
        ? "Expiring Soon"
        : status === "BROKEN"
          ? "Broken"
          : "Inactive";
  return <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${tone}`}>{label}</span>;
}

function buildCatalogKey(moduleApiName: string, crmCategory: CRMCategory | "") {
  return `${moduleApiName}::${crmCategory || ""}`;
}

function formatSourceFieldOption(field: CRMConnectionImportSourceField) {
  const parts = [field.display_label];
  if (field.source_type === "subform") {
    parts.push("Subform");
  }
  if (field.data_type) {
    parts.push(field.data_type);
  }
  return parts.join(" - ");
}

function groupTargets(targets: CRMConnectionImportTargetField[]) {
  const map = new Map<string, { label: string; repeated: boolean; fields: CRMConnectionImportTargetField[] }>();
  for (const target of targets) {
    const existing = map.get(target.group_key);
    if (existing) {
      existing.fields.push(target);
      existing.repeated = existing.repeated || target.repeated;
      continue;
    }
    map.set(target.group_key, {
      label: target.group_label,
      repeated: target.repeated,
      fields: [target],
    });
  }
  return Array.from(map.entries()).map(([groupKey, value]) => ({
    groupKey,
    groupLabel: value.label,
    repeated: value.repeated,
    fields: value.fields,
  }));
}

export function ZohoCRMImportManagementPage() {
  const { serviceKey = "zoho-crm" } = useParams<{ serviceKey: string }>();
  const navigate = useNavigate();
  const { jobs, registerJob } = useImportJobs();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [queueingRun, setQueueingRun] = useState(false);
  const [management, setManagement] = useState<CRMConnectionImportManagementRecord | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftMapping>>({});
  const [catalogs, setCatalogs] = useState<Record<string, CRMConnectionImportModuleFieldCatalog>>({});
  const [catalogLoading, setCatalogLoading] = useState<Record<string, boolean>>({});
  const [catalogErrors, setCatalogErrors] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("error");

  const showToast = (message: string, variant: "error" | "success" | "info" = "error") => {
    setToastVariant(variant);
    setToastMessage(message);
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchCRMConnectionImportManagement(serviceKey);
      setManagement(data);
      setDrafts(buildDrafts(data.modules || [], data.mappings || []));
      setCatalogErrors({});
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "Failed to load Zoho CRM import management.");
      setManagement(null);
      setDrafts({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [serviceKey]);

  const visibleModules = useMemo(
    () =>
      (management?.modules || [])
        .filter((module) => module.api_supported && module.visible)
        .sort((a, b) => a.label.localeCompare(b.label)),
    [management]
  );

  const mappingByApiName = useMemo(
    () => new Map((management?.mappings || []).map((row) => [row.module_api_name, row])),
    [management]
  );

  const selectedMappings = useMemo(
    () =>
      Object.values(drafts)
        .filter((row) => row.is_active && row.crm_category)
        .map((row) => ({
          module_api_name: row.module_api_name,
          crm_category: row.crm_category as CRMCategory,
          sync_mode: row.sync_mode,
          is_active: true,
          field_map: normalizeFieldMap(row.field_map),
        })),
    [drafts]
  );

  const connectionImportJobs = useMemo(
    () =>
      jobs
        .filter((job) => job.job_kind === "CONNECTION" && job.service_key === serviceKey)
        .slice(0, 5),
    [jobs, serviceKey]
  );

  const setDraft = (moduleApiName: string, patch: Partial<DraftMapping>) => {
    setDrafts((prev) => {
      const current = prev[moduleApiName];
      if (!current) return prev;
      return {
        ...prev,
        [moduleApiName]: { ...current, ...patch },
      };
    });
  };

  const setDraftFieldMap = (moduleApiName: string, targetKey: string, sourcePath: string) => {
    setDrafts((prev) => {
      const current = prev[moduleApiName];
      if (!current) return prev;
      const nextFieldMap = { ...(current.field_map || {}) };
      if (sourcePath) {
        nextFieldMap[targetKey] = sourcePath;
      } else {
        delete nextFieldMap[targetKey];
      }
      return {
        ...prev,
        [moduleApiName]: {
          ...current,
          field_map: nextFieldMap,
        },
      };
    });
  };

  const loadModuleCatalog = async (moduleApiName: string, crmCategory: CRMCategory | "") => {
    if (!crmCategory) return;
    const cacheKey = buildCatalogKey(moduleApiName, crmCategory);
    if (catalogs[cacheKey] || catalogLoading[cacheKey]) return;

    setCatalogLoading((prev) => ({ ...prev, [cacheKey]: true }));
    setCatalogErrors((prev) => ({ ...prev, [cacheKey]: "" }));
    try {
      const data = await fetchCRMConnectionImportModuleFields(serviceKey, moduleApiName, crmCategory);
      setCatalogs((prev) => ({ ...prev, [cacheKey]: data }));
      setDrafts((prev) => {
        const current = prev[moduleApiName];
        if (!current || current.crm_category !== crmCategory) return prev;
        if (Object.keys(current.field_map || {}).length > 0) return prev;
        return {
          ...prev,
          [moduleApiName]: {
            ...current,
            field_map: data.suggested_field_map || {},
          },
        };
      });
    } catch (err: any) {
      setCatalogErrors((prev) => ({
        ...prev,
        [cacheKey]: err?.response?.data?.detail || "Failed to load Zoho CRM fields for this module.",
      }));
    } finally {
      setCatalogLoading((prev) => ({ ...prev, [cacheKey]: false }));
    }
  };

  useEffect(() => {
    for (const row of Object.values(drafts)) {
      if (!row.is_active || !row.crm_category) continue;
      void loadModuleCatalog(row.module_api_name, row.crm_category);
    }
  }, [drafts, serviceKey]);

  const saveMappings = async (runOneTime: boolean) => {
    if (!management) return;
    if (management.module_error) {
      showToast(management.module_error);
      return;
    }

    setSaving(true);
    try {
      const saved = await updateCRMConnectionImportManagement(serviceKey, {
        mappings: selectedMappings,
      });

      setManagement((prev) =>
        prev
          ? {
              ...prev,
              mappings: saved.mappings,
              token_notice: saved.token_notice,
            }
          : prev
      );

      if (runOneTime) {
        const oneTimeIds = saved.mappings
          .filter((row) => row.sync_mode === "ONE_TIME" && row.is_active)
          .map((row) => row.id);

        if (!oneTimeIds.length) {
          showToast("Configuration saved. No one-time mappings were selected to run.", "info");
        } else {
          setQueueingRun(true);
          try {
            const job = await runCRMConnectionImports(serviceKey, { mapping_ids: oneTimeIds });
            registerJob(job);
          } finally {
            setQueueingRun(false);
          }
        }
      } else {
        showToast("Zoho CRM import configuration saved.", "success");
      }

      await load();
    } catch (err: any) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.field_map ||
        err?.response?.data?.module_api_name ||
        "Failed to save Zoho CRM import configuration.";
      showToast(typeof detail === "string" ? detail : "Failed to save Zoho CRM import configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (serviceKey !== "zoho-crm") {
    return (
      <div className="space-y-6">
        <ListPageHeader section="Settings" title="Unsupported CRM Connection" />
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={() => navigate("/settings/crm-settings")}
            className="rounded-full border border-kk-dark-input-border px-4 py-2 text-xs hover:bg-kk-dark-hover"
          >
            Back to CRM Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ListPageHeader
        section="Settings"
        title="Zoho CRM Import Management"
        subtitle="Map Zoho module fields into the admin-portal CRM category, including related records like minors, addresses, waivers, and employee profile fields."
        right={
          <button
            type="button"
            onClick={() => navigate("/settings/crm-settings")}
            className="rounded-full border border-kk-dark-input-border px-4 py-2 text-xs hover:bg-kk-dark-hover"
          >
            Back to CRM Settings
          </button>
        }
      />

      <div className="space-y-4 px-6 pb-6">
        {loading ? (
          <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 text-sm text-kk-dark-text-muted">
            Loading Zoho CRM modules...
          </div>
        ) : !management ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            Unable to load Zoho CRM import management.
          </div>
        ) : (
          <>
            <section className="space-y-3 rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-kk-dark-input-border px-3 py-1 text-xs">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      management.status === "CONNECTED" ? "bg-emerald-500" : "bg-gray-500"
                    }`}
                  />
                  {management.connection_name}
                </div>
                <div className="text-xs text-kk-dark-text-muted">{management.api_domain || "No API domain saved."}</div>
              </div>
              <p className="text-xs text-kk-dark-text-muted">{management.token_notice}</p>
              {management.module_error ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
                  {management.module_error}
                </div>
              ) : null}
            </section>

            <section className="space-y-3 rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">Zoho Modules</h3>
                  <p className="text-xs text-kk-dark-text-muted">
                    Choose a category, then map Zoho layout fields into the matching admin-portal tables before
                    saving recurring or one-time imports.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void saveMappings(false)}
                    disabled={saving || queueingRun || Boolean(management.module_error)}
                    className="inline-flex items-center gap-1 rounded-full border border-kk-dark-input-border px-4 py-2 text-xs hover:bg-kk-dark-hover disabled:opacity-60"
                  >
                    {saving && !queueingRun ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save Configuration
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveMappings(true)}
                    disabled={saving || queueingRun || Boolean(management.module_error)}
                    className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {queueingRun ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save And Run One-Time Imports
                  </button>
                </div>
              </div>

              {!visibleModules.length ? (
                <div className="text-xs text-kk-dark-text-muted">
                  {management.module_error
                    ? "Resolve the Zoho CRM connection error above to load modules."
                    : "No Zoho CRM modules available."}
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleModules.map((module) => {
                    const draft = drafts[module.api_name];
                    const saved = mappingByApiName.get(module.api_name);
                    const catalogKey = buildCatalogKey(module.api_name, draft?.crm_category || "");
                    const catalog = catalogs[catalogKey];
                    const catalogError = catalogErrors[catalogKey];
                    const isCatalogLoading = Boolean(catalogLoading[catalogKey]);
                    const groupedCatalogTargets = catalog ? groupTargets(catalog.targets) : [];

                    return (
                      <div
                        key={module.api_name}
                        className="space-y-3 rounded-md border border-kk-dark-border bg-kk-dark-bg p-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium">{module.label}</div>
                            <div className="text-xs text-kk-dark-text-muted">{module.api_name}</div>
                          </div>
                          <label className="inline-flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              className="h-4 w-4 accent-emerald-600"
                              checked={Boolean(draft?.is_active)}
                              onChange={(e) =>
                                setDraft(module.api_name, {
                                  is_active: e.target.checked,
                                  crm_category:
                                    e.target.checked && !draft?.crm_category
                                      ? management.enabled_categories[0] || ""
                                      : draft?.crm_category || "",
                                })
                              }
                            />
                            Enable import
                          </label>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="space-y-1">
                            <label className="text-xs text-kk-dark-text-muted">CRM category</label>
                            <select
                              value={draft?.crm_category || ""}
                              disabled={!draft?.is_active}
                              onChange={(e) =>
                                setDraft(module.api_name, {
                                  crm_category: e.target.value as CRMCategory | "",
                                  is_active: Boolean(e.target.value),
                                  field_map: {},
                                })
                              }
                              className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm disabled:opacity-60"
                            >
                              <option value="">Do not import</option>
                              {management.enabled_categories.map((category) => (
                                <option key={category} value={category}>
                                  {category}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs text-kk-dark-text-muted">Import mode</label>
                            <select
                              value={draft?.sync_mode || "ONE_TIME"}
                              disabled={!draft?.is_active || !draft?.crm_category}
                              onChange={(e) =>
                                setDraft(module.api_name, {
                                  sync_mode: e.target.value as CRMImportSyncMode,
                                })
                              }
                              className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm disabled:opacity-60"
                            >
                              <option value="ONE_TIME">One-time import</option>
                              <option value="RECURRING">Recurring on Zoho creates and edits</option>
                            </select>
                          </div>
                        </div>

                        {draft?.is_active && draft.crm_category ? (
                          <div className="space-y-3 rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
                            <div>
                              <div className="text-sm font-medium">Field Mapping</div>
                              <div className="text-xs text-kk-dark-text-muted">
                                Select which Zoho field should fill each admin-portal field for the {draft.crm_category} import.
                              </div>
                            </div>

                            {isCatalogLoading ? (
                              <div className="inline-flex items-center gap-2 text-xs text-kk-dark-text-muted">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Loading Zoho module fields...
                              </div>
                            ) : catalogError ? (
                              <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-100">
                                {catalogError}
                              </div>
                            ) : !catalog ? (
                              <div className="text-xs text-kk-dark-text-muted">
                                Select a category to load Zoho field metadata.
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {groupedCatalogTargets.map((group) => (
                                  <div
                                    key={group.groupKey}
                                    className="space-y-3 rounded-md border border-kk-dark-border bg-kk-dark-bg p-3"
                                  >
                                    <div>
                                      <div className="text-sm font-medium">{group.groupLabel}</div>
                                      <div className="text-[11px] text-kk-dark-text-muted">
                                        {group.repeated
                                          ? "Map repeated Zoho rows here when the module stores nested entries like subforms."
                                          : "Map direct Zoho fields into this record."}
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                      {group.fields.map((target) => (
                                        <div key={target.key} className="space-y-1">
                                          <label className="text-xs text-kk-dark-text-muted">
                                            {target.label}
                                            {target.required ? <span className="ml-1 text-red-500">*</span> : null}
                                          </label>
                                          <select
                                            value={draft.field_map[target.key] || ""}
                                            onChange={(e) =>
                                              setDraftFieldMap(module.api_name, target.key, e.target.value)
                                            }
                                            className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                                          >
                                            <option value="">Do not map this field</option>
                                            {catalog.fields.map((field) => (
                                              <option key={field.path} value={field.path}>
                                                {formatSourceFieldOption(field)}
                                              </option>
                                            ))}
                                          </select>
                                          {target.help_text ? (
                                            <div className="text-[11px] text-kk-dark-text-muted">{target.help_text}</div>
                                          ) : null}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null}

                        <div className="grid grid-cols-1 gap-3 text-xs text-kk-dark-text-muted md:grid-cols-5">
                          <div>
                            <div>Last status</div>
                            <div className="mt-1">{saved ? statusBadge(saved.last_import_status) : "Not saved yet"}</div>
                          </div>
                          <div>
                            <div>Watch health</div>
                            <div className="mt-1">{saved ? watchStatusBadge(saved.watch_status) : "Not saved yet"}</div>
                            {saved?.watch_status_detail ? (
                              <div className="mt-1 text-[11px] text-kk-dark-text-muted">{saved.watch_status_detail}</div>
                            ) : null}
                          </div>
                          <div>
                            <div>Last import</div>
                            <div className="mt-1 text-sm text-white">{formatDateTime(saved?.last_import_at)}</div>
                          </div>
                          <div>
                            <div>Imported records</div>
                            <div className="mt-1 text-sm text-white">{saved?.last_import_count ?? 0}</div>
                          </div>
                          <div>
                            <div>Notification expiry</div>
                            <div className="mt-1 text-sm text-white">{formatDateTime(saved?.notification_expires_at)}</div>
                          </div>
                        </div>

                        {saved?.last_import_message ? (
                          <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-3 text-xs text-kk-dark-text-muted">
                            {saved.last_import_message}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2 rounded-md border border-kk-dark-border bg-kk-dark-bg p-3">
                <div className="text-xs font-semibold text-white">Recent connection imports</div>
                {!connectionImportJobs.length ? (
                  <div className="text-xs text-kk-dark-text-muted">
                    No Zoho CRM one-time imports have been started yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {connectionImportJobs.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated px-3 py-2 text-xs text-kk-dark-text-muted"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="font-medium text-white">{job.source_label || "Zoho CRM import"}</div>
                          {importJobStatusBadge(job.status)}
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-4">
                          <div>
                            <div>Started</div>
                            <div className="mt-1 text-white">{formatDateTime(job.started_at || job.created_at)}</div>
                          </div>
                          <div>
                            <div>Finished</div>
                            <div className="mt-1 text-white">{formatDateTime(job.finished_at)}</div>
                          </div>
                          <div>
                            <div>Imported</div>
                            <div className="mt-1 text-white">{job.record_count}</div>
                          </div>
                          <div>
                            <div>Issues</div>
                            <div className="mt-1 text-white">{job.failed_count + job.skipped_count}</div>
                          </div>
                        </div>
                        {job.message ? <div className="mt-2">{job.message}</div> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>

      <ToastModal message={toastMessage} variant={toastVariant} onClose={() => setToastMessage(null)} />
    </div>
  );
}
