import api from "./client";
import type { PaystackGatewaySettings, PaystackGatewaySettingsPatch } from "../types/payments";

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
