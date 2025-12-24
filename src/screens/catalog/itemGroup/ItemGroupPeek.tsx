// src/screens/catalog/ItemGroupPeek.tsx

import React from "react";
import { useNavigate } from "react-router-dom";

import type { ItemGroup } from "../../../types/catalog";


interface Props {
  group: ItemGroup;
}

export const ItemGroupPeek: React.FC<Props> = ({ group }) => {
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col gap-7 p-5 pb-7">
      <div className="flex flex-col items-start justify-between gap-3">
        <div>
          <h2 className="text-3xl font-semibold">
            {group.name}
          </h2>
          <p className="text-sm">
            {group.items?.length} Item{group.items?.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="w-1/3 flex flex-col gap-y-2">
        {/* Unit */}
        {group.unit_name && (
          <div className="grid grid-cols-2 gap-2">
            <p className="text-kk-dark-text-muted">Unit</p>
            <p>{group.unit_name}</p>
          </div>
        )}

        {/* Tax Rule */}
        {group.tax_rule_name && (
          <div className="grid grid-cols-2 gap-2">
            <p className="text-kk-dark-text-muted">Tax Rule</p>
            <p>{group.tax_rule_name}</p>
          </div>
        )}

        {/* Attributes */}
        {group.attributes?.length ? (
          <div>
            {group.attributes.map((a) => (
              <div className="grid grid-cols-2 gap-2">
                <p className="text-kk-dark-text-muted">{a.name}</p>
                <div className="flex gap-2 my-1.5">
                  {a.options.map((o) => (
                    <span className="px-1.5 py-0.5 bg-purple-400 rounded-md text-nowrap w-fit">{o.value}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div></div>
        )}
      </div>
      
      {/* Description */}
      {group.description && (
        <div className="flex flex-col gap-0.5">
          <p className="text-kk-dark-text-muted">Description</p>
          {group.description}
        </div>
      )}

      {/* Items */}
      <div className="mb-[100px]">
        <table className="min-w-full min-h-full">
          <thead>
            <tr>
              <th>
                Item Details
              </th>
              <th>
                Cost Price
              </th>
              <th>
                Selling Price
              </th>
              <th>
                Stock On Hand
              </th>
              <th>
                Reorder Point
              </th>
            </tr>
          </thead>
          <tbody>
            {group.items?.map((i) => (
              <tr
                key={i.sku}
                className="cursor-pointer"
                onClick={() => navigate(`/catalog/items/${i.id}`)}
              >
                <td>
                  <div className="flex flex-col">
                    <span>
                      {i.name}
                    </span>
                    <span className="line-clamp-1 text-[11px] text-kk-dark-text-muted">
                      [{i.sku}]
                    </span>
                  </div>
                </td>
                <td>
                  {i.cost ? i.cost : "—"}
                </td>
                <td>
                  {i.price ? i.price : "—"}
                </td>
                <td>
                  {i.stock_on_hand ? i.stock_on_hand : "—"}
                </td>
                <td>
                  {i.reorder_point ? i.reorder_point : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
