// src/screens/reports/VariationsReportPage.tsx

import { useEffect, useMemo, useState } from "react";
import type { Granularity, ReportResponse } from "../../types/reports";
import { csvEscape, downloadCsv, formatMoneyNGN, formatNumber, makeFilename } from "../../helpers";
import { fetchVariationsReport } from "../../api/reports";
import { KpiCard } from "../../components/reports/KpiCard";
import { ChartCard } from "../../components/reports/ChartCard";
import { ComparePeriodControls } from "../../components/reports/ComparePeriodControls";
import { buildComparisonChartData, buildCompareSub } from "../../components/reports/periodCompare";
import { fetchOutlets } from "../../api/location";
import type { Outlet } from "../../types/location";
import { CloudDownload } from "lucide-react";
import { useReportDateRange } from "../../hooks/useReportDateRange";
import { useComparePeriod } from "../../hooks/useComparePeriod";
import { useReportAutoRefresh } from "../../hooks/useReportAutoRefresh";

export default function VariationsReportPage() {

  const { start, end, setStart, setEnd } = useReportDateRange();
  const { compareEnabled, compareRange, compareStart, compareEnd, periodDays, setCompareStart, toggleCompare } =
    useComparePeriod({ start, end });
  const refreshTick = useReportAutoRefresh({ start, end, onlyWhenRangeIncludesToday: true });

  const [itemsMode, setItemsMode] = useState<"parents" | "all">("parents");

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [locationIds, setLocationIds] = useState<number[] | "ALL">("ALL");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"items_sold" | "net_sales" | "orders" | "name">("items_sold");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ReportResponse | null>(null);
  const [compareData, setCompareData] = useState<ReportResponse | null>(null);

  const [granularity, setGranularity] = useState<Granularity | undefined>(undefined);
  const [metric, setMetric] = useState<"net_sales" | "orders" | "items_sold">("net_sales");

  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const commonArgs = {
          locationIds: locationIds === "ALL" ? undefined : locationIds,
          itemsMode,
          granularity,
          search: search.trim() || undefined,
          sort,
          order,
          limit,
          offset,
        };
        const [res, compareRes] = await Promise.all([
          fetchVariationsReport({
            ...commonArgs,
            start,
            end,
          }),
          compareRange
            ? fetchVariationsReport({
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
  }, [start, end, locationIds, itemsMode, search, sort, order, limit, offset, granularity, compareRange?.start, compareRange?.end, refreshTick]);

  useEffect(() => {
    fetchOutlets().then(setOutlets).catch(() => {
      // keep non-blocking; selector can still show â€œAll locationsâ€
      setOutlets([]);
    });
  }, []);

  const gran = data?.range.granularity ?? granularity ?? "day";
  const series = data?.series?.[metric] ?? [];
  const chartData = useMemo(() => {
    return buildComparisonChartData(series, compareData?.series?.[metric], gran);
  }, [compareData?.series, gran, metric, series]);

  const total = data?.pagination.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + limit < total;
  const compareSub = (
    current: number,
    compare: number | null | undefined,
    formatter: (value: number) => string
  ) => (compareEnabled ? buildCompareSub(current, compare, formatter) : undefined);

  async function handleExportCsv() {
    if (!data || exporting) return;

    setExporting(true);
    setErr(null);

    try {
      // Fetch ALL rows (not just current page)
      // If you expect very large datasets later, we can add a backend CSV endpoint + streaming.
      const res = await fetchVariationsReport({
        start,
        end,
        locationIds: locationIds === "ALL" ? undefined : locationIds,
        itemsMode,
        granularity,
        search: search.trim() || undefined,
        sort,
        order,
        limit: 100000, // big number to get everything
        offset: 0,
      });

      const header = ["Product", "SKU", "Items sold", "Net sales", "Net discount", "Orders"];
      const rows = (res.results ?? []).map((r) => [
        csvEscape(r.name),
        csvEscape(r.sku ?? ""),
        csvEscape(r.items_sold ?? 0),
        csvEscape(r.net_sales ?? 0),
        csvEscape(r.net_discount ?? 0),
        csvEscape(r.orders ?? 0),
      ]);

      const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
      downloadCsv(makeFilename(locationIds, start, end, itemsMode), csv);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to export CSV");
    } finally {
      setExporting(false);
    }
  }


  return (
    <div className="p-4 space-y-4">
      {/* Filters */}
      <div className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg p-4 shadow-sm">
        <ComparePeriodControls
          enabled={compareEnabled}
          onToggle={() => {
            setOffset(0);
            toggleCompare();
          }}
          compareStart={compareStart}
          compareEnd={compareEnd}
          periodDays={periodDays}
          onCompareStartChange={(value) => {
            setOffset(0);
            setCompareStart(value);
          }}
        />

        <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-1">
            <label className="text-xs text-kk-dark-text-muted ">Start</label>
            <input
              type="date"
              value={start}
              onChange={(e) => {
                setOffset(0);
                setStart(e.target.value);
              }}
              className="mt-1 w-full rounded-md border border-kk-dark-input-border px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-kk-dark-text-muted">End</label>
            <input
              type="date"
              value={end}
              onChange={(e) => {
                setOffset(0);
                setEnd(e.target.value);
              }}
              className="mt-1 w-full rounded-md border border-kk-dark-input-border px-3 py-2 text-sm"
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

          <div className="md:col-span-1">
            <label className="text-xs text-kk-dark-text-muted">Items mode</label>
            <select
              value={itemsMode}
              onChange={(e) => {
                setOffset(0);
                setItemsMode(e.target.value as any);
              }}
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

          <div className="md:col-span-1">
            <label className="text-xs text-kk-dark-text-muted">Search</label>
            <input
              value={search}
              onChange={(e) => {
                setOffset(0);
                setSearch(e.target.value);
              }}
              placeholder="Name or SKU"
              className="mt-1 w-full rounded-md border border-kk-dark-input-border px-3 py-2 text-sm"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-kk-dark-text-muted">Sort</label>
            <div className="mt-1 flex gap-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              >
                <option value="items_sold">Items sold</option>
                <option value="net_sales">Net sales</option>
                <option value="orders">Orders</option>
                <option value="name">Name</option>
              </select>
              <select
                value={order}
                onChange={(e) => setOrder(e.target.value as any)}
                className="w-28 rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-kk-dark-text-muted">
            {data ? (
              <>
                Showing {Math.min(offset + 1, total)}â€“{Math.min(offset + limit, total)} of {total}
              </>
            ) : (
              " "
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => {
                setOffset(0);
                setLimit(Number(e.target.value));
              }}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-sm"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>

            <button
              disabled={!canPrev}
              onClick={() => setOffset((o) => Math.max(0, o - limit))}
              className="rounded-md border border-kk-dark-input-border px-3 py-1 text-sm disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={!canNext}
              onClick={() => setOffset((o) => o + limit)}
              className="rounded-md border border-kk-dark-input-border px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <KpiCard
          label="Items Sold"
          value={data ? formatNumber(Number(data.kpi.items_sold ?? 0)) : "—"}
          sub={data ? compareSub(Number(data.kpi.items_sold ?? 0), Number(compareData?.kpi.items_sold ?? 0), formatNumber) : undefined}
        />
        <KpiCard
          label="Net Sales"
          value={data ? formatMoneyNGN(Number(data.kpi.net_sales ?? 0)) : "—"}
          sub={data ? compareSub(Number(data.kpi.net_sales ?? 0), Number(compareData?.kpi.net_sales ?? 0), formatMoneyNGN) : undefined}
        />
        <KpiCard
          label="Net Discount"
          value={data ? formatMoneyNGN(Number(data.kpi.net_discount ?? 0)) : "—"}
          sub={
            data
              ? compareSub(Number(data.kpi.net_discount ?? 0), Number(compareData?.kpi.net_discount ?? 0), formatMoneyNGN)
              : undefined
          }
        />
        <KpiCard
          label="Orders"
          value={data ? formatNumber(Number(data.kpi.orders ?? 0)) : "—"}
          sub={data ? compareSub(Number(data.kpi.orders ?? 0), Number(compareData?.kpi.orders ?? 0), formatNumber) : undefined}
        />
      </div>

      {/* Charts */}
      <ChartCard 
        title={metric === "net_sales" ? "Net sales" : metric === "orders" ? "Orders" : "Items sold"}
        data={chartData}
        dataKey="label"
        valueKey="v"
        compareValueKey={compareEnabled ? "compare_v" : undefined}
        kind={metric === "net_sales" ? "money" : "count"}
      />

      {/* Table */}
      <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div className="font-medium">Items/Variations</div>

          <button
            onClick={handleExportCsv}
            disabled={!data || exporting || loading}
            className="flex gap-2 items-center rounded-md border border-kk-dark-input-border px-3 py-1 text-sm disabled:opacity-50"
            title={!data ? "Load data first" : "Export all rows to CSV"}
          >
            <CloudDownload className="h-5 w-5"/>
            {exporting ? "Exportingâ€¦" : "Export CSV"}
          </button>
        </div>

        {err ? <div className="p-4 text-sm text-red-600">{err}</div> : null}
        {loading && !data ? <div className="p-4 text-sm">Loadingâ€¦</div> : null}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-kk-dark-bg-elevated text-kk-dark-text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Product</th>
                <th className="px-4 py-2 text-left font-medium">SKU</th>
                <th className="px-4 py-2 text-right font-medium">Items sold</th>
                <th className="px-4 py-2 text-right font-medium">Net sales</th>
                <th className="px-4 py-2 text-right font-medium">Net discount</th>
                <th className="px-4 py-2 text-right font-medium">Orders</th>
              </tr>
            </thead>

            <tbody>
              {(data?.results ?? []).map((r) => {
                return (
                  <tr key={r.item_id}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-kk-dark-bg text-gray-700 text-xs">
                          â€¢
                        </span>
                        <span className="font-medium">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">{r.sku ?? <span className="text-kk-dark-text-muted">â€”</span>}</td>
                    <td className="px-4 py-2 text-right">{formatNumber(Number(r.items_sold ?? 0))}</td>
                    <td className="px-4 py-2 text-right">{formatMoneyNGN(Number(r.net_sales ?? 0))}</td>
                    <td className="px-4 py-2 text-right">{formatMoneyNGN(Number(r.net_discount ?? 0))}</td>
                    <td className="px-4 py-2 text-right">{formatNumber(Number(r.orders ?? 0))}</td>
                  </tr>
                );
              })}

              {!loading && (data?.results?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-kk-dark-text-muted">
                    No results for this range.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {loading && data ? <div className="px-4 py-3 text-xs text-kk-dark-text-muted">Refreshingâ€¦</div> : null}
      </div>
    </div>
  );
}
