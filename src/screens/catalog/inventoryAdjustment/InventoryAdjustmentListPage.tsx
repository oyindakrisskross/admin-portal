import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import {
  BoltIcon,
  CalendarDaysIcon,
  DocumentTextIcon,
  HashtagIcon,
  MapPinIcon,
  ScaleIcon,
  TagIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

import type { InventoryAdjustmentOrder } from "../../../types/catalog";
import { useAuth } from "../../../auth/AuthContext";
import SidePeek from "../../../components/layout/SidePeek";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";
import { fetchInventoryAdjustments } from "../../../api/catalog";
import { InventoryAdjustmentPeek } from "./InventoryAdjustmentPeek";

const badgeClass = (status?: string) => {
  if (status === "ADJUSTED") return "bg-emerald-600/20 text-emerald-300 border-emerald-600/30";
  if (status === "PENDING") return "bg-yellow-600/20 text-yellow-200 border-yellow-600/30";
  return "bg-gray-600/20 text-gray-200 border-gray-600/30";
};

export const InventoryAdjustmentListPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const hasId = Boolean(id);

  const [rows, setRows] = useState<InventoryAdjustmentOrder[]>([]);
  const [selected, setSelected] = useState<InventoryAdjustmentOrder | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("error");

  const hasPeek = !!selected;

  const showToast = (message: string, variant: "error" | "success" | "info" = "error") => {
    setToastVariant(variant);
    setToastMessage(message);
  };

  const closePeek = () => {
    setSelected(null);
    setSelectedId(null);
  };

  const refresh = async () => {
    const data = await fetchInventoryAdjustments();
    setRows(data.results ?? []);
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    if (!hasId || !rows.length) return;
    const adjustmentId = Number(id);
    const match = rows.find((row) => row.id === adjustmentId);
    if (match) {
      setSelected(match);
      setSelectedId(match.id!);
    }
  }, [hasId, id, rows]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const da = a.request_date ? new Date(a.request_date).getTime() : 0;
      const db = b.request_date ? new Date(b.request_date).getTime() : 0;
      if (db !== da) return db - da;
      return (b.id ?? 0) - (a.id ?? 0);
    });
  }, [rows]);

  return (
    <div className="flex-1 flex gap-4">
      <div className={`flex flex-col gap-4 ${!hasPeek ? "w-full" : "w-1/4"} ${hasPeek ? "h-screen overflow-hidden" : ""}`}>
        <ListPageHeader
          icon={<span className="text-lg">#</span>}
          section="Catalog"
          title="Inventory Adjustments"
          subtitle="Review draft, pending, and completed stock adjustment orders."
          right={
            !hasPeek ? (
              <div className="flex items-center gap-2 text-xs">
                {can("Inventory Adjustment", "create") && (
                  <button
                    onClick={() => navigate("/catalog/inventory-adjustment/new")}
                    className="new inline-flex items-center gap-1 rounded-full"
                  >
                    <Plus className="h-3 w-3" />
                    New
                  </button>
                )}
              </div>
            ) : (
              ""
            )
          }
        />

        <div className={`px-6 pb-6 ${hasPeek ? "flex-1 overflow-y-auto" : "overflow-hidden"}`}>
          <table className="min-w-full">
            <thead>
              <tr>
                <th>
                  <CalendarDaysIcon className="table-icon" />
                  Date
                </th>
                <th>
                  <HashtagIcon className="table-icon" />
                  Adjustment #
                </th>
                <th>
                  <DocumentTextIcon className="table-icon" />
                  Description
                </th>
                <th>
                  <TagIcon className="table-icon" />
                  Reason
                </th>
                <th>
                  <BoltIcon className="table-icon" />
                  Status
                </th>
                <th>
                  <ScaleIcon className="table-icon" />
                  Total Qty
                </th>
                <th>
                  <MapPinIcon className="table-icon" />
                  Location
                </th>
                <th>
                  <UserIcon className="table-icon" />
                  Created by
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr
                  key={row.id}
                  className={[
                    "cursor-pointer group",
                    selectedId === row.id ? "bg-blue-600/10" : "",
                  ].join(" ")}
                  onClick={() => {
                    setSelected(row);
                    setSelectedId(row.id!);
                    navigate(`/catalog/inventory-adjustment/${row.id}`);
                  }}
                >
                  <td>{row.request_date ? new Date(row.request_date).toLocaleDateString() : "-"}</td>
                  <td>{row.number ?? "-"}</td>
                  <td>{row.description || "-"}</td>
                  <td>{row.reason ?? "-"}</td>
                  <td>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] ${badgeClass(row.status)}`}>
                      {row.status ?? "DRAFT"}
                    </span>
                  </td>
                  <td>{row.total_quantity ?? "-"}</td>
                  <td>{row.location_name ?? row.location}</td>
                  <td>{row.created_by_email ?? "-"}</td>
                </tr>
              ))}
              {!sortedRows.length && (
                <tr>
                  <td className="px-3 py-10 text-center text-xs text-kk-dark-text-muted" colSpan={8}>
                    No inventory adjustments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SidePeek
        isOpen={!!selected}
        onClose={() => {
          closePeek();
          navigate("/catalog/inventory-adjustment");
        }}
        widthClass="w-3/4"
        actions={<div className="text-xs font-semibold">{selected?.number ?? "Adjustment"}</div>}
      >
        {selected && (
          <InventoryAdjustmentPeek
            adjustment={selected}
            showToast={showToast}
            onUpdated={(next) => {
              setSelected(next);
              setRows((prev) => prev.map((row) => (row.id === next.id ? next : row)));
            }}
            onDeleted={() => {
              setRows((prev) => prev.filter((row) => row.id !== selected.id));
              closePeek();
              navigate("/catalog/inventory-adjustment");
            }}
          />
        )}
      </SidePeek>

      <ToastModal message={toastMessage} variant={toastVariant} onClose={() => setToastMessage(null)} />
    </div>
  );
};
