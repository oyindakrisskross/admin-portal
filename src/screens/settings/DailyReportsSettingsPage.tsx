import { useEffect, useMemo, useState } from "react";
import ToastModal from "../../components/ui/ToastModal";
import ListPageHeader from "../../components/layout/ListPageHeader";
import { fetchOutlets } from "../../api/location";
import { fetchDailyReportSettings, runDailyReports, updateDailyReportSettings } from "../../api/reports";
import type { Outlet } from "../../types/location";
import type { DailyReportRunResult, DailyReportSettings } from "../../types/dailyReports";

const SETTINGS_CACHE_KEY = "kk.dailyReports.settings.v1";

function toYMD(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function loadCachedSettings(): DailyReportSettings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as DailyReportSettings;
  } catch {
    return null;
  }
}

function saveCachedSettings(cfg: DailyReportSettings) {
  try {
    const { graph_client_secret, ...safe } = cfg;
    localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(safe));
  } catch {
    // ignore
  }
}

function normalizeTime(v: string) {
  const raw = (v || "").trim();
  if (!raw) return "00:00:00";
  if (raw.length === 5) return `${raw}:00`; // HH:MM -> HH:MM:SS
  return raw;
}

export default function DailyReportsSettingsPage() {
  const today = useMemo(() => new Date(), []);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [cfg, setCfg] = useState<DailyReportSettings | null>(null);
  const [loadedFromCache, setLoadedFromCache] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [runDate, setRunDate] = useState<string>(toYMD(today));
  const [runResults, setRunResults] = useState<DailyReportRunResult[] | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("error");

  const showToast = (message: string, variant: "error" | "success" | "info" = "error") => {
    setToastVariant(variant);
    setToastMessage(message);
  };

  useEffect(() => {
    fetchOutlets().then(setOutlets).catch(() => setOutlets([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const cached = loadCachedSettings();
    if (cached) {
      setCfg(cached);
      setLoadedFromCache(true);
    }
    (async () => {
      setLoading(true);
      try {
        const s = await fetchDailyReportSettings();
        if (cancelled) return;
        setCfg(s);
        setLoadedFromCache(false);
        saveCachedSettings(s);
      } catch (e: any) {
        if (cancelled) return;
        const fallback = cached ?? loadCachedSettings();
        if (fallback) {
          setCfg(fallback);
          setLoadedFromCache(true);
          showToast(
            "Loaded cached daily report settings (server not reachable). Save again to sync.",
            "info"
          );
        } else {
          showToast(e?.message ?? "Failed to load daily report settings");
          setCfg(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSave = async () => {
    if (!cfg) return;
    setSaving(true);
    try {
      const patch: Partial<DailyReportSettings> = {
        enabled: cfg.enabled,
        export_backend: cfg.export_backend,
        export_path: cfg.export_path,
        export_subdir: cfg.export_subdir,
        timezone: cfg.timezone,
        run_time: normalizeTime(cfg.run_time),
        apply_all_locations: cfg.apply_all_locations,
        location_ids: cfg.location_ids,
        items_mode: cfg.items_mode,
        include_payments: cfg.include_payments,
        include_item_lines: cfg.include_item_lines,
        include_refunds: cfg.include_refunds,
        graph_tenant_id: cfg.graph_tenant_id,
        graph_client_id: cfg.graph_client_id,
        graph_drive_id: cfg.graph_drive_id,
        graph_base_path: cfg.graph_base_path,
      };
      const secret = (cfg.graph_client_secret ?? "").trim();
      if (secret) patch.graph_client_secret = secret;

      const next = await updateDailyReportSettings(patch);
      setCfg(next);
      setLoadedFromCache(false);
      saveCachedSettings(next);
      showToast("Daily report settings saved.", "success");
    } catch (e: any) {
      saveCachedSettings(cfg);
      showToast(
        e?.response?.data?.detail ??
          e?.message ??
          "Failed to save settings to the server. Saved locally in this browser."
      );
    } finally {
      setSaving(false);
    }
  };

  const onRunNow = async () => {
    if (!cfg) return;
    setRunning(true);
    setRunResults(null);
    try {
      const resp = await runDailyReports({
        date: runDate,
        location_ids: cfg.apply_all_locations ? undefined : cfg.location_ids,
      });
      setRunResults(resp.results);
      const failed = resp.results.filter((r) => r.status !== "SUCCESS");
      if (failed.length) {
        showToast(
          `Generated with ${failed.length} failure(s). Check the results table for details.`,
          "error"
        );
      } else {
        showToast("Daily reports generated successfully.", "success");
      }
    } catch (e: any) {
      showToast(e?.response?.data?.detail ?? e?.message ?? "Failed to generate reports");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <ListPageHeader title="Daily Reports" subtitle="Auto-generate per-location daily sales reports." />

      <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 space-y-4">
        {loading || !cfg ? (
          <div className="text-sm text-kk-dark-text-muted">{loading ? "Loading…" : "No settings found."}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={cfg.enabled}
                  onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
                />
                Enable auto-generation
              </label>

              <div className="text-xs text-kk-dark-text-muted">
                Reports upload per location into `/{cfg.graph_base_path || "…"} / &lt;Location&gt; / &lt;YYYY&gt; / &lt;MM&gt; /`.
              </div>
            </div>

            {loadedFromCache && (
              <div className="text-xs text-amber-300">
                Using cached settings from this browser. Click “Save Settings” to sync to the server when it’s
                available.
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-kk-dark-text-muted">Export backend</label>
                <select
                  className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  value={cfg.export_backend}
                  onChange={(e) => setCfg({ ...cfg, export_backend: e.target.value as any })}
                >
                  <option value="GRAPH">Microsoft Graph (OneDrive/SharePoint)</option>
                  <option value="LOCAL">Local folder (server)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-kk-dark-text-muted">Base folder</label>
                <input
                  className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  value={cfg.export_backend === "GRAPH" ? cfg.graph_base_path : cfg.export_subdir}
                  onChange={(e) => {
                    if (cfg.export_backend === "GRAPH") setCfg({ ...cfg, graph_base_path: e.target.value });
                    else setCfg({ ...cfg, export_subdir: e.target.value });
                  }}
                  placeholder={cfg.export_backend === "GRAPH" ? "KrissKross Reports" : "Daily Reports"}
                />
              </div>
            </div>

            {cfg.export_backend === "GRAPH" ? (
              <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-3 space-y-3">
                <div className="text-xs text-kk-dark-text-muted">
                  Uses Microsoft Graph app-only credentials. You must create an Entra ID app with the right
                  permissions and admin consent.
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-kk-dark-text-muted">Tenant ID</label>
                    <input
                      className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      value={cfg.graph_tenant_id}
                      onChange={(e) => setCfg({ ...cfg, graph_tenant_id: e.target.value })}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-kk-dark-text-muted">Client ID</label>
                    <input
                      className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      value={cfg.graph_client_id}
                      onChange={(e) => setCfg({ ...cfg, graph_client_id: e.target.value })}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-kk-dark-text-muted">Client secret</label>
                    <input
                      type="password"
                      className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      value={cfg.graph_client_secret ?? ""}
                      onChange={(e) => setCfg({ ...cfg, graph_client_secret: e.target.value })}
                      placeholder={cfg.graph_client_secret_set ? "•••••••• (set)" : "Paste secret"}
                    />
                    <div className="text-[11px] text-kk-dark-text-muted">
                      Leave blank to keep existing secret.
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-kk-dark-text-muted">Drive ID</label>
                    <input
                      className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      value={cfg.graph_drive_id}
                      onChange={(e) => setCfg({ ...cfg, graph_drive_id: e.target.value })}
                      placeholder="b!…"
                    />
                    <div className="text-[11px] text-kk-dark-text-muted">
                      This is the OneDrive/SharePoint drive where files will be uploaded.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Export path (server)</label>
                  <input
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    value={cfg.export_path}
                    onChange={(e) => setCfg({ ...cfg, export_path: e.target.value })}
                    placeholder="e.g. C:\\Users\\Server\\OneDrive\\KrissKross"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Sub-folder</label>
                  <input
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    value={cfg.export_subdir}
                    onChange={(e) => setCfg({ ...cfg, export_subdir: e.target.value })}
                    placeholder="Daily Reports"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs text-kk-dark-text-muted">Timezone</label>
                <input
                  className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  value={cfg.timezone}
                  onChange={(e) => setCfg({ ...cfg, timezone: e.target.value })}
                  placeholder="Africa/Lagos"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-kk-dark-text-muted">Run time</label>
                <input
                  type="time"
                  className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  value={(cfg.run_time || "00:00:00").slice(0, 5)}
                  onChange={(e) => setCfg({ ...cfg, run_time: e.target.value })}
                />
                <div className="text-[11px] text-kk-dark-text-muted">
                  Recommended: set this shortly after midnight to capture the full previous day.
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-kk-dark-text-muted">Items mode</label>
                <select
                  className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  value={cfg.items_mode}
                  onChange={(e) => setCfg({ ...cfg, items_mode: e.target.value as any })}
                >
                  <option value="parents">Parents only (default)</option>
                  <option value="all">All lines (incl. customizations)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={cfg.include_item_lines}
                  onChange={(e) => setCfg({ ...cfg, include_item_lines: e.target.checked })}
                />
                Include invoice line details
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={cfg.include_payments}
                  onChange={(e) => setCfg({ ...cfg, include_payments: e.target.checked })}
                />
                Include payments breakdown
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={cfg.include_refunds}
                  onChange={(e) => setCfg({ ...cfg, include_refunds: e.target.checked })}
                />
                Include refunds
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={cfg.apply_all_locations}
                  onChange={(e) =>
                    setCfg({
                      ...cfg,
                      apply_all_locations: e.target.checked,
                      location_ids: e.target.checked ? [] : cfg.location_ids,
                    })
                  }
                />
                Apply to all locations
              </label>
            </div>

            {!cfg.apply_all_locations && (
              <div className="space-y-1">
                <label className="text-xs text-kk-dark-text-muted">Locations</label>
                <select
                  multiple
                  className="w-full min-h-[120px] rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  value={(cfg.location_ids || []).map(String)}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
                    setCfg({ ...cfg, location_ids: selected });
                  }}
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                className="rounded-md bg-kk-acc px-4 py-2 text-sm font-semibold text-kk-dark-bg disabled:opacity-60"
                onClick={onSave}
              >
                {saving ? "Saving…" : "Save Settings"}
              </button>
              {cfg.last_run_at && (
                <div className="text-xs text-kk-dark-text-muted">Last run: {new Date(cfg.last_run_at).toLocaleString()}</div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 space-y-3">
        <div className="text-sm font-semibold">Generate now</div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="space-y-1">
            <label className="text-xs text-kk-dark-text-muted">Date</label>
            <input
              type="date"
              value={runDate}
              onChange={(e) => setRunDate(e.target.value)}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            disabled={running || !cfg}
            className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-4 py-2 text-sm font-semibold disabled:opacity-60"
            onClick={onRunNow}
          >
            {running ? "Generating…" : "Generate Reports"}
          </button>
        </div>

        {runResults && (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b text-xs text-kk-dark-text-muted">
                <tr>
                  <th className="py-2 pr-4">Location</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">File</th>
                  <th className="py-2 pr-4">Error</th>
                </tr>
              </thead>
              <tbody>
                {runResults.map((r) => (
                  <tr key={`${r.location_id}-${r.report_date}`} className="border-b border-kk-dark-border">
                    <td className="py-2 pr-4">{r.location_name}</td>
                    <td className="py-2 pr-4">
                      <span className={r.status === "SUCCESS" ? "text-emerald-400" : "text-red-400"}>{r.status}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className="text-xs text-kk-dark-text-muted">{r.file_path || "—"}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className="text-xs text-kk-dark-text-muted">{r.error || "—"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ToastModal message={toastMessage} onClose={() => setToastMessage(null)} variant={toastVariant} />
    </div>
  );
}
