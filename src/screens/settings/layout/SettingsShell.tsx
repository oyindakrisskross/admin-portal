// src/screens/settings/SettingsShell.tsx

import React, { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../../../auth/AuthContext";

type SettingsNavItem = {
  label: string;
  to?: string;
  children?: { label: string; to: string }[];
};

const settingsLinks = [
  {
    to: "organization/1",
    label: "Organization",
    perm: "Organization",
  },
  {
    to: "connections",
    label: "Connections",
    perm: "Organization",
  },
  {
    to: "crm-settings",
    label: "CRM Settings",
    perm: "Contacts",
  },
  {
    to: "taxes",
    label: "Taxes",
    perm: "Taxes",
  },
  {
    to: "units",
    label: "Units of Measurement",
    perm: "Units",
  },
  {
    to: "reports/daily",
    label: "Daily Reports",
    perm: "Reports",
  },
  {
    to: "reports/monthly",
    label: "Monthly Reports",
    perm: "Reports",
  },
  {
    to: "locations",
    label: "Locations",
    perm: "Locations",
  },
  {
    label: "Access Control",
    children: [
      { to: "permission-categories", label: "Permission Categories", perm: "Permission Categories"},
      { to: "roles", label: "Roles", perm: "Roles" },
    ],
  },
];

export default function SettingsShell() {
  const { can } = useAuth();
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <div className="flex h-full w-full overflow-hidden bg-kk-dark-bg text-kk-dark-text">
      
      {/* Links */}
      <aside className="w-54 border-r border-kk-dark-border bg-kk-dark-bg-elevated flex flex-col">
        <div className="px-4 py-3 flex flex-col gap-3">
          <nav className="space-y-1">
            {settingsLinks.map((item) => {

              // simple link (no children)
              if (item.to) {
                if (!item.perm || can(item.perm, "view")) {
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end
                      className={({  isActive }) =>
                        [
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium",
                          isActive
                            ? "bg-kk-dark-hover text-kk-dark-text"
                            : "text-kk-dark-text-muted hover:bg-kk-dark-hover hover:text-kk-dark-text",
                        ].join(" ")
                      }
                    >
                      {item.label}
                    </NavLink>
                  );
                }
              }

              // dropdown section
              const isOpen = openSection === item.label;

              // filter children by perm
              const visibleChildren = (item.children || []).filter(
                (child) => !child.perm || can(child.perm, "view")
              );
              if (!visibleChildren.length) return null; // hide section if nothing visible

              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => setOpenSection(isOpen ? null : item.label)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm font-medium text-kk-dark-text-muted hover:bg-kk-dark-hover hover:text-kk-dark-text"
                  >
                    <span>{item.label}</span>
                    <span className={`text-xs transition-transform ${isOpen ? "rotate-90" : ""}`}>
                      <ChevronRightIcon className="w-3 h-3" />
                    </span>
                  </button>

                  {isOpen && item.children && (
                    <div className="mt-1 space-y-1 pl-4">
                      {visibleChildren.map((child) => (
                        <NavLink
                          key={child.to}
                          to={child.to}
                          end
                          className={({ isActive }) =>
                            [
                              "flex items-center gap-2 rounded-md px-2 py-1.5 text-xs",
                              isActive
                                ? "bg-kk-dark-hover text-kk-dark-text"
                                : "text-kk-dark-text-muted hover:bg-kk-dark-hover hover:text-kk-dark-text",
                            ].join(" ")
                          }
                        >
                          {child.label}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
