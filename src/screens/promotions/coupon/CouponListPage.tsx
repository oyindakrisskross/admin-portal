import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, TicketPercent } from "lucide-react";

import { useAuth } from "../../../auth/AuthContext";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import SidePeek from "../../../components/layout/SidePeek";
import type { Coupon } from "../../../types/promotions";
import { ACTION_CHOICES } from "../../../types/promotions";
import { fetchCoupons } from "../../../api/promotions";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";
import { CouponPeek } from "./CouponPeek";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

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

  const hasPeek = !!selectedCoupon;

  useEffect(() => {
    (async () => {
      const data = await fetchCoupons();
      setCoupons(data.results);
    })();
  }, []);

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
            !hasPeek && can("Coupons", "create") ? (
              <button
                onClick={() => navigate("/promotions/coupons/new")}
                className="new inline-flex items-center gap-1 rounded-full"
              >
                <Plus className="h-3 w-3" />
                New
              </button>
            ) : null
          }
        />

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
                <tr
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => openCoupon(c)}
                >
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

              {!rows.length && (
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
      </div>

      {selectedCoupon && (
        <SidePeek
          isOpen={hasPeek}
          onClose={closePeek}
          widthClass="w-3/4"
          actions={
            can("Coupons", "edit") ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => navigate(`/promotions/coupons/${selectedId}/edit`)}
                >
                  <span className="tooltip-b">Edit</span>
                  <PencilSquareIcon className="h-5 w-5 text-kk-muted" />
                </button>
              </div>
            ) : null
          }
        >
          <CouponPeek coupon={selectedCoupon} />
        </SidePeek>
      )}
    </div>
  );
};
