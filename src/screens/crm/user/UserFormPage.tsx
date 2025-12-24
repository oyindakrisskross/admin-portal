// src/screens/crm/user/UserFormPage.tsx

import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchUser } from "../../../api/accounts";
import type { UserProfile } from "../../../types/accounts";
import { UserForm } from "../../../components/crm/UserForm";

export default function UserFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [initial, setInitial] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    if (!isEdit) return;

    (async () => {
      try {
        const data= await fetchUser(Number(id));
        setInitial(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit]);

  if (isEdit && loading) {
    return (
      <div className="p-6 text-sm">
        Loading user…
      </div>
    );
  }

  return <UserForm initial={isEdit ? initial : null} />;
};