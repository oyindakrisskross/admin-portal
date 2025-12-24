// src/screens/settings/access-control/PermCategoryFormPage.tsx

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { PermCategoryForm } from "../../../components/settings/PermCategoryForm";
import { fetchPermissionCategory } from "../../../api/accounts";
import type { PermissionCategory } from "../../../types/accounts";

export default function PermCategoryFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [initial, setInitial] = useState<PermissionCategory | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;
    
    (async () => {
      try {
        const data = await fetchPermissionCategory(Number(id));
        setInitial(data);
      } finally {
        setLoading(false);
      }
    })();
  },[id, isEdit]);

  if (isEdit && loading) {
    return (
      <div className="p-6 text-sm">
        Loading permission category...
      </div>
    );
  }

  return <PermCategoryForm initial={isEdit ? initial : null} />;
};