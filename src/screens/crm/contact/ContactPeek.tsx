// src/screens/crm/contact/ContactPeek.tsx

import React, { useEffect, useState } from "react";
import { type Contact, type ContactAddress } from "../../../types/contact";
import { fetchContact } from "../../../api/contact";

interface Props {
  contactId: number;
}

export const ContactPeek: React.FC<Props> = ({ contactId }) => {
  const [contact, setContact] = useState<Contact | null>(null);
  const [shipping, setShipping] = useState<ContactAddress | null>(null);
  const [billing, setBilling] = useState<ContactAddress | null>(null);

  useEffect(() => {
    (async () => {
      const data = await fetchContact(contactId);
      setContact(data);
    })();
  },[contactId]);

  useEffect(() => {
    if (!contact) return;

    const shippingAddr = contact.other_addresses?.find((a) => a.address_lines?.type_id === "SHIPPING") ?? null;
    const billingAddr = contact.other_addresses?.find((a) => a.address_lines?.type_id === "BILLING") ?? null;

    setShipping(shippingAddr);
    setBilling(billingAddr);
  },[contact]);

  return (
    <div className="flex h-full flex-col gap-7 p-5 pb-7">
      <div className="flex flex-col items-start gap-10">
        <div>
          <h2 className="text-3xl font-semibold">
            {contact?.first_name} {contact?.last_name}
          </h2>
          <p>{contact?.email}</p>
          <p className="mb-4">{contact?.phone_1_code_code}{contact?.phone_1}</p>
          <span 
            className="px-1.5 py-1 bg-purple-400 rounded-md text-nowrap w-fit text-kk-dark-bg-elevated"
          >
            {contact?.contact_type}
          </span>
        </div>
        <table className="min-w-full">
          <thead>
            <tr>
              <th>Shipping</th>
              <th>Billing</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              {shipping && (
                <td>
                  <div>
                    {shipping?.address_lines?.address_attn} <br/>
                    {shipping?.address_lines?.address_line_1} <br/>
                    {shipping?.address_lines?.address_line_2} <br/>
                    {shipping?.address_lines?.city}, {shipping?.address_lines?.state_name} <br/>
                    {shipping?.address_lines?.country}, {shipping?.address_lines?.postal_code} <br/>
                    Phone: {shipping.address_lines?.phone_code_code}{shipping.address_lines?.phone}
                  </div>
                </td>
              )}
              {!shipping && (
                <td colSpan={1}>
                  No Shipping Address
                </td>
              )}

              {billing && (
                <td>
                  {billing?.address_lines?.address_attn} <br/>
                  {billing?.address_lines?.address_line_1} <br/>
                  {billing?.address_lines?.address_line_2} <br/>
                  {billing?.address_lines?.city}, {billing?.address_lines?.state_name} <br/>
                  {billing?.address_lines?.country}, {billing?.address_lines?.postal_code} <br/>
                  Phone: {billing.address_lines?.phone_code_code}{billing.address_lines?.phone}
                </td>
              )}
              {!billing && (
                <td colSpan={1}>
                  No Billing Address
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};