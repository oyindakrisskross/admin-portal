import React from "react";
import { useNavigate } from "react-router-dom";

import type { ItemGroup } from "../../../types/catalog";

interface Props {
  group: ItemGroup;
}

export const ItemGroupPeek: React.FC<Props> = ({ group }) => {
  const navigate = useNavigate();
  const hasItems = Boolean(group.items?.length);

  return (
    <div className="flex h-full flex-col gap-7 p-5 pb-7">
      <div className="flex flex-col items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold">{group.name}</h2>
          <p className="text-sm">
            {group.items?.length} Item{group.items?.length === 1 ? "" : "s"}
          </p>
          {group.inventory_tracking ? (
            <p className="mt-1 text-xs text-kk-dark-text-muted">
              Group stock on hand: {group.stock_on_hand ?? "0"}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex w-full flex-col gap-y-2 xl:w-1/3">
        {group.unit_name ? (
          <div className="grid grid-cols-2 gap-2">
            <p className="text-kk-dark-text-muted">Unit</p>
            <p>{group.unit_name}</p>
          </div>
        ) : null}

        {group.tax_rule_name ? (
          <div className="grid grid-cols-2 gap-2">
            <p className="text-kk-dark-text-muted">Tax Rule</p>
            <p>{group.tax_rule_name}</p>
          </div>
        ) : null}

        {group.attributes?.length ? (
          <div>
            {group.attributes.map((attribute) => (
              <div key={attribute.id} className="grid grid-cols-2 gap-2">
                <p className="text-kk-dark-text-muted">{attribute.name}</p>
                <div className="my-1.5 flex gap-2">
                  {attribute.options.map((option) => (
                    <span
                      key={option.id}
                      className="w-fit rounded-md bg-purple-400 px-1.5 py-0.5 text-nowrap"
                    >
                      {option.value}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {group.description ? (
        <div className="flex flex-col gap-0.5">
          <p className="text-kk-dark-text-muted">Description</p>
          {group.description}
        </div>
      ) : null}

      <div className="mb-[100px]">
        <table className="min-h-full min-w-full">
          <thead>
            <tr>
              <th>Item Details</th>
              <th>Cost Price</th>
              <th>Selling Price</th>
              <th>Stock On Hand</th>
              <th>Reorder Point</th>
            </tr>
          </thead>
          <tbody>
            {group.items?.map((item, index) => (
              <tr
                key={item.id ?? item.sku ?? index}
                className="cursor-pointer"
                onClick={() => navigate(`/catalog/items/${item.id}`)}
              >
                <td>
                  <div className="flex flex-col">
                    <span>{item.name}</span>
                    <span className="line-clamp-1 text-[11px] text-kk-dark-text-muted">
                      [{item.sku}]
                    </span>
                  </div>
                </td>
                <td>{item.cost ?? "-"}</td>
                <td>{item.price ?? "-"}</td>
                <td>{item.inventory_tracking ? (item.stock_on_hand ?? "0") : "-"}</td>
                <td>{item.reorder_point ?? "-"}</td>
              </tr>
            ))}
            {!hasItems ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-kk-dark-text-muted">
                  No items have been generated for this group yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};
