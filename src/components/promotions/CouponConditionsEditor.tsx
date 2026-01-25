import { Plus, Trash2 } from "lucide-react";

import type { ConditionMode, ConditionType } from "../../types/promotions";
import {
  CDTN_MODE_CHOICES,
  CDTN_TYPE_CHOICES,
} from "../../types/promotions";
import { SearchMultiSelectDropdown, type SelectOption } from "./SearchMultiSelectDropdown";

export type ConditionOp = "AND" | "OR";

export type ConditionDraft = {
  key: string;
  type: ConditionType;
  value?: string;
  min_qty?: number;
  mode?: ConditionMode;
  item_ids?: number[];
  group_ids?: number[];
};

type Props = {
  op: ConditionOp;
  conditions: ConditionDraft[];
  itemOptions: SelectOption[];
  groupOptions: SelectOption[];
  onChange: (next: { op: ConditionOp; conditions: ConditionDraft[] }) => void;
};

const newCondition = (): ConditionDraft => ({
  key: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  type: "CART_MIN_SUBTOTAL",
  value: "",
});

export function CouponConditionsEditor({
  op,
  conditions,
  itemOptions,
  groupOptions,
  onChange,
}: Props) {
  const patch = (key: string, patch: Partial<ConditionDraft>) => {
    onChange({
      op,
      conditions: conditions.map((c) => (c.key === key ? { ...c, ...patch } : c)),
    });
  };

  const remove = (key: string) => {
    onChange({ op, conditions: conditions.filter((c) => c.key !== key) });
  };

  const add = () => {
    onChange({ op, conditions: [...conditions, newCondition()] });
  };

  return (
    <section className="flex gap-6 py-7">
      <div className="w-2/3 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold">Conditions</div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-kk-dark-text-muted">Combine with</span>
            <select
              className="rounded-md bg-kk-dark-bg border border-kk-dark-input-border px-2 py-1 text-xs"
              value={op}
              onChange={(e) => onChange({ op: e.target.value as ConditionOp, conditions })}
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-kk-dark-border">
          <table className="min-w-full">
            <thead className="bg-kk-dark-bg-elevated">
              <tr>
                <th className="text-left px-3 py-2 text-xs">Type</th>
                <th className="text-left px-3 py-2 text-xs">Details</th>
                <th className="px-3 py-2 text-xs" />
              </tr>
            </thead>
            <tbody>
              {conditions.map((c) => (
                <tr key={c.key} className="border-t border-kk-dark-border">
                  <td className="px-3 py-2 align-top">
                    <select
                      className="rounded-md bg-kk-dark-bg border border-kk-dark-input-border px-2 py-1 text-xs w-full"
                      value={c.type}
                      onChange={(e) => {
                        const nextType = e.target.value as ConditionType;
                        patch(c.key, {
                          type: nextType,
                          value:
                            nextType === "IN_CART_ITEMS_MIN_QTY" ||
                            nextType === "IN_CART_GROUPS_MIN_QTY"
                              ? undefined
                              : c.value,
                          item_ids: nextType === "IN_CART_ITEMS_MIN_QTY" ? c.item_ids ?? [] : [],
                          group_ids: nextType === "IN_CART_GROUPS_MIN_QTY" ? c.group_ids ?? [] : [],
                          min_qty:
                            nextType === "IN_CART_ITEMS_MIN_QTY" ||
                            nextType === "IN_CART_GROUPS_MIN_QTY"
                              ? c.min_qty ?? 1
                              : undefined,
                          mode:
                            nextType === "IN_CART_ITEMS_MIN_QTY" ||
                            nextType === "IN_CART_GROUPS_MIN_QTY"
                              ? c.mode ?? "SUM"
                              : undefined,
                        });
                      }}
                    >
                      {CDTN_TYPE_CHOICES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="px-3 py-2">
                    {(c.type === "CART_MIN_SUBTOTAL" || c.type === "CART_MAX_SUBTOTAL") && (
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <span className="col-span-3 text-xs text-kk-dark-text-muted">
                          Amount
                        </span>
                        <input
                          className="rounded-md border border-kk-dark-input-border px-2 py-1 col-span-5 text-xs"
                          placeholder="0.00"
                          value={c.value ?? ""}
                          onChange={(e) => patch(c.key, { value: e.target.value })}
                        />
                      </div>
                    )}

                    {c.type === "CART_MIN_QTY" && (
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <span className="col-span-3 text-xs text-kk-dark-text-muted">Qty</span>
                        <input
                          type="number"
                          min={0}
                          className="rounded-md border border-kk-dark-input-border px-2 py-1 col-span-5 text-xs"
                          value={c.value ?? ""}
                          onChange={(e) => patch(c.key, { value: e.target.value })}
                        />
                      </div>
                    )}

                    {(c.type === "IN_CART_ITEMS_MIN_QTY" ||
                      c.type === "IN_CART_GROUPS_MIN_QTY") && (
                      <div className="grid grid-cols-12 gap-2 items-center">
                        <span className="col-span-3 text-xs text-kk-dark-text-muted">
                          {c.type === "IN_CART_ITEMS_MIN_QTY" ? "Items" : "Groups"}
                        </span>
                        <div className="col-span-9">
                          <SearchMultiSelectDropdown
                            options={
                              c.type === "IN_CART_ITEMS_MIN_QTY"
                                ? itemOptions
                                : groupOptions
                            }
                            selectedIds={
                              c.type === "IN_CART_ITEMS_MIN_QTY"
                                ? c.item_ids ?? []
                                : c.group_ids ?? []
                            }
                            onChange={(ids) =>
                              patch(
                                c.key,
                                c.type === "IN_CART_ITEMS_MIN_QTY"
                                  ? { item_ids: ids }
                                  : { group_ids: ids }
                              )
                            }
                            placeholder={`Select ${c.type === "IN_CART_ITEMS_MIN_QTY" ? "items" : "groups"}...`}
                          />
                        </div>

                        <span className="col-span-3 text-xs text-kk-dark-text-muted">
                          Min Qty
                        </span>
                        <input
                          type="number"
                          min={1}
                          className="rounded-md border border-kk-dark-input-border px-2 py-1 col-span-3 text-xs"
                          value={c.min_qty ?? 1}
                          onChange={(e) =>
                            patch(c.key, { min_qty: Number(e.target.value || 1) })
                          }
                        />

                        <span className="col-span-3 text-xs text-kk-dark-text-muted">
                          Mode
                        </span>
                        <select
                          className="rounded-md bg-kk-dark-bg border border-kk-dark-input-border px-2 py-1 col-span-3 text-xs"
                          value={c.mode ?? "SUM"}
                          onChange={(e) => patch(c.key, { mode: e.target.value as ConditionMode })}
                        >
                          {CDTN_MODE_CHOICES.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </td>

                  <td className="px-3 py-2 align-top text-right">
                    <button
                      type="button"
                      onClick={() => remove(c.key)}
                      className="inline-flex items-center justify-center rounded-md p-2 hover:bg-[rgba(255,255,255,0.06)] text-kk-dark-text-muted hover:text-kk-dark-text"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {!conditions.length && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-3 py-6 text-center text-xs text-kk-dark-text-muted"
                  >
                    No conditions. Coupon applies as long as overview eligibility passes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-1 rounded-full border border-kk-dark-border px-3 py-1.5 text-xs text-kk-dark-text hover:bg-[rgba(255,255,255,0.04)]"
          >
            <Plus className="h-3 w-3" />
            Add Condition
          </button>
        </div>
      </div>

      <div className="w-1/3" />
    </section>
  );
}
