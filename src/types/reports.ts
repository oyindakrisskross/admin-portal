// src/types/reports.ts

export interface SeriesPoint { t: string; v: string | number };

export type Granularity = "hour" | "day" | "week" | "month";

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
