// src/screens/settings/UnitFormPage.tsx

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { UnitForm } from "../../../components/settings/UnitForm";
import { fetchUnit } from "../../../api/catalog";
import type { Unit } from "../../../types/catalog";

export default function UnitFormPage(){
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [initial, setInitial] = useState<Unit | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        const data = await fetchUnit(Number(id));
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

  return <UnitForm initial={isEdit ? initial : null} />;
};