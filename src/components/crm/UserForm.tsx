// src/components/crm/UserForm.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type Role, type UserProfile } from "../../types/accounts";
import ListPageHeader from "../layout/ListPageHeader";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Loader2 } from "lucide-react";
import { type Location } from "../../types/location";
import { fetchLocations } from "../../api/location";
import { createUser, fetchRoles, updateUser } from "../../api/accounts";

interface Props {
  initial?: UserProfile | null;
}

const EMPTY_USER: UserProfile = {
  email: "",
  is_active: true,
  is_staff: false,
  password: null,
};

export const UserForm: React.FC<Props> = ({ initial }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState<UserProfile>(initial ?? EMPTY_USER);
  const [portals, setPortals] = useState<Location[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  
  const [saving, setSaving] = useState(false);
  
  const handleChange = (patch: Partial<UserProfile>) => {
    setUser((u) => ({ ...u, ...patch }));
  };

  const handlePortalChange = (event) => {
    const pId = event.target.value;
    handleChange({ portal: pId });

    (async () => {
      const data = await fetchRoles({ portal: pId });
      setRoles(data.results);
    })();
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const payload: any = {
        ...user,
      };
      let saved: UserProfile;

      if (user.id) {
        saved = await updateUser(user.id, payload);
      } else {
        saved = await createUser(payload);
      }

      navigate(`/crm/users/`);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    (async () => {
      const data = await fetchLocations();
      setPortals(data.results);
    })();
  },[]);

  return (
    <>
      <ListPageHeader 
        section="CRM"
        title={initial ? `Edit ${initial.contact_first_name} ${initial.contact_last_name}` : "New User"}
        right = {
          <button
            onClick={() => navigate("/crm/users")}
            className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-kk-muted hover:text-gray-100"
          >
            <XMarkIcon className="h-7 w-7" />
          </button>
        } 
      />

      <div className="flex flex-col gap-6 text-sm px-6 pt-8 pb-8">
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Email</p>
          <input 
            type="email"
            className="col-span-5 rounded-md border border-kk-dark-input-border px-3 py-2"
            value={user.email}
            placeholder="Email"
            onChange={(e) => handleChange({ email: e.target.value })}
          />
        </div>
        {/* <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Username</p>
          <input 
            type="text"
            className="col-span-5 rounded-md border border-kk-dark-input-border px-3 py-2"
            value={user.username}
            onChange={(e) => handleChange({ username: e.target.value })}
          />
        </div> */}
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Password</p>
          <input 
              type="password"
              className="col-span-5 rounded-md border border-kk-dark-input-border px-3 py-2"
              value={user.password}
              autocomplete="new-password"
              onChange={(e) => handleChange({ password: e.target.value })}
            />
        </div>
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Full Name</p>
          <div className="col-span-5 flex gap-3">
            <input 
              type="text"
              className="w-1/2 rounded-md border border-kk-dark-input-border px-3 py-2"
              value={user.first_name}
              placeholder="First Name"
              onChange={(e) => handleChange({ first_name: e.target.value })}
            />
            <input 
              type="text"
              className="w-1/2 rounded-md border border-kk-dark-input-border px-3 py-2"
              value={user.last_name}
              placeholder="Last Name"
              onChange={(e) => handleChange({ last_name: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Portal</p>
          <select
            defaultValue=""
            value={user.portal}
            className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 col-span-5"
            onChange={handlePortalChange}
          >
            <option key={0} value="" disabled>Select a Portal</option>
            {portals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Role</p>
          <select
            defaultValue=""
            value={user.role}
            className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 col-span-5"
            onChange={(e) => handleChange({ role: +e.target.value })}
          >
            <option key={0} value="" disabled>Select a Role</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Is Staff</p>
          <input 
              type="checkbox"
              className="w-5 h-5 rounded-md border border-kk-dark-input-border px-3 py-2"
              checked={user.is_staff}
              onChange={(e) => handleChange({ is_staff: e.target.checked })}
            />
        </div>
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Is Active</p>
          <input 
              type="checkbox"
              className="w-5 h-5 rounded-md border border-kk-dark-input-border px-3 py-2"
              checked={user.is_active}
              onChange={(e) => handleChange({ is_active: e.target.checked })}
            />
        </div>
        {/* Footer buttons */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="danger rounded-full border border-red-600 px-4 py-1.5 text-xs font-medium text-red-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save Item
          </button>
        </div>
      </div>
    </>
  )
};