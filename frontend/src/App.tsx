import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// PAGES
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/website/LandingPage";
import RegisterPage from "./pages/auth/RegisterPage";
import LoginPage from "./pages/auth/LoginPage";
import PostLoginPage from "./pages/auth/PostLoginPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import UserMenuPage from "./pages/user/UserMenuPage";
import OrderConfirmationPage from "./pages/user/OrderConfirmationPage";
import RestaurantSetupPage from "./pages/restaurant/RestaurantSetupPage";
import PublicMenuPage from "./pages/customer/PublicMenuPage";

// STAFF PAGES
import StaffLayout from "./pages/waiter/WaiterLayout";
import StaffOrdersPage from "./pages/waiter/WaiterOrdersPage";
import StaffStockPage from "./pages/waiter/WaiterStockPage";
import StaffMenuPage from "./pages/waiter/WaiterMenuPage";
import ManagerLayout from "./pages/manager/ManagerLayout";
import ManagerDashboardPage from "./pages/manager/ManagerDashboardPage";
import ManagerOrdersPage from "./pages/manager/ManagerOrdersPage";
import ManagerStockPage from "./pages/manager/ManagerStockPage";
import ManagerCustomersPage from "./pages/manager/ManagerCustomersPage";
import ManagerStaffPage from "./pages/manager/ManagerStaffPage";

import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboardPage from "./pages/admin/dashboard/AdminDashboardPage";
import AdminCustomersPage from "./pages/admin/customer/AdminCustomersPage";
import AdminAnalyticsPage from "@/pages/admin/AdminAnalyticsPage";
import AdminProductsPage from "./pages/admin/products/AdminProductsPageNew";
import AdminCampaignPage from "./pages/admin/campaigns/AdminCampaignPage";
import AdminOrdersPage from "./pages/admin/orders/AdminOrdersPage";

import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import AdminSideSettings from "@/pages/admin/adminSettings/AdminSideSettings";
import CompanyProfilePage from "@/pages/admin/company/CompanyProfilePage";
import StaffPage from "./pages/admin/company/staff/StaffPage";
import RestaurantSlugDebugPage from "./pages/admin/RestaurantSlugDebugPage";
import DebugAuthPage from "./pages/admin/DebugAuthPage";

import CustomerEntry from './pages/admin/customerSettings/CustomerEntry';
import { DemoStoreProvider } from "@/store/demo-store";
import AdminRoute from "@/components/AdminRoute";
import { AuthProvider } from "@/hooks/use-auth";
import ManagerRoute from "@/components/ManagerRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <DemoStoreProvider>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              {/* PUBLIC */}
              <Route path="/" element={<LandingPage />} />

              {/* PUBLIC MENU - /:slug/menu */}
              <Route path="/:slug/menu" element={<PublicMenuPage />} />
              <Route path="/:slug/customer" element={<UserMenuPage />} />

              {/* AUTH */}
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/post-login" element={<PostLoginPage />} />
              <Route path="/order/:orderId" element={<OrderConfirmationPage />} />


              {/* STAFF PANEL */}
              <Route path="/staff" element={<StaffLayout />}>
                <Route index element={<Navigate to="orders" replace />} />
                <Route path="orders" element={<StaffOrdersPage />} />
                <Route path="menu" element={<StaffMenuPage />} />
                <Route path="menu/:orderId" element={<StaffMenuPage />} />
                <Route path="stock" element={<StaffStockPage />} />
              </Route>
              {/* REDIRECTS FOR LEGACY WAITERS PATHS */}
              <Route path="/waiter" element={<Navigate to="/staff/orders" replace />} />
              <Route path="/waiter/orders" element={<Navigate to="/staff/orders" replace />} />
              <Route path="/waiter/menu" element={<Navigate to="/staff/menu" replace />} />
              <Route path="/waiter/stock" element={<Navigate to="/staff/stock" replace />} />

              {/* RESTAURANT SETUP */}
              <Route path="/restaurant/setup" element={<RestaurantSetupPage />} />

              {/* CUSTOMER MENU */}
              <Route path="/menu" element={<CustomerEntry />} />

              {/* ADMIN */}
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>} >
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="products" element={<AdminProductsPage />} />
                <Route path="campaigns" element={<AdminCampaignPage />} />
                <Route path="customers" element={<AdminCustomersPage />} />
                <Route path="analytics" element={<AdminAnalyticsPage />} />

                {/* ✅ COMPANY SECTION (Profile now has Tables) */}
                <Route path="company/profile" element={<CompanyProfilePage />} />
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
                element={
                  <ManagerRoute>
                    <ManagerLayout />
                  </ManagerRoute>
                }
              >
                <Route path="dashboard" element={<ManagerDashboardPage />} />
                <Route path="orders" element={<ManagerOrdersPage />} />
                <Route path="stock" element={<ManagerStockPage />} />
                <Route path="customers" element={<ManagerCustomersPage />} />
                <Route path="company/profile" element={<CompanyProfilePage />} />
                <Route path="company/staff" element={<StaffPage />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </DemoStoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);
export default App;
