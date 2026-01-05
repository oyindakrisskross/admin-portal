// src/screens/crm/user/UserListPage.tsx

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, TrashIcon } from "lucide-react";
import { type UserProfile } from "../../../types/accounts";
import SidePeek from "../../../components/layout/SidePeek";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import { fetchUsers } from "../../../api/accounts";
import { FilterBar } from "../../../components/filter/FilterBar";
import type { FilterSet, ColumnMeta } from "../../../types/filters";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { UserPeek } from "./UserPeek";

export const UserListPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const hasId = Boolean(id);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterSet>({ clauses: [] });

  const filterColumns: ColumnMeta = [];

  const hasPeek = !!selectedId;
  const openPeek = (user: UserProfile) => {
    setSelectedUser(user);
    setSelectedId(user.id!);
  };

  const closePeek = () => {
    setSelectedUser(null);
    setSelectedId(null);
  };

  useEffect(() => {
    (async () => {
      const data = await fetchUsers();
      setUsers(data.results);
    })();
  },[]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await fetchUsers({ filters });
      if (!cancelled) {
        setUsers(data.results);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  useEffect(() => {
      if (!hasId || !users.length) return;
  
      const userId = Number(id);
      const match = users.find(c => c.id === userId);
  
      if (match) {
        (async () => {
          setSelectedUser(match);
          setSelectedId(match.id!);
        })();
      }
    }, [hasId, id, users])


  return (
    <div className="flex-1 flex gap-4">
      <div className={`flex flex-col gap-4 ${!hasPeek ? "w-full" : "w-1/4"} ${
        hasPeek ? "h-screen overflow-hidden" : ""}`}>
        <ListPageHeader 
          section="CRM"
          title="Portal Users"
          right={
            !hasPeek ? (
              <div className="flex items-center gap-1 text-xs">
                {/* <FilterBar 
                  columns={filterColumns}
                  filters={filters}
                  onChange={setFilters}
                /> */}
                <button
                  onClick={() => navigate("/crm/users/new")} 
                  className="new inline-flex items-center gap-1 rounded-full"
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
              </div>
            ) : ""
          }
        />

        {/* Table */}
        <div className={hasPeek ? "flex-1 overflow-y-auto" : "overflow-hidden"}>
          <table className="min-w-full">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Portal</th>
                {!hasPeek &&
                  <>
                    <th>Role</th>
                    <th>Status</th>
                  </>
                }
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="cursor-pointer"
                  onClick={() => openPeek(u)}
                >
                  <td>
                    <div className="flex flex-col gap-2">
                      <b>{u.contact_first_name} {u.contact_last_name}</b>
                      <p>{u.email}</p>
                    </div>
                  </td>
                  <td> {u.portal_name} </td>
                  {!hasPeek && 
                    <>
                      <td> {u.role_name} </td>
                      <td> 
                        <span
                          className={`inline-flex rounded-full px-2 py-1 text-[11px] font-medium ${
                            u.status === "ACTIVE"
                              ? "bg-emerald-700 text-emerald-100"
                              : "bg-slate-400 text-slate-50"
                          }`}
                        >
                          {u.status}
                        </span>
                      </td>
                    </>
                  }
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      { selectedUser && (
        <SidePeek
          isOpen={hasPeek}
          onClose={closePeek}
          widthClass="w-3/4"
          actions={
            <div className="flex items-center gap-1">
              <button onClick={() => navigate(`/crm/users/${selectedId}/edit`)}>
                <span className="tooltip-b">Edit</span>
                <PencilSquareIcon className="h-5 w-5 text-kk-muted" />
              </button>
              <button>
                <span className="tooltip-b">Delete</span>
                <TrashIcon className="h-5 w-5 text-red-500" />
              </button>
            </div>
          }
        >
          <UserPeek user={selectedUser} />
        </SidePeek>
      )}
    </div>
  );
};