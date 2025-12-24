// src/screens/settings/location/LocationFormPage.tsx

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchLocation } from "../../../api/location";
import type { Location } from "../../../types/location";
import { LocationForm } from "../../../components/location/LocationForm";

export default function LocationFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [initial, setInitial] = useState<Location | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        const data = await fetchLocation(Number(id));
        setInitial(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  if (isEdit && loading) {
    return (
      <div className="p-6 text-sm">
        Loading location...
      </div>
    );
  }

  return <LocationForm initial={isEdit ? initial : null} />;
}