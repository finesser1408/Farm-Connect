import { useParams, Link } from "react-router-dom";
import { ShoppingCart, MapPin, Star, ArrowLeft, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { useQuery } from "@tanstack/react-query";
import { productService } from "@/lib/services/product-service";

export default function ProductDetails() {
  const { id: slug } = useParams();
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<"description" | "reviews">("description");

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: () => productService.getProductBySlug(slug!),
    enabled: !!slug,
  });

  const { data: relatedProducts } = useQuery({
    queryKey: ["products", "related", product?.category_details?.slug],
    queryFn: () => productService.getProducts({ category: product?.category_details?.slug }),
    enabled: !!product?.category_details?.slug,
  });

  const related = (relatedProducts || []).filter((p: any) => p.slug !== slug).slice(0, 4);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="container flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-2xl animate-pulse">Loading Product...</h1>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="container flex flex-1 items-center justify-center">
          <div className="text-center">
            <h1 className="font-display text-2xl">Product Not Found</h1>
            <Link to="/marketplace" className="mt-4 inline-block text-primary hover:underline">Back to Marketplace</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const emoji: Record<string, string> = { fruits: "🍓", vegetables: "🥬", grains: "🌾", dairy: "🧀", livestock: "🥚" };

  const handleAdd = () => {
    for (let i = 0; i < qty; i++) {
      addItem({ id: product.id, name: product.name, price: product.price, image: product.image, farmer: product.farmer });
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="container flex-1 py-8">
        <Link to="/marketplace" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to Marketplace
        </Link>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Image */}
          <div className="flex aspect-square items-center justify-center rounded-lg bg-muted text-[120px] overflow-hidden">
            {product.image ? (
              <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              emoji[product.category_details?.slug || ""] || "🌿"
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <span className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">{product.category_details?.name}</span>
            <h1 className="mb-2 font-display text-3xl text-foreground">{product.name}</h1>
            <div className="mb-4 flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Star className="h-4 w-4 fill-accent text-accent" /> 4.5</span>
              <span>(24 reviews)</span>
            </div>
            <div className="mb-2 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" /> {product.farmer_name}
            </div>
            <span className="mb-6 text-3xl font-bold text-foreground">${parseFloat(product.price).toFixed(2)}</span>

            {/* Quantity */}
            <div className="mb-6 flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Quantity:</span>
              <div className="flex items-center rounded-md border border-input">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-3 py-2 text-foreground hover:bg-muted"><Minus className="h-4 w-4" /></button>
                <span className="min-w-[40px] text-center text-sm font-medium">{qty}</span>
                <button onClick={() => setQty(qty + 1)} className="px-3 py-2 text-foreground hover:bg-muted"><Plus className="h-4 w-4" /></button>
              </div>
              <span className="text-xs text-muted-foreground">{product.stock} in stock</span>
            </div>

            <div className="flex gap-3">
              <Button size="lg" className="flex-1 gap-2" onClick={handleAdd}>
                <ShoppingCart className="h-4 w-4" /> Add to Cart
              </Button>
              <Link to="/cart" className="flex-1">
                <Button size="lg" variant="secondary" className="w-full" onClick={handleAdd}>Buy Now</Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-12">
          <div className="flex gap-6 border-b border-border">
            <button
              onClick={() => setActiveTab("description")}
              className={`pb-3 text-sm font-medium ${activeTab === "description" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
            >Description</button>
            <button
              onClick={() => setActiveTab("reviews")}
              className={`pb-3 text-sm font-medium ${activeTab === "reviews" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
            >Reviews (24)</button>
          </div>
          <div className="py-6">
            {activeTab === "description" ? (
              <p className="max-w-2xl text-muted-foreground">{product.description}</p>
            ) : (
              <p className="text-muted-foreground">Reviews coming soon.</p>
            )}
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-8">
            <h2 className="mb-6 font-display text-2xl text-foreground">Related Products</h2>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {related.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
