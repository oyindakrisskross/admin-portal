// src/api/contact.ts

import api from "./client";
import { buildQueryPath } from "./query";
import type { PaginatedResult } from "./types";
import * as Contact from "../types/contact";
import type { FilterSet } from "../types/filters";

export async function fetchCountries(params?: {filters?:FilterSet}) {
  const res = await api.get(
    buildQueryPath("/api/contacts/countries/", {
      filters: params?.filters,
    })
  );
  return res.data;
}

export async function fetchStates(params?: {filters?:FilterSet}) {
  const res = await api.get(
    buildQueryPath("/api/contacts/states/", {
      filters: params?.filters,
    })
  );
  return res.data;
}

export async function fetchCountryCodes(params?: {filters?:FilterSet}) {
  const res = await api.get(
    buildQueryPath("/api/contacts/country-codes/", {
      filters: params?.filters,
    })
  );
  return res.data;
}

export async function fetchAddressBook(id: number) {
  const res = await api.get<Contact.AddressBook>(`/api/contacts/address-book/${id}/`);
  return res.data;
}

export async function createAddressBook(payload: Contact.AddressBook) {
  const res = await api.post<Contact.AddressBook>("/api/contacts/address-book/", payload);
  return res.data;
}

export async function updateAddressBook(id: number, payload: Contact.AddressBook) {
  const res = await api.put(`/api/contacts/address-book/${id}/`, payload);
  return res.data;
}

// Contacts
export async function fetchContacts(params?: {
  filters?: FilterSet;
  search?: string;
  page?: number;
  page_size?: number;
}) {
  const res = await api.get(
    buildQueryPath("/api/contacts/contacts/", {
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

export async function fetchContact(id: number) {
  const res = await api.get<Contact.Contact>(`/api/contacts/contacts/${id}/`);
  return res.data;
}

export async function createContact(payload: Contact.Contact) {
  const res = await api.post<Contact.Contact>("/api/contacts/contacts/", payload);
  return res.data;
}

export async function updateContact(id: number, patch: Contact.Contact) {
  const res = await api.put<Contact.Contact>(`/api/contacts/contacts/${id}/`, patch);
  return res.data;
}

export async function deleteContact(id: number) {
  await api.delete(`/api/contacts/contacts/${id}/`);
}

export async function createContactAddr(payload: { contact: number, address: number }) {
  const res = await api.post<Contact.ContactAddress>("/api/contacts/contact-addresses/", payload);
  return res.data;
}

export type CRMCategory =
  | "Contacts"
  | "Customers"
  | "Employees"
  | "Vendors"
  | "Leads"
  | "Portal Users";

export type CRMSettingsRecord = {
  id: number;
  portal_id: number;
  enabled_categories: CRMCategory[];
  online_form_service_key: string;
  available_categories: CRMCategory[];
  created_at: string;
  updated_at: string;
};

export type CRMConnectionImportOption = {
  service_key: string;
  service_name: string;
  service_type: string;
  connection_name: string;
  status: "CONNECTED" | "DISCONNECTED";
  last_ping_at: string | null;
  last_ping_success: boolean;
  integration_targets: string[];
};

export type CRMCSVDBColumn = {
  key: string;
  label: string;
  required: boolean;
};

export type CRMCSVParseResult = {
  headers: string[];
  row_count: number;
  sample_rows: Array<Record<string, string>>;
  db_columns: CRMCSVDBColumn[];
};

export type CRMCSVCommitResult = {
  created_count: number;
  updated_count: number;
  skipped_count: number;
  total_rows: number;
  error_samples: Array<{ row: number; reason: string }>;
};

export type CRMImportSyncMode = "ONE_TIME" | "RECURRING";

export type CRMConnectionImportModule = {
  id: string;
  api_name: string;
  label: string;
  singular_label: string;
  plural_label: string;
  visible: boolean;
  api_supported: boolean;
  creatable: boolean;
  deletable: boolean;
  modified_time: string | null;
};

export type CRMConnectionImportMapping = {
  id: number;
  module_id: string;
  module_api_name: string;
  module_label: string;
  crm_category: CRMCategory;
  sync_mode: CRMImportSyncMode;
  is_active: boolean;
  field_map: Record<string, string>;
  notification_channel_id: number | null;
  notification_expires_at: string | null;
  last_import_at: string | null;
  last_import_status: "IDLE" | "SUCCESS" | "ERROR";
  last_import_message: string;
  last_import_count: number;
  created_at: string;
  updated_at: string;
};

export type CRMConnectionImportSourceField = {
  path: string;
  api_name: string;
  display_label: string;
  data_type: string;
  json_type: string;
  system_mandatory: boolean;
  read_only: boolean;
  virtual_field: boolean;
  source_type: "field" | "subform";
  collection_root: string;
  parent_api_name: string;
  associated_module_api_name: string;
  requires_detail: boolean;
};

export type CRMConnectionImportTargetField = {
  key: string;
  label: string;
  group_key: string;
  group_label: string;
  required: boolean;
  help_text: string;
  repeated: boolean;
};

export type CRMConnectionImportModuleFieldCatalog = {
  module_api_name: string;
  module_label: string;
  crm_category: CRMCategory;
  fields: CRMConnectionImportSourceField[];
  targets: CRMConnectionImportTargetField[];
  suggested_field_map: Record<string, string>;
};

export type CRMConnectionImportManagementRecord = {
  service_key: string;
  service_name: string;
  connection_name: string;
  status: "CONNECTED" | "DISCONNECTED";
  api_domain: string;
  enabled_categories: CRMCategory[];
  token_notice: string;
  module_error: string;
  modules: CRMConnectionImportModule[];
  mappings: CRMConnectionImportMapping[];
};

export type CRMConnectionImportRunRecord = {
  mapping_id: number;
  module_api_name: string;
  module_label: string;
  crm_category: CRMCategory;
  created_count: number;
  updated_count: number;
  skipped_count: number;
  record_count: number;
};

export type CRMConnectionImportRunResult = {
  results: CRMConnectionImportRunRecord[];
  errors: Array<{ mapping_id: number; module_api_name: string; detail: string }>;
  token_notice: string;
};

function extractFilenameFromContentDisposition(contentDisposition?: string): string {
  if (!contentDisposition) return "contacts.csv";
  const match = contentDisposition.match(/filename=\"([^\"]+)\"/i);
  if (match?.[1]) return match[1];
  return "contacts.csv";
}

export async function fetchCRMSettings(): Promise<CRMSettingsRecord> {
  const res = await api.get<CRMSettingsRecord>("/api/contacts/crm-settings/");
  return res.data;
}

export async function updateCRMSettings(
  payload: Partial<Pick<CRMSettingsRecord, "enabled_categories" | "online_form_service_key">>
): Promise<CRMSettingsRecord> {
  const res = await api.patch<CRMSettingsRecord>("/api/contacts/crm-settings/", payload);
  return res.data;
}

export async function exportContactsCsv(params?: {
  category?: CRMCategory;
}): Promise<{ blob: Blob; filename: string }> {
  const search = new URLSearchParams();
  if (params?.category) {
    search.set("category", params.category);
  }

  const path = `/api/contacts/crm-settings/export/contacts.csv${search.toString() ? `?${search.toString()}` : ""}`;
  const res = await api.get(path, { responseType: "blob" });
  const filename = extractFilenameFromContentDisposition(res.headers["content-disposition"]);
  return { blob: res.data as Blob, filename };
}

export async function parseCRMImportCSV(file: File): Promise<CRMCSVParseResult> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await api.post<CRMCSVParseResult>("/api/contacts/crm-settings/import/csv/parse/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function commitCRMImportCSV(params: {
  file: File;
  mapping: Record<string, string>;
  default_contact_type?: Contact.ContactType;
  category?: CRMCategory;
}): Promise<CRMCSVCommitResult> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("mapping", JSON.stringify(params.mapping || {}));
  if (params.default_contact_type) {
    formData.append("default_contact_type", params.default_contact_type);
  }
  if (params.category) {
    formData.append("category", params.category);
  }

  const res = await api.post<CRMCSVCommitResult>("/api/contacts/crm-settings/import/csv/commit/", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function fetchCRMConnectionImportOptions(): Promise<CRMConnectionImportOption[]> {
  const res = await api.get<{ results: CRMConnectionImportOption[] }>("/api/contacts/crm-settings/import/connections/");
  return res.data.results || [];
}

export async function fetchCRMConnectionImportManagement(
  serviceKey: string
): Promise<CRMConnectionImportManagementRecord> {
  const res = await api.get<CRMConnectionImportManagementRecord>(
    `/api/contacts/crm-settings/import/connections/${serviceKey}/`
  );
  return res.data;
}

export async function updateCRMConnectionImportManagement(
  serviceKey: string,
  payload: {
    mappings: Array<{
      module_api_name: string;
      crm_category: CRMCategory;
      sync_mode: CRMImportSyncMode;
      is_active?: boolean;
      field_map?: Record<string, string>;
    }>;
  }
): Promise<{ mappings: CRMConnectionImportMapping[]; token_notice: string }> {
  const res = await api.put<{ mappings: CRMConnectionImportMapping[]; token_notice: string }>(
    `/api/contacts/crm-settings/import/connections/${serviceKey}/`,
    payload
  );
  return res.data;
}

export async function fetchCRMConnectionImportModuleFields(
  serviceKey: string,
  moduleApiName: string,
  crmCategory: CRMCategory
): Promise<CRMConnectionImportModuleFieldCatalog> {
  const res = await api.get<CRMConnectionImportModuleFieldCatalog>(
    `/api/contacts/crm-settings/import/connections/${serviceKey}/modules/${encodeURIComponent(moduleApiName)}/fields/`,
    {
      params: { crm_category: crmCategory },
    }
  );
  return res.data;
}

export async function runCRMConnectionImports(
  serviceKey: string,
  payload?: { mapping_ids?: number[] }
): Promise<CRMConnectionImportRunResult> {
  const res = await api.post<CRMConnectionImportRunResult>(
    `/api/contacts/crm-settings/import/connections/${serviceKey}/run/`,
    payload || {}
  );
  return res.data;
}

export async function fetchCRMOnlineFormImportOptions(): Promise<{
  selected_service_key: string;
  results: CRMConnectionImportOption[];
}> {
  const res = await api.get<{
    selected_service_key: string;
    results: CRMConnectionImportOption[];
  }>("/api/contacts/crm-settings/import/online-forms/");
  return res.data;
}
