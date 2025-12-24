// src/components/location/LocationForm.tsx

import React, {useEffect, useState, useRef} from "react";
import { useNavigate } from "react-router-dom";

import { LOC_TYPE_CHOICES, type Location, type LocationType } from "../../types/location";
import { 
  type Country, 
  type State,
  type AddressBook,
} from "../../types/contact";
import { 
  fetchLocations, 
  createLocation,
  updateLocation
} from "../../api/location";

import { 
  XMarkIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";
import ListPageHeader from "../layout/ListPageHeader";
import { createAddressBook, fetchCountries, fetchStates, updateAddressBook } from "../../api/contact";
import { Loader2 } from "lucide-react";

interface Props {
  initial?: Location | null;
}

const INITIAL_TYPE: LocationType = "BUSINESS";

const EMPTY_LOC: Location = {
  name: "",
  type_id: INITIAL_TYPE,
  website_url: "",
  address_lines: {
    type_id: "LOCATION",
  },
}

export const LocationForm: React.FC<Props> = ({ initial }) => {
  const navigate = useNavigate();

  const [location, setLocation] = useState<Location>(initial ?? EMPTY_LOC);
  const [parent, setParent] = useState<boolean>(initial?.parent ? true : false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedType, setSelectedType] = useState<LocationType>(initial?.type_id ?? INITIAL_TYPE);

  const [country, setCountry] = useState<string | null>(initial?.address_lines?.country ?? null);
  const [countries, setCountries] = useState<Country[]>([]);

  const [states, setStates] = useState<State[]>([]);

  const [address, setAddress] = useState<AddressBook>(initial?.address_lines ?? {type_id: "LOCATION"})
  const initialAddressRef = useRef<AddressBook>(null);

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await fetchCountries();
      setCountries(data.results);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const data = await fetchStates(
        { 
          filters: {
            clauses: [
              {
                field: "country",
                operator: "=",
                value: country,
              }
            ]
          } 
        });
      setStates(data.results);
  })();
}, [country]);

  useEffect(() => {
    if (initial) {
      // setLocation(initial);

      // Get snapshot of initial address
      if (initial?.address && address) {
        initialAddressRef.current = address;
      } else {
        initialAddressRef.current = null;
      }
    }
  }, [initial, address])

  const handleChange = (patch: Partial<Location>) => {
    setLocation((l) => ({ ...l, ...patch }));
  };

  const handleTypeChange = (event) => {
    setSelectedType(event.target.value);
  };

  const handleParentChange = (event) => {
    setParent(event.target.checked);

    if (!event.target.checked) {
      handleChange({ parent: null });
    }

    if (event.target.checked) {
      (async () => {
        const data = await fetchLocations();
        setLocations(data.results);
      })();
    }
  }

  const handleAddrChange = (patch: Partial<AddressBook>) => {
    setAddress((a) => ({ ...a, ...patch }));
  };

  const handleCountryChange = (event) => {
    const country = event.target.value; 

    handleAddrChange({ country: country, state: "" });
    setCountry(country);

    (async () => {
      const data = await fetchStates(
        { 
          filters: {
            clauses: [
              {
                field: "country",
                operator: "=",
                value: country,
              }
            ]
          } 
        });
      setStates(data.results);
    })();
  };

  const syncAddress = async () => {
    setSaving(true);
    try {
      const payload: any = address;

      const saved = address.id
        ? await updateAddressBook(address.id, payload)
        : await createAddressBook(payload);

      setAddress(saved);

      await handleSave(saved.id);
    } finally { 
      setSaving(false);
    }
  };

  const handleSave = async (addrId: number) => {
    setSaving(true);
    try {
      const payload: any = {
        ...location,
        type_id: selectedType,
        address: addrId,
      }

      let saved: Location;
      if (location.id) {
        saved = await updateLocation(location.id, payload);
      } else {
        saved = await createLocation(payload);
      }

      navigate(`/settings/locations/${saved.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ListPageHeader 
        icon = {<span className="text-lg">🏬</span>}
        section = "Business"
        title = {initial ? `Edit ${initial?.name}` : "New Item"}
        right = {
          <button
            onClick={() => navigate("/settings/locations")}
            className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-kk-muted hover:text-gray-100"
          >
            <XMarkIcon className="h-7 w-7" />
          </button>
        } 
      />

      <div className="flex flex-col gap-6 text-sm px-6 pt-8 pb-8">
        {/* Location Type */}
        <section>
          Location Type
          <div className="flex gap-4 my-3">
            {LOC_TYPE_CHOICES.map((locType, idx) => (
              <span 
                key={idx}
                className="border border-kk-dark-input-border rounded-md p-2 w-1/4"
              >
                <label
                  className="flex items-start gap-2"
                >
                  <input 
                    className="mt-1"
                    type="radio"
                    name={locType.label}
                    value={locType.value}
                    checked={selectedType === locType.value}
                    onChange={handleTypeChange}
                  />
                  <span
                    className="flex flex-col items-start"
                  >
                    <b>{locType.label} Location</b>
                    <p>{locType.info}</p>
                  </span>
                </label>
              </span>
            ))}
          </div>
        </section>

        {/* Name + Parent Selection */}
        <section className="flex flex-col gap-3">
          <div className="grid grid-cols-12 gap-2">
            <p className="col-span-2">
              Name
            </p>
            <div className="col-span-4">
              <input 
                type="text"
                className="w-full rounded-md border border-kk-dark-input-border px-3 py-2"
                value={location.name}
                onChange={(e) => handleChange({ name: e.target.value })}
              />
              <label>
                <input 
                  type="checkbox"
                  className="h-3 w-3 rounded border-slate-300 mx-2 mt-3"
                  checked={parent}
                  onChange={handleParentChange}
                />
                This is a Child Location
              </label>
            </div>
          </div>

          { parent && (
            <div className="grid grid-cols-12 gap-2">
              <p className="col-span-2">
                Parent Location
              </p>
              <select
                className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 col-span-4"
                value={location.parent ? location.parent : undefined}
                onChange={(e) => handleChange({ parent: e.target.value })}
              >
                <option value="" disabled selected> Select Location </option>
                {locations.map((loc) => (
                  <>
                    { loc.id !== location.id && (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    )}
                  </>
                ))}
              </select>
            </div>
          )}
        </section>

        {/* Website */}
        <section>
          <div className="grid grid-cols-12 gap-2">
            <p className="col-span-2">
              Webiste URL
            </p>
            <input 
              placeholder="Website URL"
              className="col-span-4 rounded-md border border-kk-dark-input-border px-3 py-2"
              type="url"
              value={location.website_url}
              onChange={(e) => handleChange({ website_url: e.target.value })}
            />
          </div>
        </section>

        {/* Address */}
        <section>
          <div className="grid grid-cols-12 gap-2">
            <p className="col-span-2">
              Address
            </p>
            <div className="col-span-4">
              <div className="flex flex-col gap-3">
                <input 
                  className="w-full rounded-md border border-kk-dark-input-border px-3 py-2"
                  placeholder="Attention"
                  type="text"
                  value={address?.address_attn}
                  onChange={(e) => handleAddrChange({ address_attn: e.target.value })}
                />
                <input 
                  className="w-full rounded-md border border-kk-dark-input-border px-3 py-2"
                  placeholder="Street 1"
                  type="text"
                  value={address?.address_line_1}
                  onChange={(e) => handleAddrChange({ address_line_1: e.target.value })}
                />
                <input 
                  className="w-full rounded-md border border-kk-dark-input-border px-3 py-2"
                  placeholder="Street 2"
                  type="text"
                  value={address?.address_line_2}
                  onChange={(e) => handleAddrChange({ address_line_2: e.target.value })}
                />
                <span className="flex gap-2">
                  <input 
                    className="w-1/2 rounded-md border border-kk-dark-input-border px-3 py-2"
                    placeholder="City"
                    type="text"
                    value={address?.city}
                    onChange={(e) => handleAddrChange({ city: e.target.value })}
                  />
                  <input 
                    className="w-1/2 rounded-md border border-kk-dark-input-border px-3 py-2"
                    placeholder="Postal Code"
                    type="text"
                    value={address?.postal_code}
                    onChange={(e) => handleAddrChange({ postal_code: e.target.value })}
                  />
                </span>
                <select
                  className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 w-full"
                  value={address?.country?.toString()}
                  onChange={handleCountryChange}
                  defaultValue=""
                >
                  <option value="" disabled> Select a Country </option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <span className="flex gap-2">
                  <select
                    className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 w-1/2"
                    value={address?.state?.toString()}
                    onChange={(e) => handleAddrChange({ state: e.target.value })}
                    defaultValue=""
                  >
                    <option value="" disabled> Select a State </option>
                    {states.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <input 
                    className="w-1/2 rounded-md border border-kk-dark-input-border px-3 py-2"
                    placeholder="Phone"
                    type="text"
                    value={address?.phone_1}
                    onChange={(e) => handleAddrChange({ phone_1: e.target.value })}
                  />
                </span>
              </div>
            </div>
          </div>
        </section>

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
            onClick={syncAddress}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save Item Group
          </button>
        </div>
      </div>
    </>
  )
}