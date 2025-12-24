// src/components/settings/OrgForm.tsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import type { Organization } from "../../types/core";
import { createOrg, updateOrg } from "../../api/core";
import ListPageHeader from "../layout/ListPageHeader";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Loader2 } from "lucide-react";
import { fetchCountries } from "../../api/contact";
import { type Country } from "../../types/contact";

interface Props {
  initial?: Organization | null;
}

const EMPTY_ORG: Organization = {
  name: "",
  location: undefined,
  website_url: "",
  base_currency: undefined,
  fiscal_year: undefined,
  fiscal_start_date: "1",
  date_format: undefined,
};

export const OrgForm: React.FC<Props> = ({ initial }) => {
  const navigate = useNavigate();
  const [org, setOrg] = useState<Organization>(initial ?? EMPTY_ORG);
  const [saving, setSaving] = useState(false);
  const [country, setCountry] = useState<number | null>(org.location ?? null);
  const [countries, setCountries] = useState<Country[]>([]);

  const handleChange = (patch: Partial<Organization>) => {
    setOrg((t) => ({ ...t, ...patch }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        ...org,
        location: country,
      };

      if (org.id) {
        await updateOrg(org.id, payload);
      } else {
        await createOrg(payload);
      }

      navigate("/settings/organization/1");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    (async () => {
      const data = await fetchCountries();
      setCountries(data.results);
    })();
  }, [])

  return (
    <>
      <ListPageHeader 
        title={`${ initial ? initial.name : "Organization"} Profile`}
        right = {
          <button
            onClick={() => navigate("/settings")}
            className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-kk-muted hover:text-gray-100"
          >
            <XMarkIcon className="h-7 w-7" />
          </button>
        } 
      />

      <div className="flex flex-col gap-6 text-sm px-6 pt-4 pb-8">
        <div className="grid grid-cols-12 gap-2 items-center">
          <p className="col-span-2">Organization Name</p>
          <input
            type="text"
            className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-5"
            value={org.name}
            onChange={(e) => handleChange({ name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-12 gap-2 items-center">
          <p className="col-span-2">Organization Location</p>
          <select
            className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 col-span-5"
            value={country!}
            onChange={(e) => setCountry( Number(e.target.value) )}
          >
            <option key={0} value={undefined}>Select a Location</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-12 gap-2 items-center">
          <p className="col-span-2">Organization Website</p>
          <input
            type="url"
            className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-5"
            value={org.website_url}
            onChange={(e) => handleChange({ website_url: e.target.value })}
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