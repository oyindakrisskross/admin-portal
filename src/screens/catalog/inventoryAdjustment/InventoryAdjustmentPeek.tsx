import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import type { InventoryAdjustmentLine, InventoryAdjustmentOrder } from "../../../types/catalog";
import { useAuth } from "../../../auth/AuthContext";
import {
  approveInventoryAdjustment,
  deleteInventoryAdjustment,
  sendInventoryAdjustmentForApproval,
} from "../../../api/catalog";

type Props = {
  adjustment: InventoryAdjustmentOrder;
  onUpdated: (next: InventoryAdjustmentOrder) => void;
  onDeleted: () => void;
  showToast: (message: string, variant?: "error" | "success" | "info") => void;
};

const fmtDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const fmtDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const sumQty = (lines?: InventoryAdjustmentLine[]) => {
  const total = (lines ?? []).reduce((acc, line) => acc + Math.abs(Number(line.quantity ?? 0)), 0);
  if (!Number.isFinite(total)) return "-";
  return total.toFixed(2);
};

export const InventoryAdjustmentPeek: React.FC<Props> = ({
  adjustment,
  onUpdated,
  onDeleted,
  showToast,
}) => {
  const navigate = useNavigate();
  const { can } = useAuth();
  const [busy, setBusy] = useState<"send" | "approve" | "delete" | null>(null);

  const canEdit = can("Inventory Adjustment", "edit");
  const canSendForApproval = can("Inventory Adjustment", "create") && adjustment.status === "DRAFT";
  const canApprove = can("Inventory Adjustment", "approve") && (adjustment.status === "DRAFT" || adjustment.status === "PENDING");
  const canDelete = can("Inventory Adjustment", "delete") && adjustment.status !== "ADJUSTED";

  const lines = useMemo(() => adjustment.lines ?? [], [adjustment.lines]);

  const handleSendForApproval = async () => {
    if (!adjustment.id) return;
    setBusy("send");
    try {
      const next = await sendInventoryAdjustmentForApproval(adjustment.id);
      onUpdated(next);
      showToast("Adjustment sent for approval.", "success");
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? "Unable to send adjustment for approval.";
      showToast(String(detail));
    } finally {
      setBusy(null);
    }
  };

  const handleApprove = async () => {
    if (!adjustment.id) return;
    setBusy("approve");
    try {
      const next = await approveInventoryAdjustment(adjustment.id);
      onUpdated(next);
      showToast("Adjustment approved.", "success");
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? "Unable to approve adjustment.";
      showToast(String(detail));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!adjustment.id) return;
    if (!confirm("Delete this inventory adjustment order?")) return;
    setBusy("delete");
    try {
      await deleteInventoryAdjustment(adjustment.id);
      onDeleted();
      showToast("Adjustment deleted.", "success");
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? "Unable to delete adjustment.";
      showToast(String(detail));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="text-sm flex flex-col gap-4">
      <div className="flex items-center gap-2">
        {canEdit && adjustment.status === "DRAFT" && (
          <button
            className="rounded-full border border-kk-dark-border px-3 py-1.5 text-xs hover:bg-[rgba(255,255,255,0.06)]"
            onClick={() => navigate(`/catalog/inventory-adjustment/${adjustment.id}/edit`)}
          >
            Edit
          </button>
        )}
        {canSendForApproval && (
          <button
            disabled={busy === "send"}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            onClick={handleSendForApproval}
          >
            {busy === "send" && <Loader2 className="h-3 w-3 animate-spin" />}
            Send for approval
          </button>
        )}
        {canApprove && (
          <button
            disabled={busy === "approve"}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            onClick={handleApprove}
          >
            {busy === "approve" && <Loader2 className="h-3 w-3 animate-spin" />}
            Approve adjustment
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
        <div className="col-span-4 text-kk-muted">Adjustment #</div>
        <div className="col-span-8">{adjustment.number ?? "-"}</div>

        <div className="col-span-4 text-kk-muted">Request date</div>
        <div className="col-span-8">{fmtDate(adjustment.request_date)}</div>

        <div className="col-span-4 text-kk-muted">Status</div>
        <div className="col-span-8">{adjustment.status ?? "-"}</div>

        <div className="col-span-4 text-kk-muted">Location</div>
        <div className="col-span-8">{adjustment.location_name ?? String(adjustment.location)}</div>

        <div className="col-span-4 text-kk-muted">Reason</div>
        <div className="col-span-8">{adjustment.reason}</div>

        <div className="col-span-4 text-kk-muted">Description</div>
        <div className="col-span-8">{adjustment.description || "-"}</div>

        <div className="col-span-4 text-kk-muted">Total quantity</div>
        <div className="col-span-8">{adjustment.total_quantity ?? sumQty(lines)}</div>

        <div className="col-span-4 text-kk-muted">Created on</div>
        <div className="col-span-8">{fmtDateTime(adjustment.created_on)}</div>

        <div className="col-span-4 text-kk-muted">Created by</div>
        <div className="col-span-8">{adjustment.created_by_email ?? "-"}</div>

        <div className="col-span-4 text-kk-muted">Submitted on</div>
        <div className="col-span-8">{fmtDateTime(adjustment.submitted_on)}</div>

        <div className="col-span-4 text-kk-muted">Submitted by</div>
        <div className="col-span-8">{adjustment.submitted_by_email ?? "-"}</div>

        <div className="col-span-4 text-kk-muted">Approved on</div>
        <div className="col-span-8">{fmtDateTime(adjustment.approved_on)}</div>

        <div className="col-span-4 text-kk-muted">Approved by</div>
        <div className="col-span-8">{adjustment.approved_by_email ?? "-"}</div>
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
                  <th className="text-right py-2">Qty change</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id ?? `${line.item}-${line.quantity}`} className="border-t border-kk-dark-border">
                    <td className="py-2 pr-2">{line.item_name ?? line.item}</td>
                    <td className="py-2 pr-2">{line.item_sku ?? "-"}</td>
                    <td className="py-2 text-right">{Number(line.quantity ?? 0).toFixed(2)}</td>
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
