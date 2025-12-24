// src/screens/crm/contact/ContactFormPage.tsx

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchContact } from "../../../api/contact";
import type { Contact } from "../../../types/contact";
import { ContactForm } from "../../../components/crm/ContactForm";

export default function ContactFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [initial, setInitial] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        const data= await fetchContact(Number(id));
        setInitial(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  if (isEdit && loading) {
    return (
      <div className="p-6 text-sm">
        Loading item group…
      </div>
    );
  }

  return <ContactForm initial={isEdit ? initial : null} />;
};