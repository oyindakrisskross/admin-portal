import { Outlet, NavLink, useLocation } from "react-router-dom";

import { useAuth } from "../../auth/AuthContext";
import { ImportJobsProvider } from "../../contexts/ImportJobsContext";
import { getStoredTheme, setStoredTheme, themeScopeForUser, type Theme } from "../../utils/theme";

import { 
  HomeIcon,
  // InboxIcon,
  Cog8ToothIcon,
  ChevronRightIcon, 
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { clearReportDateRange } from "../../hooks/useReportDateRange";
import {
  ChartNoAxesCombined,
  Contact,
  Search,
  Users,
  ShoppingBag,
  ShoppingCart,
  TicketPercent,
} from "lucide-react";

const toolboxItems = [
  { 
    to: "/", 
    label: "Dashboard", 
    icon: <HomeIcon className="h-5 w-5" />
  },
  { 
    to: "/profile", 
    label: "Profile", 
    icon: <UserCircleIcon className="h-5 w-5" />
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
      { to: "/catalog/inventory-adjustment", label: "Inventory Adjustment", perm: "Inventory Adjustment" },
      { to: "/catalog/plans", label: "Plans", perm: "Subscriptions" },
      { to: "/catalog/categories", label: "Categories", perm: "Category"},
      { to: "/catalog/transfer-inventory", label: "Transfer Orders", perm: "Transfer Orders" },
    ],
  },
  {
    label: "Promotions",
    icon: <TicketPercent className="h-5 w-5" />,
    children: [{ to: "/promotions/coupons", label: "Coupons", perm: "Coupons" }],
  },
  {
    label: "Sales",
    icon: <ShoppingCart className="h-5 w-5" />,
    children: [
      { to: "/sales/invoices", label: "Invoices", perm: "Invoices" },
      { to: "/sales/prepaid", label: "Pre-Paid", perm: "Invoices" },
      { to: "/sales/payments", label: "Payments", perm: "Invoices" },
      { to: "/sales/subscriptions", label: "Subscriptions", perm: "Subscriptions" },
    ],
  },
  {
    label: "CRM",
    icon: <Contact className="h-5 w-5" />,
    children: [
      { to: "/crm/contacts", label: "Contacts", perm: "Contacts" },
      { to: "/crm/users", label: "Portal Users", perm: "Portal Users" },
      { to: "/crm/customers", label: "Customers", perm: "Contacts" },
      // { to: "/crm/vendors", label: "Vendors", perm: "Vendors" },     // TODO: Phase 2
    ],
  },
  {
    label: "Employees",
    icon: <Users className="h-5 w-5" />,
    children: [
      { to: "/ems/employees", label: "Directory", perm: "Employee" },
      { to: "/ems/departments", label: "Departments", perm: "Employee" },
      { to: "/ems/positions", label: "Job Positions", perm: "Employee" },
      { to: "/ems/schedule", label: "Schedule Board", perm: "Employee" },
    ],
  },
  {
    label: "Reports",
    icon: <ChartNoAxesCombined className="h-5 w-5" />,
    children: [
      { to: "/reports/", label: "Overview", perm: "Reports" },
      { to: "/reports/products", label: "Products", perm: "Reports" },
      { to: "/reports/categories", label: "Categories", perm: "Reports" },
      { to: "/reports/variations", label: "Variations", perm: "Reports" },
      { to: "/reports/invoices", label: "Invoices", perm: "Reports" },
      { to: "/reports/prepaid", label: "Pre-Paid", perm: "Reports" },
      { to: "/reports/coupons", label: "Coupons", perm: "Reports" },
    ],
  },
];

type PortalLinkSection = (typeof portalLinks)[number];
type PortalLinkChild = PortalLinkSection["children"][number];
type VisiblePortalLinkSection = PortalLinkSection & { visibleChildren: PortalLinkChild[] };

function matchesNavigationQuery(value: string, query: string) {
  return value.toLowerCase().includes(query);
}


function ShellInner() {
  const { me, logout, can } = useAuth();
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [navSearch, setNavSearch] = useState("");
  const location = useLocation();
  const themeScope = me ? themeScopeForUser({ id: me.id, portal: me.portal }) : undefined;
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme(themeScope));
  const normalizedNavSearch = navSearch.trim().toLowerCase();
  const isFilteringNavigation = normalizedNavSearch.length > 0;

  const filteredPortalLinks: VisiblePortalLinkSection[] = portalLinks.reduce<VisiblePortalLinkSection[]>((acc, item) => {
    const allowedChildren = item.children.filter((child) => !child.perm || can(child.perm, "view"));
    if (!allowedChildren.length) return acc;

    if (!isFilteringNavigation) {
      acc.push({ ...item, visibleChildren: allowedChildren });
      return acc;
    }

    const sectionMatches = matchesNavigationQuery(item.label, normalizedNavSearch);
    const filteredChildren = allowedChildren.filter((child) => {
      if (sectionMatches) return true;
      return (
        matchesNavigationQuery(child.label, normalizedNavSearch) ||
        matchesNavigationQuery(child.to.replaceAll("/", " "), normalizedNavSearch)
      );
    });

    if (filteredChildren.length) {
      acc.push({ ...item, visibleChildren: filteredChildren });
    }
    return acc;
  }, []);

  // In case the signed-in user changes (shared device), snap to that user's stored theme.
  // (This also avoids leaking another user's preference across logins.)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!me) return;
    const next = getStoredTheme(themeScopeForUser({ id: me.id, portal: me.portal }));
    setTheme(next);
  }, [me?.id, me?.portal]);

  useEffect(() => {
    if (!location.pathname.startsWith("/reports")) {
      clearReportDateRange();
    }
  }, [location.pathname]);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    setStoredTheme(next, themeScope);
  };

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
          <div className="mb-3">
            <label htmlFor="portal-nav-search" className="sr-only">
              Search admin pages
            </label>
            <div className="flex items-center gap-2 rounded-md border border-kk-dark-input-border bg-kk-dark-bg px-3 py-2 focus-within:border-kk-dark-border">
              <Search className="h-4 w-4 shrink-0 text-kk-dark-text-muted" />
              <input
                id="portal-nav-search"
                type="text"
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                placeholder="Search pages..."
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-kk-dark-text-muted"
              />
              {navSearch ? (
                <button
                  type="button"
                  onClick={() => setNavSearch("")}
                  aria-label="Clear page search"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-kk-dark-text-muted hover:bg-kk-dark-hover hover:text-kk-dark-text"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              ) : null}
            </div>
          </div>

          <nav className="space-y-1">
            {filteredPortalLinks.map((item) => {
              const isOpen = isFilteringNavigation || openSection === item.label;

              return (
                <div key={item.label}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isFilteringNavigation) return;
                      setOpenSection(isOpen ? null : item.label);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-kk-dark-text-muted hover:bg-kk-dark-hover hover:text-kk-dark-text"
                  >
                    <span className={`text-xs transition-transform ${isOpen ? "rotate-90" : ""}`}>
                      <ChevronRightIcon className="w-3 h-3" />
                    </span>
                    <span className="text-base">{item?.icon}</span>
                    <span>{item.label}</span>
                  </button>

                  {isOpen && (
                    <div className="mt-1 space-y-1 pl-4">
                      {item.visibleChildren.map((child) => (
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

            {isFilteringNavigation && filteredPortalLinks.length === 0 ? (
              <div className="rounded-md border border-dashed border-kk-dark-border bg-kk-dark-bg-elevated px-3 py-3 text-xs text-kk-dark-text-muted">
                No pages match "{navSearch.trim()}".
              </div>
            ) : null}
          </nav>

          <br />

        </div>

        <div className="border-t border-kk-dark-border px-3 py-3 flex items-center justify-between text-xs text-kk-muted">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 rounded-md border border-kk-dark-border px-2 py-1 hover:bg-kk-dark-hover"
            aria-label="Toggle theme"
            title="Toggle theme"
          >
            <span className="text-[11px] uppercase tracking-wide">Theme</span>
            <span className="text-[11px]">{theme === "dark" ? "Dark" : "Light"}</span>
            <span
              className="relative inline-flex h-5 w-9 items-center rounded-full border border-kk-dark-border bg-kk-dark-bg"
            >
              <span
                className={[
                  "inline-block h-4 w-4 transform rounded-full bg-kk-accent transition-transform",
                  theme === "dark" ? "translate-x-4" : "translate-x-1",
                ].join(" ")}
              />
            </span>
          </button>

          <button
            className="px-2 py-1 rounded-md text-[11px] border border-kk-dark-border hover:bg-kk-dark-hover"
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
  return (
    <ImportJobsProvider>
      <ShellInner />
    </ImportJobsProvider>
  );
}
