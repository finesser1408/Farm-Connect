import { Link } from "react-router-dom";
import { ShoppingCart, Search, Menu, X, Leaf, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { useState } from "react";

export default function Navbar() {
  const { totalItems } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-display text-xl text-primary">
          <Leaf className="h-6 w-6" />
          FarmFresh
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">Home</Link>
          <Link to="/marketplace" className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">Marketplace</Link>
          <Link to="/cart" className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary">Cart</Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link to="/marketplace">
            <Button variant="ghost" size="icon" className="text-foreground/70 hover:text-primary">
              <Search className="h-5 w-5" />
            </Button>
          </Link>
          <Link to="/cart" className="relative">
            <Button variant="ghost" size="icon" className="text-foreground/70 hover:text-primary">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </Button>
          </Link>
          <Link to="/login" className="hidden md:block">
            <Button variant="outline" size="sm" className="gap-2">
              <User className="h-4 w-4" /> Login
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <div className="border-t border-border bg-card p-4 md:hidden">
          <nav className="flex flex-col gap-3">
            <Link to="/" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">Home</Link>
            <Link to="/marketplace" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">Marketplace</Link>
            <Link to="/cart" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">Cart</Link>
            <Link to="/login" onClick={() => setMobileOpen(false)} className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">Login / Register</Link>
          </nav>
        </div>
      )}
    </header>
  );
}
