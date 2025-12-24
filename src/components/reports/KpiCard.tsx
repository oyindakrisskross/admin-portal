// src/components/reports/KpiCard.tsx

import React from "react";

interface Props {
  label: string;
  value: string;
  sub?: string;
}

export const KpiCard: React.FC<Props> = ({
  label,
  value,
  sub,
}) => {
  return (
    <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 shadow-sm">
      <div className="text-sm text-kk-dark-text-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-kk-dark-text">{value}</div>
      {sub ? <div className="mt-1 text-xs text-kk-dark-text-muted">{sub}</div> : null}
    </div>
  );
};