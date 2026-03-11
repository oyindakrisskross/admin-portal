import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";

import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";
import { ItemSearchSelect } from "../../../components/catalog/ItemSearchSelect";
import { fetchInventory, patchItem, searchItems } from "../../../api/catalog";
import { fetchLocations } from "../../../api/location";
import type { Location } from "../../../types/location";
import { TRX_OPTS, type TrxReason } from "../../../types/catalog";

type AdjustmentRow = {
  key: string;
  item?: number;
  itemLabel?: string;
  itemSubLabel?: string;
  availableQty?: string;
  adjustQty: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const parseQty = (value?: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatQty = (value: string) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
};

const emptyRow = (): AdjustmentRow => ({
  key: crypto.randomUUID(),
  adjustQty: "0.00",
});

export const InventoryAdjustmentPage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [locations, setLocations] = useState<Location[]>([]);
  const [adjustDate, setAdjustDate] = useState<string>(today());
  const [locationId, setLocationId] = useState<number | "">("");
  const [reason, setReason] = useState<TrxReason>("ADJUSTMENT");
  const [description, setDescription] = useState("");
  const [rows, setRows] = useState<AdjustmentRow[]>([emptyRow()]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("error");
  const showToast = (message: string, variant: "error" | "success" | "info" = "error") => {
    setToastVariant(variant);
    setToastMessage(message);
  };

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

  const loadStock = async (itemId: number, locId: number) => {
    const inv = await fetchInventory({ item_id: itemId, location_id: locId });
    return inv.results?.[0]?.stock_qty ?? "0.00";
  };

  const refreshStock = async (rowKey: string, itemId: number) => {
    if (!locationId) {
      setRows((prev) =>
        prev.map((row) => (row.key === rowKey ? { ...row, availableQty: undefined } : row))
      );
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
        const locRes = await fetchLocations();
        setLocations(locRes.results ?? []);
      } catch (err: any) {
        const detail = err?.response?.data?.detail ?? "Unable to load locations.";
        showToast(String(detail));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!locationId) {
      setRows((prev) => prev.map((row) => ({ ...row, availableQty: undefined })));
      return;
    }
    rows
      .filter((row): row is AdjustmentRow & { item: number } => typeof row.item === "number")
      .forEach((row) => {
        void refreshStock(row.key, row.item);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId]);

  const updateRow = (key: string, patch: Partial<AdjustmentRow>) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (key: string) => setRows((prev) => prev.filter((row) => row.key !== key));

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
        (row): row is AdjustmentRow & { item: number } =>
          typeof row.item === "number" && Number.isFinite(Number(row.adjustQty)) && Number(row.adjustQty) !== 0
      ),
    [rows]
  );

  const handleSave = async () => {
    if (!locationId) {
      showToast("Location is required.");
      return;
    }
    if (!reason) {
      showToast("Reason is required.");
      return;
    }
    if (duplicateItemNames.length) {
      showToast("Duplicate items are not allowed. Keep each item on one row.");
      return;
    }
    if (!linesToSubmit.length) {
      showToast("Add at least one item row with a non-zero quantity adjustment.");
      return;
    }

    setSaving(true);
    try {
      const reference = description.trim() || undefined;
      const settled = await Promise.allSettled(
        linesToSubmit.map((line) =>
          patchItem(line.item, {
            inventory_input: [
              {
                location_id: Number(locationId),
                adjust_qty: formatQty(line.adjustQty),
                reason,
                reference,
              },
            ],
          })
        )
      );

      const successfulRows = linesToSubmit.filter((_, idx) => settled[idx]?.status === "fulfilled");
      const failed = settled.filter((result) => result.status === "rejected") as PromiseRejectedResult[];

      if (successfulRows.length) {
        const stockResults = await Promise.all(
          successfulRows.map(async (row) => {
            try {
              const stock = await loadStock(row.item, Number(locationId));
              return [row.key, stock] as const;
            } catch {
              return [row.key, row.availableQty ?? "0.00"] as const;
            }
          })
        );
        const stockByKey = new Map(stockResults);
        setRows((prev) =>
          prev.map((row) =>
            stockByKey.has(row.key)
              ? { ...row, availableQty: stockByKey.get(row.key), adjustQty: "0.00" }
              : row
          )
        );
      }

      if (failed.length) {
        const firstDetail =
          failed[0]?.reason?.response?.data?.detail ??
          failed[0]?.reason?.message ??
          "Unable to adjust one or more items.";
        showToast(
          `${successfulRows.length} item(s) adjusted, ${failed.length} failed. ${String(firstDetail)}`,
          "error"
        );
        return;
      }

      showToast(`${successfulRows.length} item(s) adjusted successfully.`, "success");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <>
        <ListPageHeader icon={<span className="text-lg">#</span>} section="Catalog" title="Inventory Adjustment" />
        <div className="p-6 text-sm text-kk-muted inline-flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading...
        </div>
      </>
    );
  }

  return (
    <>
      <ListPageHeader icon={<span className="text-lg">#</span>} section="Catalog" title="Inventory Adjustment" />

      <div className="flex flex-col gap-6 text-sm px-6 pt-10 pb-8">
        <div className="grid grid-cols-12 gap-3 items-center">
          <p className="col-span-2">Date</p>
          <input
            type="date"
            value={adjustDate}
            className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-4 bg-kk-dark-bg"
            onChange={(e) => setAdjustDate(e.target.value)}
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
            {TRX_OPTS.map((opt) => (
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
            placeholder="Optional note for this adjustment..."
          />
        </div>

        <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated">
          <div className="px-4 py-3 border-b border-kk-dark-border text-xs font-semibold">Item Table</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-kk-muted">
                <tr>
                  <th className="text-left py-3 px-4 w-[45%]">Item details</th>
                  <th className="text-right py-3 px-4 w-[15%]">Quantity available</th>
                  <th className="text-right py-3 px-4 w-[15%]">New quantity on hand</th>
                  <th className="text-right py-3 px-4 w-[15%]">Quantity adjusted</th>
                  <th className="py-3 px-4 w-[10%]"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const available = parseQty(row.availableQty);
                  const adjusted = parseQty(row.adjustQty);
                  const newQty = (available + adjusted).toFixed(2);

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
                      <td className="py-3 px-4 text-right">{row.item ? row.availableQty ?? "0.00" : "-"}</td>
                      <td className="py-3 px-4 text-right">{row.item ? newQty : "-"}</td>
                      <td className="py-3 px-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={row.adjustQty}
                          className="w-full rounded-md border border-kk-dark-input-border px-3 py-2 bg-kk-dark-bg text-right"
                          onChange={(e) => updateRow(row.key, { adjustQty: e.target.value })}
                          placeholder="0.00"
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          className="text-red-500 hover:text-red-400"
                          onClick={() => removeRow(row.key)}
                          disabled={rows.length === 1 || saving}
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
              className="inline-flex items-center gap-1 rounded-full border border-kk-dark-border px-3 py-1.5 hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-60"
              onClick={addRow}
              disabled={saving}
            >
              <Plus className="h-3 w-3" />
              Add New Row
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate("/catalog/items")}
            className="danger rounded-full border border-red-600 px-4 py-1.5 text-xs font-medium text-red-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            onClick={handleSave}
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Apply Adjustment
          </button>
        </div>
      </div>

      <ToastModal message={toastMessage} variant={toastVariant} onClose={() => setToastMessage(null)} />
    </>
  );
};
