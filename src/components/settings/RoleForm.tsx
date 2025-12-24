// src/components/settings/RoleForm.tsx

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { 
  type Role,
  type Permission, 
  type PermissionCategory, 
  type PermissionBitMap, 
  type PermissionBitSet
} from "../../types/accounts";
import type { Location } from "../../types/location";
import { createRole, fetchPermissionCategories, updateRole } from "../../api/accounts";
import { fetchLocations, fetchPortals } from "../../api/location";
import ListPageHeader from "../layout/ListPageHeader";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Loader2 } from "lucide-react";

interface Props {
  initial?: Role | null;
};

const EMPTY_ROLE: Role = {
  name: "",
  description: "",
  portal: "" as any,
  permissions: [],
};

export const RoleForm: React.FC<Props> = ({ initial }) => {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>(initial ?? EMPTY_ROLE);
  const [portals, setPortals] = useState<Location[]>([]);
  const [portal, setPortal] = useState<number | null>(role.portal ?? null);
  const [portalPerms, setPortalPerms] = useState<PermissionCategory[]>([]);
  const [permState, setPermState] = useState<PermissionBitMap>({});
  const [saving, setSaving] = useState(false);

  const handleChange = (patch:Partial<Role>) => {
    setRole((r) => ({ ...r, ...patch }));
  };

  const handlePortalChange = (event) => {
    const portal = event.target.value;
    handleChange({ portal: portal });
    setPortal(portal);

    (async () => {
      const data = await fetchPermissionCategories(
        {
          filters: {
            clauses: [
              {
                field: "portal",
                operator: "=",
                value: portal,
              }
            ]
          }
        }
      );
      setPortalPerms(data.results);
    })();
  };

  const toggleField = (
    permissionId: number,
    field: keyof PermissionBitSet,
    checked: boolean,
  ) => {
    setPermState((prev) => {
      const current: PermissionBitSet = prev[permissionId] || {
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
      };
      return {
        ...prev,
        [permissionId]: { ...current, [field]: checked },
      };
    });
  };

  const toggleFull = (
    perm: Permission,     // we need the row’s Permission to know which columns exist
    checked: boolean,
  ) => {
    setPermState((prev) => {
      const next: PermissionBitSet = {
        view:  perm.view   ? checked : false,
        create:perm.create ? checked : false,
        edit:  perm.edit   ? checked : false,
        delete:perm.delete ? checked : false,
        approve:perm.approve ? checked : false,
      };
      return { ...prev, [perm.id]: next };
    });
  };

  const isFullChecked = (perm: Permission, access: PermissionBitSet | undefined) => {
    if (!access) return false;
    return (
      (!perm.view   || access.view) &&
      (!perm.create || access.create) &&
      (!perm.edit   || access.edit) &&
      (!perm.delete || access.delete) &&
      (!perm.approve|| access.approve)
    );
  };

  const handleSave = async () => {
    if (!role.name || !portal) return;

    setSaving(true);
    try {
      // flatten the state map into an array
      const permissions_payload = Object.entries(permState).map(
        ([permissionId, access]) => ({
          permission_id: Number(permissionId),
          view: !!access.view,
          create: !!access.create,
          edit: !!access.edit,
          delete: !!access.delete,
          approve: !!access.approve,
          // "full" will be inferred by the backend bitmask helper
        }),
      );

      const payload = {
        name: role.name,
        description: role.description,
        portal: portal,
        permissions_payload,
      };

      if (initial?.id) {
        await updateRole(initial.id, payload);
      } else {
        await createRole(payload);
      }

      navigate("/settings/roles");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!initial || !initial.permissions) return;

    const next: PermissionBitMap = {};

    initial.permissions.forEach((rp) => {
      const bits = (rp.access || "00000").padEnd(5,"0");
      next[rp.permission] = {
        view: bits[0] === "1",
        create: bits[1] === "1",
        edit: bits[2] === "1",
        delete: bits[3] === "1",
        approve: bits[4] === "1",
      };
    });
    setPermState(next);
  },[initial]);

  useEffect(() => {
    (async () => {
      const data = await fetchLocations();
      setPortals(data.results);
    })();
  },[]);

  useEffect(() => {
    if (portal) {
      (async () => {
        const data = await fetchPermissionCategories(
          {
            filters: {
              clauses: [
                {
                  field: "portal",
                  operator: "=",
                  value: portal,
                }
              ]
            }
          }
        );
        setPortalPerms(data.results);
      })();
    }
  },[portal]);

  return (
    <>
      <ListPageHeader 
        title={initial ? `Edit ${initial?.name} Role` : "New Role"}
        right = {
          <button
            onClick={() => navigate("/settings/roles")}
            className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-kk-muted hover:text-gray-100"
          >
            <XMarkIcon className="h-7 w-7" />
          </button>
        } 
      />

      <div className="flex flex-col gap-3 text-sm px-6 pt-4 pb-8">
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Role Name</p>
          <input
            type="text"
            className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-4"
            value={role.name}
            onChange={(e) => handleChange({ name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Portal</p>
          <select
            defaultValue=""
            value={role.portal}
            className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 col-span-4"
            onChange={handlePortalChange}
          >
            <option value="" disabled>Select a Portal</option>
            {portals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Description</p>
          <textarea 
            value={role.description}
            className="min-h-[100px] rounded-md border border-kk-dark-input-border px-3 py-2 col-span-4"
            onChange={(e) => handleChange({ description: e.target.value })}
          />
        </div>
        {portalPerms.map((p) => (
          <div className="grid grid-cols-12 gap-2">
            <span className="col-span-12 text-lg bg-kk-dark-bg-elevated py-4 px-3">
              {p.name}
            </span>
            <table className="min-w-full">
              <thead>
                <tr>
                  <th>Particulars</th>
                  <th>Full</th>
                  <th>View</th>
                  <th>Create</th>
                  <th>Edit</th>
                  <th>Delete</th>
                  <th>Approve</th>
                </tr>
              </thead>
              <tbody>
                {p.category_permissions?.map((perm) => {
                  const access = permState[perm.id];

                  return (
                    <tr key={perm.id}>
                      <td className="py-2 pr-4">{perm.name}</td>

                      {/* Full */}
                      <td className="text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 mx-2 mt-3"
                          checked={isFullChecked(perm, access)}
                          onChange={(e) => toggleFull(perm, e.target.checked)}
                        />
                      </td>

                      {/* View */}
                      <td className="text-center">
                        {perm.view && (
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 mx-2 mt-3"
                            checked={!!access?.view}
                            onChange={(e) =>
                              toggleField(perm.id, "view", e.target.checked)
                            }
                          />
                        )}
                      </td>

                      {/* Create */}
                      <td className="text-center">
                        {perm.create && (
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 mx-2 mt-3"
                            checked={!!access?.create}
                            onChange={(e) =>
                              toggleField(perm.id, "create", e.target.checked)
                            }
                          />
                        )}
                      </td>

                      {/* Edit */}
                      <td className="text-center">
                        {perm.edit && (
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 mx-2 mt-3"
                            checked={!!access?.edit}
                            onChange={(e) =>
                              toggleField(perm.id, "edit", e.target.checked)
                            }
                          />
                        )}
                      </td>

                      {/* Delete */}
                      <td className="text-center">
                        {perm.delete && (
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 mx-2 mt-3"
                            checked={!!access?.delete}
                            onChange={(e) =>
                              toggleField(perm.id, "delete", e.target.checked)
                            }
                          />
                        )}
                      </td>

                      {/* Approve */}
                      <td className="text-center">
                        {perm.approve && (
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 mx-2 mt-3"
                            checked={!!access?.approve}
                            onChange={(e) =>
                              toggleField(perm.id, "approve", e.target.checked)
                            }
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
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
            Save
          </button>
        </div>
      </div>
    </>
  );
};