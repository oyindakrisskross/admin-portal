// src/api/promotions.ts

import api from "./client";
import type { PaginatedResult } from "./types";
import type { Coupon, CouponSchedule } from "../types/promotions";

// Coupons
export async function fetchCoupons(params?: Record<string, any>) {
  const res = await api.get<PaginatedResult<Coupon>>("/api/promotions/coupons/", {
    params,
  });
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
