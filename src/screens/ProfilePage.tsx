import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, User as UserIcon } from "lucide-react";

import { useAuth } from "../auth/AuthContext";
import ListPageHeader from "../components/layout/ListPageHeader";
import ToastModal from "../components/ui/ToastModal";
import { changeMyPassword, fetchMyProfile, updateMyProfile, uploadMyProfileImage } from "../api/profile";
import type { UserProfile } from "../types/accounts";
import { validatePortalPassword } from "../utils/passwordPolicy";

export default function ProfilePage() {
  const { me } = useAuth();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw1, setNewPw1] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwMismatch, setPwMismatch] = useState(false);

  const [toast, setToast] = useState<{ message: string; variant: "error" | "success" | "info" } | null>(
    null
  );

  const initials = useMemo(() => {
    const f = (profile?.contact_first_name || "").trim();
    const l = (profile?.contact_last_name || "").trim();
    const a = f ? f[0] : "";
    const b = l ? l[0] : "";
    return (a + b).toUpperCase() || (me?.email ? me.email[0]?.toUpperCase() : "U");
  }, [me?.email, profile?.contact_first_name, profile?.contact_last_name]);

  const load = async () => {
    setLoading(true);
    try {
      const u = await fetchMyProfile();
      setProfile(u);
      setFirstName(u?.contact_first_name ?? "");
      setLastName(u?.contact_last_name ?? "");
      setPhone(u?.contact_phone ?? "");
    } catch (e: any) {
      setToast({ message: e?.message || "Failed to load profile.", variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSaveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    setToast(null);
    try {
      const u = await updateMyProfile({
        first_name: firstName,
        last_name: lastName,
        phone,
      });
      setProfile(u);
      setToast({ message: "Profile updated.", variant: "success" });
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to update profile.", variant: "error" });
    } finally {
      setSavingProfile(false);
    }
  };

  const onPickImage = () => {
    fileInputRef.current?.click();
  };

  const onUploadImage = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setToast(null);
    try {
      const u = await uploadMyProfileImage(file);
      setProfile(u);
      setToast({ message: "Profile image updated.", variant: "success" });
    } catch (e: any) {
      setToast({ message: e?.response?.data?.detail || e?.message || "Failed to upload image.", variant: "error" });
    } finally {
      setUploading(false);
    }
  };

  const onChangePassword = async () => {
    setPwMismatch(false);
    setToast(null);

    if (!currentPw.trim()) {
      setToast({ message: "Current password is required.", variant: "error" });
      return;
    }

    const invalid = validatePortalPassword(newPw1);
    if (invalid) {
      setToast({ message: invalid, variant: "error" });
      return;
    }

    if (newPw1 !== newPw2) {
      setPwMismatch(true);
      setToast({ message: "Passwords do not match", variant: "error" });
      return;
    }

    setChangingPw(true);
    try {
      await changeMyPassword({
        current_password: currentPw,
        new_password1: newPw1,
        new_password2: newPw2,
      });
      setCurrentPw("");
      setNewPw1("");
      setNewPw2("");
      setToast({ message: "Password changed successfully.", variant: "success" });
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.message || "Failed to change password.";
      setToast({ message: String(msg), variant: "error" });
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="min-h-full">
      <ToastModal
        message={toast?.message ?? null}
        onClose={() => setToast(null)}
        variant={toast?.variant ?? "error"}
      />

      <ListPageHeader
        section="Account"
        title="Profile"
        subtitle="Manage your contact information, password, and profile image."
      />

      <div className="space-y-6 p-6">
        {loading && !profile ? (
          <div className="text-sm text-kk-muted">Loading...</div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: avatar */}
          <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 shadow-sm">
            <div className="text-sm font-medium text-kk-dark-text">Profile Image</div>
            <div className="mt-4 flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-full border border-kk-dark-border bg-kk-dark-bg">
                {profile?.image_url ? (
                  <img
                    src={profile.image_url}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-kk-muted">
                    {initials}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onUploadImage(f);
                    e.currentTarget.value = "";
                  }}
                />

                <button
                  type="button"
                  onClick={onPickImage}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 rounded-md border border-kk-dark-border bg-kk-dark-bg px-3 py-2 text-xs hover:bg-kk-dark-hover disabled:opacity-60"
                >
                  <Camera className="h-4 w-4" />
                  {uploading ? "Uploading..." : "Upload Image"}
                </button>
              </div>
            </div>
          </div>

          {/* Right: details */}
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-kk-dark-text">Contact Information</div>
                <button
                  type="button"
                  onClick={onSaveProfile}
                  disabled={savingProfile || !profile}
                  className="rounded-md bg-kk-accent px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  {savingProfile ? "Saving..." : "Save"}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-kk-muted">First name</label>
                  <input
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm outline-none"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={!profile}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-kk-muted">Last name</label>
                  <input
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm outline-none"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={!profile}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-kk-muted">Phone</label>
                  <input
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm outline-none"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    disabled={!profile}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-kk-muted">Role</label>
                  <div className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm text-kk-muted">
                    {profile?.role_name || me?.role?.name || "—"}
                  </div>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs text-kk-muted">Email (not editable)</label>
                  <div className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm text-kk-muted">
                    {profile?.email || me?.email || "—"}
                  </div>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs text-kk-muted">Username (not editable)</label>
                  <div className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm text-kk-muted">
                    {profile?.username || me?.username || "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-kk-muted" />
                  <div className="text-sm font-medium text-kk-dark-text">Reset Password</div>
                </div>
                <button
                  type="button"
                  onClick={onChangePassword}
                  disabled={changingPw}
                  className="rounded-md bg-kk-accent px-3 py-2 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-60"
                >
                  {changingPw ? "Updating..." : "Update Password"}
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs text-kk-muted">Current password</label>
                  <input
                    value={currentPw}
                    onChange={(e) => setCurrentPw(e.target.value)}
                    type="password"
                    autoComplete="current-password"
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-kk-muted">New password</label>
                  <input
                    value={newPw1}
                    onChange={(e) => setNewPw1(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                    className={[
                      "w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm outline-none",
                      pwMismatch ? "ring-2 ring-red-500" : "",
                    ].join(" ")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-kk-muted">Confirm new password</label>
                  <input
                    value={newPw2}
                    onChange={(e) => setNewPw2(e.target.value)}
                    type="password"
                    autoComplete="new-password"
                    className={[
                      "w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm outline-none",
                      pwMismatch ? "ring-2 ring-red-500" : "",
                    ].join(" ")}
                  />
                </div>
              </div>
              <div className="mt-3 text-xs text-kk-muted">
                Password must be at least 8 characters and include uppercase, lowercase, a number, and a safe special character.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

