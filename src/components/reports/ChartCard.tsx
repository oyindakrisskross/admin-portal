// src/components/reports/ChartCard.tsx

import React from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoneyNGN, formatNumber } from "../../helpers";

interface Props {
  title: string;
  data: any[];
  dataKey?: string;
  valueKey: string;
  kind: "money" | "count";
}

export const ChartCard: React.FC<Props> = ({
  title,
  data,
  dataKey="tLabel",
  valueKey,
  kind,
}) => {
  const maxV = data.reduce((m, p) => Math.max(m, Number(p[valueKey] ?? 0)), 0);
  const top = maxV === 0 ? 1 : Math.ceil(maxV * 1.1);

  const lineStroke = "#9f7aea";

  return (
    <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 shadow-sm">
      <div className="mb-3 text-base font-medium text-kk-dark-text">{title}</div>
      <div className="h-64">
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
            <Line type="monotone" dataKey={valueKey} dot={false} strokeWidth={2} stroke={lineStroke} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};