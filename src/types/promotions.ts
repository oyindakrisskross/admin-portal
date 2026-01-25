// src/types/promotions.ts

export type CouponAction =
    | "CART_PERCENT"
    | "CART_AMOUNT"
    | "ITEM_PERCENT"
    | "ITEM_AMOUNT"
    | "BXGY";

export const ACTION_CHOICES: {value: CouponAction; label: string}[] = [
    {value: "CART_PERCENT", label: "Cart Percent Off"},
    {value: "CART_AMOUNT", label: "Cart Amount Off"},
    {value: "ITEM_PERCENT", label: "Item Percent Off"},
    {value: "ITEM_AMOUNT", label: "Item Amount Off"},
    {value: "BXGY", label: "Buy X Get Y"}
];

export type BXGYType = "FREE" | "PERCENT" | "AMOUNT";

export const BXGY_CHOICES: {value: BXGYType; label: string}[] = [
    {value: "AMOUNT", label: "Amount Off Y"},
    {value: "PERCENT", label: "Percent Off Y"},
    {value: "FREE", label: "Get Y Free"},
];

export type ConditionType =
    | "CART_MIN_SUBTOTAL"
    | "CART_MAX_SUBTOTAL"
    | "CART_MIN_QTY"
    | "IN_CART_ITEMS_MIN_QTY"
    | "IN_CART_GROUPS_MIN_QTY";

export const CDTN_TYPE_CHOICES: {value: ConditionType; label: string}[] = [
    {value: "CART_MIN_SUBTOTAL", label: "Cart Minimum Subtotal"},
    {value: "CART_MAX_SUBTOTAL", label: "Cart Maximum Subtotal"},
    {value: "CART_MIN_QTY", label: "Cart Minimum Quantity"},
    {value: "IN_CART_ITEMS_MIN_QTY", label: "Minimum Quantity of Items in Cart"},
    {value: "IN_CART_GROUPS_MIN_QTY", label: "Minimum Quantity of Groups in Cart"},
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
    excluded_items?: number[];
    min_subtotal?: string;
    min_qty?: number;
    condition_tree?: any;
    action_type: CouponAction;
    action_config?: any;
    priority?: number;
    created_on?: string;
    updated_on?: string;
    schedules?: CouponSchedule[];
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
