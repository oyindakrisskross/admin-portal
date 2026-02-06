import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus } from "lucide-react";

import type { InventoryTransfer } from "../../../types/catalog";
import { useAuth } from "../../../auth/AuthContext";
import SidePeek from "../../../components/layout/SidePeek";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";
import { fetchInventoryTransfers } from "../../../api/catalog";
import { InventoryTransferPeek } from "./InventoryTransferPeek";

const badgeClass = (status?: string) => {
  if (status === "TRANSFERRED") return "bg-emerald-600/20 text-emerald-300 border-emerald-600/30";
  if (status === "PENDING") return "bg-yellow-600/20 text-yellow-200 border-yellow-600/30";
  return "bg-gray-600/20 text-gray-200 border-gray-600/30";
};

export const InventoryTransferListPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const hasId = Boolean(id);

  const [rows, setRows] = useState<InventoryTransfer[]>([]);
  const [selected, setSelected] = useState<InventoryTransfer | null>(null);
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
    const data = await fetchInventoryTransfers();
    setRows(data.results ?? []);
  };

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    if (!hasId || !rows.length) return;
    const transferId = Number(id);
    const match = rows.find((r) => r.id === transferId);
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
          icon={<span className="text-lg">📦</span>}
          section="Catalog"
          title="Transfer Orders"
          subtitle="Record inventory movement between locations."
          right={
            !hasPeek ? (
              <div className="flex items-center gap-2 text-xs">
                {can("Transfer Orders", "create") && (
                  <button
                    onClick={() => navigate("/catalog/transfer-inventory/new")}
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

        <div className={`${hasPeek ? "overflow-y-auto" : ""}`}>
          <div className="overflow-x-auto rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated">
            <table className="w-full text-sm">
              <thead className="text-kk-muted text-xs border-b border-kk-dark-border">
                <tr>
                  <th className="text-left py-3 px-3">Date</th>
                  <th className="text-left py-3 px-3">Transfer #</th>
                  <th className="text-left py-3 px-3">Description</th>
                  <th className="text-left py-3 px-3">Status</th>
                  <th className="text-right py-3 px-3">Total Qty</th>
                  <th className="text-left py-3 px-3">Source</th>
                  <th className="text-left py-3 px-3">Destination</th>
                  <th className="text-left py-3 px-3">Created by</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <tr
                    key={r.id}
                    className={`border-b border-kk-dark-border hover:bg-[rgba(255,255,255,0.04)] cursor-pointer ${
                      selectedId === r.id ? "bg-[rgba(255,255,255,0.04)]" : ""
                    }`}
                    onClick={() => {
                      setSelected(r);
                      setSelectedId(r.id!);
                      navigate(`/catalog/transfer-inventory/${r.id}`);
                    }}
                  >
                    <td className="py-3 px-3 text-xs">{r.request_date ? new Date(r.request_date).toLocaleDateString() : "-"}</td>
                    <td className="py-3 px-3 text-xs">{r.number ?? "-"}</td>
                    <td className="py-3 px-3 text-xs">{r.description || "-"}</td>
                    <td className="py-3 px-3 text-xs">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 ${badgeClass(r.status)}`}>
                        {r.status ?? "DRAFT"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-right">{r.total_quantity ?? "-"}</td>
                    <td className="py-3 px-3 text-xs">{r.source_location_name ?? r.source_location}</td>
                    <td className="py-3 px-3 text-xs">{r.destination_location_name ?? r.destination_location}</td>
                    <td className="py-3 px-3 text-xs">{r.created_by_email ?? "-"}</td>
                  </tr>
                ))}
                {!sortedRows.length && (
                  <tr>
                    <td className="py-6 px-3 text-xs text-kk-muted" colSpan={8}>
                      No transfers yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <SidePeek
        isOpen={!!selected}
        onClose={() => {
          closePeek();
          navigate("/catalog/transfer-inventory");
        }}
        widthClass="w-3/4"
        actions={<div className="text-xs font-semibold">{selected?.number ?? "Transfer"}</div>}
      >
        {selected && (
          <InventoryTransferPeek
            transfer={selected}
            showToast={showToast}
            onUpdated={(next) => {
              setSelected(next);
              setRows((prev) => prev.map((p) => (p.id === next.id ? next : p)));
            }}
            onDeleted={() => {
              setRows((prev) => prev.filter((p) => p.id !== selected.id));
              closePeek();
              navigate("/catalog/transfer-inventory");
            }}
          />
        )}
      </SidePeek>

      <ToastModal
        message={toastMessage}
        variant={toastVariant}
        onClose={() => setToastMessage(null)}
      />
    </div>
  );
};
