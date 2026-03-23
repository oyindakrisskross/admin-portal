import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";

import { fetchConnectionServices, fetchConnectionSettings } from "../../../api/payments";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import type { ConnectionService, ConnectionSetting } from "../../../types/payments";

const DEFAULT_TYPE = "Other";

const initialsFor = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

type AppRow = {
  service: ConnectionService;
  setting: ConnectionSetting | null;
  connected: boolean;
};

function appSummary(service: ConnectionService) {
  const parts: string[] = [];
  if (service.required_connection_inputs.length) {
    parts.push(`Inputs: ${service.required_connection_inputs.join(", ")}`);
  }
  if (service.integration_options.length) {
    parts.push(`Use cases: ${service.integration_options.join(", ")}`);
  }
  return parts.join(" • ") || "Configure this connection to start integrating.";
}

function AppCard({
  row,
  onClick,
}: {
  row: AppRow;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated p-4 text-left hover:border-kk-dark-input-border hover:bg-[rgba(255,255,255,0.03)]"
    >
      {row.connected ? <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-emerald-500" /> : null}
      <div className="flex items-center gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-kk-dark-input-border bg-kk-dark-bg text-xs font-semibold">
          {initialsFor(row.service.name)}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{row.service.name}</div>
          <div className="text-xs text-kk-dark-text-muted">{row.service.service_type || DEFAULT_TYPE}</div>
        </div>
      </div>
      <p className="mt-3 text-xs text-kk-dark-text-muted">{appSummary(row.service)}</p>
    </button>
  );
}

export function ConnectionsPage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [services, setServices] = useState<ConnectionService[]>([]);
  const [settings, setSettings] = useState<ConnectionSetting[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [servicesRes, settingsRes] = await Promise.all([
          fetchConnectionServices(),
          fetchConnectionSettings(),
        ]);
        if (!mounted) return;
        setServices(servicesRes);
        setSettings(settingsRes);
        const types = Array.from(
          new Set(servicesRes.map((svc) => (svc.service_type || DEFAULT_TYPE).trim() || DEFAULT_TYPE))
        ).sort((a, b) => a.localeCompare(b));
        setSelectedTypes(new Set(types));
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.response?.data?.detail || "Failed to load connections.");
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

  const serviceTypes = useMemo(
    () =>
      Array.from(
        new Set(services.map((svc) => (svc.service_type || DEFAULT_TYPE).trim() || DEFAULT_TYPE))
      ).sort((a, b) => a.localeCompare(b)),
    [services]
  );

  const allSelected = serviceTypes.length > 0 && selectedTypes.size === serviceTypes.length;

  const rows = useMemo(() => {
    const settingByServiceKey = new Map(settings.map((row) => [row.service_key, row]));
    return services.map((service) => {
      const setting = settingByServiceKey.get(service.key) ?? null;
      return {
        service,
        setting,
        connected: Boolean(setting && setting.status === "CONNECTED"),
      };
    });
  }, [services, settings]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const typeName = (row.service.service_type || DEFAULT_TYPE).trim() || DEFAULT_TYPE;
      if (!selectedTypes.has(typeName)) return false;
      if (!q) return true;
      return (
        row.service.name.toLowerCase().includes(q) ||
        typeName.toLowerCase().includes(q) ||
        appSummary(row.service).toLowerCase().includes(q)
      );
    });
  }, [rows, query, selectedTypes]);

  const connectedRows = filteredRows.filter((row) => row.connected);
  const otherRows = filteredRows.filter((row) => !row.connected);

  const toggleType = (typeName: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(typeName)) next.delete(typeName);
      else next.add(typeName);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedTypes(allSelected ? new Set() : new Set(serviceTypes));
  };

  return (
    <div className="space-y-6">
      <ListPageHeader
        section="Settings"
        title="Connections"
        subtitle="Create and manage connections with third-party services."
      />

      <div className="px-6 pb-6">
        <div className="flex items-start gap-6">
          <aside className="sticky top-6 w-64 shrink-0 rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
            <h2 className="text-sm font-semibold">Filter by app type</h2>
            <div className="mt-3 space-y-2 border-b border-kk-dark-border pb-3">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-emerald-600"
                  checked={allSelected}
                  onChange={toggleAll}
                />
                Select all
              </label>
            </div>
            <div className="mt-3 space-y-2">
              {serviceTypes.map((typeName) => (
                <label key={typeName} className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-emerald-600"
                    checked={selectedTypes.has(typeName)}
                    onChange={() => toggleType(typeName)}
                  />
                  {typeName}
                </label>
              ))}
            </div>
          </aside>

          <section className="min-w-0 flex-1 space-y-6">
            <div className="relative max-w-xl">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kk-dark-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search apps..."
                className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg py-2 pl-9 pr-3 text-sm"
              />
            </div>

            {loading ? (
              <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 text-sm text-kk-dark-text-muted">
                Loading connections...
              </div>
            ) : error ? (
              <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Connected apps</h3>
                  {connectedRows.length === 0 ? (
                    <div className="rounded-md border border-dashed border-kk-dark-border bg-kk-dark-bg-elevated p-4 text-xs text-kk-dark-text-muted">
                      No connected apps yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {connectedRows.map((row) => (
                        <AppCard
                          key={row.service.key}
                          row={row}
                          onClick={() => navigate(`/settings/connections/${row.service.key}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Other apps</h3>
                  {otherRows.length === 0 ? (
                    <div className="rounded-md border border-dashed border-kk-dark-border bg-kk-dark-bg-elevated p-4 text-xs text-kk-dark-text-muted">
                      No apps match the current search/filter selection.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {otherRows.map((row) => (
                        <AppCard
                          key={row.service.key}
                          row={row}
                          onClick={() => navigate(`/settings/connections/${row.service.key}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
