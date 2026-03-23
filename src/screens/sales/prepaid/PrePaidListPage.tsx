import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Plus, ReceiptText, Search, Trash2, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { useAuth } from "../../../auth/AuthContext";
import type { InvoicePayment, InvoiceResponse } from "../../../types/invoice";
import { bulkInvoices, createPrepaidInvoice, fetchInvoice, fetchOrders, updatePrepaidInvoice } from "../../../api/invoice";
import { fetchOutlets } from "../../../api/location";
import { fetchItem, searchItems } from "../../../api/catalog";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import SidePeek from "../../../components/layout/SidePeek";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";
import { formatMoneyNGN, getPrepaidDisplayStatus, humanizeStatus, toDateStr } from "../../../helpers";
import { ItemSearchSelect, type ItemOption } from "../../../components/catalog/ItemSearchSelect";
import type { Outlet } from "../../../types/location";
import { PrePaidInvoicePeek } from "./PrePaidInvoicePeek";
import { CustomerSearchSelect } from "../../../components/crm/CustomerSearchSelect";
import { CustomerCreateModal } from "../../../components/crm/CustomerCreateModal";
import type { CustomerRecord } from "../../../types/customerPortal";
import { fetchCustomer } from "../../../api/customerPortal";
import { BulkActionBar } from "../../../components/catalog/bulk/BulkActionBar";
import { RowSelectCheckbox } from "../../../components/catalog/bulk/RowSelectCheckbox";
import ToastModal from "../../../components/ui/ToastModal";
import { FilterBar } from "../../../components/filter/FilterBar";
import type { ColumnMeta, FilterSet } from "../../../types/filters";

const PAGE_SIZE_OPTIONS = [25, 50, 100];
const PAYMENT_METHOD_OPTIONS = ["CASH", "CARD", "TRANSFER", "OTHER"] as const;
const isPaymentMethod = (value: string): value is (typeof PAYMENT_METHOD_OPTIONS)[number] =>
  (PAYMENT_METHOD_OPTIONS as readonly string[]).includes(value);
const PREPAID_QR_CANVAS_ID = "prepaid-pass-qr-canvas";

type CreateRow = {
  key: string;
  itemId: number | null;
  itemLabel?: string;
  itemSku?: string;
  description?: string;
  saleTaxRate?: string;
  quantity: string;
  unitPrice: string;
  customizations: RowCustomizationSelection[];
};

type RowCustomizationSelection = {
  customizationId: number;
  quantity: string;
};

type CustomizationOption = {
  id: number;
  childId: number;
  label: string;
  pricingType: string;
  priceDelta: string;
  minQty: string;
  maxQty: string;
  stepQty: string;
};

type ItemMeta = {
  name: string;
  sku?: string;
  price?: string;
  taxRate?: string;
  customizationsLoaded?: boolean;
  customizations: CustomizationOption[];
};

const buildEmptyRow = (key = String(Date.now())): CreateRow => ({
  key,
  itemId: null,
  quantity: "1",
  unitPrice: "0.00",
  customizations: [],
});

const toTitle = (value?: string) => humanizeStatus(value);

const statusBadgeClass = (status?: string) => {
  const value = String(status || "").toUpperCase();
  if (value === "REDEEMED") return "bg-emerald-50 text-emerald-700";
  if (value === "UNUSED") return "bg-blue-50 text-blue-700";
  if (value === "PARTIALLY_PAID" || value === "PARTIALLY_REDEEMED") return "bg-amber-50 text-amber-700";
  if (value === "UNPAID") return "bg-slate-100 text-slate-600";
  return "bg-slate-100 text-slate-600";
};

const paymentMethodBadgeClass = (method?: string) => {
  const value = String(method || "").toUpperCase();
  if (value === "CASH") return "bg-emerald-50 text-emerald-700";
  if (value === "CARD") return "bg-blue-50 text-blue-700";
  if (value === "TRANSFER") return "bg-purple-50 text-purple-700";
  return "bg-slate-100 text-slate-600";
};

export const PrePaidListPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<InvoiceResponse[]>([]);
  const [selected, setSelected] = useState<InvoiceResponse | null>(null);
  const [sort, setSort] = useState<SortState<"number" | "date" | "status" | "location" | "total"> | null>(null);
  const [filters, setFilters] = useState<FilterSet>({ clauses: [] });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [assignCustomerOpen, setAssignCustomerOpen] = useState(false);
  const [assignCustomer, setAssignCustomer] = useState<CustomerRecord | null>(null);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("error");

  const [createOpen, setCreateOpen] = useState(false);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createPortalCustomer, setCreatePortalCustomer] = useState<CustomerRecord | null>(null);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [createLocation, setCreateLocation] = useState<string>("");
  const [createNotes, setCreateNotes] = useState("");
  const [createPaymentMade, setCreatePaymentMade] = useState(true);
  const [createAmountPaid, setCreateAmountPaid] = useState("");
  const [createPaymentMethod, setCreatePaymentMethod] = useState<(typeof PAYMENT_METHOD_OPTIONS)[number]>("OTHER");
  const [createItems, setCreateItems] = useState<CreateRow[]>([buildEmptyRow()]);
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);
  const [editLocation, setEditLocation] = useState<string>("");
  const [editNotes, setEditNotes] = useState("");
  const [editPortalCustomer, setEditPortalCustomer] = useState<CustomerRecord | null>(null);
  const [editRecordPayment, setEditRecordPayment] = useState(false);
  const [editPaymentAmount, setEditPaymentAmount] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState<(typeof PAYMENT_METHOD_OPTIONS)[number]>("OTHER");
  const [editPaymentTouched, setEditPaymentTouched] = useState(false);
  const [editRecordedPayments, setEditRecordedPayments] = useState<InvoicePayment[]>([]);
  const [editRecordedPaidTotal, setEditRecordedPaidTotal] = useState(0);
  const [editItems, setEditItems] = useState<CreateRow[]>([buildEmptyRow()]);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [itemMetaVersion, setItemMetaVersion] = useState(0);
  const itemMetaRef = useRef<Map<number, ItemMeta>>(new Map());

  const filterColumns: ColumnMeta[] = useMemo(
    () => [
      { id: "created_on", label: "Date created", type: "date" },
      {
        id: "prepaid_redeem_status",
        label: "Redeemed flag",
        type: "choice",
        choices: [
          { value: "UNUSED", label: "Unused" },
          { value: "PARTIALLY_REDEEMED", label: "Partially redeemed" },
          { value: "REDEEMED", label: "Redeemed" },
        ],
      },
      {
        id: "location_id",
        label: "Location",
        type: "choice",
        choices: outlets.map((outlet) => ({
          value: String(outlet.id),
          label: String(outlet.name || `Location #${outlet.id}`),
        })),
      },
    ],
    [outlets]
  );

  const hasPeek = !!selected;
  const selectedPrepaidCode = useMemo(
    () => String(selected?.prepaid_number || "").trim().toUpperCase(),
    [selected?.prepaid_number]
  );
  const prepaidQrPayload = useMemo(() => {
    if (!selectedPrepaidCode || typeof window === "undefined") return "";
    const json = JSON.stringify({ kind: "PREPAID", value: selectedPrepaidCode });
    const encoded = window
      .btoa(json)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    return `KK1:${encoded}`;
  }, [selectedPrepaidCode]);

  const showToast = (message: string, variant: "error" | "success" | "info" = "error") => {
    setToastVariant(variant);
    setToastMessage(message);
  };

  const toggleSelected = (invoiceId: number, checked?: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const shouldSelect = checked ?? !next.has(invoiceId);
      if (shouldSelect) next.add(invoiceId);
      else next.delete(invoiceId);
      return Array.from(next);
    });
  };

  const clearSelection = () => setSelectedIds([]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await fetchOrders({
          type_id: "PREPAID",
          filters,
          search: debouncedSearch || undefined,
          page,
          page_size: pageSize,
        });
        if (!cancelled) {
          setRows(data.results ?? []);
          setTotalCount(Number(data.count ?? 0));
        }
      } catch {
        if (!cancelled) {
          setRows([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, page, pageSize, reloadTick, filters]);

  useEffect(() => {
    const visible = new Set(rows.map((row) => row.id));
    setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
  }, [rows]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchOutlets();
        if (!cancelled) setOutlets(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setOutlets([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadItemOptions = useCallback(async (query: string, signal?: AbortSignal): Promise<ItemOption[]> => {
    const data = await searchItems(query, { page_size: 30, signal });
    const items = data.results ?? [];

    return items
      .filter((it) => typeof it.id === "number")
      .map((it) => {
        const id = Number(it.id);
        const prev = itemMetaRef.current.get(id);
        itemMetaRef.current.set(id, {
          ...prev,
          name: it.name,
          sku: it.sku,
          price: it.price ?? "0.00",
          taxRate: it.sale_tax_rate != null ? String(it.sale_tax_rate) : "0.000",
          customizations: prev?.customizations ?? [],
          customizationsLoaded: prev?.customizationsLoaded ?? false,
        });
        return {
          id,
          label: it.name,
          subLabel: [it.sku ? `SKU: ${it.sku}` : null, it.price ? `Price: ${it.price}` : null]
            .filter(Boolean)
            .join(" - "),
        };
      });
  }, []);

  const ensureItemMeta = useCallback(async (itemId: number) => {
    if (!itemId) return;

    const current = itemMetaRef.current.get(itemId);
    if (current?.customizationsLoaded) return;

    try {
      const item = await fetchItem(itemId);
      const options: CustomizationOption[] = (item.customizations ?? [])
        .filter((c) => typeof c.id === "number" && typeof c.child === "number")
        .map((c) => ({
          id: Number(c.id),
          childId: Number(c.child),
          label: String(c.label || ""),
          pricingType: String(c.pricing_type || "INCLUDED").toUpperCase(),
          priceDelta: String(c.price_delta ?? "0"),
          minQty: String(c.min_qty ?? "0"),
          maxQty: String(c.max_qty ?? "99"),
          stepQty: String(c.step_qty ?? "1"),
        }));

      itemMetaRef.current.set(itemId, {
        ...current,
        name: item.name || current?.name || `#${itemId}`,
        sku: item.sku ?? current?.sku,
        price: item.price ?? current?.price ?? "0.00",
        taxRate: item.sale_tax_rate != null ? String(item.sale_tax_rate) : current?.taxRate ?? "0.000",
        customizations: options,
        customizationsLoaded: true,
      });
    } catch {
      itemMetaRef.current.set(itemId, {
        ...(current ?? { name: `#${itemId}`, customizations: [] }),
        customizations: current?.customizations ?? [],
        customizationsLoaded: true,
      });
    } finally {
      setItemMetaVersion((v) => v + 1);
    }
  }, []);

  const sortedRows = useMemo(
    () =>
      sortBy(rows, sort, {
        number: (i) => i.number ?? "",
        date: (i) => new Date(i.invoice_date),
        status: (i) => getPrepaidDisplayStatus(i),
        location: (i) => i.location_name ?? "",
        total: (i) => Number(i.amount_paid ?? 0),
      }),
    [rows, sort]
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const mapInvoiceItemsToRows = (invoice: InvoiceResponse): CreateRow[] => {
    const parentLines = (invoice.items || []).filter((ln) => ln.parent_line === null);
    if (!parentLines.length) {
      return [buildEmptyRow()];
    }
    return parentLines.map((ln, idx) => {
      const qty = Number(ln.quantity ?? 0);
      const unit = Number(ln.unit_price ?? 0);
      const base = qty * unit;
      const tax = Number(ln.tax_amount ?? 0);
      const inferredRate = base > 0 ? ((tax / base) * 100).toFixed(3) : "0.000";
      return {
        key: `${invoice.id}-${ln.id}-${idx}`,
        itemId: Number(ln.item),
        itemLabel: ln.item_name,
        itemSku: ln.item_sku,
        description: ln.description || "",
        saleTaxRate: inferredRate,
        quantity: String(ln.quantity ?? "1"),
        unitPrice: String(ln.unit_price ?? "0.00"),
        customizations: [],
      };
    });
  };

  const parseApiError = (err: any, fallback: string) => {
    const detail = err?.response?.data;
    if (typeof detail?.detail === "string") return detail.detail;
    if (Array.isArray(detail?.items) && detail.items[0]) return String(detail.items[0]);
    return err?.message || fallback;
  };

  const visibleIds = useMemo(() => sortedRows.map((row) => row.id), [sortedRows]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((invoiceId) => selectedIdSet.has(invoiceId));
  const someVisibleSelected = visibleIds.some((invoiceId) => selectedIdSet.has(invoiceId));

  const selectedCustomerName = (() => {
    if (!assignCustomer) return null;
    const full = `${assignCustomer.first_name || ""} ${assignCustomer.last_name || ""}`.trim();
    return full || assignCustomer.email || `Customer #${assignCustomer.id}`;
  })();

  const bulkDelete = async () => {
    if (!selectedIds.length) return;
    setBulkBusy(true);
    try {
      const res = await bulkInvoices({ ids: selectedIds, action: "delete" });
      const okSet = new Set((res.ok_ids || []).map(Number));
      const failed = res.failed || [];
      const failedIds = failed.map((f) => Number(f.id)).filter(Number.isFinite);

      if (okSet.size) {
        setRows((prev) => prev.filter((inv) => !okSet.has(inv.id)));
        setTotalCount((prev) => Math.max(0, prev - okSet.size));
        if (selected && okSet.has(selected.id)) {
          setSelected(null);
        }
        showToast(`Deleted ${okSet.size} invoice(s).`, "success");
      }

      if (failedIds.length) {
        setSelectedIds(failedIds);
        const hasPayments = failed.some((f) => String(f.reason || "").toUpperCase() === "HAS_PAYMENTS");
        showToast(
          hasPayments
            ? "Some invoices were not deleted because payments have already been recorded."
            : "Some invoices could not be deleted.",
          "error"
        );
      } else {
        clearSelection();
      }
    } catch (err: any) {
      showToast(parseApiError(err, "Bulk delete failed."));
    } finally {
      setBulkBusy(false);
    }
  };

  const submitAssignCustomer = async () => {
    if (!selectedIds.length) return;
    if (!assignCustomer) {
      setAssignError("Select a customer before applying.");
      return;
    }
    setAssignError(null);
    setBulkBusy(true);
    try {
      const res = await bulkInvoices({
        ids: selectedIds,
        action: "assign_customer",
        portal_customer: assignCustomer.id,
      });
      const okSet = new Set((res.ok_ids || []).map(Number));
      const failed = res.failed || [];
      const failedIds = failed.map((f) => Number(f.id)).filter(Number.isFinite);

      if (okSet.size) {
        setRows((prev) =>
          prev.map((inv) =>
            okSet.has(inv.id)
              ? {
                  ...inv,
                  portal_customer: assignCustomer.id,
                  portal_customer_name: selectedCustomerName || inv.portal_customer_name,
                  customer_name: selectedCustomerName || inv.customer_name,
                }
              : inv
          )
        );
        if (selected && okSet.has(selected.id)) {
          setSelected((prev) =>
            prev
              ? {
                  ...prev,
                  portal_customer: assignCustomer.id,
                  portal_customer_name: selectedCustomerName || prev.portal_customer_name,
                  customer_name: selectedCustomerName || prev.customer_name,
                }
              : prev
          );
        }
        showToast(`Assigned customer to ${okSet.size} invoice(s).`, "success");
      }

      if (failedIds.length) {
        setSelectedIds(failedIds);
        showToast("Some invoices could not be updated.", "error");
      } else {
        clearSelection();
      }

      setAssignCustomerOpen(false);
      setAssignCustomer(null);
      setAssignError(null);
    } catch (err: any) {
      setAssignError(parseApiError(err, "Failed to assign customer."));
    } finally {
      setBulkBusy(false);
    }
  };

  const parseNumber = (value: string | number | null | undefined, fallback = 0) => {
    const n = Number(value ?? fallback);
    return Number.isFinite(n) ? n : fallback;
  };

  const parseMinQty = (opt: CustomizationOption) => {
    const min = parseNumber(opt.minQty, 0);
    return min > 0 ? min : 1;
  };

  const formatCustomizationDelta = (opt: CustomizationOption) => {
    const amount = Math.abs(parseNumber(opt.priceDelta, 0));
    if (opt.pricingType === "EXTRA") return `+${formatMoneyNGN(amount)}`;
    if (opt.pricingType === "DISCOUNT") return `-${formatMoneyNGN(amount)}`;
    return "Included";
  };

  const rowCustomizationOptions = (row: CreateRow) => {
    void itemMetaVersion;
    if (!row.itemId) return [];
    return itemMetaRef.current.get(row.itemId)?.customizations ?? [];
  };

  const parseDescriptionCustomizations = (description?: string) => {
    const text = String(description || "");
    const marker = "| Customizations:";
    const idx = text.indexOf(marker);
    if (idx < 0) return [] as Array<{ label: string; quantity: string }>;

    const raw = text.slice(idx + marker.length).trim();
    if (!raw) return [] as Array<{ label: string; quantity: string }>;

    return raw
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const match = part.match(/^(.*)\sx([0-9.]+)$/i);
        if (!match) return { label: part, quantity: "1" };
        return { label: match[1].trim(), quantity: String(match[2]).trim() || "1" };
      });
  };

  const inferRowCustomizationsFromDescription = (row: CreateRow): RowCustomizationSelection[] => {
    if (row.customizations?.length) return row.customizations;
    const hints = parseDescriptionCustomizations(row.description);
    if (!hints.length) return row.customizations || [];

    const options = rowCustomizationOptions(row);
    if (!options.length) return row.customizations || [];

    const selections: RowCustomizationSelection[] = [];
    hints.forEach((hint) => {
      const option = options.find((opt) => opt.label.toLowerCase() === hint.label.toLowerCase());
      if (!option) return;
      selections.push({
        customizationId: option.id,
        quantity: hint.quantity || String(parseMinQty(option)),
      });
    });
    return selections;
  };

  const rowCustomizationSummary = (row: CreateRow) => {
    const optionsById = new Map(rowCustomizationOptions(row).map((opt) => [opt.id, opt]));
    const parts: string[] = [];
    for (const sel of row.customizations || []) {
      const opt = optionsById.get(sel.customizationId);
      if (!opt) continue;
      const qty = parseNumber(sel.quantity, 0);
      if (qty <= 0) continue;
      parts.push(`${opt.label} x${qty}`);
    }
    return parts.join(", ");
  };

  const composeRowDescription = (row: CreateRow) => {
    const baseDescription = String(row.description || "");
    const marker = "| Customizations:";
    const markerIdx = baseDescription.indexOf(marker);
    const fallbackBase = markerIdx >= 0 ? baseDescription.slice(0, markerIdx).trim() : baseDescription.trim();
    const base = row.itemLabel?.trim() || fallbackBase;
    const summary = rowCustomizationSummary(row);
    if (!summary) return base;
    return `${base} | Customizations: ${summary}`;
  };

  const computeRowUnitDelta = (row: CreateRow) => {
    const optionsById = new Map(rowCustomizationOptions(row).map((opt) => [opt.id, opt]));
    let delta = 0;
    for (const sel of row.customizations || []) {
      const opt = optionsById.get(sel.customizationId);
      if (!opt) continue;
      const qty = parseNumber(sel.quantity, 0);
      if (qty <= 0) continue;

      const amount = Math.abs(parseNumber(opt.priceDelta, 0));
      if (!amount) continue;

      if (opt.pricingType === "DISCOUNT") delta -= amount * qty;
      else if (opt.pricingType === "EXTRA") delta += amount * qty;
    }
    return delta;
  };

  const computeEffectiveUnitPrice = (row: CreateRow) => {
    const base = parseNumber(row.unitPrice, 0);
    const effective = base + computeRowUnitDelta(row);
    return effective > 0 ? effective : 0;
  };

  const computeRowTax = (row: CreateRow) => {
    const qty = parseNumber(row.quantity, 0);
    const unit = computeEffectiveUnitPrice(row);
    const rate = parseNumber(row.saleTaxRate, 0);
    if (!Number.isFinite(qty) || !Number.isFinite(unit) || !Number.isFinite(rate)) return 0;
    if (qty <= 0 || unit <= 0 || rate <= 0) return 0;
    return (qty * unit * rate) / 100;
  };

  const computeRowSubtotal = (row: CreateRow) => {
    const qty = parseNumber(row.quantity, 0);
    const unit = computeEffectiveUnitPrice(row);
    if (!Number.isFinite(qty) || !Number.isFinite(unit) || qty <= 0 || unit <= 0) return 0;
    return qty * unit;
  };

  const computeInvoiceSubtotal = useCallback(
    (items: CreateRow[]) => items.reduce((sum, row) => sum + computeRowSubtotal(row), 0),
    []
  );

  const computeInvoiceTax = useCallback(
    (items: CreateRow[]) => items.reduce((sum, row) => sum + computeRowTax(row), 0),
    []
  );

  const editPreviewSubtotal = useMemo(
    () => computeInvoiceSubtotal(editItems),
    [computeInvoiceSubtotal, editItems, itemMetaVersion]
  );
  const editPreviewTax = useMemo(
    () => computeInvoiceTax(editItems),
    [computeInvoiceTax, editItems, itemMetaVersion]
  );
  const editPreviewGrandTotal = useMemo(
    () => editPreviewSubtotal + editPreviewTax,
    [editPreviewSubtotal, editPreviewTax]
  );
  const editRemainingBeforePayment = useMemo(
    () => Math.max(editPreviewGrandTotal - editRecordedPaidTotal, 0),
    [editPreviewGrandTotal, editRecordedPaidTotal]
  );
  const editPendingPaymentAmount = useMemo(() => {
    if (!editRecordPayment) return 0;
    const trimmed = editPaymentAmount.trim();
    if (!trimmed) return editRemainingBeforePayment;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [editPaymentAmount, editRecordPayment, editRemainingBeforePayment]);
  const editProjectedAmountPaid = useMemo(
    () => editRecordedPaidTotal + editPendingPaymentAmount,
    [editPendingPaymentAmount, editRecordedPaidTotal]
  );
  const editProjectedBalanceDue = useMemo(
    () => Math.max(editPreviewGrandTotal - editProjectedAmountPaid, 0),
    [editPreviewGrandTotal, editProjectedAmountPaid]
  );
  const editProjectedStatus = useMemo(
    () =>
      getPrepaidDisplayStatus({
        type_id: "PREPAID",
        status: editProjectedBalanceDue <= 0.009 ? "PAID" : "DRAFT",
        prepaid_redeem_status: "UNUSED",
        grand_total: editPreviewGrandTotal.toFixed(2),
        amount_paid: editProjectedAmountPaid.toFixed(2),
        balance_due: editProjectedBalanceDue.toFixed(2),
      } as InvoiceResponse),
    [editPreviewGrandTotal, editProjectedAmountPaid, editProjectedBalanceDue]
  );

  const openCreate = () => {
    setCreateError(null);
    setCreateLocation("");
    setCreateNotes("");
    setCreatePaymentMade(true);
    setCreateAmountPaid("");
    setCreatePaymentMethod("OTHER");
    setCreatePortalCustomer(null);
    setCreateItems([buildEmptyRow()]);
    setCreateOpen(true);
  };

  const closeCreate = () => {
    if (createSaving) return;
    setCreateOpen(false);
  };

  const addCreateRow = () => {
    setCreateItems((prev) => [...prev, buildEmptyRow(`${Date.now()}-${prev.length}`)]);
  };

  const updateCreateRow = (key: string, patch: Partial<CreateRow>) => {
    setCreateItems((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const updateCreateCustomization = (key: string, customizationId: number, quantity: string | null) => {
    setCreateItems((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const current = row.customizations || [];
        const next = current.filter((sel) => sel.customizationId !== customizationId);
        if (quantity != null) {
          next.push({ customizationId, quantity });
        }
        return { ...row, customizations: next };
      })
    );
  };

  const removeCreateRow = (key: string) => {
    setCreateItems((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== key)));
  };

  const submitCreate = async () => {
    setCreateError(null);
    const locationId = Number(createLocation);
    if (!locationId) {
      setCreateError("Location is required.");
      return;
    }

    const payloadItems = createItems
      .filter((row) => row.itemId && Number(row.quantity) > 0)
      .map((row) => ({
        item: Number(row.itemId),
        quantity: row.quantity,
        unit_price: computeEffectiveUnitPrice(row).toFixed(2),
        description: composeRowDescription(row),
      }));

    if (!payloadItems.length) {
      setCreateError("Add at least one valid item row.");
      return;
    }

    setCreateSaving(true);
    try {
      const created = await createPrepaidInvoice({
        location: locationId,
        portal_customer: createPortalCustomer?.id ?? null,
        notes: createNotes,
        payment_made: createPaymentMade,
        amount_paid: createAmountPaid.trim() || undefined,
        payment_method: createPaymentMethod,
        items: payloadItems,
      });
      setCreateOpen(false);
      setSelected(created);
      setPage(1);
      setReloadTick((v) => v + 1);
    } catch (err: any) {
      setCreateError(parseApiError(err, "Unable to create pre-paid invoice."));
    } finally {
      setCreateSaving(false);
    }
  };

  const openEdit = async (invoice: InvoiceResponse) => {
    if (String(invoice.prepaid_redeem_status || "UNUSED").toUpperCase() !== "UNUSED") return;
    setEditError(null);
    setEditingInvoiceId(invoice.id);
    setEditLocation(String(invoice.location || ""));
    setEditNotes(invoice.notes || "");
    const sortedPayments = [...(invoice.payments || [])].sort(
      (a, b) => new Date(a.paid_on).getTime() - new Date(b.paid_on).getTime()
    );
    const recordedPaid =
      sortedPayments.reduce((sum, payment) => sum + parseNumber(payment.amount, 0), 0) ||
      parseNumber(invoice.amount_paid, 0);
    const defaultMethod = sortedPayments.length
      ? sortedPayments[sortedPayments.length - 1]?.method ?? "OTHER"
      : "OTHER";
    setEditRecordedPayments(sortedPayments);
    setEditRecordedPaidTotal(recordedPaid);
    setEditRecordPayment(false);
    setEditPaymentTouched(false);
    setEditPaymentAmount(Math.max(parseNumber(invoice.balance_due, 0), 0).toFixed(2));
    setEditPaymentMethod(isPaymentMethod(defaultMethod) ? defaultMethod : "OTHER");
    const mapped = mapInvoiceItemsToRows(invoice);
    setEditItems(mapped);
    setEditPortalCustomer(null);
    setEditOpen(true);

    mapped.forEach((row) => {
      if (!row.itemId) return;
      void ensureItemMeta(Number(row.itemId)).then(() => {
        setEditItems((prev) =>
          prev.map((current) => {
            if (current.key !== row.key) return current;
            const inferred = inferRowCustomizationsFromDescription(current);
            if (!inferred.length || current.customizations.length) return current;
            return { ...current, customizations: inferred };
          })
        );
      });
    });

    if (invoice.portal_customer) {
      try {
        const customer = await fetchCustomer(invoice.portal_customer);
        setEditPortalCustomer(customer);
      } catch {
        // keep empty and let user reselect if needed
      }
    }
  };

  const closeEdit = () => {
    if (editSaving) return;
    setEditOpen(false);
    setEditingInvoiceId(null);
    setEditRecordedPayments([]);
    setEditRecordedPaidTotal(0);
    setEditRecordPayment(false);
    setEditPaymentTouched(false);
    setEditPaymentAmount("");
    setEditPaymentMethod("OTHER");
  };

  useEffect(() => {
    if (!editOpen || editPaymentTouched) return;
    setEditPaymentAmount(editRemainingBeforePayment > 0 ? editRemainingBeforePayment.toFixed(2) : "");
  }, [editOpen, editPaymentTouched, editRemainingBeforePayment]);

  const addEditRow = () => {
    setEditItems((prev) => [...prev, buildEmptyRow(`${Date.now()}-${prev.length}`)]);
  };

  const updateEditRow = (key: string, patch: Partial<CreateRow>) => {
    setEditItems((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const updateEditCustomization = (key: string, customizationId: number, quantity: string | null) => {
    setEditItems((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const current = row.customizations || [];
        const next = current.filter((sel) => sel.customizationId !== customizationId);
        if (quantity != null) {
          next.push({ customizationId, quantity });
        }
        return { ...row, customizations: next };
      })
    );
  };

  const removeEditRow = (key: string) => {
    setEditItems((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== key)));
  };

  const submitEdit = async () => {
    setEditError(null);
    if (!editingInvoiceId) {
      setEditError("Invalid invoice.");
      return;
    }

    const locationId = Number(editLocation);
    if (!locationId) {
      setEditError("Location is required.");
      return;
    }

    const payloadItems = editItems
      .filter((row) => row.itemId && Number(row.quantity) > 0)
      .map((row) => ({
        item: Number(row.itemId),
        quantity: row.quantity,
        unit_price: computeEffectiveUnitPrice(row).toFixed(2),
        description: composeRowDescription(row),
      }));

    if (!payloadItems.length) {
      setEditError("Add at least one valid item row.");
      return;
    }

    if (editRecordedPaidTotal - editPreviewGrandTotal > 0.009) {
      setEditError("Current recorded payments exceed the updated invoice total. Refund a payment or increase the invoice total before saving.");
      return;
    }

    if (editRecordPayment) {
      const trimmedAmount = editPaymentAmount.trim();
      if (trimmedAmount) {
        const parsedAmount = Number(trimmedAmount);
        if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
          setEditError("Payment amount must be a valid non-negative number.");
          return;
        }
        if (parsedAmount - editRemainingBeforePayment > 0.009) {
          setEditError("Payment amount cannot exceed the remaining invoice balance.");
          return;
        }
      }
    }

    setEditSaving(true);
    try {
      const updated = await updatePrepaidInvoice(editingInvoiceId, {
        location: locationId,
        portal_customer: editPortalCustomer?.id ?? null,
        notes: editNotes,
        payment_made: editRecordPayment,
        amount_paid: editRecordPayment ? editPaymentAmount.trim() || undefined : undefined,
        payment_method: editRecordPayment ? editPaymentMethod : undefined,
        items: payloadItems,
      });
      setEditOpen(false);
      setEditingInvoiceId(null);
      setSelected(updated);
      setReloadTick((v) => v + 1);
    } catch (err: any) {
      setEditError(parseApiError(err, "Unable to update pre-paid invoice."));
    } finally {
      setEditSaving(false);
    }
  };

  const handleSelectInvoice = useCallback(async (invoice: InvoiceResponse) => {
    setSelected(invoice);
    try {
      const fresh = await fetchInvoice(invoice.id);
      setSelected((prev) => (prev?.id === fresh.id ? fresh : prev));
      setRows((prev) => prev.map((row) => (row.id === fresh.id ? fresh : row)));
    } catch {
      // fall back to list payload if detail refresh fails
    }
  }, []);

  const downloadSelectedPrepaidQr = () => {
    setQrError(null);
    if (!selectedPrepaidCode) {
      setQrError("No pre-paid code found for this invoice.");
      return;
    }
    const canvas = document.getElementById(PREPAID_QR_CANVAS_ID) as HTMLCanvasElement | null;
    if (!canvas) {
      setQrError("Unable to render QR canvas.");
      return;
    }
    const href = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = href;
    link.download = `${selectedPrepaidCode}-pass.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex gap-4">
      <div
        className={`flex flex-col gap-4 ${!hasPeek ? "w-full" : "w-1/4"} ${
          hasPeek ? "h-screen overflow-hidden" : ""
        }`}
      >
        <ListPageHeader
          icon={<ReceiptText className="h-5 w-5" />}
          section="Sales"
          title="Pre-Paid"
          subtitle="Invoices paid in advance and redeemed later."
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
                    placeholder="Search pre-paid invoice"
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
                {can("Invoices", "create") ? (
                  <button onClick={openCreate} className="new inline-flex items-center gap-1 rounded-full">
                    <Plus className="h-3 w-3" />
                    New Pre-Paid
                  </button>
                ) : null}
              </div>
            ) : (
              ""
            )
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

        {!hasPeek && selectedIds.length > 0 ? (
          <BulkActionBar
            count={selectedIds.length}
            onClear={clearSelection}
            actions={[
              {
                key: "delete",
                label: "Delete",
                icon: <Trash2 className="h-4 w-4" />,
                disabled: bulkBusy || !can("Invoices", "delete"),
                onClick: bulkDelete,
              },
              {
                key: "assign_customer",
                label: "Assign customer",
                icon: <UserPlus className="h-4 w-4" />,
                disabled: bulkBusy || !can("Invoices", "edit"),
                onClick: () => {
                  setAssignError(null);
                  setAssignCustomerOpen(true);
                },
              },
            ]}
          />
        ) : null}

        {!hasPeek ? (
          <div className="flex items-center justify-between px-3 pb-2 text-xs text-kk-dark-text-muted">
            <div>
              Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1}-
              {totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount)} of {totalCount}
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
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded border border-kk-dark-input-border px-2 py-1 disabled:opacity-50"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}

        <div className={hasPeek ? "flex-1 overflow-y-auto" : "overflow-hidden"}>
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                {!hasPeek ? (
                  <th className="w-10">
                    <RowSelectCheckbox
                      checked={allVisibleSelected}
                      onChange={(checked) => {
                        if (checked) {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            visibleIds.forEach((invoiceId) => next.add(invoiceId));
                            return Array.from(next);
                          });
                        } else {
                          setSelectedIds((prev) =>
                            prev.filter((invoiceId) => !visibleIds.includes(invoiceId))
                          );
                        }
                      }}
                      label="Select all visible pre-paid invoices"
                      className={!allVisibleSelected && someVisibleSelected ? "ring-2 ring-blue-500/60" : ""}
                    />
                  </th>
                ) : null}
                <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "number"))}>
                  {!hasPeek ? "Invoice Number" : "Invoice"}
                  {sortIndicator(sort, "number")}
                </th>
                {!hasPeek ? (
                  <>
                    <th>Pre-Paid Number</th>
                    <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "date"))}>
                      Date{sortIndicator(sort, "date")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "status"))}
                    >
                      Status{sortIndicator(sort, "status")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "location"))}
                    >
                      Location{sortIndicator(sort, "location")}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "total"))}>
                      Amount Paid{sortIndicator(sort, "total")}
                    </th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((invoice) => (
                <tr key={invoice.id} className="cursor-pointer" onClick={() => void handleSelectInvoice(invoice)}>
                  {!hasPeek ? (
                    <td>
                      <RowSelectCheckbox
                        checked={selectedIdSet.has(invoice.id)}
                        onChange={(checked) => toggleSelected(invoice.id, checked)}
                        label={`Select invoice ${invoice.number}`}
                      />
                    </td>
                  ) : null}
                  <td>
                    {!hasPeek ? (
                      invoice.number
                    ) : (
                      <div className="flex flex-col gap-2 items-start">
                        <span>{invoice.number}</span>
                        <span className="text-xs text-kk-dark-text-muted">{invoice.prepaid_number || "-"}</span>
                        <span
                          className={[
                            "inline-flex rounded-md px-2 py-1 text-[11px] font-medium",
                            statusBadgeClass(getPrepaidDisplayStatus(invoice)),
                          ].join(" ")}
                        >
                          {toTitle(getPrepaidDisplayStatus(invoice))}
                        </span>
                      </div>
                    )}
                  </td>
                  {!hasPeek ? (
                    <>
                      <td>{invoice.prepaid_number || "-"}</td>
                      <td>{new Date(invoice.invoice_date).toLocaleString()}</td>
                      <td>
                        <span
                          className={[
                            "inline-flex rounded-md px-2 py-1 text-[11px] font-medium",
                            statusBadgeClass(getPrepaidDisplayStatus(invoice)),
                          ].join(" ")}
                        >
                          {toTitle(getPrepaidDisplayStatus(invoice))}
                        </span>
                      </td>
                      <td>{invoice.location_name}</td>
                      <td>{formatMoneyNGN(+invoice.amount_paid)}</td>
                    </>
                  ) : null}
                </tr>
              ))}

              {loading ? (
                <tr>
                  <td colSpan={hasPeek ? 1 : 7} className="px-3 py-6 text-center text-xs text-kk-dark-text-muted">
                    Loading pre-paid invoices...
                  </td>
                </tr>
              ) : null}

              {!loading && !rows.length ? (
                <tr>
                  <td colSpan={hasPeek ? 1 : 7} className="px-3 py-10 text-center text-xs text-kk-dark-text-muted">
                    No pre-paid invoices yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <SidePeek
          isOpen={hasPeek}
          onClose={() => {
            setSelected(null);
            setQrOpen(false);
            setQrError(null);
          }}
          widthClass="w-3/4"
          actions={
            <div className="flex items-center gap-2">
              <div className="text-xs font-medium text-kk-dark-text">{selected.prepaid_number || selected.number}</div>
              {selected.prepaid_number ? (
                <button
                  type="button"
                  onClick={() => {
                    setQrError(null);
                    setQrOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-kk-dark-input-border px-3 py-1.5 text-xs hover:bg-kk-dark-hover"
                >
                  <Download className="h-3.5 w-3.5" />
                  QR PNG
                </button>
              ) : null}
              {can("Invoices", "edit") &&
              String(selected.prepaid_redeem_status || "UNUSED").toUpperCase() === "UNUSED" ? (
                <button
                  type="button"
                  onClick={() => void openEdit(selected)}
                  className="rounded-md border border-kk-dark-input-border px-3 py-1.5 text-xs hover:bg-kk-dark-hover"
                >
                  Edit
                </button>
              ) : null}
              {can("Sales Return", "create") &&
              (selected.status === "PAID" || selected.status === "REFUNDED") ? (
                <button
                  type="button"
                  onClick={() => navigate(`/sales/invoices/${selected.id}/refund`)}
                  className="rounded-md bg-kk-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
                >
                  Refund
                </button>
              ) : null}
            </div>
          }
        >
          <PrePaidInvoicePeek invoice={selected} />
        </SidePeek>
      ) : null}

      {selected && qrOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-kk-dark-bg/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-kk-dark-border bg-kk-dark-bg-elevated shadow-soft">
            <div className="border-b border-kk-dark-border px-5 py-4">
              <h2 className="text-lg font-semibold">Pre-Paid Pass QR</h2>
              <p className="text-xs text-kk-dark-text-muted">
                This single QR code represents the full pre-paid invoice and all remaining redeemable items.
              </p>
            </div>
            <div className="space-y-3 px-5 py-4">
              <div className="flex justify-center rounded-lg border border-kk-dark-input-border bg-white p-3">
                <QRCodeCanvas id={PREPAID_QR_CANVAS_ID} value={prepaidQrPayload || selectedPrepaidCode} size={240} includeMargin />
              </div>
              <div className="text-center text-xs text-kk-dark-text-muted">
                {selectedPrepaidCode || "No pre-paid code"}
              </div>
              {qrError ? <p className="text-xs font-medium text-red-500">{qrError}</p> : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-kk-dark-border px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setQrOpen(false);
                  setQrError(null);
                }}
                className="rounded-md border border-kk-dark-input-border px-3 py-2 text-sm hover:bg-kk-dark-hover"
              >
                Close
              </button>
              <button
                type="button"
                onClick={downloadSelectedPrepaidQr}
                className="inline-flex items-center gap-1 rounded-md bg-kk-accent px-3 py-2 text-sm font-medium text-white hover:bg-blue-500"
                disabled={!selectedPrepaidCode}
              >
                <Download className="h-4 w-4" />
                Download PNG
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {assignCustomerOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-kk-dark-bg/70 p-4">
          <div className="w-full max-w-lg rounded-xl border border-kk-dark-border bg-kk-dark-bg-elevated shadow-soft">
            <div className="border-b border-kk-dark-border px-5 py-4">
              <h2 className="text-lg font-semibold">Assign Customer</h2>
              <p className="text-xs text-kk-dark-text-muted">
                Assign the selected customer to {selectedIds.length} selected invoice(s).
              </p>
            </div>
            <div className="space-y-3 px-5 py-4">
              <CustomerSearchSelect
                value={assignCustomer}
                onChange={(customer) => {
                  setAssignCustomer(customer);
                  setAssignError(null);
                }}
                disabled={bulkBusy}
                onError={(message) => setAssignError(message)}
                placeholder="Search and select customer"
              />
              {assignError ? <p className="text-xs font-medium text-red-500">{assignError}</p> : null}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-kk-dark-border px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  if (bulkBusy) return;
                  setAssignCustomerOpen(false);
                  setAssignCustomer(null);
                  setAssignError(null);
                }}
                className="rounded-md border border-kk-dark-input-border px-3 py-2 text-sm hover:bg-kk-dark-hover"
                disabled={bulkBusy}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAssignCustomer}
                className="rounded-md bg-kk-accent px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-70"
                disabled={bulkBusy}
              >
                {bulkBusy ? "Applying..." : "Assign Customer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-kk-dark-bg/70 p-4 sm:items-center">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-xl border border-kk-dark-border bg-kk-dark-bg-elevated shadow-soft">
            <div className="border-b border-kk-dark-border px-5 py-4">
              <h2 className="text-lg font-semibold">Create Pre-Paid Invoice</h2>
              <p className="text-xs text-kk-dark-text-muted">
                This creates a paid-in-advance invoice with a generated pre-paid number (`PPP-`).
              </p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Location</label>
                  <select
                    value={createLocation}
                    onChange={(e) => setCreateLocation(e.target.value)}
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  >
                    <option value="">Select location</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Notes</label>
                  <input
                    value={createNotes}
                    onChange={(e) => setCreateNotes(e.target.value)}
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    placeholder="Optional note"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Payment made</label>
                  <select
                    value={createPaymentMade ? "yes" : "no"}
                    onChange={(e) => setCreatePaymentMade(e.target.value === "yes")}
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  >
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Amount paid</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={createAmountPaid}
                    onChange={(e) => setCreateAmountPaid(e.target.value)}
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm disabled:opacity-60"
                    placeholder="Defaults to invoice total"
                    disabled={!createPaymentMade}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Payment method</label>
                  <select
                    value={createPaymentMethod}
                    onChange={(e) => setCreatePaymentMethod(isPaymentMethod(e.target.value) ? e.target.value : "OTHER")}
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm disabled:opacity-60"
                    disabled={!createPaymentMade}
                  >
                    {PAYMENT_METHOD_OPTIONS.map((method) => (
                      <option key={method} value={method}>
                        {toTitle(method)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-kk-dark-text-muted">Assigned Customer (wallet)</label>
                  {can("Contacts", "create") ? (
                    <button
                      type="button"
                      onClick={() => setShowCreateCustomerModal(true)}
                      className="inline-flex items-center gap-1 rounded-md border border-kk-dark-input-border px-2 py-1 text-[11px] hover:bg-kk-dark-hover"
                      disabled={createSaving}
                    >
                      <Plus className="h-3 w-3" />
                      New Customer
                    </button>
                  ) : null}
                </div>
                <CustomerSearchSelect
                  value={createPortalCustomer}
                  onChange={setCreatePortalCustomer}
                  disabled={createSaving}
                  onError={(message) => setCreateError(message)}
                  placeholder="Search and select customer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Items</h3>
                  <button
                    type="button"
                    className="rounded-md border border-kk-dark-input-border px-2 py-1 text-xs hover:bg-kk-dark-hover"
                    onClick={addCreateRow}
                  >
                    Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-[2fr_2fr_110px_130px_130px_44px] gap-2 text-[11px] text-kk-dark-text-muted">
                    <span className="text-left">Item</span>
                    <span className="text-left">Customizations</span>
                    <span className="text-left">Qty</span>
                    <span className="text-left">Rate</span>
                    <span className="text-left">Tax</span>
                    <span />
                  </div>
                  {createItems.map((row) => (
                    <div key={row.key} className="grid grid-cols-[2fr_2fr_110px_130px_130px_44px] gap-2">
                      <ItemSearchSelect
                        valueId={row.itemId}
                        valueLabel={row.itemLabel}
                        valueSubLabel={row.itemSku ? `SKU: ${row.itemSku}` : undefined}
                        onChange={(id, option) => {
                          const meta = id != null ? itemMetaRef.current.get(id) : undefined;
                          updateCreateRow(row.key, {
                            itemId: id,
                            itemLabel: option?.label ?? meta?.name ?? "",
                            itemSku: meta?.sku,
                            description: option?.label ?? meta?.name ?? "",
                            saleTaxRate: meta?.taxRate ?? row.saleTaxRate ?? "0.000",
                            unitPrice: meta?.price ?? row.unitPrice ?? "0.00",
                            customizations: [],
                          });
                          if (id != null) void ensureItemMeta(id);
                        }}
                        loadOptions={loadItemOptions}
                        placeholder="Find item..."
                      />

                      <div className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-2 text-left text-xs">
                        {!row.itemId ? (
                          <span className="text-kk-dark-text-muted">Select an item first</span>
                        ) : !itemMetaRef.current.get(row.itemId)?.customizationsLoaded ? (
                          <span className="text-kk-dark-text-muted">Loading customizations...</span>
                        ) : rowCustomizationOptions(row).length === 0 ? (
                          <span className="text-kk-dark-text-muted">Not customizable</span>
                        ) : (
                          <div className="max-h-28 space-y-1 overflow-auto pr-1">
                            {rowCustomizationOptions(row).map((opt) => {
                              const selected = row.customizations.find((sel) => sel.customizationId === opt.id);
                              const minQty = parseMinQty(opt);
                              return (
                                <div key={opt.id} className="grid grid-cols-[16px_1fr_70px] items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={!!selected}
                                    onChange={(e) => {
                                      if (!e.target.checked) {
                                        updateCreateCustomization(row.key, opt.id, null);
                                        return;
                                      }
                                      updateCreateCustomization(row.key, opt.id, String(minQty));
                                    }}
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-left">{opt.label || `Customization #${opt.id}`}</p>
                                    <p className="text-[10px] text-kk-dark-text-muted">{formatCustomizationDelta(opt)}</p>
                                  </div>
                                  <input
                                    type="number"
                                    min={String(minQty)}
                                    step={opt.stepQty || "1"}
                                    max={opt.maxQty || undefined}
                                    value={selected?.quantity ?? ""}
                                    disabled={!selected}
                                    onChange={(e) => {
                                      updateCreateCustomization(
                                        row.key,
                                        opt.id,
                                        e.target.value === "" ? String(minQty) : e.target.value
                                      );
                                    }}
                                    className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-left text-xs disabled:opacity-50"
                                    title="Customization qty"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={row.quantity}
                        onChange={(e) => updateCreateRow(row.key, { quantity: e.target.value })}
                        className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                        placeholder="Qty"
                      />

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.unitPrice}
                        onChange={(e) => updateCreateRow(row.key, { unitPrice: e.target.value })}
                        className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-left text-sm"
                        placeholder="Rate"
                      />

                      <div
                        className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-left text-sm text-kk-dark-text-muted"
                        title="Calculated tax (read-only)"
                      >
                        {formatMoneyNGN(computeRowTax(row))}
                      </div>

                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border border-kk-dark-input-border hover:bg-kk-dark-hover disabled:opacity-50"
                        disabled={createItems.length <= 1}
                        onClick={() => removeCreateRow(row.key)}
                        title="Remove row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {createError ? <p className="text-xs font-medium text-red-500">{createError}</p> : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-kk-dark-border px-5 py-4">
              <button
                type="button"
                onClick={closeCreate}
                className="rounded-md border border-kk-dark-input-border px-3 py-2 text-sm hover:bg-kk-dark-hover"
                disabled={createSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitCreate}
                className="rounded-md bg-kk-accent px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-70"
                disabled={createSaving}
              >
                {createSaving ? "Creating..." : "Create Pre-Paid"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editOpen ? (
        <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-kk-dark-bg/70 p-4 sm:items-center">
          <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-3xl flex-col rounded-xl border border-kk-dark-border bg-kk-dark-bg-elevated shadow-soft">
            <div className="border-b border-kk-dark-border px-5 py-4">
              <h2 className="text-lg font-semibold">Edit Pre-Paid Invoice</h2>
              <p className="text-xs text-kk-dark-text-muted">
                You can edit this invoice while it remains unused and record additional payments.
              </p>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Location</label>
                  <select
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                  >
                    <option value="">Select location</option>
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-kk-dark-text-muted">Notes</label>
                  <input
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    placeholder="Optional note"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-kk-dark-text-muted">Assigned Customer (wallet)</label>
                  {can("Contacts", "create") ? (
                    <button
                      type="button"
                      onClick={() => setShowCreateCustomerModal(true)}
                      className="inline-flex items-center gap-1 rounded-md border border-kk-dark-input-border px-2 py-1 text-[11px] hover:bg-kk-dark-hover"
                      disabled={editSaving}
                    >
                      <Plus className="h-3 w-3" />
                      New Customer
                    </button>
                  ) : null}
                </div>
                <CustomerSearchSelect
                  value={editPortalCustomer}
                  onChange={setEditPortalCustomer}
                  disabled={editSaving}
                  onError={(message) => setEditError(message)}
                  placeholder="Search and select customer"
                />
              </div>

              <div className="space-y-3 rounded-xl border border-kk-dark-border bg-kk-dark-bg px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Payments</h3>
                    <p className="text-xs text-kk-dark-text-muted">
                      Record installments until the invoice is fully paid, then it returns to the unused redeem flow.
                    </p>
                  </div>
                  <span
                    className={[
                      "inline-flex rounded-md px-2 py-1 text-[11px] font-medium",
                      statusBadgeClass(editProjectedStatus),
                    ].join(" ")}
                  >
                    {toTitle(editProjectedStatus)}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="space-y-1">
                    <label className="text-xs text-kk-dark-text-muted">Record payment now</label>
                    <select
                      value={editRecordPayment ? "yes" : "no"}
                      onChange={(e) => setEditRecordPayment(e.target.value === "yes")}
                      className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-kk-dark-text-muted">Amount paid</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editPaymentAmount}
                      onChange={(e) => {
                        setEditPaymentTouched(true);
                        setEditPaymentAmount(e.target.value);
                      }}
                      className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm disabled:opacity-60"
                      placeholder="Defaults to remaining balance"
                      disabled={!editRecordPayment}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-kk-dark-text-muted">Payment method</label>
                    <select
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(isPaymentMethod(e.target.value) ? e.target.value : "OTHER")}
                      className="w-full rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm disabled:opacity-60"
                      disabled={!editRecordPayment}
                    >
                      {PAYMENT_METHOD_OPTIONS.map((method) => (
                        <option key={method} value={method}>
                          {toTitle(method)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                  <div className="rounded-lg border border-kk-dark-input-border bg-kk-dark-bg-elevated px-3 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-kk-dark-text-muted">Invoice Total</p>
                    <p className="mt-1 text-sm font-semibold">{formatMoneyNGN(editPreviewGrandTotal)}</p>
                  </div>
                  <div className="rounded-lg border border-kk-dark-input-border bg-kk-dark-bg-elevated px-3 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-kk-dark-text-muted">Recorded Payments</p>
                    <p className="mt-1 text-sm font-semibold">{formatMoneyNGN(editRecordedPaidTotal)}</p>
                  </div>
                  <div className="rounded-lg border border-kk-dark-input-border bg-kk-dark-bg-elevated px-3 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-kk-dark-text-muted">Remaining Before Payment</p>
                    <p className="mt-1 text-sm font-semibold">{formatMoneyNGN(editRemainingBeforePayment)}</p>
                  </div>
                  <div className="rounded-lg border border-kk-dark-input-border bg-kk-dark-bg-elevated px-3 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-kk-dark-text-muted">Pending Payment</p>
                    <p className="mt-1 text-sm font-semibold">
                      {formatMoneyNGN(editRecordPayment ? editPendingPaymentAmount : 0)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-kk-dark-input-border bg-kk-dark-bg-elevated px-3 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-kk-dark-text-muted">Projected Balance</p>
                    <p className="mt-1 text-sm font-semibold">{formatMoneyNGN(editProjectedBalanceDue)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-kk-dark-text-muted">
                      Payment History
                    </h4>
                    <span className="text-xs text-kk-dark-text-muted">
                      {editRecordedPayments.length} recorded
                    </span>
                  </div>

                  {editRecordedPayments.length ? (
                    <div className="overflow-x-auto rounded-lg border border-kk-dark-input-border">
                      <table className="min-w-full table-auto text-left text-sm">
                        <thead className="bg-kk-dark-bg-elevated text-[11px] uppercase tracking-wide text-kk-dark-text-muted">
                          <tr>
                            <th className="px-3 py-2 font-medium">Recorded On</th>
                            <th className="px-3 py-2 font-medium">Recorded By</th>
                            <th className="px-3 py-2 font-medium">Method</th>
                            <th className="px-3 py-2 font-medium text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...editRecordedPayments].reverse().map((payment) => (
                            <tr key={payment.id} className="border-t border-kk-dark-input-border">
                              <td className="px-3 py-2">{payment.paid_on ? toDateStr(payment.paid_on) : "-"}</td>
                              <td className="px-3 py-2">{payment.received_by_name || "-"}</td>
                              <td className="px-3 py-2">
                                <span
                                  className={[
                                    "inline-flex rounded-md px-2 py-1 text-[11px] font-medium",
                                    paymentMethodBadgeClass(payment.method),
                                  ].join(" ")}
                                >
                                  {toTitle(payment.method)}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {formatMoneyNGN(parseNumber(payment.amount, 0))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-kk-dark-input-border px-3 py-4 text-sm text-kk-dark-text-muted">
                      No payments have been recorded on this invoice yet.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Items</h3>
                  <button
                    type="button"
                    className="rounded-md border border-kk-dark-input-border px-2 py-1 text-xs hover:bg-kk-dark-hover"
                    onClick={addEditRow}
                  >
                    Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-[2fr_2fr_110px_130px_130px_44px] gap-2 text-[11px] text-kk-dark-text-muted">
                    <span className="text-left">Item</span>
                    <span className="text-left">Customizations</span>
                    <span className="text-left">Qty</span>
                    <span className="text-left">Rate</span>
                    <span className="text-left">Tax</span>
                    <span />
                  </div>
                  {editItems.map((row) => (
                    <div key={row.key} className="grid grid-cols-[2fr_2fr_110px_130px_130px_44px] gap-2">
                      <ItemSearchSelect
                        valueId={row.itemId}
                        valueLabel={row.itemLabel}
                        valueSubLabel={row.itemSku ? `SKU: ${row.itemSku}` : undefined}
                        onChange={(id, option) => {
                          const meta = id != null ? itemMetaRef.current.get(id) : undefined;
                          updateEditRow(row.key, {
                            itemId: id,
                            itemLabel: option?.label ?? meta?.name ?? "",
                            itemSku: meta?.sku,
                            description: option?.label ?? meta?.name ?? "",
                            saleTaxRate: meta?.taxRate ?? row.saleTaxRate ?? "0.000",
                            unitPrice: meta?.price ?? row.unitPrice ?? "0.00",
                            customizations: [],
                          });
                          if (id != null) void ensureItemMeta(id);
                        }}
                        loadOptions={loadItemOptions}
                        placeholder="Find item..."
                      />

                      <div className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-2 text-left text-xs">
                        {!row.itemId ? (
                          <span className="text-kk-dark-text-muted">Select an item first</span>
                        ) : !itemMetaRef.current.get(row.itemId)?.customizationsLoaded ? (
                          <span className="text-kk-dark-text-muted">Loading customizations...</span>
                        ) : rowCustomizationOptions(row).length === 0 ? (
                          <span className="text-kk-dark-text-muted">Not customizable</span>
                        ) : (
                          <div className="max-h-28 space-y-1 overflow-auto pr-1">
                            {rowCustomizationOptions(row).map((opt) => {
                              const selected = row.customizations.find((sel) => sel.customizationId === opt.id);
                              const minQty = parseMinQty(opt);
                              return (
                                <div key={opt.id} className="grid grid-cols-[16px_1fr_70px] items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={!!selected}
                                    onChange={(e) => {
                                      if (!e.target.checked) {
                                        updateEditCustomization(row.key, opt.id, null);
                                        return;
                                      }
                                      updateEditCustomization(row.key, opt.id, String(minQty));
                                    }}
                                  />
                                  <div className="min-w-0">
                                    <p className="truncate text-left">{opt.label || `Customization #${opt.id}`}</p>
                                    <p className="text-[10px] text-kk-dark-text-muted">{formatCustomizationDelta(opt)}</p>
                                  </div>
                                  <input
                                    type="number"
                                    min={String(minQty)}
                                    step={opt.stepQty || "1"}
                                    max={opt.maxQty || undefined}
                                    value={selected?.quantity ?? ""}
                                    disabled={!selected}
                                    onChange={(e) => {
                                      updateEditCustomization(
                                        row.key,
                                        opt.id,
                                        e.target.value === "" ? String(minQty) : e.target.value
                                      );
                                    }}
                                    className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-2 py-1 text-left text-xs disabled:opacity-50"
                                    title="Customization qty"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={row.quantity}
                        onChange={(e) => updateEditRow(row.key, { quantity: e.target.value })}
                        className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-sm"
                        placeholder="Qty"
                      />

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.unitPrice}
                        onChange={(e) => updateEditRow(row.key, { unitPrice: e.target.value })}
                        className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-left text-sm"
                        placeholder="Rate"
                      />

                      <div
                        className="rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 text-left text-sm text-kk-dark-text-muted"
                        title="Calculated tax (read-only)"
                      >
                        {formatMoneyNGN(computeRowTax(row))}
                      </div>

                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border border-kk-dark-input-border hover:bg-kk-dark-hover disabled:opacity-50"
                        disabled={editItems.length <= 1}
                        onClick={() => removeEditRow(row.key)}
                        title="Remove row"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {editError ? <p className="text-xs font-medium text-red-500">{editError}</p> : null}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-kk-dark-border px-5 py-4">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-md border border-kk-dark-input-border px-3 py-2 text-sm hover:bg-kk-dark-hover"
                disabled={editSaving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitEdit}
                className="rounded-md bg-kk-accent px-3 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-70"
                disabled={editSaving}
              >
                {editSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <CustomerCreateModal
        open={showCreateCustomerModal}
        onClose={() => setShowCreateCustomerModal(false)}
        onCreated={(customer) => {
          setShowCreateCustomerModal(false);
          if (editOpen) {
            setEditPortalCustomer(customer);
            setEditError(null);
            return;
          }
          setCreatePortalCustomer(customer);
          setCreateError(null);
        }}
      />
      {toastMessage ? (
        <ToastModal message={toastMessage} variant={toastVariant} onClose={() => setToastMessage(null)} />
      ) : null}
    </div>
  );
};
