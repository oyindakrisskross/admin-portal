import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

import { createCustomer } from "../../api/customerPortal";
import type { CustomerRecord } from "../../types/customerPortal";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: CustomerRecord) => void;
};

type CustomerFormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  is_active: boolean;
};

const EMPTY_FORM: CustomerFormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  password: "",
  is_active: true,
};

export const CustomerCreateModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState<CustomerFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY_FORM);
    setSaving(false);
    setError(null);
  }, [open]);

  if (!open) return null;

  const setField = <K extends keyof CustomerFormState>(field: K, value: CustomerFormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.email.trim()) {
      setError("Email is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const saved = await createCustomer({
        email: form.email.trim(),
        first_name: form.first_name.trim() || undefined,
        last_name: form.last_name.trim() || undefined,
        phone: form.phone.trim() || undefined,
        password: form.password || undefined,
        is_active: form.is_active,
      });
      onCreated(saved);
      onClose();
    } catch (err: any) {
      const detail = err?.response?.data;
      if (typeof detail?.detail === "string") {
        setError(detail.detail);
      } else if (detail && typeof detail === "object") {
        const first = Object.values(detail)[0];
        if (Array.isArray(first) && typeof first[0] === "string") {
          setError(first[0]);
        } else {
          setError("Unable to create customer.");
        }
      } else {
        setError("Unable to create customer.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-xl border border-kk-dark-border bg-kk-dark-bg-elevated p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">New Customer</h3>
            <p className="mt-1 text-xs text-kk-dark-text-muted">
              Create a customer without leaving this page.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 hover:bg-kk-dark-hover"
            disabled={saving}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="mt-4 grid gap-3" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-kk-dark-text-muted">First Name</span>
              <input
                value={form.first_name}
                onChange={(e) => setField("first_name", e.target.value)}
                className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                placeholder="First name"
                disabled={saving}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-kk-dark-text-muted">Last Name</span>
              <input
                value={form.last_name}
                onChange={(e) => setField("last_name", e.target.value)}
                className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                placeholder="Last name"
                disabled={saving}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Email *</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              placeholder="Email address"
              disabled={saving}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Phone</span>
            <input
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              placeholder="Phone"
              disabled={saving}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-kk-dark-text-muted">Temporary Password (optional)</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              placeholder="Leave blank to auto-generate"
              disabled={saving}
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setField("is_active", e.target.checked)}
              disabled={saving}
            />
            <span className="text-xs text-kk-dark-text-muted">Active</span>
          </label>

          {error ? (
            <div className="rounded-md border border-red-700/50 bg-red-900/30 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          ) : null}

          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-md border border-kk-dark-input-border px-3 py-2 text-xs hover:bg-kk-dark-hover"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-emerald-600 px-3 py-2 text-xs text-white hover:bg-emerald-700 disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Creating..." : "Create Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
