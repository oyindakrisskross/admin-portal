import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { fetchConnectionSetting } from "../../../api/payments";
import { useAuth } from "../../../auth/AuthContext";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import type { ConnectionSetting } from "../../../types/payments";
import {
  extractWhatsAppCredentials,
  formatConnectionModeLabel,
  isWhatsAppService,
  loadWhatsAppConnectionWithFallback,
  WHATSAPP_SERVICE_KEY,
} from "../../../utils/whatsapp";

function detailValue(value?: string, fallback = "Placeholder") {
  const trimmed = (value || "").trim();
  return trimmed || fallback;
}

function subtitleFor(setting: ConnectionSetting | null) {
  if (!setting) return "";
  if (isWhatsAppService({ key: setting.service_key, name: setting.service_name, service_type: setting.service_type })) {
    return "Create templates for review, launch marketing and utility messages, upload media, and manage signed WhatsApp webhooks.";
  }
  if (setting.integration_options.length) {
    return `Available for: ${setting.integration_options.join(", ")}`;
  }
  return "Create and manage this app connection.";
}

export function ConnectionDetailPage() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();
  const { me } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [setting, setSetting] = useState<ConnectionSetting | null>(null);
  const [connectionMode, setConnectionMode] = useState<"remote" | "session">("remote");

  useEffect(() => {
    if (!appId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const detail =
          appId === WHATSAPP_SERVICE_KEY
            ? await loadWhatsAppConnectionWithFallback({ portalId: me?.portal, userId: me?.id })
            : { mode: "remote" as const, setting: await fetchConnectionSetting(appId) };
        if (!mounted) return;
        setSetting(detail.setting);
        setConnectionMode(detail.mode);
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
  }, [appId, me?.id, me?.portal]);

  const connected = setting?.status === "CONNECTED";
  const whatsappCredentials = extractWhatsAppCredentials(setting);

  const summaryRows = useMemo(
    () =>
      isWhatsAppService({
        key: setting?.service_key,
        name: setting?.service_name,
        service_type: setting?.service_type,
      })
        ? [
            {
              label: "Connection status",
              value: connected ? "Connected" : "Disconnected",
            },
            {
              label: "Storage mode",
              value: formatConnectionModeLabel(connectionMode),
            },
            {
              label: "Display phone number",
              value: detailValue(whatsappCredentials.displayPhoneNumber, "Not configured"),
            },
            {
              label: "WhatsApp Business Account ID",
              value: detailValue(whatsappCredentials.wabaId, "Not configured"),
            },
            {
              label: "Phone number ID",
              value: detailValue(whatsappCredentials.phoneNumberId, "Not configured"),
            },
            {
              label: "Business portfolio ID",
              value: detailValue(whatsappCredentials.businessPortfolioId, "Not configured"),
            },
            {
              label: "Webhook callback URL",
              value: detailValue(whatsappCredentials.webhookCallbackUrl, "Configure in your Meta app"),
            },
            {
              label: "Webhook signature verification",
              value: whatsappCredentials.appSecret ? "Enabled with App Secret" : "App Secret not configured",
            },
            {
              label: "Graph API version",
              value: detailValue(whatsappCredentials.graphApiVersion, "v24.0"),
            },
          ]
        : [
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
      connectionMode,
      setting?.connection_name,
      setting?.connections_associated,
      setting?.scope,
      setting?.service_key,
      setting?.service_link_name,
      setting?.service_name,
      setting?.service_type,
      whatsappCredentials.businessPortfolioId,
      whatsappCredentials.displayPhoneNumber,
      whatsappCredentials.graphApiVersion,
      whatsappCredentials.appSecret,
      whatsappCredentials.phoneNumberId,
      whatsappCredentials.wabaId,
      whatsappCredentials.webhookCallbackUrl,
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
            {connected ? "Update Connection" : "Connect"}
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
          <div className="space-y-4 rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-kk-dark-input-border px-3 py-1 text-xs">
              <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500" : "bg-gray-500"}`} />
              {connected ? "Connected" : "Disconnected"}
            </div>

            {connectionMode === "session" ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
                This WhatsApp connection is running in browser-session mode because the backend has not exposed a
                WhatsApp connection service yet. Credentials stay in this browser session and are not synced to the
                server.
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {summaryRows.map((row) => (
                <div key={row.label} className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-3">
                  <p className="text-xs text-kk-dark-text-muted">{row.label}</p>
                  <p className="mt-1 text-sm break-all">{row.value}</p>
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
