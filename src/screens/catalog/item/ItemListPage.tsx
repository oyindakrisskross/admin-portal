// src/screens/catalog/ItemListPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Sparkles } from "lucide-react";

import type { Category, Item, ItemCategory, ItemStatus } from "../../../types/catalog";
import { useAuth } from "../../../auth/AuthContext";

import SidePeek from "../../../components/layout/SidePeek";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import { bulkItems, deleteItem, fetchItems, patchItem } from "../../../api/catalog";
import { ItemPeek } from "./ItemPeek";
import placeholder from "../../../assets/placeholder.png";
import ToastModal from "../../../components/ui/ToastModal";
import { BulkActionBar } from "../../../components/catalog/bulk/BulkActionBar";
import { RowSelectCheckbox } from "../../../components/catalog/bulk/RowSelectCheckbox";
import { BulkEditAvailabilityModal } from "../../../components/catalog/bulk/BulkEditAvailabilityModal";
import { BulkEditCategoriesModal } from "../../../components/catalog/bulk/BulkEditCategoriesModal";

import { FilterBar } from "../../../components/filter/FilterBar";
import type { FilterSet, ColumnMeta } from "../../../types/filters";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";

import { 
  ArrowsUpDownIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowUpTrayIcon,
  HashtagIcon,
  BanknotesIcon,
  BoldIcon,
  TagIcon,
  BoltIcon,
  PencilSquareIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
} from "@heroicons/react/24/outline";


export const ItemListPage: React.FC = () => {
  const { can } = useAuth();

  const navigate = useNavigate();
  const { id } = useParams();
  const hasId = Boolean(id);

  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterSet>({ clauses: [] });
  const [sort, setSort] = useState<SortState<"name" | "sku" | "price" | "stock" | "status" | "categories"> | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("error");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);

  const filterColumns: ColumnMeta[] = [
    { id: "name", label: "Name", type: "text" },
    { id: "type_id", label: "Type", type: "choice", choices: [
        { value: "GOOD", label: "Good" },
        { value: "SERVICE", label: "Service" },
      ]
    },
    { id: "status", label: "Status", type: "choice", choices: [
        { value: "ACTIVE", label: "Active" },
        { value: "INACTIVE", label: "Inactive" },
      ]
    },
    { id: "price", label: "Price", type: "number" },
    { id: "created_on", label: "Created date", type: "date" },
  ];

  const hasPeek = !!selectedId;
  const openPeek = (item: Item) => {
    setSelectedItem(item);
    setSelectedId(item.id!);
  }
  const closePeek = () => {
    setSelectedItem(null);
    setSelectedId(null);
  }

  const extractApiDetail = (err: any, fallback: string) => {
    const data = err?.response?.data;
    if (typeof data === "string") return data;
    if (data?.detail) return String(data.detail);
    return fallback;
  };

  const showToast = (message: string, variant: "error" | "success" | "info" = "error") => {
    setToastVariant(variant);
    setToastMessage(message);
  };

  const toggleSelected = (id: number, checked?: boolean) => {
    setSelectedIds((prev) => {
      const set = new Set(prev);
      const nextChecked = checked ?? !set.has(id);
      if (nextChecked) set.add(id);
      else set.delete(id);
      return Array.from(set);
    });
  };

  const clearSelection = () => setSelectedIds([]);

  const handleStatusChg = async () => {
      if (!selectedItem || !selectedId) return;
  
      let status: ItemStatus;
  
      if (selectedItem?.status === "ACTIVE") status = "INACTIVE";
      if (selectedItem?.status === "INACTIVE") status = "ACTIVE";
  
      try {
        const payload: any = {
          status: status,
        };
        await patchItem(selectedId!, payload);
        
        setSelectedItem(i => i ? { ...i, status } : i);
        setItems(is => is.map(i => i.id === selectedId ? { ...i, status } : i));
  
  
      } finally { /* empty */ }
    }

  const handleDelete = async () => {
    if (!selectedId) return;

    try {
      await deleteItem(selectedId);
      setItems((prev) => prev.filter((i) => i.id !== selectedId));
      closePeek();
      showToast("Item deleted.", "success");
    } catch (err: any) {
      showToast(
        extractApiDetail(
          err,
          "Unable to delete item. If it has been used in a transaction, deactivate it instead."
        )
      );
    }
  };
  

  useEffect(() => {
    if (!hasId || !items.length) return;

    const itemId = Number(id);
    const match = items.find(i => i.id === itemId);

    if (match) {
      (async () => {
        setSelectedItem(match);
        setSelectedId(match.id!);
      })();
    }
  }, [hasId, id, items])

  useEffect(() => {
    (async () => {
      const data = await fetchItems();
      setItems(data.results);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await fetchItems({ filters });
      if (!cancelled) {
        setItems(data.results);
        const visible = new Set((data.results ?? []).map((r: any) => Number(r.id)).filter(Number.isFinite));
        setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  const sortedItems = useMemo(() => {
    return sortBy(items, sort, {
      name: (i) => i.name,
      sku: (i) => i.sku ?? "",
      price: (i) => i.price ?? "",
      stock: (i) => (i.inventory_tracking ? (i.stock_on_hand ?? "") : ""),
      status: (i) => i.status ?? "",
      categories: (i) => (i.categories ?? []).map((c) => c.category_name ?? "").join(", "),
    });
  }, [items, sort]);

  return (
    <div className="flex-1 flex gap-4">
      <div className={`flex flex-col gap-4 ${!hasPeek ? "w-full" : "w-1/4"} ${
        hasPeek ? "h-screen overflow-hidden" : ""}`}>
        {/* Header */}
        <ListPageHeader
          icon= {<span className="text-lg">🛒</span>}
          section= "Catalog"
          title= "Items"
          subtitle= "Manage all products."
          right= {!hasPeek ? (<div className="flex items-center gap-1 text-xs">
            <FilterBar 
              columns={filterColumns}
              filters={filters}
              onChange={setFilters}
            />
            {/* <button>
              <span className="tooltip-t">Sort</span>
              <ArrowsUpDownIcon className="h-4 w-4 text-kk-muted"/>
            </button>
            <button>
              <span className="tooltip-t">Search</span>
              <MagnifyingGlassIcon className="h-4 w-4 text-kk-muted"/>
            </button>
            <button>
              <span className="tooltip-t text-nowrap w-fit">Edit view layout, grouping, and more...</span>
              <AdjustmentsHorizontalIcon className="h-4 w-4 text-kk-muted"/>
            </button>
            <button>
              <span className="tooltip-t">Export</span>
              <ArrowUpTrayIcon className="h-4 w-4 text-kk-muted"/>
            </button> */}
            {can("Item", "create") && (
              <button
                onClick={() => navigate("/catalog/items/new")} 
                className="new inline-flex items-center gap-1 rounded-full"
              >
                <Plus className="h-3 w-3" />
                New
              </button>
            )}
          </div> ) : ""} 
        />

        {!hasPeek && selectedIds.length > 0 && (
          <BulkActionBar
            count={selectedIds.length}
            onClear={clearSelection}
            actions={[
              {
                key: "delete",
                label: "Delete",
                icon: <TrashIcon className="h-4 w-4" />,
                disabled: bulkBusy || !can("Item", "delete"),
                onClick: async () => {
                  setBulkBusy(true);
                  try {
                    const res = await bulkItems({ ids: selectedIds, action: "delete" });
                    const okSet = new Set(res.ok_ids ?? []);
                    const failedIds = (res.failed ?? []).map((f) => Number(f.id)).filter(Number.isFinite);

                    if (okSet.size) {
                      setItems((prev) => prev.filter((it) => !okSet.has(Number(it.id))));
                      showToast(`Deleted ${okSet.size} item(s).`, "success");
                    }

                    if (failedIds.length) {
                      showToast(
                        "Some items were not deleted since they have recorded transactions. Deactivate them instead.",
                        "error"
                      );
                      setSelectedIds(failedIds);
                    } else {
                      clearSelection();
                    }
                  } catch (e: any) {
                    showToast(e?.message ?? "Bulk delete failed.");
                  } finally {
                    setBulkBusy(false);
                  }
                },
              },
              {
                key: "inactive",
                label: "Make inactive",
                icon: <PauseIcon className="h-4 w-4" />,
                disabled: bulkBusy || !can("Item", "edit"),
                onClick: async () => {
                  setBulkBusy(true);
                  try {
                    const res = await bulkItems({ ids: selectedIds, action: "make_inactive" });
                    const okSet = new Set(res.ok_ids ?? []);
                    setItems((prev) =>
                      prev.map((it) => (okSet.has(Number(it.id)) ? { ...it, status: "INACTIVE" } : it))
                    );
                    showToast("Updated item statuses.", "success");
                  } catch (e: any) {
                    showToast(e?.message ?? "Bulk update failed.");
                  } finally {
                    setBulkBusy(false);
                  }
                },
              },
              {
                key: "active",
                label: "Make active",
                icon: <PlayIcon className="h-4 w-4" />,
                disabled: bulkBusy || !can("Item", "edit"),
                onClick: async () => {
                  setBulkBusy(true);
                  try {
                    const res = await bulkItems({ ids: selectedIds, action: "make_active" });
                    const okSet = new Set(res.ok_ids ?? []);
                    setItems((prev) =>
                      prev.map((it) => (okSet.has(Number(it.id)) ? { ...it, status: "ACTIVE" } : it))
                    );
                    showToast("Updated item statuses.", "success");
                  } catch (e: any) {
                    showToast(e?.message ?? "Bulk update failed.");
                  } finally {
                    setBulkBusy(false);
                  }
                },
              },
              {
                key: "availability",
                label: "Edit availability",
                icon: <BoltIcon className="h-4 w-4" />,
                disabled: bulkBusy || !can("Item", "edit"),
                onClick: () => setAvailabilityModalOpen(true),
              },
              {
                key: "categories",
                label: "Edit categories",
                icon: <TagIcon className="h-4 w-4" />,
                disabled: bulkBusy || !can("Category", "edit"),
                onClick: () => setCategoriesModalOpen(true),
              },
            ]}
          />
        )}

        {/* Table */}
        <div className={hasPeek ? "flex-1 overflow-y-auto" : "overflow-hidden"}>
          <table className="min-w-full">
            <thead>
              <tr>
                {!hasPeek && <th className="w-10" />}
                <th
                  className="cursor-pointer select-none"
                  onClick={() => setSort((s) => nextSort(s, "name"))}
                >
                  <BoldIcon className="table-icon" />
                  Name{sortIndicator(sort, "name")}
                </th>
                {!hasPeek &&
                  <th
                    className="cursor-pointer select-none"
                    onClick={() => setSort((s) => nextSort(s, "sku"))}
                  >
                    <BoldIcon className="table-icon" />
                    SKU{sortIndicator(sort, "sku")}
                  </th>
                }
                <th
                  className="cursor-pointer select-none"
                  onClick={() => setSort((s) => nextSort(s, "price"))}
                >
                  <BanknotesIcon className="table-icon" />
                  Price{sortIndicator(sort, "price")}
                </th>
                {!hasPeek &&
                  <>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "stock"))}
                    >
                      <HashtagIcon className="table-icon" />
                      Stock On Hand{sortIndicator(sort, "stock")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "status"))}
                    >
                      <BoltIcon className="table-icon" />
                      Status{sortIndicator(sort, "status")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "categories"))}
                    >
                      <TagIcon className="table-icon" />
                      Categories{sortIndicator(sort, "categories")}
                    </th>
                  </>
                }
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((i) => (
                <tr
                  key={i.id}
                  className={[
                    "cursor-pointer group",
                    !hasPeek && selectedIdSet.has(Number(i.id)) ? "bg-blue-600/10" : "",
                  ].join(" ")}
                  onClick={() => {
                    if (!hasPeek && selectedIds.length) {
                      toggleSelected(i.id!, !selectedIdSet.has(i.id!));
                      return;
                    }
                    openPeek(i);
                  }}
                >
                  {!hasPeek && (
                    <td className="w-10 px-2">
                      <div className={selectedIdSet.has(i.id!) ? "" : "opacity-0 group-hover:opacity-100"}>
                        <RowSelectCheckbox
                          checked={selectedIdSet.has(i.id!)}
                          onChange={(checked) => toggleSelected(i.id!, checked)}
                        />
                      </div>
                    </td>
                  )}
                  <td>
                    <div className="flex items-center gap-2">
                      {/* Item Image */}
                      {!hasPeek &&
                        <span>
                          {i.primary_image ? (
                            <img
                              src={i.primary_image}
                              alt={i.name}
                              className="h-7 w-7 object-cover"
                            />
                          ) : (
                            <img
                              src={placeholder}
                              alt={i.name}
                              className="h-7 w-7 object-cover"
                            />
                          )}
                        </span>
                      }

                      {/* Name & Description */}
                      <div className="flex flex-col">
                        <span>{i.name}</span>
                        {i.description && (
                          <span className="line-clamp-1 text-[11px] text-kk-dark-text-muted">
                            {i.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  {!hasPeek &&
                    <td>
                      {/* SKU */}
                      {i.sku ?? "—"}
                    </td>
                  }
                  <td>
                    {/* Price */}
                    NGN{Intl.NumberFormat('en-US',{
                      style: 'decimal',
                      maximumFractionDigits: 2,
                      minimumFractionDigits: 2,
                    }).format(+i.price)}
                  </td>
                  {!hasPeek &&
                    <>
                      <td>
                        {/* Stock on Hand */}
                        {i.inventory_tracking ? (i.stock_on_hand ?? "0") : "-"}
                      </td>
                      <td>
                        {/* Status */}
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                            i.status === "ACTIVE"
                              ? "bg-emerald-700 text-emerald-100"
                              : "bg-slate-400 text-slate-50"
                          }`}
                        >
                          {i.status ?? "—"}
                        </span>
                      </td>
                      <td className="flex gap-2">
                        {/* Categories */}
                        { i.categories?.map((ic) => (
                          <span className="inline-flex rounded-full px-2 py-1 text-[11px] font-medium bg-purple-400 text-purple-950">
                            {ic.category_name}
                          </span>
                        ))}
                      </td>
                    </>
                  }
                </tr>
              ))}

              {!items.length && (
                <tr>
                  <td
                    colSpan={hasPeek ? 6 : 7}
                    className="px-3 py-10 text-center text-xs text-kk-dark-text-muted"
                  >
                    No items yet. Click “New" to create your first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      { selectedItem && (
        <SidePeek
          isOpen={hasPeek}
          onClose={closePeek}
          widthClass="w-3/4"
          actions={
            <div className="flex items-center gap-1">
              {can("Item", "edit") &&(
                <>
                  <button>
                    {selectedItem?.status === "ACTIVE" ? (
                      <div onClick={handleStatusChg}>
                        <span className="tooltip-b">Deactivate</span>
                        <PauseIcon className="h-5 w-5 text-kk-muted" />
                      </div>
                    ) : (
                      <div onClick={handleStatusChg}>
                        <span className="tooltip-b">Activate</span>
                        <PlayIcon className="h-5 w-5 text-kk-muted" />
                      </div>
                    )}
                  </button>
                  <button onClick={() => navigate(`/catalog/items/${selectedId}/edit`)}>
                    <span className="tooltip-b">Edit</span>
                    <PencilSquareIcon className="h-5 w-5 text-kk-muted" />
                  </button>
                </>
              )}
              {selectedItem?.inventory_tracking && can("Inventory Adjustment", "create") && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-kk-dark-hover"
                  onClick={() => navigate(`/catalog/items/${selectedId}/adjust-inventory`, 
                    {state: {itemId: selectedId, itemName: selectedItem.name}})}
                >
                  <Sparkles className="h-3 w-3" />
                  Adjust Inventory
                </button>
              )}
              {can("Item", "delete") && (
                <button onClick={handleDelete}>
                  <span className="tooltip-b">Delete</span>
                  <TrashIcon className="h-5 w-5 text-red-500" />
                </button>
              )}
            </div>
          }
        >
          <ItemPeek item={selectedItem} />
        </SidePeek>
      )}

      <ToastModal
        message={toastMessage}
        onClose={() => setToastMessage(null)}
        variant={toastVariant}
      />

      <BulkEditAvailabilityModal
        open={availabilityModalOpen}
        title="Edit availability"
        onClose={() => setAvailabilityModalOpen(false)}
        onApply={async (locationIds) => {
          setBulkBusy(true);
          try {
            await bulkItems({ ids: selectedIds, action: "set_availability", location_ids: locationIds });
            showToast("Availability updated.", "success");
          } catch (e: any) {
            showToast(e?.message ?? "Failed to update availability.");
          } finally {
            setBulkBusy(false);
          }
        }}
      />

      <BulkEditCategoriesModal
        open={categoriesModalOpen}
        title="Edit categories"
        onClose={() => setCategoriesModalOpen(false)}
        onApply={async (categoryIds, categories) => {
          setBulkBusy(true);
          try {
            await bulkItems({ ids: selectedIds, action: "set_categories", category_ids: categoryIds });
            const nextCatsTemplate: ItemCategory[] = categories.map((c: Category) => ({
              item: 0,
              category: c.id!,
              category_name: c.name,
            })) as any;
            const idSet = new Set(selectedIds);
            setItems((prev) =>
              prev.map((it) =>
                idSet.has(Number(it.id))
                  ? {
                      ...it,
                      categories: nextCatsTemplate.map((ic) => ({ ...ic, item: it.id! } as any)),
                    }
                  : it
              )
            );
            showToast("Categories updated.", "success");
          } catch (e: any) {
            showToast(e?.message ?? "Failed to update categories.");
          } finally {
            setBulkBusy(false);
          }
        }}
      />
    </div>
  );
};
