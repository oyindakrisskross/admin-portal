import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { fetchConnectionSetting } from "../../../api/payments";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import type { ConnectionSetting } from "../../../types/payments";

function detailValue(value?: string, fallback = "Placeholder") {
  const trimmed = (value || "").trim();
  return trimmed || fallback;
}

function subtitleFor(setting: ConnectionSetting | null) {
  if (!setting) return "";
  if (setting.integration_options.length) {
    return `Available for: ${setting.integration_options.join(", ")}`;
  }
  return "Create and manage this app connection.";
}

export function ConnectionDetailPage() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setting, setSetting] = useState<ConnectionSetting | null>(null);

  useEffect(() => {
    if (!appId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const detail = await fetchConnectionSetting(appId);
        if (!mounted) return;
        setSetting(detail);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.response?.data?.detail || "Failed to load connection details.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [appId]);

  const connected = setting?.status === "CONNECTED";

  const summaryRows = useMemo(
    () => [
      {
        label: "Connection status",
        value: connected ? "Connected" : "Disconnected",
      },
      {
        label: "Connection name",
        value: detailValue(setting?.connection_name, `${setting?.service_name ?? "App"} Connection`),
      },
      {
        label: "Scope",
        value: detailValue(setting?.scope, "Placeholder scope"),
      },
      {
        label: "Service link name",
        value: detailValue(setting?.service_link_name, setting?.service_name || "Placeholder service link"),
      },
      {
        label: "Connections associated",
        value: detailValue(setting?.connections_associated, "Placeholder associations"),
      },
    ],
    [
      connected,
      setting?.connection_name,
      setting?.connections_associated,
      setting?.scope,
      setting?.service_link_name,
      setting?.service_name,
    ]
  );

  if (!appId) {
    return (
      <div className="p-6 space-y-4">
        <ListPageHeader section="Settings" title="Connection not found" />
        <button
          type="button"
          onClick={() => navigate("/settings/connections")}
          className="rounded-full border border-kk-dark-input-border px-4 py-2 text-xs hover:bg-kk-dark-hover"
        >
          Back to Connections
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ListPageHeader
        section="Settings"
        title={setting?.service_name || "Connection"}
        subtitle={subtitleFor(setting)}
        right={
          <button
            type="button"
            onClick={() => navigate(`/settings/connections/${appId}/connect`)}
            className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Connect
          </button>
        }
      />

      <div className="px-6 pb-6 space-y-4">
        {loading ? (
          <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 text-sm text-kk-dark-text-muted">
            Loading connection details...
          </div>
        ) : error ? (
          <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
        ) : (
          <div className="rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-kk-dark-input-border px-3 py-1 text-xs">
              <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500" : "bg-gray-500"}`} />
              {connected ? "Connected" : "Disconnected"}
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {summaryRows.map((row) => (
                <div key={row.label} className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-3">
                  <p className="text-xs text-kk-dark-text-muted">{row.label}</p>
                  <p className="mt-1 text-sm">{row.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate("/settings/connections")}
          className="rounded-full border border-kk-dark-input-border px-4 py-2 text-xs hover:bg-kk-dark-hover"
        >
          Back to Connections
        </button>
      </div>
    </div>
  );
}
