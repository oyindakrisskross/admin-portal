// src/screens/settings/access-control/RoleFormPage.tsx

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { RoleForm } from "../../../components/settings/RoleForm";
import { fetchRole } from "../../../api/accounts";
import type { Role } from "../../../types/accounts";

export default function RoleFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [initial, setInitial] = useState<Role | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        const data = await fetchRole(Number(id));
        setInitial(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  if (isEdit && loading) {
    return (
      <div className="p-6 text-sm">
        Loading role...
      </div>
    );
  }

  return <RoleForm initial={isEdit ? initial : null} />;
}