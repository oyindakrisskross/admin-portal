import { Outlet, NavLink } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";

import { 
  HomeIcon,
  // InboxIcon,
  Cog8ToothIcon,
  ChevronRightIcon, 
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { ChartNoAxesCombined, Contact, ShoppingBag, ShoppingCart } from "lucide-react";

const toolboxItems = [
  { 
    to: "/", 
    label: "Dashboard", 
    icon: <HomeIcon className="h-5 w-5" />
  },
  // { 
  //   to: "/inbox", 
  //   label: "Inbox", 
  //   icon: <InboxIcon className="h-5 w-5" />
  // },
  { 
    to: "/settings", 
    label: "Settings", 
    icon: <Cog8ToothIcon className="h-5 w-5" />
  },
];

const portalLinks = [
  {
    label: "Catalog",
    icon: <ShoppingBag className="h-5 w-5" />,
    children: [
      { to: "/catalog/item-groups", label: "Item Groups", perm: "Item" },
      { to: "/catalog/items", label: "Items", perm: "Item" },
      { to: "/catalog/categories", label: "Categories", perm: "Category"},
    ],
  },
  {
    label: "Sales",
    icon: <ShoppingCart className="h-5 w-5" />,
    children: [
      { to: "/sales/invoices", label: "Invoices", perm: "Invoices" },
    ],
  },
  {
    label: "CRM",
    icon: <Contact className="h-5 w-5" />,
    children: [
      { to: "/crm/contacts", label: "Contacts", perm: "Contacts" },
      { to: "/crm/users", label: "Portal Users", perm: "Portal Users" },
      // { to: "/crm/customers", label: "Customers", perm: "Customers" },   // TODO: Phase 2
      // { to: "/crm/vendors", label: "Vendors", perm: "Vendors" },     // TODO: Phase 2
    ],
  },
  {
    label: "Reports",
    icon: <ChartNoAxesCombined className="h-5 w-5" />,
    children: [
      { to: "/reports/", label: "Overview", perm: "Reports" },
      { to: "/reports/products", label: "Products", perm: "Reports" },
      { to: "/reports/variations", label: "Variations", perm: "Reports" },
      { to: "/reports/invoices", label: "Invoices", perm: "Reports" },
    ],
  },
];


function ShellInner() {
  const { me, logout, can } = useAuth();
  const [openSection, setOpenSection] = useState<string | null>(null);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-kk-dark-bg text-kk-dark-text">
      {/* Left sidebar */}
      <aside className="w-64 border-r border-kk-dark-border bg-kk-dark-bg-elevated flex flex-col">
        <div className="px-4 py-3 border-b border-kk-dark-border">
          {/* Portal Name */}
          <div className="flex items-center gap-2 mb-3.5">
            <div className="h-7 w-7 rounded-md bg-purple-500 flex items-center justify-center text-xs font-bold">
              KK
            </div>
            <div>
              <div className="text-sm font-semibold">Kriss Kross</div>
              <div className="text-[11px] text-kk-muted">Admin Portal</div>
            </div>
          </div>

          {/* Toolbox */}
          <nav className="space-y-1">
            {toolboxItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end
                className={({ isActive }) =>
                  [
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium",
                    isActive
                      ? "bg-kk-dark-hover text-kk-dark-text"
                      : "text-kk-dark-text-muted hover:bg-kk-dark-hover hover:text-kk-dark-text",
                  ].join(" ")
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          <nav className="space-y-1">
            {portalLinks.map((item) => {

              // simple link (no children)
              // if (item.to) {
              //   return (
              //     <NavLink
              //       key={item.to}
              //       to={item.to}
              //       end
              //       className={({ isActive }) =>
              //         [
              //           "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
              //           isActive
              //             ? "bg-kk-dark-hover text-kk-dark-text"
              //             : "text-kk-dark-text-muted hover:bg-kk-dark-hover hover:text-kk-dark-text",
              //         ].join(" ")
              //       }
              //     >
              //       <span className="text-base">{item?.icon}</span>
              //       <span>{item.label}</span>
              //     </NavLink>
              //   );
              // }

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
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-kk-dark-text-muted hover:bg-kk-dark-hover hover:text-kk-dark-text"
                  >
                    <span className={`text-xs transition-transform ${isOpen ? "rotate-90" : ""}`}>
                      <ChevronRightIcon className="w-3 h-3" />
                    </span>
                    <span className="text-base">{item?.icon}</span>
                    <span>{item.label}</span>
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
                              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
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

          <br />

        </div>

        <div className="border-t border-kk-dark-border px-3 py-3 flex items-center justify-between text-xs text-kk-muted">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wide">Signed in</span>
            <span className="text-[12px] truncate max-w-[150px]">
              {me?.email}
            </span>
          </div>
          <button
            className="px-2 py-1 rounded-md text-[11px] border border-kk-dark-border hover:bg-[rgba(255,255,255,0.03)]"
            onClick={logout}
          >
            Log out
          </button>
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default function AppShell() {
  return <ShellInner />;
}