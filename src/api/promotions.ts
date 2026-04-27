// src/api/promotions.ts

import api from "./client";
import { buildQueryPath } from "./query";
import type { PaginatedResult } from "./types";
import type {
  BulkCouponAction,
  BulkCouponResult,
  Coupon,
  CouponSchedule,
} from "../types/promotions";
import type { FilterSet } from "../types/filters";

// Coupons
export async function fetchCoupons(params?: {
  filters?: FilterSet;
  search?: string;
  page?: number;
  page_size?: number;
  sort?: string;
  order?: "asc" | "desc";
}) {
  const res = await api.get<PaginatedResult<Coupon>>(
    buildQueryPath("/api/promotions/coupons/", {
      params: {
        search: params?.search,
        page: params?.page,
        page_size: params?.page_size,
        sort: params?.sort,
        order: params?.order,
      },
      filters: params?.filters,
    })
  );
  return res.data;
}

export async function fetchCoupon(id: number) {
  const res = await api.get<Coupon>(`/api/promotions/coupons/${id}/`);
  return res.data;
}

export async function createCoupon(payload: Partial<Coupon>) {
  const res = await api.post<Coupon>("/api/promotions/coupons/", payload);
  return res.data;
}

export async function updateCoupon(id: number, payload: Partial<Coupon>) {
  const res = await api.patch<Coupon>(`/api/promotions/coupons/${id}/`, payload);
  return res.data;
}

export async function deleteCoupon(id: number) {
  const res = await api.delete(`/api/promotions/coupons/${id}/`);
  return res.data;
}

export async function resetCouponUsage(id: number) {
  const res = await api.post<Coupon>(`/api/promotions/coupons/${id}/reset-usage/`);
  return res.data;
}

export async function bulkCoupons(payload: {
  ids: number[];
  action: BulkCouponAction;
  value?: string;
}) {
  const res = await api.post<BulkCouponResult>("/api/promotions/coupons/bulk/", payload);
  return res.data;
}

// Coupon Schedules
export async function fetchCouponSchedules(couponId: number) {
  const res = await api.get<PaginatedResult<CouponSchedule>>(
    "/api/promotions/coupon-schedules/",
    { params: { coupon: couponId } }
  );
  return res.data;
}

export async function createCouponSchedule(payload: CouponSchedule) {
  const res = await api.post<CouponSchedule>(
    "/api/promotions/coupon-schedules/",
    payload
  );
  return res.data;
}

export async function updateCouponSchedule(
  id: number,
  patch: Partial<CouponSchedule>
) {
  const res = await api.patch<CouponSchedule>(
    `/api/promotions/coupon-schedules/${id}/`,
    patch
  );
  return res.data;
}

export async function deleteCouponSchedule(id: number) {
  await api.delete(`/api/promotions/coupon-schedules/${id}/`);
}
