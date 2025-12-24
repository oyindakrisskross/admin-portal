// src/screens/catalog/itemGroup/ItemGroupFormPage.tsx

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { ItemGroupForm } from "../../../components/catalog/ItemGroupForm";
import { fetchItemGroup } from "../../../api/catalog";
import type { ItemGroup } from "../../../types/catalog";

export default function ItemGroupFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [initial, setInitial] = useState<ItemGroup | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        const data = await fetchItemGroup(Number(id));
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

  return <ItemGroupForm initial={isEdit ? initial : null} />;
}
