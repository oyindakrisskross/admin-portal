import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Search, X } from "lucide-react";

export type SelectOption = { id: number; label: string };

type Props = {
  options: SelectOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function SearchMultiSelectDropdown({
  options,
  selectedIds,
  onChange,
  placeholder = "Select...",
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || String(o.id).includes(q));
  }, [options, query]);

  const selectedLabels = useMemo(() => {
    const byId = new Map(options.map((o) => [o.id, o.label] as const));
    return selectedIds
      .map((id) => byId.get(id) ?? `#${id}`)
      .filter(Boolean)
      .slice(0, 2)
      .join(", ");
  }, [options, selectedIds]);

  useEffect(() => {
    if (!open) return;
    setQuery("");

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
      const base: React.CSSProperties = {
        position: "fixed",
        left: rect.left,
        top: rect.bottom + 6,
        width: rect.width,
        zIndex: 9999,
      };

      setMenuStyle(base);
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

  const toggle = (id: number) => {
    if (selectedSet.has(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const clear = () => onChange([]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        ref={buttonRef}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={[
          "flex w-full items-center justify-between rounded-md border px-2 py-1 text-xs",
          "border-kk-dark-input-border bg-kk-dark-bg",
          disabled ? "opacity-60 cursor-not-allowed" : "hover:bg-[rgba(255,255,255,0.03)]",
        ].join(" ")}
      >
        <span className={selectedIds.length ? "text-kk-dark-text" : "text-kk-dark-text-muted"}>
          {selectedIds.length ? `${selectedLabels}${selectedIds.length > 2 ? ` (+${selectedIds.length - 2})` : ""}` : placeholder}
        </span>
        <span className="flex items-center gap-1">
          {selectedIds.length > 0 && !disabled ? (
            <span
              className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clear();
              }}
              title="Clear"
            >
              <X className="h-3 w-3" />
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
              <div className="flex items-center gap-2 border-b border-kk-dark-border px-2 py-2">
                <Search className="h-4 w-4 text-kk-dark-text-muted" />
                <input
                  className="w-full bg-transparent text-xs outline-none"
                  placeholder="Search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="max-h-52 overflow-auto">
                {filtered.map((o) => (
                  <label
                    key={o.id}
                    className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs hover:bg-[rgba(255,255,255,0.04)]"
                  >
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={selectedSet.has(o.id)}
                      onChange={() => toggle(o.id)}
                    />
                    <span className="flex-1 text-kk-dark-text">{o.label}</span>
                    <span className="text-kk-dark-text-muted">#{o.id}</span>
                  </label>
                ))}
                {!filtered.length && (
                  <div className="px-3 py-4 text-center text-xs text-kk-dark-text-muted">
                    No matches
                  </div>
                )}
              </div>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
