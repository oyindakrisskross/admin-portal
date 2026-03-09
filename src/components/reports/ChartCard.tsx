// src/components/reports/ChartCard.tsx

import React, { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoneyNGN, formatNumber } from "../../helpers";

interface Props {
  title: string;
  titleAccessory?: React.ReactNode;
  data: any[];
  dataKey?: string;
  valueKey: string;
  compareValueKey?: string;
  compareLabel?: string;
  kind: "money" | "count";
}

export const ChartCard: React.FC<Props> = ({
  title,
  titleAccessory,
  data,
  dataKey="tLabel",
  valueKey,
  compareValueKey,
  compareLabel = "Compare period",
  kind,
}) => {
  const maxV = data.reduce((m, p) => {
    const current = Number(p[valueKey] ?? 0);
    const compare = compareValueKey ? Number(p[compareValueKey] ?? 0) : 0;
    return Math.max(m, current, compare);
  }, 0);
  const top = maxV === 0 ? 1 : Math.ceil(maxV * 1.1);

  const currentStroke = "#9f7aea";
  const compareStroke = "#22c55e";
  const hasCompare = Boolean(compareValueKey);
  const [chartMode, setChartMode] = useState<"line" | "bar">("line");

  return (
    <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="text-base font-medium text-kk-dark-text">{title}</div>
          {titleAccessory}
        </div>
        <div className="inline-flex rounded-md border border-kk-dark-input-border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setChartMode("line")}
            className={`rounded px-2 py-1 ${chartMode === "line" ? "bg-kk-dark-hover text-kk-dark-text" : "text-kk-dark-text-muted"}`}
          >
            Line
          </button>
          <button
            type="button"
            onClick={() => setChartMode("bar")}
            className={`rounded px-2 py-1 ${chartMode === "bar" ? "bg-kk-dark-hover text-kk-dark-text" : "text-kk-dark-text-muted"}`}
          >
            Bar
          </button>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {chartMode === "line" ? (
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
                labelFormatter={(l: any, payload: any) => {
                  const row = payload?.[0]?.payload;
                  if (compareValueKey && row) {
                    const current = row.current_label ?? row.label ?? String(l);
                    const compare = row.compare_label ?? "n/a";
                    return `Current: ${current} | Compare: ${compare}`;
                  }
                  return `Time: ${l}`;
                }}
              />
              {hasCompare ? <Legend /> : null}
              <Line type="monotone" dataKey={valueKey} name="Current period" dot={false} strokeWidth={2} stroke={currentStroke} />
              {compareValueKey ? (
                <Line
                  type="monotone"
                  dataKey={compareValueKey}
                  name={compareLabel}
                  dot={false}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  stroke={compareStroke}
                />
              ) : null}
            </LineChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
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
                labelFormatter={(l: any, payload: any) => {
                  const row = payload?.[0]?.payload;
                  if (compareValueKey && row) {
                    const current = row.current_label ?? row.label ?? String(l);
                    const compare = row.compare_label ?? "n/a";
                    return `Current: ${current} | Compare: ${compare}`;
                  }
                  return `Time: ${l}`;
                }}
              />
              {hasCompare ? <Legend /> : null}
              <Bar dataKey={valueKey} name="Current period" fill={currentStroke} radius={[3, 3, 0, 0]} />
              {compareValueKey ? (
                <Bar dataKey={compareValueKey} name={compareLabel} fill={compareStroke} radius={[3, 3, 0, 0]} />
              ) : null}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
