import { useMemo } from "react";

import type { CouponAction } from "../../types/promotions";
import { ACTION_CHOICES, BXGY_CHOICES, type BXGYType } from "../../types/promotions";
import { SearchMultiSelectDropdown, type SelectOption } from "./SearchMultiSelectDropdown";

export type ActionDraft = {
  action_type: CouponAction;
  cartPercent: { percent: string; cap: string };
  cartAmount: { amount: string };
  itemPercent: { item_ids: number[]; percent: string; cap: string };
  itemAmount: { item_ids: number[]; amount: string };
  categoryPercent: { category_ids: number[]; percent: string; cap: string };
  categoryAmount: { category_ids: number[]; amount: string };
  customized: {
    include_in_conditions: boolean;
    apply_discount: boolean;
    discount_scope: "AUTO" | "PARENT_ONLY" | "BUNDLE";
  };
  bxgy: {
    buy_item_ids: number[];
    get_item_ids: number[];
    buy_qty: number;
    get_qty: number;
    discount_type: BXGYType;
    discount_value: string; // used when discount_type !== "FREE"
    repeat: boolean;
    apply_cheapest: boolean;
  };
};

type Props = {
  value: ActionDraft;
  onChange: (next: ActionDraft) => void;
  itemOptions: SelectOption[];
  categoryOptions: SelectOption[];
  categoryCascade?: { descendantsById: Record<number, number[]> };
};

export function CouponActionEditor({ value, onChange, itemOptions, categoryOptions, categoryCascade }: Props) {
  const selected = value.action_type;

  const itemSummary = useMemo(() => {
    if (selected === "ITEM_PERCENT") {
      const pct = value.itemPercent.percent || "0";
      return value.itemPercent.item_ids.length
        ? `${value.itemPercent.item_ids.length} item(s) at ${pct}% off`
        : "";
    }
    if (selected === "ITEM_AMOUNT") {
      const amt = value.itemAmount.amount || "0";
      return value.itemAmount.item_ids.length
        ? `${value.itemAmount.item_ids.length} item(s) at ${amt} off per unit`
        : "";
    }
    if (selected === "CATEGORY_PERCENT") {
      const pct = value.categoryPercent.percent || "0";
      const n = value.categoryPercent.category_ids.length;
      return n ? `${n} categor${n === 1 ? "y" : "ies"} at ${pct}% off` : "";
    }
    if (selected === "CATEGORY_AMOUNT") {
      const amt = value.categoryAmount.amount || "0";
      const n = value.categoryAmount.category_ids.length;
      return n ? `${n} categor${n === 1 ? "y" : "ies"} at ${amt} off per unit` : "";
    }
    return "";
  }, [selected, value.categoryAmount, value.categoryPercent, value.itemAmount, value.itemPercent]);

  const bxgySummary = useMemo(() => {
    if (selected !== "BXGY") return "";
    const bq = value.bxgy.buy_qty || 0;
    const gq = value.bxgy.get_qty || 0;
    const dt = value.bxgy.discount_type;
    if (!bq || !gq) return "";
    if (dt === "FREE") return `Buy ${bq} get ${gq} free`;
    if (dt === "PERCENT") return `Buy ${bq} get ${gq} (${value.bxgy.discount_value || "0"}% off)`;
    return `Buy ${bq} get ${gq} (${value.bxgy.discount_value || "0"} off)`;
  }, [selected, value.bxgy]);

  return (
    <section className="flex gap-6 py-7">
      <div className="w-2/3 flex flex-col gap-5">
        <div className="text-base font-semibold">Action</div>

        <div className="grid grid-cols-6 gap-2 items-center">
          <p>Action Type</p>
          <select
            className="rounded-md bg-kk-dark-bg border border-kk-dark-input-border px-3 py-2 col-span-3"
            value={selected}
            onChange={(e) =>
              onChange({ ...value, action_type: e.target.value as CouponAction })
            }
          >
            {ACTION_CHOICES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>

        {selected === "CART_PERCENT" && (
          <>
            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Percent Off</p>
              <input
                type="number"
                min={0}
                step={0.01}
                className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-2"
                value={value.cartPercent.percent}
                onChange={(e) =>
                  onChange({
                    ...value,
                    cartPercent: { ...value.cartPercent, percent: e.target.value },
                  })
                }
              />
              <span className="text-xs text-kk-dark-text-muted col-span-2">
                e.g. 10
              </span>
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Max Discount (cap)</p>
              <input
                className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-2"
                placeholder="optional"
                value={value.cartPercent.cap}
                onChange={(e) =>
                  onChange({
                    ...value,
                    cartPercent: { ...value.cartPercent, cap: e.target.value },
                  })
                }
              />
              <span className="text-xs text-kk-dark-text-muted col-span-3">
                Amount in your currency (e.g. 5.00)
              </span>
            </div>
          </>
        )}

        {selected === "CART_AMOUNT" && (
          <div className="grid grid-cols-6 gap-2 items-center">
            <p>Amount Off</p>
            <input
              className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-2"
              placeholder="0.00"
              value={value.cartAmount.amount}
              onChange={(e) =>
                onChange({
                  ...value,
                  cartAmount: { ...value.cartAmount, amount: e.target.value },
                })
              }
            />
            <span className="text-xs text-kk-dark-text-muted col-span-3">
              Amount in your currency (e.g. 5.00)
            </span>
          </div>
        )}

        {selected === "ITEM_PERCENT" && (
          <>
            <div className="text-xs text-kk-dark-text-muted">
              Applies only to selected products if they appear in the cart.
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Select Products</p>
              <div className="col-span-5">
                <SearchMultiSelectDropdown
                  options={itemOptions}
                  selectedIds={value.itemPercent.item_ids}
                  onChange={(ids) =>
                    onChange({
                      ...value,
                      itemPercent: { ...value.itemPercent, item_ids: ids },
                    })
                  }
                  placeholder="Select products..."
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Percent Off</p>
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-2"
                value={value.itemPercent.percent}
                onChange={(e) =>
                  onChange({
                    ...value,
                    itemPercent: { ...value.itemPercent, percent: e.target.value },
                  })
                }
              />
              <span className="text-xs text-kk-dark-text-muted col-span-3">0 - 100</span>
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Max Discount (cap)</p>
              <input
                className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-2"
                placeholder="optional"
                value={value.itemPercent.cap}
                onChange={(e) =>
                  onChange({
                    ...value,
                    itemPercent: { ...value.itemPercent, cap: e.target.value },
                  })
                }
              />
              <span className="text-xs text-kk-dark-text-muted col-span-3">
                Cap applies to total discount for this coupon.
              </span>
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Customized Items</p>
              <div className="col-span-5 flex flex-col gap-2 text-xs text-kk-dark-text-muted">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={value.customized.include_in_conditions}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        customized: { ...value.customized, include_in_conditions: e.target.checked },
                      })
                    }
                  />
                  Include customized items when evaluating conditions (e.g., minimum qty)
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={value.customized.apply_discount}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        customized: { ...value.customized, apply_discount: e.target.checked },
                      })
                    }
                  />
                  Apply discount to customized items
                </label>

                <div className="flex items-center gap-2">
                  <span className="min-w-[7rem]">Discount scope</span>
                  <select
                    className="rounded-md bg-kk-dark-bg border border-kk-dark-input-border px-2 py-1 text-xs"
                    value={value.customized.discount_scope}
                    disabled={!value.customized.apply_discount}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        customized: {
                          ...value.customized,
                          discount_scope: e.target.value as any,
                        },
                      })
                    }
                  >
                    <option value="AUTO">Auto (recommended)</option>
                    <option value="PARENT_ONLY">Parent only (ignore add-ons)</option>
                    <option value="BUNDLE">Bundle (include add-ons)</option>
                  </select>
                </div>
              </div>
            </div>

            {itemSummary && (
              <div className="mt-1 rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated px-3 py-2 text-xs">
                <span className="text-kk-dark-text-muted mr-2">Action Summary</span>
                <span className="text-kk-dark-text font-medium">{itemSummary}</span>
              </div>
            )}
          </>
        )}

        {selected === "ITEM_AMOUNT" && (
          <>
            <div className="text-xs text-kk-dark-text-muted">
              Applies only to selected products if they appear in the cart.
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Select Products</p>
              <div className="col-span-5">
                <SearchMultiSelectDropdown
                  options={itemOptions}
                  selectedIds={value.itemAmount.item_ids}
                  onChange={(ids) =>
                    onChange({
                      ...value,
                      itemAmount: { ...value.itemAmount, item_ids: ids },
                    })
                  }
                  placeholder="Select products..."
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Amount Off (per unit)</p>
              <input
                className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-2"
                placeholder="0.00"
                value={value.itemAmount.amount}
                onChange={(e) =>
                  onChange({
                    ...value,
                    itemAmount: { ...value.itemAmount, amount: e.target.value },
                  })
                }
              />
              <span className="text-xs text-kk-dark-text-muted col-span-3">
                Amount in your currency per unit.
              </span>
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Customized Items</p>
              <div className="col-span-5 flex flex-col gap-2 text-xs text-kk-dark-text-muted">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={value.customized.include_in_conditions}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        customized: { ...value.customized, include_in_conditions: e.target.checked },
                      })
                    }
                  />
                  Include customized items when evaluating conditions (e.g., minimum qty)
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={value.customized.apply_discount}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        customized: { ...value.customized, apply_discount: e.target.checked },
                      })
                    }
                  />
                  Apply discount to customized items
                </label>

                <div className="flex items-center gap-2">
                  <span className="min-w-[7rem]">Discount scope</span>
                  <select
                    className="rounded-md bg-kk-dark-bg border border-kk-dark-input-border px-2 py-1 text-xs"
                    value={value.customized.discount_scope}
                    disabled={!value.customized.apply_discount}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        customized: {
                          ...value.customized,
                          discount_scope: e.target.value as any,
                        },
                      })
                    }
                  >
                    <option value="AUTO">Auto (recommended)</option>
                    <option value="PARENT_ONLY">Parent only (ignore add-ons)</option>
                    <option value="BUNDLE">Bundle (include add-ons)</option>
                  </select>
                </div>
              </div>
            </div>

            {itemSummary && (
              <div className="mt-1 rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated px-3 py-2 text-xs">
                <span className="text-kk-dark-text-muted mr-2">Action Summary</span>
                <span className="text-kk-dark-text font-medium">{itemSummary}</span>
              </div>
            )}
          </>
        )}

        {selected === "CATEGORY_PERCENT" && (
          <>
            <div className="text-xs text-kk-dark-text-muted">
              Applies only to products in the selected categories if they appear in the cart.
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Select Categories</p>
              <div className="col-span-5">
                <SearchMultiSelectDropdown
                  options={categoryOptions}
                  cascade={categoryCascade}
                  selectedIds={value.categoryPercent.category_ids}
                  onChange={(ids) =>
                    onChange({
                      ...value,
                      categoryPercent: { ...value.categoryPercent, category_ids: ids },
                    })
                  }
                  placeholder="Select categories..."
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Percent Off</p>
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-2"
                value={value.categoryPercent.percent}
                onChange={(e) =>
                  onChange({
                    ...value,
                    categoryPercent: { ...value.categoryPercent, percent: e.target.value },
                  })
                }
              />
              <span className="text-xs text-kk-dark-text-muted col-span-3">0 - 100</span>
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Max Discount (cap)</p>
              <input
                className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-2"
                placeholder="optional"
                value={value.categoryPercent.cap}
                onChange={(e) =>
                  onChange({
                    ...value,
                    categoryPercent: { ...value.categoryPercent, cap: e.target.value },
                  })
                }
              />
              <span className="text-xs text-kk-dark-text-muted col-span-3">
                Cap applies to total discount for this coupon.
              </span>
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Customized Items</p>
              <div className="col-span-5 flex flex-col gap-2 text-xs text-kk-dark-text-muted">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={value.customized.include_in_conditions}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        customized: { ...value.customized, include_in_conditions: e.target.checked },
                      })
                    }
                  />
                  Include customized items when evaluating conditions (e.g., minimum qty)
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={value.customized.apply_discount}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        customized: { ...value.customized, apply_discount: e.target.checked },
                      })
                    }
                  />
                  Apply discount to customized items
                </label>

                <div className="flex items-center gap-2">
                  <span className="min-w-[7rem]">Discount scope</span>
                  <select
                    className="rounded-md bg-kk-dark-bg border border-kk-dark-input-border px-2 py-1 text-xs"
                    value={value.customized.discount_scope}
                    disabled={!value.customized.apply_discount}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        customized: {
                          ...value.customized,
                          discount_scope: e.target.value as any,
                        },
                      })
                    }
                  >
                    <option value="AUTO">Auto (recommended)</option>
                    <option value="PARENT_ONLY">Parent only (ignore add-ons)</option>
                    <option value="BUNDLE">Bundle (include add-ons)</option>
                  </select>
                </div>
              </div>
            </div>

            {itemSummary && (
              <div className="mt-1 rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated px-3 py-2 text-xs">
                <span className="text-kk-dark-text-muted mr-2">Action Summary</span>
                <span className="text-kk-dark-text font-medium">{itemSummary}</span>
              </div>
            )}
          </>
        )}

        {selected === "CATEGORY_AMOUNT" && (
          <>
            <div className="text-xs text-kk-dark-text-muted">
              Applies only to products in the selected categories if they appear in the cart.
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Select Categories</p>
              <div className="col-span-5">
                <SearchMultiSelectDropdown
                  options={categoryOptions}
                  cascade={categoryCascade}
                  selectedIds={value.categoryAmount.category_ids}
                  onChange={(ids) =>
                    onChange({
                      ...value,
                      categoryAmount: { ...value.categoryAmount, category_ids: ids },
                    })
                  }
                  placeholder="Select categories..."
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Amount Off (per unit)</p>
              <input
                className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-2"
                placeholder="0.00"
                value={value.categoryAmount.amount}
                onChange={(e) =>
                  onChange({
                    ...value,
                    categoryAmount: { ...value.categoryAmount, amount: e.target.value },
                  })
                }
              />
              <span className="text-xs text-kk-dark-text-muted col-span-3">
                Amount in your currency per unit.
              </span>
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Customized Items</p>
              <div className="col-span-5 flex flex-col gap-2 text-xs text-kk-dark-text-muted">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={value.customized.include_in_conditions}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        customized: { ...value.customized, include_in_conditions: e.target.checked },
                      })
                    }
                  />
                  Include customized items when evaluating conditions (e.g., minimum qty)
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={value.customized.apply_discount}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        customized: { ...value.customized, apply_discount: e.target.checked },
                      })
                    }
                  />
                  Apply discount to customized items
                </label>

                <div className="flex items-center gap-2">
                  <span className="min-w-[7rem]">Discount scope</span>
                  <select
                    className="rounded-md bg-kk-dark-bg border border-kk-dark-input-border px-2 py-1 text-xs"
                    value={value.customized.discount_scope}
                    disabled={!value.customized.apply_discount}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        customized: {
                          ...value.customized,
                          discount_scope: e.target.value as any,
                        },
                      })
                    }
                  >
                    <option value="AUTO">Auto (recommended)</option>
                    <option value="PARENT_ONLY">Parent only (ignore add-ons)</option>
                    <option value="BUNDLE">Bundle (include add-ons)</option>
                  </select>
                </div>
              </div>
            </div>

            {itemSummary && (
              <div className="mt-1 rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated px-3 py-2 text-xs">
                <span className="text-kk-dark-text-muted mr-2">Action Summary</span>
                <span className="text-kk-dark-text font-medium">{itemSummary}</span>
              </div>
            )}
          </>
        )}

        {selected === "BXGY" && (
          <>
            <div className="text-xs text-kk-dark-text-muted">
              Buy X items get Y items free or discounted.
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Products to Buy</p>
              <div className="col-span-5">
                <SearchMultiSelectDropdown
                  options={itemOptions}
                  selectedIds={value.bxgy.buy_item_ids}
                  onChange={(ids) =>
                    onChange({ ...value, bxgy: { ...value.bxgy, buy_item_ids: ids } })
                  }
                  placeholder="Select products..."
                />
              </div>
            </div>

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Products to Get (Free/Discounted)</p>
              <div className="col-span-5">
                <SearchMultiSelectDropdown
                  options={itemOptions}
                  selectedIds={value.bxgy.get_item_ids}
                  onChange={(ids) =>
                    onChange({ ...value, bxgy: { ...value.bxgy, get_item_ids: ids } })
                  }
                  placeholder="Select products..."
                />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-4">
                <div className="text-xs font-medium mb-1">Buy Quantity</div>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-md border border-kk-dark-input-border px-3 py-2"
                  value={value.bxgy.buy_qty}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      bxgy: { ...value.bxgy, buy_qty: Number(e.target.value || 1) },
                    })
                  }
                />
              </div>

              <div className="col-span-4">
                <div className="text-xs font-medium mb-1">Get Quantity</div>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-md border border-kk-dark-input-border px-3 py-2"
                  value={value.bxgy.get_qty}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      bxgy: { ...value.bxgy, get_qty: Number(e.target.value || 1) },
                    })
                  }
                />
              </div>

              <div className="col-span-4">
                <div className="text-xs font-medium mb-1">Discount Type</div>
                <select
                  className="w-full rounded-md bg-kk-dark-bg border border-kk-dark-input-border px-3 py-2"
                  value={value.bxgy.discount_type}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      bxgy: { ...value.bxgy, discount_type: e.target.value as BXGYType },
                    })
                  }
                >
                  {BXGY_CHOICES.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {value.bxgy.discount_type !== "FREE" && (
              <div className="grid grid-cols-6 gap-2 items-center">
                <p>
                  {value.bxgy.discount_type === "PERCENT" ? "Percent Off" : "Fixed Amount Off"}
                </p>
                <input
                  className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-2"
                  placeholder={value.bxgy.discount_type === "PERCENT" ? "e.g. 10" : "e.g. 5.00"}
                  value={value.bxgy.discount_value}
                  onChange={(e) =>
                    onChange({
                      ...value,
                      bxgy: { ...value.bxgy, discount_value: e.target.value },
                    })
                  }
                />
                <span className="col-span-3 text-xs text-kk-dark-text-muted">
                  {value.bxgy.discount_type === "PERCENT" ? "0 - 100" : "Currency amount per unit"}
                </span>
              </div>
            )}

            <div className="grid grid-cols-6 gap-2 items-center">
              <p>Options</p>
              <div className="col-span-5 flex items-center gap-5 text-xs text-kk-dark-text-muted">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={value.bxgy.repeat}
                    onChange={(e) =>
                      onChange({ ...value, bxgy: { ...value.bxgy, repeat: e.target.checked } })
                    }
                  />
                  Repeat
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300"
                    checked={value.bxgy.apply_cheapest}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        bxgy: { ...value.bxgy, apply_cheapest: e.target.checked },
                      })
                    }
                  />
                  Apply cheapest eligible items
                </label>
              </div>
            </div>

            {bxgySummary && (
              <div className="mt-1 rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated px-3 py-2 text-xs">
                <span className="text-kk-dark-text-muted mr-2">Action Summary</span>
                <span className="text-kk-dark-text font-medium">{bxgySummary}</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="w-1/3" />
    </section>
  );
}
