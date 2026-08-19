 import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { ArrowRight, Truck, Shield, Leaf, Star, Clock, ThumbsUp, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useQuery } from "@tanstack/react-query";
import { productService } from "@/lib/services/product-service";
import { ProductCardSkeleton } from "@/components/Skeletons";
import heroImage from "@/assets/farm-fresh2.jpg";
import catFruits from "@/assets/cat-fruits.jpg";
import catVegetables from "@/assets/cat-vegetables.jpg";
import catGrains from "@/assets/cat-grains.jpg";
import catDairy from "@/assets/cat-dairy.jpg";
 import catHoney from "@/assets/cat-honey.jpg";
import catHerbs from "@/assets/cat-herbs.jpg";

const categoryImages: Record<string, string> = {
  fruits: catFruits,
  vegetables: catVegetables,
  'dairy-eggs': catDairy,
  'herbs-spices': catHerbs,
  'honey-preserves': catHoney,
  'grains-cereals': catGrains,
  grains: catGrains,
  dairy: catDairy,
  livestock: catLivestock,
};

// Updated features with better descriptions and icons
const features = [
  { icon: Leaf, title: "100% Organic", desc: "Certified chemical-free produce from sustainable farms" },
  { icon: Truck, title: "Farm to Door", desc: "Freshly harvested and delivered within 24 hours" },
  { icon: Shield, title: "Quality Assured", desc: "Every product hand-selected for premium freshness" },
];

// NEW: Testimonials data for social proof
const testimonials = [
  { name: "Nicole M.", role: "Regular Customer", text: "The freshest vegetables I've ever bought! Delivery is always on time.", rating: 4 },
  { name: "Tavonga U.", role: "Chef", text: "Farm Fresh Hub is my go-to for organic ingredients. Superior quality every time.", rating: 5 },
  { name: "Kudzai M.", role: "Health Coach", text: "Supporting local farmers has never been easier. Love the variety!", rating: 5 },
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

  // Fade-up animation variants for cleaner code
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-white to-gray-50/50">
      <Navbar />

      {/* ========== HERO SECTION - Enhanced ========== */}
      <section className="relative overflow-hidden">
        {/* Background with parallax effect */}
        <div className="absolute inset-0">
          <img 
            src={heroImage} 
            alt="Farm landscape" 
            className="h-full w-full object-cover" 
          />
          {/* Darker, more sophisticated overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/40" />
          {/* Decorative accent line */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400" />
        </div>

        <div className="container relative z-10 flex min-h-[600px] flex-col items-start justify-center py-20">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="max-w-2xl"
          >
            {/* Badge - Modern pill design */}
            <motion.span 
              variants={fadeUp}
              className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white/90 border border-white/10"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              🌱 Fresh Harvest
            </motion.span>

            {/* Main Headline - More impactful */}
            <motion.h1 
              variants={fadeUp}
              className="mb-6 font-display text-4xl leading-tight text-white md:text-5xl lg:text-6xl lg:leading-tight"
            >
              Fresh Produce,
              <br />
              Delivered to You
               
            </motion.h1>

            {/* Subtitle - More descriptive */}
            <motion.p 
              variants={fadeUp}
              className="mb-10 max-w-lg text-lg text-white/70 leading-relaxed"
            >
              Discover the taste of truly fresh, organic produce. 
              We connect you directly with local farmers who grow food with passion and care.
            </motion.p>

            {/* CTA Buttons - Enhanced with better hierarchy */}
            <motion.div 
              variants={fadeUp}
              className="flex flex-wrap items-center gap-4"
            >
              <Link to="/marketplace">
                <Button 
                  size="lg"
                  variant="outline"
                  className="group gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300 px-8"
                >
                  Explore Marketplace
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/register">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className= "group gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg shadow-green-500/25 hover:shadow-green-500/40 transition-all duration-300 px-8"
                >
                  Sell Your Products 
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>

            {/* Trust indicators - NEW */}
            <motion.div 
              variants={fadeUp}
              className="mt-10 flex items-center gap-6 text-white/60 text-sm"
            >
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-4 w-4 text-green-400" />
                <span>Trusted by 5,000+ customers</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-green-400" />
                <span>Fresh delivered daily</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ========== FEATURES SECTION - Enhanced ========== */}
      <section className="relative -mt-6 px-4">
        <div className="container mx-auto">
          <div className="grid gap-4 sm:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-lg shadow-gray-200/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Gradient accent bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500" />
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 text-green-600 group-hover:scale-110 transition-transform duration-300">
                    <f.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-gray-900">{f.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed mt-0.5">{f.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CATEGORIES SECTION - Enhanced ========== */}
      <section className="py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <span className="text-sm font-semibold text-green-600 uppercase tracking-wider">Categories</span>
            <h2 className="mt-2 font-display text-3xl font-bold text-gray-900 md:text-4xl">
              Shop by <span className="text-green-700">Category</span>
            </h2>
            <p className="mt-3 text-gray-500 max-w-md mx-auto">
              Explore our curated selection of farm-fresh products
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categoriesList.map((cat, i) => (
              <motion.div
                key={cat.slug}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <Link
                  to={`/marketplace?category=${cat.slug}`}
                  className="group relative flex aspect-square flex-col items-center justify-end overflow-hidden rounded-2xl shadow-md"
                >
                  <img 
                    src={categoryImages[cat.slug]} 
                    alt={cat.name} 
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  />
                  {/* Overlay - Darker for better text contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                  {/* Category name with better styling */}
                  <span className="relative z-10 mb-4 font-display text-lg font-semibold text-white drop-shadow-lg">
                    {cat.name}
                  </span>
                  {/* Hover indicator */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-0 bg-white transition-all duration-300 group-hover:w-1/3" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FEATURED PRODUCTS - Enhanced ========== */}
      <section className="bg-gray-50/80 py-20">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center"
          >
            <div>
              <span className="text-sm font-semibold text-green-600 uppercase tracking-wider">Collection</span>
              <h2 className="mt-1 font-display text-3xl font-bold text-gray-900">
                Featured <span className="text-green-600">Products</span>
              </h2>
            </div>
            <Link to="/marketplace">
              <Button 
                variant="ghost" 
                className="group gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
              >
                View All Products
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))
            ) : (
              featured.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4 }}
                >
                  <ProductCard product={p} />
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ========== TESTIMONIALS SECTION - NEW ========== */}
      <section className="py-20 bg-white">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center"
          >
            <span className="text-sm font-semibold text-green-600 uppercase tracking-wider">Testimonials</span>
            <h2 className="mt-2 font-display text-3xl font-bold text-gray-900">
              What Our <span className="text-green-600">Customers Say</span>
            </h2>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group rounded-2xl bg-gray-50/80 p-6 transition-all duration-300 hover:bg-white hover:shadow-lg"
              >
                <div className="flex gap-1 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 leading-relaxed">"{t.text}"</p>
                <div className="mt-4">
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  <p className="text-sm text-gray-500">{t.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION - Enhanced ========== */}
      <section className="relative overflow-hidden bg-gradient-to-r from-green-700 to-emerald-800 py-20">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-white/5" />
        
        <div className="container relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="inline-block rounded-full bg-white/10 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white/90 border border-white/10 mb-6">
              🌾 Join Our Community
            </span>
            <h2 className="mb-4 font-display text-3xl font-bold text-white md:text-4xl">
              Are You a Farmer or Producer?
            </h2>
            <p className="mx-auto mb-10 max-w-lg text-white/80 leading-relaxed">
              Join thousands of farmers who are already selling their produce directly to customers. 
              No middlemen, fair prices, and a growing community of food lovers.
            </p>
            <Link to="/register">
              <Button 
                size="lg" 
                className="bg-white text-green-700 hover:bg-gray-100 font-semibold shadow-lg shadow-black/20 hover:shadow-black/30 transition-all duration-300 px-8"
              >
                Start Selling Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;