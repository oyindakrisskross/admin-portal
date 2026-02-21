// src/components/reports/KpiCard.tsx

import React from "react";
import { SplitFlapValue } from "./SplitFlapValue";

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
  const hasSub = Boolean(sub);

  return (
    <div
      className={
        hasSub
          ? "flex min-h-[7.5rem] flex-col rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 shadow-sm"
          : "flex flex-col rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 shadow-sm"
      }
    >
      <div className="text-sm leading-5 text-kk-dark-text-muted">{label}</div>
      <div className="mt-2 flex h-10 items-center overflow-hidden">
        <SplitFlapValue
          value={value}
          className="inline-flex max-w-full whitespace-nowrap text-2xl font-semibold leading-none text-kk-dark-text"
        />
      </div>
      {hasSub ? <div className="mt-1 min-h-4 text-xs leading-4 text-kk-dark-text-muted">{sub}</div> : null}
    </div>
  );
};
