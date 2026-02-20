import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import type { Outlet } from "../../types/location";
import type { CouponReportResponse, Granularity } from "../../types/reports";
import { fetchCouponsReport } from "../../api/reports";
import { fetchOutlets } from "../../api/location";
import { KpiCard } from "../../components/reports/KpiCard";
import { ChartCard } from "../../components/reports/ChartCard";
import { ComparePeriodControls } from "../../components/reports/ComparePeriodControls";
import { buildComparisonChartData, buildCompareSub } from "../../components/reports/periodCompare";
import { formatMoneyNGN, formatNumber } from "../../helpers";
import { useReportDateRange } from "../../hooks/useReportDateRange";
import { useComparePeriod } from "../../hooks/useComparePeriod";

export default function CouponsReportPage() {
  const navigate = useNavigate();

  const { start, end, setStart, setEnd } = useReportDateRange();
  const { compareEnabled, compareRange, compareStart, compareEnd, periodDays, setCompareStart, toggleCompare } =
    useComparePeriod({ start, end });

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [locationIds, setLocationIds] = useState<number[] | "ALL">("ALL");

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"net_discount" | "discounted_orders" | "code" | "name">("net_discount");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<CouponReportResponse | null>(null);
  const [compareData, setCompareData] = useState<CouponReportResponse | null>(null);

  const [granularity, setGranularity] = useState<Granularity | undefined>(undefined);
  const [metric, setMetric] = useState<"net_discount" | "discounted_orders">("net_discount");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const commonArgs = {
          locationIds: locationIds === "ALL" ? undefined : locationIds,
          granularity,
          search: search.trim() || undefined,
          sort,
          order,
          limit,
          offset,
        };
        const [res, compareRes] = await Promise.all([
          fetchCouponsReport({
            ...commonArgs,
            start,
            end,
          }),
          compareRange
            ? fetchCouponsReport({
                ...commonArgs,
                start: compareRange.start,
                end: compareRange.end,
              })
            : Promise.resolve(null),
        ]);
        if (!alive) return;
        setData(res);
        setCompareData(compareRes);

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
  }, [start, end, locationIds, search, sort, order, limit, offset, granularity, compareRange?.start, compareRange?.end]);

  useEffect(() => {
    fetchOutlets().then(setOutlets).catch(() => setOutlets([]));
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
          <div className="flex flex-col gap-1">
            <label className="text-xs text-kk-dark-text-muted">Start</label>
            <input
              type="date"
              value={start}
              onChange={(e) => {
                setOffset(0);
                setStart(e.target.value);
              }}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-kk-dark-text-muted">End</label>
            <input
              type="date"
              value={end}
              onChange={(e) => {
                setOffset(0);
                setEnd(e.target.value);
              }}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-kk-dark-text-muted">Locations</label>
            <select
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-sm"
              value={locationIds === "ALL" ? "ALL" : "CUSTOM"}
              onChange={(e) => {
                setOffset(0);
                if (e.target.value === "ALL") setLocationIds("ALL");
                else setLocationIds([]);
              }}
            >
              <option value="ALL">All locations</option>
              <option value="CUSTOM">Specific locations</option>
            </select>
          </div>

          {locationIds !== "ALL" && (
            <div className="flex flex-col gap-1 md:col-span-2">
              <label className="text-xs text-kk-dark-text-muted">Select outlets</label>
              <select
                multiple
                className="min-w-[260px] rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-sm"
                value={locationIds.map(String)}
                onChange={(e) => {
                  setOffset(0);
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

          <div className="flex flex-col gap-1">
            <label className="text-xs text-kk-dark-text-muted">Search</label>
            <input
              value={search}
              onChange={(e) => {
                setOffset(0);
                setSearch(e.target.value);
              }}
              placeholder="Coupon code..."
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-sm"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-kk-dark-text-muted">Sort</label>
            <select
              value={sort}
              onChange={(e) => {
                setOffset(0);
                setSort(e.target.value as any);
              }}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-sm"
            >
              <option value="net_discount">Net discount</option>
              <option value="discounted_orders">Discounted orders</option>
              <option value="name">Name</option>
              <option value="code">Code</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-kk-dark-text-muted">Order</label>
            <select
              value={order}
              onChange={(e) => {
                setOffset(0);
                setOrder(e.target.value as any);
              }}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-sm"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-kk-dark-text-muted">Metric</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as any)}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-sm"
            >
              <option value="net_discount">Net discount</option>
              <option value="discounted_orders">Discounted orders</option>
            </select>
          </div>

          <div className="flex items-end justify-end gap-2 md:col-span-6">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <KpiCard
          label="Discounted Orders"
          value={data ? formatNumber(Number(data.kpi.discounted_orders ?? 0)) : "—"}
          sub={
            data
              ? compareSub(Number(data.kpi.discounted_orders ?? 0), Number(compareData?.kpi.discounted_orders ?? 0), formatNumber)
              : undefined
          }
        />
        <KpiCard
          label="Net Discount"
          value={data ? formatMoneyNGN(Number(data.kpi.net_discount ?? 0)) : "—"}
          sub={data ? compareSub(Number(data.kpi.net_discount ?? 0), Number(compareData?.kpi.net_discount ?? 0), formatMoneyNGN) : undefined}
        />
      </div>

      {/* Chart */}
      <ChartCard
        title={metric === "net_discount" ? "Net discount" : "Discounted orders"}
        data={chartData}
        dataKey="label"
        valueKey="v"
        compareValueKey={compareEnabled ? "compare_v" : undefined}
        kind={metric === "net_discount" ? "money" : "count"}
      />

      {/* Table */}
      <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="font-medium">Coupons</div>
            <div className="text-xs text-kk-dark-text-muted">
              Click a coupon to view invoices that used it in this date range.
            </div>
          </div>
        </div>

        {err ? <div className="p-4 text-sm text-red-600">{err}</div> : null}
        {loading && !data ? <div className="p-4 text-sm">Loading...</div> : null}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-kk-dark-bg-elevated text-kk-dark-text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Coupon</th>
                <th className="px-4 py-2 text-left font-medium">Code</th>
                <th className="px-4 py-2 text-right font-medium">Discounted orders</th>
                <th className="px-4 py-2 text-right font-medium">Net discount</th>
              </tr>
            </thead>
            <tbody>
              {(data?.results ?? []).map((r) => (
                <tr
                  key={r.code}
                  className="cursor-pointer"
                  onClick={() => {
                    const q = new URLSearchParams();
                    q.set("start", start);
                    q.set("end", end);
                    if (locationIds !== "ALL" && locationIds.length) {
                      q.set("location_ids", locationIds.join(","));
                    }
                    navigate(`/reports/coupons/${encodeURIComponent(r.code)}?${q.toString()}`);
                  }}
                  title="View coupon details"
                >
                  <td className="px-4 py-2">
                    <span className="font-medium">{r.name || "â€”"}</span>
                  </td>
                  <td className="px-4 py-2">{r.code}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(Number(r.discounted_orders ?? 0))}</td>
                  <td className="px-4 py-2 text-right">{formatMoneyNGN(Number(r.net_discount ?? 0))}</td>
                </tr>
              ))}

              {!loading && (data?.results?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-kk-dark-text-muted">
                    No coupons used in this range.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {loading && data ? <div className="px-4 py-3 text-xs text-kk-dark-text-muted">Refreshing...</div> : null}
      </div>
    </div>
  );
}
