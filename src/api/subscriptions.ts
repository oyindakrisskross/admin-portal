import api from "./client";
import type {
  CustomerSubscriptionRecord,
  SubscriptionAddon,
  SubscriptionCoupon,
  SubscriptionPlan,
  SubscriptionPlanTransaction,
  SubscriptionProduct,
} from "../types/subscriptions";

export interface PaginatedResult<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export async function fetchSubscriptionProducts(params?: Record<string, unknown>) {
  const res = await api.get<PaginatedResult<SubscriptionProduct>>("/api/subscriptions/products/", {
    params,
  });
  return res.data;
}

export async function fetchSubscriptionProduct(id: number) {
  const res = await api.get<SubscriptionProduct>(`/api/subscriptions/products/${id}/`);
  return res.data;
}

export async function createSubscriptionProduct(payload: Partial<SubscriptionProduct>) {
  const res = await api.post<SubscriptionProduct>("/api/subscriptions/products/", payload);
  return res.data;
}

export async function updateSubscriptionProduct(
  id: number,
  payload: Partial<SubscriptionProduct>
) {
  const res = await api.patch<SubscriptionProduct>(`/api/subscriptions/products/${id}/`, payload);
  return res.data;
}

export async function deleteSubscriptionProduct(id: number) {
  await api.delete(`/api/subscriptions/products/${id}/`);
}

export async function fetchSubscriptionPlans(params?: Record<string, unknown>) {
  const res = await api.get<PaginatedResult<SubscriptionPlan>>("/api/subscriptions/plans/", {
    params,
  });
  return res.data;
}

export async function fetchSubscriptionPlan(id: number) {
  const res = await api.get<SubscriptionPlan>(`/api/subscriptions/plans/${id}/`);
  return res.data;
}

export async function createSubscriptionPlan(payload: Partial<SubscriptionPlan>) {
  const res = await api.post<SubscriptionPlan>("/api/subscriptions/plans/", payload);
  return res.data;
}

export async function updateSubscriptionPlan(
  id: number,
  payload: Partial<SubscriptionPlan>
) {
  const res = await api.patch<SubscriptionPlan>(`/api/subscriptions/plans/${id}/`, payload);
  return res.data;
}

export async function deleteSubscriptionPlan(id: number) {
  await api.delete(`/api/subscriptions/plans/${id}/`);
}

export async function fetchSubscriptionAddons(params?: Record<string, unknown>) {
  const res = await api.get<PaginatedResult<SubscriptionAddon>>("/api/subscriptions/addons/", {
    params,
  });
  return res.data;
}

export async function createSubscriptionAddon(payload: Partial<SubscriptionAddon>) {
  const res = await api.post<SubscriptionAddon>("/api/subscriptions/addons/", payload);
  return res.data;
}

export async function updateSubscriptionAddon(
  id: number,
  payload: Partial<SubscriptionAddon>
) {
  const res = await api.patch<SubscriptionAddon>(`/api/subscriptions/addons/${id}/`, payload);
  return res.data;
}

export async function deleteSubscriptionAddon(id: number) {
  await api.delete(`/api/subscriptions/addons/${id}/`);
}

export async function fetchSubscriptionCoupons(params?: Record<string, unknown>) {
  const res = await api.get<PaginatedResult<SubscriptionCoupon>>("/api/subscriptions/coupons/", {
    params,
  });
  return res.data;
}

export async function createSubscriptionCoupon(payload: Partial<SubscriptionCoupon>) {
  const res = await api.post<SubscriptionCoupon>("/api/subscriptions/coupons/", payload);
  return res.data;
}

export async function updateSubscriptionCoupon(
  id: number,
  payload: Partial<SubscriptionCoupon>
) {
  const res = await api.patch<SubscriptionCoupon>(`/api/subscriptions/coupons/${id}/`, payload);
  return res.data;
}

export async function deleteSubscriptionCoupon(id: number) {
  await api.delete(`/api/subscriptions/coupons/${id}/`);
}

export async function fetchSubscriptionPlanTransactions(params?: Record<string, unknown>) {
  const res = await api.get<PaginatedResult<SubscriptionPlanTransaction>>(
    "/api/subscriptions/plan-transactions/",
    { params }
  );
  return res.data;
}

export async function fetchCustomerSubscriptions(params?: Record<string, unknown>) {
  const res = await api.get<PaginatedResult<CustomerSubscriptionRecord>>(
    "/api/subscriptions/subscriptions/",
    { params }
  );
  return res.data;
}

export async function fetchCustomerSubscription(id: number) {
  const res = await api.get<CustomerSubscriptionRecord>(`/api/subscriptions/subscriptions/${id}/`);
  return res.data;
}

export async function createCustomerSubscription(payload: {
  customer: number;
  plan: number;
  started_at?: string;
}) {
  const res = await api.post<CustomerSubscriptionRecord>("/api/subscriptions/subscriptions/", payload);
  return res.data;
}
