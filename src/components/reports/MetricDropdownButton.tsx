import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import { useDropdownOpenAbove } from "../../hooks/useDropdownPlacement";

type MetricOption = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  options: MetricOption[];
  onChange: (value: string) => void;
};

export const MetricDropdownButton: React.FC<Props> = ({ value, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const openAbove = useDropdownOpenAbove(open, buttonRef);

  const selectedLabel = useMemo(
    () => options.find((opt) => opt.value === value)?.label ?? "Metric",
    [options, value]
  );

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (!(e.target instanceof Node)) return;
      if (!root.contains(e.target)) setOpen(false);
    };

    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        ref={buttonRef}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-kk-dark-input-border text-kk-dark-text-muted hover:bg-kk-dark-hover"
        title={`Metric: ${selectedLabel}`}
        aria-label="Select metric"
        onClick={() => setOpen((prev) => !prev)}
      >
        <ChevronDown className="h-4 w-4" />
      </button>

      {open ? (
        <div
          className={`absolute left-0 z-20 min-w-48 overflow-hidden rounded-md border border-kk-dark-input-border bg-kk-dark-bg-elevated shadow-soft ${
            openAbove ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-kk-dark-hover"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
            >
              <span className="text-kk-dark-text">{opt.label}</span>
              {opt.value === value ? <Check className="h-4 w-4 text-kk-accent" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};
