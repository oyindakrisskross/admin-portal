// src/screens/reports/InvoicesReportPage.tsx

import { useCallback, useEffect, useMemo, useState } from "react";
import { csvEscape, downloadCsv, formatMoneyNGN, formatNumber, makeFilename, toDateStrShort } from "../../helpers";
import type { Outlet } from "../../types/location";
import type { Granularity, ReportResponse, InvoiceAdvancedFilters } from "../../types/reports";
import { fetchInvoicesReport } from "../../api/reports";
import { fetchItemGroups, searchItems } from "../../api/catalog";
import { fetchOutlets } from "../../api/location";
import type { FilterSet } from "../../types/filters";
import { ItemSearchSelect, type ItemOption } from "../../components/catalog/ItemSearchSelect";
import { KpiCard } from "../../components/reports/KpiCard";
import { ChartCard } from "../../components/reports/ChartCard";
import { MetricDropdownButton } from "../../components/reports/MetricDropdownButton";
import { buildComparisonChartData, buildCompareSub } from "../../components/reports/periodCompare";
import { ReportDateRangePicker } from "../../components/date/ReportDateRangePicker";
import { CloudDownload, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useReportDateRange } from "../../hooks/useReportDateRange";
import { useComparePeriod } from "../../hooks/useComparePeriod";
import { useReportAutoRefresh } from "../../hooks/useReportAutoRefresh";

type InvoiceFilterType = "coupon" | "product" | "variation" | "refund" | "status";
type InvoiceFilterMode = "include" | "exclude" | "is" | "is_not";
type RefundFilterValue = "all" | "none" | "partial" | "full";

type InvoiceFilterClause = {
  id: string;
  type: InvoiceFilterType;
  mode?: InvoiceFilterMode;
  values?: string[];
  items?: ItemOption[];
  refund?: RefundFilterValue;
};

const FILTER_TYPE_OPTIONS: Array<{ value: InvoiceFilterType; label: string }> = [
  { value: "coupon", label: "Coupon Code" },
  { value: "product", label: "Product" },
  { value: "variation", label: "Product Variation" },
  { value: "refund", label: "Refund" },
  { value: "status", label: "Order Status" },
];

const INVOICE_STATUS_OPTIONS = [
  { value: "PAID", label: "Paid" },
  { value: "REFUNDED", label: "Refunded" },
  { value: "VOID", label: "Void" },
  { value: "OPEN", label: "Open" },
  { value: "DRAFT", label: "Draft" },
];

const invoiceMetricOptions = [
  { value: "net_sales", label: "Net sales" },
  { value: "items_sold", label: "Items sold" },
] as const;

const makeFilterId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function InvoicesReportPage() {
  
  const navigate = useNavigate();
  const { start, end, setStart, setEnd } = useReportDateRange();
  const { compareEnabled, compareRange, compareMode, setCompareMode } = useComparePeriod({ start, end });
  const refreshTick = useReportAutoRefresh({ start, end, onlyWhenRangeIncludesToday: true });

  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [locationIds, setLocationIds] = useState<number[] | "ALL">("ALL");

  const [search] = useState("");
  const [sort, setSort] = useState<"net_sales" | "number" | "items_sold">("number");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ReportResponse | null>(null);
  const [compareData, setCompareData] = useState<ReportResponse | null>(null);

  const [granularity, setGranularity] = useState<Granularity | undefined>(undefined);
  const [metric, setMetric] = useState<"net_sales" | "items_sold">("net_sales");

  const [showMode, setShowMode] = useState<"all" | "advanced">("all");
  const [matchMode, setMatchMode] = useState<"all" | "any">("all");
  const [appliedMatchMode, setAppliedMatchMode] = useState<"all" | "any">("all");
  const [draftFilters, setDraftFilters] = useState<InvoiceFilterClause[]>([]);
  const [appliedFilters, setAppliedFilters] = useState<InvoiceFilterClause[]>([]);
  const [newFilterType, setNewFilterType] = useState<InvoiceFilterType>("coupon");
  const [couponInputs, setCouponInputs] = useState<Record<string, string>>({});

  const [exporting, setExporting] = useState(false);

  const loadItemOptions = useCallback(async (query: string, signal?: AbortSignal) => {
    const res = await searchItems(query, { page_size: 25, signal });
    return (res.results ?? []).map((item) => ({
      id: Number(item.id),
      label: item.name,
      subLabel: item.sku ?? undefined,
    }));
  }, []);

  const loadGroupOptions = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q) return [];
    const filters: FilterSet = { clauses: [{ field: "name", operator: "contains", value: q }] };
    const res = await fetchItemGroups({ filters });
    return (res.results ?? []).slice(0, 25).map((group: any) => ({
      id: Number(group.id),
      label: group.name,
    }));
  }, []);

  const addFilter = () => {
    const id = makeFilterId();
    const base: InvoiceFilterClause = { id, type: newFilterType };
    const next: InvoiceFilterClause =
      newFilterType === "coupon"
        ? { ...base, mode: "include", values: [] }
        : newFilterType === "product"
        ? { ...base, mode: "include", items: [] }
        : newFilterType === "variation"
        ? { ...base, mode: "include", items: [] }
        : newFilterType === "status"
        ? { ...base, mode: "is", values: [INVOICE_STATUS_OPTIONS[0]?.value ?? "PAID"] }
        : { ...base, refund: "all" };

    setDraftFilters((prev) => [...prev, next]);
  };

  const updateFilter = (id: string, patch: Partial<InvoiceFilterClause>) => {
    setDraftFilters((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeFilter = (id: string) => {
    setDraftFilters((prev) => prev.filter((f) => f.id !== id));
    setCouponInputs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const clearFilters = () => {
    setDraftFilters([]);
    setAppliedFilters([]);
    setMatchMode("all");
    setAppliedMatchMode("all");
    setOffset(0);
  };

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setAppliedMatchMode(matchMode);
    setOffset(0);
  };

  const advancedFilters: InvoiceAdvancedFilters | undefined = useMemo(() => {
    if (showMode !== "advanced") return undefined;

    const clauses = appliedFilters
      .map((f) => {
        if (f.type === "coupon") {
          const values = (f.values ?? []).map((v) => v.trim()).filter(Boolean);
          if (!values.length) return null;
          return { type: "coupon" as const, mode: f.mode ?? "include", values };
        }
        if (f.type === "product") {
          const groupIds = (f.items ?? []).map((item) => item.id).filter(Number.isFinite);
          if (!groupIds.length) return null;
          return { type: "product" as const, mode: f.mode ?? "include", group_ids: groupIds };
        }
        if (f.type === "variation") {
          const itemIds = (f.items ?? []).map((item) => item.id).filter(Number.isFinite);
          if (!itemIds.length) return null;
          return { type: "variation" as const, mode: f.mode ?? "include", item_ids: itemIds };
        }
        if (f.type === "status") {
          const values = (f.values ?? []).map((v) => v.trim()).filter(Boolean);
          if (!values.length) return null;
          return { type: "status" as const, mode: f.mode ?? "is", values };
        }
        if (f.type === "refund") {
          const refund = f.refund ?? "all";
          if (refund === "all") return null;
          return { type: "refund" as const, refund };
        }
        return null;
      })
      .filter(Boolean) as InvoiceAdvancedFilters["clauses"];

    if (!clauses.length) return undefined;
    return { match: appliedMatchMode, clauses };
  }, [appliedFilters, appliedMatchMode, showMode]);

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
          advancedFilters,
        };
        const [res, compareRes] = await Promise.all([
          fetchInvoicesReport({
            ...commonArgs,
            start,
            end,
          }),
          compareRange
            ? fetchInvoicesReport({
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
  }, [start, end, locationIds, search, sort, order, limit, offset, granularity, advancedFilters, compareRange?.start, compareRange?.end, refreshTick]);

  useEffect(() => {
    fetchOutlets().then(setOutlets).catch(() => {
      // keep non-blocking; selector can still show "All locations"
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
      const res = await fetchInvoicesReport({
        start,
        end,
        locationIds: locationIds === "ALL" ? undefined : locationIds,
        granularity,
        search: search.trim() || undefined,
        sort,
        order,
        advancedFilters,
        limit: 100000, // big number to get everything
        offset: 0,
      });

      const header = ["Date", "Invoice #", "Location", "Items sold", "Coupons", "Subtotal"];
      const rows = (res.results ?? []).map((r) => [
        csvEscape(toDateStrShort(r.invoice_date ?? "")),
        csvEscape(r.invoice_number ?? ""),
        csvEscape(r.location ?? ""),
        csvEscape(r.items_sold ?? 0),
        csvEscape((r.coupon_code ?? "").trim() || ""),
        csvEscape(r.subtotal_after_discount ?? 0),
      ]);

      const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
      downloadCsv(makeFilename(locationIds, start, end), csv);
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
            <label className="text-xs text-kk-dark-text-muted">Show</label>
            <select
              value={showMode}
              onChange={(e) => {
                setOffset(0);
                setShowMode(e.target.value as any);
              }}
              className="mt-1 w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
            >
              <option value="all">All invoices</option>
              <option value="advanced">Advanced Filters</option>
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
          
          {/* TODO: Phase 2 */}
          {/* <div className="md:col-span-1">
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
          </div> */}

          <div className="md:col-span-1">
            <label className="text-xs text-kk-dark-text-muted">Sort</label>
            <div className="mt-1 flex gap-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
              >
                <option value="net_sales">Net sales</option>
                <option value="items_sold">Items Sold</option>
                <option value="number">Invoice Number</option>
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

        {showMode === "advanced" ? (
          <div className="mt-4 rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated p-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-kk-dark-text-muted">Invoices match</span>
              <select
                value={matchMode}
                onChange={(e) => setMatchMode(e.target.value as any)}
                className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-sm"
              >
                <option value="all">All</option>
                <option value="any">Any</option>
              </select>
              <span className="text-kk-dark-text-muted">filters</span>
            </div>

            <div className="mt-4 space-y-4">
              {draftFilters.length === 0 ? (
                <div className="text-xs text-kk-dark-text-muted">No filters added yet.</div>
              ) : null}

              {draftFilters.map((filter) => (
                <div
                  key={filter.id}
                  className="rounded-md border border-kk-dark-border bg-kk-dark-bg p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-medium">
                      {FILTER_TYPE_OPTIONS.find((o) => o.value === filter.type)?.label ?? "Filter"}
                    </div>
                    <button
                      type="button"
                      className="text-xs text-kk-dark-text-muted hover:text-kk-dark-text"
                      onClick={() => removeFilter(filter.id)}
                    >
                      Remove
                    </button>
                  </div>

                  {filter.type === "coupon" ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={filter.mode ?? "include"}
                          onChange={(e) => updateFilter(filter.id, { mode: e.target.value as InvoiceFilterMode })}
                          className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
                        >
                          <option value="include">Includes</option>
                          <option value="exclude">Excludes</option>
                        </select>
                        <input
                          value={couponInputs[filter.id] ?? ""}
                          onChange={(e) =>
                            setCouponInputs((prev) => ({ ...prev, [filter.id]: e.target.value }))
                          }
                          placeholder="Add coupon code"
                          className="flex-1 rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
                        />
                        <button
                          type="button"
                          className="rounded-md border border-kk-dark-input-border px-2 py-1 text-xs"
                          onClick={() => {
                            const nextValue = (couponInputs[filter.id] ?? "").trim();
                            if (!nextValue) return;
                            const values = new Set([...(filter.values ?? []), nextValue]);
                            updateFilter(filter.id, { values: Array.from(values) });
                            setCouponInputs((prev) => ({ ...prev, [filter.id]: "" }));
                          }}
                        >
                          Add
                        </button>
                      </div>
                      {filter.values?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {filter.values.map((code) => (
                            <span
                              key={code}
                              className="inline-flex items-center gap-2 rounded-full border border-kk-dark-input-border bg-kk-dark-bg px-3 py-1 text-xs"
                            >
                              <span className="text-kk-dark-text">{code}</span>
                              <button
                                type="button"
                                className="rounded p-0.5 hover:bg-[rgba(255,255,255,0.06)]"
                                onClick={() =>
                                  updateFilter(filter.id, {
                                    values: (filter.values ?? []).filter((v) => v !== code),
                                  })
                                }
                                title="Remove"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-kk-dark-text-muted">No coupon codes selected.</div>
                      )}
                    </div>
                  ) : null}

                  {filter.type === "product" ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={filter.mode ?? "include"}
                          onChange={(e) => updateFilter(filter.id, { mode: e.target.value as InvoiceFilterMode })}
                          className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
                        >
                          <option value="include">Includes</option>
                          <option value="exclude">Excludes</option>
                        </select>
                        <div className="flex-1">
                          <ItemSearchSelect
                            valueId={null}
                            onChange={(_, option) => {
                              if (!option) return;
                              const items = filter.items ?? [];
                              if (items.some((item) => item.id === option.id)) return;
                              updateFilter(filter.id, { items: [...items, option] });
                            }}
                            loadOptions={loadGroupOptions}
                            placeholder="Search products..."
                          />
                        </div>
                      </div>
                      {filter.items?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {filter.items.map((item) => (
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
                                onClick={() =>
                                  updateFilter(filter.id, {
                                    items: (filter.items ?? []).filter((v) => v.id !== item.id),
                                  })
                                }
                                title="Remove"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-kk-dark-text-muted">No products selected.</div>
                      )}
                    </div>
                  ) : null}

                  {filter.type === "variation" ? (
                    <div className="mt-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={filter.mode ?? "include"}
                          onChange={(e) => updateFilter(filter.id, { mode: e.target.value as InvoiceFilterMode })}
                          className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
                        >
                          <option value="include">Includes</option>
                          <option value="exclude">Excludes</option>
                        </select>
                        <div className="flex-1">
                          <ItemSearchSelect
                            valueId={null}
                            onChange={(_, option) => {
                              if (!option) return;
                              const items = filter.items ?? [];
                              if (items.some((item) => item.id === option.id)) return;
                              updateFilter(filter.id, { items: [...items, option] });
                            }}
                            loadOptions={loadItemOptions}
                            placeholder="Search variations..."
                          />
                        </div>
                      </div>
                      {filter.items?.length ? (
                        <div className="flex flex-wrap gap-2">
                          {filter.items.map((item) => (
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
                                onClick={() =>
                                  updateFilter(filter.id, {
                                    items: (filter.items ?? []).filter((v) => v.id !== item.id),
                                  })
                                }
                                title="Remove"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-kk-dark-text-muted">No variations selected.</div>
                      )}
                    </div>
                  ) : null}

                  {filter.type === "status" ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select
                        value={filter.mode ?? "is"}
                        onChange={(e) => updateFilter(filter.id, { mode: e.target.value as InvoiceFilterMode })}
                        className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
                      >
                        <option value="is">Is</option>
                        <option value="is_not">Is not</option>
                      </select>
                      <select
                        value={filter.values?.[0] ?? INVOICE_STATUS_OPTIONS[0]?.value ?? "PAID"}
                        onChange={(e) => updateFilter(filter.id, { values: [e.target.value] })}
                        className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
                      >
                        {INVOICE_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}

                  {filter.type === "refund" ? (
                    <div className="mt-3">
                      <select
                        value={filter.refund ?? "all"}
                        onChange={(e) => updateFilter(filter.id, { refund: e.target.value as RefundFilterValue })}
                        className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
                      >
                        <option value="all">All</option>
                        <option value="none">No refund</option>
                        <option value="partial">Partially refunded</option>
                        <option value="full">Fully refunded</option>
                      </select>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={newFilterType}
                  onChange={(e) => setNewFilterType(e.target.value as InvoiceFilterType)}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
                >
                  {FILTER_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={addFilter}
                  className="rounded-md border border-kk-dark-input-border px-3 py-1 text-xs"
                >
                  Add filter
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-md border border-kk-dark-input-border px-3 py-1 text-xs text-kk-dark-text-muted"
                >
                  Clear filters
                </button>
                <button
                  type="button"
                  onClick={applyFilters}
                  className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-1 text-xs"
                >
                  Apply filters
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-kk-dark-text-muted">
            {data ? (
              <>
                Showing {Math.min(offset + 1, total)}-{Math.min(offset + limit, total)} of {total}
              </>
            ) : " "}
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
          label="Orders"
          value={data ? formatNumber(Number(data.kpi.orders ?? 0)) : "-"}
          sub={data ? compareSub(Number(data.kpi.orders ?? 0), Number(compareData?.kpi.orders ?? 0), formatNumber) : undefined}
        />
        <KpiCard
          label="Net Sales"
          value={data ? formatMoneyNGN(Number(data.kpi.net_sales ?? 0)) : "-"}
          sub={data ? compareSub(Number(data.kpi.net_sales ?? 0), Number(compareData?.kpi.net_sales ?? 0), formatMoneyNGN) : undefined}
        />
        <KpiCard
          label="Avg Sale Value"
          value={data ? formatMoneyNGN(Number(data.kpi.avg_value ?? 0)) : "-"}
          sub={data ? compareSub(Number(data.kpi.avg_value ?? 0), Number(compareData?.kpi.avg_value ?? 0), formatMoneyNGN) : undefined}
        />
        <KpiCard
          label="Total Refunded"
          value={data ? formatMoneyNGN(Number(data.kpi.total_refunded ?? 0)) : "-"}
          sub={
            data ? compareSub(Number(data.kpi.total_refunded ?? 0), Number(compareData?.kpi.total_refunded ?? 0), formatMoneyNGN) : undefined
          }
        />
      </div>

      {/* Charts */}
      <ChartCard
        title={metric === "net_sales" ? "Net sales" : "Items sold"}
        data={chartData}
        dataKey="label"
        valueKey="v"
        compareValueKey={compareEnabled ? "compare_v" : undefined}
        kind={metric === "net_sales" ? "money" : "count"}
        titleAccessory={
          <MetricDropdownButton
            value={metric}
            options={invoiceMetricOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
            onChange={(value) => setMetric(value as typeof metric)}
          />
        }
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
            <CloudDownload className="h-5 w-5" />
            {exporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>

        {err ? <div className="p-4 text-sm text-red-600">{err}</div> : null}
        {loading && !data ? <div className="p-4 text-sm">Loading...</div> : null}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-kk-dark-bg-elevated text-kk-dark-text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Date</th>
                <th className="px-4 py-2 text-left font-medium">Invoice #</th>
                <th className="px-4 py-2 text-right font-medium">Location</th>
                <th className="px-4 py-2 text-right font-medium">Items Sold</th>
                <th className="px-4 py-2 text-right font-medium">Coupons</th>
                <th className="px-4 py-2 text-right font-medium">Subtotal</th>
              </tr>
            </thead>

            <tbody>
              {(data?.results ?? []).map((r) => {
                return (
                  <tr 
                    key={r.invoice_id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/sales/invoices/${r.invoice_id}`)}
                  >
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-kk-dark-bg text-gray-700 text-xs">
                          •
                        </span>
                        <span className="font-medium">{toDateStrShort(r.invoice_date)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">{r.invoice_number}</td>
                    <td className="px-4 py-2">{r.location}</td>
                    <td className="px-4 py-2">{r.items_sold}</td>
                    <td className="px-4 py-2">{(r.coupon_code ?? "").trim() || "-"}</td>
                    <td className="px-4 py-2">
                      {formatMoneyNGN(
                        Number(
                          r.subtotal_after_discount ??
                            Number(r.subtotal ?? 0) - Number(r.discount_total ?? 0)
                        )
                      )}
                    </td>
                  </tr>
                );
              })}

              {!loading && (data?.results?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-kk-dark-text-muted">
                    No results for this range.
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
