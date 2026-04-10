import {
  fetchConnectionServices,
  fetchConnectionSetting,
  upsertConnectionSetting,
} from "../api/payments";
import type {
  ConnectionService,
  ConnectionSetting,
  ConnectionSettingUpsertPayload,
} from "../types/payments";
import type { WhatsAppManagerState } from "../types/whatsapp";

export const WHATSAPP_SERVICE_KEY = "whatsapp-business-platform";
const DEFAULT_GRAPH_API_VERSION = "v24.0";

export type WhatsAppConnectionMode = "remote" | "session";

export type WhatsAppStorageScope = {
  portalId?: number | null;
  userId?: number | null;
};

export const WHATSAPP_CONNECTION_SERVICE: ConnectionService = {
  id: -1,
  key: WHATSAPP_SERVICE_KEY,
  name: "WhatsApp Business Platform",
  service_type: "Messaging",
  required_connection_inputs: [
    "System User Access Token",
    "WhatsApp Business Account ID",
    "Phone Number ID",
    "Business Portfolio ID",
    "Display Phone Number",
    "App Secret",
    "Webhook Verify Token",
    "Graph API Version",
  ],
  required_connection_outputs: ["Webhook Callback URL"],
  integration_options: ["Marketing", "Utility", "Authentication", "Service", "Flows", "Analytics"],
  is_active: true,
  created_at: "",
  updated_at: "",
};

const EMPTY_MANAGER_STATE: WhatsAppManagerState = {
  templateActivity: [],
  messageActivity: [],
  webhookEvents: [],
};

function isNotFoundError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "response" in error &&
    typeof (error as any).response?.status === "number" &&
    (error as any).response.status === 404
  );
}

function sessionKey(scope: WhatsAppStorageScope) {
  const portalId = scope.portalId ?? "na";
  const userId = scope.userId ?? "na";
  return `kk:whatsapp-connection:${portalId}:${userId}`;
}

export function normalizeConnectionFieldKey(label: string) {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function isWhatsAppService(
  service?: Partial<Pick<ConnectionService, "key" | "name" | "service_type">> | null
) {
  const key = String(service?.key || "").toLowerCase();
  const name = String(service?.name || "").toLowerCase();
  const type = String(service?.service_type || "").toLowerCase();
  return key.includes("whatsapp") || name.includes("whatsapp") || type.includes("whatsapp");
}

export function isWhatsAppSetting(
  setting?: Partial<Pick<ConnectionSetting, "service_key" | "service_name" | "service_type">> | null
) {
  const service = {
    key: setting?.service_key || "",
    name: setting?.service_name || "",
    service_type: setting?.service_type || "",
  };
  return isWhatsAppService(service);
}

export function buildDefaultWhatsAppConnectionSetting(portalId?: number | null): ConnectionSetting {
  const now = new Date().toISOString();
  return {
    id: null,
    portal_id: portalId ?? 0,
    service_id: WHATSAPP_CONNECTION_SERVICE.id,
    service_key: WHATSAPP_CONNECTION_SERVICE.key,
    service_name: WHATSAPP_CONNECTION_SERVICE.name,
    service_type: WHATSAPP_CONNECTION_SERVICE.service_type,
    required_connection_inputs: [...WHATSAPP_CONNECTION_SERVICE.required_connection_inputs],
    required_connection_outputs: [...WHATSAPP_CONNECTION_SERVICE.required_connection_outputs],
    integration_options: [...WHATSAPP_CONNECTION_SERVICE.integration_options],
    status: "DISCONNECTED",
    connection_name: "WhatsApp Business Platform",
    scope: "WhatsApp Business Account",
    service_link_name: "Meta WhatsApp",
    connections_associated: "Marketing, Utility, Authentication, Service",
    connection_inputs: {
      graph_api_version: DEFAULT_GRAPH_API_VERSION,
    },
    connection_outputs: {
      whatsapp_manager: EMPTY_MANAGER_STATE,
    },
    integration_targets: [...WHATSAPP_CONNECTION_SERVICE.integration_options],
    last_ping_at: null,
    last_ping_success: false,
    last_ping_message: "",
    created_at: now,
    updated_at: now,
  };
}

function loadSessionSetting(scope: WhatsAppStorageScope) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(sessionKey(scope));
    if (!raw) return null;
    return JSON.parse(raw) as ConnectionSetting;
  } catch {
    return null;
  }
}

function saveSessionSetting(scope: WhatsAppStorageScope, setting: ConnectionSetting) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(sessionKey(scope), JSON.stringify(setting));
}

function mergeManagerState(outputs: Record<string, unknown>) {
  const current =
    outputs.whatsapp_manager && typeof outputs.whatsapp_manager === "object"
      ? (outputs.whatsapp_manager as Partial<WhatsAppManagerState>)
      : {};
  return {
    templateActivity: Array.isArray(current.templateActivity) ? current.templateActivity : [],
    messageActivity: Array.isArray(current.messageActivity) ? current.messageActivity : [],
    webhookEvents: Array.isArray(current.webhookEvents) ? current.webhookEvents : [],
  } satisfies WhatsAppManagerState;
}

export function getWhatsAppManagerState(setting?: ConnectionSetting | null) {
  return mergeManagerState((setting?.connection_outputs as Record<string, unknown>) || {});
}

export function withWhatsAppManagerState(
  setting: ConnectionSetting,
  nextState: WhatsAppManagerState
): ConnectionSetting {
  return {
    ...setting,
    connection_outputs: {
      ...(setting.connection_outputs || {}),
      whatsapp_manager: nextState,
    },
  };
}

export function addSyntheticWhatsAppService(
  services: ConnectionService[],
  settings: ConnectionSetting[],
  scope: WhatsAppStorageScope
) {
  if (services.some((service) => isWhatsAppService(service))) {
    return { services, settings };
  }

  const sessionSetting = loadSessionSetting(scope) || buildDefaultWhatsAppConnectionSetting(scope.portalId);
  return {
    services: [...services, WHATSAPP_CONNECTION_SERVICE],
    settings: [...settings.filter((row) => !isWhatsAppSetting(row)), sessionSetting],
  };
}

async function resolveRemoteWhatsAppServiceKey() {
  try {
    const services = await fetchConnectionServices();
    const service = services.find((row) => isWhatsAppService(row));
    return service?.key || WHATSAPP_SERVICE_KEY;
  } catch {
    return WHATSAPP_SERVICE_KEY;
  }
}

export async function loadWhatsAppConnectionWithFallback(scope: WhatsAppStorageScope): Promise<{
  mode: WhatsAppConnectionMode;
  setting: ConnectionSetting;
}> {
  try {
    const serviceKey = await resolveRemoteWhatsAppServiceKey();
    const setting = await fetchConnectionSetting(serviceKey);
    return { mode: "remote", setting };
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
    return {
      mode: "session",
      setting: loadSessionSetting(scope) || buildDefaultWhatsAppConnectionSetting(scope.portalId),
    };
  }
}

export async function saveWhatsAppConnectionWithFallback(
  scope: WhatsAppStorageScope,
  patch: ConnectionSettingUpsertPayload
): Promise<{
  mode: WhatsAppConnectionMode;
  setting: ConnectionSetting;
}> {
  try {
    const serviceKey = await resolveRemoteWhatsAppServiceKey();
    const setting = await upsertConnectionSetting(serviceKey, patch);
    return { mode: "remote", setting };
  } catch (error) {
    if (!isNotFoundError(error)) throw error;

    const current = loadSessionSetting(scope) || buildDefaultWhatsAppConnectionSetting(scope.portalId);
    const now = new Date().toISOString();
    const next: ConnectionSetting = {
      ...current,
      ...patch,
      connection_inputs: patch.connection_inputs
        ? { ...(current.connection_inputs || {}), ...patch.connection_inputs }
        : current.connection_inputs,
      connection_outputs: patch.connection_outputs
        ? { ...(current.connection_outputs || {}), ...patch.connection_outputs }
        : current.connection_outputs,
      integration_targets: patch.integration_targets
        ? [...patch.integration_targets]
        : current.integration_targets,
      id: current.id ?? -1,
      updated_at: now,
      last_ping_at:
        patch.last_ping_success !== undefined || patch.status === "CONNECTED"
          ? now
          : current.last_ping_at,
      last_ping_success: patch.last_ping_success ?? current.last_ping_success,
      last_ping_message: patch.last_ping_message ?? current.last_ping_message,
    };
    saveSessionSetting(scope, next);
    return { mode: "session", setting: next };
  }
}

function readRecordText(record: Record<string, unknown> | undefined, candidates: string[]) {
  if (!record) return "";
  for (const candidate of candidates) {
    const key = normalizeConnectionFieldKey(candidate);
    const value = record[key] ?? record[candidate];
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

export function extractWhatsAppCredentials(setting?: ConnectionSetting | null) {
  const inputs = (setting?.connection_inputs as Record<string, unknown>) || {};
  const outputs = (setting?.connection_outputs as Record<string, unknown>) || {};
  return {
    accessToken: readRecordText(inputs, [
      "System User Access Token",
      "Access Token",
      "Permanent Access Token",
      "Token",
    ]),
    wabaId: readRecordText(inputs, ["WhatsApp Business Account ID", "WABA ID"]),
    phoneNumberId: readRecordText(inputs, ["Phone Number ID", "Business Phone Number ID"]),
    businessPortfolioId: readRecordText(inputs, ["Business Portfolio ID", "Business ID", "Meta Business Account ID"]),
    displayPhoneNumber:
      readRecordText(inputs, ["Display Phone Number", "Business Phone Number", "Phone Number"]) ||
      readRecordText(outputs, ["Display Phone Number", "Business Phone Number", "Phone Number"]),
    appSecret: readRecordText(inputs, ["App Secret"]),
    webhookVerifyToken: readRecordText(inputs, ["Webhook Verify Token", "Verify Token"]),
    webhookCallbackUrl: readRecordText(outputs, ["Webhook Callback URL"]),
    graphApiVersion:
      readRecordText(inputs, ["Graph API Version", "API Version"]) ||
      readRecordText(outputs, ["Graph API Version", "API Version"]) ||
      DEFAULT_GRAPH_API_VERSION,
  };
}

export function formatConnectionModeLabel(mode: WhatsAppConnectionMode) {
  return mode === "remote" ? "Server-backed" : "Browser session";
}
