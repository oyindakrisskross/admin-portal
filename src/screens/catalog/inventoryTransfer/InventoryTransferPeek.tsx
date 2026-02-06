import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import type { InventoryTransfer, InventoryTransferLine } from "../../../types/catalog";
import { useAuth } from "../../../auth/AuthContext";
import {
  deleteInventoryTransfer,
  initiateInventoryTransfer,
  markInventoryTransferTransferred,
} from "../../../api/catalog";

type Props = {
  transfer: InventoryTransfer;
  onUpdated: (next: InventoryTransfer) => void;
  onDeleted: () => void;
  showToast: (message: string, variant?: "error" | "success" | "info") => void;
};

const fmtDateTime = (s?: string | null) => {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
};

const fmtDate = (s?: string | null) => {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString();
};

const sumQty = (lines?: InventoryTransferLine[]) => {
  const total = (lines ?? []).reduce((acc, ln) => acc + Number(ln.quantity ?? 0), 0);
  if (!Number.isFinite(total)) return "-";
  return total.toFixed(2);
};

export const InventoryTransferPeek: React.FC<Props> = ({
  transfer,
  onUpdated,
  onDeleted,
  showToast,
}) => {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [busy, setBusy] = useState<"initiate" | "mark" | "delete" | null>(null);

  const canEdit = can("Transfer Orders", "edit");
  const canInitiate = can("Transfer Orders", "create") && transfer.status === "DRAFT";
  const canMarkTransferred = can("Transfer Orders", "approve") && transfer.status === "PENDING";
  const canDelete = can("Transfer Orders", "delete");

  const lines = useMemo(() => transfer.lines ?? [], [transfer.lines]);

  const handleInitiate = async () => {
    if (!transfer.id) return;
    setBusy("initiate");
    try {
      const next = await initiateInventoryTransfer(transfer.id);
      onUpdated(next);
      showToast("Transfer initiated.", "success");
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? "Unable to initiate transfer.";
      showToast(String(detail));
    } finally {
      setBusy(null);
    }
  };

  const handleMarkTransferred = async () => {
    if (!transfer.id) return;
    setBusy("mark");
    try {
      const next = await markInventoryTransferTransferred(transfer.id);
      onUpdated(next);
      showToast("Transfer marked as transferred.", "success");
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? "Unable to mark transfer as transferred.";
      showToast(String(detail));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!transfer.id) return;
    if (!confirm("Delete this transfer request?")) return;
    setBusy("delete");
    try {
      await deleteInventoryTransfer(transfer.id);
      onDeleted();
      showToast("Transfer deleted.", "success");
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? "Unable to delete transfer.";
      showToast(String(detail));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="text-sm flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {canEdit && (transfer.status === "DRAFT" || transfer.status === "PENDING") && (
          <button
            className="rounded-full border border-kk-dark-border px-3 py-1.5 text-xs hover:bg-[rgba(255,255,255,0.06)]"
            onClick={() => navigate(`/catalog/transfer-inventory/${transfer.id}/edit`)}
          >
            Edit
          </button>
        )}
        {canInitiate && (
          <button
            disabled={busy === "initiate"}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            onClick={handleInitiate}
          >
            {busy === "initiate" && <Loader2 className="h-3 w-3 animate-spin" />}
            Initiate transfer
          </button>
        )}
        {canMarkTransferred && (
          <button
            disabled={busy === "mark"}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            onClick={handleMarkTransferred}
          >
            {busy === "mark" && <Loader2 className="h-3 w-3 animate-spin" />}
            Mark as transferred
          </button>
        )}
        {canDelete && (
          <button
            disabled={busy === "delete"}
            className="inline-flex items-center gap-1 rounded-full border border-red-600 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-[rgba(255,0,0,0.06)] disabled:opacity-60"
            onClick={handleDelete}
          >
            {busy === "delete" && <Loader2 className="h-3 w-3 animate-spin" />}
            Delete
          </button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4 text-kk-muted">Transfer #</div>
        <div className="col-span-8">{transfer.number ?? "-"}</div>

        <div className="col-span-4 text-kk-muted">Request date</div>
        <div className="col-span-8">{fmtDate(transfer.request_date)}</div>

        <div className="col-span-4 text-kk-muted">Status</div>
        <div className="col-span-8">{transfer.status ?? "-"}</div>

        <div className="col-span-4 text-kk-muted">Description</div>
        <div className="col-span-8">{transfer.description || "-"}</div>

        <div className="col-span-4 text-kk-muted">Source</div>
        <div className="col-span-8">{transfer.source_location_name ?? String(transfer.source_location)}</div>

        <div className="col-span-4 text-kk-muted">Destination</div>
        <div className="col-span-8">{transfer.destination_location_name ?? String(transfer.destination_location)}</div>

        <div className="col-span-4 text-kk-muted">Total quantity</div>
        <div className="col-span-8">{transfer.total_quantity ?? sumQty(lines)}</div>

        <div className="col-span-4 text-kk-muted">Created on</div>
        <div className="col-span-8">{fmtDateTime(transfer.created_on)}</div>

        <div className="col-span-4 text-kk-muted">Created by</div>
        <div className="col-span-8">{transfer.created_by_email ?? "-"}</div>

        <div className="col-span-4 text-kk-muted">Initiated on</div>
        <div className="col-span-8">{fmtDateTime(transfer.initiated_on)}</div>

        <div className="col-span-4 text-kk-muted">Initiated by</div>
        <div className="col-span-8">{transfer.initiated_by_email ?? "-"}</div>

        <div className="col-span-4 text-kk-muted">Transferred on</div>
        <div className="col-span-8">{fmtDateTime(transfer.transferred_on)}</div>

        <div className="col-span-4 text-kk-muted">Transferred by</div>
        <div className="col-span-8">{transfer.transferred_by_email ?? "-"}</div>
      </div>

      <div className="border-t border-kk-dark-border pt-4">
        <div className="text-xs font-semibold mb-2 text-kk-muted">Items</div>
        {lines.length === 0 ? (
          <div className="text-kk-muted">No items.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-kk-muted">
                <tr>
                  <th className="text-left py-2 pr-2">Item</th>
                  <th className="text-left py-2 pr-2">SKU</th>
                  <th className="text-right py-2">Qty</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((ln) => (
                  <tr key={ln.id ?? `${ln.item}-${ln.quantity}`} className="border-t border-kk-dark-border">
                    <td className="py-2 pr-2">{ln.item_name ?? ln.item}</td>
                    <td className="py-2 pr-2">{ln.item_sku ?? "-"}</td>
                    <td className="py-2 text-right">{Number(ln.quantity ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
