// src/components/catalog/bulk/RowSelectCheckbox.tsx

import React from "react";

export function RowSelectCheckbox(props: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-label={props.label ?? "Select row"}
      aria-pressed={props.checked}
      onClick={(e) => {
        e.stopPropagation();
        props.onChange(!props.checked);
      }}
      className={[
        "flex h-7 w-7 items-center justify-center rounded-full",
        "transition-colors",
        props.checked ? "bg-blue-600" : "border border-kk-dark-input-border bg-kk-dark-bg",
        props.className ?? "",
      ].join(" ")}
    >
      {props.checked ? <span className="text-white text-xs">✓</span> : null}
    </button>
  );
}
