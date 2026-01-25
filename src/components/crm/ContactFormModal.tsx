import React from "react";
import { X } from "lucide-react";

import type { Contact } from "../../types/contact";
import { ContactForm } from "./ContactForm";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (contact: Contact) => void;
};

export const ContactFormModal: React.FC<Props> = ({ open, onClose, onSaved }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 backdrop-blur-sm">
      <div className="mt-12 w-full max-w-5xl rounded-2xl shadow-xl border border-kk-dark-border bg-kk-dark-bg-elevated">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">New Contact</h2>
            <p className="text-xs text-kk-dark-text-muted">Create a contact without leaving this page.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-kk-dark-hover">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(100vh-8rem)] overflow-auto px-6 py-6">
          <ContactForm
            initial={null}
            mode="modal"
            embedded
            onClose={onClose}
            onSaved={onSaved}
          />
        </div>
      </div>
    </div>
  );
};

