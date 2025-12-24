// src/screens/sales/invoice/InvoiceListPage.tsx

import React, { useEffect, useState } from "react";
import { useAuth } from "../../../auth/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import type { InvoiceResponse } from "../../../types/invoice";
import { fetchOrders } from "../../../api/invoice";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import { Plus, ReceiptText } from "lucide-react";
import { formatMoneyNGN } from "../../../helpers";
import SidePeek from "../../../components/layout/SidePeek";
import { InvoicePeek } from "./InvoicePeek";

export const InvoiceListPage: React.FC = () => {
  const { can } = useAuth();

  const navigate = useNavigate();
  const { id } = useParams();
  const hasId = Boolean(id);

  const [invoices, setInvoices] = useState<InvoiceResponse[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceResponse | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const hasPeek = !!selectedInvoice;

  const openPeek = (invoice: InvoiceResponse) => {
    setSelectedInvoice(invoice);
    setSelectedId(invoice.id);
  }
  const closePeek = () => {
    setSelectedId(null);
    setSelectedInvoice(null);
  }

  const toDateStr = (str: string) => {
    const date = new Date(str);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const toDateStrShort = (str: string) => {
    const date = new Date(str);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }


  useEffect(() => {
    (async () => {
      const data = await fetchOrders();
      setInvoices(data.results);
    })();
  },[]);

  useEffect(() => {
    if (!hasId || !invoices.length) return;

    const invoiceId = Number(id);
    const match = invoices.find(i => i.id === invoiceId);

    if (match) {
      (async () => {
        setSelectedInvoice(match);
        setSelectedId(match.id!);
      })();
    }
  }, [hasId, id, invoices])

  return (
    <div className="flex-1 flex gap-4">
      <div className={`flex flex-col gap-4 ${!hasPeek ? "w-full" : "w-1/4"} ${
      hasPeek ? "h-screen overflow-hidden" : ""}`}>
        {/* header */}
        <ListPageHeader 
          icon= {<ReceiptText className="h-5 w-5" />}
          section= "Sales"
          title= "Invoices"
          right= {!hasPeek ? (<div className="flex items-center gap-1 text-xs">
            {/* <FilterBar 
              columns={filterColumns}
              filters={filters}
              onChange={setFilters}
            /> */}
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
                onClick={() => navigate("/sales/invoices/new")} 
                className="new inline-flex items-center gap-1 rounded-full"
              >
                <Plus className="h-3 w-3" />
                New
              </button>
            )}
          </div> ) : ""
          }
        />

        {/* Table */}
        <div className={hasPeek ? "flex-1 overflow-y-auto" : "overflow-hidden"}>
          <table className="min-w-full table-auto">
            <thead>
              <tr>
                <th>
                  { !hasPeek ? "Invoice Number" : "Invoice"}
                </th>
                {!hasPeek && (
                  <>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Total</th>
                    <th>Sales Person</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr
                  key={i.id}
                  className="cursor-pointer"
                  onClick={() => openPeek(i!)}
                >
                  <td>
                    {!hasPeek 
                      ? i.number
                      : (
                          <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-2 items-start">
                              <span>{i.number}</span>
                              <span>{toDateStrShort(i.invoice_date)}</span>
                              <span
                                className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium ${
                                  i.status === "PAID"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : i.status === "VOID" ? "bg-red-400 text-red-50" 
                                      : "bg-slate-100 text-slate-500"
                                  }`}
                              >
                                {i.status}
                              </span>
                            </div>
                              <span className="text-base font-medium">{formatMoneyNGN(+i.grand_total)}</span>
                          </div>
                        )
                    }
                  </td>

                  {!hasPeek && (
                    <>
                      <td>{toDateStr(i.invoice_date)}</td>
                      <td>
                        <span
                          className={`inline-flex rounded-md px-2 py-1 text-[11px] font-medium ${
                            i.status === "PAID"
                                ? "bg-emerald-50 text-emerald-700"
                                : i.status === "VOID" ? "bg-red-400 text-red-50" 
                                : "bg-slate-100 text-slate-500"
                            }`}
                        >
                          {i.status}
                        </span>
                      </td>
                      <td>{i.location_name}</td>
                      <td>{formatMoneyNGN(+i.grand_total)}</td>
                      <td>{i.created_by_name}</td>
                    </>
                  )}
                </tr>
              ))}

              {!invoices.length && (
                <tr>
                  <td
                    className="px-3 py-10 text-center text-xs text-kk-dark-text-muted"
                  >
                    No invoices yet. Maake a Sale to create your first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      { selectedInvoice && (
        <SidePeek
          isOpen={hasPeek}
          onClose={closePeek}
          widthClass="w-3/4"
        >
          <InvoicePeek invoice={selectedInvoice} />
        </SidePeek>
      )}
    </div>
  );
};