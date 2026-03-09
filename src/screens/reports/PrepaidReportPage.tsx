import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatMoneyNGN, formatNumber, toDateStrShort } from "../../helpers";
import type { Outlet } from "../../types/location";
import type { Granularity, PrepaidReportResponse } from "../../types/reports";
import { fetchPrepaidReport } from "../../api/reports";
import { fetchOutlets } from "../../api/location";
import { KpiCard } from "../../components/reports/KpiCard";
import { ChartCard } from "../../components/reports/ChartCard";
import { MetricDropdownButton } from "../../components/reports/MetricDropdownButton";
import { buildComparisonChartData, buildCompareSub } from "../../components/reports/periodCompare";
import { ReportDateRangePicker } from "../../components/date/ReportDateRangePicker";
import { useReportDateRange } from "../../hooks/useReportDateRange";
import { useComparePeriod } from "../../hooks/useComparePeriod";
import { useReportAutoRefresh } from "../../hooks/useReportAutoRefresh";

type MetricKey = "amount_paid" | "invoices_created" | "items_purchased" | "redeemed_items" | "refunded_amount";

const metricKind: Record<MetricKey, "money" | "count"> = {
  amount_paid: "money",
  invoices_created: "count",
  items_purchased: "count",
  redeemed_items: "count",
  refunded_amount: "money",
};

const prepaidMetricOptions: Array<{ value: MetricKey; label: string }> = [
  { value: "amount_paid", label: "Amount paid" },
  { value: "invoices_created", label: "Invoices created" },
  { value: "items_purchased", label: "Items purchased" },
  { value: "redeemed_items", label: "Redeemed items" },
  { value: "refunded_amount", label: "Refunded amount" },
];

const statusBadgeClass = (status?: string) => {
  const value = String(status || "").toUpperCase();
  if (value === "REDEEMED") return "bg-emerald-50 text-emerald-700";
  if (value === "PARTIALLY_REDEEMED") return "bg-amber-50 text-amber-700";
  return "bg-blue-50 text-blue-700";
};

const toStatusTitle = (status?: string) =>
  String(status || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (s) => s.toUpperCase()) || "Unused";

export default function PrepaidReportPage() {
  const navigate = useNavigate();
  const { start, end, setStart, setEnd } = useReportDateRange();
  const { compareEnabled, compareRange, compareMode, setCompareMode } = useComparePeriod({ start, end });
  const refreshTick = useReportAutoRefresh({ start, end, onlyWhenRangeIncludesToday: true });

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [locationIds, setLocationIds] = useState<number[] | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const [sort, setSort] = useState<
    "amount_paid" | "number" | "items_purchased" | "redeemed_items" | "status" | "refunded_amount"
  >("amount_paid");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<PrepaidReportResponse | null>(null);
  const [compareData, setCompareData] = useState<PrepaidReportResponse | null>(null);

  const [granularity, setGranularity] = useState<Granularity | undefined>(undefined);
  const [metric, setMetric] = useState<MetricKey>("amount_paid");

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
          fetchPrepaidReport({
            ...commonArgs,
            start,
            end,
          }),
          compareRange
            ? fetchPrepaidReport({
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
        setErr(e?.message ?? "Failed to load pre-paid report");
        setData(null);
        setCompareData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [
    start,
    end,
    locationIds,
    search,
    sort,
    order,
    limit,
    offset,
    granularity,
    compareRange?.start,
    compareRange?.end,
    refreshTick,
  ]);

  useEffect(() => {
    fetchOutlets().then(setOutlets).catch(() => setOutlets([]));
  }, []);

  const gran = data?.range.granularity ?? granularity ?? "day";
  const chartData = useMemo(
    () => buildComparisonChartData(data?.series?.[metric] ?? [], compareData?.series?.[metric], gran),
    [compareData?.series, data?.series, gran, metric]
  );

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
      <div className="rounded-md bg-kk-dark-bg p-4">
        <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <ReportDateRangePicker
              start={start}
              end={end}
              compareTo={compareMode}
              onApply={({ start: nextStart, end: nextEnd, compareTo }) => {
                setOffset(0);
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
                setOffset(0);
                if (e.target.value === "ALL") setLocationIds("ALL");
                else setLocationIds([]);
              }}
            >
              <option value="ALL">All locations</option>
              <option value="CUSTOM">Specific locations</option>
            </select>

            {locationIds !== "ALL" ? (
              <div className="mt-3 flex flex-col gap-2">
                <label className="text-xs text-kk-dark-text-muted">Select outlets</label>
                <select
                  multiple
                  className="min-w-[260px] rounded-md border border-kk-dark-input-border px-3 py-2 text-sm"
                  value={locationIds.map(String)}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
                    setOffset(0);
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
            ) : null}
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-kk-dark-text-muted">Search</label>
            <input
              value={search}
              onChange={(e) => {
                setOffset(0);
                setSearch(e.target.value);
              }}
              placeholder="Invoice # or pre-paid #"
              className="mt-1 w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-xs text-kk-dark-text-muted">Granularity</label>
            <select
              value={granularity ?? ""}
              onChange={(e) => setGranularity((e.target.value || undefined) as Granularity | undefined)}
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
            <label className="text-xs text-kk-dark-text-muted">Sort</label>
            <div className="mt-1 flex gap-2">
              <select
                value={sort}
                onChange={(e) => {
                  setOffset(0);
                  setSort(e.target.value as typeof sort);
                }}
                className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              >
                <option value="amount_paid">Amount paid</option>
                <option value="number">Invoice number</option>
                <option value="items_purchased">Items purchased</option>
                <option value="redeemed_items">Redeemed items</option>
                <option value="status">Status</option>
                <option value="refunded_amount">Refunded amount</option>
              </select>
              <select
                value={order}
                onChange={(e) => {
                  setOffset(0);
                  setOrder(e.target.value as "asc" | "desc");
                }}
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
                Showing {Math.min(offset + 1, total)}-{Math.min(offset + limit, total)} of {total}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <KpiCard
          label="Invoices Created"
          value={data ? formatNumber(Number(data.kpi.invoices_created ?? 0)) : "-"}
          sub={
            data
              ? compareSub(
                  Number(data.kpi.invoices_created ?? 0),
                  Number(compareData?.kpi.invoices_created ?? 0),
                  formatNumber
                )
              : undefined
          }
        />
        <KpiCard
          label="Amount Paid"
          value={data ? formatMoneyNGN(Number(data.kpi.amount_paid ?? 0)) : "-"}
          sub={
            data
              ? compareSub(Number(data.kpi.amount_paid ?? 0), Number(compareData?.kpi.amount_paid ?? 0), formatMoneyNGN)
              : undefined
          }
        />
        <KpiCard
          label="Items Purchased"
          value={data ? formatNumber(Number(data.kpi.items_purchased ?? 0)) : "-"}
          sub={
            data
              ? compareSub(
                  Number(data.kpi.items_purchased ?? 0),
                  Number(compareData?.kpi.items_purchased ?? 0),
                  formatNumber
                )
              : undefined
          }
        />
        <KpiCard
          label="Redeemed Items"
          value={data ? formatNumber(Number(data.kpi.redeemed_items ?? 0)) : "-"}
          sub={
            data
              ? compareSub(
                  Number(data.kpi.redeemed_items ?? 0),
                  Number(compareData?.kpi.redeemed_items ?? 0),
                  formatNumber
                )
              : undefined
          }
        />
        <KpiCard
          label="Used Invoices"
          value={
            data
              ? formatNumber(Number(data.kpi.used_invoices ?? 0))
              : "-"
          }
          sub={
            data
              ? compareSub(
                  Number(data.kpi.used_invoices ?? 0),
                  Number(compareData?.kpi.used_invoices ?? 0),
                  formatNumber
                )
              : undefined
          }
        />
        <KpiCard
          label="Total Refunded"
          value={data ? formatMoneyNGN(Number(data.kpi.total_refunded ?? 0)) : "-"}
          sub={
            data
              ? compareSub(
                  Number(data.kpi.total_refunded ?? 0),
                  Number(compareData?.kpi.total_refunded ?? 0),
                  formatMoneyNGN
                )
              : undefined
          }
        />
      </div>

      <ChartCard
        title={
          metric === "amount_paid"
            ? "Amount paid"
            : metric === "invoices_created"
            ? "Invoices created"
            : metric === "items_purchased"
            ? "Items purchased"
            : metric === "redeemed_items"
            ? "Redeemed items"
            : "Refunded amount"
        }
        data={chartData}
        dataKey="label"
        valueKey="v"
        compareValueKey={compareEnabled ? "compare_v" : undefined}
        kind={metricKind[metric]}
        titleAccessory={
          <MetricDropdownButton
            value={metric}
            options={prepaidMetricOptions}
            onChange={(value) => setMetric(value as MetricKey)}
          />
        }
      />

      <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated shadow-sm overflow-hidden">
        <div className="px-4 py-3 font-medium">Pre-Paid Invoices</div>

        {err ? <div className="p-4 text-sm text-red-600">{err}</div> : null}
        {loading && !data ? <div className="p-4 text-sm">Loading...</div> : null}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-kk-dark-bg-elevated text-kk-dark-text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Date</th>
                <th className="px-4 py-2 text-left font-medium">Invoice #</th>
                <th className="px-4 py-2 text-left font-medium">Pre-Paid #</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Items</th>
                <th className="px-4 py-2 text-right font-medium">Redeemed</th>
                <th className="px-4 py-2 text-right font-medium">Amount Paid</th>
                <th className="px-4 py-2 text-right font-medium">Refunded</th>
                <th className="px-4 py-2 text-right font-medium">Last Redeemed</th>
              </tr>
            </thead>

            <tbody>
              {(data?.results ?? []).map((r) => (
                <tr
                  key={r.invoice_id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/sales/invoices/${r.invoice_id}`)}
                >
                  <td className="px-4 py-2">{toDateStrShort(r.invoice_date ?? "")}</td>
                  <td className="px-4 py-2">{r.invoice_number}</td>
                  <td className="px-4 py-2">{r.prepaid_number || "-"}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium ${statusBadgeClass(r.status)}`}>
                      {toStatusTitle(r.status)}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">{formatNumber(Number(r.items_purchased ?? 0))}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(Number(r.redeemed_items ?? 0))}</td>
                  <td className="px-4 py-2 text-right">{formatMoneyNGN(Number(r.amount_paid ?? 0))}</td>
                  <td className="px-4 py-2 text-right">{formatMoneyNGN(Number(r.refunded_amount ?? 0))}</td>
                  <td className="px-4 py-2 text-right">
                    {r.last_redeemed_at ? toDateStrShort(r.last_redeemed_at) : "-"}
                  </td>
                </tr>
              ))}

              {!loading && (data?.results?.length ?? 0) === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-kk-dark-text-muted" colSpan={9}>
                    No pre-paid invoices in this range.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated shadow-sm overflow-hidden">
        <div className="px-4 py-3 font-medium">Redeemed Items</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-kk-dark-bg-elevated text-kk-dark-text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Source</th>
                <th className="px-4 py-2 text-left font-medium">Item</th>
                <th className="px-4 py-2 text-left font-medium">SKU</th>
                <th className="px-4 py-2 text-right font-medium">Redeemed Qty</th>
                <th className="px-4 py-2 text-right font-medium">Last Redeemed</th>
              </tr>
            </thead>
            <tbody>
              {(data?.redeemed_items_results ?? []).map((row, idx) => (
                <tr key={`${row.source}-${row.item_id ?? "n/a"}-${idx}`}>
                  <td className="px-4 py-2">
                    {String(row.source || "").toUpperCase() === "SUBSCRIPTION" ? "Subscription" : "Pre-Paid"}
                  </td>
                  <td className="px-4 py-2">{row.item_name || "-"}</td>
                  <td className="px-4 py-2">{row.item_sku || "-"}</td>
                  <td className="px-4 py-2 text-right">{formatNumber(Number(row.quantity_redeemed ?? 0))}</td>
                  <td className="px-4 py-2 text-right">
                    {row.last_redeemed_at ? toDateStrShort(row.last_redeemed_at) : "-"}
                  </td>
                </tr>
              ))}
              {!loading && (data?.redeemed_items_results?.length ?? 0) === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-kk-dark-text-muted" colSpan={5}>
                    No redeemed items in this range.
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
