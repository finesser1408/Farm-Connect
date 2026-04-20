import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import DashboardSidebar from "@/components/DashboardSidebar";
import { LayoutDashboard, Users, Sprout, Package, ShoppingCart, DollarSign, BarChart3, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

const adminMenu = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Farmers", url: "/admin/farmers", icon: Sprout },
  { title: "Products", url: "/admin/products", icon: Package },
  { title: "Orders", url: "/admin/orders", icon: ShoppingCart },
  { title: "Reports", url: "/admin/reports", icon: BarChart3 },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate("/"); };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <DashboardSidebar title="Admin Panel" items={adminMenu} />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <span className="font-display text-lg text-foreground">Farm Connect — Admin</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{user?.name || "Admin"}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}><LogOut className="mr-1 h-4 w-4" /> Logout</Button>
            </div>
          </header>
          <main className="flex-1 bg-background p-6"><Outlet /></main>
        </div>
      </div>
    </SidebarProvider>
  );
}
