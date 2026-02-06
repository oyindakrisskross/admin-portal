// src/screens/reports/categories/CategoryChildrenReportPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fetchCategoriesReport } from "../../../api/reports";
import { fetchOutlets } from "../../../api/location";
import type { CategoriesReportResponse, Granularity } from "../../../types/reports";
import type { Outlet } from "../../../types/location";
import { formatMoneyNGN, formatNumber, isoToLabel, toYMD } from "../../../helpers";

const COLORS = [
  "#8b5cf6", // purple
  "#22c55e", // green
  "#3b82f6", // blue
  "#f97316", // orange
  "#ef4444", // red
  "#06b6d4", // cyan
  "#eab308", // yellow
  "#a855f7", // violet
  "#14b8a6", // teal
  "#f43f5e", // rose
];

export default function CategoryChildrenReportPage() {
  const nav = useNavigate();
  const { categoryId } = useParams();
  const parentCategoryId = Number(categoryId);

  const [sp, setSp] = useSearchParams();
  const [start, setStart] = useState(() => sp.get("start") ?? toYMD(new Date()));
  const [end, setEnd] = useState(() => sp.get("end") ?? toYMD(new Date()));

  const [itemsMode, setItemsMode] = useState<"parents" | "all">("parents");

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [locationIds, setLocationIds] = useState<number[] | "ALL">("ALL");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<CategoriesReportResponse | null>(null);

  const [granularity, setGranularity] = useState<Granularity | undefined>(undefined);

  useEffect(() => {
    fetchOutlets().then(setOutlets).catch(() => setOutlets([]));
  }, []);

  useEffect(() => {
    sp.set("start", start);
    sp.set("end", end);
    setSp(sp, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end]);

  useEffect(() => {
    if (!Number.isFinite(parentCategoryId)) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetchCategoriesReport({
          start,
          end,
          locationIds: locationIds === "ALL" ? undefined : locationIds,
          itemsMode,
          groupBy: "all",
          parentCategoryId,
          granularity,
        });
        if (!alive) return;
        setData(res);

        if (granularity && !res.range.available_granularities.includes(granularity)) {
          setGranularity(res.range.granularity);
        } else if (!granularity) {
          setGranularity(res.range.granularity);
        }
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [parentCategoryId, start, end, itemsMode, locationIds, granularity]);

  const gran = data?.range.granularity ?? granularity ?? "day";
  const categories = data?.categories ?? [];

  const colorByCategoryId = useMemo(() => {
    const map: Record<number, string> = {};
    categories.forEach((c, idx) => {
      map[c.category_id] = COLORS[idx % COLORS.length];
    });
    return map;
  }, [categories]);

  const lineData = useMemo(() => {
    const points = data?.series?.net_sales ?? [];
    return points.map((p) => {
      const row: Record<string, any> = {
        t: p.t,
        label: isoToLabel(p.t, gran),
      };
      for (const c of categories) {
        const key = `c_${c.category_id}`;
        row[key] = Number(p.values?.[String(c.category_id)] ?? 0);
      }
      return row;
    });
  }, [categories, data?.series?.net_sales, gran]);

  const pieData = useMemo(() => {
    const rows = data?.pie ?? [];
    return rows
      .map((r) => ({
        category_id: r.category_id,
        name: r.name,
        value: Number(r.net_sales ?? 0),
      }))
      .filter((r) => r.value > 0);
  }, [data?.pie]);

  const pieTotal = useMemo(() => pieData.reduce((sum, r) => sum + (r.value || 0), 0), [pieData]);

  const tableRows = data?.results ?? [];
  const parentName = data?.parent_category?.name ?? `Category #${parentCategoryId}`;

  if (!Number.isFinite(parentCategoryId)) {
    return (
      <div className="p-4">
        <div className="rounded-md border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm text-red-200">
          Invalid category id.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button onClick={() => nav(-1)} className="text-sm text-purple-500 hover:underline">
            â† Back
          </button>
          <h1 className="text-lg font-semibold mt-1">Child categories: {parentName}</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-xs text-kk-dark-text-muted">Start</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="rounded-md border border-kk-dark-input-border px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs text-kk-dark-text-muted">End</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="rounded-md border border-kk-dark-input-border px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-kk-dark-text-muted">Locations</label>
            <select
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              value={locationIds === "ALL" ? "ALL" : "CUSTOM"}
              onChange={(e) => {
                if (e.target.value === "ALL") setLocationIds("ALL");
                else setLocationIds([]);
              }}
            >
              <option value="ALL">All locations</option>
              <option value="CUSTOM">Specific locations</option>
            </select>
          </div>

          {locationIds !== "ALL" && (
            <div className="flex flex-col gap-2">
              <label className="text-xs text-kk-dark-text-muted">Select outlets</label>
              <select
                multiple
                className="min-w-[260px] rounded-md border border-kk-dark-input-border px-3 py-2 text-sm"
                value={locationIds.map(String)}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
                  setLocationIds(selected);
                }}
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <label className="text-xs text-kk-dark-text-muted">Items mode</label>
            <select
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              value={itemsMode}
              onChange={(e) => setItemsMode(e.target.value as any)}
            >
              <option value="parents">Parents only (default)</option>
              <option value="all">All lines (incl. customizations)</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs text-kk-dark-text-muted">Granularity</label>
            {data?.range.available_granularities?.length === 1 ? (
              <div className="rounded-md border px-3 py-2 text-sm text-kk-dark-text-muted bg-kk-dark-bg">
                {data.range.available_granularities[0]}
              </div>
            ) : (
              <select
                className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                value={granularity ?? data?.range.granularity ?? "day"}
                onChange={(e) => setGranularity(e.target.value as any)}
              >
                {(data?.range.available_granularities ?? ["day"]).map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {err && (
        <div className="rounded-md border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Net Sales by Category</h2>
            <div className="text-xs text-kk-dark-text-muted">
              {data ? `${data.range.start} â†’ ${data.range.end}` : null}
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={18} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNumber(Number(v))} />
                <Tooltip formatter={(v: any) => formatMoneyNGN(Number(v))} labelFormatter={(l) => String(l)} />
                <Legend />
                {categories.map((c) => (
                  <Line
                    key={c.category_id}
                    type="monotone"
                    dataKey={`c_${c.category_id}`}
                    name={c.name}
                    stroke={colorByCategoryId[c.category_id]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Sales Distribution</h2>
            <div className="text-xs text-kk-dark-text-muted">Net sales</div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p: any = payload[0];
                    const value = Number(p?.value ?? 0);
                    const name = String(p?.name ?? p?.payload?.name ?? "");
                    const pct = pieTotal > 0 ? (value / pieTotal) * 100 : 0;
                    return (
                      <div className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-xs shadow">
                        <div className="font-medium">{name}</div>
                        <div className="text-kk-dark-text-muted">
                          {formatMoneyNGN(value)} ({pct.toFixed(1)}%)
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend />
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110}>
                  {pieData.map((entry) => (
                    <Cell
                      key={entry.category_id}
                      fill={colorByCategoryId[entry.category_id] ?? COLORS[0]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-kk-dark-input-border">
          <h2 className="text-sm font-semibold">Child Categories</h2>
          <div className="text-xs text-kk-dark-text-muted">Net sales, order count, and product count per category.</div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 text-xs text-kk-dark-text-muted">Category</th>
                <th className="text-right px-4 py-3 text-xs text-kk-dark-text-muted">Net Sales</th>
                <th className="text-right px-4 py-3 text-xs text-kk-dark-text-muted">Orders</th>
                <th className="text-right px-4 py-3 text-xs text-kk-dark-text-muted">Products</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-sm text-kk-dark-text-muted">
                    Loadingâ€¦
                  </td>
                </tr>
              ) : tableRows.length ? (
                tableRows.map((r) => (
                  <tr key={r.category_id} className="border-t border-kk-dark-border">
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: colorByCategoryId[r.category_id] ?? COLORS[0] }}
                        />
                        <span>{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-right">{formatMoneyNGN(Number(r.net_sales ?? 0))}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatNumber(r.orders ?? 0)}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatNumber(Number(r.items_sold ?? 0))}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-xs text-kk-dark-text-muted">
                    No data for the selected range.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

