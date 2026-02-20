import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Search, TicketPercent } from "lucide-react";

import { useAuth } from "../../../auth/AuthContext";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import SidePeek from "../../../components/layout/SidePeek";
import type { Coupon } from "../../../types/promotions";
import { ACTION_CHOICES } from "../../../types/promotions";
import { deleteCoupon, fetchCoupons } from "../../../api/promotions";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";
import { CouponPeek } from "./CouponPeek";
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import ToastModal from "../../../components/ui/ToastModal";

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

  const hasPeek = !!selectedCoupon;
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("success");

  const showToast = (message: string, variant: "error" | "success" | "info" = "success") => {
    setToastVariant(variant);
    setToastMessage(message);
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
          search: debouncedSearch || undefined,
          page,
          page_size: pageSize,
        });
        if (!cancelled) {
          setCoupons(data.results ?? []);
          setTotalCount(Number(data.count ?? 0));
        }
      } catch {
        if (!cancelled) {
          setCoupons([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, page, pageSize]);

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

  const rows = useMemo(() => {
    return sortBy(coupons, sort, {
      name: (c) => c.name ?? "",
      code: (c) => c.code ?? "",
      id: (c) => c.id ?? 0,
      action: (c) => c.action_type ?? "",
      start: (c) => (c.start_at ? new Date(c.start_at) : null),
      end: (c) => (c.end_at ? new Date(c.end_at) : null),
      status: (c) => (c.active ? "ACTIVE" : "INACTIVE"),
      description: (c) => c.description ?? "",
    });
  }, [coupons, sort]);

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
        />

        {paginationControls}

        <div className={hasPeek ? "flex-1 overflow-y-auto" : "overflow-hidden px-4"}>
          <table className="min-w-full">
            <thead>
              <tr>
                <th
                  className="cursor-pointer select-none"
                  onClick={() => setSort((s) => nextSort(s, "name"))}
                >
                  {!hasPeek ? "Coupon Name" : "Coupon"}
                  {sortIndicator(sort, "name")}
                </th>
                {!hasPeek && (
                  <>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "code"))}
                    >
                      Coupon Code{sortIndicator(sort, "code")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "id"))}
                    >
                      Coupon ID{sortIndicator(sort, "id")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "action"))}
                    >
                      Coupon Action Type{sortIndicator(sort, "action")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "start"))}
                    >
                      Start Date{sortIndicator(sort, "start")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "end"))}
                    >
                      End Date{sortIndicator(sort, "end")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "status"))}
                    >
                      Status{sortIndicator(sort, "status")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "description"))}
                    >
                      Description{sortIndicator(sort, "description")}
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="cursor-pointer" onClick={() => openCoupon(c)}>
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
                    colSpan={hasPeek ? 1 : 8}
                    className="px-3 py-6 text-center text-xs text-kk-dark-text-muted"
                  >
                    Loading coupons...
                  </td>
                </tr>
              )}

              {!loading && !rows.length && (
                <tr>
                  <td
                    colSpan={hasPeek ? 1 : 8}
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
                <button
                  type="button"
                  onClick={() => navigate(`/promotions/coupons/${selectedId}/edit`)}
                >
                  <span className="tooltip-b">Edit</span>
                  <PencilSquareIcon className="h-5 w-5 text-kk-muted" />
                </button>
              ) : null}
              {can("Coupons", "delete") ? (
                <button type="button" onClick={handleDelete}>
                  <span className="tooltip-b">Delete</span>
                  <TrashIcon className="h-5 w-5 text-kk-muted" />
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
    </div>
  );
};
