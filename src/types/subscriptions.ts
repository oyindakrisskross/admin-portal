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

export type SubscriptionPlanRedeemInterval = "NONE" | "DAY" | "WEEK" | "MONTH";

export const SUBSCRIPTION_PLAN_REDEEM_INTERVAL_CHOICES: {
  value: SubscriptionPlanRedeemInterval;
  label: string;
}[] = [
  { value: "NONE", label: "No interval limit" },
  { value: "DAY", label: "Per day" },
  { value: "WEEK", label: "Per week" },
  { value: "MONTH", label: "Per month" },
];

export type SubscriptionPlanWeekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export const SUBSCRIPTION_PLAN_WEEKDAY_CHOICES: {
  value: SubscriptionPlanWeekday;
  label: string;
}[] = [
  { value: "MON", label: "Monday" },
  { value: "TUE", label: "Tuesday" },
  { value: "WED", label: "Wednesday" },
  { value: "THU", label: "Thursday" },
  { value: "FRI", label: "Friday" },
  { value: "SAT", label: "Saturday" },
  { value: "SUN", label: "Sunday" },
];

export interface SubscriptionPlanRedeemableItemSchedule {
  id?: number;
  weekday: SubscriptionPlanWeekday;
  all_day: boolean;
  start_time?: string | null;
  end_time?: string | null;
}

export interface SubscriptionPlanRedeemableItem {
  id?: number;
  item: number;
  item_name?: string;
  item_sku?: string | null;
  max_redemptions: number;
  interval_unit: SubscriptionPlanRedeemInterval;
  interval_value: number;
  schedules?: SubscriptionPlanRedeemableItemSchedule[];
  created_on?: string;
  updated_on?: string;
}

export type SubscriptionPlanRedeemableItemInput = {
  item: number;
  max_redemptions: number;
  interval_unit: SubscriptionPlanRedeemInterval;
  interval_value: number;
  schedules?: Array<{
    weekday: SubscriptionPlanWeekday;
    all_day: boolean;
    start_time?: string | null;
    end_time?: string | null;
  }>;
};

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
  sales_tax_rate?: string | null;
  allow_plan_switch: boolean;
  plan_type: PlanType;
  included_uses?: number | null;
  redeemable_items?: SubscriptionPlanRedeemableItem[];
  redeemable_items_input?: SubscriptionPlanRedeemableItemInput[];
  coupons?: SubscriptionCoupon[];
  coupon_ids?: number[];
  status: SubscriptionStatus;
  created_on?: string;
  updated_on?: string;
}

export type PlanType = "CYCLE" | "USAGE";

export const PLAN_TYPE_CHOICES: { value: PlanType; label: string }[] = [
  { value: "CYCLE", label: "Cycle-based" },
  { value: "USAGE", label: "Usage-based (Bundle Card)" },
];

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

export type SubscriptionCouponAction =
  | "CART_PERCENT"
  | "CART_AMOUNT"
  | "ITEM_PERCENT"
  | "ITEM_AMOUNT"
  | "CATEGORY_PERCENT"
  | "CATEGORY_AMOUNT"
  | "BXGY"
  | "REDEEM_FREE_ITEMS";

export interface SubscriptionCouponSchedule {
  id?: number;
  coupon?: number;
  weekday: SubscriptionPlanWeekday;
  all_day: boolean;
  start_time?: string | null;
  end_time?: string | null;
}

export interface SubscriptionCoupon {
  id?: number;
  product: number;
  product_name?: string;
  promotion_coupon_id?: number | null;
  name: string;
  code?: string | null;
  description?: string;
  status: SubscriptionStatus;
  active: boolean;
  auto_apply: boolean;
  available_online: boolean;
  auto_apply_online: boolean;
  allow_combine?: boolean;
  max_uses?: number;
  use_count?: number;
  start_at?: string | null;
  end_at?: string | null;
  apply_all_locations: boolean;
  locations?: number[];
  excluded_items?: number[];
  excluded_categories?: number[];
  excluded_groups?: number[];
  min_subtotal?: string;
  min_qty?: number;
  condition_tree?: any;
  action_type: SubscriptionCouponAction;
  action_config?: any;
  priority?: number;
  schedules?: SubscriptionCouponSchedule[];
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

export type CustomerSubscriptionStatus = "ACTIVE" | "EXPIRED" | "DEPLETED" | "CANCELLED";

export interface SubscriptionUsageHistoryEntry {
  id: number;
  visited_at: string;
  entry_method: string;
  location_id: number | null;
  location_name: string | null;
  pos_reference: string;
}

export interface SubscriptionCouponUsageHistoryEntry {
  coupon_code: string;
  coupon_name: string;
  invoice_id: number;
  invoice_number: string;
  invoice_date: string;
  invoice_status: string;
  location_id: number | null;
  location_name: string | null;
  grand_total: string;
}

export interface CustomerSubscriptionRecord {
  id: number;
  customer: number;
  customer_name: string;
  customer_email: string;
  plan: number;
  plan_name: string;
  plan_code: string;
  plan_type: PlanType;
  status: CustomerSubscriptionStatus;
  started_at: string;
  expires_at: string | null;
  total_uses: number | null;
  used_uses: number;
  remaining_uses: number | null;
  source_invoice: number | null;
  source_invoice_number: string | null;
  source_invoice_date?: string | null;
  source_invoice_paid_at?: string | null;
  usage_history?: SubscriptionUsageHistoryEntry[];
  coupon_usage_history?: SubscriptionCouponUsageHistoryEntry[];
  created_on: string;
  updated_on: string;
}

export interface SubscriptionCheckoutResult {
  subscriptions: CustomerSubscriptionRecord[];
  source_invoice: {
    id: number;
    number: string;
  } | null;
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
