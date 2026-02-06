import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronRight, Search, X } from "lucide-react";

export type SelectOption = { id: number; label: string; depth?: number; parentId?: number | null };

type Props = {
  options: SelectOption[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  placeholder?: string;
  disabled?: boolean;
  cascade?: { descendantsById: Record<number, number[]> };
};

export function SearchMultiSelectDropdown({
  options,
  selectedIds,
  onChange,
  placeholder = "Select...",
  disabled,
  cascade,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<number[]>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const expandedSet = useMemo(() => new Set(expandedIds), [expandedIds]);

  const treeMeta = useMemo(() => {
    const byId = new Map<number, SelectOption>();
    for (const o of options) byId.set(o.id, o);

    const parentById = new Map<number, number | null>();
    const hasChildren = new Set<number>();
    for (const o of options) {
      const pid = o.parentId ?? null;
      parentById.set(o.id, pid);
      if (pid != null) hasChildren.add(pid);
    }

    // Treat nodes whose parent isn't present as roots.
    const rootIds = options
      .filter((o) => {
        const pid = parentById.get(o.id) ?? null;
        return pid == null || !byId.has(pid);
      })
      .map((o) => o.id);

    const isTree = hasChildren.size > 0 || options.some((o) => (o.depth ?? 0) > 0);

    return {
      isTree,
      byId,
      parentById,
      hasChildren,
      rootIds,
      idsWithChildren: Array.from(hasChildren.values()),
    };
  }, [options]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q) || String(o.id).includes(q));
  }, [options, query]);

  const visible = useMemo(() => {
    if (!treeMeta.isTree) return filtered;

    const q = query.trim();
    if (q) return filtered; // search results ignore collapse state for now

    return options.filter((o) => {
      const pid0 = treeMeta.parentById.get(o.id) ?? null;
      if (pid0 == null || !treeMeta.byId.has(pid0)) return true;

      let pid: number | null = pid0;
      while (pid != null) {
        if (!expandedSet.has(pid)) return false;
        const nextParent: number | null = treeMeta.parentById.get(pid) ?? null;
        if (nextParent != null && !treeMeta.byId.has(nextParent)) break;
        pid = nextParent;
      }
      return true;
    });
  }, [expandedSet, filtered, options, query, treeMeta]);

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
    const descendants = cascade?.descendantsById?.[id] ?? [];
    if (selectedSet.has(id)) {
      const remove = new Set([id, ...descendants]);
      onChange(selectedIds.filter((x) => !remove.has(x)));
    } else {
      const next = Array.from(new Set([...selectedIds, id, ...descendants]));
      onChange(next);
    }
  };

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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
                {treeMeta.isTree && !query.trim() && (
                  <div className="flex items-center gap-2 text-[11px] text-kk-dark-text-muted">
                    <button
                      type="button"
                      className="hover:text-kk-dark-text"
                      onClick={() => setExpandedIds(treeMeta.idsWithChildren)}
                      title="Expand all"
                    >
                      Expand
                    </button>
                    <button
                      type="button"
                      className="hover:text-kk-dark-text"
                      onClick={() => setExpandedIds([])}
                      title="Collapse all"
                    >
                      Collapse
                    </button>
                  </div>
                )}
              </div>
              <div className="max-h-52 overflow-auto">
                {visible.map((o) => {
                  const depth = o.depth ?? 0;
                  const hasKids = treeMeta.hasChildren.has(o.id);
                  const expanded = expandedSet.has(o.id);

                  return (
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
                    <span
                      className="flex flex-1 items-center gap-1 text-kk-dark-text"
                      style={depth ? { paddingLeft: `${depth * 12}px` } : undefined}
                    >
                      {treeMeta.isTree ? (
                        hasKids ? (
                          <button
                            type="button"
                            className="p-0.5 rounded hover:bg-[rgba(255,255,255,0.06)]"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleExpanded(o.id);
                            }}
                            title={expanded ? "Collapse" : "Expand"}
                          >
                            <ChevronRight
                              className={["h-3 w-3", expanded ? "rotate-90" : ""].join(" ")}
                            />
                          </button>
                        ) : (
                          <span className="inline-block h-3 w-3" />
                        )
                      ) : null}
                      <span>{o.label}</span>
                    </span>
                    <span className="text-kk-dark-text-muted">#{o.id}</span>
                  </label>
                  );
                })}
                {!visible.length && (
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
