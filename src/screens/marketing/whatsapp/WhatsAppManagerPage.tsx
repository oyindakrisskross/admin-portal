import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  Cable,
  ChartNoAxesCombined,
  Eye,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCcw,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  Webhook,
} from "lucide-react";

import {
  createWhatsAppTemplate,
  deleteWhatsAppTemplateById,
  fetchWhatsAppPhoneNumbers,
  fetchWhatsAppTemplateById,
  fetchWhatsAppTemplates,
  sendWhatsAppTemplateMessage,
  sendWhatsAppTextMessage,
  subscribeWhatsAppApp,
  uploadWhatsAppMedia,
} from "../../../api/whatsapp";
import { useAuth } from "../../../auth/AuthContext";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";
import { humanizeStatus } from "../../../helpers";
import type { ConnectionSetting } from "../../../types/payments";
import type {
  WhatsAppManagerState,
  WhatsAppMessageActivityLog,
  WhatsAppPhoneNumber,
  WhatsAppTemplateCategory,
  WhatsAppTemplateRecord,
} from "../../../types/whatsapp";
import {
  extractWhatsAppCredentials,
  formatConnectionModeLabel,
  getWhatsAppManagerState,
  loadWhatsAppConnectionWithFallback,
  saveWhatsAppConnectionWithFallback,
  withWhatsAppManagerState,
  WHATSAPP_SERVICE_KEY,
} from "../../../utils/whatsapp";

type TemplateFormState = {
  name: string;
  category: WhatsAppTemplateCategory;
  language: string;
  body: string;
  bodyExampleValues: string;
};

type TemplateSendFormState = {
  conversationCategory: WhatsAppTemplateCategory;
  recipient: string;
  templateName: string;
  bodyVariables: string;
  purpose: string;
};

type ServiceMessageFormState = {
  recipient: string;
  body: string;
  previewUrl: boolean;
};

type TabKey = "templates" | "campaigns" | "service" | "platform";

const TEMPLATE_FORM_DEFAULTS: TemplateFormState = {
  name: "",
  category: "MARKETING",
  language: "en_US",
  body: "",
  bodyExampleValues: "",
};

const TEMPLATE_SEND_DEFAULTS: TemplateSendFormState = {
  conversationCategory: "MARKETING",
  recipient: "",
  templateName: "",
  bodyVariables: "",
  purpose: "",
};

const SERVICE_MESSAGE_DEFAULTS: ServiceMessageFormState = {
  recipient: "",
  body: "",
  previewUrl: false,
};

function splitLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function templateNameForApi(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function bodyPreview(template: WhatsAppTemplateRecord) {
  const body = template.components.find((component) => String(component.type || "").toUpperCase() === "BODY");
  return String(body?.text || "").trim();
}

function toneForStatus(status?: string) {
  const normalized = String(status || "").trim().toUpperCase();
  if (normalized === "APPROVED") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (normalized.includes("REJECT")) return "border-red-500/30 bg-red-500/10 text-red-200";
  if (normalized.includes("PEND")) return "border-amber-500/30 bg-amber-500/10 text-amber-100";
  return "border-kk-dark-input-border bg-kk-dark-bg text-kk-dark-text-muted";
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
      <div className="text-xs uppercase tracking-wide text-kk-dark-text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      {hint ? <div className="mt-1 text-xs text-kk-dark-text-muted">{hint}</div> : null}
    </div>
  );
}

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-kk-dark-text-muted">{subtitle}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

function buildTemplateCreatePayload(form: TemplateFormState) {
  const name = templateNameForApi(form.name);
  if (!name) throw new Error("Template name is required.");
  if (!form.body.trim()) throw new Error("Template body is required.");

  const body: Record<string, unknown> = {
    type: "BODY",
    text: form.body.trim(),
  };
  const examples = splitLines(form.bodyExampleValues);
  if (examples.length) {
    body.example = { body_text: [examples] };
  }

  return {
    name,
    category: form.category,
    language: form.language.trim(),
    components: [body],
  };
}

function buildTemplateSendComponents(form: TemplateSendFormState) {
  const values = splitLines(form.bodyVariables);
  if (!values.length) return [];
  return [
    {
      type: "body",
      parameters: values.map((text) => ({ type: "text", text })),
    },
  ];
}

export default function WhatsAppManagerPage() {
  const { me } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [templateSubmitting, setTemplateSubmitting] = useState(false);
  const [templateSending, setTemplateSending] = useState(false);
  const [serviceSending, setServiceSending] = useState(false);
  const [subscribingWebhooks, setSubscribingWebhooks] = useState(false);
  const [templateLoadingId, setTemplateLoadingId] = useState<string | null>(null);
  const [templateDeletingId, setTemplateDeletingId] = useState<string | null>(null);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [setting, setSetting] = useState<ConnectionSetting | null>(null);
  const [connectionMode, setConnectionMode] = useState<"remote" | "session">("remote");
  const [templates, setTemplates] = useState<WhatsAppTemplateRecord[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<WhatsAppPhoneNumber[]>([]);
  const [selectedTemplateDetail, setSelectedTemplateDetail] = useState<WhatsAppTemplateRecord | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPickerKey, setMediaPickerKey] = useState(0);
  const [lastUploadedMediaId, setLastUploadedMediaId] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("templates");
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(TEMPLATE_FORM_DEFAULTS);
  const [templateSendForm, setTemplateSendForm] = useState<TemplateSendFormState>(TEMPLATE_SEND_DEFAULTS);
  const [serviceForm, setServiceForm] = useState<ServiceMessageFormState>(SERVICE_MESSAGE_DEFAULTS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("info");

  const showToast = (message: string, variant: "error" | "success" | "info" = "info") => {
    setToastVariant(variant);
    setToastMessage(message);
  };

  const credentials = useMemo(() => extractWhatsAppCredentials(setting), [setting]);
  const connected = setting?.status === "CONNECTED";
  const canManageTemplates = Boolean(connected && credentials.accessToken && credentials.wabaId);
  const canSendMessages = Boolean(canManageTemplates && credentials.phoneNumberId);
  const canUploadMedia = canSendMessages;
  const managerState = useMemo(() => getWhatsAppManagerState(setting), [setting]);

  const approvedTemplates = useMemo(
    () => templates.filter((template) => String(template.status || "").toUpperCase() === "APPROVED"),
    [templates]
  );

  const filteredTemplates = useMemo(
    () =>
      templates.filter(
        (template) =>
          String(template.category || "").toUpperCase() === templateSendForm.conversationCategory &&
          String(template.status || "").toUpperCase() === "APPROVED"
      ),
    [templateSendForm.conversationCategory, templates]
  );

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.name === templateSendForm.templateName) || null,
    [templateSendForm.templateName, templates]
  );

  const activePhoneNumber = useMemo(
    () => phoneNumbers.find((row) => row.id === credentials.phoneNumberId) || phoneNumbers[0] || null,
    [credentials.phoneNumberId, phoneNumbers]
  );

  async function persistManagerState(
    nextState: WhatsAppManagerState,
    pingMessage?: string,
    lastPingSuccess = true
  ) {
    if (!setting) return;
    const nextSetting = withWhatsAppManagerState(setting, nextState);
    const result = await saveWhatsAppConnectionWithFallback(
      { portalId: me?.portal, userId: me?.id },
      {
        connection_outputs: nextSetting.connection_outputs,
        last_ping_message: pingMessage || setting.last_ping_message,
        last_ping_success: lastPingSuccess,
        status: setting.status,
      }
    );
    setConnectionMode(result.mode);
    setSetting(result.setting);
  }

  async function refreshPlatformData(silent = false) {
    if (!setting) return;
    if (!canManageTemplates) {
      setTemplates([]);
      setPhoneNumbers([]);
      return;
    }

    if (!silent) setRefreshing(true);
    try {
      const [templateRes, phoneNumberRes] = await Promise.all([
        fetchWhatsAppTemplates(),
        fetchWhatsAppPhoneNumbers(),
      ]);
      setTemplates(templateRes.data || []);
      setPhoneNumbers(phoneNumberRes.data || []);
    } catch (error: any) {
      showToast(error?.response?.data?.detail || error?.message || "Failed to refresh WhatsApp data.");
    } finally {
      if (!silent) setRefreshing(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const result = await loadWhatsAppConnectionWithFallback({ portalId: me?.portal, userId: me?.id });
        if (!mounted) return;
        setConnectionMode(result.mode);
        setSetting(result.setting);
      } catch (error: any) {
        if (!mounted) return;
        showToast(error?.message || "Failed to load WhatsApp connection.", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [me?.id, me?.portal]);

  useEffect(() => {
    if (!setting || !connected || !credentials.accessToken || !credentials.wabaId) {
      setTemplates([]);
      setPhoneNumbers([]);
      return;
    }
    void refreshPlatformData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, credentials.accessToken, credentials.graphApiVersion, credentials.wabaId]);

  useEffect(() => {
    if (!filteredTemplates.length) {
      setTemplateSendForm((prev) => ({ ...prev, templateName: "" }));
      return;
    }
    setTemplateSendForm((prev) => {
      if (filteredTemplates.some((template) => template.name === prev.templateName)) return prev;
      return { ...prev, templateName: filteredTemplates[0].name };
    });
  }, [filteredTemplates]);

  const createTemplate = async () => {
    if (!canManageTemplates) {
      showToast("Connect a WhatsApp Business number first.", "error");
      return;
    }

    setTemplateSubmitting(true);
    try {
      const payload = buildTemplateCreatePayload(templateForm);
      const created = await createWhatsAppTemplate(payload);

      const nextState: WhatsAppManagerState = {
        ...managerState,
        templateActivity: [
          {
            id: created.id || crypto.randomUUID(),
            name: payload.name,
            category: created.category || payload.category,
            status: created.status || "PENDING",
            createdAt: new Date().toISOString(),
          },
          ...managerState.templateActivity,
        ].slice(0, 20),
      };
      await persistManagerState(nextState, "Template submitted for review.");
      await refreshPlatformData(true);
      setTemplateForm(TEMPLATE_FORM_DEFAULTS);
      showToast("Template submitted to WhatsApp for review.", "success");
    } catch (error: any) {
      showToast(error?.response?.data?.detail || error?.message || "Failed to create template.", "error");
    } finally {
      setTemplateSubmitting(false);
    }
  };

  const loadTemplateDetail = async (template: WhatsAppTemplateRecord) => {
    if (!template.id) {
      showToast("This template does not expose a Meta template ID yet.", "error");
      return;
    }

    setTemplateLoadingId(template.id);
    try {
      const detail = await fetchWhatsAppTemplateById(template.id);
      setSelectedTemplateDetail(detail);
    } catch (error: any) {
      showToast(error?.response?.data?.detail || error?.message || "Failed to fetch template detail.", "error");
    } finally {
      setTemplateLoadingId(null);
    }
  };

  const deleteTemplate = async (template: WhatsAppTemplateRecord) => {
    if (!template.id) {
      showToast("This template does not expose a Meta template ID yet.", "error");
      return;
    }
    if (typeof window !== "undefined" && !window.confirm(`Delete template "${template.name}" from WhatsApp?`)) {
      return;
    }

    setTemplateDeletingId(template.id);
    try {
      await deleteWhatsAppTemplateById(template.id, template.name);
      setTemplates((prev) =>
        prev.filter(
          (row) =>
            row.id !== template.id &&
            !(row.name === template.name && row.language === template.language)
        )
      );
      if (selectedTemplateDetail?.id === template.id) {
        setSelectedTemplateDetail(null);
      }
      await persistManagerState(
        {
          ...managerState,
          templateActivity: [
            {
              id: template.id,
              name: template.name,
              category: template.category || "UNKNOWN",
              status: "DELETED",
              createdAt: new Date().toISOString(),
            },
            ...managerState.templateActivity,
          ].slice(0, 20),
        },
        "WhatsApp template deleted successfully."
      );
      await refreshPlatformData(true);
      showToast("Template deleted from WhatsApp.", "success");
    } catch (error: any) {
      showToast(error?.response?.data?.detail || error?.message || "Failed to delete template.", "error");
    } finally {
      setTemplateDeletingId(null);
    }
  };

  const sendTemplate = async () => {
    if (!selectedTemplate) {
      showToast("Select an approved template.", "error");
      return;
    }
    if (!templateSendForm.recipient.trim()) {
      showToast("Recipient phone number is required.", "error");
      return;
    }
    if (!canSendMessages) {
      showToast("The connection is missing a sender phone number ID.", "error");
      return;
    }

    setTemplateSending(true);
    try {
      const response = await sendWhatsAppTemplateMessage({
        to: templateSendForm.recipient.trim(),
        template: {
          name: selectedTemplate.name,
          language: { code: selectedTemplate.language },
          components: buildTemplateSendComponents(templateSendForm),
        },
      });

      const nextLog: WhatsAppMessageActivityLog = {
        id: crypto.randomUUID(),
        externalMessageId: response.messages?.[0]?.id,
        channel: "TEMPLATE",
        conversationCategory: templateSendForm.conversationCategory,
        recipient: templateSendForm.recipient.trim(),
        templateName: selectedTemplate.name,
        preview: templateSendForm.purpose.trim() || bodyPreview(selectedTemplate),
        createdAt: new Date().toISOString(),
        status: "SENT",
      };
      await persistManagerState(
        {
          ...managerState,
          messageActivity: [nextLog, ...managerState.messageActivity].slice(0, 30),
        },
        "Template message sent successfully."
      );
      setTemplateSendForm((prev) => ({
        ...TEMPLATE_SEND_DEFAULTS,
        conversationCategory: prev.conversationCategory,
      }));
      showToast("Template message sent.", "success");
    } catch (error: any) {
      showToast(error?.response?.data?.detail || error?.message || "Failed to send template message.", "error");
    } finally {
      setTemplateSending(false);
    }
  };

  const sendServiceMessage = async () => {
    if (!serviceForm.recipient.trim()) {
      showToast("Recipient phone number is required.", "error");
      return;
    }
    if (!serviceForm.body.trim()) {
      showToast("Message body is required.", "error");
      return;
    }
    if (!canSendMessages) {
      showToast("The connection is missing a sender phone number ID.", "error");
      return;
    }

    setServiceSending(true);
    try {
      const response = await sendWhatsAppTextMessage({
        to: serviceForm.recipient.trim(),
        body: serviceForm.body.trim(),
        previewUrl: serviceForm.previewUrl,
      });

      const nextLog: WhatsAppMessageActivityLog = {
        id: crypto.randomUUID(),
        externalMessageId: response.messages?.[0]?.id,
        channel: "TEXT",
        conversationCategory: "SERVICE",
        recipient: serviceForm.recipient.trim(),
        preview: serviceForm.body.trim(),
        createdAt: new Date().toISOString(),
        status: "SENT",
      };
      await persistManagerState(
        {
          ...managerState,
          messageActivity: [nextLog, ...managerState.messageActivity].slice(0, 30),
        },
        "Service message sent successfully."
      );
      setServiceForm(SERVICE_MESSAGE_DEFAULTS);
      showToast("Free-form service message sent.", "success");
    } catch (error: any) {
      showToast(error?.response?.data?.detail || error?.message || "Failed to send service message.", "error");
    } finally {
      setServiceSending(false);
    }
  };

  const uploadMediaAsset = async () => {
    if (!mediaFile) {
      showToast("Choose a media file to upload.", "error");
      return;
    }
    if (!canUploadMedia) {
      showToast("The connection is missing a sender phone number ID.", "error");
      return;
    }

    setMediaUploading(true);
    try {
      const response = await uploadWhatsAppMedia(mediaFile, mediaFile.type);
      setLastUploadedMediaId(response.id);
      setMediaFile(null);
      setMediaPickerKey((prev) => prev + 1);
      await persistManagerState(managerState, "WhatsApp media uploaded successfully.");
      showToast(`Media uploaded. Media ID: ${response.id}`, "success");
    } catch (error: any) {
      showToast(error?.response?.data?.detail || error?.message || "Failed to upload media.", "error");
    } finally {
      setMediaUploading(false);
    }
  };

  const subscribeApp = async () => {
    if (!connected) {
      showToast("Connect WhatsApp Business Platform first.", "error");
      return;
    }
    setSubscribingWebhooks(true);
    try {
      await subscribeWhatsAppApp();
      const result = await loadWhatsAppConnectionWithFallback({ portalId: me?.portal, userId: me?.id });
      setConnectionMode(result.mode);
      setSetting(result.setting);
      showToast("Webhook subscription request sent to WhatsApp.", "success");
    } catch (error: any) {
      showToast(error?.response?.data?.detail || error?.message || "Failed to subscribe webhook app.", "error");
    } finally {
      setSubscribingWebhooks(false);
    }
  };

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "templates", label: "Templates" },
    { key: "campaigns", label: "Marketing & Utility" },
    { key: "service", label: "Service Window" },
    { key: "platform", label: "Platform Ops" },
  ];

  return (
    <div className="space-y-6">
      <ListPageHeader
        section="Marketing"
        title="WhatsApp Manager"
        subtitle="Create approved template content, send marketing and utility campaigns, and operate your WhatsApp Business Platform setup."
        right={
          <button
            type="button"
            onClick={() => void refreshPlatformData()}
            disabled={refreshing || !connected}
            className="inline-flex items-center gap-2 rounded-full border border-kk-dark-input-border px-4 py-2 text-xs hover:bg-kk-dark-hover disabled:opacity-60"
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCcw className="h-3.5 w-3.5" />}
            Refresh
          </button>
        }
      />

      <div className="space-y-6 px-6 pb-6">
        {loading ? (
          <div className="rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated p-4 text-sm text-kk-dark-text-muted">
            Loading WhatsApp manager...
          </div>
        ) : (
          <>
            <Panel
              title="Connection"
              subtitle="This page relies on the connection configured under Settings > Connections."
              action={
                <a
                  href={`/settings/connections/${setting?.service_key || WHATSAPP_SERVICE_KEY}`}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Open Connection
                </a>
              }
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <MetricCard
                  label="Status"
                  value={connected ? "Connected" : "Disconnected"}
                  hint={formatConnectionModeLabel(connectionMode)}
                />
                <MetricCard
                  label="Display Number"
                  value={activePhoneNumber?.display_phone_number || credentials.displayPhoneNumber || "Not Set"}
                  hint={activePhoneNumber?.verified_name || "Sender profile"}
                />
                <MetricCard
                  label="Quality"
                  value={activePhoneNumber?.quality_rating || "Unknown"}
                  hint={credentials.graphApiVersion}
                />
              </div>

              {connectionMode === "session" ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-100">
                  WhatsApp is currently running in browser-session mode because the backend has not seeded a WhatsApp
                  connection service yet. Credentials are kept in this session only.
                </div>
              ) : null}

              {!connected ? (
                <div className="rounded-md border border-dashed border-kk-dark-border bg-kk-dark-bg p-4 text-sm text-kk-dark-text-muted">
                  Connect a WhatsApp Business number before creating templates or sending messages.
                </div>
              ) : !canSendMessages ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
                  The connection is missing one or more required fields. Make sure the access token, WABA ID, and phone
                  number ID are configured.
                </div>
              ) : null}
            </Panel>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <MetricCard label="Templates" value={String(templates.length)} hint="Live templates from Meta" />
              <MetricCard label="Approved" value={String(approvedTemplates.length)} hint="Ready for outbound sends" />
              <MetricCard label="Recent Sends" value={String(managerState.messageActivity.length)} hint="Tracked in the manager" />
              <MetricCard
                label="Webhook Events"
                value={String(managerState.webhookEvents?.length || 0)}
                hint="Recent inbound callbacks"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={[
                    "rounded-full px-4 py-2 text-xs font-medium",
                    activeTab === tab.key
                      ? "bg-emerald-600 text-white"
                      : "border border-kk-dark-input-border text-kk-dark-text-muted hover:bg-kk-dark-hover hover:text-kk-dark-text",
                  ].join(" ")}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "templates" ? (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <Panel
                  title="Create Template"
                  subtitle="Creating a template sends it to WhatsApp for review immediately."
                  action={
                    <button
                      type="button"
                      onClick={createTemplate}
                      disabled={templateSubmitting || !canManageTemplates}
                      className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {templateSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                      Submit For Review
                    </button>
                  }
                >
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-xs text-kk-dark-text-muted">Template name</span>
                      <input
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="new_arrival_campaign"
                        className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-kk-dark-text-muted">Category</span>
                      <select
                        value={templateForm.category}
                        onChange={(e) =>
                          setTemplateForm((prev) => ({
                            ...prev,
                            category: e.target.value as WhatsAppTemplateCategory,
                          }))
                        }
                        className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      >
                        <option value="MARKETING">Marketing</option>
                        <option value="UTILITY">Utility</option>
                        <option value="AUTHENTICATION">Authentication</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs text-kk-dark-text-muted">Language</span>
                      <input
                        value={templateForm.language}
                        onChange={(e) => setTemplateForm((prev) => ({ ...prev, language: e.target.value }))}
                        placeholder="en_US"
                        className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  <label className="space-y-1">
                    <span className="text-xs text-kk-dark-text-muted">Body</span>
                    <textarea
                      value={templateForm.body}
                      onChange={(e) => setTemplateForm((prev) => ({ ...prev, body: e.target.value }))}
                      rows={5}
                      placeholder="Hello {{1}}, your order {{2}} is ready."
                      className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="space-y-1">
                    <span className="text-xs text-kk-dark-text-muted">Body example values</span>
                    <textarea
                      value={templateForm.bodyExampleValues}
                      onChange={(e) => setTemplateForm((prev) => ({ ...prev, bodyExampleValues: e.target.value }))}
                      rows={3}
                      placeholder={"Jane Doe\nKR-3021"}
                      className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    />
                  </label>
                </Panel>

                <Panel
                  title="Live Templates"
                  subtitle="Templates are fetched from your connected WhatsApp Business Account."
                >
                  {!canManageTemplates ? (
                    <div className="rounded-md border border-dashed border-kk-dark-border bg-kk-dark-bg p-4 text-sm text-kk-dark-text-muted">
                      Once the connection is configured, templates from Meta will appear here.
                    </div>
                  ) : templates.length === 0 ? (
                    <div className="rounded-md border border-dashed border-kk-dark-border bg-kk-dark-bg p-4 text-sm text-kk-dark-text-muted">
                      No templates were returned for this WhatsApp Business Account yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {templates.map((template) => (
                        <div key={`${template.name}-${template.language}`} className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-medium">{template.name}</div>
                              <div className="mt-1 text-xs text-kk-dark-text-muted">
                                {(template.category || "Unknown").toUpperCase()} • {template.language}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void loadTemplateDetail(template)}
                                disabled={!template.id || templateLoadingId === template.id}
                                className="inline-flex items-center gap-1 rounded-full border border-kk-dark-input-border px-2.5 py-1 text-[11px] hover:bg-kk-dark-hover disabled:opacity-50"
                              >
                                {templateLoadingId === template.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                                Details
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteTemplate(template)}
                                disabled={!template.id || templateDeletingId === template.id}
                                className="inline-flex items-center gap-1 rounded-full border border-red-500/40 px-2.5 py-1 text-[11px] text-red-200 hover:bg-red-500/10 disabled:opacity-50"
                              >
                                {templateDeletingId === template.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                                Delete
                              </button>
                              <span className={`rounded-full border px-2 py-1 text-[11px] font-medium ${toneForStatus(template.status)}`}>
                                {humanizeStatus(template.status, "Unknown")}
                              </span>
                            </div>
                          </div>
                          <p className="mt-3 text-sm text-kk-dark-text-muted">{bodyPreview(template) || "No body preview."}</p>
                        </div>
                      ))}
                      <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-medium">Template detail</div>
                          {selectedTemplateDetail ? (
                            <button
                              type="button"
                              onClick={() => setSelectedTemplateDetail(null)}
                              className="rounded-full border border-kk-dark-input-border px-2.5 py-1 text-[11px] hover:bg-kk-dark-hover"
                            >
                              Clear
                            </button>
                          ) : null}
                        </div>
                        {templateLoadingId ? (
                          <div className="mt-3 inline-flex items-center gap-2 text-xs text-kk-dark-text-muted">
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            Loading template detail...
                          </div>
                        ) : selectedTemplateDetail ? (
                          <pre className="mt-3 overflow-x-auto rounded-md border border-kk-dark-border bg-black/20 p-3 text-xs text-kk-dark-text-muted">
                            {JSON.stringify(selectedTemplateDetail, null, 2)}
                          </pre>
                        ) : (
                          <div className="mt-3 text-xs text-kk-dark-text-muted">
                            Select Details on a template to inspect its current Meta record.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Panel>
              </div>
            ) : null}

            {activeTab === "campaigns" ? (
              <Panel
                title="Marketing And Utility Sends"
                subtitle="Outbound business-initiated messages use approved templates."
                action={
                  <button
                    type="button"
                    onClick={sendTemplate}
                    disabled={templateSending || !canSendMessages}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {templateSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Send Template
                  </button>
                }
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs text-kk-dark-text-muted">Conversation category</span>
                    <select
                      value={templateSendForm.conversationCategory}
                      onChange={(e) =>
                        setTemplateSendForm((prev) => ({
                          ...prev,
                          conversationCategory: e.target.value as WhatsAppTemplateCategory,
                        }))
                      }
                      className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    >
                      <option value="MARKETING">Marketing</option>
                      <option value="UTILITY">Utility</option>
                      <option value="AUTHENTICATION">Authentication</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-xs text-kk-dark-text-muted">Recipient</span>
                    <input
                      value={templateSendForm.recipient}
                      onChange={(e) => setTemplateSendForm((prev) => ({ ...prev, recipient: e.target.value }))}
                      placeholder="+234..."
                      className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-xs text-kk-dark-text-muted">Approved template</span>
                    <select
                      value={templateSendForm.templateName}
                      onChange={(e) => setTemplateSendForm((prev) => ({ ...prev, templateName: e.target.value }))}
                      className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    >
                      <option value="">Select template</option>
                      {filteredTemplates.map((template) => (
                        <option key={`${template.name}-${template.language}`} value={template.name}>
                          {template.name} ({template.language})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="space-y-1">
                  <span className="text-xs text-kk-dark-text-muted">Template variables</span>
                  <textarea
                    value={templateSendForm.bodyVariables}
                    onChange={(e) => setTemplateSendForm((prev) => ({ ...prev, bodyVariables: e.target.value }))}
                    rows={4}
                    placeholder={"Line 1 = {{1}}\nLine 2 = {{2}}"}
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs text-kk-dark-text-muted">Campaign or purpose note</span>
                  <input
                    value={templateSendForm.purpose}
                    onChange={(e) => setTemplateSendForm((prev) => ({ ...prev, purpose: e.target.value }))}
                    placeholder="Black Friday launch"
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  />
                </label>

                {selectedTemplate ? (
                  <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-3 text-xs text-kk-dark-text-muted">
                    Selected template preview: {bodyPreview(selectedTemplate) || "No body preview."}
                  </div>
                ) : null}
              </Panel>
            ) : null}

            {activeTab === "service" ? (
              <Panel
                title="Service Window Messages"
                subtitle="Use free-form text replies inside an active customer service window."
                action={
                  <button
                    type="button"
                    onClick={sendServiceMessage}
                    disabled={serviceSending || !canSendMessages}
                    className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {serviceSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                    Send Service Message
                  </button>
                }
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-xs text-kk-dark-text-muted">Recipient</span>
                    <input
                      value={serviceForm.recipient}
                      onChange={(e) => setServiceForm((prev) => ({ ...prev, recipient: e.target.value }))}
                      placeholder="+234..."
                      className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="inline-flex items-center gap-2 pt-7 text-xs text-kk-dark-text-muted">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-emerald-600"
                      checked={serviceForm.previewUrl}
                      onChange={(e) => setServiceForm((prev) => ({ ...prev, previewUrl: e.target.checked }))}
                    />
                    Enable URL previews
                  </label>
                </div>

                <label className="space-y-1">
                  <span className="text-xs text-kk-dark-text-muted">Message body</span>
                  <textarea
                    value={serviceForm.body}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, body: e.target.value }))}
                    rows={6}
                    placeholder="Thanks for reaching out. Your order is ready for pickup."
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  />
                </label>
              </Panel>
            ) : null}

            {activeTab === "platform" ? (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_0.9fr]">
                <Panel
                  title="Platform Operations"
                  subtitle="Capability areas commonly used when operating the WhatsApp Business Platform."
                  action={
                    <button
                      type="button"
                      onClick={subscribeApp}
                      disabled={subscribingWebhooks || !connected}
                      className="inline-flex items-center gap-2 rounded-full border border-kk-dark-input-border px-4 py-2 text-xs hover:bg-kk-dark-hover disabled:opacity-60"
                    >
                      {subscribingWebhooks ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Webhook className="h-3.5 w-3.5" />}
                      Subscribe Webhooks
                    </button>
                  }
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Cable className="h-4 w-4 text-emerald-400" />
                        Connection
                      </div>
                      <p className="mt-2 text-xs text-kk-dark-text-muted">
                        Access token, WABA ID, sender phone number ID, and connection health are managed from the
                        connection record.
                      </p>
                    </div>
                    <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="h-4 w-4 text-emerald-400" />
                        Templates
                      </div>
                      <p className="mt-2 text-xs text-kk-dark-text-muted">
                        Template creation, review submission, and approved-template sends are handled directly from this
                        manager.
                      </p>
                    </div>
                    <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Webhook className="h-4 w-4 text-emerald-400" />
                        Webhooks
                      </div>
                      <p className="mt-2 text-xs text-kk-dark-text-muted">
                        Verify token: {credentials.webhookVerifyToken || "Not configured"}.
                        Callback URL: {credentials.webhookCallbackUrl || "Configure this in your Meta app"}.
                        Signature verification: {credentials.appSecret ? "Enabled" : "App Secret missing"}.
                      </p>
                    </div>
                    <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" />
                        Authentication
                      </div>
                      <p className="mt-2 text-xs text-kk-dark-text-muted">
                        Authentication templates can be created here by switching the category to Authentication.
                      </p>
                    </div>
                    <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <MessageSquare className="h-4 w-4 text-emerald-400" />
                        Service Messaging
                      </div>
                      <p className="mt-2 text-xs text-kk-dark-text-muted">
                        Free-form replies are available in the Service Window tab for ongoing customer conversations.
                      </p>
                    </div>
                    <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <ChartNoAxesCombined className="h-4 w-4 text-emerald-400" />
                        Analytics Readiness
                      </div>
                      <p className="mt-2 text-xs text-kk-dark-text-muted">
                        Quality rating: {activePhoneNumber?.quality_rating || "Unknown"}. Use this along with your Meta
                        account analytics for throughput and delivery monitoring.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-kk-dark-border pt-4">
                    <div className="text-xs font-semibold text-white">Recent webhook activity</div>
                    {!managerState.webhookEvents?.length ? (
                      <div className="text-xs text-kk-dark-text-muted">No webhook events have been received yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {managerState.webhookEvents.map((event, index) => (
                          <div key={`${event.receivedAt}-${index}`} className="rounded-md border border-kk-dark-border bg-kk-dark-bg px-3 py-2 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium text-white">{humanizeStatus(event.kind)}</span>
                              <span className="text-kk-dark-text-muted">{new Date(event.receivedAt).toLocaleString()}</span>
                            </div>
                            <div className="mt-1 text-kk-dark-text-muted">
                              Object: {String((event.payload as any)?.object || "unknown")}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Panel>

                <Panel
                  title="Connection Snapshot"
                  subtitle="Key WhatsApp identifiers currently loaded into the manager."
                >
                  <div className="space-y-3">
                    {[
                      ["Storage mode", formatConnectionModeLabel(connectionMode)],
                      ["Business Portfolio ID", credentials.businessPortfolioId || "Not configured"],
                      ["WhatsApp Business Account ID", credentials.wabaId || "Not configured"],
                      ["Phone Number ID", credentials.phoneNumberId || "Not configured"],
                      ["Display Phone Number", activePhoneNumber?.display_phone_number || credentials.displayPhoneNumber || "Not configured"],
                      ["Verified Name", activePhoneNumber?.verified_name || "Not available"],
                      ["Webhook Signature Verification", credentials.appSecret ? "Enabled with App Secret" : "App Secret not configured"],
                      ["Graph API Version", credentials.graphApiVersion || "Not configured"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-md border border-kk-dark-border bg-kk-dark-bg px-3 py-2">
                        <div className="text-xs text-kk-dark-text-muted">{label}</div>
                        <div className="mt-1 break-all text-sm">{value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 border-t border-kk-dark-border pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-white">Media Upload</div>
                        <div className="mt-1 text-xs text-kk-dark-text-muted">
                          Upload media to Meta first so future media messages can reuse a stable media ID.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={uploadMediaAsset}
                        disabled={mediaUploading || !canUploadMedia}
                        className="inline-flex items-center gap-2 rounded-full border border-kk-dark-input-border px-4 py-2 text-xs hover:bg-kk-dark-hover disabled:opacity-60"
                      >
                        {mediaUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                        Upload Media
                      </button>
                    </div>

                    <label className="space-y-1">
                      <span className="text-xs text-kk-dark-text-muted">Asset</span>
                      <input
                        key={mediaPickerKey}
                        type="file"
                        onChange={(e) => setMediaFile(e.target.files?.[0] || null)}
                        className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                      />
                    </label>

                    {mediaFile ? (
                      <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg px-3 py-2 text-xs text-kk-dark-text-muted">
                        Pending upload: {mediaFile.name}
                        {mediaFile.type ? ` (${mediaFile.type})` : ""}
                      </div>
                    ) : null}

                    {lastUploadedMediaId ? (
                      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                        Last uploaded media ID: {lastUploadedMediaId}
                      </div>
                    ) : null}
                  </div>
                </Panel>
              </div>
            ) : null}
          </>
        )}
      </div>

      <ToastModal message={toastMessage} variant={toastVariant} onClose={() => setToastMessage(null)} />
    </div>
  );
}
