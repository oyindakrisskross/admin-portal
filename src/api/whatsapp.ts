import api from "./client";
import type {
  WhatsAppMediaUploadResponse,
  WhatsAppMessageSendResponse,
  WhatsAppPhoneNumbersResponse,
  WhatsAppTemplateCreatePayload,
  WhatsAppTemplateCreateResponse,
  WhatsAppTemplateDeleteResponse,
  WhatsAppTemplateListResponse,
  WhatsAppTemplateRecord,
} from "../types/whatsapp";

export async function fetchWhatsAppTemplates() {
  const res = await api.get<WhatsAppTemplateListResponse>("/api/payments/whatsapp/templates/");
  return res.data;
}

export async function createWhatsAppTemplate(payload: WhatsAppTemplateCreatePayload) {
  const res = await api.post<WhatsAppTemplateCreateResponse>("/api/payments/whatsapp/templates/", payload);
  return res.data;
}

export async function fetchWhatsAppTemplateById(templateId: string) {
  const res = await api.get<WhatsAppTemplateRecord>(`/api/payments/whatsapp/templates/${templateId}/`);
  return res.data;
}

export async function deleteWhatsAppTemplateById(templateId: string, templateName?: string) {
  const res = await api.delete<WhatsAppTemplateDeleteResponse>(`/api/payments/whatsapp/templates/${templateId}/`, {
    params: templateName ? { name: templateName } : undefined,
  });
  return res.data;
}

export async function fetchWhatsAppPhoneNumbers() {
  const res = await api.get<WhatsAppPhoneNumbersResponse>("/api/payments/whatsapp/phone-numbers/");
  return res.data;
}

export async function uploadWhatsAppMedia(file: File, contentType?: string) {
  const form = new FormData();
  form.append("file", file);
  if (contentType) {
    form.append("content_type", contentType);
  }
  const res = await api.post<WhatsAppMediaUploadResponse>("/api/payments/whatsapp/media/", form);
  return res.data;
}

export async function sendWhatsAppTemplateMessage(args: {
  to: string;
  template: Record<string, unknown>;
}) {
  const res = await api.post<WhatsAppMessageSendResponse>("/api/payments/whatsapp/messages/template/", args);
  return res.data;
}

export async function sendWhatsAppTextMessage(args: {
  to: string;
  body: string;
  previewUrl?: boolean;
}) {
  const res = await api.post<WhatsAppMessageSendResponse>("/api/payments/whatsapp/messages/text/", {
    to: args.to,
    body: args.body,
    preview_url: Boolean(args.previewUrl),
  });
  return res.data;
}

export async function subscribeWhatsAppApp() {
  const res = await api.post<{ success?: boolean }>("/api/payments/whatsapp/subscriptions/", {});
  return res.data;
}
