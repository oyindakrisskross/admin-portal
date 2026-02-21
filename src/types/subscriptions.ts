export type SubscriptionStatus = "ACTIVE" | "INACTIVE";

export const SUBSCRIPTION_STATUS_CHOICES: { value: SubscriptionStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

export type BillingFrequencyUnit = "DAY" | "WEEK" | "MONTH" | "YEAR";

export const BILLING_FREQUENCY_UNIT_CHOICES: { value: BillingFrequencyUnit; label: string }[] = [
  { value: "DAY", label: "Day(s)" },
  { value: "WEEK", label: "Week(s)" },
  { value: "MONTH", label: "Month(s)" },
  { value: "YEAR", label: "Year(s)" },
];

export type BillingCyclesMode = "AUTO_RENEW" | "FIXED";

export const BILLING_CYCLES_MODE_CHOICES: { value: BillingCyclesMode; label: string }[] = [
  { value: "AUTO_RENEW", label: "Auto-renews until canceled" },
  { value: "FIXED", label: "Expires after a specified no. of billing cycles" },
];

export type PlanPricingModel = "FLAT" | "PER_UNIT";

export const PLAN_PRICING_MODEL_CHOICES: { value: PlanPricingModel; label: string }[] = [
  { value: "FLAT", label: "Flat" },
  { value: "PER_UNIT", label: "Per Unit" },
];

export type SubscriptionType = "GOOD" | "SERVICE";

export const SUBSCRIPTION_TYPE_CHOICES: { value: SubscriptionType; label: string }[] = [
  { value: "GOOD", label: "Goods" },
  { value: "SERVICE", label: "Service" },
];

export interface SubscriptionProduct {
  id?: number;
  name: string;
  description?: string;
  status: SubscriptionStatus;
  plans_count?: number;
  addons_count?: number;
  coupons_count?: number;
  created_on?: string;
  updated_on?: string;
}

export interface SubscriptionPlan {
  id?: number;
  product: number;
  product_name?: string;
  name: string;
  code: string;
  billing_frequency_value: number;
  billing_frequency_unit: BillingFrequencyUnit;
  billing_cycles_mode: BillingCyclesMode;
  billing_cycles?: number | null;
  description?: string;
  pricing_model: PlanPricingModel;
  price: string;
  setup_fee?: string;
  type_id: SubscriptionType;
  sales_tax_rule?: number | null;
  sales_tax_rule_name?: string;
  allow_plan_switch: boolean;
  status: SubscriptionStatus;
  created_on?: string;
  updated_on?: string;
}

export type AddonType = "ONE_TIME" | "RECURRING";

export const ADDON_TYPE_CHOICES: { value: AddonType; label: string }[] = [
  { value: "ONE_TIME", label: "One-time" },
  { value: "RECURRING", label: "Recurring" },
];

export interface SubscriptionAddon {
  id?: number;
  product: number;
  product_name?: string;
  name: string;
  code: string;
  description?: string;
  status: SubscriptionStatus;
  addon_type: AddonType;
  pricing_model: PlanPricingModel;
  price: string;
  created_on?: string;
  updated_on?: string;
}

export type DiscountBy = "PERCENT" | "AMOUNT";

export const DISCOUNT_BY_CHOICES: { value: DiscountBy; label: string }[] = [
  { value: "PERCENT", label: "Percentage" },
  { value: "AMOUNT", label: "Amount" },
];

export type RedemptionType = "ONE_TIME" | "RECURRING";

export const REDEMPTION_TYPE_CHOICES: { value: RedemptionType; label: string }[] = [
  { value: "ONE_TIME", label: "One-time" },
  { value: "RECURRING", label: "Recurring" },
];

export interface SubscriptionCoupon {
  id?: number;
  product: number;
  product_name?: string;
  name: string;
  code: string;
  description?: string;
  status: SubscriptionStatus;
  discount_by: DiscountBy;
  discount_value: string;
  redemption_type: RedemptionType;
  created_on?: string;
  updated_on?: string;
}

export type PlanTransactionStatus = "PAID" | "PENDING" | "FAILED" | "REFUNDED";

export interface SubscriptionPlanTransaction {
  id?: number;
  plan: number;
  plan_name?: string;
  reference: string;
  subscriber_name?: string;
  amount: string;
  currency: string;
  status: PlanTransactionStatus;
  billed_on: string;
  created_on?: string;
}

export const PLAN_TRANSACTION_STATUS_CHOICES: { value: PlanTransactionStatus; label: string }[] = [
  { value: "PAID", label: "Paid" },
  { value: "PENDING", label: "Pending" },
  { value: "FAILED", label: "Failed" },
  { value: "REFUNDED", label: "Refunded" },
];

export function formatBillingFrequency(
  value: number | undefined,
  unit: BillingFrequencyUnit | undefined
) {
  if (!value || !unit) return "-";
  const label = BILLING_FREQUENCY_UNIT_CHOICES.find((x) => x.value === unit)?.label ?? unit;
  return `${value} ${label}`;
}

export function formatPricingModel(model: PlanPricingModel | undefined) {
  return PLAN_PRICING_MODEL_CHOICES.find((x) => x.value === model)?.label ?? model ?? "-";
}
