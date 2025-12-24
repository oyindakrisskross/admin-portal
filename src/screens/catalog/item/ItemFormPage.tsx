// src/screens/catalog/item/ItemFormPage.tsx

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ItemForm } from "../../../components/catalog/ItemForm";
import { fetchItem } from "../../../api/catalog";
import type { Item } from "../../../types/catalog";

export default function ItemFormPage(){
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [initial, setInitial] = useState<Item | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        const data = await fetchItem(Number(id));
        setInitial(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  if (isEdit && loading) {
    return (
      <div className="p-6 text-sm">
        Loading item...
      </div>
    );
  }
  
  return <ItemForm initial={isEdit ? initial : null} />;
}