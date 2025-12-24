import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline"; // or swap for text/icon of your choice

type SidePeekProps = {
  isOpen: boolean;
  onClose: () => void;
  widthClass?: string; // tailwind width, e.g. "w-[420px]"
  children: React.ReactNode;
  actions?: React.ReactNode;
};

const SidePeek: React.FC<SidePeekProps> = ({
  isOpen,
  onClose,
  widthClass = "w-3/4",
  children,
  actions,
}) => {
  if (!isOpen) return null;

  return (
    <aside className={`flex flex-col h-screen ${widthClass} bg-kk-dark-bg-elevated border-l border-kk-dark-border`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-kk-dark-border">
        <div>{actions}</div>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-[rgba(255,255,255,0.06)] text-kk-muted hover:text-gray-100"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
    </aside>
  );
};

export default SidePeek;
