// src/api/invoice.ts

import api from "./client";
import { type InvoiceResponse } from "../types/invoice";
import type { FilterSet } from "../types/filters";

export interface PaginatedResult<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export async function fetchOrders(params?: (Record<string, any> & { filters?: FilterSet })) {
  const search = new URLSearchParams();

  if (params) {
    const { filters, ...rest } = params;
    for (const [k, v] of Object.entries(rest)) {
      if (v === undefined || v === null || v === "") continue;
      search.set(k, String(v));
    }

    if (filters) {
      filters.clauses.forEach((clause) => {
        let encodedValue: string;
        if (Array.isArray(clause.value)) {
          encodedValue = clause.value.join(",");
        } else if (typeof clause.value === "object") {
          encodedValue = JSON.stringify(clause.value);
        } else {
          encodedValue = clause.value ?? "";
        }
        search.append("filter", `${clause.field}|${clause.operator}|${encodedValue}`);
      });
    }
  }

  const res = await api.get<PaginatedResult<InvoiceResponse>>(
    `/api/sales/invoices/${search.toString() ? `?${search}` : ""}`
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
