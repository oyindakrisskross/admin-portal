// src/components/crm/UserForm.tsx

import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type Role, type UserLocation, type UserProfile } from "../../types/accounts";
import ListPageHeader from "../layout/ListPageHeader";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { type Location } from "../../types/location";
import { fetchLocations } from "../../api/location";
import { createUser, createUserLocation, deleteUserLocation, fetchRoles, updateUser } from "../../api/accounts";
import { fetchContact } from "../../api/contact";
import ToastModal from "../ui/ToastModal";
import type { Contact } from "../../types/contact";
import { SAFE_SPECIAL_CHARS, validatePortalPassword, validateStaffPin } from "../../utils/passwordPolicy";
import { ContactSearchSelect } from "./ContactSearchSelect";
import { ContactFormModal } from "./ContactFormModal";

interface Props {
  initial?: UserProfile | null;
}

const EMPTY_USER: UserProfile = {
  email: "",
  is_active: true,
  is_staff: false,
  password: null,
  first_name: "",
  last_name: "",
  phone: "",
};

export const UserForm: React.FC<Props> = ({ initial }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState<UserProfile>(initial ?? EMPTY_USER);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [portals, setPortals] = useState<Location[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" } | null>(null);

  const [locations, setLocations] = useState<Location[]>([]);
  const [availableLocationIds, setAvailableLocationIds] = useState<number[]>([]);
  const [locationSearch, setLocationSearch] = useState("");

   const initialAvailabilityRef = useRef<UserLocation[]>([]);

  const selectedAllLocs =
    locations.length > 0 &&
    availableLocationIds.length === locations.length;
  
  const [saving, setSaving] = useState(false);

  const handleRemoveAllowed = (id: number) => {
    setUser((prev) => ({
      ...prev,
      allowed_locations: prev.allowed_locations?.filter((a) => a.location !== id),
    }));
  };

  const handleAddAllowed = (id: number) => {
    if (user.allowed_locations?.find((a) => a.location === id)) return;

    setUser((prev) => ({
      ...prev,
      allowed_locations: [
        ...(prev.allowed_locations ?? []),
        {
          location: id,
        },
      ],
    }));
  };

  const toggleLocation = (id: number) => {
    setAvailableLocationIds((prev) => 
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

    const current = user.allowed_locations ?? [];
    const exists = current.some((a) => a.location === id);

    if (exists) {
      handleRemoveAllowed(id);
    } else {
      handleAddAllowed(id);
    }
  };

  const handleSelectAllLocations = () => {
    setAvailableLocationIds(locations.map((l) => l.id!));
    locations.map((l) => handleAddAllowed(l.id!));
  };

  const handleRemoveAllLocations = () => {
    availableLocationIds.map((l) => handleRemoveAllowed(l));
    setAvailableLocationIds([]);
  };

  const handleRemoveLocation = (id: number) => {
    setAvailableLocationIds((prev) => prev.filter((x) => x !== id));
    handleRemoveAllowed(id);
  };
  
  const handleChange = (patch: Partial<UserProfile>) => {
    setUser((u) => ({ ...u, ...patch }));
  };

  const handlePortalChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const portalId = Number(event.target.value);
    handleChange({ portal: portalId });
  };

  const syncAllowedLocations = async (userId: number) => {
    const original = initialAvailabilityRef.current;
    const current = user.allowed_locations;

    console.log(original);
    console.log(current);

    const originalById = new Map<number, UserLocation>();
    for (const a of original) {
      if (a.id != null) originalById.set(a.id, a);
    }

    const currentById = new Map<number, UserLocation>();
    for (const a of current!) {
      if (a.id != null) currentById.set(a.id, a);
    }

    // 1) Deletes
    const deletions: number[] = [];
    for(const [id] of originalById.entries()) {
      if (!currentById.has(id)) deletions.push(id);
    }

    console.log(deletions);

    // 2) Creates
    const creations = current?.filter((a) => !a.id && a.location);

    console.log(creations);

    await Promise.all([
      ...deletions.map((id) => deleteUserLocation(id)),
      ...creations!.map((c) => {
        const payload: UserLocation = {
          user: userId,
          location: c.location,
        };
        createUserLocation(payload);
      }),
    ]);

    const refreshed = current?.map((a) => ({ ...a }));
    initialAvailabilityRef.current = refreshed as any;
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const contactId = selectedContact?.id ?? user.contact;
      if (!contactId) {
        setToast({ message: "Contact is required.", variant: "error" });
        return;
      }

      if (!user.portal) {
        setToast({ message: "Portal is required.", variant: "error" });
        return;
      }

      if (!user.role) {
        setToast({ message: "Role is required.", variant: "error" });
        return;
      }

      const selectedPortal = portals.find((p) => p.id === user.portal);
      const isPortalUser = Boolean(selectedPortal && selectedPortal.type_id === "PORTAL");
      const pwd = (user.password ?? "") as string;
      if (pwd && pwd.trim()) {
        const msg = isPortalUser ? validatePortalPassword(pwd) : validateStaffPin(pwd);
        if (msg) {
          setToast({ message: msg, variant: "error" });
          return;
        }
      }

      const payload: any = {
        email: user.email,
        portal: user.portal,
        role: user.role,
        contact_id: contactId,
        first_name: user.first_name ?? "",
        last_name: user.last_name ?? "",
        phone: user.phone ?? "",
        is_active: user.is_active,
        is_staff: user.is_staff,
        status: user.status ?? (user.is_active ? "ACTIVE" : "INACTIVE"),
      };
      if (pwd && pwd.trim()) payload.password = pwd;
      let saved: UserProfile;

      if (user.id) {
        saved = await updateUser(user.id, payload);
      } else {
        saved = await createUser(payload);
      }

      await syncAllowedLocations(saved.id!);

      navigate(`/crm/users/`);
      setToast({ message: "User saved.", variant: "success" });
    } catch (err: any) {
      const msg =
        err?.response?.data?.password?.[0] ||
        err?.response?.data?.detail ||
        "Failed to save user.";
      setToast({ message: msg, variant: "error" });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (initial) {
      setUser((prev) => ({
        ...prev,
        ...initial,
        first_name: initial.contact_first_name ?? initial.first_name ?? "",
        last_name: initial.contact_last_name ?? initial.last_name ?? "",
        phone: initial.contact_phone ?? initial.phone ?? "",
      }));

      if (initial?.allowed_locations && initial.allowed_locations.length) {
        const mapped = initial.allowed_locations;
        setAvailableLocationIds(mapped.map((l) => l.location!));
        initialAvailabilityRef.current = mapped;
      } else {
        initialAvailabilityRef.current = [];
      }
    }
  },[initial]);

  useEffect(() => {
    if (!initial?.contact) return;

    (async () => {
      try {
        const c = await fetchContact(initial.contact!);
        setSelectedContact(c);
      } catch {
        setSelectedContact(null);
      }
    })();
  }, [initial?.contact]);

  useEffect(() => {
    if (!user.portal) {
      setRoles([]);
      return;
    }

    (async () => {
      try {
        const data = await fetchRoles({ portal: user.portal });
        setRoles(data.results);
      } catch {
        setRoles([]);
      }
    })();
  }, [user.portal]);

  useEffect(() => {
    (async () => {
      const data = (await fetchLocations()) as { results: Location[] };
      const results = data.results ?? [];
      setPortals(results);
      setLocations(results.filter((loc) => loc.type_id !== "PORTAL"));
    })();
  },[]);

  useEffect(() => {
    if (!user.portal) {
      setShowLocationSelector(false);
      return;
    }

    const portal = portals.find((p) => p.id === user.portal);

    // Only show accessible locations when selected portal is NOT of type "PORTAL"
    setShowLocationSelector(Boolean(portal && portal.type_id === "PORTAL"));
  }, [user.portal, portals]);

  return (
    <div className="min-h-full">
      <ToastModal
        message={toast?.message ?? null}
        onClose={() => setToast(null)}
        variant={toast?.variant ?? "error"}
      />
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

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-6">
          <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 shadow-sm">
            <div className="text-sm font-medium text-kk-dark-text">Contact Information</div>
            <div className="mt-4 flex flex-col gap-6 text-sm">
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Contact</p>
          <div className="col-span-5 flex gap-2">
            <div className="flex-1">
              <ContactSearchSelect
                value={selectedContact}
                onChange={(c) => {
                  setSelectedContact(c);
                  handleChange({
                    contact: c?.id,
                    email: c?.email ?? user.email,
                    first_name: c?.first_name ?? "",
                    last_name: c?.last_name ?? "",
                    phone: c?.phone_1 ?? "",
                  });
                }}
                onError={(msg) => setToast({ message: msg, variant: "error" })}
              />
            </div>
            <button
              type="button"
              onClick={() => setContactModalOpen(true)}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm hover:bg-kk-dark-hover"
            >
              New Contact
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Contact Name</p>
          <div className="col-span-5 flex gap-3">
            <input 
              type="text"
              className="w-1/2 rounded-md border border-kk-dark-input-border px-3 py-2"
              value={user.first_name ?? ""}
              placeholder="First Name"
              onChange={(e) => handleChange({ first_name: e.target.value })}
            />
            <input 
              type="text"
              className="w-1/2 rounded-md border border-kk-dark-input-border px-3 py-2"
              value={user.last_name ?? ""}
              placeholder="Last Name"
              onChange={(e) => handleChange({ last_name: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Phone</p>
          <input
            type="text"
            className="col-span-5 rounded-md border border-kk-dark-input-border px-3 py-2"
            value={user.phone ?? ""}
            placeholder="Phone"
            onChange={(e) => handleChange({ phone: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-12 gap-2">
          <p className="col-span-2">Email</p>
          <input 
            type="email"
            className="col-span-5 rounded-md border border-kk-dark-input-border px-3 py-2"
            value={user.email ?? ""}
            placeholder="Email"
            onChange={(e) => handleChange({ email: e.target.value })}
            disabled={Boolean(selectedContact?.id)}
          />
        </div>
            </div>
          </div>

          <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 shadow-sm">
            <div className="text-sm font-medium text-kk-dark-text">Account</div>
            <div className="mt-4 flex flex-col gap-6 text-sm">
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
          <p className="col-span-2">Password</p>
          <div className="col-span-5 flex flex-col gap-1">
            <input 
                type="password"
                className="rounded-md border border-kk-dark-input-border px-3 py-2"
                value={user.password ?? ""}
                autoComplete="new-password"
                onChange={(e) => handleChange({ password: e.target.value })}
              />
            {(() => {
              const selectedPortal = portals.find((p) => p.id === user.portal);
              const isPortalUser = Boolean(selectedPortal && selectedPortal.type_id === "PORTAL");
              return isPortalUser ? (
                <p className="text-[11px] text-kk-dark-text-muted">
                  Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special ({SAFE_SPECIAL_CHARS}).
                </p>
              ) : (
                <p className="text-[11px] text-kk-dark-text-muted">6-digit numeric PIN for staff users.</p>
              );
            })()}
          </div>
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
            </div>
          </div>
        </div>

        {/* Accessible Locations (only when portal type is not "PORTAL") */}
        {showLocationSelector && (
          <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 shadow-sm">
            <div className="text-sm font-medium text-kk-dark-text">Accessible Locations</div>
            <p className="mt-1 text-xs text-kk-dark-text-muted">Select the locations this user can access.</p>

            <div className="mt-4 h-64 grid grid-cols-2 gap-0 rounded-2xl border border-kk-dark-input-border overflow-hidden">
              {/* LEFT: all locations + search */}
              <div className="border-r border-kk-dark-input-border">
                {/* Search */}
                <div className="flex items-center gap-2 border-b border-kk-dark-input-border px-4 py-3 text-xs text-kk-dark-text-muted">
                  <input
                    type="text"
                    className="w-full bg-transparent outline-none"
                    placeholder="Search locations..."
                    value={locationSearch}
                    onChange={(e) => setLocationSearch(e.target.value)}
                  />
                </div>

                {/* Select all */}
                <button
                  type="button"
                  onClick={handleSelectAllLocations}
                  className="flex w-full items-center gap-2 border-b border-kk-dark-input-border px-4 py-2 text-xs hover:bg-kk-dark-hover"
                >
                  {selectedAllLocs ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border border-kk-dark-input-border" />
                  )}
                  <span className="font-medium">Select All</span>
                </button>

                {/* Locations list */}
                <div className="h-full overflow-auto">
                  {locations
                    .filter((loc) =>
                      loc.name
                        .toLowerCase()
                        .includes(locationSearch.toLowerCase())
                    )
                    .map((loc) => {
                      const selected = availableLocationIds.includes(loc.id!);
                      return (
                        <button
                          key={loc.id}
                          type="button"
                          onClick={() => toggleLocation(loc.id!)}
                          className={`flex w-full items-center gap-2 px-4 py-2 text-sm ${
                            selected ? "bg-emerald-50" : "hover:bg-kk-dark-hover"
                          }`}
                        >
                          {selected ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <span className="h-4 w-4 rounded-full border border-kk-dark-input-border" />
                          )}
                          <span
                            className={`${
                              selected ? "font-semibold" : "font-medium"
                            }`}
                          >
                            {loc.name}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* RIGHT: selected locations */}
              <div>
                <div className="bg-kk-dark-bg flex items-center justify-between border-b border-kk-dark-input-border px-4 py-3 text-xs">
                  <span className="tracking-wide text-kk-dark-text">
                    SELECTED LOCATIONS
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveAllLocations}
                    className="inline-flex items-center gap-1 text-[11px] text-kk-dark-text-muted hover:text-red-500"
                  >
                    <span>Remove All</span>
                  </button>
                </div>

                <div className="h-full overflow-auto px-4 py-3 text-sm">
                  {availableLocationIds.length === 0 ? (
                    <p className="text-xs text-kk-dark-text-muted">
                      No locations selected yet.
                    </p>
                  ) : (
                    <ul className="space-y-1 text-sm">
                      {locations
                        .filter((loc) => availableLocationIds.includes(loc.id!))
                        .map((loc) => (
                          <li
                            key={loc.id}
                            className="flex items-center justify-between gap-2"
                          >
                            <span>{loc.name}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveLocation(loc.id!)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-kk-dark-input-border text-[11px] text-kk-dark-text-muted hover:border-red-500 hover:text-red-500"
                              aria-label={`Remove ${loc.name}`}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

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
            Save User
          </button>
        </div>
      </div>

      <ContactFormModal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        onSaved={(c) => {
          setContactModalOpen(false);
          setSelectedContact(c);
          handleChange({
            contact: c.id,
            email: c.email,
            first_name: c.first_name ?? "",
            last_name: c.last_name ?? "",
            phone: c.phone_1 ?? "",
          });
        }}
      />
    </div>
  );
};
