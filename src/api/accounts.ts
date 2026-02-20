// src/api/accounts.ts

import api from "./client";
import { 
  type Role, 
  type Permission, 
  type PermissionCategory, 
  type UserProfile,
  type UserLocation, 
} from "../types/accounts";
import type { FilterSet } from "../types/filters";

export interface PaginatedResult<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

// Roles
export async function fetchRoles(params?: Record<string, any>) {
  const res = await api.get<PaginatedResult<Role>>("/api/roles/", {params,});
  return res.data;
}

export async function fetchRole(id: number) {
  const res = await api.get<Role>(`/api/roles/${id}/`);
  return res.data;
}

export async function createRole(payload: Role) {
  const res = await api.post<Role>("/api/roles/", payload);
  return res.data;
}

export async function updateRole(id: number, patch: Role) {
  const res = await api.patch<Role>(`/api/roles/${id}/`, patch);
  return res.data;
}

// Users
export async function fetchUsers(params?: {
  filters?: FilterSet;
  search?: string;
  page?: number;
  page_size?: number;
}) {
  const search = new URLSearchParams();

  if (params?.filters) {
    params.filters.clauses.forEach((clause) => {
      // simple encoding: field|op|value
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

  if (params?.search) {
    search.set("search", params.search);
  }

  if (params?.page != null) {
    search.set("page", String(params.page));
  }

  if (params?.page_size != null) {
    search.set("page_size", String(params.page_size));
  }

  const res = await api.get(
    `/api/users/${search.toString() ? `?${search}` : ""}`
  );
  return res.data;
}

export async function fetchUser(id: number) {
  const res = await api.get<UserProfile>(`/api/users/${id}/`);
  return res.data;
}

export async function createUser(payload: UserProfile){
  const res = await api.post<UserProfile>("/api/users/", payload);
  return res.data;
}

export async function updateUser(id: number, payload: UserProfile) {
  const res = await api.put<UserProfile>(`/api/users/${id}/`, payload);
  return res.data;
}

export async function deleteUser(id: number) {
  await api.delete(`/api/users/${id}`);
}

// Permission Categories
// export async function fetchPermissionCategories(params?: Record<string, any>) {
//   const res = await api.get<PaginatedResult<PermissionCategory>>("/api/permission-categories/", {params,});
//   return res.data;
// }
export async function fetchPermissionCategories(params?: { filters?:FilterSet }) {
  const search = new URLSearchParams();

  if (params?.filters) {
    params.filters.clauses.forEach((clause) => {
      // simple encoding: field|op|value
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

  const res = await api.get(
    `/api/permission-categories/${search.toString() ? `?${search}` : ""}`
  );
  return res.data;
}

export async function fetchPermissionCategory(id: number) {
  const res = await api.get<PermissionCategory>(`/api/permission-categories/${id}/`);
  return res.data;
}

export async function createPermissionCategory(payload: PermissionCategory) {
  const res = await api.post<PermissionCategory>("/api/permission-categories/", payload);
  return res.data;
}

export async function updatePermissionCategory(id: number, patch: PermissionCategory) {
  const res = await api.patch<PermissionCategory>(`/api/permission-categories/${id}/`, patch);
  return res.data;
}

// Permissions
export async function fetchPermissions(params?: Record<string, any>) {
  const res = await api.get<PaginatedResult<Permission>>("/api/permissions/", {params,});
  return res.data;
}

export async function createPermission(payload: Permission) {
  const res = await api.post<Permission>("/api/permissions/", payload);
  return res.data;
}

export async function updatePermission(id: number, patch: Partial<Permission>) {
  const res = await api.patch<Permission>(`/api/permissions/${id}/`, patch)
  return res.data;
}

export async function deletePermission(id: number) {
  await api.delete(`/api/permissions/${id}/`);
}

// User Locations
export async function createUserLocation(payload: UserLocation) {
  const res = await api.post<UserLocation>("/api/user-locations/", payload);
  return res.data;
}

export async function deleteUserLocation(id: number) {
  await api.delete(`/api/user-locations/${id}/`);
}
