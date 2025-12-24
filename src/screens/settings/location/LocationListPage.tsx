// src/screens/settings/location/LocationListPage.tsx

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus } from "lucide-react";

import { useAuth } from "../../../auth/AuthContext";
import { fetchLocations } from "../../../api/location";
import { type Location, LOC_TYPE_CHOICES} from "../../../types/location";
import { LocationPeek } from "./LocationPeek";

import ListPageHeader from "../../../components/layout/ListPageHeader";
import SidePeek from "../../../components/layout/SidePeek";
import { FilterBar } from "../../../components/filter/FilterBar";
import { type FilterSet, type ColumnMeta } from "../../../types/filters";

import { 
  ArrowsUpDownIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";

export const LocationListPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const hasId = Boolean(id);

  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterSet>({ clauses: [] });

  const filterColumns: ColumnMeta[] = [
    { id: "name", label: "Name", type: "text" },
    { id: "type_id", label: "Type", type: "choice", choices: LOC_TYPE_CHOICES},
  ]

  const hasPeek = !!selectedId;
  const openPeek = (loc: number) => {
    setSelectedId(loc);
  }
  const closePeek = () => {
    setSelectedId(null);
  }

  useEffect(() => {
    (async () => {
      const data = await fetchLocations();
      setLocations(data.results);
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    
    (async () => {
      const data = await fetchLocations({ filters });
      if (!cancelled) {
        setLocations(data.results);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters])

  useEffect(() => {
    if (!hasId || !locations.length) return;

    (async () => {
      setSelectedId(Number(id));
    })();
    
  }, [hasId, id, locations]);

  return (
    <div className="flex-1 flex gap-4">
      <div className={`flex flex-col gap-4 ${!hasPeek ? "w-full" : "w-3/4"}`}>
        {/* Header */}
        <ListPageHeader
          icon= {<span className="text-lg">🏬</span>}
          section= "Business"
          title= "Locations"
          right= {!hasPeek ? (<div className="flex items-center gap-1 text-xs">
            <FilterBar 
              columns={filterColumns}
              filters={filters}
              onChange={setFilters}
            />
            <button>
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
            </button>
            {can("Locations","create") && (
              <button
                className="new inline-flex items-center gap-1 rounded-full"
                onClick={() => navigate("/settings/locations/new")}
              >
                <Plus className="h-3 w-3" />
                New
              </button>
            )}
          </div> ) : ""} 
        />

        {/* Table */}
        <div className="overflow-hidden">
          <table className="min-w-full">
            <thead>
              <tr>
                <th>
                  Name
                </th>
                <th>
                  Type
                </th>
              </tr>
            </thead>
            <tbody>
              {locations.map((l) => (
                <tr 
                  key={l.id}
                  className="cursor-pointer hover:bg-kk-dark-bg-elevated"
                  onClick={() => openPeek(l.id!)}
                >
                  <td>{l.name}</td>
                  <td>{l.type_id}</td>
                </tr>
              ))}

              {!locations.length && (
                <tr>
                  <td 
                    colSpan={2}
                    className="px-3 py-10 text-center text-xs text-kk-dark-text-muted"
                  >
                  No locations yet. Click “New" to create your first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      { selectedId && (
      <SidePeek
        isOpen={hasPeek}
        onClose={closePeek}
        widthClass="w-1/4"
        actions={
          <div className="flex items-center gap-1">
            {can("Locations", "edit") && (
              <button onClick={() => navigate(`/settings/locations/${selectedId}/edit`)}>
                <span className="tooltip-b">Edit</span>
                <PencilSquareIcon className="h-5 w-5 text-kk-muted" />
              </button>
            )}
      
            {can("Locations","delete") && (
              <button>
                <span className="tooltip-b">Delete</span>
                <TrashIcon className="h-5 w-5 text-red-500" />
              </button>
            )}
          </div>
        }
      >
        <LocationPeek locationId={selectedId} />
      </SidePeek>
    )}
    </div>
  );
};