// src/types/invoice.ts

export interface InvoiceItemChild {
  id: number;
  item: number;                // item ID
  item_name: string;
  item_sku?: string;
  item_inventory_tracking?: boolean;
  item_returnable?: boolean;
  description: string;
  customization_label: string; // "Crash Course", "No Sugar", or "" if none
  quantity: string;            // decimal as string, e.g. "5.00"
  redeemed_quantity?: string;
  redeem_status?: "UNUSED" | "PARTIALLY_REDEEMED" | "REDEEMED" | string;
  last_redeemed_at?: string | null;
  last_redeemed_location?: number | null;
  last_redeemed_location_name?: string | null;
  unit_price: string;          // decimal as string
  discount_amount: string;
  tax_amount?: string;
  line_total: string;          // decimal as string
  refunded_from_line?: number | null;
}

export interface InvoiceItem {
  id: number;
  item: number;
  item_name: string;
  item_sku?: string;
  item_inventory_tracking?: boolean;
  item_returnable?: boolean;
  description: string;
  customization_label: string;
  quantity: string;
  redeemed_quantity?: string;
  redeem_status?: "UNUSED" | "PARTIALLY_REDEEMED" | "REDEEMED" | string;
  last_redeemed_at?: string | null;
  last_redeemed_location?: number | null;
  last_redeemed_location_name?: string | null;
  unit_price: string;
  discount_amount: string;
  tax_amount: string;
  line_total: string;
  parent_line: number | null;        // null for top-level, or parent line id
  refunded_from_line?: number | null;
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
  type_id: "SALE" | "REFUND" | "PREPAID";
  prepaid_number?: string | null;
  prepaid_redeem_status?: "UNUSED" | "PARTIALLY_REDEEMED" | "REDEEMED" | string;
  last_redeemed_at?: string | null;
  fully_redeemed_at?: string | null;
  status: "PAID" | "DRAFT" | "VOID" | string;
  coupon_code?: string;
  coupon_codes?: string[];
  refunded_from?: number | null;
  refunded_total?: string;           // sum of refunds created for this sale invoice
  net_grand_total?: string;          // grand_total - refunded_total (for SALE invoices)
  location: number;
  location_name: string;
  customer: number | null;
  customer_name: string | null;
  portal_customer?: number | null;
  portal_customer_name?: string | null;
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

export interface PaymentRecord {
  id: number;
  invoice_id: number;
  invoice_number: string;
  invoice_type_id: "SALE" | "REFUND" | "PREPAID" | string;
  invoice_status: string;
  prepaid_number?: string | null;
  location_id: number;
  location_name: string;
  portal_customer_id?: number | null;
  portal_customer_name?: string | null;
  customer_id?: number | null;
  customer_name?: string | null;
  amount: string;
  method: string;
  reference: string;
  paid_on: string;
  received_by?: number | null;
  received_by_name?: string | null;
}
