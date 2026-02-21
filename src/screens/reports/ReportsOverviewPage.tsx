// src/screens/reports/ReportsOverviewPage.tsx

import { useEffect, useMemo, useState } from "react";
import { fetchOverviewReport } from "../../api/reports";
import { type Granularity, type OverviewResponse } from "../../types/reports";
import { fetchOutlets } from "../../api/location";
import { type Outlet } from "../../types/location";
import { formatMoneyNGN, formatNumber } from "../../helpers";
import { KpiCard } from "../../components/reports/KpiCard";
import { ChartCard } from "../../components/reports/ChartCard";
import { ComparePeriodControls } from "../../components/reports/ComparePeriodControls";
import { buildComparisonChartData, buildCompareSub } from "../../components/reports/periodCompare";
import { useReportDateRange } from "../../hooks/useReportDateRange";
import { useComparePeriod } from "../../hooks/useComparePeriod";
import { useReportAutoRefresh } from "../../hooks/useReportAutoRefresh";

export default function ReportsOverviewPage() {
  const { start, end, setStart, setEnd } = useReportDateRange();
  const { compareEnabled, compareRange, compareStart, compareEnd, periodDays, setCompareStart, toggleCompare } =
    useComparePeriod({ start, end });
  const refreshTick = useReportAutoRefresh({ start, end, onlyWhenRangeIncludesToday: true });
  const [itemsMode, setItemsMode] = useState<"parents" | "all">("parents");

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [locationIds, setLocationIds] = useState<number[] | "ALL">("ALL");

  const [data, setData] = useState<OverviewResponse | null>(null);
  const [compareData, setCompareData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [granularity, setGranularity] = useState<Granularity>("hour");

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const commonArgs = {
        itemsMode,
        granularity,
        locationIds: locationIds === "ALL" ? undefined : locationIds,
      };

      const [resp, compareResp] = await Promise.all([
        fetchOverviewReport({
          ...commonArgs,
          start,
          end,
        }),
        compareRange
          ? fetchOverviewReport({
              ...commonArgs,
              start: compareRange.start,
              end: compareRange.end,
            })
          : Promise.resolve(null),
      ]);

      setData(resp);
      setCompareData(compareResp);

      // If current granularity isn't allowed, snap to server-chosen default
      if (granularity && !resp.range.available_granularities.includes(granularity)) {
        setGranularity(resp.range.granularity);
      } else if (!granularity) {
        setGranularity(resp.range.granularity);
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load report");
      setData(null);
      setCompareData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, itemsMode, locationIds, granularity, compareRange?.start, compareRange?.end, refreshTick]);

  useEffect(() => {
    fetchOutlets().then(setOutlets).catch(() => {
      // keep non-blocking; selector can still show "All locations"
      setOutlets([]);
    });
  }, []);

  const chartData = useMemo(() => {
    if (!data) return { netSales: [], orders: [], items: [] };
    const g = data.range.granularity;

    const netSales = buildComparisonChartData(data.series.net_sales, compareData?.series.net_sales, g);
    const orders = buildComparisonChartData(data.series.orders, compareData?.series.orders, g);
    const items = buildComparisonChartData(data.series.items_sold, compareData?.series.items_sold, g);
    return { netSales, orders, items };
  }, [compareData?.series.items_sold, compareData?.series.net_sales, compareData?.series.orders, data]);

  const compareSub = (
    current: number,
    compare: number | null | undefined,
    formatter: (value: number) => string
  ) => (compareEnabled ? buildCompareSub(current, compare, formatter) : undefined);

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex w-full flex-col gap-3">
          <ComparePeriodControls
            enabled={compareEnabled}
            onToggle={toggleCompare}
            compareStart={compareStart}
            compareEnd={compareEnd}
            periodDays={periodDays}
            onCompareStartChange={setCompareStart}
          />

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

              {data?.range.available_granularities.length === 1 ? (
                <div className="rounded-md border bg-kk-dark-bg px-3 py-2 text-sm text-kk-dark-text-muted">
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
      </div>

      {err ? (
        <div className="rounded-md border border-red-700/40 bg-red-900/20 px-4 py-3 text-sm text-red-200">
          {err}
        </div>
      ) : null}

      {/* Performance */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Sales"
          value={data ? formatMoneyNGN(+data.performance.total_sales) : "—"}
          sub={
            data
              ? compareSub(+data.performance.total_sales, +(compareData?.performance.total_sales ?? 0), formatMoneyNGN)
              : undefined
          }
        />
        <KpiCard
          label="Net Sales"
          value={data ? formatMoneyNGN(+data.performance.net_sales) : "—"}
          sub={data ? compareSub(+data.performance.net_sales, +(compareData?.performance.net_sales ?? 0), formatMoneyNGN) : undefined}
        />
        <KpiCard
          label="Orders"
          value={data ? formatNumber(data.performance.orders) : "—"}
          sub={data ? compareSub(data.performance.orders, Number(compareData?.performance.orders ?? 0), formatNumber) : undefined}
        />
        <KpiCard
          label="Items Sold"
          value={data ? formatNumber(+data.performance.products_sold) : "—"}
          sub={data ? compareSub(+data.performance.products_sold, +(compareData?.performance.products_sold ?? 0), formatNumber) : undefined}
        />
        <KpiCard
          label="Discounted Orders"
          value={data ? formatNumber(data.performance.discounted_orders) : "—"}
          sub={
            data
              ? compareSub(data.performance.discounted_orders, Number(compareData?.performance.discounted_orders ?? 0), formatNumber)
              : undefined
          }
        />
        <KpiCard
          label="Net Discount Amount"
          value={data ? formatMoneyNGN(+data.performance.net_discount_amount) : "—"}
          sub={
            data
              ? compareSub(+data.performance.net_discount_amount, +(compareData?.performance.net_discount_amount ?? 0), formatMoneyNGN)
              : undefined
          }
        />
        <KpiCard
          label="Total Refunded"
          value={data ? formatMoneyNGN(+(data.performance.total_refunded ?? 0)) : "—"}
          sub={
            data
              ? compareSub(+(data.performance.total_refunded ?? 0), +(compareData?.performance.total_refunded ?? 0), formatMoneyNGN)
              : undefined
          }
        />
        <KpiCard
          label="Total Tax"
          value={data ? formatMoneyNGN(+data.performance.tax_total) : "—"}
          sub={data ? compareSub(+data.performance.tax_total, +(compareData?.performance.tax_total ?? 0), formatMoneyNGN) : undefined}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Net Sales"
          data={chartData.netSales}
          dataKey="label"
          valueKey="v"
          compareValueKey={compareEnabled ? "compare_v" : undefined}
          kind="money"
        />
        <ChartCard
          title="Orders"
          data={chartData.orders}
          dataKey="label"
          valueKey="v"
          compareValueKey={compareEnabled ? "compare_v" : undefined}
          kind="count"
        />
        <div className="lg:col-span-2">
          <ChartCard
            title="Items Sold"
            data={chartData.items}
            dataKey="label"
            valueKey="v"
            compareValueKey={compareEnabled ? "compare_v" : undefined}
            kind="count"
          />
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
                  <td className="py-3 text-kk-dark-text-muted" colSpan={3}>
                    No sales in this range.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
