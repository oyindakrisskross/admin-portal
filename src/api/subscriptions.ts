import api from "./client";
import type {
  CustomerSubscriptionRecord,
  SubscriptionAddon,
  SubscriptionCoupon,
  SubscriptionCouponSchedule,
  SubscriptionPlan,
  SubscriptionPlanTransaction,
  SubscriptionProduct,
} from "../types/subscriptions";
import type { FilterSet } from "../types/filters";

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

export async function fetchSubscriptionCouponSchedules(couponId: number) {
  const res = await api.get<PaginatedResult<SubscriptionCouponSchedule>>(
    "/api/subscriptions/coupon-schedules/",
    { params: { coupon: couponId } }
  );
  return res.data;
}

export async function createSubscriptionCouponSchedule(payload: SubscriptionCouponSchedule) {
  const res = await api.post<SubscriptionCouponSchedule>("/api/subscriptions/coupon-schedules/", payload);
  return res.data;
}

export async function updateSubscriptionCouponSchedule(
  id: number,
  patch: Partial<SubscriptionCouponSchedule>
) {
  const res = await api.patch<SubscriptionCouponSchedule>(`/api/subscriptions/coupon-schedules/${id}/`, patch);
  return res.data;
}

export async function deleteSubscriptionCouponSchedule(id: number) {
  await api.delete(`/api/subscriptions/coupon-schedules/${id}/`);
}

export async function fetchSubscriptionPlanTransactions(params?: Record<string, unknown>) {
  const res = await api.get<PaginatedResult<SubscriptionPlanTransaction>>(
    "/api/subscriptions/plan-transactions/",
    { params }
  );
  return res.data;
}

export async function fetchCustomerSubscriptions(
  params?: (Record<string, unknown> & { filters?: FilterSet })
) {
  const search = new URLSearchParams();

  if (params) {
    const { filters, ...rest } = params;
    for (const [k, v] of Object.entries(rest)) {
      if (v === undefined || v === null || v === "") continue;
      search.set(k, String(v));
    }

    if (filters) {
      filters.clauses.forEach((clause) => {
        let encodedValue: string;
        if (Array.isArray(clause.value)) {
          encodedValue = clause.value.join(",");
        } else if (typeof clause.value === "object") {
          encodedValue = JSON.stringify(clause.value);
        } else {
          encodedValue = clause.value ?? "";
        }
        search.append("filter", `${clause.field}|${clause.operator}|${encodedValue}`);
      });
    }
  }

  const res = await api.get<PaginatedResult<CustomerSubscriptionRecord>>(
    `/api/subscriptions/subscriptions/${search.toString() ? `?${search}` : ""}`
  );
  return res.data;
}

export async function fetchCustomerSubscription(id: number) {
  const res = await api.get<CustomerSubscriptionRecord>(`/api/subscriptions/subscriptions/${id}/`);
  return res.data;
}

export interface SubscriptionPassQRResponse {
  subscription_id: number;
  subscription_status: string;
  plan_id: number;
  plan_name: string;
  customer_id: number;
  qr_kind: "SUBSCRIPTION_PASS";
  qr_value: string;
  pass_code: string;
}

export async function generateSubscriptionPassQR(subscriptionId: number) {
  const res = await api.post<SubscriptionPassQRResponse>(
    `/api/subscriptions/subscriptions/${subscriptionId}/qr-pass/`
  );
  return res.data;
}

export async function createCustomerSubscription(payload: {
  customer: number;
  plan: number;
  started_at?: string;
  payment_made?: boolean;
  amount_paid?: string;
  payment_method?: "CASH" | "CARD" | "TRANSFER" | "OTHER";
  payment_reference?: string;
}) {
  const res = await api.post<CustomerSubscriptionRecord>("/api/subscriptions/subscriptions/", payload);
  return res.data;
}
