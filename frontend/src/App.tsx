import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { lazy, Suspense, type ReactElement } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";

import { DemoStoreProvider } from "@/store/demo-store";
import AdminRoute from "@/components/AdminRoute";
import { AuthProvider } from "@/hooks/use-auth";
import ManagerRoute from "@/components/ManagerRoute";
import { RouteLoadingFallback, type RouteRole } from "@/components/loading";
import { AuthLayout as AuthLayoutShell, CustomerLayout as CustomerLayoutShell } from "@/layouts";

const NotFound = lazy(() => import("./pages/NotFound"));
const LandingPage = lazy(() => import("./pages/website/LandingPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const PostLoginPage = lazy(() => import("./pages/auth/PostLoginPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const UserMenuPage = lazy(() => import("./pages/user/UserMenuPage"));
const OrderConfirmationPage = lazy(() => import("./pages/user/OrderConfirmationPage"));
const RestaurantSetupPage = lazy(() => import("./pages/restaurant/RestaurantSetupPage"));
const PublicMenuPage = lazy(() => import("./pages/customer/PublicMenuPage"));
const HeadLayoutPage = lazy(() => import("./pages/head/HeadLayout"));
const HeadOrdersPage = lazy(() => import("./pages/head/HeadOrdersPage"));
const HeadStockPage = lazy(() => import("./pages/head/HeadStockPage"));
const HeadMenuPage = lazy(() => import("./pages/head/HeadMenuPage"));
const HeadTablesPage = lazy(() => import("./pages/head/HeadTablesPage"));
const ManagerLayoutPage = lazy(() => import("./pages/manager/ManagerLayout"));
const ManagerDashboardPage = lazy(() => import("./pages/manager/ManagerDashboardPage"));
const ManagerOrdersPage = lazy(() => import("./pages/manager/ManagerOrdersPage"));
const ManagerStockPage = lazy(() => import("./pages/manager/ManagerStockPage"));
const ManagerCustomersPage = lazy(() => import("./pages/manager/ManagerCustomersPage"));
const ManagerStaffPage = lazy(() => import("./pages/manager/ManagerStaffPage"));
const AdminLayoutPage = lazy(() => import("./pages/admin/AdminLayout"));
const AdminDashboardPage = lazy(() => import("./pages/admin/dashboard/AdminDashboardPage"));
const AdminCustomersPage = lazy(() => import("./pages/admin/customer/AdminCustomersPage"));
const AdminAnalyticsPage = lazy(() => import("./pages/admin/AdminAnalyticsPage"));
const AdminProductsPage = lazy(() => import("./pages/admin/products/AdminProductsPageNew"));
const AdminCampaignPage = lazy(() => import("./pages/admin/campaigns/AdminCampaignPage"));
const AdminOrdersPage = lazy(() => import("./pages/admin/orders/AdminOrdersPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));
const AdminSideSettings = lazy(() => import("./pages/admin/adminSettings/AdminSideSettings"));
const CompanyProfilePage = lazy(() => import("./pages/admin/company/CompanyProfilePage"));
const TablePage = lazy(() => import("./pages/admin/company/TablePage"));
const StaffPage = lazy(() => import("./pages/admin/company/staff/StaffPage"));
const RestaurantSlugDebugPage = lazy(() => import("./pages/admin/RestaurantSlugDebugPage"));
const DebugAuthPage = lazy(() => import("./pages/admin/DebugAuthPage"));
const CustomerEntry = lazy(() => import("./pages/admin/customerSettings/CustomerEntry"));

const withRoleSuspense = (role: RouteRole, element: ReactElement) => (
  <Suspense fallback={<RouteLoadingFallback role={role} />}>{element}</Suspense>
);

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <DemoStoreProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* PUBLIC */}
            <Route path="/" element={withRoleSuspense("customer", <CustomerLayoutShell><LandingPage /></CustomerLayoutShell>)} />

            {/* PUBLIC MENU - /:slug/menu */}
            <Route path="/:slug/menu" element={withRoleSuspense("customer", <CustomerLayoutShell><PublicMenuPage /></CustomerLayoutShell>)} />
            <Route path="/:slug/customer" element={withRoleSuspense("customer", <CustomerLayoutShell><UserMenuPage /></CustomerLayoutShell>)} />

            {/* AUTH */}
            <Route path="/auth" element={withRoleSuspense("auth", <AuthLayoutShell><Outlet /></AuthLayoutShell>)}>
              <Route path="register" element={<RegisterPage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="post-login" element={<PostLoginPage />} />
            </Route>
            <Route path="/order/:orderId" element={withRoleSuspense("customer", <CustomerLayoutShell><OrderConfirmationPage /></CustomerLayoutShell>)} />


            {/* HEAD PANEL (formerly Staff/Waiter) */}
            <Route path="/head" element={withRoleSuspense("waiter", <HeadLayoutPage />)}>
                <Route index element={<Navigate to="orders" replace />} />
                <Route path="orders" element={<HeadOrdersPage />} />
                <Route path="menu" element={<HeadMenuPage />} />
                <Route path="menu/:orderId" element={<HeadMenuPage />} />
                <Route path="tables" element={<HeadTablesPage />} />
                <Route path="stock" element={<HeadStockPage />} />
            </Route>
            {/* BACKWARD COMPATIBILITY: Redirect /staff and /waiter to /head */}
            <Route path="/staff" element={<Navigate to="/head/orders" replace />} />
            <Route path="/staff/orders" element={<Navigate to="/head/orders" replace />} />
            <Route path="/staff/menu" element={<Navigate to="/head/menu" replace />} />
            <Route path="/staff/menu/:orderId" element={<Navigate to="/head/menu" replace />} />
            <Route path="/staff/stock" element={<Navigate to="/head/stock" replace />} />
            <Route path="/waiter" element={<Navigate to="/head/orders" replace />} />
            <Route path="/waiter/orders" element={<Navigate to="/head/orders" replace />} />
            <Route path="/waiter/menu" element={<Navigate to="/head/menu" replace />} />
            <Route path="/waiter/stock" element={<Navigate to="/head/stock" replace />} />

            {/* RESTAURANT SETUP */}
            <Route path="/restaurant/setup" element={withRoleSuspense("auth", <AuthLayoutShell><RestaurantSetupPage /></AuthLayoutShell>)} />

            {/* CUSTOMER MENU */}
            <Route path="/menu" element={withRoleSuspense("customer", <CustomerLayoutShell><CustomerEntry /></CustomerLayoutShell>)} />

            {/* ADMIN */}
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin" element={withRoleSuspense("admin", <AdminRoute><AdminLayoutPage /></AdminRoute>)} >
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="products" element={<AdminProductsPage />} />
                <Route path="campaigns" element={<AdminCampaignPage />} />
                <Route path="customers" element={<AdminCustomersPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />

                {/* ✅ COMPANY SECTION */}
                <Route path="company/profile" element={<CompanyProfilePage />} />
                <Route path="company/tables" element={<TablePage />} />
                <Route path="company/staff" element={<StaffPage />} />

                {/* DEBUG: Restaurant Slug */}
                <Route path="debug/slug" element={<RestaurantSlugDebugPage />} />
                <Route path="debug/auth" element={<DebugAuthPage />} />

                {/* SETTINGS */}
                <Route path="settings" element={<Navigate to="settings/admin" replace />} />
                <Route path="settings/customer" element={<AdminSettingsPage />} />
                <Route path="settings/admin" element={<AdminSideSettings />} />
            </Route>

            {/* MANAGER */}
            <Route path="/manager" element={<Navigate to="/manager/dashboard" replace />} />
            <Route
              path="/manager"
              element={withRoleSuspense("manager", <ManagerRoute><ManagerLayoutPage /></ManagerRoute>)}
            >
                <Route path="dashboard" element={<ManagerDashboardPage />} />
                <Route path="orders" element={<ManagerOrdersPage />} />
                <Route path="stock" element={<ManagerStockPage />} />
                <Route path="customers" element={<ManagerCustomersPage />} />
                <Route path="company/profile" element={<CompanyProfilePage />} />
                <Route path="company/tables" element={<TablePage />} />
                <Route path="company/staff" element={<StaffPage />} />
            </Route>

            <Route path="*" element={withRoleSuspense("customer", <CustomerLayoutShell><NotFound /></CustomerLayoutShell>)} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </DemoStoreProvider>
  </TooltipProvider>
);
export default App;
