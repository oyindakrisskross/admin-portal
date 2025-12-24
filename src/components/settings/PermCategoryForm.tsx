// src/components/settings/PermCategoryForm.tsx

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { type Permission, type PermissionCategory } from "../../types/accounts";
import { 
  createPermissionCategory, 
  updatePermissionCategory,
  createPermission,
  updatePermission,
  deletePermission, 
} from "../../api/accounts";
import ListPageHeader from "../layout/ListPageHeader";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { type Location } from "../../types/location";
import { fetchLocations } from "../../api/location";

interface Props {
  initial?: PermissionCategory | null;
}

const EMPTY_PERM_CAT: PermissionCategory = {
  name: "",
  portal: "" as any,
};

export const PermCategoryForm: React.FC<Props> = ({ initial }) => {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<PermissionCategory>(initial ?? EMPTY_PERM_CAT);
  const [portals, setPortals] = useState<Location[]>([]);
  const [perms, setPerms] = useState<Permission[]>([]);
  const initialPermsRef = useRef<Permission[]>([]);

  const handleChange = (patch: Partial<PermissionCategory>) => {
    setCategory((c) => ({ ...c, ...patch }));
  };

  const handleAddPerm = () => {
    setPerms((p) => [
      ...p,
      {
        name: "",
        view: false,
        create: false,
        edit: false,
        delete: false,
        approve: false,
      } as Permission,
    ]);
  };

  const handleRemovePerm = (index: number) => {
    setPerms((p) => p.filter((_, i) => i !== index));
  };

  const handlePermChange = (index: number, patch: Partial<Permission>) => {
    setPerms((perm) => perm.map((p, idx) => (idx === index ? { ...p, ...patch } : p)));
  };

  const isFullChecked = (perm: Permission) => {
    return (
      perm.view &&
      perm.create &&
      perm.edit &&
      perm.delete &&
      perm.approve
    );
  };

  const toggleFull = (index: number, checked: boolean) => {
    setPerms((prev) => 
      prev.map((perm, i) => 
        i === index
          ? {
            ...perm,
            view: checked,
            create: checked,
            edit: checked,
            delete: checked,
            approve: checked,
          }
          : perm
      )
    );
  };

  const syncPermissions = async (portalId: number, categoryId: number) => {
    const original = initialPermsRef.current;
    const current = perms;

    const originalById = new Map<number, Permission>();
    for (const p of original) {
      if (p.id != null) originalById.set(p.id, p);
    }

    const currentById = new Map<number, Permission>();
    for (const p of current) {
      if (p.id != null) currentById.set(p.id, p);
    }

    // Deletes: permissions that existed before but are not in current
    const deletions: number[] = [];
    for (const [id] of originalById.entries()) {
      if (!currentById.has(id)) deletions.push(id);
    }

    // Updates: existing permissions whose name or flags have been changed
    const updates: { id: number; patch: Partial<Permission> }[] = [];
    for (const [id, orig] of originalById.entries()) {
      const cur = currentById.get(id);
      if (!cur) continue;

      const patch: Partial<Permission> = {};
      if (orig.name !== cur.name) patch.name = cur.name;
      if (orig.portal !== cur.portal) patch.portal = cur.portal;
      if (orig.view !== cur.view) patch.view = cur.view;
      if (orig.create !== cur.create) patch.create = cur.create;
      if (orig.edit !== cur.edit) patch.edit = cur.edit;
      if (orig.delete !== cur.delete) patch.delete = cur.delete;
      if (orig.approve !== cur.approve) patch.approve = cur.approve;

      if (Object.keys(patch).length) updates.push({ id, patch });
    }

    // Creates: permissions without id + with flags
    const creations = current.filter((c) => !c.id && c.name);

    await Promise.all([
      ...deletions.map((id) => deletePermission(id)),
      ...updates.map((u) => updatePermission(u.id, u.patch)),
    ]);

    for (const c of creations) {
      await createPermission({
        ...c,
        category: categoryId,
        portal: portalId,
      });
    }

    const refreshed = current.map((p) => ({ ...p }));
    initialPermsRef.current = refreshed;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: any = {
        ...category,
      };

      let saved: PermissionCategory;
      if (category.id) {
        saved = await updatePermissionCategory(category.id, payload);
      } else {
        saved = await createPermissionCategory(payload);
      }

      await syncPermissions(saved.portal!, saved.id! );

      navigate("/settings/permission-categories");
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

  useEffect(() => {
    if (initial) {
      // Get snapshot of initial permissions
      if (initial?.category_permissions && initial.category_permissions.length) {
        const mapped = initial.category_permissions.map((perm: Permission) => ({
          id: perm.id,
          portal: perm.portal,
          permission_id: perm.permission_id,
          category: perm.category,
          name: perm.name,
          view: perm.view,
          create: perm.create,
          edit: perm.edit,
          delete: perm.delete,
          approve: perm.approve,
        }));
        setPerms(mapped);
        initialPermsRef.current = mapped;
      } else {
        setPerms([]);
        initialPermsRef.current = [];
      }
    }
  }, [initial]);

  return (
    <>
      <ListPageHeader 
        title={initial ? `Edit ${initial?.name} - ${initial?.portal_name}` : "New Permission Category"}
        right={
          <button
            onClick={() => navigate("/settings/permission-categories")}
            className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-kk-muted hover:text-gray-100"
          >
            <XMarkIcon className="h-7 w-7" />
          </button>
        }
      />

      <div className="flex flex-col gap-6 text-sm px-6 pt-4 pb-8">
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Permission Category</p>
          <input
            type="text"
            className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-3"
            value={category.name}
            onChange={(e) => handleChange({ name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Portal</p>
          <select
            defaultValue=""
            value={category.portal}
            className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 col-span-4"
            onChange={(e) => handleChange({ portal: +e.target.value })}
          >
            <option value="" disabled>Select a Portal</option>
            {portals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">Permissions</h3>
              <p>
                Define the permissions within this category.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddPerm}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-kk-dark-hover"
            >
              <Plus className="h-3 w-3" />
              Add Permission
            </button>
          </div>

          {/* Permissions Table */}
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Permission Name</th>
                <th>Full</th>
                <th>View</th>
                <th>Create</th>
                <th>Edit</th>
                <th>Delete</th>
                <th>Approve</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {perms.map((p, idx) => (
                <tr key={idx}>
                  <td>
                    <input 
                      type="text"
                      placeholder="e.g. Item"
                      className="w-full rounded-md border border-kk-dark-input-border px-3 py-2"
                      value={p.name}
                      onChange={(e) => handlePermChange(idx, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <input 
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 mx-2 mt-3"
                      checked={isFullChecked(p)}
                      onChange={(e) => toggleFull(idx, e.target.checked)}
                    />
                  </td>
                  <td>
                    <input 
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 mx-2 mt-3"
                      checked={!!p.view}
                      onChange={(e) => handlePermChange(idx, { view: e.target.checked })}
                    />
                  </td>
                  <td>
                    <input 
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 mx-2 mt-3"
                      checked={!!p.create}
                      onChange={(e) => handlePermChange(idx, { create: e.target.checked })}
                    />
                  </td>
                  <td>
                    <input 
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 mx-2 mt-3"
                      checked={!!p.edit}
                      onChange={(e) => handlePermChange(idx, { edit: e.target.checked })}
                    />
                  </td>
                  <td>
                    <input 
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 mx-2 mt-3"
                      checked={!!p.delete}
                      onChange={(e) => handlePermChange(idx, { delete: e.target.checked })}
                    />
                  </td>
                  <td>
                    <input 
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 mx-2 mt-3"
                      checked={!!p.approve}
                      onChange={(e) => handlePermChange(idx, { approve: e.target.checked })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => handleRemovePerm(idx)}
                      className="rounded-full p-1 hover:bg-kk-dark-hover"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </td>
                </tr>
              ))}
              {!perms.length && (
                <tr>
                  <td 
                    colSpan={7}
                    className="text-center"
                  >
                    No Permissions yet. Click "+ Add Permission" to create your first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

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