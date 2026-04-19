import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ArrowLeft, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function CartPage() {
  const { items, updateQuantity, removeItem, totalPrice } = useCart();
  const delivery = items.length > 0 ? 5.00 : 0;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex-1 py-8">
        <h1 className="mb-8 font-display text-3xl text-foreground">Shopping Cart</h1>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground/40" />
            <h2 className="mb-2 font-display text-xl text-foreground">Your cart is empty</h2>
            <p className="mb-6 text-muted-foreground">Add some fresh farm products to get started!</p>
            <Link to="/marketplace"><Button>Browse Marketplace</Button></Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Items */}
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-border bg-card">
                {/* Header */}
                <div className="hidden border-b border-border px-6 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[2fr,1fr,1fr,auto]">
                  <span>Product</span><span className="text-center">Qty</span><span className="text-right">Price</span><span></span>
                </div>
                {items.map((item) => (
                  <div key={item.id} className="flex flex-col gap-4 border-b border-border p-4 last:border-0 sm:grid sm:grid-cols-[2fr,1fr,1fr,auto] sm:items-center sm:px-6">
                    <div>
                      <p className="font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.farmer}</p>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="flex items-center rounded-md border border-input">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-2 py-1 text-foreground hover:bg-muted"><Minus className="h-3 w-3" /></button>
                        <span className="min-w-[32px] text-center text-sm">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-2 py-1 text-foreground hover:bg-muted"><Plus className="h-3 w-3" /></button>
                      </div>
                    </div>
                    <span className="text-right font-medium text-foreground">${(item.price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeItem(item.id)} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <Link to="/marketplace" className="mt-4 inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <ArrowLeft className="h-4 w-4" /> Continue Shopping
              </Link>
            </div>

            {/* Summary */}
            <div className="h-fit rounded-lg border border-border bg-card p-6">
              <h3 className="mb-4 font-display text-lg text-foreground">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${totalPrice.toFixed(2)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>${delivery.toFixed(2)}</span></div>
                <div className="border-t border-border pt-2">
                  <div className="flex justify-between text-base font-bold text-foreground"><span>Total</span><span>${(totalPrice + delivery).toFixed(2)}</span></div>
                </div>
              </div>
              <Link to="/checkout">
                <Button className="mt-6 w-full" size="lg">Proceed to Checkout</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
