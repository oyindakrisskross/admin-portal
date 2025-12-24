// src/api/core.ts

import api from "./client";
import { type Organization } from "../types/core";

export interface PaginatedResult<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export async function fetchOrg(id: number) {
  const res = await api.get<Organization>(`/api/core/organization/${id}/`);
  return res.data;
}

export async function updateOrg(id: number, payload: Organization) {
  const res = await api.patch<Organization>(`/api/core/organization/${id}/`, payload);
  return res.data;
}

export async function createOrg(payload: Organization) {
  const res = await api.post<Organization>("/api/core/organization/", payload);
  return res.data;
}