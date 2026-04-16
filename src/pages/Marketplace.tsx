import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProductCard from "@/components/ProductCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { products, categories } from "@/lib/mock-data";
import { ProductCardSkeleton } from "@/components/Skeletons";

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial data loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const activeCategory = searchParams.get("category") || "";

  const filtered = useMemo(() => {
    let result = products;
    if (activeCategory) result = result.filter((p) => p.category === activeCategory);
    if (search) result = result.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.farmer.toLowerCase().includes(search.toLowerCase()));
    if (sortBy === "price-asc") result = [...result].sort((a, b) => a.price - b.price);
    if (sortBy === "price-desc") result = [...result].sort((a, b) => b.price - a.price);
    return result;
  }, [activeCategory, search, sortBy]);

  const setCategory = (slug: string) => {
    if (slug === activeCategory) {
      searchParams.delete("category");
    } else {
      searchParams.set("category", slug);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <div className="container flex-1 py-8">
        {/* Top Bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-display text-3xl text-foreground">Marketplace</h1>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="hidden rounded-md border border-input bg-card px-3 py-2 text-sm sm:block"
            >
              <option value="newest">Newest</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="price-desc">Price: High → Low</option>
            </select>
            <Button variant="outline" size="icon" className="sm:hidden" onClick={() => setShowFilters(!showFilters)}>
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <aside className={`${showFilters ? "block" : "hidden"} w-full shrink-0 sm:block sm:w-48`}>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-display text-sm text-foreground">Categories</h3>
                {activeCategory && (
                  <button onClick={() => setCategory("")} className="text-xs text-primary hover:underline">Clear</button>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat.slug}
                    onClick={() => setCategory(cat.slug)}
                    className={`rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      activeCategory === cat.slug ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Product Grid */}
          <div className="flex-1">
            {activeCategory && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Filtered by:</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {activeCategory}
                  <button onClick={() => setCategory("")}><X className="h-3 w-3" /></button>
                </span>
              </div>
            )}
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                No products found. Try a different search or category.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
