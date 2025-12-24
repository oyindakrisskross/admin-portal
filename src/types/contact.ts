export interface Country {
  id: number;
  name: string;
  code: string;
}

export interface State {
  id: number;
  country: number;
  name: string;
  code: string;
}

export interface CountryCode {
  id: number;
  country: number;
  code: string;
}

export type AddressType = "SHIPPING" | "BILLING" | "LOCATION";

export const ADD_TYPE_CHOICES: {value: AddressType; label: string}[] = [
  {value: "SHIPPING", label: "Shipping"},
  {value: "BILLING", label: "Billing"},
  {value: "LOCATION", label: "Location"},
];

export interface AddressBook {
  id?: number;
  type_id: string;
  address_attn?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string | null;
  state_name?: string;
  postal_code?: string;
  country?: string | null;
  country_name?: string;
  phone?: string;
  phone_code?: string | null;
  phone_code_code?: string;
}

export type ContactType = "INDIVIDUAL" | "BUSINESS";

export const CONTACT_TYPE_CHOICES: {value: ContactType; label: string}[] = [
  {value: "INDIVIDUAL", label: "Individual"},
  {value: "BUSINESS", label: "Business"},
];

export interface Contact {
  id?: number;
  first_name?: string;
  last_name: string;
  other_addresses?: ContactAddress[],
  email: string;
  phone_1?: string;
  phone_1_code?: string;
  phone_1_code_code?: string;
  phone_2?: string;
  phone_2_code?: string;
  phone_2_code_code?: string;
  contact_type: ContactType;
  company_name?: string;
  created_at?: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface ContactAddress {
  id?: number;
  contact?: number;
  address?: number;
  address_lines?: AddressBook;
}