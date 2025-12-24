// src/api/reports.ts

import type { GroupResponse, OverviewResponse, ReportResponse } from "../types/reports";
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
  granularity?: "hour" | "day" | "week" | "month";
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
  granularity?: "hour" | "day" | "week" | "month";
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

  const res = await api.get<ReportResponse>(`/api/sales/reports/products/?${q.toString()}`);
  return res.data;
}

export async function fetchVariationsReport(args: {
  start: string;
  end: string;
  locationIds?: number[];
  itemsMode?: "parents" | "all";
  granularity?: "hour" | "day" | "week" | "month";
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
  granularity?: "hour" | "day" | "week" | "month";
  search?: string;
  sort?: "net_sales" | "number" | "items_sold";
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

  const res = await api.get<ReportResponse>(`/api/sales/reports/invoices/?${q.toString()}`);
  return res.data;
}

export async function fetchGroupReport(args: {
  groupId: number;
  start: string;
  end: string;
  locationIds?: number[];
  itemsMode?: "parents" | "all";
  granularity?: "hour" | "day" | "week" | "month";
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