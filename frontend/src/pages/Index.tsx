import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowRight, Truck, Shield, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { productService } from "@/lib/services/product-service";
import { ProductCardSkeleton } from "@/components/Skeletons";
import heroImage from "@/assets/hero-farm.jpg";
import catFruits from "@/assets/cat-fruits.jpg";
import catVegetables from "@/assets/cat-vegetables.jpg";
import catGrains from "@/assets/cat-grains.jpg";
import catDairy from "@/assets/cat-dairy.jpg";
import catLivestock from "@/assets/cat-livestock.jpg";

const categoryImages: Record<string, string> = {
  fruits: catFruits,
  vegetables: catVegetables,
  'dairy-eggs': catDairy,
  'herbs-spices': catGrains,
  'honey-preserves': catDairy,
  'grains-cereals': catGrains,
  grains: catGrains,
  dairy: catDairy,
  livestock: catLivestock,
};

const features = [
  { icon: Leaf, title: "100% Organic", desc: "Naturally grown, chemical-free produce" },
  { icon: Truck, title: "Farm to Door", desc: "Direct delivery from local farmers" },
  { icon: Shield, title: "Quality Assured", desc: "Every product inspected for freshness" },
];

const Index = () => {
  const { data: productsData, isLoading: isProductsLoading } = useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => productService.getProducts({ page_size: 8 }),
  });

  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => productService.getCategories(),
  });

  const featured = productsData 
    ? (Array.isArray(productsData) ? productsData : productsData.results)
    : [];
  const categoriesList = categoriesData || [];
  const isLoading = isProductsLoading || isCategoriesLoading;

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Farm landscape" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-primary/40" />
        </div>
        <div className="container relative z-10 flex min-h-[520px] flex-col items-start justify-center py-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="mb-4 inline-block rounded-full bg-accent px-4 py-1 text-sm font-semibold text-accent-foreground">
              🌱 Farm-Fresh Marketplace
            </span>
            <h1 className="mb-4 max-w-xl font-display text-4xl leading-tight text-primary-foreground md:text-5xl lg:text-6xl">
              From the Farm, Straight to Your Table
            </h1>
            <p className="mb-8 max-w-md text-lg text-primary-foreground/80">
              Discover fresh, organic produce from local farmers. Support sustainable agriculture and eat healthier.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/marketplace">
                <Button size="lg" variant="secondary" className="gap-2 font-semibold">
                  Shop Now <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/register">
                <Button size="lg" className="bg-accent text-accent-foreground font-semibold hover:bg-accent/90 shadow-sm transition-transform hover:scale-[1.02]">
                  Sell Your Produce
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-border bg-card py-10">
        <div className="container grid gap-6 sm:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-start gap-4 rounded-lg p-4"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-sm text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="container">
          <h2 className="mb-8 text-center font-display text-3xl text-foreground">Shop by Category</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categoriesList.map((cat, i) => (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/marketplace?category=${cat.slug}`}
                  className="group relative flex aspect-square flex-col items-center justify-end overflow-hidden rounded-lg"
                >
                  <img src={categoryImages[cat.slug]} alt={cat.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 to-transparent" />
                  <span className="relative z-10 mb-4 font-display text-lg text-primary-foreground">{cat.name}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-muted/50 py-16">
        <div className="container">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="font-display text-3xl text-foreground">Featured Products</h2>
            <Link to="/marketplace">
              <Button variant="ghost" className="gap-1 text-primary">
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))
            ) : (
              featured.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <ProductCard product={p} />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-16 text-center">
        <div className="container">
          <h2 className="mb-4 font-display text-3xl text-primary-foreground">Are You a Farmer?</h2>
          <p className="mx-auto mb-8 max-w-md text-primary-foreground/80">
            Join Farm Connect and sell your produce directly to customers. No middlemen, fair prices.
          </p>
          <Link to="/register">
            <Button size="lg" variant="secondary" className="font-semibold">
              Start Selling Today
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
