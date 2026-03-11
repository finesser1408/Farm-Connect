import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/DashboardSidebar";
import { LayoutDashboard, Package, ShoppingCart, PlusCircle, BarChart3, User, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useNavigate } from "react-router-dom";
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

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar title="Farmer Panel" items={farmerMenu} />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="font-display text-lg text-foreground">FarmFresh — Farmer</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{user?.name || "Farmer"}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="mr-1 h-4 w-4" /> Logout</Button>
            </div>
          </header>
          <main className="flex-1 bg-background p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
