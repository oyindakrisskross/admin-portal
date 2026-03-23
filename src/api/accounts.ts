// src/api/accounts.ts

import api from "./client";
import { buildQueryPath } from "./query";
import type { PaginatedResult } from "./types";
import { 
  type Role, 
  type Permission, 
  type PermissionCategory, 
  type UserProfile,
  type UserLocation, 
} from "../types/accounts";
import type { FilterSet } from "../types/filters";

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
  const res = await api.get(
    buildQueryPath("/api/users/", {
      params: {
        search: params?.search,
        page: params?.page,
        page_size: params?.page_size,
      },
      filters: params?.filters,
    })
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
  const res = await api.get(
    buildQueryPath("/api/permission-categories/", {
      filters: params?.filters,
    })
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
