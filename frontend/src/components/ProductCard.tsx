import { ShoppingCart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { Link } from "react-router-dom";
import type { Product } from "@/lib/mock-data";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      farmer: product.farmer,
    });
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        <div className="flex h-full items-center justify-center bg-muted text-6xl transition-transform duration-500 group-hover:scale-110">
          {product.category === "fruits" && "🍓"}
          {product.category === "vegetables" && "🥬"}
          {product.category === "grains" && "🌾"}
          {product.category === "dairy" && "🧀"}
          {product.category === "livestock" && "🥚"}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <span className="mb-1 text-xs font-medium uppercase tracking-wide text-primary">{product.category}</span>
        <h3 className="font-display text-base text-foreground group-hover:text-primary">{product.name}</h3>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {product.farmer} · {product.farmLocation}
        </div>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-lg font-bold text-foreground">${product.price.toFixed(2)}</span>
          <Button size="sm" onClick={handleAdd} className="gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>
    </Link>
  );
}
