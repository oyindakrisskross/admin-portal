// src/types/reports.ts

export interface SeriesPoint { t: string; v: string | number };

export type InvoiceFilterMatch = "all" | "any";
export type InvoiceFilterType = "coupon" | "product" | "variation" | "refund" | "status";
export type InvoiceFilterMode = "include" | "exclude" | "is" | "is_not";
export type InvoiceRefundFilter = "all" | "none" | "partial" | "full";

export interface InvoiceFilterClause {
  type: InvoiceFilterType;
  mode?: InvoiceFilterMode;
  values?: string[];
  item_ids?: number[];
  group_ids?: number[];
  refund?: InvoiceRefundFilter;
}

export interface InvoiceAdvancedFilters {
  match: InvoiceFilterMatch;
  clauses: InvoiceFilterClause[];
}

export type Granularity = "hour" | "day" | "week" | "month" | "year";

export interface OverviewResponse {
  range: { 
    start: string; 
    end: string; 
    granularity: Granularity;
    available_granularities: Array<Granularity>; 
  };
  scope: { location_ids: number[] | "ALL"; items_mode: "parents" | "all" };
  performance: {
    total_sales: string;
    net_sales: string;
    total_refunded?: string;
    orders: number;
    products_sold: string;
    discounted_orders: number;
    net_discount_amount: string;
    tax_total: string;
  };
  series: {
    net_sales: SeriesPoint[];
    orders: SeriesPoint[];
    items_sold: SeriesPoint[];
  };
  top_products: Array<{
    item_id: number;
    name: string;
    items_sold: string;
    net_sales: string;
  }>;
};

export interface ResponseRow {
  row_type: "group" | "simple" | null;
  row_id: string;
  group_id: number | null;
  item_id: number | null;
  name: string;
  sku: string | null;
  items_sold: string;
  net_sales: string;
  net_discount: string;
  orders: number;

  invoice_id: number | null;
  invoice_number: string;
  invoice_date: string;
  location: string;
  coupon_code?: string | null;
  subtotal?: string;
  discount_total?: string;
  subtotal_after_discount?: string;
};

export interface ReportResponse {
  range: { 
    start: string; 
    end: string;
    granularity: Granularity;
    available_granularities: Array<Granularity>;
  };
  scope: { location_ids: number[] | "ALL"; items_mode: "parents" | "all" };
  kpi: { 
    items_sold: string; 
    net_sales: string;
    net_discount: string; 
    orders: number;
    avg_value: string;
    total_refunded?: string;
  };
  series: {
    items_sold: SeriesPoint[];
    net_sales: SeriesPoint[];
    net_discount: SeriesPoint[];
    orders: SeriesPoint[];
  };
  series_by_item?: {
    items_sold: Record<string, SeriesPoint[]>;
    net_sales: Record<string, SeriesPoint[]>;
    net_discount: Record<string, SeriesPoint[]>;
    orders: Record<string, SeriesPoint[]>;
  };
  pagination: { total: number; limit: number; offset: number };
  results: ResponseRow[];
};

export interface GroupResponse {
  range: {
    start: string;
    end: string;
    granularity: Granularity;
    available_granularities: Array<Granularity>;
  };
  scope: { location_ids: number[] | "ALL"; items_mode: "parents" | "all" };
  group: { group_id: number; name: string };
  kpi: { items_sold: string; net_sales: string; orders: number };
  series: {
    items_sold: SeriesPoint[];
    net_sales: SeriesPoint[];
    orders: SeriesPoint[];
  };
  variations: Array<{
    item_id: number;
    item__name: string;
    item__sku: string;
    items_sold: string;
    net_sales: string;
    discount_amount: string;
    orders: number;
  }>;
};

export interface CouponReportRow {
  code: string;
  name: string | null;
  discounted_orders: number;
  net_discount: string;
}

export interface CouponReportResponse {
  range: {
    start: string;
    end: string;
    granularity: Granularity;
    available_granularities: Array<Granularity>;
  };
  scope: { location_ids: number[] | "ALL" };
  kpi: {
    discounted_orders: number;
    net_discount: string;
  };
  series: {
    discounted_orders: SeriesPoint[];
    net_discount: SeriesPoint[];
  };
  pagination: { total: number; limit: number; offset: number };
  results: CouponReportRow[];
}

export interface CouponInvoiceRow {
  invoice_id: number;
  invoice_number: string;
  invoice_date: string;
  location: string;
  net_sales: string;
  coupon_discount: string;
}

export interface CouponDetailReportResponse {
  range: {
    start: string;
    end: string;
    granularity: Granularity;
    available_granularities: Array<Granularity>;
  };
  scope: { location_ids: number[] | "ALL" };
  coupon: { code: string; name: string | null };
  kpi: {
    discounted_orders: number;
    net_discount: string;
  };
  series: {
    discounted_orders: SeriesPoint[];
    net_discount: SeriesPoint[];
  };
  pagination: { total: number; limit: number; offset: number };
  results: CouponInvoiceRow[];
}

export interface CategoriesSeriesPoint {
  t: string;
  values: Record<string, string>;
}

export interface CategoryReportRow {
  category_id: number;
  name: string;
  net_sales: string;
  orders: number;
  items_sold: string;
}

export interface CategoriesReportResponse {
  range: {
    start: string;
    end: string;
    granularity: Granularity;
    available_granularities: Array<Granularity>;
  };
  scope: {
    location_ids: number[] | "ALL";
    items_mode: "parents" | "all";
    group_by?: "all" | "top_level";
    parent_category_id?: number | null;
  };
  parent_category?: { category_id: number; name: string } | null;
  categories: Array<{ category_id: number; name: string }>;
  series: {
    net_sales: CategoriesSeriesPoint[];
  };
  pie: Array<{ category_id: number; name: string; net_sales: string }>;
  results: CategoryReportRow[];
}

export interface PrepaidReportRow {
  invoice_id: number;
  invoice_number: string;
  prepaid_number: string;
  invoice_date: string;
  location: string;
  status: "UNUSED" | "PARTIALLY_REDEEMED" | "REDEEMED" | string;
  last_redeemed_at?: string | null;
  amount_paid: string;
  items_purchased: string;
  redeemed_items: string;
  refunded_amount: string;
}

export interface PrepaidRedeemedItemRow {
  source: "PREPAID" | "SUBSCRIPTION" | string;
  item_id: number | null;
  item_name: string;
  item_sku: string;
  quantity_redeemed: number;
  last_redeemed_at?: string | null;
}

export interface PrepaidReportResponse {
  range: {
    start: string;
    end: string;
    granularity: Granularity;
    available_granularities: Array<Granularity>;
  };
  scope: { location_ids: number[] | "ALL" };
  kpi: {
    invoices_created: number;
    amount_paid: string;
    items_purchased: string;
    redeemed_items: string;
    used_invoices: number;
    fully_redeemed_invoices: number;
    partially_redeemed_invoices: number;
    unused_invoices: number;
    refunded_invoices: number;
    total_refunded: string;
  };
  series: {
    invoices_created: SeriesPoint[];
    amount_paid: SeriesPoint[];
    items_purchased: SeriesPoint[];
    redeemed_items: SeriesPoint[];
    refunded_amount: SeriesPoint[];
  };
  pagination: { total: number; limit: number; offset: number };
  results: PrepaidReportRow[];
  redeemed_items_results: PrepaidRedeemedItemRow[];
}
