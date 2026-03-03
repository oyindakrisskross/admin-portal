import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X } from "lucide-react";

import type { CustomerRecord } from "../../types/customerPortal";
import { fetchCustomers } from "../../api/customerPortal";

type Props = {
  value: CustomerRecord | null;
  onChange: (customer: CustomerRecord | null) => void;
  disabled?: boolean;
  placeholder?: string;
  onError?: (message: string) => void;
};

export function CustomerSearchSelect({
  value,
  onChange,
  disabled,
  placeholder = "Search customers...",
  onError,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<CustomerRecord[]>([]);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);

  const label = useMemo(() => {
    if (!value) return "";
    const name = `${value.first_name ?? ""} ${value.last_name ?? ""}`.trim();
    if (name && value.email) return `${name} - ${value.email}`;
    return name || value.email || (value.id != null ? `#${value.id}` : "Selected customer");
  }, [value]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      const root = rootRef.current;
      const menu = menuRef.current;
      if (!root && !menu) return;
      if (!(e.target instanceof Node)) return;
      const inRoot = root ? root.contains(e.target) : false;
      const inMenu = menu ? menu.contains(e.target) : false;
      if (!inRoot && !inMenu) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const updatePosition = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      setMenuStyle({
        position: "fixed",
        left: rect.left,
        top: rect.bottom + 6,
        width: rect.width,
        zIndex: 9999,
      });
    };

    updatePosition();
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchCustomers(debouncedQuery ? { search: debouncedQuery, page_size: 50 } : { page_size: 50 });
        if (cancelled) return;
        setOptions(data.results ?? []);
      } catch (e: any) {
        if (cancelled) return;
        setOptions([]);
        onError?.(e?.response?.data?.detail || e?.message || "Failed to load customers.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, onError, open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        ref={buttonRef}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={[
          "flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm",
          "border-kk-dark-input-border bg-kk-dark-bg",
          disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-[rgba(255,255,255,0.03)]",
        ].join(" ")}
      >
        <span className={value ? "text-kk-dark-text" : "text-kk-dark-text-muted"}>
          {value ? label : placeholder}
        </span>
        <span className="flex items-center gap-1">
          {value && !disabled ? (
            <span
              className="rounded p-1 hover:bg-[rgba(255,255,255,0.06)]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(null);
              }}
              title="Clear"
            >
              <X className="h-4 w-4" />
            </span>
          ) : null}
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>

      {open && !disabled && menuStyle
        ? createPortal(
            <div
              ref={menuRef}
              style={menuStyle}
              className="overflow-hidden rounded-lg border border-kk-dark-border bg-kk-dark-bg-elevated shadow-soft"
            >
              <div className="flex items-center gap-2 border-b border-kk-dark-border px-3 py-2">
                <Search className="h-4 w-4 text-kk-dark-text-muted" />
                <input
                  className="w-full bg-transparent text-sm outline-none"
                  placeholder="Search by name, email, phone..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-auto">
                {loading ? (
                  <div className="px-3 py-3 text-sm text-kk-dark-text-muted">Loading...</div>
                ) : null}

                {!loading &&
                  options.map((customer) => {
                    const name = `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim();
                    const rowLabel = name || customer.email || (customer.id != null ? `#${customer.id}` : "Customer");
                    return (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => {
                          onChange(customer);
                          setOpen(false);
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[rgba(255,255,255,0.04)]"
                      >
                        <span className="flex-1 text-kk-dark-text">
                          {rowLabel}
                          {customer.email && name ? (
                            <span className="ml-2 text-xs text-kk-dark-text-muted">{customer.email}</span>
                          ) : null}
                        </span>
                        {customer.id != null ? (
                          <span className="text-xs text-kk-dark-text-muted">#{customer.id}</span>
                        ) : null}
                      </button>
                    );
                  })}

                {!loading && !options.length ? (
                  <div className="px-3 py-4 text-center text-sm text-kk-dark-text-muted">No matches</div>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
