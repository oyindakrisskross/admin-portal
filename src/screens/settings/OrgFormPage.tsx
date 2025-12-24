// src/screens/settings/OrgFormPage.tsx

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { OrgForm } from "../../components/settings/OrgForm";
import { fetchOrg } from "../../api/core";
import type { Organization } from "../../types/core";

export default function OrgFormPage(){
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [initial, setInitial] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        const data = await fetchOrg(Number(id));
        setInitial(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  if (isEdit && loading) {
    return (
      <div className="p-6 text-sm">
        Loading Organization...
      </div>
    );
  }

  return <OrgForm initial={isEdit ? initial : null} />;
};