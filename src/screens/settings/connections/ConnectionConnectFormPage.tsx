import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { fetchConnectionSetting, upsertConnectionSetting } from "../../../api/payments";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";
import type { ConnectionSetting } from "../../../types/payments";

const META_CONNECTION_NAME = "meta_connection_name";
const META_SCOPE = "meta_scope";
const META_SERVICE_LINK = "meta_service_link_name";
const META_ASSOCIATIONS = "meta_connections_associated";

const DEFAULT_SCOPE = "Default scope";
const DEFAULT_ASSOCIATIONS = "Default associations";

function toFieldKey(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function toStringValue(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((part) => String(part)).join(", ");
  return "";
}

function inputTypeFor(label: string) {
  const lowered = label.toLowerCase();
  if (lowered.includes("url")) return "url";
  if (
    lowered.includes("secret") ||
    lowered.includes("token") ||
    lowered.includes("password") ||
    lowered.includes("hash")
  ) {
    return "password";
  }
  return "text";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function ConnectionConnectFormPage() {
  const { appId } = useParams<{ appId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setting, setSetting] = useState<ConnectionSetting | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("error");
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());

  const showToast = (message: string, variant: "error" | "success" | "info" = "error") => {
    setToastVariant(variant);
    setToastMessage(message);
  };

  useEffect(() => {
    if (!appId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const detail = await fetchConnectionSetting(appId);
        if (!mounted) return;

        setSetting(detail);

        const initial: Record<string, string> = {};
        const inputValues = isPlainObject(detail.connection_inputs) ? detail.connection_inputs : {};

        for (const label of detail.required_connection_inputs) {
          initial[`in_${toFieldKey(label)}`] = toStringValue(inputValues[toFieldKey(label)]);
        }

        initial[META_CONNECTION_NAME] = detail.connection_name || `${detail.service_name} Connection`;
        initial[META_SCOPE] = detail.scope || DEFAULT_SCOPE;
        initial[META_SERVICE_LINK] = detail.service_link_name || detail.service_name;
        initial[META_ASSOCIATIONS] = detail.connections_associated || DEFAULT_ASSOCIATIONS;
        setValues(initial);
        setSelectedOptions(new Set(detail.integration_targets || []));
      } catch (err: any) {
        if (!mounted) return;
        showToast(err?.response?.data?.detail || "Failed to load connection details.");
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

  const integrationOptions = setting?.integration_options || [];

  const toggleIntegrationOption = (option: string) => {
    setSelectedOptions((prev) => {
      const next = new Set(prev);
      if (next.has(option)) next.delete(option);
      else next.add(option);
      return next;
    });
  };

  const onSubmit = async () => {
    if (!setting) {
      showToast("Connection settings are not loaded yet.");
      return;
    }

    const connectionInputs = isPlainObject(setting.connection_inputs) ? { ...setting.connection_inputs } : {};
    const connectionOutputs = isPlainObject(setting.connection_outputs) ? { ...setting.connection_outputs } : {};

    for (const label of setting.required_connection_inputs) {
      const key = toFieldKey(label);
      const formValue = (values[`in_${key}`] || "").trim();
      if (!formValue) {
        showToast(`${label} is required.`);
        return;
      }
      connectionInputs[key] = formValue;
    }

    setSaving(true);
    try {
      const integrationTargets = Array.from(selectedOptions);

      if (setting.service_key === "paystack") {
        const mode = String(connectionInputs.mode || "TEST").trim().toUpperCase();
        const normalizedMode = mode === "LIVE" ? "LIVE" : "TEST";
        const secret = toStringValue(connectionInputs.secret_key).trim();
        const publicKey = toStringValue(connectionInputs.public_key).trim();
        const webhookUrl = toStringValue(connectionOutputs.webhook_url || connectionInputs.webhook_url).trim();

        connectionInputs.mode = normalizedMode;
        connectionInputs.secret_key = secret;
        connectionInputs.public_key = publicKey;
        connectionInputs.webhook_url = webhookUrl;
        connectionInputs.use_online_store = integrationTargets.includes("Online Store Checkout");

        if (normalizedMode === "LIVE") {
          connectionInputs.live_secret_key = secret;
          connectionInputs.live_public_key = publicKey;
          connectionInputs.live_webhook_url = webhookUrl;
        } else {
          connectionInputs.test_secret_key = secret;
          connectionInputs.test_public_key = publicKey;
          connectionInputs.test_webhook_url = webhookUrl;
        }

        connectionOutputs.webhook_url = webhookUrl;
        if (normalizedMode === "LIVE") {
          connectionOutputs.live_webhook_url = webhookUrl;
        } else {
          connectionOutputs.test_webhook_url = webhookUrl;
        }
      }

      await upsertConnectionSetting(setting.service_key, {
        status: "CONNECTED",
        connection_name: (values[META_CONNECTION_NAME] || `${setting.service_name} Connection`).trim(),
        scope: (values[META_SCOPE] || DEFAULT_SCOPE).trim(),
        service_link_name: (values[META_SERVICE_LINK] || setting.service_name).trim(),
        connections_associated: (values[META_ASSOCIATIONS] || DEFAULT_ASSOCIATIONS).trim(),
        integration_targets: integrationTargets,
        connection_inputs: connectionInputs,
        connection_outputs: connectionOutputs,
        last_ping_success: true,
        last_ping_message: "Connection saved successfully.",
      });

      showToast("Connection saved.", "success");
      navigate(`/settings/connections/${setting.service_key}`);
    } catch (err: any) {
      showToast(err?.response?.data?.detail || "Failed to save connection.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <ListPageHeader
        section="Settings"
        title={`Connect ${setting?.service_name || "App"}`}
        subtitle="Provide the required credentials to create this connection."
      />

      <div className="px-6 pb-6">
        <div className="rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated p-4 space-y-5">
          {loading ? (
            <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-4 text-sm text-kk-dark-text-muted">
              Loading form...
            </div>
          ) : !setting ? (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
              Connection metadata was not found.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {setting.required_connection_inputs.map((label) => {
                  const key = toFieldKey(label);
                  const valueKey = `in_${key}`;
                  return (
                    <div key={valueKey} className="space-y-1">
                      <label className="text-xs text-kk-dark-text-muted">
                        {label}
                        <span className="ml-1 text-red-500">*</span>
                      </label>
                      <input
                        type={inputTypeFor(label)}
                        value={values[valueKey] || ""}
                        onChange={(e) => setValues((prev) => ({ ...prev, [valueKey]: e.target.value }))}
                        placeholder={label}
                        className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      />
                    </div>
                  );
                })}
              </div>

              {integrationOptions.length ? (
                <div className="space-y-2 rounded-md border border-kk-dark-border bg-kk-dark-bg p-3">
                  <p className="text-xs text-kk-dark-text-muted">Integration options</p>
                  <div className="flex flex-wrap gap-3">
                    {integrationOptions.map((option) => (
                      <label key={option} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-emerald-600"
                          checked={selectedOptions.has(option)}
                          onChange={() => toggleIntegrationOption(option)}
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 border-t border-kk-dark-border pt-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Connection name</label>
                  <input
                    value={values[META_CONNECTION_NAME] || ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [META_CONNECTION_NAME]: e.target.value }))}
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Scope</label>
                  <input
                    value={values[META_SCOPE] || ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [META_SCOPE]: e.target.value }))}
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Service link name</label>
                  <input
                    value={values[META_SERVICE_LINK] || ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [META_SERVICE_LINK]: e.target.value }))}
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Connections associated</label>
                  <input
                    value={values[META_ASSOCIATIONS] || ""}
                    onChange={(e) => setValues((prev) => ({ ...prev, [META_ASSOCIATIONS]: e.target.value }))}
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => navigate(`/settings/connections/${setting.service_key}`)}
                  className="rounded-full border border-red-500 px-4 py-2 text-xs text-red-500 hover:bg-red-500/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={onSubmit}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Connect
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <ToastModal message={toastMessage} variant={toastVariant} onClose={() => setToastMessage(null)} />
    </div>
  );
}
