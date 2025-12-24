// src/screens/reports/ReportsOverviewPage.tsx

import { useEffect, useMemo, useState } from "react";
import { fetchOverviewReport } from "../../api/reports";
import { type Granularity, type OverviewResponse } from "../../types/reports";
import { fetchOutlets } from "../../api/location";
import { type Outlet } from "../../types/location";
import { formatMoneyNGN, formatNumber, isoToLabel, toYMD } from "../../helpers";
import { KpiCard } from "../../components/reports/KpiCard";
import { ChartCard } from "../../components/reports/ChartCard";


export default function ReportsOverviewPage() {
  const today = useMemo(() => new Date(), []);
  const [start, setStart] = useState<string>(toYMD(today));
  const [end, setEnd] = useState<string>(toYMD(today));
  const [itemsMode, setItemsMode] = useState<"parents" | "all">("parents");

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [locationIds, setLocationIds] = useState<number[] | "ALL">("ALL");

  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [granularity, setGranularity] = useState<Granularity>("hour");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const resp = await fetchOverviewReport({
        start,
        end,
        itemsMode,
        granularity,
        locationIds: locationIds === "ALL" ? undefined : locationIds,
      });
      setData(resp);

      // If current granularity isn't allowed, snap to server-chosen default
      if (granularity && !resp.range.available_granularities.includes(granularity)) {
        setGranularity(resp.range.granularity);
      } else if (!granularity) {
        setGranularity(resp.range.granularity);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load report");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, itemsMode, locationIds, granularity]);

  useEffect(() => {
    fetchOutlets().then(setOutlets).catch(() => {
      // keep non-blocking; selector can still show “All locations”
      setOutlets([]);
    });
  }, []);

  const chartData = useMemo(() => {
    if (!data) return { netSales: [], orders: [], items: [] };
    const g = data.range.granularity;

    const netSales = data.series.net_sales.map((p) => ({
      tLabel: isoToLabel(p.t, g),
      v: Number(p.v),
    }));
    const orders = data.series.orders.map((p) => ({
      tLabel: isoToLabel(p.t, g),
      v: Number(p.v),
    }));
    const items = data.series.items_sold.map((p) => ({
      tLabel: isoToLabel(p.t, g),
      v: Number(p.v),
    }));
    return { netSales, orders, items };
  }, [data]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-wrap items-end gap-3">
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
                else setLocationIds([]); // switch to custom
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
                  <option key={o.id} value={o.id}>{o.name}</option>
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

            {data?.range.available_granularities.length === 1 ? (
              <div className="rounded-md border px-3 py-2 text-sm text-kk-dark-text-muted bg-kk-dark-bg">
                {data.range.available_granularities[0]}
              </div>
            ) : (
              <select
                className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                value={granularity}
                onChange={(e) => setGranularity(e.target.value as any)}
              >
                {data?.range.available_granularities.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {err}
        </div>
      ) : null} */}

      {/* Performance */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Sales" value={data ? formatMoneyNGN(+data.performance.total_sales) : "—"} />
        <KpiCard label="Net Sales" value={data ? formatMoneyNGN(+data.performance.net_sales) : "—"} />
        <KpiCard label="Orders" value={data ? formatNumber(data.performance.orders) : "—"} />
        <KpiCard label="Items Sold" value={data ? formatNumber(+data.performance.products_sold) : "—"} />
        <KpiCard label="Discounted Orders" value={data ? formatNumber(data.performance.discounted_orders) : "—"} />
        <KpiCard label="Net Discount Amount" value={data ? formatMoneyNGN(+data.performance.net_discount_amount) : "—"} />
        <KpiCard label="Total Tax" value={data ? formatMoneyNGN(+data.performance.tax_total) : "—"} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Net Sales" data={chartData.netSales} valueKey="v" kind="money" />
        <ChartCard title="Orders" data={chartData.orders} valueKey="v" kind="count" />
        <div className="lg:col-span-2">
          <ChartCard title="Items Sold" data={chartData.items} valueKey="v" kind="count" />
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-medium text-kk-dark-text">Top 10 Products</div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b text-xs text-kk-dark-text-muted">
              <tr>
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Items Sold</th>
                <th className="py-2 pr-4">Net Sales</th>
              </tr>
            </thead>
            <tbody>
              {(data?.top_products ?? []).map((p) => (
                <tr key={p.item_id} className="border-b last:border-b-0">
                  <td className="py-2 pr-4">{p.name}</td>
                  <td className="py-2 pr-4">{formatNumber(+p.items_sold)}</td>
                  <td className="py-2 pr-4">{formatMoneyNGN(+p.net_sales)}</td>
                </tr>
              ))}
              {!loading && data && data.top_products.length === 0 ? (
                <tr>
                  <td className="py-3 text-kk-dark-text-muted" colSpan={3}>No sales in this range.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
