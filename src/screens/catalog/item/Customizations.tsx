import React, { useEffect, useMemo, useState } from "react";
import { fetchItem } from "../../../api/catalog";
import type { Item, ItemCustomization } from "../../../types/catalog";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";

interface Props {
  itemId: number;
}

const PRICE = new Intl.NumberFormat("en-US", {
  style: "decimal",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

function labelForPricingType(v?: string) {
  if (v === "INCLUDED") return "Included";
  if (v === "EXTRA") return "Extra";
  if (v === "DISCOUNT") return "Discount";
  return v ?? "—";
}

export const Customizations: React.FC<Props> = ({ itemId }) => {
  const [item, setItem] = useState<Item | null>(null);
  const [sort, setSort] = useState<SortState<"label" | "item" | "pricing" | "delta" | "min" | "max" | "step"> | null>(null);

  useEffect(() => {
    (async () => {
      const data = await fetchItem(itemId);
      setItem(data);
    })();
  }, [itemId]);

  const customizations = useMemo(() => {
    const list = item?.customizations ?? [];
    const base = [...list].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0));
    return sortBy(base, sort, {
      label: (c) => c.label ?? "",
      item: (c) => (c as any).child_name ?? (c as any).child_sku ?? c.child ?? "",
      pricing: (c) => c.pricing_type ?? "",
      delta: (c) => c.price_delta ?? "",
      min: (c) => c.min_qty ?? "",
      max: (c) => c.max_qty ?? "",
      step: (c) => c.step_qty ?? "",
    });
  }, [item?.customizations, sort]);

  if (!item) {
    return (
      <div className="text-xs text-kk-dark-text-muted">
        Loading customizations…
      </div>
    );
  }

  if (!item.customized) {
    return (
      <div className="text-xs text-kk-dark-text-muted">
        This item has no customizations.
      </div>
    );
  }

  return (
    <div>
      <table className="min-w-full">
        <thead>
          <tr>
            <th
              className="text-left cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "label"))}
            >
              Label{sortIndicator(sort, "label")}
            </th>
            <th
              className="text-left cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "item"))}
            >
              Item{sortIndicator(sort, "item")}
            </th>
            <th
              className="text-left cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "pricing"))}
            >
              Pricing{sortIndicator(sort, "pricing")}
            </th>
            <th
              className="text-left cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "delta"))}
            >
              Delta{sortIndicator(sort, "delta")}
            </th>
            <th
              className="text-left cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "min"))}
            >
              Min{sortIndicator(sort, "min")}
            </th>
            <th
              className="text-left cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "max"))}
            >
              Max{sortIndicator(sort, "max")}
            </th>
            <th
              className="text-left cursor-pointer select-none"
              onClick={() => setSort((s) => nextSort(s, "step"))}
            >
              Step{sortIndicator(sort, "step")}
            </th>
          </tr>
        </thead>
        <tbody>
          {customizations.map((c: ItemCustomization & { child_name?: string; child_sku?: string }) => (
            <tr key={c.id ?? `${c.child ?? ""}-${c.label ?? ""}`}>
              <td>{c.label ?? "—"}</td>
              <td>
                {c.child_name ?? (c.child_sku ? `${c.child_sku}` : null) ?? c.child ?? "—"}
              </td>
              <td>{labelForPricingType(c.pricing_type)}</td>
              <td>
                {c.price_delta != null && c.price_delta !== ""
                  ? `NGN${PRICE.format(Number(c.price_delta))}`
                  : "—"}
              </td>
              <td>{c.min_qty ?? "—"}</td>
              <td>{c.max_qty ?? "—"}</td>
              <td>{c.step_qty ?? "—"}</td>
            </tr>
          ))}

          {!customizations.length && (
            <tr>
              <td
                colSpan={7}
                className="px-3 py-10 text-center text-xs text-kk-dark-text-muted"
              >
                No customizations configured.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
