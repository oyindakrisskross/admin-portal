import api from "./client";
import { buildQueryPath } from "./query";
import type { PaginatedResult } from "./types";
import type { CustomerRecord } from "../types/customerPortal";

export interface CreateCustomerPayload {
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  password?: string;
  is_active?: boolean;
}

export async function fetchCustomers(params?: {
  search?: string;
  page?: number;
  page_size?: number;
  is_active?: boolean;
}) {
  const res = await api.get<PaginatedResult<CustomerRecord>>(
    buildQueryPath("/api/customer-portal/customers/", {
      params: {
        search: params?.search,
        page: params?.page,
        page_size: params?.page_size,
        is_active: params?.is_active,
      },
    })
  );
  return res.data;
}

export async function createCustomer(payload: CreateCustomerPayload) {
  const res = await api.post<CustomerRecord>("/api/customer-portal/customers/", payload);
  return res.data;
}

export async function fetchCustomer(id: number) {
  const res = await api.get<CustomerRecord>(`/api/customer-portal/customers/${id}/`);
  return res.data;
}
