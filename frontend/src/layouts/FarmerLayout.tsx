import { useEffect, useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/DashboardSidebar";
import { LayoutDashboard, Package, ShoppingCart, PlusCircle, BarChart3, User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

const farmerMenu = [
  { title: "Dashboard", url: "/farmer", icon: LayoutDashboard },
  { title: "Products", url: "/farmer/products", icon: Package },
  { title: "Add Product", url: "/farmer/products/new", icon: PlusCircle },
  { title: "Orders", url: "/farmer/orders", icon: ShoppingCart },
  { title: "Analytics", url: "/farmer/analytics", icon: BarChart3 },
  { title: "Profile", url: "/farmer/profile", icon: User },
];

export default function FarmerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement | null>(null);

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    user?.farmer_profile?.farm_name?.trim() ||
    "Farmer";

  // Show each newly selected page from the top.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-clip">
        <DashboardSidebar title="Farmer Panel" items={farmerMenu} onLogout={handleLogout} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border bg-card px-3 sm:px-4">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger aria-label="Toggle navigation menu" className="shrink-0" />
              <span className="truncate font-display text-base text-foreground sm:text-lg">
                <span className="hidden sm:inline">Farm Connect — </span>Farmer
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:gap-3">
              <span className="hidden max-w-[12rem] truncate text-sm text-muted-foreground md:inline">
                {displayName}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Logout">
                <LogOut className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </header>
          <main
            ref={mainRef}
            tabIndex={-1}
            className="min-w-0 flex-1 bg-background p-3 outline-none sm:p-6"
          >
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
