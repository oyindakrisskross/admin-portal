import api from "./client";
import type { CustomerRecord } from "../types/customerPortal";

export interface PaginatedResult<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

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
  const search = new URLSearchParams();

  if (params?.search) {
    search.set("search", params.search);
  }
  if (params?.page != null) {
    search.set("page", String(params.page));
  }
  if (params?.page_size != null) {
    search.set("page_size", String(params.page_size));
  }
  if (params?.is_active != null) {
    search.set("is_active", String(params.is_active));
  }

  const res = await api.get<PaginatedResult<CustomerRecord>>(
    `/api/customer-portal/customers/${search.toString() ? `?${search}` : ""}`
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
