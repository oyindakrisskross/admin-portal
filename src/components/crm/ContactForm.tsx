// src/components/crm/ContactForm.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  type Contact, 
  type ContactType, 
  type AddressBook, 
  CONTACT_TYPE_CHOICES, 
  type Country,
  type State,
} from "../../types/contact";
import { 
  updateAddressBook, 
  createAddressBook, 
  createContact, 
  updateContact, 
  fetchCountries,
  fetchStates,
  createContactAddr
} from "../../api/contact";
import { XMarkIcon } from "@heroicons/react/24/outline";
import ListPageHeader from "../layout/ListPageHeader";
import { Loader2 } from "lucide-react";

interface Props {
  initial?: Contact | null;
}

const INITIAL_TYPE: ContactType = "BUSINESS";

const EMPTY_CONTACT: Contact = {
  last_name: "",
  email: "",
  contact_type: INITIAL_TYPE,
};

export const ContactForm: React.FC<Props> = ({ initial }) => {
  const navigate = useNavigate();

  const [contact, setContact] = useState<Contact>(initial ?? EMPTY_CONTACT);
  const [selectedType, setSelectedType] = useState<ContactType>(initial?.contact_type ?? INITIAL_TYPE);

  const [shipping, setShipping] = useState<AddressBook | null>(
    initial?.other_addresses
      ?.find((a) => a.address_lines?.type_id === "SHIPPING")
      ?.address_lines ?? {type_id: "SHIPPING"}
  )

  const [billing, setBilling] = useState<AddressBook | null>(
    initial?.other_addresses
      ?.find((a) => a.address_lines?.type_id === "BILLING")
      ?.address_lines ?? {type_id: "BILLING"}
  )

  const [shipCountry, setShipCountry] = useState<string | null>(shipping?.country ?? "0");
  const [shipCountries, setShipCountries] = useState<Country[]>([]);
  const [shipStates, setShipStates] = useState<State[]>([]);

  const [billCountry, setBillCountry] = useState<string | null>(billing?.country ?? "0");
  const [billCountries, setBillCountries] = useState<Country[]>([]);
  const [billStates, setBillStates] = useState<State[]>([]);

  const [saving, setSaving] = useState(false);


  const handleTypeChange = (event) => {
    setSelectedType(event.target.value);
  };

  const handleChange = (patch: Partial<Contact>) => {
    setContact((c) => ({ ...c, ...patch }));
  };

  const handleShippingChange = (patch: Partial<AddressBook>) => {
    setShipping((s) => ({ ...(s ?? {} as any), ...patch }));
  };

  const handleBillingChange = (patch: Partial<AddressBook>) => {
    setBilling((s) => ({ ...(s ?? {} as any), ...patch }));
  };

  const handleShipCountryChange = (event) => {

    const c = event.target.value;

    handleShippingChange({ country: c, state: "" });
    setShipCountry(shipCountry);

    (async () => {
      const data = await fetchStates(
        {
          filters: {
            clauses: [
              {
                field: "country",
                operator: "=",
                value: c,
              }
            ]
          }
        }
      );
      setShipStates(data.results);
    })();
  };

  const handleBillCountryChange = (event) => {

    const c = event.target.value;
    
    handleBillingChange({ country: c, state: "" });
    setBillCountry(billCountry);

    (async () => {
      const data = await fetchStates(
        {
          filters: {
            clauses: [
              {
                field: "country",
                operator: "=",
                value: c,
              }
            ]
          }
        }
      );
      setBillStates(data.results);
    })();
  };

  const syncShipAddress = async (contactId: number) => {
    try {
      const payload: any = shipping;

      let saved: AddressBook;
      if (shipping?.id) {
        await updateAddressBook(shipping.id, payload);
      } else {
        saved = await createAddressBook(payload);
        if (saved.id) {
          await createContactAddr({ contact:contactId, address:saved.id })
        }
      }
    } finally {
      setSaving(true);
    }
  };

  const syncBillAddress = async (contactId: number) => {
    try {
      const payload: any = billing;

      let saved: AddressBook;
      if (billing?.id) {
        await updateAddressBook(billing.id, payload);
      } else {
        saved = await createAddressBook(payload);
        if (saved.id) {
          await createContactAddr({ contact:contactId, address:saved.id })
        }
      }
    } finally {
      setSaving(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        ...contact,
        contact_type: selectedType,
      };
      let saved: Contact;

      if (contact.id) {
        saved = await updateContact(contact.id, payload);
      } else {
        saved = await createContact(payload);
      }

      await syncShipAddress(saved.id!);
      await syncBillAddress(saved.id!);

      navigate(`/crm/contacts/${saved.id}`)
    } finally {
      setSaving(false);
    }
  };


  useEffect(() => {
    (async () => {
      const data = await fetchCountries();
      setShipCountries(data.results);
      setBillCountries(data.results);
    })();
  },[]);

  useEffect(() => {
      (async () => {
        const data = await fetchStates(
          { 
            filters: {
              clauses: [
                {
                  field: "country",
                  operator: "=",
                  value: shipCountry,
                }
              ]
            } 
          });
        setShipStates(data.results);
    })();
  }, [shipCountry]);

  useEffect(() => {
      (async () => {
        const data = await fetchStates(
          { 
            filters: {
              clauses: [
                {
                  field: "country",
                  operator: "=",
                  value: billCountry,
                }
              ]
            } 
          });
        setBillStates(data.results);
    })();
  }, [billCountry]);

  return (
    <>
      <ListPageHeader 
        section="CRM"
        title={initial ? `Edit ${initial.first_name} ${initial.last_name}` : "New Contact"}
        right = {
          <button
            onClick={() => navigate("/crm/contacts")}
            className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-kk-muted hover:text-gray-100"
          >
            <XMarkIcon className="h-7 w-7" />
          </button>
        } 
      />

      <div className="flex flex-col gap-6 text-sm px-6 pt-8 pb-8">
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Contact Type</p>
          <div className="col-span-5 flex gap-3">
            {CONTACT_TYPE_CHOICES.map((type, idx) => (
              <label className="mr-4">
                <input 
                  key={idx}
                  type="radio"
                  name={type.label}
                  value={type.value}
                  checked={selectedType === type.value}
                  onChange={handleTypeChange}
                  className="mr-2"
                /> {type.label}
              </label>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Primary Contact</p>
          <div className="col-span-5 flex gap-3">
            <input 
              type="text"
              className="w-1/2 rounded-md border border-kk-dark-input-border px-3 py-2"
              value={contact.first_name}
              placeholder="First Name"
              onChange={(e) => handleChange({ first_name: e.target.value })}
            />
            <input 
              type="text"
              className="w-1/2 rounded-md border border-kk-dark-input-border px-3 py-2"
              value={contact.last_name}
              placeholder="Last Name"
              onChange={(e) => handleChange({ last_name: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Company Name</p>
          <input 
            type="text"
            className="col-span-5 rounded-md border border-kk-dark-input-border px-3 py-2"
            value={contact.company_name}
            onChange={(e) => handleChange({ company_name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Email Address</p>
          <input
            type="email"
            className="col-span-5 rounded-md border border-kk-dark-input-border px-3 py-2"
            value={contact.email}
            onChange={(e) => handleChange({ email: e.target.value })}
          />
        </div>
        
        {/* Addresses */}
        <div className="grid grid-cols-12 gap-4 mt-7">

          {/* Billing */}
          <div className="col-span-6 flex flex-col gap-3">
            <p className="w-full text-lg">Billing Address</p>
            <div className="flex">
              <p className="w-1/4">Attention</p>
              <input 
                type="text"
                className="w-2/4 rounded-md border border-kk-dark-input-border px-3 py-2"
                value={billing?.address_attn}
                onChange={(e) => handleBillingChange({ address_attn: e.target.value })}
              />
            </div>
            <div className="flex">
              <p className="w-1/4">Country</p>
              <select
                className="w-2/4 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 col-span-4"
                value={billing?.country ? billing.country : "0"}
                onChange={handleBillCountryChange}
              >
                <option key={0} value="0" disabled>Select a Country</option>
                {billCountries.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex">
              <p className="w-1/4">Address</p>
              <textarea 
                className="min-h-[60px] w-2/4 rounded-md border border-kk-dark-input-border px-3 py-2"
                value={billing?.address_line_1}
                placeholder="Street 1"
                onChange={(e) => handleBillingChange({ address_line_1: e.target.value })}
              />
            </div>
            <div className="flex">
              <p className="w-1/4"></p>
              <textarea 
                className="min-h-[60px] w-2/4 rounded-md border border-kk-dark-input-border px-3 py-2"
                value={billing?.address_line_2}
                placeholder="Street 2"
                onChange={(e) => handleBillingChange({ address_line_2: e.target.value })}
              />
            </div>
            <div className="flex">
              <p className="w-1/4">City</p>
              <input 
                type="text"
                className="w-2/4 rounded-md border border-kk-dark-input-border px-3 py-2"
                value={billing?.city}
                onChange={(e) => handleBillingChange({ city: e.target.value })}
              />
            </div>
            <div className="flex">
              <p className="w-1/4">State</p>
              <select
                className="w-2/4 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 col-span-4"
                value={billing?.state ? billing.state : "0"}
                onChange={(e) => handleBillingChange({ state: e.target.value })}
              >
                <option key={0} value="0" disabled>Select a State</option>
                {billStates.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex">
              <p className="w-1/4">Postal Code</p>
              <input 
                type="text"
                className="w-2/4 rounded-md border border-kk-dark-input-border px-3 py-2"
                value={billing?.postal_code}
                onChange={(e) => handleBillingChange({ postal_code: e.target.value })}
              />
            </div>
            <div className="flex">
              <p className="w-1/4">Phone</p>
              <input 
                type="number"
                className="w-2/4 rounded-md border border-kk-dark-input-border px-3 py-2"
                value={billing?.phone}
                onChange={(e) => handleBillingChange({ phone: e.target.value })}
              />
            </div>
          </div>

          {/* Shipping */}
          <div className="col-span-6 flex flex-col gap-3">
            <p className="w-full text-lg">Shipping Address</p>
            <div className="flex">
              <p className="w-1/4">Attention</p>
              <input 
                type="text"
                className="w-2/4 rounded-md border border-kk-dark-input-border px-3 py-2"
                value={shipping?.address_attn}
                onChange={(e) => handleShippingChange({ address_attn: e.target.value })}
              />
            </div>
            <div className="flex">
              <p className="w-1/4">Country</p>
              <select
                className="w-2/4 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 col-span-4"
                value={shipping?.country?.toString()}
                defaultValue=""
                onChange={handleShipCountryChange}
              >
                <option key={0} value="0" disabled>Select a Country</option>
                {shipCountries.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex">
              <p className="w-1/4">Address</p>
              <textarea 
                className="min-h-[60px] w-2/4 rounded-md border border-kk-dark-input-border px-3 py-2"
                value={shipping?.address_line_1}
                placeholder="Street 1"
                onChange={(e) => handleShippingChange({ address_line_1: e.target.value })}
              />
            </div>
            <div className="flex">
              <p className="w-1/4"></p>
              <textarea 
                className="min-h-[60px] w-2/4 rounded-md border border-kk-dark-input-border px-3 py-2"
                value={shipping?.address_line_2}
                placeholder="Street 2"
                onChange={(e) => handleShippingChange({ address_line_2: e.target.value })}
              />
            </div>
            <div className="flex">
              <p className="w-1/4">City</p>
              <input 
                type="text"
                className="w-2/4 rounded-md border border-kk-dark-input-border px-3 py-2"
                value={shipping?.city}
                onChange={(e) => handleShippingChange({ city: e.target.value })}
              />
            </div>
            <div className="flex">
              <p className="w-1/4">State</p>
              <select
                className="w-2/4 rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 col-span-4"
                value={shipping?.state ? shipping.state : ""}
                onChange={(e) => handleShippingChange({ state: e.target.value })}
              >
                <option key={0} value="" disabled>Select a State</option>
                {shipStates.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="flex">
              <p className="w-1/4">Postal Code</p>
              <input 
                type="text"
                className="w-2/4 rounded-md border border-kk-dark-input-border px-3 py-2"
                value={shipping?.postal_code}
                onChange={(e) => handleShippingChange({ postal_code: e.target.value })}
              />
            </div>
            <div className="flex">
              <p className="w-1/4">Phone</p>
              <input 
                type="number"
                className="w-2/4 rounded-md border border-kk-dark-input-border px-3 py-2"
                value={shipping?.phone}
                onChange={(e) => handleShippingChange({ phone: e.target.value })}
              />
            </div>
          </div>
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
            Save Item
          </button>
        </div>
      </div>
    </>
  );
};