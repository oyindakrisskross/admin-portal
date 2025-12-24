// src/types/promotions.ts

export type CouponAction = "CART_PERCENT" | "CART_AMOUNT" | "BXGY";

export const ACTION_CHOICES: {value: CouponAction; label: string}[] = [
    {value: "CART_PERCENT", label: "Cart Percent Off"},
    {value: "CART_AMOUNT", label: "Cart Amount Off"},
    {value: "BXGY", label: "Buy X Get Y"}
];

export type BXGYType = "FREE" | "PERCENT" | "AMOUNT";

export const BXGY_CHOICES: {value: BXGYType; label: string}[] = [
    {value: "AMOUNT", label: "Amount Off Y"},
    {value: "PERCENT", label: "Percent Off Y"},
    {value: "FREE", label: "Get Y Free"},
];

export type ConditionType = "CART_MIN_SUBTOTAL" | "IN_CART_ITEMS_MIN_QTY";

export const CDTN_TYPE_CHOICES: {value: ConditionType; label: string}[] = [
    {value: "CART_MIN_SUBTOTAL", label: "Cart Minimum Subtotal"},
    {value: "IN_CART_ITEMS_MIN_QTY", label: "Minimum Quantity of Items in Cart"},
];

export type ConditionMode = "SUM" | "EACH";

export const CDTN_MODE_CHOICES: {value: ConditionMode; label: string}[] = [
    {value: "SUM", label: "Sum"},
    {value: "EACH", label: "Each"},
];

export interface Coupon {
    id?: number;
    name: string;
    code?: string;
    active: boolean;
    auto_apply: boolean;
    description?: string;
    start_at?: string;
    end_at?: string;
    apply_all_locations: boolean;
    locations?: number[];
    min_subtotal?: string;
    min_qty?: string;
    condition_tree?: string;
    action_type: CouponAction;
    action_config?: string;
    priority?: string;
    created_on?: string;
    updated_on?: string;
};

export type WeekDay = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export const DAY_CHOICES: {value: WeekDay; label: string}[] = [
    {value: "MON", label: "Monday"},
    {value: "TUE", label: "Tuesday"},
    {value: "WED", label: "Wednesday"},
    {value: "THU", label: "Thursday"},
    {value: "FRI", label: "Friday"},
    {value: "SAT", label: "Saturday"},
    {value: "SUN", label: "Sunday"},
];

export interface CouponSchedule {
  id?: number;
  coupon?: number;
  weekday: WeekDay;
  all_day: boolean;
  start_time?: string | null;
  end_time?: string | null;
}