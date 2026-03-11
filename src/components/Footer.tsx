import { Leaf } from "lucide-react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-primary text-primary-foreground">
      <div className="container py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="mb-4 flex items-center gap-2 font-display text-xl">
              <Leaf className="h-5 w-5" /> FarmFresh
            </div>
            <p className="text-sm text-primary-foreground/70">
              Connecting local farmers directly to your table. Fresh, organic, and sustainably grown produce.
            </p>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm">Quick Links</h4>
            <nav className="flex flex-col gap-2 text-sm text-primary-foreground/70">
              <Link to="/" className="hover:text-primary-foreground">Home</Link>
              <Link to="/marketplace" className="hover:text-primary-foreground">Marketplace</Link>
              <Link to="/cart" className="hover:text-primary-foreground">Cart</Link>
            </nav>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm">For Farmers</h4>
            <nav className="flex flex-col gap-2 text-sm text-primary-foreground/70">
              <Link to="/register" className="hover:text-primary-foreground">Register as Farmer</Link>
              <Link to="/login" className="hover:text-primary-foreground">Farmer Login</Link>
            </nav>
          </div>
          <div>
            <h4 className="mb-3 font-display text-sm">Contact</h4>
            <div className="flex flex-col gap-2 text-sm text-primary-foreground/70">
              <span>info@farmfresh.co.zw</span>
              <span>+263 77 123 4567</span>
              <span>Harare, Zimbabwe</span>
            </div>
          </div>
        </div>
        <div className="mt-8 border-t border-primary-foreground/20 pt-6 text-center text-xs text-primary-foreground/50">
          © 2026 FarmFresh. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
