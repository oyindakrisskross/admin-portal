// src/components/catalog/bulk/BulkActionBar.tsx

import React from "react";

type ActionButton = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
};

export function BulkActionBar(props: {
  count: number;
  actions: ActionButton[];
  onClear: () => void;
  rightText?: string;
}) {
  if (!props.count) return null;

  return (
    <div className="sticky top-0 z-20">
      <div className="mx-4 rounded-xl border border-kk-dark-input-border bg-kk-dark-bg-elevated shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <div className="flex flex-wrap items-center gap-1">
            {props.actions.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={a.onClick}
                disabled={!!a.disabled}
                className={[
                  "inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs",
                  "hover:bg-kk-dark-hover disabled:opacity-50 disabled:hover:bg-transparent",
                ].join(" ")}
              >
                {a.icon ? <span className="h-4 w-4">{a.icon}</span> : null}
                <span>{a.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {props.rightText ? (
              <span className="text-xs text-kk-dark-text-muted">{props.rightText}</span>
            ) : null}
            <button
              type="button"
              onClick={props.onClear}
              className="inline-flex items-center gap-2 rounded-full border border-kk-dark-input-border bg-kk-dark-bg px-3 py-1.5 text-xs hover:bg-kk-dark-hover"
              title="Clear selection"
            >
              <span className="font-medium">{props.count} selected</span>
              <span className="text-kk-dark-text-muted">×</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

