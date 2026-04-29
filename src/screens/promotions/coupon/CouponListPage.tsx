import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, RefreshCcw, Search, TicketPercent } from "lucide-react";

import { useAuth } from "../../../auth/AuthContext";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import SidePeek from "../../../components/layout/SidePeek";
import type { Coupon } from "../../../types/promotions";
import { ACTION_CHOICES } from "../../../types/promotions";
import {
  bulkCoupons,
  deleteCoupon,
  fetchCoupons,
  resetCouponUsage,
  updateCoupon,
} from "../../../api/promotions";
import { nextSort, sortIndicator, type SortState } from "../../../utils/sort";
import { CouponPeek } from "./CouponPeek";
import {
  CalendarDaysIcon,
  PencilSquareIcon,
  PlayIcon,
  PauseIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import ToastModal from "../../../components/ui/ToastModal";
import { FilterBar } from "../../../components/filter/FilterBar";
import { BulkActionBar } from "../../../components/catalog/bulk/BulkActionBar";
import { RowSelectCheckbox } from "../../../components/catalog/bulk/RowSelectCheckbox";
import { BulkCouponDateModal } from "../../../components/promotions/BulkCouponDateModal";
import type { ColumnMeta, FilterSet } from "../../../types/filters";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const actionLabel = (v?: string) =>
  ACTION_CHOICES.find((a) => a.value === v)?.label ?? v ?? "-";

export const CouponListPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const hasId = Boolean(id);

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterSet>({ clauses: [] });
  const [sort, setSort] = useState<
    SortState<
      "name" | "code" | "id" | "action" | "start" | "end" | "status" | "description"
    > | null
  >(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [bulkDateAction, setBulkDateAction] = useState<"set_start_date" | "set_end_date" | null>(
    null
  );

  const hasPeek = !!selectedCoupon;
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("success");

  const filterColumns: ColumnMeta[] = useMemo(
    () => [
      {
        id: "status",
        label: "Status",
        type: "choice",
        choices: [
          { value: "ACTIVE", label: "Active" },
          { value: "INACTIVE", label: "Inactive" },
        ],
      },
      { id: "name", label: "Name", type: "text" },
      { id: "code", label: "Code", type: "text" },
      {
        id: "action_type",
        label: "Coupon action type",
        type: "choice",
        choices: ACTION_CHOICES.map((choice) => ({
          value: choice.value,
          label: choice.label,
        })),
      },
    ],
    []
  );

  const showToast = (message: string, variant: "error" | "success" | "info" = "success") => {
    setToastVariant(variant);
    setToastMessage(message);
  };

  const extractApiDetail = (err: any, fallback: string) => {
    const data = err?.response?.data;
    if (typeof data === "string") return data;
    if (data?.detail) return String(data.detail);
    return fallback;
  };

  const toggleSelected = (couponId: number, checked?: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const shouldSelect = checked ?? !next.has(couponId);
      if (shouldSelect) next.add(couponId);
      else next.delete(couponId);
      return Array.from(next);
    });
  };

  const clearSelection = () => setSelectedIds([]);

  const applySort = (
    key: "name" | "code" | "id" | "action" | "start" | "end" | "status" | "description"
  ) => {
    setSort((current) => nextSort(current, key));
    setPage(1);
  };

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const data = await fetchCoupons({
          filters,
          search: debouncedSearch || undefined,
          page,
          page_size: pageSize,
          ...(sort ? { sort: sort.key, order: sort.dir } : {}),
        });
        if (!cancelled) {
          const results = data.results ?? [];
          setCoupons(results);
          setTotalCount(Number(data.count ?? 0));
          const visible = new Set(
            results.map((row: any) => Number(row.id)).filter((value: number) => Number.isFinite(value))
          );
          setSelectedIds((prev) => prev.filter((couponId) => visible.has(couponId)));
        }
      } catch {
        if (!cancelled) {
          setCoupons([]);
          setTotalCount(0);
          setSelectedIds([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, filters, page, pageSize, sort]);

  useEffect(() => {
    if (!hasId || !coupons.length) return;

    const couponId = Number(id);
    const match = coupons.find((c) => c.id === couponId);

    if (match) {
      setSelectedCoupon(match);
      setSelectedId(match.id!);
    }
  }, [coupons, hasId, id]);

  const openCoupon = (c: Coupon) => {
    setSelectedCoupon(c);
    setSelectedId(c.id!);
  };

  const closePeek = () => {
    setSelectedCoupon(null);
    setSelectedId(null);
  };

  const handleDelete = async () => {
    if (!selectedId) return;
    if (!confirm("Delete this coupon? If it has been used, it will be deactivated instead.")) return;

    try {
      const res: any = await deleteCoupon(selectedId);
      if (res?.deactivated) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === selectedId ? { ...c, active: false } : c))
        );
        setSelectedCoupon((c) => (c ? { ...c, active: false } : c));
        showToast(res?.detail || "Coupon was used and has been deactivated.", "info");
      } else {
        setCoupons((prev) => prev.filter((c) => c.id !== selectedId));
        setSelectedCoupon(null);
        setSelectedId(null);
        setTotalCount((prev) => Math.max(0, prev - 1));
        showToast("Coupon deleted.", "success");
      }
    } catch (err: any) {
      const data = err?.response?.data;
      const detail = typeof data === "string" ? data : data?.detail;
      showToast(String(detail ?? "Unable to delete coupon."), "error");
    }
  };

  const handleResetUsage = async () => {
    if (!selectedId) return;
    if (!confirm("Reset coupon usage count to zero and activate this coupon?")) return;

    try {
      const updated = await resetCouponUsage(selectedId);
      setCoupons((prev) => prev.map((c) => (c.id === selectedId ? { ...c, ...updated } : c)));
      setSelectedCoupon((prev) => (prev ? { ...prev, ...updated } : prev));
      showToast("Coupon usage reset and coupon activated.", "success");
    } catch (err: any) {
      const data = err?.response?.data;
      const detail = typeof data === "string" ? data : data?.detail;
      showToast(String(detail ?? "Unable to reset coupon usage."), "error");
    }
  };

  const handleStatusChange = async () => {
    if (!selectedId || !selectedCoupon || statusBusy) return;

    const active = !selectedCoupon.active;
    setStatusBusy(true);
    try {
      const updated = await updateCoupon(selectedId, { active });
      setCoupons((prev) =>
        prev.map((coupon) =>
          coupon.id === selectedId ? { ...coupon, ...updated, active } : coupon
        )
      );
      setSelectedCoupon((prev) => (prev ? { ...prev, ...updated, active } : prev));
      showToast(`Coupon ${active ? "activated" : "deactivated"}.`, "success");
    } catch (err: any) {
      showToast(
        extractApiDetail(
          err,
          `Unable to ${active ? "activate" : "deactivate"} coupon.`
        ),
        "error"
      );
    } finally {
      setStatusBusy(false);
    }
  };

  const handleBulkStatusUpdate = async (active: boolean) => {
    setBulkBusy(true);
    try {
      const res = await bulkCoupons({
        ids: selectedIds,
        action: active ? "make_active" : "make_inactive",
      });
      const okSet = new Set((res.ok_ids ?? []).map(Number));
      setCoupons((prev) =>
        prev.map((coupon) =>
          okSet.has(Number(coupon.id)) ? { ...coupon, active } : coupon
        )
      );
      showToast(`Updated ${okSet.size} coupon(s).`, "success");
    } catch (err: any) {
      showToast(extractApiDetail(err, "Bulk update failed."), "error");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (
      !confirm(
        "Delete the selected coupons? Coupons already used in a transaction will be deactivated instead."
      )
    ) {
      return;
    }

    setBulkBusy(true);
    try {
      const res = await bulkCoupons({ ids: selectedIds, action: "delete" });
      const deletedSet = new Set((res.deleted_ids ?? []).map(Number));
      const deactivatedSet = new Set((res.deactivated_ids ?? []).map(Number));
      const failedIds = (res.failed ?? []).map((failure) => Number(failure.id)).filter(Number.isFinite);

      if (deletedSet.size || deactivatedSet.size) {
        setCoupons((prev) =>
          prev
            .filter((coupon) => !deletedSet.has(Number(coupon.id)))
            .map((coupon) =>
              deactivatedSet.has(Number(coupon.id)) ? { ...coupon, active: false } : coupon
            )
        );
        setTotalCount((prev) => Math.max(0, prev - deletedSet.size));
      }

      if (failedIds.length) {
        setSelectedIds(failedIds);
      } else {
        clearSelection();
      }

      const deletedCount = deletedSet.size;
      const deactivatedCount = deactivatedSet.size;
      if (deletedCount || deactivatedCount) {
        const parts: string[] = [];
        if (deletedCount) parts.push(`Deleted ${deletedCount} coupon(s)`);
        if (deactivatedCount) parts.push(`Deactivated ${deactivatedCount} used coupon(s)`);
        showToast(`${parts.join(". ")}.`, deactivatedCount ? "info" : "success");
      } else if (!failedIds.length) {
        showToast("No coupons were updated.", "info");
      }
    } catch (err: any) {
      showToast(extractApiDetail(err, "Bulk delete failed."), "error");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDateApply = async (value: string) => {
    if (!bulkDateAction) return;

    setBulkBusy(true);
    try {
      const res = await bulkCoupons({
        ids: selectedIds,
        action: bulkDateAction,
        value,
      });
      const okSet = new Set((res.ok_ids ?? []).map(Number));
      const field = bulkDateAction === "set_start_date" ? "start_at" : "end_at";
      setCoupons((prev) =>
        prev.map((coupon) =>
          okSet.has(Number(coupon.id)) ? { ...coupon, [field]: value } : coupon
        )
      );
      showToast(
        `${bulkDateAction === "set_start_date" ? "Start" : "End"} date updated for ${okSet.size} coupon(s).`,
        "success"
      );
      setBulkDateAction(null);
    } catch (err: any) {
      showToast(extractApiDetail(err, "Bulk date update failed."), "error");
    } finally {
      setBulkBusy(false);
    }
  };

  const rows = coupons;

  const toDate = (v?: string) => (v ? new Date(v).toLocaleString() : "-");
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);
  const paginationControls = !hasPeek && (
    <div className="flex items-center justify-between px-3 pb-2 text-xs text-kk-dark-text-muted">
      <div>
        Showing {rangeStart}-{rangeEnd} of {totalCount}
      </div>
      <div className="flex items-center gap-2">
        <span>Rows</span>
        <select
          className="rounded border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-xs"
          value={pageSize}
          onChange={(e) => {
            setPageSize(Number(e.target.value));
            setPage(1);
          }}
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="rounded border border-kk-dark-input-border px-2 py-1 disabled:opacity-50"
          disabled={!canPrev || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <button
          type="button"
          className="rounded border border-kk-dark-input-border px-2 py-1 disabled:opacity-50"
          disabled={!canNext || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex gap-4">
      <div
        className={`flex flex-col gap-4 ${!hasPeek ? "w-full" : "w-1/4"} ${
          hasPeek ? "h-screen overflow-hidden" : ""
        }`}
      >
        <ListPageHeader
          icon={<TicketPercent className="h-5 w-5" />}
          section="Promotions"
          title="Coupons"
          subtitle="Manage coupon codes and discounts."
          right={
            !hasPeek ? (
              <div className="flex items-center gap-2 text-xs">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-kk-muted" />
                  <input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    className="w-56 rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-8 py-1.5 text-xs"
                    placeholder="Search coupon name or code"
                  />
                </div>
                <FilterBar
                  columns={filterColumns}
                  filters={filters}
                  showPills={false}
                  onChange={(next) => {
                    setFilters(next);
                    setPage(1);
                  }}
                />
                {can("Coupons", "create") ? (
                  <button
                    onClick={() => navigate("/promotions/coupons/new")}
                    className="new inline-flex items-center gap-1 rounded-full"
                  >
                    <Plus className="h-3 w-3" />
                    New
                  </button>
                ) : null}
              </div>
            ) : null
          }
          below={
            !hasPeek ? (
              <FilterBar
                columns={filterColumns}
                filters={filters}
                showTrigger={false}
                onChange={(next) => {
                  setFilters(next);
                  setPage(1);
                }}
              />
            ) : null
          }
        />

        {!hasPeek && selectedIds.length > 0 && (
          <BulkActionBar
            count={selectedIds.length}
            onClear={clearSelection}
            actions={[
              {
                key: "delete",
                label: "Delete",
                icon: <TrashIcon className="h-4 w-4" />,
                disabled: bulkBusy || !can("Coupons", "delete"),
                onClick: handleBulkDelete,
              },
              {
                key: "inactive",
                label: "Make inactive",
                icon: <PauseIcon className="h-4 w-4" />,
                disabled: bulkBusy || !can("Coupons", "edit"),
                onClick: () => {
                  void handleBulkStatusUpdate(false);
                },
              },
              {
                key: "active",
                label: "Make active",
                icon: <PlayIcon className="h-4 w-4" />,
                disabled: bulkBusy || !can("Coupons", "edit"),
                onClick: () => {
                  void handleBulkStatusUpdate(true);
                },
              },
              {
                key: "start_date",
                label: "Set start date",
                icon: <CalendarDaysIcon className="h-4 w-4" />,
                disabled: bulkBusy || !can("Coupons", "edit"),
                onClick: () => setBulkDateAction("set_start_date"),
              },
              {
                key: "end_date",
                label: "Set end date",
                icon: <CalendarDaysIcon className="h-4 w-4" />,
                disabled: bulkBusy || !can("Coupons", "edit"),
                onClick: () => setBulkDateAction("set_end_date"),
              },
            ]}
          />
        )}

        {paginationControls}

        <div className={hasPeek ? "flex-1 overflow-y-auto" : "overflow-hidden px-4"}>
          <table className="min-w-full">
            <thead>
              <tr>
                {!hasPeek && <th className="w-10" />}
                <th
                  className="cursor-pointer select-none"
                  onClick={() => applySort("name")}
                >
                  {!hasPeek ? "Coupon Name" : "Coupon"}
                  {sortIndicator(sort, "name")}
                </th>
                {!hasPeek && (
                  <>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => applySort("code")}
                    >
                      Coupon Code{sortIndicator(sort, "code")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => applySort("id")}
                    >
                      Coupon ID{sortIndicator(sort, "id")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => applySort("action")}
                    >
                      Coupon Action Type{sortIndicator(sort, "action")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => applySort("start")}
                    >
                      Start Date{sortIndicator(sort, "start")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => applySort("end")}
                    >
                      End Date{sortIndicator(sort, "end")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => applySort("status")}
                    >
                      Status{sortIndicator(sort, "status")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => applySort("description")}
                    >
                      Description{sortIndicator(sort, "description")}
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr
                  key={c.id}
                  className={[
                    "cursor-pointer group",
                    !hasPeek && selectedIdSet.has(Number(c.id)) ? "bg-blue-600/10" : "",
                  ].join(" ")}
                  onClick={() => {
                    if (!hasPeek && selectedIds.length) {
                      toggleSelected(c.id!, !selectedIdSet.has(c.id!));
                      return;
                    }
                    openCoupon(c);
                  }}
                >
                  {!hasPeek && (
                    <td className="w-10 px-2">
                      <div className={selectedIdSet.has(c.id!) ? "" : "opacity-0 group-hover:opacity-100"}>
                        <RowSelectCheckbox
                          checked={selectedIdSet.has(c.id!)}
                          onChange={(checked) => toggleSelected(c.id!, checked)}
                        />
                      </div>
                    </td>
                  )}
                  <td>
                    {!hasPeek ? (
                      c.name
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-2 items-start">
                          <span>{c.name}</span>
                          <span className="text-[11px] text-kk-dark-text-muted">
                            {c.code ? `Code: ${c.code}` : "No code"}
                          </span>
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                              c.active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {c.active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </div>
                    )}
                  </td>

                  {!hasPeek && (
                    <>
                      <td>{c.code ?? "-"}</td>
                      <td>{c.id}</td>
                      <td>{actionLabel(c.action_type)}</td>
                      <td>{toDate(c.start_at)}</td>
                      <td>{toDate(c.end_at)}</td>
                      <td>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                            c.active
                              ? "bg-emerald-700 text-emerald-100"
                              : "bg-slate-400 text-slate-50"
                          }`}
                        >
                          {c.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="max-w-[420px]">
                        <span className="line-clamp-2 text-[11px] text-kk-dark-text-muted">
                          {c.description || "-"}
                        </span>
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {loading && (
                <tr>
                  <td
                    colSpan={hasPeek ? 1 : 9}
                    className="px-3 py-6 text-center text-xs text-kk-dark-text-muted"
                  >
                    Loading coupons...
                  </td>
                </tr>
              )}

              {!loading && !rows.length && (
                <tr>
                  <td
                    colSpan={hasPeek ? 1 : 9}
                    className="px-3 py-10 text-center text-xs text-kk-dark-text-muted"
                  >
                    No coupons yet. Click "New" to create your first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {paginationControls}
      </div>

      {selectedCoupon && (
        <SidePeek
          isOpen={hasPeek}
          onClose={closePeek}
          widthClass="w-3/4"
          actions={
            <div className="flex items-center gap-1">
              {can("Coupons", "edit") ? (
                <>
                  <button
                    type="button"
                    onClick={handleStatusChange}
                    disabled={statusBusy}
                    className={statusBusy ? "opacity-50" : undefined}
                  >
                    {selectedCoupon.active ? (
                      <>
                        <span className="tooltip-b">Deactivate</span>
                        <PauseIcon className="h-5 w-5 text-kk-muted" />
                      </>
                    ) : (
                      <>
                        <span className="tooltip-b">Activate</span>
                        <PlayIcon className="h-5 w-5 text-kk-muted" />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/promotions/coupons/${selectedId}/edit`)}
                  >
                    <span className="tooltip-b">Edit</span>
                    <PencilSquareIcon className="h-5 w-5 text-kk-muted" />
                  </button>
                </>
              ) : null}
              {can("Coupons", "delete") ? (
                <button type="button" onClick={handleDelete}>
                  <span className="tooltip-b">Delete</span>
                  <TrashIcon className="h-5 w-5 text-kk-muted" />
                </button>
              ) : null}
              {can("Coupons", "edit") ? (
                <button type="button" onClick={handleResetUsage}>
                  <span className="tooltip-b">Reset Usage</span>
                  <RefreshCcw className="h-5 w-5 text-kk-muted" />
                </button>
              ) : null}
            </div>
          }
        >
          <CouponPeek coupon={selectedCoupon} />
        </SidePeek>
      )}
      <ToastModal
        message={toastMessage}
        variant={toastVariant}
        onClose={() => setToastMessage(null)}
      />
      <BulkCouponDateModal
        open={bulkDateAction !== null}
        busy={bulkBusy}
        title={bulkDateAction === "set_start_date" ? "Set start date" : "Set end date"}
        description={
          bulkDateAction === "set_start_date"
            ? "Apply the same start date and time to all selected coupons."
            : "Apply the same end date and time to all selected coupons."
        }
        label={bulkDateAction === "set_start_date" ? "Start date" : "End date"}
        onClose={() => setBulkDateAction(null)}
        onApply={handleBulkDateApply}
      />
    </div>
  );
};
