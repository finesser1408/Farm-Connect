 // src/components/ProductCard.tsx
import { ShoppingCart, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart-context";
import { Link } from "react-router-dom";
import type { Product } from "@/lib/services/product-service";
import { getImageUrl } from "@/lib/api-client" ;  // ✅ Import this

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      id: product.id.toString(),
      name: product.name,
      price: parseFloat(product.price),
      image: product.image || "",
      farmer: product.farmer_name,
    });
  };

  return (
    <Link
      to={`/product/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card shadow-card transition-shadow hover:shadow-card-hover"
    >
      {/* IMAGE SECTION */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        <img
          src={getImageUrl(product.image)} //change
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            // If image fails to load, show a colored background with product name
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              parent.style.backgroundColor = '#e5e7eb';
              parent.innerHTML = `
                <div class="flex h-full w-full items-center justify-center text-center p-4">
                  <span class="text-sm font-medium text-gray-600">${product.name}</span>
                </div>
              `;
            }
          }}
        />
      </div>
      
      <div className="flex flex-1 flex-col p-4">
        <span className="mb-1 text-xs font-medium uppercase tracking-wide text-primary">{product.category_details?.name}</span>
        <h3 className="font-display text-base text-foreground group-hover:text-primary">{product.name}</h3>
        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {product.farmer_name}
        </div>
        <div className="mt-auto flex items-center justify-between pt-3">
          <span className="text-lg font-bold text-foreground">$ {parseFloat(product.price).toFixed(2)}</span>
          <Button size="sm" onClick={handleAdd} className="gap-1.5">
            <ShoppingCart className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </div>
    </Link>
  );
}
