// src/screens/catalog/ItemListPage.tsx

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Sparkles } from "lucide-react";

import type { Item, ItemStatus } from "../../../types/catalog";
import { useAuth } from "../../../auth/AuthContext";

import SidePeek from "../../../components/layout/SidePeek";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import { deleteItem, fetchItems, patchItem } from "../../../api/catalog";
import { ItemPeek } from "./ItemPeek";
import placeholder from "../../../assets/placeholder.png";

import { FilterBar } from "../../../components/filter/FilterBar";
import type { FilterSet, ColumnMeta } from "../../../types/filters";

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
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters]);


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

        {/* Table */}
        <div className={hasPeek ? "flex-1 overflow-y-auto" : "overflow-hidden"}>
          <table className="min-w-full">
            <thead>
              <tr>
                <th>
                  <BoldIcon className="table-icon" />
                  Name
                </th>
                {!hasPeek &&
                  <th>
                    <BoldIcon className="table-icon" />
                    SKU
                  </th>
                }
                <th>
                  <BanknotesIcon className="table-icon" />
                  Price
                </th>
                {!hasPeek &&
                  <>
                    <th>
                      <HashtagIcon className="table-icon" />
                      Stock On Hand
                    </th>
                    <th>
                      <BoltIcon className="table-icon" />
                      Status
                    </th>
                    <th>
                      <TagIcon className="table-icon" />
                      Categories
                    </th>
                  </>
                }
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr
                  key={i.id}
                  className="cursor-pointer"
                  onClick={() => openPeek(i)}
                >
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
                        {i.stock_on_hand ?? "—"}
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
                    colSpan={6}
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
                <button onClick={() => {deleteItem(selectedId!); navigate(0);}}>
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
    </div>
  );
};