// src/components/settings/taxes/TaxForm.tsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { Unit } from "../../types/catalog";
import { createUnit, updateUnit } from "../../api/catalog";
import ListPageHeader from "../layout/ListPageHeader";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Loader2 } from "lucide-react";

interface Props {
  initial?: Unit | null;
}

const EMPTY_UNIT: Unit = {
  name: "",
  symbol: "",
};

export const UnitForm: React.FC<Props> = ({ initial }) => {
  const navigate = useNavigate();
  const [unit, setUnit] = useState<Unit>(initial ?? EMPTY_UNIT);
  const [saving, setSaving] = useState(false);

  const handleChange = (patch: Partial<Unit>) => {
    setUnit((t) => ({ ...t, ...patch }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        name: unit.name,
        symbol: unit.symbol,
      };

      if (unit.id) {
        await updateUnit(unit.id, payload);
      } else {
        await createUnit(payload);
      }

      navigate(`/settings/units`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPageHeader 
        title={initial ? `Edit ${initial?.name}` : "New Unit of Measurement"}
        right = {
          <button
            onClick={() => navigate("/settings/units")}
            className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-kk-muted hover:text-gray-100"
          >
            <XMarkIcon className="h-7 w-7" />
          </button>
        } 
      />

      <div className="flex flex-col gap-6 text-sm px-6 pt-4 pb-8">
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Name</p>
          <input
            type="text"
            className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-3"
            value={unit.name}
            onChange={(e) => handleChange({ name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Symbol</p>
          <input
            type="text"
            className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-3"
            value={unit.symbol}
            onChange={(e) => handleChange({ symbol: e.target.value })}
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
            onClick={handleSave}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </>
  );
};