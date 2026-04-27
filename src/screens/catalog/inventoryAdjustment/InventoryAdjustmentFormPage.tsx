import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";

import type { InventoryAdjustmentOrder, TrxReason } from "../../../types/catalog";
import type { Location } from "../../../types/location";
import { useAuth } from "../../../auth/AuthContext";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";
import { ItemSearchSelect } from "../../../components/catalog/ItemSearchSelect";
import { fetchLocations } from "../../../api/location";
import {
  approveInventoryAdjustment,
  createInventoryAdjustment,
  fetchInventory,
  fetchInventoryAdjustment,
  searchItems,
  sendInventoryAdjustmentForApproval,
  updateInventoryAdjustment,
} from "../../../api/catalog";
import { TRX_OPTS } from "../../../types/catalog";

type LineRow = {
  key: string;
  item?: number;
  itemLabel?: string;
  itemSubLabel?: string;
  availableQty?: string;
  quantity: string;
};

const INVENTORY_ADJUSTMENT_REASON_OPTS = TRX_OPTS.filter(
  (opt) => opt.value !== "SALE" && opt.value !== "TRANSFER"
);

const today = () => new Date().toISOString().slice(0, 10);

const parseQty = (value?: string) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const normalizeQty = (value: string) => {
  if (!value) return "0.00";
  const num = Number(value);
  if (!Number.isFinite(num)) return "0.00";
  return num.toFixed(2);
};

const emptyRow = (): LineRow => ({
  key: crypto.randomUUID(),
  quantity: "0.00",
});

const getErrorMessage = (err: any, fallback: string) => {
  const data = err?.response?.data;
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;
  if (Array.isArray(data?.detail) && data.detail.length) return String(data.detail[0]);
  for (const value of Object.values(data ?? {})) {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && value.length) return String(value[0]);
  }
  return fallback;
};

export const InventoryAdjustmentFormPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const adjustmentId = !isNew ? Number(id) : null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [locations, setLocations] = useState<Location[]>([]);
  const [requestDate, setRequestDate] = useState<string>(today());
  const [description, setDescription] = useState<string>("");
  const [locationId, setLocationId] = useState<number | "">("");
  const [reason, setReason] = useState<TrxReason>("ADJUSTMENT");
  const [number, setNumber] = useState<string | undefined>(undefined);

  const [rows, setRows] = useState<LineRow[]>([emptyRow()]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("error");
  const showToast = (message: string, variant: "error" | "success" | "info" = "error") => {
    setToastVariant(variant);
    setToastMessage(message);
  };

  const duplicateItemNames = useMemo(() => {
    const counts = new Map<number, number>();
    rows.forEach((row) => {
      if (typeof row.item !== "number") return;
      counts.set(row.item, (counts.get(row.item) ?? 0) + 1);
    });
    return rows
      .filter((row) => typeof row.item === "number" && (counts.get(row.item) ?? 0) > 1)
      .map((row) => row.itemLabel || `Item #${row.item}`);
  }, [rows]);

  const linesToSubmit = useMemo(
    () =>
      rows.filter(
        (row): row is LineRow & { item: number } =>
          typeof row.item === "number" && Number.isFinite(Number(row.quantity)) && Number(row.quantity) !== 0
      ),
    [rows]
  );

  const loadItemOptions = async (query: string, signal?: AbortSignal) => {
    if (!locationId) return [];
    const res = await searchItems(query, {
      page_size: 25,
      location_id: Number(locationId),
      include_zero_stock: true,
      signal,
    });
    const results = res.results ?? [];
    return results
      .filter((item) => Boolean(item.inventory_tracking) && item.type_id === "GOOD")
      .map((item) => ({
        id: item.id!,
        label: `${item.name}${item.sku ? ` (${item.sku})` : ""}`,
        subLabel: item.sku ? `SKU: ${item.sku}` : undefined,
      }));
  };

  const loadStock = async (itemId: number, selectedLocationId: number): Promise<string> => {
    const inv = await fetchInventory({ item_id: itemId, location_id: selectedLocationId });
    const row = inv.results?.[0];
    return row?.available_qty ?? row?.stock_qty ?? "0.00";
  };

  const refreshStock = async (rowKey: string, itemId: number) => {
    if (!locationId) {
      setRows((prev) => prev.map((row) => (row.key === rowKey ? { ...row, availableQty: undefined } : row)));
      return;
    }
    const stock = await loadStock(itemId, Number(locationId));
    setRows((prev) =>
      prev.map((row) =>
        row.key === rowKey && row.item === itemId ? { ...row, availableQty: stock } : row
      )
    );
  };

  useEffect(() => {
    (async () => {
      try {
        const [locationRes] = await Promise.all([fetchLocations()]);
        setLocations(locationRes.results ?? []);

        if (!isNew && adjustmentId) {
          const adjustment = await fetchInventoryAdjustment(adjustmentId);
          if (adjustment.status && adjustment.status !== "DRAFT") {
            showToast(`${adjustment.status} adjustments cannot be edited.`, "info");
            navigate(`/catalog/inventory-adjustment/${adjustment.id}`);
            return;
          }
          setNumber(adjustment.number);
          setRequestDate(adjustment.request_date ?? today());
          setDescription(adjustment.description ?? "");
          setLocationId(adjustment.location ?? "");
          setReason(adjustment.reason ?? "ADJUSTMENT");
          const nextRows: LineRow[] =
            (adjustment.lines ?? []).map((line) => ({
              key: crypto.randomUUID(),
              item: line.item,
              itemLabel: `${line.item_name ?? line.item}${line.item_sku ? ` (${line.item_sku})` : ""}`,
              itemSubLabel: line.item_sku ? `SKU: ${line.item_sku}` : undefined,
              quantity: normalizeQty(String(line.quantity ?? "0")),
            })) || [];
          setRows(nextRows.length ? nextRows : [emptyRow()]);
        }
      } catch (err: any) {
        showToast(getErrorMessage(err, "Unable to load inventory adjustment form."));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!locationId) {
      setRows((prev) => prev.map((row) => ({ ...row, availableQty: undefined })));
      return;
    }
    rows
      .filter((row): row is LineRow & { item: number } => typeof row.item === "number")
      .forEach((row) => {
        void refreshStock(row.key, row.item);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  const updateRow = (key: string, patch: Partial<LineRow>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (key: string) => setRows((prev) => prev.filter((row) => row.key !== key));

  const buildPayload = (): InventoryAdjustmentOrder => ({
    request_date: requestDate,
    description,
    location: Number(locationId),
    reason,
    lines_input: linesToSubmit.map((row) => ({
      item: row.item,
      quantity: normalizeQty(row.quantity),
    })),
  });

  const validateForm = () => {
    if (!requestDate) return "Date is required.";
    if (!locationId) return "Location is required.";
    if (!reason) return "Reason is required.";
    if (duplicateItemNames.length) return "Duplicate items are not allowed. Keep each item on one row.";
    if (!linesToSubmit.length) return "Add at least one item row with a non-zero quantity change.";
    return null;
  };

  const saveDraft = async (): Promise<InventoryAdjustmentOrder | null> => {
    const validationError = validateForm();
    if (validationError) {
      showToast(validationError);
      return null;
    }

    const payload = buildPayload();
    setSaving(true);
    try {
      if (isNew) {
        const created = await createInventoryAdjustment(payload);
        showToast("Adjustment saved as draft.", "success");
        return created;
      }
      const updated = await updateInventoryAdjustment(adjustmentId!, payload);
      showToast("Adjustment updated.", "success");
      return updated;
    } catch (err: any) {
      showToast(getErrorMessage(err, "Unable to save adjustment."));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    const saved = await saveDraft();
    if (saved?.id) navigate(`/catalog/inventory-adjustment/${saved.id}`);
  };

  const handleSendForApproval = async () => {
    const saved = await saveDraft();
    if (!saved?.id) return;
    setSaving(true);
    try {
      const next = await sendInventoryAdjustmentForApproval(saved.id);
      showToast("Adjustment sent for approval.", "success");
      navigate(`/catalog/inventory-adjustment/${next.id}`);
    } catch (err: any) {
      showToast(getErrorMessage(err, "Unable to send adjustment for approval."));
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    const saved = await saveDraft();
    if (!saved?.id) return;
    setSaving(true);
    try {
      const next = await approveInventoryAdjustment(saved.id);
      showToast("Adjustment approved.", "success");
      navigate(`/catalog/inventory-adjustment/${next.id}`);
    } catch (err: any) {
      showToast(getErrorMessage(err, "Unable to approve adjustment."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <ListPageHeader icon={<span className="text-lg">#</span>} section="Catalog" title="Inventory Adjustments" />
        <div className="p-6 text-sm text-kk-muted inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      </>
    );
  }

  return (
    <>
      <ListPageHeader
        icon={<span className="text-lg">#</span>}
        section="Catalog"
        title={isNew ? "New Inventory Adjustment" : `Edit Inventory Adjustment ${number ?? ""}`}
      />

      <div className="flex flex-col gap-6 text-sm px-6 pt-10 pb-8">
        <div className="grid grid-cols-12 gap-3 items-center">
          <p className="col-span-2">Date</p>
          <input
            type="date"
            value={requestDate}
            className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-4 bg-kk-dark-bg"
            onChange={(e) => setRequestDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-12 gap-3 items-center">
          <p className="col-span-2">Location</p>
          <select
            className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 col-span-4"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Select a location</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-12 gap-3 items-center">
          <p className="col-span-2">Reason</p>
          <select
            className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 col-span-4"
            value={reason}
            onChange={(e) => setReason(e.target.value as TrxReason)}
          >
            {INVENTORY_ADJUSTMENT_REASON_OPTS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-12 gap-3">
          <p className="col-span-2">Description</p>
          <textarea
            value={description}
            maxLength={200}
            className="min-h-[90px] rounded-md border border-kk-dark-input-border px-3 py-2 col-span-6 bg-kk-dark-bg"
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional note about why this stock adjustment is needed..."
          />
        </div>

        <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated">
          <div className="px-4 py-3 border-b border-kk-dark-border text-xs font-semibold">Item Table</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-kk-muted">
                <tr>
                  <th className="text-left py-3 px-4 w-[45%]">Item details</th>
                  <th className="text-right py-3 px-4 w-[15%]">Current availability</th>
                  <th className="text-right py-3 px-4 w-[15%]">Projected stock</th>
                  <th className="text-right py-3 px-4 w-[15%]">Qty change</th>
                  <th className="py-3 px-4 w-[10%]"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const available = parseQty(row.availableQty);
                  const qtyChange = parseQty(row.quantity);
                  const projected = (available + qtyChange).toFixed(2);

                  return (
                    <tr key={row.key} className="border-t border-kk-dark-border">
                      <td className="py-3 px-4">
                        <ItemSearchSelect
                          loadOptions={loadItemOptions}
                          valueId={row.item ?? null}
                          valueLabel={row.itemLabel}
                          valueSubLabel={row.itemSubLabel}
                          cacheKey={locationId ? String(locationId) : "none"}
                          onChange={async (nextId, option) => {
                            updateRow(row.key, {
                              item: nextId ?? undefined,
                              itemLabel: option?.label,
                              itemSubLabel: option?.subLabel,
                              availableQty: undefined,
                            });
                            if (nextId) {
                              await refreshStock(row.key, nextId);
                            }
                          }}
                          disabled={!locationId}
                          placeholder={locationId ? "Type or click to select an item" : "Select a location first"}
                        />
                      </td>
                      <td className="py-3 px-4 text-right">{row.item ? (row.availableQty ?? "-") : "-"}</td>
                      <td className="py-3 px-4 text-right">{row.item ? projected : "-"}</td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={row.quantity}
                          className="w-full rounded-md border border-kk-dark-input-border px-3 py-2 bg-kk-dark-bg text-right"
                          onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          className="text-red-500 hover:text-red-400"
                          onClick={() => removeRow(row.key)}
                          disabled={rows.length === 1}
                          title={rows.length === 1 ? "At least one row required" : "Remove row"}
                        >
                          x
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-kk-dark-border flex items-center gap-2 text-xs">
            <button
              className="inline-flex items-center gap-1 rounded-full border border-kk-dark-border px-3 py-1.5 hover:bg-[rgba(255,255,255,0.06)]"
              onClick={addRow}
            >
              <Plus className="h-3 w-3" />
              Add New Row
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            disabled={saving}
            onClick={handleSaveDraft}
            className="rounded-full border border-kk-dark-border px-4 py-2 text-xs font-semibold hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-60"
          >
            Save as Draft
          </button>
          <button
            disabled={saving}
            onClick={handleSendForApproval}
            className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
            Send for Approval
          </button>
          {can("Inventory Adjustment", "approve") && (
            <button
              disabled={saving}
              onClick={handleApprove}
              className="rounded-full border border-emerald-600 px-4 py-2 text-xs font-semibold text-emerald-400 hover:bg-[rgba(16,185,129,0.08)] disabled:opacity-60"
            >
              {saving && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />}
              Approve Adjustment
            </button>
          )}
          <button
            className="rounded-full border border-kk-dark-border px-4 py-2 text-xs"
            onClick={() => navigate("/catalog/inventory-adjustment")}
          >
            Cancel
          </button>
        </div>
      </div>

      <ToastModal message={toastMessage} variant={toastVariant} onClose={() => setToastMessage(null)} />
    </>
  );
};
