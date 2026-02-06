import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X } from "lucide-react";

export type ItemOption = {
  id: number;
  label: string;
  subLabel?: string;
};

type Props = {
  valueId: number | null;
  valueLabel?: string;
  valueSubLabel?: string;
  onChange: (id: number | null, option?: ItemOption | null) => void;
  loadOptions: (query: string, signal?: AbortSignal) => Promise<ItemOption[]>;
  cacheKey?: string;
  disabled?: boolean;
  placeholder?: string;
  minChars?: number;
  debounceMs?: number;
};

export function ItemSearchSelect({
  valueId,
  valueLabel,
  valueSubLabel,
  onChange,
  loadOptions,
  cacheKey,
  disabled,
  placeholder = "Search items...",
  minChars = 2,
  debounceMs = 300,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ItemOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const cacheRef = useRef<Map<string, ItemOption[]>>(new Map());

  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);

  const selected = useMemo(() => options.find((o) => o.id === valueId) ?? null, [options, valueId]);
  const displayLabel = selected?.label ?? valueLabel ?? (valueId != null ? `#${valueId}` : "");
  const displaySub = selected?.subLabel ?? valueSubLabel;

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHint(minChars > 0 ? `Type at least ${minChars} characters to search` : null);
    setOptions([]);

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
    cacheRef.current = new Map();
    setOptions([]);
  }, [cacheKey]);

  useEffect(() => {
    if (!open || disabled) return;
    const q = query.trim();

    if (minChars > 0 && q.length < minChars) {
      setOptions([]);
      setHint(minChars > 0 ? `Type at least ${minChars} characters to search` : null);
      return;
    }

    const key = `${cacheKey ?? ""}::${q}`;
    const cached = cacheRef.current.get(key);
    if (cached) {
      setOptions(cached);
      setHint(cached.length ? null : "No matches");
      return;
    }

    const controller = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await loadOptions(q, controller.signal);
        cacheRef.current.set(key, res);
        setOptions(res);
        setHint(res.length ? null : "No matches");
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.name === "AbortError") return;
        setOptions([]);
        setHint("Failed to load results");
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [debounceMs, disabled, loadOptions, minChars, open, query]);

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
        <span className={displayLabel ? "text-kk-dark-text" : "text-kk-dark-text-muted"}>
          {displayLabel ? (
            <span className="flex flex-col items-start">
              <span>{displayLabel}</span>
              {displaySub ? <span className="text-xs text-kk-dark-text-muted">{displaySub}</span> : null}
            </span>
          ) : (
            placeholder
          )}
        </span>
        <span className="flex items-center gap-1">
          {displayLabel && !disabled ? (
            <span
              className="rounded p-1 hover:bg-[rgba(255,255,255,0.06)]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(null, null);
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
                  placeholder="Search items..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-auto">
                {loading ? (
                  <div className="px-3 py-3 text-sm text-kk-dark-text-muted">Loading…</div>
                ) : null}
                {options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      onChange(o.id, o);
                      setOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[rgba(255,255,255,0.04)]"
                  >
                    <span className="flex-1 text-kk-dark-text">
                      {o.label}
                      {o.subLabel ? (
                        <span className="ml-2 text-xs text-kk-dark-text-muted">{o.subLabel}</span>
                      ) : null}
                    </span>
                    <span className="text-xs text-kk-dark-text-muted">#{o.id}</span>
                  </button>
                ))}

                {!loading && hint ? (
                  <div className="px-3 py-4 text-center text-sm text-kk-dark-text-muted">{hint}</div>
                ) : null}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
