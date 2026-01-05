// src/screens/crm/user/UserPeek.tsx

import React, { useEffect, useState } from "react";
import type { UserProfile } from "../../../types/accounts";

interface Props {
  user: UserProfile;
}

export const UserPeek: React.FC<Props> = ({ user }) => {

  return (
    <div className="flex h-full flex-col gap-7  p-5 pb-7">
      <div className="flex flex-col items-start gap-10">
        <div>
          <h2 className="text-2xl font-semibold">
            {user.contact_first_name} {user.contact_last_name}
            <span
              className={`ml-3 inline-flex rounded-sm px-2 py-1 text-[11px] font-medium ${
                user.status === "ACTIVE"
                  ? "bg-emerald-700 text-emerald-100"
                  : "bg-slate-400 text-slate-50"
              }`}
            >
              {user.status}
            </span>
          </h2>
          <p>{user.email}</p>
          <p className="font-medium mt-2">Role: {user.role_name}</p>
        </div>
      </div>
    </div>
  );
};