import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, ClipboardList, Package, Users, Store, UserCog, LogOut, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar
} from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useRealtimeStore } from "@/stores/realtime";
import { useAdminOrdersStore } from "@/stores/orders";
import { useRestaurantStore } from "@/stores/restaurant/restaurant.store";
import { logoutStaffSession } from "@/lib/staff-session";

const NAV_ITEMS = [
  { to: "/manager/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/manager/orders", label: "Orders", icon: ClipboardList },
  { to: "/manager/stock", label: "Stock", icon: Package },
  { to: "/manager/customers", label: "Customers", icon: Users },
  { to: "/manager/company/profile", label: "Restaurant", icon: Store },
  { to: "/manager/company/staff", label: "Staff", icon: UserCog },
];

interface StaffData {
  name?: string;
  role?: string;
}

interface RestaurantData {
  name?: string;
  logo_url?: string;
}

export default function ManagerLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [staff, setStaff] = useState<StaffData | null>(null);
  const { restaurant, fetchRestaurant } = useRestaurantStore();

  useEffect(() => {
    // Ensure no lingering realtime connections in manager views
    useRealtimeStore.getState().unsubscribeAll();
    useAdminOrdersStore.getState().unsubscribe();

    const token = localStorage.getItem('staff_token') || localStorage.getItem('waiter_token');
    const staffData = localStorage.getItem('staff_data') || localStorage.getItem('waiter_data');
    const restaurantData = localStorage.getItem('staff_restaurant') || localStorage.getItem('waiter_restaurant');

    if (!token || !staffData) {
      navigate('/auth/login');
      return;
    }

    try {
      const parsed = JSON.parse(staffData);
      if (parsed?.role !== 'MANAGER') {
        navigate('/staff/orders');
        return;
      }
      setStaff(parsed);
    } catch {
      navigate('/auth/login');
      return;
    }

    // Fetch restaurant data if missing
    if (!restaurant) {
      fetchRestaurant();
    }
  }, [navigate, restaurant, fetchRestaurant]);

  const handleLogout = async () => {
    await logoutStaffSession();
    toast.success("Logged out successfully");
    navigate('/auth/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <SidebarProvider defaultOpen={true}>
        <ManagerSidebar
          restaurant={restaurant}
          onLogout={() => setLogoutOpen(true)}
          pathname={location.pathname}
        />
        <SidebarInset className="bg-slate-50 flex flex-col flex-1 min-w-0 transition-all duration-300 ease-in-out">
          <div className="max-w-7xl mx-auto px-4 py-6 w-full">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Log out</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">Are you sure you want to log out?</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setLogoutOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800" onClick={handleLogout}>
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ManagerSidebar({
  restaurant,
  onLogout,
  pathname,
}: {
  restaurant: any;
  onLogout: () => void;
  pathname: string;
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const storeName = restaurant?.name || "Restaurant";
  const storeLogo = restaurant?.logo_url;
  const tagline = restaurant?.tagline || "Manager Console";

  return (
    <Sidebar
      collapsible="icon"
      variant="sidebar"
      className="border-r border-slate-200/70 bg-white"
    >
      <SidebarHeader className="p-4 bg-white text-slate-900 flex flex-row items-center justify-center border-b border-slate-200/60 h-16">
        <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:hidden transition-all duration-300 flex-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg overflow-hidden">
            {storeLogo ? (
              <img src={storeLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <UtensilsCrossed className="h-5 w-5" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="truncate text-[14px] font-black tracking-tight text-slate-900 leading-none mb-1 uppercase">
              {storeName}
            </span>
            <span className="truncate text-[9px] uppercase tracking-[0.2em] text-slate-400 font-black">
              {tagline}
            </span>
          </div>
        </div>
        <SidebarTrigger className="text-slate-300 hover:text-slate-900 hover:bg-slate-100 h-9 w-9 transition-all shrink-0" />
      </SidebarHeader>

      <SidebarContent className="bg-white py-2 px-2">
        <SidebarMenu className="gap-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.to;
            return (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.label}
                  isActive={isActive}
                  className={cn(
                    "hover:bg-slate-100 hover:text-slate-900 data-[active=true]:bg-slate-900 data-[active=true]:text-white transition-all rounded-lg h-10 px-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
                  )}
                >
                  <NavLink to={item.to} className="flex items-center gap-3 w-full group-data-[collapsible=icon]:justify-center">
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className={cn("text-sm font-semibold", isCollapsed && "hidden")}>{item.label}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-4 bg-white border-t border-slate-200/60 mt-auto">
        <Button
          className="w-full justify-start text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg h-10 transition-all group border border-transparent"
          variant="ghost"
          onClick={onLogout}
        >
          <LogOut className="mr-3 h-[18px] w-[18px] opacity-60 group-hover:opacity-100 transition-all" />
          <span className="text-sm font-bold tracking-tight group-data-[collapsible=icon]:hidden">Sign Out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
