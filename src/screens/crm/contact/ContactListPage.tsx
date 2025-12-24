// src/screens/crm/contact/ContactListPage.tsx

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, TrashIcon } from "lucide-react";

import { useAuth } from "../../../auth/AuthContext";
import type { Contact } from "../../../types/contact";
import SidePeek from "../../../components/layout/SidePeek";
import ListPageHeader from "../../../components/layout/ListPageHeader";
import { ContactPeek } from "./ContactPeek";
import { fetchContacts } from "../../../api/contact";
import { FilterBar } from "../../../components/filter/FilterBar";
import type { FilterSet, ColumnMeta } from "../../../types/filters";
import { PencilSquareIcon } from "@heroicons/react/24/outline";

export const ContactListPage: React.FC = () => {
  const { can } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const hasId = Boolean(id);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filters, setFilters] = useState<FilterSet>({ clauses: [] });

  const filterColumns: ColumnMeta[] = [
    { id: "first_name", label: "First Name", type: "text" },
    { id: "last_name", label: "Last Name", type: "text" },
    { id: "email", label: "Email", type: "text"},
    { id: "phone", label: "Phone", type: "text"},
  ];

  const hasPeek = !!selectedId;
  const openPeek = (contact: Contact) => {
    setSelectedContact(contact);
    setSelectedId(contact.id!);
  };

  const closePeek = () => {
    setSelectedContact(null);
    setSelectedId(null);
  };

  useEffect(() => {
    (async () => {
      const data = await fetchContacts();
      setContacts(data.results);
    })();
  },[]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await fetchContacts({ filters });
      if (!cancelled) {
        setContacts(data.results);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters]);

  useEffect(() => {
    if (!hasId || !contacts.length) return;

    const contactId = Number(id);
    const match = contacts.find(c => c.id === contactId);

    if (match) {
      (async () => {
        setSelectedContact(match);
        setSelectedId(match.id!);
      })();
    }
  }, [hasId, id, contacts])

  return (
    <div className="flex-1 flex gap-4">
      <div className={`flex flex-col gap-4 ${!hasPeek ? "w-full" : "w-1/4"} ${
        hasPeek ? "h-screen overflow-hidden" : ""}`}>
        <ListPageHeader 
          icon = {<span className="text-lg">👥</span>}
          section = "CRM"
          title = "Contacts"
          right = {
            !hasPeek ? (
              <div className="flex items-center gap-1 text-xs">
                <FilterBar 
                  columns={filterColumns}
                  filters={filters}
                  onChange={setFilters}
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
            ) : ""
          }
        />

        {/* Table */}
        <div className={hasPeek ? "flex-1 overflow-y-auto" : "overflow-hidden"}>
          <table className="min-w-full">
            <thead>
              <tr>
                <th>Name</th>
                {!hasPeek &&
                  <>
                    <th>Company Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                  </>
                }
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr
                  key={c.id}
                  className="cursor-pointer"
                  onClick={() => openPeek(c)}
                >
                  <td>
                    <p>{c.first_name} {c.last_name}</p>
                  </td>
                  {!hasPeek && 
                    <>
                      <td>{c.company_name}</td>
                      <td>{c.email}</td>
                      <td>{c.phone_1_code_code}{c.phone_1}</td>
                    </>
                  }
                </tr>
              ))}
              {!contacts.length && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-10 text-center text-xs text-kk-dark-text-muted"
                  >
                    No Contacts yet. Click "New" to create your first one
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