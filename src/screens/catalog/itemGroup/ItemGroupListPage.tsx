// src/screens/catalog/ItemGroupListPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus } from "lucide-react";

import type { ItemGroup, ItemStatus } from "../../../types/catalog";
import { useAuth } from "../../../auth/AuthContext";

import SidePeek from "../../../components/layout/SidePeek";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import { fetchItemGroups, patchItemGroup, deleteItemGroup } from "../../../api/catalog";
import { ItemGroupPeek } from "./ItemGroupPeek";
import ToastModal from "../../../components/ui/ToastModal";

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVariant, setToastVariant] = useState<"error" | "success" | "info">("error");

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
    { id: "min_price", label: "Min price", type: "number" },
    { id: "max_price", label: "Max price", type: "number" },
    { id: "created_on", label: "Created date", type: "date" },
  ];

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
    (async () => {
      const data = await fetchItemGroups();
      setGroups(data.results);
    })();
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
      const data = await fetchItemGroups({ filters });
      if (!cancelled) {
        setGroups(data.results);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  const sortedGroups = useMemo(() => {
    return sortBy(groups, sort, {
      name: (g) => g.name,
      stock: (g) => g.stock_on_hand ?? "",
      price: (g) => g.min_price ?? g.max_price ?? "",
      status: (g) => g.status ?? "",
      created: (g) => (g.created_on ? new Date(g.created_on) : null),
    });
  }, [groups, sort]);


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
          } />

        {/* Table */}
        <div className={hasPeek ? "flex-1 overflow-y-auto" : "overflow-hidden"}>
          <table className="min-w-full table-auto">
            <thead>
              <tr>
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
                  className="cursor-pointer"
                  onClick={() => openGroup(g!)}
                >
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
                      {g.stock_on_hand ?? "—"}
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
                        —
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

              {!groups.length && (
                <tr>
                  <td
                    colSpan={hasPeek ? 2 : 6}
                    className="px-3 py-10 text-center text-xs text-kk-dark-text-muted"
                  >
                    No item groups yet. Click “New” to create your
                    first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
    </div>
  );
};
