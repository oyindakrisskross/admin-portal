// src/screens/crm/user/UserListPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Search, TrashIcon } from "lucide-react";
import { type UserProfile } from "../../../types/accounts";
import SidePeek from "../../../components/layout/SidePeek";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import { fetchUsers } from "../../../api/accounts";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { UserPeek } from "./UserPeek";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export const UserListPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const hasId = Boolean(id);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sort, setSort] = useState<SortState<"details" | "portal" | "role" | "status"> | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

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
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const data = await fetchUsers({
          search: debouncedSearch || undefined,
          page,
          page_size: pageSize,
        });
        if (!cancelled) {
          setUsers(data.results ?? []);
          setTotalCount(Number(data.count ?? 0));
        }
      } catch {
        if (!cancelled) {
          setUsers([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, page, pageSize]);

  useEffect(() => {
    if (!hasId || !users.length) return;

    const userId = Number(id);
    const match = users.find((c) => c.id === userId);

    if (match) {
      setSelectedUser(match);
      setSelectedId(match.id!);
    }
  }, [hasId, id, users]);

  const sortedUsers = useMemo(() => {
    return sortBy(users, sort, {
      details: (u) => `${u.contact_last_name ?? ""} ${u.contact_first_name ?? ""} ${u.email ?? ""}`,
      portal: (u) => u.portal_name ?? "",
      role: (u) => u.role_name ?? "",
      status: (u) => u.status ?? "",
    });
  }, [users, sort]);

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
      <div
        className={`flex flex-col gap-4 ${!hasPeek ? "w-full" : "w-1/4"} ${
          hasPeek ? "h-screen overflow-hidden" : ""
        }`}
      >
        <ListPageHeader
          section="CRM"
          title="Portal Users"
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
                    placeholder="Search name or email"
                  />
                </div>
                <button
                  onClick={() => navigate("/crm/users/new")}
                  className="new inline-flex items-center gap-1 rounded-full"
                >
                  <Plus className="h-3 w-3" />
                  New
                </button>
              </div>
            ) : (
              ""
            )
          }
        />

        {paginationControls}

        <div className={hasPeek ? "flex-1 overflow-y-auto" : "overflow-hidden"}>
          <table className="min-w-full">
            <thead>
              <tr>
                <th
                  className="cursor-pointer select-none"
                  onClick={() => setSort((s) => nextSort(s, "details"))}
                >
                  User Details{sortIndicator(sort, "details")}
                </th>
                <th
                  className="cursor-pointer select-none"
                  onClick={() => setSort((s) => nextSort(s, "portal"))}
                >
                  Portal{sortIndicator(sort, "portal")}
                </th>
                {!hasPeek && (
                  <>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "role"))}
                    >
                      Role{sortIndicator(sort, "role")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "status"))}
                    >
                      Status{sortIndicator(sort, "status")}
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u) => (
                <tr key={u.id} className="cursor-pointer" onClick={() => openPeek(u)}>
                  <td>
                    <div className="flex flex-col gap-2">
                      <b>
                        {u.contact_first_name} {u.contact_last_name}
                      </b>
                      <p>{u.email}</p>
                    </div>
                  </td>
                  <td>{u.portal_name}</td>
                  {!hasPeek && (
                    <>
                      <td>{u.role_name}</td>
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
                  )}
                </tr>
              ))}

              {loading && (
                <tr>
                  <td
                    colSpan={hasPeek ? 2 : 4}
                    className="px-3 py-6 text-center text-xs text-kk-dark-text-muted"
                  >
                    Loading users...
                  </td>
                </tr>
              )}

              {!loading && !users.length && (
                <tr>
                  <td
                    colSpan={hasPeek ? 2 : 4}
                    className="px-3 py-10 text-center text-xs text-kk-dark-text-muted"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {paginationControls}
      </div>
      {selectedUser && (
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
