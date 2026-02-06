import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";

import type { Location } from "../../../types/location";
import type { InventoryTransfer } from "../../../types/catalog";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import ToastModal from "../../../components/ui/ToastModal";
import { ItemSearchSelect } from "../../../components/catalog/ItemSearchSelect";
import { fetchLocations } from "../../../api/location";
import {
  createInventoryTransfer,
  fetchInventory,
  fetchInventoryTransfer,
  initiateInventoryTransfer,
  searchItems,
  updateInventoryTransfer,
} from "../../../api/catalog";

type LineRow = {
  key: string;
  item?: number;
  itemLabel?: string;
  itemSubLabel?: string;
  quantity: string;
  source_stock?: string;
  destination_stock?: string;
};

const today = () => new Date().toISOString().slice(0, 10);

const normalizeQty = (v: string) => {
  if (!v) return "0.00";
  const n = Number(v);
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
};

export const InventoryTransferFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const transferId = !isNew ? Number(id) : null;

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [locations, setLocations] = useState<Location[]>([]);
  const [requestDate, setRequestDate] = useState<string>(today());
  const [description, setDescription] = useState<string>("");
  const [sourceLocation, setSourceLocation] = useState<number | "">("");
  const [destinationLocation, setDestinationLocation] = useState<number | "">("");
  const [status, setStatus] = useState<InventoryTransfer["status"]>("DRAFT");
  const [number, setNumber] = useState<string | undefined>(undefined);

  const [rows, setRows] = useState<LineRow[]>([
    { key: crypto.randomUUID(), quantity: "0.00" },
  ]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("error");
  const showToast = (message: string, variant: "error" | "success" | "info" = "error") => {
    setToastVariant(variant);
    setToastMessage(message);
  };

  const destinationOptions = useMemo(() => {
    if (!sourceLocation) return locations;
    return locations.filter((l) => l.id !== sourceLocation);
  }, [locations, sourceLocation]);

  const loadItemOptions = async (query: string, signal?: AbortSignal) => {
    if (!sourceLocation) return [];
    const res = await searchItems(query, {
      page_size: 25,
      location_id: Number(sourceLocation),
      signal,
    });
    const results = res.results ?? [];
    return results
      .filter((it) => Boolean(it.inventory_tracking))
      .map((it) => ({
        id: it.id!,
        label: `${it.name}${it.sku ? ` (${it.sku})` : ""}`,
        subLabel: it.sku ? `SKU: ${it.sku}` : undefined,
      }));
  };

  const loadStock = async (itemId: number, locationId: number): Promise<string> => {
    const inv = await fetchInventory({ item_id: itemId, location_id: locationId });
    if (!inv.results?.length) return "0.00";
    return inv.results[0].stock_qty ?? "0.00";
  };

  const refreshStocksForRow = async (rowKey: string, itemId: number) => {
    if (!sourceLocation || !destinationLocation) return;

    const [src, dst] = await Promise.all([
      loadStock(itemId, Number(sourceLocation)),
      loadStock(itemId, Number(destinationLocation)),
    ]);

    setRows((prev) =>
      prev.map((r) =>
        r.key === rowKey && r.item === itemId
          ? { ...r, source_stock: src, destination_stock: dst }
          : r
      )
    );
  };

  const refreshStocksAll = async () => {
    if (!sourceLocation || !destinationLocation) return;
    const snapshot = rows;
    const targets = snapshot.filter((r) => r.item);
    if (!targets.length) return;
    await Promise.all(targets.map((r) => refreshStocksForRow(r.key, r.item!)));
  };

  useEffect(() => {
    (async () => {
      try {
        const [locRes] = await Promise.all([fetchLocations()]);
        setLocations(locRes.results ?? []);

        if (!isNew && transferId) {
          const tr = await fetchInventoryTransfer(transferId);
          if (tr.status === "TRANSFERRED") {
            showToast("Transferred requests cannot be edited.", "info");
            navigate("/catalog/transfer-inventory");
            return;
          }
          setNumber(tr.number);
          setStatus(tr.status ?? "DRAFT");
          setRequestDate(tr.request_date ?? today());
          setDescription(tr.description ?? "");
          setSourceLocation(tr.source_location ?? "");
          setDestinationLocation(tr.destination_location ?? "");
          const nextRows: LineRow[] =
            (tr.lines ?? []).map((ln) => ({
              key: crypto.randomUUID(),
              item: ln.item,
              itemLabel: `${ln.item_name ?? ln.item}${ln.item_sku ? ` (${ln.item_sku})` : ""}`,
              itemSubLabel: ln.item_sku ? `SKU: ${ln.item_sku}` : undefined,
              quantity: normalizeQty(String(ln.quantity ?? "0")),
            })) || [];
          setRows(nextRows.length ? nextRows : [{ key: crypto.randomUUID(), quantity: "0.00" }]);
        }
      } catch (err: any) {
        const detail = err?.response?.data?.detail ?? "Unable to load transfer form.";
        showToast(String(detail));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sourceLocation || !destinationLocation) {
      setRows((prev) =>
        prev.map((r) => ({ ...r, source_stock: undefined, destination_stock: undefined }))
      );
      return;
    }
    refreshStocksAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceLocation, destinationLocation]);

  const updateRow = (key: string, patch: Partial<LineRow>) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows((prev) => [...prev, { key: crypto.randomUUID(), quantity: "0.00" }]);

  const removeRow = (key: string) => setRows((prev) => prev.filter((r) => r.key !== key));

  const buildPayload = (): Partial<InventoryTransfer> => {
    const lines_input = rows
      .filter((r) => r.item && Number(r.quantity) > 0)
      .map((r) => ({ item: r.item!, quantity: normalizeQty(r.quantity) }));

    return {
      request_date: requestDate,
      description,
      source_location: Number(sourceLocation),
      destination_location: Number(destinationLocation),
      lines_input,
    } as any;
  };

  const ensureBasics = () => {
    if (!requestDate) return "Date is required.";
    if (!sourceLocation) return "Source location is required.";
    if (!destinationLocation) return "Destination location is required.";
    if (Number(sourceLocation) === Number(destinationLocation)) return "Destination cannot be the same as source.";
    return null;
  };

  const saveDraft = async (): Promise<InventoryTransfer | null> => {
    const basicsErr = ensureBasics();
    if (basicsErr) {
      showToast(basicsErr);
      return null;
    }

    const payload = buildPayload();
    setSaving(true);
    try {
      if (isNew) {
        const created = await createInventoryTransfer(payload as InventoryTransfer);
        showToast("Transfer saved as draft.", "success");
        return created;
      }
      const updated = await updateInventoryTransfer(transferId!, payload);
      showToast("Transfer updated.", "success");
      return updated;
    } catch (err: any) {
      const data = err?.response?.data;
      const detail = typeof data === "string" ? data : data?.detail;
      showToast(String(detail ?? "Unable to save transfer."));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleInitiate = async () => {
    const saved = await saveDraft();
    if (!saved?.id) return;
    setSaving(true);
    try {
      const next = await initiateInventoryTransfer(saved.id);
      showToast("Transfer initiated.", "success");
      navigate(`/catalog/transfer-inventory/${next.id}`);
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? "Unable to initiate transfer.";
      showToast(String(detail));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    const saved = await saveDraft();
    if (saved?.id) navigate(`/catalog/transfer-inventory/${saved.id}`);
  };

  if (loading) {
    return (
      <>
        <ListPageHeader icon={<span className="text-lg">📦</span>} section="Catalog" title="Transfer Orders" />
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
        icon={<span className="text-lg">📦</span>}
        section="Catalog"
        title={isNew ? "New Transfer Order" : `Edit Transfer Order ${number ?? ""}`}
      />

      <div className="flex flex-col gap-6 text-sm px-6 pt-10 pb-8">
        {status && status !== "DRAFT" && status !== "PENDING" && (
          <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated px-4 py-3 text-xs text-kk-muted">
            This transfer is {status} and cannot be edited.
          </div>
        )}

        <div className="grid grid-cols-12 gap-3 items-center">
          <p className="col-span-2">Date</p>
          <input
            type="date"
            value={requestDate}
            className="rounded-md border border-kk-dark-input-border px-3 py-2 col-span-4 bg-kk-dark-bg"
            onChange={(e) => setRequestDate(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-12 gap-3">
          <p className="col-span-2">Description</p>
          <textarea
            value={description}
            maxLength={200}
            className="min-h-[90px] rounded-md border border-kk-dark-input-border px-3 py-2 col-span-6 bg-kk-dark-bg"
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional note about why this transfer is requested..."
          />
        </div>

        <div className="grid grid-cols-12 gap-3 items-center">
          <p className="col-span-2">Source location</p>
          <select
            className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 col-span-4"
            value={sourceLocation}
            onChange={(e) => {
              const next = e.target.value ? Number(e.target.value) : "";
              setSourceLocation(next);
              if (destinationLocation && next && Number(destinationLocation) === next) setDestinationLocation("");
            }}
          >
            <option value="">Select a location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-12 gap-3 items-center">
          <p className="col-span-2">Destination location</p>
          <select
            className="rounded-md border bg-kk-dark-bg border-kk-dark-input-border px-3 py-2 col-span-4"
            value={destinationLocation}
            onChange={(e) => setDestinationLocation(e.target.value ? Number(e.target.value) : "")}
            disabled={!sourceLocation}
          >
            <option value="">{sourceLocation ? "Select a location" : "Select source first"}</option>
            {destinationOptions.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-md border border-kk-dark-border bg-kk-dark-bg-elevated">
          <div className="px-4 py-3 border-b border-kk-dark-border text-xs font-semibold">Item Table</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-kk-muted">
                <tr>
                  <th className="text-left py-3 px-4 w-[55%]">Item details</th>
                  <th className="text-left py-3 px-4">Current availability</th>
                  <th className="text-right py-3 px-4 w-[15%]">Transfer quantity</th>
                  <th className="py-3 px-4 w-[5%]"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key} className="border-t border-kk-dark-border">
                    <td className="py-3 px-4">
                      <ItemSearchSelect
                        loadOptions={loadItemOptions}
                        valueId={r.item ?? null}
                        valueLabel={r.itemLabel}
                        valueSubLabel={r.itemSubLabel}
                        cacheKey={sourceLocation ? String(sourceLocation) : "none"}
                        onChange={async (nextId, option) => {
                          updateRow(r.key, {
                            item: nextId ?? undefined,
                            itemLabel: option?.label,
                            itemSubLabel: option?.subLabel,
                            source_stock: undefined,
                            destination_stock: undefined,
                          });
                          if (nextId) {
                            await refreshStocksForRow(r.key, nextId);
                          }
                        }}
                        disabled={!sourceLocation || !destinationLocation}
                        placeholder={
                          sourceLocation && destinationLocation
                            ? "Type or click to select an item"
                            : "Select locations first"
                        }
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-kk-muted mb-1">Source stock</div>
                          <div>{r.item ? (r.source_stock ?? "-") : "-"}</div>
                        </div>
                        <div>
                          <div className="text-kk-muted mb-1">Destination stock</div>
                          <div>{r.item ? (r.destination_stock ?? "-") : "-"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={r.quantity}
                        className="w-full rounded-md border border-kk-dark-input-border px-3 py-2 bg-kk-dark-bg text-right"
                        onChange={(e) => updateRow(r.key, { quantity: e.target.value })}
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        className="text-red-500 hover:text-red-400"
                        onClick={() => removeRow(r.key)}
                        disabled={rows.length === 1}
                        title={rows.length === 1 ? "At least one row required" : "Remove row"}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
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

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate("/catalog/transfer-inventory")}
            className="danger rounded-full border border-red-600 px-4 py-1.5 text-xs font-medium text-red-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            className="rounded-full border border-kk-dark-border px-4 py-1.5 text-xs hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-60"
            onClick={handleSaveDraft}
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Save as Draft
          </button>
          <button
            type="button"
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            onClick={handleInitiate}
          >
            {saving && <Loader2 className="h-3 w-3 animate-spin" />}
            Initiate Transfer
          </button>
        </div>
      </div>

      <ToastModal message={toastMessage} variant={toastVariant} onClose={() => setToastMessage(null)} />
    </>
  );
};
