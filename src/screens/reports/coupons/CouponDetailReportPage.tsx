import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import type { Outlet } from "../../../types/location";
import type { CouponDetailReportResponse, Granularity } from "../../../types/reports";
import { fetchCouponDetailReport } from "../../../api/reports";
import { fetchOutlets } from "../../../api/location";
import { KpiCard } from "../../../components/reports/KpiCard";
import { ChartCard } from "../../../components/reports/ChartCard";
import { formatMoneyNGN, formatNumber, isoToLabel, toDateStrShort, toYMD } from "../../../helpers";

export default function CouponDetailReportPage() {
  const nav = useNavigate();
  const { code } = useParams();
  const couponCode = String(code || "").trim();

  const [sp, setSp] = useSearchParams();
  const [start, setStart] = useState(() => sp.get("start") ?? toYMD(new Date()));
  const [end, setEnd] = useState(() => sp.get("end") ?? toYMD(new Date()));

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [locationIds, setLocationIds] = useState<number[] | "ALL">("ALL");

  const [granularity, setGranularity] = useState<Granularity | undefined>(undefined);
  const [metric, setMetric] = useState<"net_discount" | "discounted_orders">("net_discount");

  const [sort, setSort] = useState<"date" | "discount" | "net_sales" | "number">("date");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<CouponDetailReportResponse | null>(null);

  useEffect(() => {
    if (!couponCode) return;
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetchCouponDetailReport({
          code: couponCode,
          start,
          end,
          locationIds: locationIds === "ALL" ? undefined : locationIds,
          granularity,
          sort,
          order,
          limit,
          offset,
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
  }, [couponCode, start, end, locationIds, granularity, sort, order, limit, offset]);

  useEffect(() => {
    fetchOutlets().then(setOutlets).catch(() => setOutlets([]));
  }, []);

  useEffect(() => {
    sp.set("start", start);
    sp.set("end", end);
    setSp(sp, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end]);

  const gran = data?.range.granularity ?? granularity ?? "day";
  const series = data?.series?.[metric] ?? [];
  const chartData = useMemo(() => {
    return series.map((p) => ({
      t: p.t,
      label: isoToLabel(p.t, gran),
      v: Number(p.v ?? 0),
    }));
  }, [series, gran]);

  const total = data?.pagination.total ?? 0;
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <button onClick={() => nav(-1)} className="text-sm text-purple-500 hover:underline">
            ← Back
          </button>
          <h1 className="text-lg font-semibold mt-1">
            {data?.coupon?.name ? `${data.coupon.name} (${data.coupon.code})` : `Coupon (${couponCode})`}
          </h1>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-kk-dark-text-muted">Start</label>
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
          <div>
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
            <div className="md:col-span-2">
              <label className="text-xs text-kk-dark-text-muted">Select outlets</label>
              <select
                multiple
                className="mt-1 w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
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

          <div>
            <label className="text-xs text-kk-dark-text-muted">Metric</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as any)}
              className="mt-1 w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
            >
              <option value="net_discount">Net discount</option>
              <option value="discounted_orders">Discounted orders</option>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <KpiCard label="Discounted Orders" value={data ? formatNumber(Number(data.kpi.discounted_orders ?? 0)) : "—"} />
        <KpiCard label="Net Discount" value={data ? formatMoneyNGN(Number(data.kpi.net_discount ?? 0)) : "—"} />
      </div>

      <ChartCard
        title={metric === "net_discount" ? "Net discount" : "Discounted orders"}
        data={chartData}
        dataKey="label"
        valueKey="v"
        kind={metric === "net_discount" ? "money" : "count"}
      />

      {/* Invoices table */}
      <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="font-medium">Invoices</div>
            <div className="text-xs text-kk-dark-text-muted">Invoices where this coupon was applied.</div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sort}
              onChange={(e) => {
                setOffset(0);
                setSort(e.target.value as any);
              }}
              className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-sm"
            >
              <option value="date">Date</option>
              <option value="number">Invoice #</option>
              <option value="net_sales">Net sales</option>
              <option value="discount">Coupon discount</option>
            </select>
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

        {loading && !data ? <div className="p-4 text-sm">Loading...</div> : null}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-kk-dark-bg-elevated text-kk-dark-text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Date</th>
                <th className="px-4 py-2 text-left font-medium">Invoice #</th>
                <th className="px-4 py-2 text-left font-medium">Location</th>
                <th className="px-4 py-2 text-right font-medium">Net sales</th>
                <th className="px-4 py-2 text-right font-medium">Coupon discount</th>
              </tr>
            </thead>
            <tbody>
              {(data?.results ?? []).map((r) => (
                <tr
                  key={r.invoice_id}
                  className="cursor-pointer border-t border-kk-dark-border"
                  onClick={() => nav(`/sales/invoices/${r.invoice_id}`)}
                  title="View invoice"
                >
                  <td className="px-4 py-2 font-medium">{toDateStrShort(r.invoice_date)}</td>
                  <td className="px-4 py-2">{r.invoice_number}</td>
                  <td className="px-4 py-2">{r.location}</td>
                  <td className="px-4 py-2 text-right">{formatMoneyNGN(Number(r.net_sales ?? 0))}</td>
                  <td className="px-4 py-2 text-right text-kk-err">
                    -{formatMoneyNGN(Number(r.coupon_discount ?? 0))}
                  </td>
                </tr>
              ))}

              {!loading && (data?.results?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-kk-dark-text-muted">
                    No invoices for this range.
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

