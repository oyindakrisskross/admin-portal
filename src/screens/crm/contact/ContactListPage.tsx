// src/screens/crm/contact/ContactListPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Search, TrashIcon, Users } from "lucide-react";

import { useAuth } from "../../../auth/AuthContext";
import type { Contact } from "../../../types/contact";
import SidePeek from "../../../components/layout/SidePeek";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import { ContactPeek } from "./ContactPeek";
import { fetchContacts } from "../../../api/contact";
import { FilterBar } from "../../../components/filter/FilterBar";
import type { FilterSet, ColumnMeta } from "../../../types/filters";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export const ContactListPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const hasId = Boolean(id);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterSet>({ clauses: [] });
  const [sort, setSort] = useState<SortState<"name" | "company" | "email" | "phone"> | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const filterColumns: ColumnMeta[] = [
    { id: "first_name", label: "First Name", type: "text" },
    { id: "last_name", label: "Last Name", type: "text" },
    { id: "email", label: "Email", type: "text" },
    { id: "phone", label: "Phone", type: "text" },
  ];

  const hasPeek = !!selectedId;

  const openPeek = (contact: Contact) => {
    setSelectedId(contact.id!);
  };

  const closePeek = () => {
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
        const data = await fetchContacts({
          filters,
          search: debouncedSearch || undefined,
          page,
          page_size: pageSize,
        });
        if (!cancelled) {
          setContacts(data.results ?? []);
          setTotalCount(Number(data.count ?? 0));
        }
      } catch {
        if (!cancelled) {
          setContacts([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters, debouncedSearch, page, pageSize]);

  useEffect(() => {
    if (!hasId || !contacts.length) return;

    const contactId = Number(id);
    const match = contacts.find((c) => c.id === contactId);

    if (match) {
      setSelectedId(match.id!);
    }
  }, [hasId, id, contacts]);

  const sortedContacts = useMemo(() => {
    return sortBy(contacts, sort, {
      name: (c) => `${c.last_name ?? ""} ${c.first_name ?? ""}`,
      company: (c) => c.company_name ?? "",
      email: (c) => c.email ?? "",
      phone: (c) => `${c.phone_1_code_code ?? ""}${c.phone_1 ?? ""}`,
    });
  }, [contacts, sort]);

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
          icon={<Users className="h-5 w-5" />}
          section="CRM"
          title="Contacts"
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
                <FilterBar
                  columns={filterColumns}
                  filters={filters}
                  showPills={false}
                  onChange={(next) => {
                    setFilters(next);
                    setPage(1);
                  }}
                />
                {can("Contacts", "create") && (
                  <button
                    onClick={() => navigate("/crm/contacts/new")}
                    className="new inline-flex items-center gap-1 rounded-full"
                  >
                    <Plus className="h-3 w-3" />
                    New
                  </button>
                )}
              </div>
            ) : (
              ""
            )
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

        {paginationControls}

        <div className={hasPeek ? "flex-1 overflow-y-auto" : "overflow-hidden"}>
          <table className="min-w-full">
            <thead>
              <tr>
                <th
                  className="cursor-pointer select-none"
                  onClick={() => setSort((s) => nextSort(s, "name"))}
                >
                  Name{sortIndicator(sort, "name")}
                </th>
                {!hasPeek && (
                  <>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "company"))}
                    >
                      Company Name{sortIndicator(sort, "company")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "email"))}
                    >
                      Email{sortIndicator(sort, "email")}
                    </th>
                    <th
                      className="cursor-pointer select-none"
                      onClick={() => setSort((s) => nextSort(s, "phone"))}
                    >
                      Phone{sortIndicator(sort, "phone")}
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {sortedContacts.map((c) => (
                <tr key={c.id} className="cursor-pointer" onClick={() => openPeek(c)}>
                  <td>
                    <p>
                      {c.first_name} {c.last_name}
                    </p>
                  </td>
                  {!hasPeek && (
                    <>
                      <td>{c.company_name}</td>
                      <td>{c.email}</td>
                      <td>
                        {c.phone_1_code_code}
                        {c.phone_1}
                      </td>
                    </>
                  )}
                </tr>
              ))}

              {loading && (
                <tr>
                  <td
                    colSpan={hasPeek ? 1 : 4}
                    className="px-3 py-6 text-center text-xs text-kk-dark-text-muted"
                  >
                    Loading contacts...
                  </td>
                </tr>
              )}

              {!loading && !contacts.length && (
                <tr>
                  <td
                    colSpan={hasPeek ? 1 : 4}
                    className="px-3 py-10 text-center text-xs text-kk-dark-text-muted"
                  >
                    No contacts yet. Click "New" to create your first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {paginationControls}
      </div>
      {selectedId && (
        <SidePeek
          isOpen={hasPeek}
          onClose={closePeek}
          widthClass="w-3/4"
          actions={
            <div className="flex items-center gap-1">
              {can("Contacts", "edit") && (
                <button onClick={() => navigate(`/crm/contacts/${selectedId}/edit`)}>
                  <span className="tooltip-b">Edit</span>
                  <PencilSquareIcon className="h-5 w-5 text-kk-muted" />
                </button>
              )}
              {can("Contacts", "delete") && (
                <button>
                  <span className="tooltip-b">Delete</span>
                  <TrashIcon className="h-5 w-5 text-red-500" />
                </button>
              )}
            </div>
          }
        >
          <ContactPeek contactId={selectedId} />
        </SidePeek>
      )}
    </div>
  );
};
