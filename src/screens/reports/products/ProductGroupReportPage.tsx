// src/screens/reports/products/ProductGroupReportPage.tsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { formatMoneyNGN, formatNumber } from "../../../helpers";
import type { Granularity, GroupResponse } from "../../../types/reports";
import { fetchGroupReport } from "../../../api/reports";
import { ChartCard } from "../../../components/reports/ChartCard";
import { KpiCard } from "../../../components/reports/KpiCard";
import { buildComparisonChartData, buildCompareSub } from "../../../components/reports/periodCompare";
import { fetchOutlets } from "../../../api/location";
import type { Outlet } from "../../../types/location";
import { ReportDateRangePicker } from "../../../components/date/ReportDateRangePicker";
import { useReportDateRange } from "../../../hooks/useReportDateRange";
import { useComparePeriod } from "../../../hooks/useComparePeriod";
import { useReportAutoRefresh } from "../../../hooks/useReportAutoRefresh";


export default function ProductGroupReportPage() {
  const nav = useNavigate();
  const { groupId } = useParams();
  const gid = Number(groupId);

  const [sp, setSp] = useSearchParams();

  // take from query string if present (so clicking from Products page preserves range)
  const { start, end, setStart, setEnd } = useReportDateRange({
    start: sp.get("start") ?? undefined,
    end: sp.get("end") ?? undefined,
  });
  const { compareEnabled, compareRange, compareMode, setCompareMode } = useComparePeriod({ start, end });
  const refreshTick = useReportAutoRefresh({ start, end, onlyWhenRangeIncludesToday: true });

  useEffect(() => {
    const next = new URLSearchParams(sp);
    next.set("start", start);
    next.set("end", end);
    setSp(next, { replace: true });
  }, [end, setSp, sp, start]);

  const [itemsMode, setItemsMode] = useState<"parents" | "all">("parents");

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [locationIds, setLocationIds] = useState<number[] | "ALL">("ALL");

  const [granularity, setGranularity] = useState<Granularity | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<GroupResponse | null>(null);
  const [compareData, setCompareData] = useState<GroupResponse | null>(null);

  const [metric, setMetric] = useState<"net_sales" | "orders" | "items_sold">("net_sales");

  useEffect(() => {
    if (!Number.isFinite(gid)) return;
    let alive = true;

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const commonArgs = {
          groupId: gid,
          locationIds: locationIds === "ALL" ? undefined : locationIds,
          itemsMode,
          granularity,
        };
        const [res, compareRes] = await Promise.all([
          fetchGroupReport({
            ...commonArgs,
            start,
            end,
          }),
          compareRange
            ? fetchGroupReport({
                ...commonArgs,
                start: compareRange.start,
                end: compareRange.end,
              })
            : Promise.resolve(null),
        ]);
        if (!alive) return;
        setData(res);
        setCompareData(compareRes);

        // If current granularity isn't allowed, snap to server-chosen default
        if (granularity && !res.range.available_granularities.includes(granularity)) {
          setGranularity(res.range.granularity);
        } else if (!granularity) {
          setGranularity(res.range.granularity);
        }
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message ?? "Failed to load");
        setCompareData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [gid, start, end, locationIds, itemsMode, granularity, compareRange?.start, compareRange?.end, refreshTick]);

  useEffect(() => {
    fetchOutlets().then(setOutlets).catch(() => {
      // keep non-blocking; selector can still show ‚ÄúAll locations‚Äù
      setOutlets([]);
    });
  }, []);

  // keep URL updated (nice UX)
  useEffect(() => {
    sp.set("start", start);
    sp.set("end", end);
    setSp(sp, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end]);

  const gran = data?.range.granularity ?? granularity ?? "day";
  const series = data?.series?.[metric] ?? [];
  const chartData = useMemo(() => {
    return buildComparisonChartData(series, compareData?.series?.[metric], gran);
  }, [compareData?.series, gran, metric, series]);

  const compareSub = (
    current: number,
    compare: number | null | undefined,
    formatter: (value: number) => string
  ) => (compareEnabled ? buildCompareSub(current, compare, formatter) : undefined);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button
            onClick={() => nav(-1)}
            className="text-sm text-purple-500 hover:underline"
          >
            ‚Üê Back
          </button>
          <h1 className="text-lg font-semibold mt-1">
            {data?.group?.name ?? "Product group"}{" "}
          </h1>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-md bg-kk-dark-bg p-4">
        <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <ReportDateRangePicker
              start={start}
              end={end}
              compareTo={compareMode}
              onApply={({ start: nextStart, end: nextEnd, compareTo }) => {
                setStart(nextStart);
                setEnd(nextEnd);
                setCompareMode(compareTo);
              }}
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-kk-dark-text-muted">Locations</label>
            <select
              className="mt-1 w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              value={locationIds === "ALL" ? "ALL" : "CUSTOM"}
              onChange={(e) => {
                if (e.target.value === "ALL") setLocationIds("ALL");
                else setLocationIds([]); // switch to custom
              }}
            >
              <option value="ALL">All locations</option>
              <option value="CUSTOM">Specific locations</option>
            </select>

            {locationIds !== "ALL" && (
            <div className="mt-3 flex flex-col gap-2">
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
          </div>

          <div>
            <label className="text-xs text-kk-dark-text-muted">Items mode</label>
            <select
              value={itemsMode}
              onChange={(e) => setItemsMode(e.target.value as any)}
              className="mt-1 w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
            >
              <option value="parents">Parents only (default)</option>
              <option value="all">All lines (parents + children)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-kk-dark-text-muted">Metric</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as any)}
              className="mt-1 w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
            >
              <option value="net_sales">Net sales</option>
              <option value="orders">Orders</option>
              <option value="items_sold">Items sold</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-kk-dark-text-muted">Granularity</label>
            <select
              value={granularity ?? ""}
              onChange={(e) => setGranularity((e.target.value || undefined) as any)}
              className="mt-1 w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              disabled={!data}
            >
              {(data?.range.available_granularities ?? ["day"]).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard
          label="Items Sold"
          value={data ? formatNumber(Number(data.kpi.items_sold ?? 0)) : "ó"}
          sub={data ? compareSub(Number(data.kpi.items_sold ?? 0), Number(compareData?.kpi.items_sold ?? 0), formatNumber) : undefined}
        />
        <KpiCard
          label="Net Sales"
          value={data ? formatMoneyNGN(Number(data.kpi.net_sales ?? 0)) : "ó"}
          sub={data ? compareSub(Number(data.kpi.net_sales ?? 0), Number(compareData?.kpi.net_sales ?? 0), formatMoneyNGN) : undefined}
        />
        <KpiCard
          label="Orders"
          value={data ? formatNumber(Number(data.kpi.orders ?? 0)) : "ó"}
          sub={data ? compareSub(Number(data.kpi.orders ?? 0), Number(compareData?.kpi.orders ?? 0), formatNumber) : undefined}
        />
      </div>

      {/* Chart */}
      <ChartCard 
        title={metric === "net_sales" ? "Net sales" : metric === "orders" ? "Orders" : "Items sold"}
        data={chartData}
        dataKey="label"
        valueKey="v"
        compareValueKey={compareEnabled ? "compare_v" : undefined}
        kind={metric === "net_sales" ? "money" : "count"}
      />

      {/* Variations table */}
      <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated shadow-sm overflow-hidden">
        <div className="px-4 py-3">
          <div className="font-medium">Variations</div>
          <div className="text-xs text-kk-dark-text-muted">All items under this group (each SKU is a variation).</div>
        </div>

        {loading && !data ? <div className="p-4 text-sm">Loading‚Ä¶</div> : null}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-kk-dark-text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Variation</th>
                <th className="px-4 py-2 text-left font-medium">SKU</th>
                <th className="px-4 py-2 text-right font-medium">Items sold</th>
                <th className="px-4 py-2 text-right font-medium">Net sales</th>
                <th className="px-4 py-2 text-right font-medium">Net discount</th>
                <th className="px-4 py-2 text-right font-medium">Orders</th>
              </tr>
            </thead>
            <tbody>
              {(data?.variations ?? []).map((v) => (
                <tr key={v.item_id} className="border-t border-kk-dark-border">
                  <td className="px-4 py-2 font-medium">{v.item__name}</td>
                  <td className="px-4 py-2">{v.item__sku}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(Number(v.items_sold ?? 0))}</td>
                  <td className="px-4 py-2 text-right">{formatMoneyNGN(Number(v.net_sales ?? 0))}</td>
                  <td className="px-4 py-2 text-right">{formatMoneyNGN(Number(v.discount_amount ?? 0))}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(Number(v.orders ?? 0))}</td>
                </tr>
              ))}

              {!loading && (data?.variations?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    No variation sales for this range.
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
