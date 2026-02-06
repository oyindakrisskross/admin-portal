// src/components/catalog/bulk/BulkEditAvailabilityModal.tsx

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import type { Location } from "../../../types/location";
import { fetchLocations } from "../../../api/location";

export function BulkEditAvailabilityModal(props: {
  open: boolean;
  title: string;
  onClose: () => void;
  onApply: (locationIds: number[]) => Promise<void> | void;
}) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!props.open) return;
    (async () => {
      try {
        const data = await fetchLocations();
        setLocations(data.results ?? []);
      } catch {
        setLocations([]);
      }
    })();
  }, [props.open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return locations;
    return locations.filter((l) => String(l.name ?? "").toLowerCase().includes(q));
  }, [locations, search]);

  const toggle = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm">
      <div className="mt-12 w-full max-w-2xl rounded-2xl shadow-xl border border-kk-dark-border bg-kk-dark-bg-elevated">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{props.title}</h2>
            <p className="text-xs text-kk-dark-text-muted">Choose the locations to apply to the selected rows.</p>
          </div>
          <button type="button" onClick={props.onClose} className="rounded-full p-1.5 hover:bg-kk-dark-hover">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search locations…"
            className="w-full rounded-lg border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-kk-dark-input-border px-3 py-1.5 text-xs hover:bg-kk-dark-hover"
              onClick={() => setSelected(locations.map((l) => l.id!).filter(Boolean))}
            >
              Select all
            </button>
            <button
              type="button"
              className="rounded-lg border border-kk-dark-input-border px-3 py-1.5 text-xs hover:bg-kk-dark-hover"
              onClick={() => setSelected([])}
            >
              Clear
            </button>
            <span className="text-xs text-kk-dark-text-muted">{selected.length} selected</span>
          </div>

          <div className="max-h-[45vh] overflow-auto rounded-xl border border-kk-dark-input-border">
            {filtered.map((l) => (
              <label
                key={l.id}
                className="flex items-center gap-2 px-4 py-2 text-sm border-b border-kk-dark-input-border last:border-b-0 hover:bg-kk-dark-hover"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(l.id!)}
                  onChange={() => toggle(l.id!)}
                />
                <span>{l.name}</span>
              </label>
            ))}
            {!filtered.length && (
              <div className="px-4 py-8 text-center text-xs text-kk-dark-text-muted">No locations found.</div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={props.onClose}
              className="rounded-lg border border-kk-dark-input-border px-4 py-2 text-sm hover:bg-kk-dark-hover"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                setSaving(true);
                try {
                  await props.onApply(selected);
                  props.onClose();
                } finally {
                  setSaving(false);
                }
              }}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-700 disabled:opacity-50"
              disabled={saving}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

