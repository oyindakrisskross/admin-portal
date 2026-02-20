import React from "react";

interface Props {
  enabled: boolean;
  onToggle: () => void;
  compareStart: string;
  compareEnd: string;
  periodDays: number;
  onCompareStartChange: (value: string) => void;
}

export const ComparePeriodControls: React.FC<Props> = ({
  enabled,
  onToggle,
  compareStart,
  compareEnd,
  periodDays,
  onCompareStartChange,
}) => {
  return (
    <div className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg-elevated p-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md border border-kk-dark-input-border px-3 py-1 text-sm"
        >
          Compare
        </button>
        {enabled ? (
          <span className="text-xs text-kk-dark-text-muted">
            Matching period length: {periodDays} day{periodDays === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {enabled ? (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-kk-dark-text-muted">Compare Start</label>
            <input
              type="date"
              value={compareStart}
              onChange={(e) => onCompareStartChange(e.target.value)}
              className="mt-1 w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-kk-dark-text-muted">Compare End (Auto)</label>
            <input
              type="date"
              value={compareEnd}
              readOnly
              className="mt-1 w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm text-kk-dark-text-muted"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};
