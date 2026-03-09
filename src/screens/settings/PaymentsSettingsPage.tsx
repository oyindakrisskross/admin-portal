import { useEffect, useState } from "react";
import { CheckCircle2, Search, X } from "lucide-react";

import ListPageHeader from "../../components/layout/ListPageHeader";
import ToastModal from "../../components/ui/ToastModal";
import { fetchPaystackSettings, updatePaystackSettings } from "../../api/payments";
import type { PaystackGatewaySettings } from "../../types/payments";

type SecretDraft = {
  test_secret_key: string;
  live_secret_key: string;
};

const EMPTY_SECRETS: SecretDraft = {
  test_secret_key: "",
  live_secret_key: "",
};

export default function PaymentsSettingsPage() {
  const [settings, setSettings] = useState<PaystackGatewaySettings | null>(null);
  const [secrets, setSecrets] = useState<SecretDraft>(EMPTY_SECRETS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("error");

  const showToast = (message: string, variant: "error" | "success" | "info" = "error") => {
    setToastVariant(variant);
    setToastMessage(message);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const paystack = await fetchPaystackSettings();
        if (cancelled) return;
        setSettings(paystack);
      } catch (e: any) {
        if (cancelled) return;
        showToast(e?.response?.data?.detail ?? e?.message ?? "Failed to load payment settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const togglePosLocation = (locationId: number) => {
    if (!settings) return;
    const selected = new Set(settings.pos_location_ids || []);
    if (selected.has(locationId)) selected.delete(locationId);
    else selected.add(locationId);
    setSettings({ ...settings, pos_location_ids: Array.from(selected).sort((a, b) => a - b) });
  };

  const handleSelectAllLocations = () => {
    if (!settings) return;
    setSettings({
      ...settings,
      pos_location_ids: (settings.available_pos_locations || [])
        .map((outlet) => outlet.id)
        .sort((a, b) => a - b),
    });
  };

  const handleRemoveAllLocations = () => {
    if (!settings) return;
    setSettings({
      ...settings,
      pos_location_ids: [],
    });
  };

  const handleRemoveLocation = (locationId: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      pos_location_ids: (settings.pos_location_ids || []).filter((id) => id !== locationId),
    });
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const patch: any = {
        mode: settings.mode,
        test_public_key: settings.test_public_key || "",
        test_callback_url: settings.test_callback_url || "",
        test_webhook_url: settings.test_webhook_url || "",
        live_public_key: settings.live_public_key || "",
        live_callback_url: settings.live_callback_url || "",
        live_webhook_url: settings.live_webhook_url || "",
        use_online_store: Boolean(settings.use_online_store),
        pos_location_ids: settings.pos_location_ids || [],
      };

      if ((secrets.test_secret_key || "").trim()) {
        patch.test_secret_key = secrets.test_secret_key.trim();
      }
      if ((secrets.live_secret_key || "").trim()) {
        patch.live_secret_key = secrets.live_secret_key.trim();
      }

      const next = await updatePaystackSettings(patch);
      setSettings(next);
      setSecrets(EMPTY_SECRETS);
      showToast("Payment settings saved.", "success");
    } catch (e: any) {
      showToast(e?.response?.data?.detail ?? e?.message ?? "Failed to save payment settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <ListPageHeader
        title="Payment Gateway Settings"
        subtitle="Configure Paystack now, with support for additional gateways."
      />

      <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 space-y-5">
        {loading || !settings ? (
          <div className="text-sm text-kk-dark-text-muted">{loading ? "Loading..." : "No settings found."}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs text-kk-dark-text-muted">Mode</label>
                <select
                  className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  value={settings.mode}
                  onChange={(e) => setSettings({ ...settings, mode: e.target.value as "TEST" | "LIVE" })}
                >
                  <option value="TEST">Test</option>
                  <option value="LIVE">Live</option>
                </select>
              </div>

              <label className="md:col-span-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={settings.use_online_store}
                  onChange={(e) => setSettings({ ...settings, use_online_store: e.target.checked })}
                />
                Enable Paystack for online store checkout
              </label>
            </div>

            <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-3 space-y-3">
              <div className="mb-1 pl-1">
                <h3 className="text-sm font-semibold">POS Portal Locations</h3>
                <p className="text-xs text-kk-dark-text-muted">
                  Select business locations where POS Paystack usage is enabled.
                </p>
              </div>

              <div className="h-64 grid grid-cols-2 gap-0 rounded-2xl border border-kk-dark-input-border overflow-hidden">
                <div className="border-r border-kk-dark-input-border">
                  <div className="flex items-center gap-2 border-b border-kk-dark-input-border px-4 py-3 text-xs text-kk-dark-text-muted">
                    <Search className="h-4 w-4" />
                    <input
                      type="text"
                      id="payments-location-search"
                      name="payments_location_search"
                      autoComplete="new-password"
                      className="w-full bg-transparent outline-none"
                      placeholder="Type to search Locations"
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleSelectAllLocations}
                    className="flex w-full items-center gap-2 border-b border-kk-dark-input-border px-4 py-2 text-xs hover:bg-kk-dark-hover"
                  >
                    <span
                      className={`flex h-4 w-4 items-center border border-kk-dark-input-border justify-center rounded-full text-[10px] text-white ${
                        (settings.available_pos_locations || []).length > 0 &&
                        (settings.pos_location_ids || []).length ===
                          (settings.available_pos_locations || []).length
                          ? "bg-emerald-500"
                          : "bg-transparent"
                      }`}
                    >
                      v
                    </span>
                    <span className="font-medium">Select All</span>
                  </button>

                  <div className="h-full overflow-auto">
                    {(settings.available_pos_locations || [])
                      .filter((outlet) =>
                        outlet.name.toLowerCase().includes(locationSearch.toLowerCase())
                      )
                      .map((outlet) => {
                        const selected = (settings.pos_location_ids || []).includes(outlet.id);
                        return (
                          <button
                            key={outlet.id}
                            type="button"
                            onClick={() => togglePosLocation(outlet.id)}
                            className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                              selected ? "bg-emerald-50" : "hover:bg-kk-dark-hover"
                            }`}
                          >
                            {selected ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <span className="h-4 w-4 rounded-full border border-kk-dark-input-border" />
                            )}
                            <span className={`${selected ? "font-semibold" : "font-medium"}`}>
                              {outlet.name}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>

                <div>
                  <div className="bg-kk-dark-bg flex items-center justify-between border-b border-kk-dark-input-border px-4 py-3 text-xs">
                    <span className="tracking-wide text-kk-dark-text">ACCESSIBLE LOCATIONS</span>
                    <button
                      type="button"
                      onClick={handleRemoveAllLocations}
                      className="inline-flex items-center gap-1 text-[11px] text-kk-dark-text-muted hover:text-red-500"
                    >
                      <span className="text-xs">-</span>
                      <span>Remove All</span>
                    </button>
                  </div>

                  <div className="h-full overflow-auto px-4 py-3 text-sm">
                    {(settings.pos_location_ids || []).length === 0 ? (
                      <p className="text-xs text-kk-dark-text-muted">No locations selected yet.</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {(settings.available_pos_locations || [])
                          .filter((outlet) => (settings.pos_location_ids || []).includes(outlet.id))
                          .map((outlet) => (
                            <li
                              key={outlet.id}
                              className="flex items-center justify-between gap-2"
                            >
                              <span>{outlet.name}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveLocation(outlet.id)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-kk-dark-input-border text-[11px] text-kk-dark-text-muted hover:border-red-500 hover:text-red-500"
                                aria-label={`Remove ${outlet.name}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </li>
                          ))}
                      </ul>
                    )}
                    {(settings.available_pos_locations || []).length === 0 ? (
                      <p className="text-xs text-kk-dark-text-muted">
                        No business locations available for this portal.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-3 space-y-3">
              <h3 className="text-sm font-semibold">Test Credentials</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Test Secret Key</label>
                  <input
                    type="password"
                    name="paystack_test_secret_key_input"
                    autoComplete="new-password"
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    placeholder={settings.test_secret_key_set ? "******** (set)" : "Paste secret key"}
                    value={secrets.test_secret_key}
                    onChange={(e) => setSecrets((prev) => ({ ...prev, test_secret_key: e.target.value }))}
                  />
                  <div className="text-[11px] text-kk-dark-text-muted">
                    {settings.test_secret_key_set
                      ? "Stored test secret detected. Leave blank to keep existing key."
                      : "No stored test secret yet."}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Test Public Key</label>
                  <input
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    value={settings.test_public_key || ""}
                    onChange={(e) => setSettings({ ...settings, test_public_key: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Test Callback URL</label>
                  <input
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    value={settings.test_callback_url || ""}
                    onChange={(e) => setSettings({ ...settings, test_callback_url: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Test Webhook URL</label>
                  <input
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    value={settings.test_webhook_url || ""}
                    onChange={(e) => setSettings({ ...settings, test_webhook_url: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-3 space-y-3">
              <h3 className="text-sm font-semibold">Live Credentials</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Live Secret Key</label>
                  <input
                    type="password"
                    name="paystack_live_secret_key_input"
                    autoComplete="new-password"
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    placeholder={settings.live_secret_key_set ? "******** (set)" : "Paste secret key"}
                    value={secrets.live_secret_key}
                    onChange={(e) => setSecrets((prev) => ({ ...prev, live_secret_key: e.target.value }))}
                  />
                  <div className="text-[11px] text-kk-dark-text-muted">
                    {settings.live_secret_key_set
                      ? "Stored live secret detected. Leave blank to keep existing key."
                      : "No stored live secret yet."}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Live Public Key</label>
                  <input
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    value={settings.live_public_key || ""}
                    onChange={(e) => setSettings({ ...settings, live_public_key: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Live Callback URL</label>
                  <input
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    value={settings.live_callback_url || ""}
                    onChange={(e) => setSettings({ ...settings, live_callback_url: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Live Webhook URL</label>
                  <input
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    value={settings.live_webhook_url || ""}
                    onChange={(e) => setSettings({ ...settings, live_webhook_url: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                className="rounded-md bg-kk-acc px-4 py-2 text-sm font-semibold text-kk-dark-bg disabled:opacity-60"
                onClick={save}
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
              <div className="text-xs text-kk-dark-text-muted">
                Last updated: {new Date(settings.updated_at).toLocaleString()}
              </div>
            </div>
          </>
        )}
      </div>

      {toastMessage && (
        <ToastModal
          message={toastMessage}
          variant={toastVariant}
          onClose={() => setToastMessage(null)}
        />
      )}
    </div>
  );
}
