// src/screens/catalog/category/CategoryFormPage.tsx

import { useParams } from "react-router-dom";
import type { Category } from "../../../types/catalog";
import { useEffect, useState } from "react";
import { fetchCategory } from "../../../api/catalog";
import { CategoryForm } from "../../../components/catalog/CategoryForm"

export default function CategoryFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [initial, setInitial] = useState<Category | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        const data = await fetchCategory(Number(id));
        setInitial(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  if (isEdit && loading) {
    return (
      <div className="p-6 text-sm">
        Loading unit...
      </div>
    );
  }

  return <CategoryForm initial={isEdit ? initial : null} />;
};