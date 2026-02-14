// src/screen/catalog/item/ItemInvAdjust.tsx

import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { type Location } from "../../../types/location";
import { type Inventory, type InventoryInput, type Item, TRX_OPTS, type TrxReason } from "../../../types/catalog";
import { fetchLocations } from "../../../api/location";
import { fetchInventory, patchItem } from "../../../api/catalog";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Loader2 } from "lucide-react";

type Props =  {
  itemId: number;
  itemName?: string;
};

export const ItemInvAdjust: React.FC = () => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const { id } = useParams<{ id: string }>();
  const { state } = useLocation();
  const { itemId: stateItemId, itemName: stateItemName } = (state || {}) as Props;

  // fallback to URL param if needed
  const itemId = stateItemId ?? (id ? Number(id) : undefined);
  const itemName = stateItemName ?? ""; 

  const [locations, setLocations] = useState<Location[]>([]);
  const [prevLocation, setPrevLocation] = useState<number | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [invInput, setInvInput] = useState<InventoryInput | null>(null);
  const [newQty, setNewQty] = useState<number | null>(null);
  const [curInventory, setCurInventory] = useState<Inventory | null>(null);
  const [adjustDate, setAdjustDate] = useState(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });

  useEffect(() => {
    (async () => {
      const data = await fetchLocations();
      setLocations(data.results);
    })();
  }, []);

  useEffect(() => {
    if(prevLocation !== invInput?.location_id && invInput) {
      (async () => {
        const data = await fetchInventory({
          "item_id": itemId,
          "location_id": invInput.location_id
        });
        if (!data.results.length) {
          setCurInventory({ stock_qty: "0.00" } as Inventory);
        } else {
          setCurInventory(data.results[0]);
        }

        setPrevLocation(invInput.location_id!);
      })();
    }
  }, [invInput, itemId, prevLocation, curInventory]);

  useEffect(() => {
    const availableQty = +(curInventory?.stock_qty ?? "0");
    const adjustQty = +(invInput?.adjust_qty ?? "0");

    setNewQty(availableQty + adjustQty);

  }, [curInventory, invInput]);

  const handleChange = (patch: Partial<InventoryInput>) => {
    setInvInput((i) => ({ ...(i ?? {} as InventoryInput), ...patch }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        inventory_input: [invInput],
      };

      await patchItem(itemId, payload);
      navigate(`/catalog/items/${itemId}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPageHeader
        icon = {<span className="text-lg">🛒</span>}
        section = "Catalog"
        title = {`Adjust Stock - ${itemName}`}
        right = {
          <button
            onClick={() => navigate("/catalog/items")}
            className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-kk-muted hover:text-gray-100"
          >
            <XMarkIcon className="h-7 w-7" />
          </button>
        } 
      />

      <div className="flex flex-col gap-6 text-sm px-6 pt-10 pb-8">
        <div className="grid grid-cols-12 gap-3 items-center">
          <p className="col-span-2">Date</p>
          <input 
            type="date"
            value={adjustDate}
            onChange={(e) => setAdjustDate(e.target.value)}
            className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-4"
          />
        </div>
        <div className="grid grid-cols-12 gap-3 items-center">
          <p className="col-span-2">Location</p>
          <select
            className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 col-span-4"
            defaultValue=""
            onChange={(e) => handleChange({ location_id: +e.target.value })}
          >
            <option key={0} value="">Select a Location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <p className="col-span-2">Quantity Available</p>
          <input 
            type="number"
            value={curInventory?.stock_qty ?? ""}
            className="disabled:bg-kk-dark-bg-elevated rounded-md border border-kk-dark-input-border px-3 py-2 col-span-4"
            disabled
          />
        </div>
        <div className="grid grid-cols-12 gap-3">
          <p className="col-span-2">New Quantity on hand</p>
          <input 
            type="number"
            value={newQty ?? ""}
            className="disabled:bg-kk-dark-bg-elevated rounded-md border border-kk-dark-input-border px-3 py-2 col-span-4"
            disabled
          />
        </div>
        <div className="grid grid-cols-12 gap-3">
          <p className="col-span-2">Quantity Adjusted</p>
          <input 
            type="number"
            value={invInput?.adjust_qty}
            className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-4"
            placeholder="Eg. +10, ,-10"
            onChange={(e) => handleChange({  adjust_qty: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-12 gap-3 items-center">
          <p className="col-span-2">Reason</p>
          <select
            className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 col-span-4"
            defaultValue=""
            onChange={(e) => handleChange({ reason: e.target.value as TrxReason })}
          >
            <option key={0} value="">Select a Reason</option>
            {TRX_OPTS.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-12 gap-3">
          <p className="col-span-2">Description</p>
          <textarea 
            value={invInput?.reference}
            maxLength={100}
            className="min-h-[100px] rounded-md border border-kk-dark-input-border px-3 py-2 col-span-4"
            onChange={(e) => handleChange({ reference: e.target.value })}
          />
        </div>
        {/* Footer buttons */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="danger rounded-full border border-red-600 px-4 py-1.5 text-xs font-medium text-red-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            onClick={handleSave}
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Convert to Adjusted
          </button>
        </div>
      </div>
    </>
  );
};
