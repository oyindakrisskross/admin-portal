import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, Users } from "lucide-react";

import ListPageHeader from "../../../components/layout/ListPageHeader";
import SidePeek from "../../../components/layout/SidePeek";
import { fetchCustomers } from "../../../api/customerPortal";
import type { CustomerRecord } from "../../../types/customerPortal";
import { nextSort, sortBy, sortIndicator, type SortState } from "../../../utils/sort";
import { useAuth } from "../../../auth/AuthContext";
import { CustomerCreateModal } from "../../../components/crm/CustomerCreateModal";
import { CustomerPeek } from "./CustomerPeek";

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const statusBadge = (active: boolean) =>
  active ? (
    <span className="inline-flex rounded-full px-2 py-1 text-[11px] font-medium bg-emerald-700 text-emerald-100">
      ACTIVE
    </span>
  ) : (
    <span className="inline-flex rounded-full px-2 py-1 text-[11px] font-medium bg-slate-500 text-slate-100">
      INACTIVE
    </span>
  );

export const CustomerListPage: React.FC = () => {
  const { can } = useAuth();
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<
    SortState<"name" | "email" | "phone" | "status" | "minors" | "created"> | null
  >(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const hasPeek = Boolean(selectedCustomer);

  const loadCustomers = async (params: { search?: string; page: number; page_size: number }) => {
    const data = await fetchCustomers({
      search: params.search,
      page: params.page,
      page_size: params.page_size,
    });
    setCustomers(data.results ?? []);
    setTotalCount(Number(data.count ?? 0));
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
        const data = await fetchCustomers({
          search: debouncedSearch || undefined,
          page,
          page_size: pageSize,
        });
        if (cancelled) return;
        setCustomers(data.results ?? []);
        setTotalCount(Number(data.count ?? 0));
      } catch {
        if (cancelled) return;
        setCustomers([]);
        setTotalCount(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, page, pageSize]);

  const sortedCustomers = useMemo(() => {
    return sortBy(customers, sort, {
      name: (customer) => `${customer.last_name ?? ""} ${customer.first_name ?? ""}`,
      email: (customer) => customer.email ?? "",
      phone: (customer) => customer.phone ?? "",
      status: (customer) => (customer.is_active ? "ACTIVE" : "INACTIVE"),
      minors: (customer) => Number(customer.minors_count ?? 0),
      created: (customer) => new Date(customer.created_at),
    });
  }, [customers, sort]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = totalCount === 0 ? 0 : Math.min(page * pageSize, totalCount);
  const paginationControls = !hasPeek ? (
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
  ) : null;

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
          title="Customers"
          subtitle="Customer portal accounts."
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
                    placeholder="Search customer"
                  />
                </div>
                {can("Contacts", "create") ? (
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(true)}
                    className="new inline-flex items-center gap-1 rounded-full"
                  >
                    <Plus className="h-3 w-3" />
                    New Customer
                  </button>
                ) : null}
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
                <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "name"))}>
                  {!hasPeek ? "Name" : "Customer"}
                  {sortIndicator(sort, "name")}
                </th>
                {!hasPeek ? (
                  <>
                    <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "email"))}>
                      Email{sortIndicator(sort, "email")}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "phone"))}>
                      Phone{sortIndicator(sort, "phone")}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "status"))}>
                      Status{sortIndicator(sort, "status")}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "minors"))}>
                      Active Minors{sortIndicator(sort, "minors")}
                    </th>
                    <th className="cursor-pointer select-none" onClick={() => setSort((s) => nextSort(s, "created"))}>
                      Joined{sortIndicator(sort, "created")}
                    </th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {sortedCustomers.map((customer) => (
                <tr key={customer.id} className="cursor-pointer" onClick={() => setSelectedCustomer(customer)}>
                  {!hasPeek ? (
                    <>
                      <td>{`${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "-"}</td>
                      <td>{customer.email}</td>
                      <td>{customer.phone || "-"}</td>
                      <td>{statusBadge(Boolean(customer.is_active))}</td>
                      <td>{customer.minors_count ?? 0}</td>
                      <td>{new Date(customer.created_at).toLocaleDateString()}</td>
                    </>
                  ) : (
                    <td>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">
                            {`${customer.first_name || ""} ${customer.last_name || ""}`.trim() || "-"}
                          </span>
                          <span className="text-xs text-kk-dark-text-muted">{customer.email}</span>
                          <span className="text-xs text-kk-dark-text-muted">{customer.phone || "-"}</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {statusBadge(Boolean(customer.is_active))}
                          <span className="text-xs text-kk-dark-text-muted">
                            minors: {customer.minors_count ?? 0}
                          </span>
                        </div>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {loading ? (
                <tr>
                  <td colSpan={hasPeek ? 1 : 6} className="px-3 py-8 text-center text-xs text-kk-dark-text-muted">
                    Loading customers...
                  </td>
                </tr>
              ) : null}

              {!loading && !sortedCustomers.length ? (
                <tr>
                  <td colSpan={hasPeek ? 1 : 6} className="px-3 py-8 text-center text-xs text-kk-dark-text-muted">
                    No customers found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {paginationControls}
      </div>

      {selectedCustomer ? (
        <SidePeek
          isOpen={hasPeek}
          onClose={() => setSelectedCustomer(null)}
          widthClass="w-3/4"
          actions={<div className="text-xs font-medium text-kk-dark-text">#{selectedCustomer.id}</div>}
        >
          <CustomerPeek customerId={selectedCustomer.id} />
        </SidePeek>
      ) : null}

      <CustomerCreateModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={async () => {
          setSearch("");
          setDebouncedSearch("");
          setPage(1);
          await loadCustomers({ page: 1, page_size: pageSize });
        }}
      />
    </div>
  );
};
