import React, { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

function toInputDateTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function fromInputDateTime(value: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

interface Props {
  open: boolean;
  busy?: boolean;
  title: string;
  description: string;
  label: string;
  onClose: () => void;
  onApply: (value: string) => Promise<void> | void;
}

export const BulkCouponDateModal: React.FC<Props> = ({
  open,
  busy = false,
  title,
  description,
  label,
  onClose,
  onApply,
}) => {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setValue("");
      setError(null);
      return;
    }
    setValue(toInputDateTime());
    setError(null);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-2xl border border-kk-dark-input-border bg-kk-dark-bg-elevated shadow-2xl">
        <div className="flex items-start justify-between border-b border-kk-dark-input-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-kk-dark-text">{title}</h2>
            <p className="mt-1 text-xs text-kk-dark-text-muted">{description}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-kk-dark-text-muted hover:bg-kk-dark-hover hover:text-kk-dark-text"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-5 py-4">
          <label className="block text-xs font-medium text-kk-dark-text-muted">{label}</label>
          <input
            type="datetime-local"
            className="w-full rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm text-kk-dark-text"
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              if (error) setError(null);
            }}
          />
          {error ? <p className="text-xs text-red-400">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-kk-dark-input-border px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-kk-dark-input-border px-4 py-1.5 text-xs font-medium text-kk-dark-text hover:bg-kk-dark-hover"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const isoValue = fromInputDateTime(value);
              if (!isoValue) {
                setError("Select a valid date and time.");
                return;
              }
              await onApply(isoValue);
            }}
            className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
