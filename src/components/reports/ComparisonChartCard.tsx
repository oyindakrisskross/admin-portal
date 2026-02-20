// src/components/reports/ComparisonChartCard.tsx

import React from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoneyNGN, formatNumber } from "../../helpers";

export type ComparisonSeries = {
  id: number;
  label: string;
  subLabel?: string;
  valueKey: string;
  color: string;
  visible: boolean;
};

interface Props {
  title: string;
  data: any[];
  dataKey?: string;
  kind: "money" | "count";
  series: ComparisonSeries[];
  onToggle: (id: number) => void;
  emptyLabel?: string;
}

export const ComparisonChartCard: React.FC<Props> = ({
  title,
  data,
  dataKey = "label",
  kind,
  series,
  onToggle,
  emptyLabel = "Select products to compare.",
}) => {
  const visibleSeries = series.filter((s) => s.visible);
  const maxV = data.reduce((m, p) => {
    let localMax = m;
    for (const s of visibleSeries) {
      localMax = Math.max(localMax, Number(p[s.valueKey] ?? 0));
    }
    return localMax;
  }, 0);
  const top = maxV === 0 ? 1 : Math.ceil(maxV * 1.1);

  return (
    <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 shadow-sm">
      <div className="mb-3 text-base font-medium text-kk-dark-text">{title}</div>

      {!series.length ? (
        <div className="flex h-64 items-center justify-center text-sm text-kk-dark-text-muted">
          {emptyLabel}
        </div>
      ) : (
        <div className="flex flex-col gap-4 md:flex-row">
          <div className="h-64 flex-1">
            {data.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={dataKey} tickMargin={8} interval="preserveStartEnd" />
                  <YAxis
                    domain={[0, top]}
                    width="auto"
                    tickMargin={8}
                    tickFormatter={(v) => (kind === "money" ? formatMoneyNGN(v) : formatNumber(v))}
                  />
                  <Tooltip
                    formatter={(v: any) => (kind === "money" ? formatMoneyNGN(v) : formatNumber(v))}
                    labelFormatter={(l) => `Time: ${l}`}
                  />
                  {visibleSeries.map((s) => (
                    <Line
                      key={s.id}
                      type="monotone"
                      dataKey={s.valueKey}
                      dot={false}
                      strokeWidth={2}
                      stroke={s.color}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-kk-dark-text-muted">
                {emptyLabel}
              </div>
            )}
          </div>

          <div className="md:w-60">
            <div className="mb-2 text-xs uppercase tracking-wide text-kk-dark-text-muted">
              Products
            </div>
            <div className="space-y-2">
              {series.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                    checked={s.visible}
                    onChange={() => onToggle(s.id)}
                  />
                  <span
                    className="mt-1 h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="flex flex-col">
                    <span className="text-kk-dark-text">{s.label}</span>
                    {s.subLabel ? (
                      <span className="text-xs text-kk-dark-text-muted">{s.subLabel}</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
