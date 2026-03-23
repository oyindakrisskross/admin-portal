import api from "./client";
import type {
  ConnectionService,
  ConnectionSetting,
  ConnectionSettingUpsertPayload,
  PaystackGatewaySettings,
  PaystackGatewaySettingsPatch,
} from "../types/payments";

export async function fetchPaystackSettings(): Promise<PaystackGatewaySettings> {
  const res = await api.get<PaystackGatewaySettings>("/api/payments/paystack/settings/");
  return res.data;
}

export async function updatePaystackSettings(
  patch: PaystackGatewaySettingsPatch
): Promise<PaystackGatewaySettings> {
  const res = await api.put<PaystackGatewaySettings>("/api/payments/paystack/settings/", patch);
  return res.data;
}

export async function fetchConnectionServices(): Promise<ConnectionService[]> {
  const res = await api.get<ConnectionService[]>("/api/payments/connections/services/");
  return res.data;
}

export async function fetchConnectionSettings(): Promise<ConnectionSetting[]> {
  const res = await api.get<ConnectionSetting[]>("/api/payments/connections/settings/");
  return res.data;
}

export async function fetchConnectionSetting(serviceKey: string): Promise<ConnectionSetting> {
  const res = await api.get<ConnectionSetting>(`/api/payments/connections/settings/${serviceKey}/`);
  return res.data;
}

export async function upsertConnectionSetting(
  serviceKey: string,
  payload: ConnectionSettingUpsertPayload
): Promise<ConnectionSetting> {
  const res = await api.put<ConnectionSetting>(`/api/payments/connections/settings/${serviceKey}/`, payload);
  return res.data;
}
