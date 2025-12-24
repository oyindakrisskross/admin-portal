// src/types/invoice.ts

export interface InvoiceItemChild {
  id: number;
  item: number;                // item ID
  item_name: string;
  description: string;
  customization_label: string; // "Crash Course", "No Sugar", or "" if none
  quantity: string;            // decimal as string, e.g. "5.00"
  unit_price: string;          // decimal as string
  line_total: string;          // decimal as string
}

export interface InvoiceItem {
  id: number;
  item: number;
  item_name: string;
  description: string;
  customization_label: string;
  quantity: string;
  unit_price: string;
  discount_amount: string;
  tax_amount: string;
  line_total: string;
  parent_line: number | null;        // null for top-level, or parent line id
  children: InvoiceItemChild[];      // nested children for receipt/customizations
}

export interface InvoicePayment {
  id: number;
  amount: string;
  method: string;                    // "CARD", "TRANSFER", etc.
  reference: string;
  paid_on: string;                   // ISO datetime string
}

export interface InvoiceResponse {
  id: number;
  number: string;                    // "INV-9-000001"
  type_id: "SALE" | "REFUND";        // currently "SALE" in your examples
  status: "PAID" | "DRAFT" | "VOID" | string;
  location: number;
  location_name: string;
  customer: number | null;
  customer_name: string | null;
  invoice_date: string;              // ISO datetime
  due_date: string | null;
  subtotal: string;
  tax_total: string;
  discount_total: string;
  grand_total: string;
  amount_paid: string;
  balance_due: string;
  notes: string;
  items: InvoiceItem[];
  payments: InvoicePayment[];
  created_by: number;
  created_by_name: string;
}