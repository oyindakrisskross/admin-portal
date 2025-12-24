// src/screens/catalog/item/Overview.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchItem } from "../../../api/catalog";
import { type Item } from "../../../types/catalog";

interface Props {
  itemId: number;
}

export const Overview: React.FC<Props> = ({ itemId }) => {
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>();

  useEffect(() => {
    (async () => {
      const data = await fetchItem(itemId);
      setItem(data);
    })();
  }, [itemId])

  return (
    <div className="flex h-full flex-col gap-3 pb-7">
      <div className="grid grid-cols-10">
        <p className="text-kk-dark-text-muted col-span-2">Item Type</p>
        <p className="col-span-4">{item?.type_id}</p>
      </div>
      {item?.sku && (
        <div className="grid grid-cols-10">
          <p className="text-kk-dark-text-muted col-span-2">SKU</p>
          <p className="col-span-4">{item?.sku}</p>
        </div>
      )}
      {item?.group && (
        <div className="grid grid-cols-10">
          <p className="text-kk-dark-text-muted col-span-2">Group Name</p>
          <p 
            className="col-span-4 cursor-pointer hover:underline hover:underline-offset-4 hover:decoration-dotted"
            onClick={() => navigate(`/catalog/item-groups/${item.group}`)}
          >
            {item?.group_name}
          </p>
        </div>
      )}
      {item?.unit && (
        <div className="grid grid-cols-10">
          <p className="text-kk-dark-text-muted col-span-2">Unit</p>
          <p className="col-span-4">{item?.unit_name}</p>
        </div>
      )}

      {item?.purchasable ? (
        <div className="mt-5 flex flex-col gap-2">
          <h3 className="text-lg font-bold">Purchase Information</h3>
          <div className="grid grid-cols-10">
            <p className="text-kk-dark-text-muted col-span-2">Cost Price</p>
            <p className="col-span-4">
              NGN{Intl.NumberFormat('en-US', {
                style: 'decimal',
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
              }).format(+item.cost)}
            </p>
          </div>
        </div>
      ) : ""}

      {item?.sellable ? (
        <div className="mt-5 flex flex-col gap-2">
          <h3 className="text-lg font-bold">Sales Information</h3>
          <div className="grid grid-cols-10">
            <p className="text-kk-dark-text-muted col-span-2">Selling Price</p>
            <p className="col-span-4">
              NGN{Intl.NumberFormat('en-US', {
                style: 'decimal',
                maximumFractionDigits: 2,
                minimumFractionDigits: 2,
              }).format(+item.price)}
            </p>
          </div>
          {item?.sale_tax && (
            <div className="grid grid-cols-10">
              <p className="text-kk-dark-text-muted col-span-2">Tax Rule</p>
              <p className="col-span-4">{item?.sale_tax_name}</p>
            </div>
          )}
        </div>
      ) : ""}
      
    </div>
  );
};