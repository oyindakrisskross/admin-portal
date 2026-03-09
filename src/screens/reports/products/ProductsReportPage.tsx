// src/screens/reports/products/ProductsReportPage.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Granularity, ReportResponse } from "../../../types/reports";
import { csvEscape, downloadCsv, formatMoneyNGN, formatNumber, isoToLabel, makeFilename } from "../../../helpers";
import { searchItems } from "../../../api/catalog";
import { fetchProductsReport } from "../../../api/reports";
import { ItemSearchSelect, type ItemOption } from "../../../components/catalog/ItemSearchSelect";
import { KpiCard } from "../../../components/reports/KpiCard";
import { ChartCard } from "../../../components/reports/ChartCard";
import { ComparisonChartCard } from "../../../components/reports/ComparisonChartCard";
import { MetricDropdownButton } from "../../../components/reports/MetricDropdownButton";
import { buildComparisonChartData, buildCompareSub } from "../../../components/reports/periodCompare";
import { ReportDateRangePicker } from "../../../components/date/ReportDateRangePicker";
import type { Outlet } from "../../../types/location";
import { fetchOutlets } from "../../../api/location";
import { CloudDownload, X } from "lucide-react";
import { useReportDateRange } from "../../../hooks/useReportDateRange";
import { useComparePeriod } from "../../../hooks/useComparePeriod";
import { useReportAutoRefresh } from "../../../hooks/useReportAutoRefresh";

const COMPARISON_COLORS = [
  "#38bdf8",
  "#f97316",
  "#34d399",
  "#f472b6",
  "#a78bfa",
  "#facc15",
  "#fb7185",
  "#22d3ee",
  "#4ade80",
  "#60a5fa",
];

const productMetricOptions = [
  { value: "net_sales", label: "Net sales" },
  { value: "orders", label: "Orders" },
  { value: "items_sold", label: "Items sold" },
] as const;

export default function ProductsReportPage() {
  const navigate = useNavigate();

  const { start, end, setStart, setEnd } = useReportDateRange();
  const { compareEnabled, compareRange, compareMode, setCompareMode } = useComparePeriod({ start, end });
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

  const [showMode, setShowMode] = useState<"all" | "single" | "comparison">("all");
  const [selectedItem, setSelectedItem] = useState<ItemOption | null>(null);
  const [comparisonItems, setComparisonItems] = useState<ItemOption[]>([]);
  const [comparisonVisibility, setComparisonVisibility] = useState<Record<number, boolean>>({});

  const [exporting, setExporting] = useState(false);

  const loadItemOptions = useCallback(async (query: string, signal?: AbortSignal) => {
    const res = await searchItems(query, { page_size: 25, signal });
    return (res.results ?? []).map((item) => ({
      id: Number(item.id),
      label: item.name,
      subLabel: item.sku ?? undefined,
    }));
  }, []);

  useEffect(() => {
    let alive = true;
    const selectedIds =
      showMode === "single"
        ? selectedItem?.id
          ? [selectedItem.id]
          : []
        : showMode === "comparison"
        ? comparisonItems.map((item) => item.id)
        : [];

    if (showMode !== "all" && selectedIds.length === 0) {
      setData(null);
      setCompareData(null);
      setErr(null);
      setLoading(false);
      return () => {
        alive = false;
      };
    }

    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const queryForRange = (rangeStart: string, rangeEnd: string) => {
          const commonArgs = {
            start: rangeStart,
            end: rangeEnd,
            locationIds: locationIds === "ALL" ? undefined : locationIds,
            itemsMode,
            granularity,
            sort,
            order,
          };

          return showMode === "all"
            ? fetchProductsReport({
                ...commonArgs,
                search: search.trim() || undefined,
                limit,
                offset,
              })
            : fetchProductsReport({
                ...commonArgs,
                itemIds: selectedIds,
                seriesByItem: showMode === "comparison",
                limit: showMode === "comparison" ? Math.max(25, selectedIds.length) : 25,
                offset: 0,
              });
        };

        const [res, compareRes] = await Promise.all([
          queryForRange(start, end),
          compareRange ? queryForRange(compareRange.start, compareRange.end) : Promise.resolve(null),
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
  }, [
    start,
    end,
    locationIds,
    itemsMode,
    search,
    sort,
    order,
    limit,
    offset,
    granularity,
    showMode,
    selectedItem?.id,
    comparisonItems,
    compareRange?.start,
    compareRange?.end,
    refreshTick,
  ]);

  useEffect(() => {
    fetchOutlets().then(setOutlets).catch(() => {
      // keep non-blocking; selector can still show â€œAll locationsâ€
      setOutlets([]);
    });
  }, []);

  useEffect(() => {
    setComparisonVisibility((prev) => {
      const next: Record<number, boolean> = {};
      for (const item of comparisonItems) {
        next[item.id] = prev[item.id] ?? true;
      }
      return next;
    });
  }, [comparisonItems]);

  const gran = data?.range.granularity ?? granularity ?? "day";
  const series = data?.series?.[metric] ?? [];
  const chartData = useMemo(() => {
    return buildComparisonChartData(series, compareData?.series?.[metric], gran);
  }, [compareData?.series, gran, metric, series]);

  const selectedItemIds = useMemo(() => {
    if (showMode === "single") return selectedItem?.id ? [selectedItem.id] : [];
    if (showMode === "comparison") return comparisonItems.map((item) => item.id);
    return [];
  }, [comparisonItems, selectedItem, showMode]);

  const tableRows = useMemo(() => {
    const rows = data?.results ?? [];
    if (showMode === "all") return rows;
    if (!selectedItemIds.length) return [];
    return rows.filter((r) => r.item_id != null && selectedItemIds.includes(Number(r.item_id)));
  }, [data, selectedItemIds, showMode]);

  const comparisonChartData = useMemo(() => {
    if (showMode !== "comparison" || !comparisonItems.length) return [];
    const seriesByItem = data?.series_by_item?.[metric] ?? {};
    const byTime = new Map<string, any>();
    for (const item of comparisonItems) {
      const itemSeries = seriesByItem[String(item.id)] ?? [];
      for (const point of itemSeries) {
        const row = byTime.get(point.t) ?? { t: point.t, label: isoToLabel(point.t, gran) };
        row[`v_${item.id}`] = Number(point.v ?? 0);
        byTime.set(point.t, row);
      }
    }
    return Array.from(byTime.values()).sort((a, b) => String(a.t).localeCompare(String(b.t)));
  }, [comparisonItems, data, gran, metric, showMode]);

  const comparisonSeries = useMemo(() => {
    return comparisonItems.map((item, idx) => ({
      id: item.id,
      label: item.label,
      subLabel: item.subLabel,
      valueKey: `v_${item.id}`,
      color: COMPARISON_COLORS[idx % COMPARISON_COLORS.length],
      visible: comparisonVisibility[item.id] ?? true,
    }));
  }, [comparisonItems, comparisonVisibility]);

  const total = showMode === "all" ? data?.pagination.total ?? 0 : tableRows.length;
  const canPrev = showMode === "all" && offset > 0;
  const canNext = showMode === "all" && offset + limit < total;
  const tableEmptyMessage =
    showMode === "single" && !selectedItem
      ? "Select a product to view results."
      : showMode === "comparison" && comparisonItems.length === 0
      ? "Select products to compare."
      : "No results for this range.";
  const exportDisabled =
    exporting ||
    loading ||
    !data ||
    (showMode === "single" && !selectedItem) ||
    (showMode === "comparison" && comparisonItems.length === 0);
  const exportTitle = exportDisabled
    ? showMode === "single" && !selectedItem
      ? "Select a product first"
      : showMode === "comparison" && comparisonItems.length === 0
      ? "Select products first"
      : "Load data first"
    : "Export all rows to CSV";

  const compareSub = (
    current: number,
    compare: number | null | undefined,
    formatter: (value: number) => string
  ) => (compareEnabled ? buildCompareSub(current, compare, formatter) : undefined);

  async function handleExportCsv() {
    if (exporting) return;
    if (showMode === "single" && !selectedItem) return;
    if (showMode === "comparison" && comparisonItems.length === 0) return;

    setExporting(true);
    setErr(null);

    try {
      // Fetch ALL rows (not just current page)
      // If you expect very large datasets later, we can add a backend CSV endpoint + streaming.
      const commonArgs = {
        start,
        end,
        locationIds: locationIds === "ALL" ? undefined : locationIds,
        itemsMode,
        granularity,
        sort,
        order,
      };

      const res =
        showMode === "all"
          ? await fetchProductsReport({
              ...commonArgs,
              search: search.trim() || undefined,
              limit: 100000,
              offset: 0,
            })
          : await fetchProductsReport({
              ...commonArgs,
              itemIds: selectedItemIds,
              limit: 100000,
              offset: 0,
            });

      const allowedIds = new Set(selectedItemIds);
      const filtered =
        showMode === "all"
          ? res.results ?? []
          : (res.results ?? []).filter((r) => r.item_id != null && allowedIds.has(Number(r.item_id)));

      const header = ["Product", "SKU", "Items sold", "Net sales", "Net discount", "Orders"];
      const rows = filtered.map((r) => [
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

          <div className="md:col-span-1">
            <label className="text-xs text-kk-dark-text-muted">Show</label>
            <select
              value={showMode}
              onChange={(e) => {
                setOffset(0);
                setShowMode(e.target.value as any);
              }}
              className="mt-1 w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
            >
              <option value="all">All Products</option>
              <option value="single">Single Product</option>
              <option value="comparison">Comparison</option>
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

          {showMode === "all" ? (
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
          ) : null}

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

        {showMode === "single" ? (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-3">
              <label className="text-xs text-kk-dark-text-muted">Product</label>
              <div className="mt-1">
                <ItemSearchSelect
                  valueId={selectedItem?.id ?? null}
                  valueLabel={selectedItem?.label}
                  valueSubLabel={selectedItem?.subLabel}
                  onChange={(_, option) => {
                    setSelectedItem(option ?? null);
                    setOffset(0);
                  }}
                  loadOptions={loadItemOptions}
                  placeholder="Search items..."
                />
              </div>
            </div>
          </div>
        ) : null}

        {showMode === "comparison" ? (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="md:col-span-4">
              <label className="text-xs text-kk-dark-text-muted">Compare products</label>
              <div className="mt-1">
                <ItemSearchSelect
                  valueId={null}
                  onChange={(_, option) => {
                    if (!option) return;
                    setComparisonItems((prev) =>
                      prev.some((item) => item.id === option.id) ? prev : [...prev, option]
                    );
                    setOffset(0);
                  }}
                  loadOptions={loadItemOptions}
                  placeholder="Search items to compare..."
                />
              </div>
              {comparisonItems.length ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {comparisonItems.map((item) => (
                    <span
                      key={item.id}
                      className="inline-flex items-center gap-2 rounded-full border border-kk-dark-input-border bg-kk-dark-bg px-3 py-1 text-xs"
                    >
                      <span className="text-kk-dark-text">{item.label}</span>
                      {item.subLabel ? (
                        <span className="text-kk-dark-text-muted">{item.subLabel}</span>
                      ) : null}
                      <button
                        type="button"
                        className="rounded p-0.5 hover:bg-[rgba(255,255,255,0.06)]"
                        onClick={() => {
                          setComparisonItems((prev) => prev.filter((p) => p.id !== item.id));
                        }}
                        title="Remove"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-xs text-kk-dark-text-muted">
                  Add products to compare.
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-kk-dark-text-muted">
            {showMode === "all" ? (
              data ? (
                <>
                  Showing {Math.min(offset + 1, total)}-{Math.min(offset + limit, total)} of {total}
                </>
              ) : (
                " "
              )
            ) : showMode === "single" ? (
              selectedItem ? "Showing 1 product" : "Select a product to view results"
            ) : comparisonItems.length ? (
              `Showing ${comparisonItems.length} products`
            ) : (
              "Select products to compare"
            )}
          </div>

          {showMode === "all" ? (
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
          ) : null}
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
      {showMode === "comparison" ? (
        <ComparisonChartCard
          title={metric === "net_sales" ? "Net sales" : metric === "orders" ? "Orders" : "Items sold"}
          data={comparisonChartData}
          dataKey="label"
          kind={metric === "net_sales" ? "money" : "count"}
          titleAccessory={
            <MetricDropdownButton
              value={metric}
              options={productMetricOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
              onChange={(value) => setMetric(value as typeof metric)}
            />
          }
          series={comparisonSeries}
          onToggle={(id) => {
            setComparisonVisibility((prev) => ({ ...prev, [id]: !(prev[id] ?? true) }));
          }}
          emptyLabel={
            loading
              ? "Loading comparison..."
              : comparisonItems.length
              ? "No data for selected products."
              : "Select products to compare."
          }
        />
      ) : (
        <ChartCard
          title={metric === "net_sales" ? "Net sales" : metric === "orders" ? "Orders" : "Items sold"}
          data={chartData}
          dataKey="label"
          valueKey="v"
          compareValueKey={compareEnabled ? "compare_v" : undefined}
          kind={metric === "net_sales" ? "money" : "count"}
          titleAccessory={
            <MetricDropdownButton
              value={metric}
              options={productMetricOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
              onChange={(value) => setMetric(value as typeof metric)}
            />
          }
        />
      )}

      {/* Table */}
      <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <div className="font-medium">{showMode === "all" ? "Products" : "Selected products"}</div>
            {showMode === "all" ? (
              <div className="text-xs text-kk-dark-text-muted">
                Group rows (no SKU) represent an ItemGroup; click to view variations.
              </div>
            ) : null}
          </div>

          <button
            onClick={handleExportCsv}
            disabled={exportDisabled}
            className="flex gap-2 items-center rounded-md border border-kk-dark-input-border px-3 py-1 text-sm disabled:opacity-50"
            title={exportTitle}
          >
            <CloudDownload className="h-5 w-5"/>
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
        </div>

        {err ? <div className="p-4 text-sm text-red-600">{err}</div> : null}
        {loading && !data ? <div className="p-4 text-sm">Loading...</div> : null}

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
              {showMode === "all" ? (
                tableRows.map((r) => {
                  const isGroup = r.row_type === "group";
                  return (
                    <tr
                      key={r.row_id}
                      className={[
                        isGroup ? "bg-kk-dark-bg-elevated cursor-pointer" : "bg-kk-dark-bg-elevated",
                      ].join(" ")}
                      onClick={() => {
                        if (!isGroup || !r.group_id) return;
                        navigate(`/reports/products/group/${r.group_id}?start=${start}&end=${end}`);
                      }}
                      title={isGroup ? "View variations" : undefined}
                    >
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          {isGroup ? (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-kk-dark-bg text-indigo-700 text-xs">
                              &rsaquo;
                            </span>
                          ) : (
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-kk-dark-bg text-gray-700 text-xs">
                              &bull;
                            </span>
                          )}
                          <span className="font-medium">{r.name}</span>
                          {isGroup ? (
                            <span className="text-xs text-kk-dark-text-muted">(group)</span>
                          ) : (
                            <span className="text-xs text-kk-dark-text-muted">(item)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2">{r.sku ?? <span className="text-kk-dark-text-muted">&mdash;</span>}</td>
                      <td className="px-4 py-2 text-right">{formatNumber(Number(r.items_sold ?? 0))}</td>
                      <td className="px-4 py-2 text-right">{formatMoneyNGN(Number(r.net_sales ?? 0))}</td>
                      <td className="px-4 py-2 text-right">{formatMoneyNGN(Number(r.net_discount ?? 0))}</td>
                      <td className="px-4 py-2 text-right">{formatNumber(Number(r.orders ?? 0))}</td>
                    </tr>
                  );
                })
              ) : (
                tableRows.map((r) => (
                  <tr key={r.item_id ?? r.row_id} className="bg-kk-dark-bg-elevated">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-kk-dark-bg text-gray-700 text-xs">
                          &bull;
                        </span>
                        <span className="font-medium">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">{r.sku ?? <span className="text-kk-dark-text-muted">&mdash;</span>}</td>
                    <td className="px-4 py-2 text-right">{formatNumber(Number(r.items_sold ?? 0))}</td>
                    <td className="px-4 py-2 text-right">{formatMoneyNGN(Number(r.net_sales ?? 0))}</td>
                    <td className="px-4 py-2 text-right">{formatMoneyNGN(Number(r.net_discount ?? 0))}</td>
                    <td className="px-4 py-2 text-right">{formatNumber(Number(r.orders ?? 0))}</td>
                  </tr>
                ))
              )}

              {!loading && tableRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-kk-dark-text-muted">
                    {tableEmptyMessage}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {loading && data ? <div className="px-4 py-3 text-xs text-kk-dark-text-muted">Refreshing...</div> : null}
      </div>
  );
}

