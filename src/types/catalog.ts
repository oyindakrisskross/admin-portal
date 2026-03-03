// src/types/catalog.ts
// Basic catalog domain types, aligned with Django API

export type ItemType = "GOOD" | "SERVICE";
export const TYPE_CHOICES: {value: ItemType; label: string}[] = [
  {value: "GOOD", label: "Good"},
  {value: "SERVICE", label: "Service"},
];

export type ItemStatus = "ACTIVE" | "INACTIVE";

export type ItemVisibility = "VISIBLE" | "HIDDEN";

export interface Unit {
  id?: number;
  name: string;
  symbol: string;
}

export interface TaxRule {
  id?: number;
  name: string;
  rate: string;
  compound: boolean;
}

export interface Attribute {
  id: number;
  name: string;
  options: AttributeOption[];
}

export interface AttributeOption {
  id?: number;
  value: string;
  code: string;
}

export interface ItemGroupAttribute {
  id?: number;
  attribute_id?: number;
  name: string;
  options: AttributeOption[];
}

export type SkuShowMode = "FIRST" | "LAST" | "ALL";
export type SkuCase = "UPPER" | "LOWER" | "TITLE" | "AS_IS";

export interface SkuPatternRow {
  id?: string;
  source: "item_group_name" | "attribute" | "custom_text";
  attribute_id?: number | null;
  show: {
    mode: SkuShowMode;
    length?: number | null;
  };
  case: SkuCase;
  separator: string;
  text?: string; // for custom_text source
  attribute_name?: string;  // new group mapping
}

export interface SkuPattern {
  rows: SkuPatternRow[];
}

export type WeekDay = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";
export const DAY_OPTIONS: { value: WeekDay; label: string }[] = [
  { value: "MON", label: "Monday"},
  { value: "TUE", label: "Tuesday"},
  { value: "WED", label: "Wednesday"},
  { value: "THU", label: "Thursday"},
  { value: "FRI", label: "Friday"},
  { value: "SAT", label: "Saturday"},
  { value: "SUN", label: "Sunday"},
]; 
export interface ItemSchedule {
  id?: number;
  item?: number;
  weekday: WeekDay;
  all_day: boolean;
  time_from?: string | null;
  time_to?: string | null;
}

export type PricingType = "INCLUDED" | "EXTRA" | "DISCOUNT";
export const PRICING_OPTS: {value: PricingType; label: string}[] = [
  { value: "INCLUDED", label: "Add-On: Price Included"},
  { value: "EXTRA", label: "Add-On: Extra"},
  { value: "DISCOUNT", label: "Removable"},
];
export interface ItemCustomization {
  id?: number;
  parent?: number;
  child?: number;
  label?: string;
  pricing_type?: PricingType;
  price_delta?: string;
  min_qty?: string;
  max_qty?: string;
  step_qty?: string;
  sort_order?: string;
}

export interface Category {
  id?: number;
  name: string;
  description?: string;
  parent_id?: number | null;
  parent_name?: string;
}

export interface ItemCategory {
  id?: number;
  item: number;
  item_name?: string;
  category: number;
  category_name?: string;
}

export type TrxReason = "SALE" | "ADJUSTMENT" | "REFUND" | "RESTOCK" | "OPENING_STOCK" | "TRANSFER";
export const TRX_OPTS: {value: TrxReason; label: string}[] = [
  { value: "SALE", label: "Sale"},
  { value: "ADJUSTMENT", label: "Inventory Adjustment"},
  { value: "REFUND", label: "Refund"},
  { value: "RESTOCK", label: "Re-stock"},
  { value: "OPENING_STOCK", label: "Opening Stock"},
  { value: "TRANSFER", label: "Transfer"},
];
export interface InventoryTransaction {
  id: number;
  item: number;
  item_name: string;
  location: number;
  location_name: string;
  qty_change: string;
  reason: TrxReason;
  reference?: string;
  created_by: number;
  created_on: string;
}

export interface Inventory {
  id: number;
  item: number;
  item_name: string;
  location: number;
  location_name: string;
  stock_qty: string;
  reorder_point: string;
  wasted: string;
  last_update: string;
}

export interface InventoryInput {
  location_id?: number;
  opening_qty?: string,
  adjust_qty?: string;
  wasted_qty?: string;
  reorder_point?: string;
  reason: TrxReason;
  reference?: string;
}

export interface ReorderPointInput {
  location_id: number;
  reorder_point: string;
}

export type InventoryTransferStatus = "DRAFT" | "PENDING" | "TRANSFERRED";

export interface InventoryTransferLine {
  id?: number;
  item: number;
  item_name?: string;
  item_sku?: string;
  quantity: string;
}

export interface InventoryTransfer {
  id?: number;
  number?: string;
  request_date: string;
  created_on?: string;
  created_by?: number;
  created_by_email?: string;
  description?: string;
  status?: InventoryTransferStatus;

  source_location: number;
  source_location_name?: string;
  destination_location: number;
  destination_location_name?: string;

  initiated_on?: string | null;
  initiated_by?: number | null;
  initiated_by_email?: string | null;

  transferred_on?: string | null;
  transferred_by?: number | null;
  transferred_by_email?: string | null;

  total_quantity?: string;
  lines?: InventoryTransferLine[];
  lines_input?: InventoryTransferLine[];
}

export interface ItemAvailability {
  id?: number;
  item?: number;
  item_name?: string;
  location: number;
  location_name?: string;
  is_visible_online?: boolean;
  is_sellable_online?: boolean;
}


export interface ItemGroup {
  id?: number;
  name: string;
  description?: string;
  type_id: ItemType;
  returnable: boolean;
  unit?: number;
  unit_name?: string;
  tax_rule?: number;
  tax_rule_name?: string;
  status?: ItemStatus;
  inventory_tracking: boolean;
  sellable: boolean;
  purchasable: boolean; 
  is_visible_online?: boolean;
  availability_location_ids?: number[];
  image?: string | null;
  gallery?: { id: number; image: string; is_primary: boolean }[];
  categories?: Category[];
  category_ids_input?: number[];

  attributes: ItemGroupAttribute[];
  items?: Item[] | null;
  sku_pattern?: SkuPattern | null;
  reorder_points_input?: ReorderPointInput[];

  created_on?: string;
  created_by_name?: string;
  updated_on?: string;
  updated_by_name?: string;

  // aggregate info for list view
  stock_on_hand?: string;
  min_price?: string;
  max_price?: string;
}

export interface Item {
  id?: number;
  sku?: string;
  name: string;
  description?: string;
  type_id: ItemType;
  sellable: boolean;
  purchasable: boolean;
  is_visible_online?: boolean;
  returnable: boolean;
  unit?: number;
  unit_name?: string;
  sale_tax?: number;
  sale_tax_name?: string;
  price?: string;
  cost?: string;
  status?: ItemStatus;
  visibility?: ItemVisibility;
  group?: number;
  group_name?: string;

  scheduled: boolean;
  schedules?: ItemSchedule[];

  customized: boolean;
  customizations?: ItemCustomization[];

  availabilities?: ItemAvailability[];
  
  inventory_tracking: boolean;
  inventory_input?: InventoryInput[];
  stock_on_hand?: string;
  reorder_point?: string;

  weight?: string;
  width?: string;
  height?: string;
  length?: string;

  primary_image?: string | null;
  gallery?: { id: number; image: string; is_primary: boolean }[];

  categories?: ItemCategory[];

  created_on?: string;
  created_by_name?: string;
  updated_on?: string;
  updated_by_name?: string;
}

