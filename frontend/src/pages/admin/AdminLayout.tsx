import React, { useEffect, useRef, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import QROrderNotification from "@/components/QROrderNotification";
import { useNotificationStore } from "@/stores/notifications.store";
import { useAdminOrdersStore } from "@/stores/orders/adminOrders.store";
import DemoModeBar from "@/components/DemoModeBar";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar/index";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { useDemoStore } from "@/store/demo-store"; // ✅ Import Store
import { useRestaurantStore } from "@/stores/restaurant/restaurant.store";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  Package,
  LogOut,
  Megaphone,
  Settings2,
  UtensilsCrossed,
  Briefcase,
  ChevronRight,
  Store,
  UserCog,
  ShieldCheck,
  Smartphone,
  Armchair // Table Icon
} from "lucide-react";

// Helper for Auto-Close
function SidebarAutoCloser() {
  const { setOpen, open, isMobile } = useSidebar();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    if (isMobile) return;
    if (open) {
      timerRef.current = setTimeout(() => {
        setOpen(false);
      }, 5000);
    }
  };

  useEffect(() => {
    const sidebarElement = document.querySelector('[data-variant="sidebar"]');
    if (sidebarElement) {
      sidebarElement.addEventListener('mouseenter', handleMouseEnter);
      sidebarElement.addEventListener('mouseleave', handleMouseLeave);
    }
    return () => {
      if (sidebarElement) {
        sidebarElement.removeEventListener('mouseenter', handleMouseEnter);
        sidebarElement.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [open, isMobile, setOpen]);

  return null;
}

// Menu Item Component
const HoverableMenuItem = ({
  icon: Icon,
  label,
  active,
  subItems,
  basePath,
  isCollapsed
}: {
  icon: any,
  label: string,
  active: boolean,
  subItems: { label: string, path: string, icon: any }[],
  basePath: string,
  isCollapsed: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  if (isCollapsed) {
    return (
      <SidebarMenuItem
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              tooltip={label}
              isActive={active}
              className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground transition-all w-full h-10 flex items-center justify-center p-0 rounded-lg shadow-sm"
            >
              <Icon className={cn("h-[18px] w-[18px]", active ? "text-primary-foreground" : "text-primary/60")} />
              <span className="sr-only">{label}</span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="right"
            align="start"
            className="w-56 bg-sidebar border-sidebar-border text-sidebar-foreground ml-2 shadow-2xl backdrop-blur-md p-1"
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
          >
            <DropdownMenuLabel className="text-primary text-[10px] font-black uppercase tracking-[0.2em] px-3 py-2 opacity-80">{label}</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-sidebar-border mx-1 mb-1" />
            {subItems.map((item) => (
              <DropdownMenuItem key={item.path} asChild className="focus:bg-sidebar-accent focus:text-sidebar-accent-foreground cursor-pointer hover:bg-sidebar-accent rounded-md">
                <NavLink to={item.path} className="flex items-center gap-3 w-full px-3 py-2 text-sm">
                  <item.icon className="h-4 w-4 text-primary" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible
      open={isOpen || active}
      onOpenChange={setIsOpen}
      className="group/collapsible"
    >
      <SidebarMenuItem
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={label}
            className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent transition-all w-full rounded-lg h-10 px-3"
          >
            <Icon className={cn("h-[18px] w-[18px]", active ? "text-primary" : "text-primary/60")} />
            <span className={cn("text-sm font-semibold tracking-tight", active ? "text-primary" : "text-primary/80")}>{label}</span>
            <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-30 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="border-l border-sidebar-border ml-5 my-0.5 gap-0.5">
            {subItems.map((item) => (
              <SidebarMenuSubItem key={item.path}>
                <SidebarMenuSubButton
                  asChild
                  isActive={location.pathname === item.path}
                  className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground transition-all rounded-md h-9 px-3"
                >
                  <NavLink to={item.path} className="flex items-center gap-3">
                    <item.icon className="h-3.5 w-3.5 opacity-60" />
                    <span className="text-[13px] font-medium">{item.label}</span>
                  </NavLink>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
};

// --- ADMIN SIDEBAR COMPONENT ---
function AdminSidebar() {
  const { state: storeState, clearDemoStorage } = useDemoStore();
  const prefs = storeState?.adminPreferences || {
    sidebar: { showCampaigns: true, showCustomers: true }
  };
  const { signOut } = useAuth();
  const location = useLocation();
  const pathname = location.pathname;

  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  // ✅ Get Dynamic Logo & Name from Store
  const { restaurant, fetchRestaurant } = useRestaurantStore();
  const storeName = restaurant?.name || "Resto Bilo";
  const storeLogo = restaurant?.logo_url;
  const tagline = restaurant?.tagline || "Admin Dashboard";

  // ✅ Auto-fetch restaurant data if missing (e.g., on refresh)
  useEffect(() => {
    if (!restaurant) {
      console.log('[AdminSidebar] Restaurant data missing, fetching...');
      fetchRestaurant();
    }
  }, [restaurant, fetchRestaurant]);

  const handleSignOut = async () => {
    clearDemoStorage();
    await signOut();
  };

  return (
    <>
      <SidebarAutoCloser />
      <Sidebar
        collapsible="icon"
        variant="sidebar"
        className="border-r border-primary/10 bg-background"
      >
        {/* --- HEADER --- */}
        <SidebarHeader className="p-4 bg-transparent text-primary flex flex-row items-center justify-center border-b border-primary/10 h-16">
          <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:hidden transition-all duration-300 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg overflow-hidden">
              {/* ✅ Show Dynamic Logo or Default Icon */}
              {storeLogo ? (
                <img src={storeLogo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <UtensilsCrossed className="h-5 w-5" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="truncate text-[15px] font-black tracking-tight text-primary leading-none mb-1 uppercase">{storeName}</span>
              <span className="truncate text-[9px] uppercase tracking-[0.2em] text-primary/70 font-black">{tagline}</span>
            </div>
          </div>
          <SidebarTrigger className="text-primary/30 hover:text-primary hover:bg-primary/5 h-9 w-9 transition-all shrink-0" />
        </SidebarHeader>

        <SidebarContent className="bg-transparent scrollbar-hide py-2 px-2">
          <SidebarMenu className="gap-0.5">

            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Dashboard" isActive={pathname === "/admin/dashboard"} className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground transition-all rounded-lg h-10 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                <NavLink to="/admin/dashboard" className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center">
                  <LayoutDashboard className="h-[18px] w-[18px] shrink-0" />
                  <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">Dashboard</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Orders" isActive={pathname === "/admin/orders"} className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground transition-all rounded-lg h-10 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                <NavLink to="/admin/orders" className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center">
                  <UtensilsCrossed className="h-[18px] w-[18px] shrink-0" />
                  <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">Orders</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Products" isActive={pathname === "/admin/products"} className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground transition-all rounded-lg h-10 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                <NavLink to="/admin/products" className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center">
                  <Package className="h-[18px] w-[18px] shrink-0" />
                  <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">Products</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* Campaigns - Conditional Render */}
            {prefs.sidebar.showCampaigns && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Campaigns" isActive={pathname === "/admin/campaigns"} className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground transition-all rounded-lg h-10 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                  <NavLink to="/admin/campaigns" className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center">
                    <Megaphone className="h-[18px] w-[18px] shrink-0" />
                    <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">Campaigns</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            {/* Customers - Conditional Render */}
            {prefs.sidebar.showCustomers && (
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Customers" isActive={pathname === "/admin/customers"} className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground transition-all rounded-lg h-10 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                  <NavLink to="/admin/customers" className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center">
                    <Users className="h-[18px] w-[18px] shrink-0" />
                    <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">Customers</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}

            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Analytics" isActive={pathname === "/admin/analytics"} className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-primary data-[active=true]:text-primary-foreground transition-all rounded-lg h-10 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
                <NavLink to="/admin/analytics" className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center">
                  <BarChart3 className="h-[18px] w-[18px] shrink-0" />
                  <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">Analytics</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* --- COMPANY SECTION --- */}
            <HoverableMenuItem
              icon={Briefcase}
              label="Restaurant"
              active={pathname.startsWith("/admin/company")}
              basePath="/admin/company"
              isCollapsed={isCollapsed}
              subItems={[
                { label: "Restaurant Profile", path: "/admin/company/profile", icon: Store },
                { label: "Tables", path: "/admin/company/tables", icon: Armchair },
                { label: "Staff", path: "/admin/company/staff", icon: UserCog }
              ]}
            />

            {/* --- SETTINGS SECTION --- */}
            <HoverableMenuItem
              icon={Settings2}
              label="Settings"
              active={pathname.startsWith("/admin/settings")}
              basePath="/admin/settings"
              isCollapsed={isCollapsed}
              subItems={[
                { label: "Admin Side", path: "/admin/settings/admin", icon: ShieldCheck },
                { label: "Customer Side", path: "/admin/settings/customer", icon: Smartphone }
              ]}
            />

          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-4 bg-transparent border-t border-primary/5 mt-auto">
          <Button
            className="w-full justify-start text-primary/40 hover:text-primary hover:bg-primary/5 rounded-lg h-10 transition-all group border border-transparent hover:border-primary/5"
            variant="ghost"
            onClick={handleSignOut}
          >
            <LogOut className="mr-3 h-[18px] w-[18px] opacity-40 group-hover:opacity-100 transition-all" />
            <span className="text-sm font-bold tracking-tight group-data-[collapsible=icon]:hidden">Sign Out</span>
          </Button>
          {/* <div className="mt-4 text-center group-data-[collapsible=icon]:hidden">
            <p className="text-[10px] uppercase tracking-widest text-white/30 font-bold">Powered by</p>
            <p className="text-xs font-black text-accent tracking-tighter opacity-80">EATNBILL</p>
          </div> */}
        </SidebarFooter>
      </Sidebar>
    </>
  );
}

// --- MAIN LAYOUT ---
export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <DemoModeBar />
      <div className="flex flex-1 overflow-hidden relative">
        <SidebarProvider defaultOpen={true}>
          <AdminSidebar />
          <SidebarInset className="bg-background flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out">
            <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
              <Outlet />
            </div>
          </SidebarInset>
        </SidebarProvider>

        {/* Real-time QR Order Notification Popup */}
        <NotificationWrapper />
      </div>
    </div>
  );
}

function NotificationWrapper() {
  const navigate = useNavigate();
  const { current, dismissNotification } = useNotificationStore();
  const { fetchOrders } = useAdminOrdersStore();

  const handleViewDetails = (order: any) => {
    // Refresh orders to make sure the new one is there
    fetchOrders();
    // Navigate to orders page
    navigate('/admin/orders');
    // Dismiss popup
    dismissNotification();
  };

  return (
    <QROrderNotification
      order={current}
      onDismiss={dismissNotification}
      onViewDetails={handleViewDetails}
    />
  );
}