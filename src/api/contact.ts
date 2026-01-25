// src/api/contact.ts

import api from "./client";
import * as Contact from "../types/contact";
import type { FilterSet } from "../types/filters";

export interface PaginatedResult<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export async function fetchCountries(params?: {filters?:FilterSet}) {
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
    `/api/contacts/countries/${search.toString() ? `?${search}` : ""}`
  );
  return res.data;
}

export async function fetchStates(params?: {filters?:FilterSet}) {
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
    `/api/contacts/states/${search.toString() ? `?${search}` : ""}`
  );
  return res.data;
}

export async function fetchCountryCodes(params?: {filters?:FilterSet}) {
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
    `/api/contacts/country-codes/${search.toString() ? `?${search}` : ""}`
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
export async function fetchContacts(params?: { filters?: FilterSet; search?: string }) {
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

  const res = await api.get(
    `/api/contacts/contacts/${search.toString() ? `?${search}` : ""}`
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
