// src/routes/App.tsx

import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

import LoginPage from "../screens/LoginPage";
import ForgotPasswordPage from "../screens/ForgotPasswordPage";
import ResetPasswordPage from "../screens/ResetPasswordPage";
import AppShell from "../screens/layout/AppShell";
import { ItemGroupListPage } from "../screens/catalog/itemGroup/ItemGroupListPage";
import { ItemListPage } from "../screens/catalog/item/ItemListPage";
import ItemGroupFormPage from "../screens/catalog/itemGroup/ItemGroupFormPage";
import ItemFormPage from "../screens/catalog/item/ItemFormPage";
import { LocationListPage } from "../screens/settings/location/LocationListPage";
import LocationFormPage from "../screens/settings/location/LocationFormPage";
import { ItemInvAdjust } from "../screens/catalog/item/ItemInvAdjust";
import SettingsShell from "../screens/settings/layout/SettingsShell";
import { TaxListPage } from "../screens/settings/tax/TaxListPage";
import TaxFormPage from "../screens/settings/tax/TaxFormPage";
import { UnitListPage } from "../screens/settings/unit/UnitListPage";
import UnitFormPage from "../screens/settings/unit/UnitFormPage";
import OrgFormPage from "../screens/settings/OrgFormPage";
import DailyReportsSettingsPage from "../screens/settings/DailyReportsSettingsPage";
import MonthlyReportsSettingsPage from "../screens/settings/MonthlyReportsSettingsPage";
import { RoleListPage } from "../screens/settings/access-control/RoleListPage";
import RoleFormPage from "../screens/settings/access-control/RoleFormPage";
import { PermCategoryListPage } from "../screens/settings/access-control/PermCategoryListPage";
import PermCategoryFormPage from "../screens/settings/access-control/PermCategoryFormPage";
import { ContactListPage } from "../screens/crm/contact/ContactListPage";
import ContactFormPage from "../screens/crm/contact/ContactFormPage";
import { UserListPage } from "../screens/crm/user/UserListPage";
import UserFormPage from "../screens/crm/user/UserFormPage";
import type { PermissionBitSet } from "../types/accounts";
import type { JSX } from "react";
import ReportsOverviewPage from "../screens/reports/ReportsOverviewPage";
import { EmployeeListPage } from "../screens/ems/employee/EmployeeListPage";
import EmployeeFormPage from "../screens/ems/employee/EmployeeFormPage";
import EmployeeDetailPage from "../screens/ems/employee/EmployeeDetailPage";
import { DepartmentListPage } from "../screens/ems/department/DepartmentListPage";
import DepartmentFormPage from "../screens/ems/department/DepartmentFormPage";
import { JobPositionListPage } from "../screens/ems/position/JobPositionListPage";
import JobPositionFormPage from "../screens/ems/position/JobPositionFormPage";
import { ScheduleBoardPage } from "../screens/ems/schedule/ScheduleBoardPage";
import ProductsReportPage from "../screens/reports/products/ProductsReportPage";
import ProductGroupReportPage from "../screens/reports/products/ProductGroupReportPage";
import VariationsReportPage from "../screens/reports/VariationsReportPage";
import CategoriesReportPage from "../screens/reports/CategoriesReportPage";
import CategoryChildrenReportPage from "../screens/reports/categories/CategoryChildrenReportPage";
import { CategoryListPage } from "../screens/catalog/category/CategoryListPage";
import CategoryFormPage from "../screens/catalog/category/CategoryFormPage";
import { InventoryTransferListPage } from "../screens/catalog/inventoryTransfer/InventoryTransferListPage";
import { InventoryTransferFormPage } from "../screens/catalog/inventoryTransfer/InventoryTransferFormPage";
import { InvoiceListPage } from "../screens/sales/invoice/InvoiceListPage";
import InvoiceRefundPage from "../screens/sales/invoice/InvoiceRefundPage";
import InvoicesReportPage from "../screens/reports/InvoicesReportPage";
import CouponsReportPage from "../screens/reports/CouponsReportPage";
import CouponDetailReportPage from "../screens/reports/coupons/CouponDetailReportPage";
import { CouponListPage } from "../screens/promotions/coupon/CouponListPage";
import CouponFormPage from "../screens/promotions/coupon/CouponFormPage";
import ProfilePage from "../screens/ProfilePage";

function Protected({ children }: { children: JSX.Element }) {
  const { me, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="p-8 text-sm text-kk-muted">Loading?</div>;
  if (!me) return <Navigate to="/login" replace />;
  if (me.must_change_password && location.pathname !== "/profile") {
    return <Navigate to="/profile" replace state={{ forcePasswordChange: true }} />;
  }
  return children;
}
function RequirePerm({ perm, action = "view", children }: {
  perm: string; action?: keyof PermissionBitSet; children: JSX.Element;
}) {
  const { can } = useAuth();
  if (!can(perm, action)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <AppShell />
          </Protected>
        }
      >
        {/* Home / dashboard */}
        <Route index element={<ReportsOverviewPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route 
          path="reports/" 
          element={
            <RequirePerm perm="Reports" action="view">
              <ReportsOverviewPage />
            </RequirePerm>
          } 
        />
        <Route 
          path="reports/products" 
          element={
            <RequirePerm perm="Reports" action="view">
              <ProductsReportPage />
            </RequirePerm>
          } 
        />
        <Route
          path="reports/categories"
          element={
            <RequirePerm perm="Reports" action="view">
              <CategoriesReportPage />
            </RequirePerm>
          }
        />
        <Route
          path="reports/categories/:categoryId"
          element={
            <RequirePerm perm="Reports" action="view">
              <CategoryChildrenReportPage />
            </RequirePerm>
          }
        />
        <Route 
          path="reports/products/group/:groupId" 
          element={
            <RequirePerm perm="Reports" action="view">
              <ProductGroupReportPage />
            </RequirePerm>
          } 
        />
        <Route 
          path="reports/variations" 
          element={
            <RequirePerm perm="Reports" action="view">
              <VariationsReportPage />
            </RequirePerm>
          } 
        />
        <Route 
          path="reports/invoices" 
          element={
            <RequirePerm perm="Reports" action="view">
              <InvoicesReportPage />
            </RequirePerm>
          } 
        />
        <Route
          path="reports/coupons"
          element={
            <RequirePerm perm="Reports" action="view">
              <CouponsReportPage />
            </RequirePerm>
          }
        />
        <Route
          path="reports/coupons/:code"
          element={
            <RequirePerm perm="Reports" action="view">
              <CouponDetailReportPage />
            </RequirePerm>
          }
        />

        {/* Promotions: Coupons */}
        <Route
          path="promotions/coupons"
          element={
            <RequirePerm perm="Coupons" action="view">
              <CouponListPage />
            </RequirePerm>
          }
        />
        <Route
          path="promotions/coupons/:id"
          element={
            <RequirePerm perm="Coupons" action="view">
              <CouponListPage />
            </RequirePerm>
          }
        />
        <Route
          path="promotions/coupons/new"
          element={
            <RequirePerm perm="Coupons" action="create">
              <CouponFormPage />
            </RequirePerm>
          }
        />
        <Route
          path="promotions/coupons/:id/edit"
          element={
            <RequirePerm perm="Coupons" action="edit">
              <CouponFormPage />
            </RequirePerm>
          }
        />

        {/* Catalog: Item Groups */}
        <Route
          path="catalog/item-groups"
          element={
            <RequirePerm perm="Item" action="view">
              <ItemGroupListPage />
            </RequirePerm>
          }
        />
        <Route
          path="catalog/item-groups/:id"
          element={
            <RequirePerm perm="Item" action="view">
              <ItemGroupListPage />
            </RequirePerm>
          }
        />
        <Route
          path="catalog/item-groups/new"
          element={
            <RequirePerm perm="Item" action="create">
              <ItemGroupFormPage />
            </RequirePerm>
          }
        />
        <Route
          path="catalog/item-groups/:id/edit"
          element={
            <RequirePerm perm="Item" action="edit">
              <ItemGroupFormPage />
            </RequirePerm>
          }
        />

        {/* Catalog: Items */}
        <Route
          path="catalog/items"
          element={
            <RequirePerm perm="Item" action="view">
              <ItemListPage />
            </RequirePerm>
          }
        />
        <Route
          path="catalog/items/:id"
          element={
            <RequirePerm perm="Item" action="view">
              <ItemListPage />
            </RequirePerm>
          }
        />
        <Route
          path="catalog/items/new"
          element={
            <RequirePerm perm="Item" action="create">
              <ItemFormPage />
            </RequirePerm>
          }
        />
        <Route
          path="catalog/items/:id/edit"
          element={
            <RequirePerm perm="Item" action="edit">
              <ItemFormPage />
            </RequirePerm>
          }
        />
        <Route
          path="catalog/items/:id/adjust-inventory"
          element={
            <RequirePerm perm="Inventory Adjustment" action="edit">
              <ItemInvAdjust />
            </RequirePerm>
          }
        />

        {/* Catalog: Categories */}
        <Route 
          path="catalog/categories"
          element={
            <RequirePerm perm="Category" action="view">
              <CategoryListPage />
            </RequirePerm>
          }
        />
        <Route
            path="catalog/categories/new"
            element={
              <RequirePerm perm="Category" action="create">
                <CategoryFormPage />
              </RequirePerm>
            }
          />
        <Route 
          path="catalog/categories/:id/edit"
          element={
            <RequirePerm perm="Category" action="edit">
              <CategoryFormPage />
            </RequirePerm>
          }
        />

        {/* Catalog: Transfer Orders */}
        <Route
          path="catalog/transfer-inventory"
          element={
            <RequirePerm perm="Transfer Orders" action="view">
              <InventoryTransferListPage />
            </RequirePerm>
          }
        />
        <Route
          path="catalog/transfer-inventory/:id"
          element={
            <RequirePerm perm="Transfer Orders" action="view">
              <InventoryTransferListPage />
            </RequirePerm>
          }
        />
        <Route
          path="catalog/transfer-inventory/new"
          element={
            <RequirePerm perm="Transfer Orders" action="create">
              <InventoryTransferFormPage />
            </RequirePerm>
          }
        />
        <Route
          path="catalog/transfer-inventory/:id/edit"
          element={
            <RequirePerm perm="Transfer Orders" action="edit">
              <InventoryTransferFormPage />
            </RequirePerm>
          }
        />

        {/* Sales: Invoices */}
        <Route 
          path="sales/invoices"
          element={
            <RequirePerm perm="Invoices" action="view">
              <InvoiceListPage />
            </RequirePerm>
          }
        />
        <Route 
          path="sales/invoices/:id"
          element={
            <RequirePerm perm="Invoices" action="view">
              <InvoiceListPage />
            </RequirePerm>
          }
        />
        <Route
          path="sales/invoices/:id/refund"
          element={
            <RequirePerm perm="Sales Return" action="create">
              <InvoiceRefundPage />
            </RequirePerm>
          }
        />

        {/* CRM: Contacts */}
        <Route
          path="crm/contacts"
          element={
            <RequirePerm perm="Contacts" action="view">
              <ContactListPage />
            </RequirePerm>
          }
        />
        <Route
          path="crm/contacts/:id"
          element={
            <RequirePerm perm="Contacts" action="view">
              <ContactListPage />
            </RequirePerm>
          }
        />
        <Route
          path="crm/contacts/new"
          element={
            <RequirePerm perm="Contacts" action="create">
              <ContactFormPage />
            </RequirePerm>
          }
        />
        <Route
          path="crm/contacts/:id/edit"
          element={
            <RequirePerm perm="Contacts" action="edit">
              <ContactFormPage />
            </RequirePerm>
          }
        />

        {/* CRM: Users */}
        <Route
          path="/crm/users"
          element={
            <RequirePerm perm="Portal Users" action="view">
              <UserListPage />
            </RequirePerm>
          }
        />
        <Route
          path="/crm/users/new"
          element={
            <RequirePerm perm="Portal Users" action="create">
              <UserFormPage />
            </RequirePerm>
          }
        />
        <Route
          path="/crm/users/:id/edit"
          element={
            <RequirePerm perm="Portal Users" action="edit">
              <UserFormPage />
            </RequirePerm>
          }
        />

        {/* EMS */}
        <Route
          path="ems/employees"
          element={
            <RequirePerm perm="Employee" action="view">
              <EmployeeListPage />
            </RequirePerm>
          }
        />
        <Route
          path="ems/employees/new"
          element={
            <RequirePerm perm="Employee" action="create">
              <EmployeeFormPage />
            </RequirePerm>
          }
        />
        <Route
          path="ems/employees/:id/edit"
          element={
            <RequirePerm perm="Employee" action="edit">
              <EmployeeFormPage />
            </RequirePerm>
          }
        />
        <Route
          path="ems/employees/:id"
          element={
            <RequirePerm perm="Employee" action="view">
              <EmployeeDetailPage />
            </RequirePerm>
          }
        />
        <Route
          path="ems/departments"
          element={
            <RequirePerm perm="Employee" action="view">
              <DepartmentListPage />
            </RequirePerm>
          }
        />
        <Route
          path="ems/departments/new"
          element={
            <RequirePerm perm="Employee" action="create">
              <DepartmentFormPage />
            </RequirePerm>
          }
        />
        <Route
          path="ems/departments/:id/edit"
          element={
            <RequirePerm perm="Employee" action="edit">
              <DepartmentFormPage />
            </RequirePerm>
          }
        />
        <Route
          path="ems/positions"
          element={
            <RequirePerm perm="Employee" action="view">
              <JobPositionListPage />
            </RequirePerm>
          }
        />
        <Route
          path="ems/positions/new"
          element={
            <RequirePerm perm="Employee" action="create">
              <JobPositionFormPage />
            </RequirePerm>
          }
        />
        <Route
          path="ems/positions/:id/edit"
          element={
            <RequirePerm perm="Employee" action="edit">
              <JobPositionFormPage />
            </RequirePerm>
          }
        />
        <Route
          path="ems/schedule"
          element={
            <RequirePerm perm="Employee" action="view">
              <ScheduleBoardPage />
            </RequirePerm>
          }
        />

        {/* Settings */}
        <Route path="settings" element={<SettingsShell />}>

          {/* Organization */}
          <Route
            path="organization/:id"
            element={
              <RequirePerm perm="Organization" action="edit">
                <OrgFormPage />
              </RequirePerm>
            }
          />

          {/* Taxes */}
          <Route
            path="taxes"
            element={
              <RequirePerm perm="Taxes" action="view">
                <TaxListPage />
              </RequirePerm>
            }
          />
          <Route
            path="taxes/new"
            element={
              <RequirePerm perm="Taxes" action="create">
                <TaxFormPage />
              </RequirePerm>
            }
          />
          <Route
            path="taxes/:id/edit"
            element={
              <RequirePerm perm="Taxes" action="edit">
                <TaxFormPage />
              </RequirePerm>
            }
          />

          {/* Units */}
          <Route
            path="units"
            element={
              <RequirePerm perm="Units" action="view">
                <UnitListPage />
              </RequirePerm>
            }
          />
          <Route
            path="units/new"
            element={
              <RequirePerm perm="Units" action="create">
                <UnitFormPage />
              </RequirePerm>
            }
          />
          <Route
            path="units/:id/edit"
            element={
              <RequirePerm perm="Units" action="edit">
                <UnitFormPage />
              </RequirePerm>
            }
          />

          {/* Reports */}
          <Route
            path="reports/daily"
            element={
              <RequirePerm perm="Reports" action="edit">
                <DailyReportsSettingsPage />
              </RequirePerm>
            }
          />
          <Route
            path="reports/monthly"
            element={
              <RequirePerm perm="Reports" action="edit">
                <MonthlyReportsSettingsPage />
              </RequirePerm>
            }
          />

          {/* Business: Locations */}
          <Route
            path="locations"
            element={
              <RequirePerm perm="Locations" action="view">
                <LocationListPage />
              </RequirePerm>
            }
          />
          <Route
            path="locations/:id"
            element={
              <RequirePerm perm="Locations" action="view">
                <LocationListPage />
              </RequirePerm>
            }
          />
          <Route
            path="locations/new"
            element={
              <RequirePerm perm="Locations" action="create">
                <LocationFormPage />
              </RequirePerm>
            }
          />
          <Route
            path="locations/:id/edit"
            element={
              <RequirePerm perm="Locations" action="edit">
                <LocationFormPage />
              </RequirePerm>
            }
          />

          {/* Access Control - Roles */}
          <Route
            path="roles"
            element={
              <RequirePerm perm="Roles" action="view">
                <RoleListPage />
              </RequirePerm>
            }
          />
          <Route
            path="roles/new"
            element={
              <RequirePerm perm="Roles" action="create">
                <RoleFormPage />
              </RequirePerm>
            }
          />
          <Route
            path="roles/:id/edit"
            element={
              <RequirePerm perm="Roles" action="edit">
                <RoleFormPage />
              </RequirePerm>
            }
          />

          {/* Access Control - Permission Categories */}
          <Route
            path="permission-categories"
            element={
              <RequirePerm perm="Permission Categories" action="view">
                <PermCategoryListPage />
              </RequirePerm>
            }
          />
          <Route
            path="permission-categories/new"
            element={
              <RequirePerm perm="Permission Categories" action="create">
                <PermCategoryFormPage />
              </RequirePerm>
            }
          />
          <Route
            path="permission-categories/:id/edit"
            element={
              <RequirePerm perm="Permission Categories" action="edit">
                <PermCategoryFormPage />
              </RequirePerm>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
