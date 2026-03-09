// src/screens/catalog/ItemGroupListPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Search } from "lucide-react";

import type { ItemGroup, ItemStatus } from "../../../types/catalog";
import { useAuth } from "../../../auth/AuthContext";

import SidePeek from "../../../components/layout/SidePeek";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import { bulkItemGroups, deleteItemGroup, fetchCategories, fetchItemGroups, patchItemGroup } from "../../../api/catalog";
import { ItemGroupPeek } from "./ItemGroupPeek";
import ToastModal from "../../../components/ui/ToastModal";
import { BulkActionBar } from "../../../components/catalog/bulk/BulkActionBar";
import { RowSelectCheckbox } from "../../../components/catalog/bulk/RowSelectCheckbox";
import { BulkEditAvailabilityModal } from "../../../components/catalog/bulk/BulkEditAvailabilityModal";
import { BulkEditCategoriesModal } from "../../../components/catalog/bulk/BulkEditCategoriesModal";
import type { Category } from "../../../types/catalog";

import { FilterBar } from "../../../components/filter/FilterBar";
import type { FilterSet, ColumnMeta } from "../../../types/filters";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";

import { 
  // ArrowsUpDownIcon,
  // MagnifyingGlassIcon,
  // AdjustmentsHorizontalIcon,
  // ArrowUpTrayIcon,
  HashtagIcon,
  BanknotesIcon,
  BoldIcon,
  TagIcon,
  CalendarDaysIcon,
  BoltIcon,
  PencilSquareIcon,
  TrashIcon,
  PlayIcon,
  PauseIcon,
} from "@heroicons/react/24/outline";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export const ItemGroupListPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const hasId = Boolean(id);

  const [groups, setGroups] = useState<ItemGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ItemGroup | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterSet>({ clauses: [] });
  const [sort, setSort] = useState<SortState<"name" | "stock" | "price" | "status" | "created"> | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("error");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [availabilityModalOpen, setAvailabilityModalOpen] = useState(false);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [categoryChoices, setCategoryChoices] = useState<{ value: string; label: string }[]>([]);

  const filterColumns: ColumnMeta[] = useMemo(
    () => [
      { id: "name", label: "Name", type: "text" },
      {
        id: "type_id",
        label: "Type",
        type: "choice",
        choices: [
          { value: "GOOD", label: "Good" },
          { value: "SERVICE", label: "Service" },
        ],
      },
      {
        id: "status",
        label: "Status",
        type: "choice",
        choices: [
          { value: "ACTIVE", label: "Active" },
          { value: "INACTIVE", label: "Inactive" },
        ],
      },
      {
        id: "category_id",
        label: "Categories",
        type: "choice",
        multi: true,
        choices: categoryChoices,
      },
      { id: "min_price", label: "Min price", type: "number" },
      { id: "max_price", label: "Max price", type: "number" },
      { id: "created_on", label: "Created date", type: "date" },
    ],
    [categoryChoices]
  );

  const hasPeek = !!selectedGroup;

  const openGroup = (group: ItemGroup) => {
    setSelectedGroup(group);
    setSelectedId(group.id!);
  }
  const closePeek = () => {
    setSelectedGroup(null);
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
    if (!selectedGroup || !selectedId) return;

    let status: ItemStatus;

    if (selectedGroup?.status === "ACTIVE") status = "INACTIVE";
    if (selectedGroup?.status === "INACTIVE") status = "ACTIVE";

    try {
      const payload: any = {
        status: status,
      };
      await patchItemGroup(selectedId!, payload);
      
      setSelectedGroup(g => g ? { ...g, status } : g);
      setGroups(gs => gs.map(g => g.id === selectedId ? { ...g, status } : g));


    } finally { /* empty */ }
  }

  const handleDelete = async () => {
    if (!selectedId) return;

    try {
      await deleteItemGroup(selectedId);
      setGroups((prev) => prev.filter((g) => g.id !== selectedId));
      closePeek();
      showToast("Item group deleted.", "success");
    } catch (err: any) {
      showToast(
        extractApiDetail(
          err,
          "Unable to delete item group. If any items have been used in a transaction, deactivate the item group instead."
        )
      );
    }
  };

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCategories();
        const rows = Array.isArray(data?.results) ? data.results : [];
        if (cancelled) return;
        setCategoryChoices(
          rows
            .filter((row: any) => row?.id != null)
            .map((row: any) => ({
              value: String(row.id),
              label: String(row.name || `Category #${row.id}`),
            }))
        );
      } catch {
        if (!cancelled) setCategoryChoices([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasId || !groups.length) return;

    const groupId = Number(id);
    const match = groups.find(g => g.id === groupId);

    if (match) {
      (async () => {
        setSelectedGroup(match);
        setSelectedId(match.id!);
      })();
    }
  }, [hasId, id, groups])

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const data = await fetchItemGroups({
          filters,
          search: debouncedSearch || undefined,
          page,
          page_size: pageSize,
        });
        if (!cancelled) {
          setGroups(data.results ?? []);
          setTotalCount(Number(data.count ?? 0));
          const visible = new Set((data.results ?? []).map((r: any) => Number(r.id)).filter(Number.isFinite));
          setSelectedIds((prev) => prev.filter((id) => visible.has(id)));
        }
      } catch {
        if (!cancelled) {
          setGroups([]);
          setTotalCount(0);
          setSelectedIds([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters, debouncedSearch, page, pageSize]);

  const sortedGroups = useMemo(() => {
    return sortBy(groups, sort, {
      name: (g) => g.name,
      stock: (g) => (g.inventory_tracking ? (g.stock_on_hand ?? "") : ""),
      price: (g) => g.min_price ?? g.max_price ?? "",
      status: (g) => g.status ?? "",
      created: (g) => (g.created_on ? new Date(g.created_on) : null),
    });
  }, [groups, sort]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);
  const paginationControls = !hasPeek && (
    <div className="flex items-center justify-between px-3 pb-2 text-xs text-kk-dark-text-muted">
      <div>
        Showing {rangeStart}-{rangeEnd} of {totalCount}
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
          disabled={!canPrev || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous
        </button>
        <button
          type="button"
          className="rounded border border-kk-dark-input-border px-2 py-1 disabled:opacity-50"
          disabled={!canNext || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );


  return (
    <div className="flex-1 flex gap-4">
      <div className={`flex flex-col gap-4 ${!hasPeek ? "w-full" : "w-1/4"} ${
        hasPeek ? "h-screen overflow-hidden" : ""}`}>
        {/* Header */}
        <ListPageHeader
          icon= {<span className="text-lg">🛍️</span>}
          section= "Catalog"
          title= "Item Groups"
          subtitle= "Manage product families and their variants."
          right= {!hasPeek ? (<div className="flex items-center gap-2 text-xs">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-kk-muted" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-56 rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-8 py-1.5 text-xs"
                placeholder="Search group name"
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
            {can("Item","create") && (
              <button
                onClick={() => navigate("/catalog/item-groups/new")} 
                className="new inline-flex items-center gap-1 rounded-full"
              >
                <Plus className="h-3 w-3" />
                New
              </button>
            )}
          </div> ) : ""
          }
          below={!hasPeek ? (
            <FilterBar
              columns={filterColumns}
              filters={filters}
              showTrigger={false}
              onChange={(next) => {
                setFilters(next);
                setPage(1);
              }}
            />
          ) : null}
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
                    const res = await bulkItemGroups({ ids: selectedIds, action: "delete" });
                    const okSet = new Set(res.ok_ids ?? []);
                    const failedIds = (res.failed ?? []).map((f) => Number(f.id)).filter(Number.isFinite);

                    if (okSet.size) {
                      setGroups((prev) => prev.filter((g) => !okSet.has(Number(g.id))));
                      showToast(`Deleted ${okSet.size} item group(s).`, "success");
                    }

                    if (failedIds.length) {
                      showToast(
                        "Some item groups were not deleted since they have recorded transactions. Deactivate them instead.",
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
                    const res = await bulkItemGroups({ ids: selectedIds, action: "make_inactive" });
                    const okSet = new Set(res.ok_ids ?? []);
                    setGroups((prev) =>
                      prev.map((g) => (okSet.has(Number(g.id)) ? { ...g, status: "INACTIVE" } : g))
                    );
                    showToast("Updated item group statuses.", "success");
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
                    const res = await bulkItemGroups({ ids: selectedIds, action: "make_active" });
                    const okSet = new Set(res.ok_ids ?? []);
                    setGroups((prev) =>
                      prev.map((g) => (okSet.has(Number(g.id)) ? { ...g, status: "ACTIVE" } : g))
                    );
                    showToast("Updated item group statuses.", "success");
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

        {paginationControls}

        {/* Table */}
        <div className={hasPeek ? "flex-1 overflow-y-auto" : "overflow-hidden"}>
          <table className="min-w-full table-auto">
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
                    onClick={() => setSort((s) => nextSort(s, "stock"))}
                  >
                    <HashtagIcon className="table-icon" />
                    Stock On Hand{sortIndicator(sort, "stock")}
                  </th>
                }
                <th
                  className="cursor-pointer select-none"
                  onClick={() => setSort((s) => nextSort(s, "price"))}
                >
                  <BanknotesIcon className={`table-icon ${!hasPeek ? "text-left" : "text-right"}`} />
                  Price{sortIndicator(sort, "price")}
                </th>
                {!hasPeek && 
                  <>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "status"))}
                    >
                      <BoltIcon className="table-icon" />
                      Status{sortIndicator(sort, "status")}
                    </th>
                    <th>
                      <TagIcon className="table-icon" />
                      Categories
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "created"))}
                    >
                      <CalendarDaysIcon className="table-icon" />
                      Date Created{sortIndicator(sort, "created")}
                    </th>
                  </>
                }
              </tr>
            </thead>
            <tbody>
              {sortedGroups.map((g) => (
                <tr
                  key={g.id}
                  className={[
                    "cursor-pointer group",
                    !hasPeek && selectedIdSet.has(Number(g.id)) ? "bg-blue-600/10" : "",
                  ].join(" ")}
                  onClick={() => {
                    if (!hasPeek && selectedIds.length) {
                      toggleSelected(g.id!, !selectedIdSet.has(g.id!));
                      return;
                    }
                    openGroup(g!);
                  }}
                >
                  {!hasPeek && (
                    <td className="w-10 px-2">
                      <div className={selectedIdSet.has(g.id!) ? "" : "opacity-0 group-hover:opacity-100"}>
                        <RowSelectCheckbox
                          checked={selectedIdSet.has(g.id!)}
                          onChange={(checked) => toggleSelected(g.id!, checked)}
                        />
                      </div>
                    </td>
                  )}
                  <td>
                    <div className="flex items-center gap-2">
                      {g.image && (
                        <img
                          src={g.image}
                          alt={g.name}
                          className="h-7 w-7 rounded-md object-cover"
                        />
                      )}
                      <div className="flex flex-col">
                        <span>
                          {g.name}
                        </span>
                        {g.description && (
                          <span className="line-clamp-1 text-[11px] text-kk-dark-text-muted">
                            {g.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  {!hasPeek && 
                    <td>
                      {g.inventory_tracking ? (g.stock_on_hand ?? "0") : "-"}
                    </td>
                  }
                  
                  <td>
                    {g.min_price || g.max_price
                      ? g.min_price === g.max_price
                        ? "NGN" + Intl.NumberFormat('en-US', {maximumFractionDigits:2, minimumFractionDigits:2}).format(+g.min_price!)
                        : `NGN${Intl.NumberFormat('en-US', {maximumFractionDigits:2, minimumFractionDigits:2}).format(+g.min_price!)} – 
                            NGN${Intl.NumberFormat('en-US', {maximumFractionDigits:2, minimumFractionDigits:2}).format(+g.max_price!)}`
                      : "—"}
                  </td>
                  {!hasPeek && 
                    <>
                      <td>
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                            g.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {g.status ?? "ACTIVE"}
                        </span>
                      </td>
                      <td>
                        {/* categories later */}
                        {g.categories?.length ? (
                          <span className="line-clamp-2 text-[11px] text-kk-dark-text-muted">
                            {g.categories.map((c) => c.name).join(", ")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {g.created_on
                          ? new Date(g.created_on).toLocaleDateString()
                          : "—"}
                      </td>
                    </>
                  }
                </tr>
              ))}

                            {loading && (
                <tr>
                  <td
                    colSpan={hasPeek ? 2 : 7}
                    className="px-3 py-6 text-center text-xs text-kk-dark-text-muted"
                  >
                    Loading item groups...
                  </td>
                </tr>
              )}

              {!loading && !groups.length && (
                <tr>
                  <td
                    colSpan={hasPeek ? 2 : 7}
                    className="px-3 py-10 text-center text-xs text-kk-dark-text-muted"
                  >
                    No item groups yet. Click "New" to create your first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {paginationControls}
      </div>
      

      { selectedGroup && (
        <SidePeek
          isOpen={hasPeek}
          onClose={closePeek}
          widthClass="w-3/4"
          actions={
            <div className="flex items-center gap-1">
              {can("Item", "edit") && (
                <>
                  <button>
                    {selectedGroup?.status === "ACTIVE" ? (
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
                  <button onClick={() => navigate(`/catalog/item-groups/${selectedId}/edit`)}>
                    <span className="tooltip-b">Edit</span>
                    <PencilSquareIcon className="h-5 w-5 text-kk-muted" />
                  </button>
                </>
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
          <ItemGroupPeek group={selectedGroup} />
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
            await bulkItemGroups({ ids: selectedIds, action: "set_availability", location_ids: locationIds });
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
            await bulkItemGroups({ ids: selectedIds, action: "set_categories", category_ids: categoryIds });
            const idSet = new Set(selectedIds);
            setGroups((prev) =>
              prev.map((g) =>
                idSet.has(Number(g.id))
                  ? {
                      ...g,
                      categories: categories as Category[],
                    }
                  : g
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

