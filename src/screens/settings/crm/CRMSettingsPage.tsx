import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";
import {
  commitCRMImportCSV,
  exportContactsCsv,
  fetchCRMConnectionImportOptions,
  fetchCRMOnlineFormImportOptions,
  fetchCRMSettings,
  parseCRMImportCSV,
  updateCRMSettings,
  type CRMCSVCommitResult,
  type CRMCSVParseResult,
  type CRMCategory,
  type CRMConnectionImportOption,
  type CRMSettingsRecord,
} from "../../../api/contact";
import type { ContactType } from "../../../types/contact";

function normalizeHeader(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function createDefaultMapping(parsed: CRMCSVParseResult): Record<string, string> {
  const byNormalizedHeader = new Map<string, string>();
  for (const header of parsed.headers) {
    byNormalizedHeader.set(normalizeHeader(header), header);
  }

  const mapping: Record<string, string> = {};
  for (const dbColumn of parsed.db_columns) {
    const keyMatch = byNormalizedHeader.get(normalizeHeader(dbColumn.key));
    if (keyMatch) {
      mapping[dbColumn.key] = keyMatch;
      continue;
    }
    const labelMatch = byNormalizedHeader.get(normalizeHeader(dbColumn.label));
    if (labelMatch) {
      mapping[dbColumn.key] = labelMatch;
    }
  }
  return mapping;
}

export function CRMSettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<CRMSettingsRecord | null>(null);

  const [categoryDraft, setCategoryDraft] = useState<Set<CRMCategory>>(new Set());
  const [savingCategories, setSavingCategories] = useState(false);

  const [exportCategory, setExportCategory] = useState<CRMCategory | "">("");
  const [importCategory, setImportCategory] = useState<CRMCategory | "">("");
  const [exporting, setExporting] = useState(false);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvParsed, setCsvParsed] = useState<CRMCSVParseResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [defaultContactType, setDefaultContactType] = useState<ContactType>("INDIVIDUAL");
  const [parsingCsv, setParsingCsv] = useState(false);
  const [importingCsv, setImportingCsv] = useState(false);
  const [importSummary, setImportSummary] = useState<CRMCSVCommitResult | null>(null);

  const [connectionOptions, setConnectionOptions] = useState<CRMConnectionImportOption[]>([]);
  const [connectionOptionsLoading, setConnectionOptionsLoading] = useState(true);

  const [formOptions, setFormOptions] = useState<CRMConnectionImportOption[]>([]);
  const [selectedFormServiceKey, setSelectedFormServiceKey] = useState("");
  const [savingFormOption, setSavingFormOption] = useState(false);
  const [formOptionsLoading, setFormOptionsLoading] = useState(true);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("error");

  const showToast = (message: string, variant: "error" | "success" | "info" = "error") => {
    setToastVariant(variant);
    setToastMessage(message);
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setConnectionOptionsLoading(true);
      setFormOptionsLoading(true);
      try {
        const [settingsRes, connectionRes, formRes] = await Promise.all([
          fetchCRMSettings(),
          fetchCRMConnectionImportOptions(),
          fetchCRMOnlineFormImportOptions(),
        ]);
        if (!mounted) return;

        setSettings(settingsRes);
        setCategoryDraft(new Set(settingsRes.enabled_categories || []));
        setExportCategory((settingsRes.enabled_categories?.[0] || settingsRes.available_categories?.[0] || "") as CRMCategory | "");

        setConnectionOptions(connectionRes);
        setConnectionOptionsLoading(false);

        setFormOptions(formRes.results || []);
        setSelectedFormServiceKey(formRes.selected_service_key || "");
        setFormOptionsLoading(false);
      } catch (err: any) {
        if (!mounted) return;
        showToast(err?.response?.data?.detail || "Failed to load CRM settings.");
        setConnectionOptionsLoading(false);
        setFormOptionsLoading(false);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const sortedCategoryOptions = useMemo(() => {
    if (!settings) return [];
    return [...(settings.available_categories || [])];
  }, [settings]);

  const csvImportCategoryOptions = useMemo(() => {
    if (!settings) return [];
    return settings.enabled_categories.filter((category) => category !== "Portal Users");
  }, [settings]);

  useEffect(() => {
    setImportCategory((prev) => {
      if (prev && csvImportCategoryOptions.includes(prev as CRMCategory)) {
        return prev;
      }
      return (csvImportCategoryOptions[0] || "") as CRMCategory | "";
    });
  }, [csvImportCategoryOptions]);

  const toggleCategory = (category: CRMCategory) => {
    setCategoryDraft((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const handleSaveCategories = async () => {
    if (!settings) return;
    const enabled = Array.from(categoryDraft);
    if (enabled.length === 0) {
      showToast("Select at least one CRM category.");
      return;
    }

    setSavingCategories(true);
    try {
      const updated = await updateCRMSettings({ enabled_categories: enabled });
      setSettings(updated);
      setCategoryDraft(new Set(updated.enabled_categories || []));
      if (exportCategory && !updated.enabled_categories.includes(exportCategory as CRMCategory)) {
        setExportCategory((updated.enabled_categories[0] || "") as CRMCategory | "");
      }
      showToast("CRM categories saved.", "success");
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "Failed to save CRM categories.");
    } finally {
      setSavingCategories(false);
    }
  };

  const handleExportCsv = async () => {
    if (!exportCategory) {
      showToast("Select a CRM category to export.");
      return;
    }

    setExporting(true);
    try {
      const { blob, filename } = await exportContactsCsv({ category: exportCategory as CRMCategory });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || "contacts.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("Contacts CSV downloaded.", "success");
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "Failed to export contacts CSV.");
    } finally {
      setExporting(false);
    }
  };

  const handleParseCsv = async () => {
    if (!csvFile) {
      showToast("Choose a CSV file first.");
      return;
    }

    setParsingCsv(true);
    try {
      const parsed = await parseCRMImportCSV(csvFile);
      setCsvParsed(parsed);
      setColumnMapping(createDefaultMapping(parsed));
      setImportSummary(null);
      showToast("CSV parsed successfully.", "success");
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "Failed to parse CSV.");
    } finally {
      setParsingCsv(false);
    }
  };

  const handleImportCsv = async () => {
    if (!csvFile || !csvParsed) {
      showToast("Upload and parse a CSV file first.");
      return;
    }
    if (!importCategory) {
      showToast("Select a CRM category to import into.");
      return;
    }

    setImportingCsv(true);
    try {
      const summary = await commitCRMImportCSV({
        file: csvFile,
        mapping: columnMapping,
        default_contact_type: defaultContactType,
        category: importCategory as CRMCategory,
      });
      setImportSummary(summary);
      showToast("CSV import complete.", "success");
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "Failed to import CSV.");
    } finally {
      setImportingCsv(false);
    }
  };

  const handleSaveOnlineFormSelection = async () => {
    setSavingFormOption(true);
    try {
      const updated = await updateCRMSettings({
        online_form_service_key: selectedFormServiceKey || "",
      });
      setSettings(updated);
      showToast("Online form import source updated.", "success");
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "Failed to save online form source.");
    } finally {
      setSavingFormOption(false);
    }
  };

  return (
    <div className="space-y-6">
      <ListPageHeader
        section="Settings"
        title="CRM Settings"
        subtitle="Configure contact export/import workflows and CRM categories."
      />

      <div className="space-y-4 px-6 pb-6">
        {loading || !settings ? (
          <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 text-sm text-kk-dark-text-muted">
            {loading ? "Loading..." : "No CRM settings found."}
          </div>
        ) : (
          <>
            <section className="space-y-3 rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
              <h3 className="text-sm font-semibold">Export Contacts</h3>
              <p className="text-xs text-kk-dark-text-muted">
                Download contacts in CSV format from the selected CRM category.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={exportCategory}
                  onChange={(e) => setExportCategory(e.target.value as CRMCategory)}
                  className="min-w-56 rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                >
                  <option value="">Select category</option>
                  {settings.enabled_categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={exporting}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Download CSV
                </button>
              </div>
            </section>

            <section className="space-y-3 rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
              <h3 className="text-sm font-semibold">Import From CSV</h3>
              <p className="text-xs text-kk-dark-text-muted">
                Upload a CSV file, choose the CRM category to import into, map each CSV column to a CRM field, then import contacts.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={importCategory}
                  onChange={(e) => setImportCategory(e.target.value as CRMCategory)}
                  className="min-w-56 rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                >
                  <option value="">Select category</option>
                  {csvImportCategoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => {
                    const nextFile = e.target.files?.[0] || null;
                    setCsvFile(nextFile);
                    setCsvParsed(null);
                    setColumnMapping({});
                    setImportSummary(null);
                  }}
                  className="max-w-sm rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleParseCsv}
                  disabled={!csvFile || parsingCsv}
                  className="inline-flex items-center gap-1 rounded-full border border-kk-dark-input-border px-4 py-2 text-xs hover:bg-kk-dark-hover disabled:opacity-60"
                >
                  {parsingCsv ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Parse CSV
                </button>
              </div>

              {csvParsed ? (
                <div className="space-y-3 rounded-md border border-kk-dark-border bg-kk-dark-bg p-3">
                  <p className="text-xs text-kk-dark-text-muted">
                    Parsed {csvParsed.row_count} row(s). Map CSV columns to CRM fields below.
                  </p>

                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {csvParsed.db_columns.map((dbColumn) => (
                      <label key={dbColumn.key} className="space-y-1">
                        <span className="text-xs text-kk-dark-text-muted">
                          {dbColumn.label}
                          {dbColumn.required ? <span className="ml-1 text-red-500">*</span> : null}
                        </span>
                        <select
                          value={columnMapping[dbColumn.key] || ""}
                          onChange={(e) =>
                            setColumnMapping((prev) => ({
                              ...prev,
                              [dbColumn.key]: e.target.value,
                            }))
                          }
                          className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                        >
                          <option value="">Do not import this field</option>
                          {csvParsed.headers.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <label className="text-xs text-kk-dark-text-muted">Default contact type</label>
                    <select
                      value={defaultContactType}
                      onChange={(e) => setDefaultContactType(e.target.value as ContactType)}
                      className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    >
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="BUSINESS">Business</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleImportCsv}
                      disabled={!importCategory || importingCsv}
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {importingCsv ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Import CSV
                    </button>
                  </div>

                  {settings.enabled_categories.includes("Portal Users") ? (
                    <p className="text-xs text-kk-dark-text-muted">
                      Portal Users are not available for CSV import because role and login setup is handled separately.
                    </p>
                  ) : null}

                  {importSummary ? (
                    <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-3 text-xs text-kk-dark-text-muted">
                      <div>Created: {importSummary.created_count}</div>
                      <div>Updated: {importSummary.updated_count}</div>
                      <div>Skipped: {importSummary.skipped_count}</div>
                      <div>Total rows: {importSummary.total_rows}</div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>

            <section className="space-y-3 rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
              <h3 className="text-sm font-semibold">Import From Connection</h3>
              <p className="text-xs text-kk-dark-text-muted">
                Available connected third-party apps with CRM integration enabled.
              </p>
              {connectionOptionsLoading ? (
                <div className="text-xs text-kk-dark-text-muted">Loading connection options...</div>
              ) : connectionOptions.length === 0 ? (
                <div className="text-xs text-kk-dark-text-muted">
                  No connected CRM-enabled apps available for import.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  {connectionOptions.map((option) => (
                    <button
                      type="button"
                      key={option.service_key}
                      onClick={() => {
                        if (option.service_key === "zoho-crm") {
                          navigate(`/settings/crm-settings/import-connections/${option.service_key}`);
                        }
                      }}
                      disabled={option.service_key !== "zoho-crm"}
                      className={`rounded-md border border-kk-dark-border bg-kk-dark-bg p-3 text-left ${
                        option.service_key === "zoho-crm" ? "hover:bg-kk-dark-hover" : ""
                      }`}
                    >
                      <div className="text-sm font-medium">{option.service_name}</div>
                      <div className="text-xs text-kk-dark-text-muted">
                        {option.connection_name} • {option.service_type || "Other"}
                      </div>
                      {option.service_key === "zoho-crm" ? (
                        <div className="mt-2 text-[11px] text-emerald-300">Open import management</div>
                      ) : null}
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
              <h3 className="text-sm font-semibold">Import From Online Form</h3>
              <p className="text-xs text-kk-dark-text-muted">
                Select the connected Forms app (with CRM integration enabled) to use as the online form contact source.
              </p>
              {formOptionsLoading ? (
                <div className="text-xs text-kk-dark-text-muted">Loading form options...</div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={selectedFormServiceKey}
                    onChange={(e) => setSelectedFormServiceKey(e.target.value)}
                    className="min-w-64 rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  >
                    <option value="">No form selected</option>
                    {formOptions.map((option) => (
                      <option key={option.service_key} value={option.service_key}>
                        {option.service_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleSaveOnlineFormSelection}
                    disabled={savingFormOption}
                    className="inline-flex items-center gap-1 rounded-full border border-kk-dark-input-border px-4 py-2 text-xs hover:bg-kk-dark-hover disabled:opacity-60"
                  >
                    {savingFormOption ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Save Form Source
                  </button>
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
              <h3 className="text-sm font-semibold">Manage CRM Categories</h3>
              <p className="text-xs text-kk-dark-text-muted">
                Enable or disable CRM categories used across contact workflows.
              </p>
              <div className="flex flex-wrap gap-3">
                {sortedCategoryOptions.map((category) => (
                  <label key={category} className="inline-flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-emerald-600"
                      checked={categoryDraft.has(category)}
                      onChange={() => toggleCategory(category)}
                    />
                    {category}
                  </label>
                ))}
              </div>
              <div>
                <button
                  type="button"
                  onClick={handleSaveCategories}
                  disabled={savingCategories}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {savingCategories ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Save Categories
                </button>
              </div>
            </section>
          </>
        )}
      </div>

      <ToastModal message={toastMessage} variant={toastVariant} onClose={() => setToastMessage(null)} />
    </div>
  );
}
