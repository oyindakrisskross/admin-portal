// src/api/invoice.ts

import api from "./client";
import { buildQueryPath } from "./query";
import type { PaginatedResult } from "./types";
import { type InvoiceResponse, type PaymentRecord } from "../types/invoice";
import type { FilterSet } from "../types/filters";

export async function fetchOrders(params?: (Record<string, any> & { filters?: FilterSet })) {
  const res = await api.get<PaginatedResult<InvoiceResponse>>(
    buildQueryPath("/api/sales/invoices/", {
      params: params
        ? Object.fromEntries(
            Object.entries(params).filter(([key]) => key !== "filters")
          )
        : undefined,
      filters: params?.filters,
    })
  );
  return res.data;
}

export async function fetchInvoice(id: number) {
  const res = await api.get<InvoiceResponse>(`/api/sales/invoices/${id}/`);
  return res.data;
}

export async function fetchInvoiceRefunds(id: number) {
  const res = await api.get<InvoiceResponse[]>(`/api/sales/invoices/${id}/refunds/`);
  return res.data;
}

export type CreateInvoiceRefundPayload = {
  restock: boolean;
  reason?: string;
  lines: Array<{
    line_id: number;
    refund_qty: string | number;
    refund_base_amount: string | number;
  }>;
};

export async function createInvoiceRefund(id: number, payload: CreateInvoiceRefundPayload) {
  const res = await api.post<InvoiceResponse>(`/api/sales/invoices/${id}/refund/`, payload);
  return res.data;
}

export type PrepaidCreateItemInput = {
  item: number;
  quantity: string | number;
  unit_price?: string | number;
  description?: string;
};

export type CreatePrepaidInvoicePayload = {
  location: number;
  customer?: number | null;
  portal_customer?: number | null;
  notes?: string;
  payment_made?: boolean;
  amount_paid?: string | number;
  payment_method?: "CASH" | "CARD" | "TRANSFER" | "OTHER" | string;
  items: PrepaidCreateItemInput[];
};

export async function createPrepaidInvoice(payload: CreatePrepaidInvoicePayload) {
  const res = await api.post<InvoiceResponse>("/api/sales/prepaid/create/", payload);
  return res.data;
}

export type UpdatePrepaidInvoicePayload = {
  location?: number;
  customer?: number | null;
  portal_customer?: number | null;
  notes?: string;
  payment_made?: boolean;
  amount_paid?: string | number;
  payment_method?: "CASH" | "CARD" | "TRANSFER" | "OTHER" | string;
  items?: PrepaidCreateItemInput[];
};

export async function updatePrepaidInvoice(id: number, payload: UpdatePrepaidInvoicePayload) {
  const res = await api.patch<InvoiceResponse>(`/api/sales/prepaid/${id}/update/`, payload);
  return res.data;
}

export async function resendPrepaidPassEmail(id: number) {
  const res = await api.post<{
    detail: string;
    recipient: string;
    invoice_id: number;
    prepaid_number: string | null;
  }>(`/api/sales/invoices/${id}/resend-email/`);
  return res.data;
}

export type BulkInvoiceAction = "delete" | "assign_customer";

export type BulkInvoiceFailure = {
  id: number;
  reason: string;
  detail?: string;
};

export type BulkInvoiceResult = {
  ok_ids: number[];
  failed: BulkInvoiceFailure[];
};

export async function bulkInvoices(payload: {
  ids: number[];
  action: BulkInvoiceAction;
  portal_customer?: number;
  portal_customer_id?: number;
}): Promise<BulkInvoiceResult> {
  const res = await api.post<BulkInvoiceResult>("/api/sales/invoices/bulk/", payload);
  return res.data;
}

export async function fetchSalesPayments(params?: {
  search?: string;
  page?: number;
  page_size?: number;
  location_id?: number;
  method?: string;
  type_id?: string;
  start?: string;
  end?: string;
}) {
  const res = await api.get<PaginatedResult<PaymentRecord>>(
    buildQueryPath("/api/sales/payments/", {
      params,
    })
  );
  return res.data;
}

export async function fetchSalesPayment(id: number) {
  const res = await api.get<PaymentRecord>(`/api/sales/payments/${id}/`);
  return res.data;
}
