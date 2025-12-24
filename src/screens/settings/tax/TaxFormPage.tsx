// src/screens/settings/TaxFormPage.tsx

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { TaxForm } from "../../../components/settings/TaxForm";
import { fetchTaxRule } from "../../../api/catalog";
import type { TaxRule } from "../../../types/catalog";

export default function TaxFormPage(){
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [initial, setInitial] = useState<TaxRule | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        const data = await fetchTaxRule(Number(id));
        setInitial(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  if (isEdit && loading) {
    return (
      <div className="p-6 text-sm">
        Loading tax rule...
      </div>
    );
  }

  return <TaxForm initial={isEdit ? initial : null} />;
};