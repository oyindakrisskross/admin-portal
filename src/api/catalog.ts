// src/api/catalog.ts

import api from "./client";
import * as Catalog from "../types/catalog";
import type { FilterSet } from "../types/filters";

export interface PaginatedResult<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

// Cateogries
export async function fetchCategories(params?: { filters?:FilterSet }) {
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
    `/api/catalog/categories/${search.toString() ? `?${search}` : ""}`
  );
  return res.data;
}

export async function fetchCategory(id: number) {
  const res = await api.get<Catalog.Category>(`/api/catalog/categories/${id}/`);
  return res.data;
}

export async function createCategory(payload: Catalog.Category) {
  const res = await api.post<Catalog.Category>("/api/catalog/categories/", payload);
  return res.data;
}

export async function updateCategory(id: number, payload: Catalog.Category) {
  const res = await api.patch<Catalog.Category>(`/api/catalog/categories/${id}/`, payload);
  return res.data;
}

export async function deleteCategory(id: number) {
  await api.delete(`/api/catalog/categories/${id}/`);
}


// Item Category

export async function createItemCategory(payload: Catalog.ItemCategory) {
  const res = await api.post<Catalog.ItemCategory>("/api/catalog/item-categories/", payload);
  return res.data;
}

export async function deleteItemCategory(id: number) {
  await api.delete(`/api/catalog/item-categories/${id}/`);
}


// Units

export async function fetchUnits(params?: Record<string, any>) {
  const res = await api.get<PaginatedResult<Catalog.Unit>>("/api/catalog/units/", {
    params,
  });
  return res.data;
}

export async function fetchUnit(id: number) {
  const res = await api.get<Catalog.Unit>(`/api/catalog/units/${id}/`);
  return res.data;
}

export async function updateUnit(id: number, payload: Catalog.Unit) {
  const res = await api.patch<Catalog.Unit>(`/api/catalog/units/${id}/`, payload);
  return res.data;
}

export async function createUnit(payload: Catalog.Unit) {
  const res = await api.post<Catalog.Unit>("/api/catalog/units/", payload);
  return res.data;
}

export async function deleteUnit(id: number) {
  await api.delete<Catalog.Unit>(`/api/catalog/units/${id}/`);
}


// Tax Rule

export async function fetchTaxRules(params?: Record<string, any>) {
  const res = await api.get<PaginatedResult<Catalog.TaxRule>>("/api/catalog/tax-rules", {
    params,
  });
  return res.data;
}

export async function fetchTaxRule(id: number) {
  const res = await api.get<Catalog.TaxRule>(`/api/catalog/tax-rules/${id}/`);
  return res.data;
}

export async function updateTaxRule(id: number, payload: Catalog.ItemGroup) {
  const res = await api.patch<Catalog.TaxRule>(`/api/catalog/tax-rules/${id}/`, payload);
  return res.data;
}

export async function createTaxRule(payload: Catalog.TaxRule) {
  const res = await api.post<Catalog.TaxRule>("/api/catalog/tax-rules/", payload);
  return res.data;
}

export async function fetchAttributes(params?: Record<string, any>) {
  const res = await api.get<PaginatedResult<Catalog.Attribute>>("/api/catalog/attributes/", {
    params,
  });
  return res.data;
}


// Item Groups

export async function fetchItemGroups(params?: { filters?:FilterSet }) {
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
    `/api/catalog/item-groups/${search.toString() ? `?${search}` : ""}`
  );
  return res.data;
}

export async function fetchItemGroup(id: number) {
  const res = await api.get<Catalog.ItemGroup>(`/api/catalog/item-groups/${id}/`);
  return res.data;
}

export async function createItemGroup(payload: Catalog.ItemGroup) {
  const res = await api.post<Catalog.ItemGroup>("/api/catalog/item-groups/", payload);
  return res.data;
}

export async function updateItemGroup(id: number, payload: Catalog.ItemGroup) {
  const res = await api.put<Catalog.ItemGroup>(`/api/catalog/item-groups/${id}/`, payload);
  return res.data;
}

export async function patchItemGroup(id: number, payload: Catalog.ItemGroup) {
  const res = await api.patch<Catalog.ItemGroup>(`/api/catalog/item-groups/${id}/`, payload);
  return res.data;
}

export async function deleteItemGroup(id: number) {
  await api.delete(`/api/catalog/item-groups/${id}/`);
}


// Items
// export async function fetchItems(params?: Record<string, any>) {
//   const res = await api.get<PaginatedResult<Catalog.Item>>("/api/catalog/items/", { params });
//   return res.data;
// }
export async function fetchItems(params?: { filters?:FilterSet }) {
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
    `/api/catalog/item-lte/${search.toString() ? `?${search}` : ""}`
  );
  return res.data;
}

export async function fetchItem(id: number) {
  const res = await api.get<Catalog.Item>(`/api/catalog/items/${id}/`);
  return res.data;
}

export async function fetchItemTrnxs(params?: Record<string, any>) {
  const res = await api.get<PaginatedResult<Catalog.InventoryTransaction>>(
    "/api/catalog/inventory-trnx/", { params }
  );
  return res.data;
}

export async function fetchInventory(params?: Record<string, any>) {
  const res = await api.get<PaginatedResult<Catalog.Inventory>>(
    "/api/catalog/inventory/", { params }
  );
  return res.data;
}

export async function createItem(payload: Catalog.ItemGroup) {
  const res = await api.post<Catalog.Item>("/api/catalog/items/", payload);
  return res.data;
}

export async function updateItem(id: number, payload: Catalog.ItemGroup) {
  const res = await api.patch<Catalog.Item>(`/api/catalog/items/${id}/`, payload);
  return res.data;
}

export async function patchItem(id: number, payload: Partial<Catalog.ItemGroup>) {
  const res = await api.patch<Catalog.Item>(`/api/catalog/items/${id}/`, payload);
  return res.data;
}

export async function deleteItem(id: number) {
  await api.delete(`/api/catalog/items/${id}/`);
}


// Item Schedule
export async function createItemSchedule(payload: Catalog.ItemSchedule) {
  const res = await api.post<Catalog.ItemSchedule>("/api/catalog/item-schedules/", payload);
  return res.data;
}

export async function updateItemSchedule(
  id: number,
  patch: {
    all_day?: boolean; 
    time_from?: string;
    time_to?: string;
  }
) {
  const res = await api.patch(`/api/catalog/item-schedules/${id}/`, patch);
  return res.data;
}

export async function deleteItemSchedule(id: number) {
  await api.delete(`/api/catalog/item-schedules/${id}/`);
}

// Item Customization
export async function createItemCustomization(payload: Catalog.ItemCustomization) {
  const res = await api.post<Catalog.ItemCustomization>("/api/catalog/item-customizations/", payload);
  return res.data;
}

export async function updateItemCustomization(id: number, patch: Catalog.ItemCustomization) {
  const res = await api.patch(`/api/catalog/item-customizations/${id}/`, patch);
  return res.data;
}

export async function deleteItemCustomization(id: number) {
  await api.delete(`/api/catalog/item-customizations/${id}/`);
}

// Item Availability
export async function createItemAvailability(payload: Catalog.ItemAvailability) {
  const res = await api.post<Catalog.ItemAvailability>("/api/catalog/availabilities/", payload);
  return res.data;
}

export async function deleteItemAvailability(id: number) {
  await api.delete(`/api/catalog/availabilities/${id}/`);
}


// Gallery
export async function createItemGroupGallery(
  groupId: number,
  file: File,
  isPrimary: boolean,
  sortOrder: number
) {
  const form = new FormData();
  form.append("item_group", String(groupId));
  form.append("image", file);
  form.append("is_primary", isPrimary ? "true" : "false");
  form.append("sort_order", String(sortOrder));

  const res = await api.post("/api/catalog/item-group-images/", form, {
    headers: { "Content-Type": "multiart/form-data" },
  });
  return res.data;
}

export async function createItemGallery(
  itemId: number,
  file: File,
  isPrimary: boolean,
  sortOrder: number
) {
  const form = new FormData();
  form.append("item", String(itemId));
  form.append("image", file);
  form.append("is_primary", isPrimary ? "true" : "false");
  form.append("sort_order", String(sortOrder));

  const res = await api.post("/api/catalog/item-images/", form, {
    headers: { "Content-Type": "multiart/form-data" },
  });
  return res.data;
}

export async function updateItemGroupGallery(
  id: number,
  patch: { is_primary?: boolean; sort_order?: number }
) {
  const res = await api.patch(`/api/catalog/item-group-images/${id}/`, patch);
  return res.data;
}

export async function updateItemGallery(
  id: number,
  patch: { is_primary?: boolean; sort_order?: number }
) {
  const res = await api.patch(`/api/catalog/item-images/${id}/`, patch);
  return res.data;
}

export async function deleteItemGroupGallery(id: number) {
  await api.delete(`/api/catalog/item-group-images/${id}/`);
}

export async function deleteItemGallery(id: number) {
  await api.delete(`/api/catalog/item-group-images/${id}/`);
}