// src/api/reports.ts

import type { GroupResponse, OverviewResponse, ReportResponse, InvoiceAdvancedFilters } from "../types/reports";
import type { CouponDetailReportResponse, CouponReportResponse } from "../types/reports";
import type { CategoriesReportResponse } from "../types/reports";
import type { PrepaidReportResponse } from "../types/reports";
import type { DailyReportRunResponse, DailyReportSettings } from "../types/dailyReports";
import type { MonthlyReportRunResponse, MonthlyReportSettings } from "../types/monthlyReports";
import api from "./client";

export interface PaginatedResult<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export async function fetchOverviewReport(args: {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  itemsMode: "parents" | "all";
  locationIds?: number[]; // omit => all allowed
  granularity?: "hour" | "day" | "week" | "month" | "year";
}): Promise<OverviewResponse> {
  const params: Record<string, any> = {
    start: args.start,
    end: args.end,
    items_mode: args.itemsMode,
    granularity: args.granularity,
  };

  if (args.locationIds && args.locationIds.length) {
    params.location_ids = args.locationIds.join(",");
  }

  const res = await api.get<OverviewResponse>("/api/sales/reports/overview", {
    params,
  });

  return res.data;
}

export async function fetchProductsReport(args: {
  start: string;
  end: string;
  locationIds?: number[];
  itemsMode?: "parents" | "all";
  granularity?: "hour" | "day" | "week" | "month" | "year";
  itemIds?: number[];
  seriesByItem?: boolean;
  search?: string;
  sort?: "items_sold" | "net_sales" | "orders" | "name";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  q.set("start", args.start);
  q.set("end", args.end);
  q.set("items_mode", args.itemsMode ?? "parents");
  if (args.granularity) q.set("granularity", args.granularity);
  if (args.locationIds?.length) q.set("location_ids", args.locationIds.join(","));
  if (args.itemIds?.length) q.set("item_ids", args.itemIds.join(","));
  if (args.seriesByItem) q.set("series_by_item", "1");
  if (args.search) q.set("search", args.search);
  if (args.sort) q.set("sort", args.sort);
  if (args.order) q.set("order", args.order);
  q.set("limit", String(args.limit ?? 25));
  q.set("offset", String(args.offset ?? 0));

  const res = await api.get<ReportResponse>(`/api/sales/reports/products/?${q.toString()}`);
  return res.data;
}

export async function fetchVariationsReport(args: {
  start: string;
  end: string;
  locationIds?: number[];
  itemsMode?: "parents" | "all";
  granularity?: "hour" | "day" | "week" | "month" | "year";
  search?: string;
  sort?: "items_sold" | "net_sales" | "orders" | "name";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  q.set("start", args.start);
  q.set("end", args.end);
  q.set("items_mode", args.itemsMode ?? "parents");
  if (args.granularity) q.set("granularity", args.granularity);
  if (args.locationIds?.length) q.set("location_ids", args.locationIds.join(","));
  if (args.search) q.set("search", args.search);
  if (args.sort) q.set("sort", args.sort);
  if (args.order) q.set("order", args.order);
  q.set("limit", String(args.limit ?? 25));
  q.set("offset", String(args.offset ?? 0));

  const res = await api.get<ReportResponse>(`/api/sales/reports/variations/?${q.toString()}`);
  return res.data;
}

export async function fetchInvoicesReport(args: {
  start: string;
  end: string;
  locationIds?: number[];
  granularity?: "hour" | "day" | "week" | "month" | "year";
  search?: string;
  sort?: "net_sales" | "number" | "items_sold";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
  advancedFilters?: InvoiceAdvancedFilters;
}) {
  const q = new URLSearchParams();
  q.set("start", args.start);
  q.set("end", args.end);
  if (args.granularity) q.set("granularity", args.granularity);
  if (args.locationIds?.length) q.set("location_ids", args.locationIds.join(","));
  if (args.search) q.set("search", args.search);
  if (args.sort) q.set("sort", args.sort);
  if (args.order) q.set("order", args.order);
  q.set("limit", String(args.limit ?? 25));
  q.set("offset", String(args.offset ?? 0));
  if (args.advancedFilters) q.set("advanced_filters", JSON.stringify(args.advancedFilters));

  const res = await api.get<ReportResponse>(`/api/sales/reports/invoices/?${q.toString()}`);
  return res.data;
}

export async function fetchGroupReport(args: {
  groupId: number;
  start: string;
  end: string;
  locationIds?: number[];
  itemsMode?: "parents" | "all";
  granularity?: "hour" | "day" | "week" | "month" | "year";
}) {
  const q = new URLSearchParams();
  q.set("start", args.start);
  q.set("end", args.end);
  q.set("items_mode", args.itemsMode ?? "parents");
  if (args.locationIds?.length) q.set("location_ids", args.locationIds.join(","));
  if (args.granularity) q.set("granularity", args.granularity);

  const res = await api.get<GroupResponse>(`/api/sales/reports/products/group/${args.groupId}/?${q.toString()}`);
  return res.data;
}

export async function fetchCouponsReport(args: {
  start: string;
  end: string;
  locationIds?: number[];
  granularity?: "hour" | "day" | "week" | "month" | "year";
  search?: string;
  sort?: "net_discount" | "discounted_orders" | "code" | "name";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  q.set("start", args.start);
  q.set("end", args.end);
  if (args.granularity) q.set("granularity", args.granularity);
  if (args.locationIds?.length) q.set("location_ids", args.locationIds.join(","));
  if (args.search) q.set("search", args.search);
  if (args.sort) q.set("sort", args.sort);
  if (args.order) q.set("order", args.order);
  q.set("limit", String(args.limit ?? 25));
  q.set("offset", String(args.offset ?? 0));

  const res = await api.get<CouponReportResponse>(`/api/sales/reports/coupons/?${q.toString()}`);
  return res.data;
}

export async function fetchCouponDetailReport(args: {
  code: string;
  start: string;
  end: string;
  locationIds?: number[];
  granularity?: "hour" | "day" | "week" | "month" | "year";
  sort?: "date" | "discount" | "net_sales" | "number";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}) {
  const q = new URLSearchParams();
  q.set("start", args.start);
  q.set("end", args.end);
  if (args.granularity) q.set("granularity", args.granularity);
  if (args.locationIds?.length) q.set("location_ids", args.locationIds.join(","));
  if (args.sort) q.set("sort", args.sort);
  if (args.order) q.set("order", args.order);
  q.set("limit", String(args.limit ?? 25));
  q.set("offset", String(args.offset ?? 0));

  const res = await api.get<CouponDetailReportResponse>(
    `/api/sales/reports/coupons/${encodeURIComponent(args.code)}/?${q.toString()}`
  );
  return res.data;
}

export async function fetchCategoriesReport(args: {
  start: string;
  end: string;
  locationIds?: number[];
  itemsMode?: "parents" | "all";
  granularity?: "hour" | "day" | "week" | "month" | "year";
  groupBy?: "all" | "top_level";
  parentCategoryId?: number;
}): Promise<CategoriesReportResponse> {
  const q = new URLSearchParams();
  q.set("start", args.start);
  q.set("end", args.end);
  q.set("items_mode", args.itemsMode ?? "parents");
  q.set("group_by", args.groupBy ?? "all");
  if (args.parentCategoryId != null && Number.isFinite(args.parentCategoryId)) {
    q.set("parent_category_id", String(args.parentCategoryId));
  }
  if (args.granularity) q.set("granularity", args.granularity);
  if (args.locationIds?.length) q.set("location_ids", args.locationIds.join(","));

  const res = await api.get<CategoriesReportResponse>(`/api/sales/reports/categories/?${q.toString()}`);
  return res.data;
}

export async function fetchPrepaidReport(args: {
  start: string;
  end: string;
  locationIds?: number[];
  granularity?: "hour" | "day" | "week" | "month" | "year";
  search?: string;
  sort?: "amount_paid" | "number" | "items_purchased" | "redeemed_items" | "status" | "refunded_amount";
  order?: "asc" | "desc";
  limit?: number;
  offset?: number;
}): Promise<PrepaidReportResponse> {
  const q = new URLSearchParams();
  q.set("start", args.start);
  q.set("end", args.end);
  if (args.granularity) q.set("granularity", args.granularity);
  if (args.locationIds?.length) q.set("location_ids", args.locationIds.join(","));
  if (args.search) q.set("search", args.search);
  if (args.sort) q.set("sort", args.sort);
  if (args.order) q.set("order", args.order);
  q.set("limit", String(args.limit ?? 25));
  q.set("offset", String(args.offset ?? 0));

  const res = await api.get<PrepaidReportResponse>(`/api/sales/reports/prepaid/?${q.toString()}`);
  return res.data;
}

export async function fetchDailyReportSettings(): Promise<DailyReportSettings> {
  const res = await api.get<DailyReportSettings>("/api/sales/reports/daily/settings/");
  return res.data;
}

export async function updateDailyReportSettings(
  patch: Partial<DailyReportSettings>
): Promise<DailyReportSettings> {
  const res = await api.put<DailyReportSettings>("/api/sales/reports/daily/settings/", patch);
  return res.data;
}

export async function runDailyReports(args: {
  date: string; // YYYY-MM-DD
  location_ids?: number[];
}): Promise<DailyReportRunResponse> {
  const res = await api.post<DailyReportRunResponse>("/api/sales/reports/daily/run/", args);
  return res.data;
}

export async function fetchMonthlyReportSettings(): Promise<MonthlyReportSettings> {
  const res = await api.get<MonthlyReportSettings>("/api/sales/reports/monthly/settings/");
  return res.data;
}

export async function updateMonthlyReportSettings(
  patch: Partial<MonthlyReportSettings>
): Promise<MonthlyReportSettings> {
  const res = await api.put<MonthlyReportSettings>("/api/sales/reports/monthly/settings/", patch);
  return res.data;
}

export async function runMonthlyReports(args: {
  month: string; // YYYY-MM
  location_ids?: number[];
}): Promise<MonthlyReportRunResponse> {
  const res = await api.post<MonthlyReportRunResponse>("/api/sales/reports/monthly/run/", args);
  return res.data;
}
