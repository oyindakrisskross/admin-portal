// src/components/settings/TaxForm.tsx

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { TaxRule } from "../../types/catalog";
import { createTaxRule, updateTaxRule } from "../../api/catalog";
import ListPageHeader from "../layout/ListPageHeader";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Loader2 } from "lucide-react";

interface Props {
  initial?: TaxRule | null;
}

const EMPTY_TAX_RULE: TaxRule = {
  name: "",
  rate: "",
  compound: false,
};

export const TaxForm: React.FC<Props> = ({ initial }) => {
  const navigate = useNavigate();
  const [taxRule, setTaxRule] = useState<TaxRule>(initial ?? EMPTY_TAX_RULE);
  const [saving, setSaving] = useState(false);

  const handleChange = (patch: Partial<TaxRule>) => {
    setTaxRule((t) => ({ ...t, ...patch }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        name: taxRule.name,
        rate: taxRule.rate,
        compound: taxRule.compound 
      };

      if (taxRule.id) {
        await updateTaxRule(taxRule.id, payload);
      } else {
        await createTaxRule(payload);
      }

      navigate(`/settings/taxes`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ListPageHeader 
        title={initial ? `Edit ${initial?.name}` : "New Tax Rule"}
        right = {
          <button
            onClick={() => navigate("/settings/taxes")}
            className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-kk-muted hover:text-gray-100"
          >
            <XMarkIcon className="h-7 w-7" />
          </button>
        } 
      />

      <div className="flex flex-col gap-6 text-sm px-6 pt-4 pb-8">
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Tax Name</p>
          <input
            type="text"
            className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-3"
            value={taxRule.name}
            onChange={(e) => handleChange({ name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Rate (%)</p>
          <input
            type="number"
            className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-3"
            value={taxRule.rate}
            onChange={(e) => handleChange({ rate: e.target.value })}
          />
        </div>
        <label> 
          <input 
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 mx-2"
            checked={taxRule.compound}
            onChange={(e) => handleChange({ compound: e.target.checked })}
          />
          This tax is a compount tax.
        </label>

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