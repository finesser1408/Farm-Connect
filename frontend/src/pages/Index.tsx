 import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { ArrowRight, Truck, Shield, Leaf, Star, ChevronRight, MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import ProductCard from "@/components/ProductCard";
import ShopByCategorySection from "@/components/ShopByCategorySection";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TestimonialSubmissionModal from "@/components/TestimonialSubmissionModal";
import { useQuery } from "@tanstack/react-query";
import { productService } from "@/lib/services/product-service";
import { reviewService } from "@/lib/services/review-service";
import { useAuth } from "@/lib/auth-context";
import { ProductCardSkeleton } from "@/components/Skeletons";
import heroImage from "@/assets/tractor.jpg";
import catFruits from "@/assets/cat-fruits.jpg";
import catVegetables from "@/assets/cat-vegetables.jpg";
import catGrains from "@/assets/cat-grains.jpg";
import catDairy from "@/assets/cat-dairy.jpg";
 import catHoney from "@/assets/cat-honey.jpg";
import catHerbs from "@/assets/cat-herbs.jpg";
import catLivestock from "@/assets/cat-livestock.jpg";
import carrotsImage from "@/assets/carrots.jpg";
import spinachImage from "@/assets/spinach.jpg";
import smilingFarmerImage from "@/assets/Smiling Farmer in Sunrise Fields.png";
import beansImage from "@/assets/beans.jpg";
import potatoesImage from "@/assets/Potatoes.jpg";
import farmerGardenImage from "@/assets/farmer in the garden.jpg";
import groundnutsImage from "@/assets/groundnuts.jpg";
import vegetablesImage from "@/assets/vegetables.jpg";
import grainsImage from "@/assets/grains.jpg";
import tomatoesImage from "@/assets/tomatoes.jpg";
import chickensEggsImage from "@/assets/chickens  and eggs.jpg";

const categoryImages: Record<string, string> = {
  fruits: catFruits,
  vegetables: catVegetables,
  'dairy-eggs': catDairy,
  'herbs-spices': catHerbs,
  'honey-preserves': catHoney,
  'grains-and-cereals': catGrains,
  'grains-cereals': catGrains,
  grains: catGrains,
  'legumes-and-pulses': catGrains,
  'root-and-tuber-crops': catVegetables,
  oilseeds: catGrains,
  dairy: catDairy,
  'livestock-and-poultry': catLivestock,
  livestock: catLivestock,
};

// Features with descriptions and icons
const features = [
  { icon: Leaf, title: "100% Organic", desc: "Certified chemical-free produce from sustainable farms" },
  { icon: Truck, title: "Farm to Door", desc: "Freshly harvested and delivered within 24 hours" },
  { icon: Shield, title: "Quality Assured", desc: "Every product hand-selected for premium freshness" },
];

const heroCollageImages = [
  { src: beansImage, alt: "A harvest of beans and pulses", objectPosition: "50% 50%" },
  { src: potatoesImage, alt: "Freshly harvested potatoes", objectPosition: "50% 50%" },
  { src: farmerGardenImage, alt: "A farmer tending crops in a garden", objectPosition: "50% 58%" },
  { src: groundnutsImage, alt: "Groundnuts growing on a healthy plant", objectPosition: "50% 72%" },
  { src: vegetablesImage, alt: "A basket of fresh green vegetables", objectPosition: "50% 50%" },
  { src: grainsImage, alt: "A selection of grains and cereals", objectPosition: "50% 50%" },
  { src: tomatoesImage, alt: "Fresh tomatoes growing on the vine", objectPosition: "50% 50%" },
  { src: chickensEggsImage, alt: "Free-range chickens and fresh eggs", objectPosition: "50% 55%" },
];

const mobileHeroImages = [heroCollageImages[3], heroCollageImages[1], heroCollageImages[5]];
const initialHeroFrameImages = [2, 0, 1, 3, 4, 5];
const heroFrameClasses = [
  "home-hero__enter--frame-1 home-hero__frame--focal",
  "home-hero__enter--frame-2 home-hero__frame--beans",
  "home-hero__enter--frame-3 home-hero__frame--potatoes",
  "home-hero__enter--frame-4 home-hero__frame--groundnuts",
  "home-hero__enter--frame-5 home-hero__frame--vegetables",
  "home-hero__enter--frame-6 home-hero__frame--grains",
] as const;

type HeroImageFrameProps = {
  className: string;
  imageIndex: number;
};

const HeroImageFrame = ({
  className,
  imageIndex,
}: HeroImageFrameProps) => {
  const [activeIndex, setActiveIndex] = useState(imageIndex);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [loadedIndex, setLoadedIndex] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (imageIndex !== activeIndex) {
      setPendingIndex(imageIndex);
      setIsTransitioning(false);
    }
  }, [activeIndex, imageIndex]);

  useEffect(() => {
    if (pendingIndex === null || loadedIndex !== pendingIndex) return;

    setIsTransitioning(true);
    const transitionTimer = window.setTimeout(() => {
      setActiveIndex(pendingIndex);
      setPendingIndex(null);
      setLoadedIndex(null);
      setIsTransitioning(false);
    }, 850);

    return () => window.clearTimeout(transitionTimer);
  }, [loadedIndex, pendingIndex]);

  const handleImageError = (index: number) => {
    console.error(`Failed to load homepage carousel image: ${heroCollageImages[index].src}`);
    setPendingIndex(null);
    setLoadedIndex(null);
    setIsTransitioning(false);
  };

  return (
    <div className={`hero-image-frame ${className}`}>
      <img
        src={heroCollageImages[activeIndex].src}
        alt=""
        aria-hidden="true"
        fetchPriority={activeIndex === 2 ? "high" : "auto"}
        style={{ objectPosition: heroCollageImages[activeIndex].objectPosition }}
        className={`hero-image-frame__image ${
          isTransitioning ? "hero-image-frame__image--hidden" : "hero-image-frame__image--visible"
        }`}
      />
      {pendingIndex !== null && (
        <img
          src={heroCollageImages[pendingIndex].src}
          alt=""
          aria-hidden="true"
          style={{ objectPosition: heroCollageImages[pendingIndex].objectPosition }}
          onLoad={() => setLoadedIndex(pendingIndex)}
          onError={() => handleImageError(pendingIndex)}
          className={`hero-image-frame__image hero-image-frame__image--pending ${
            isTransitioning ? "hero-image-frame__image--visible" : "hero-image-frame__image--hidden"
          }`}
        />
      )}
    </div>
  );
};

const HeroCarousel = () => {
  const [frameImages, setFrameImages] = useState(initialHeroFrameImages);
  const frameImagesRef = useRef(initialHeroFrameImages);
  const frameCursor = useRef(0);
  const imageCursor = useRef(5);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let rotationTimer: number | undefined;

    const rotateNextFrame = () => {
      if (document.hidden || reducedMotion.matches) return;

      const currentImages = frameImagesRef.current;
      const frameIndex = frameCursor.current;
      let nextImageIndex = -1;

      for (let offset = 1; offset <= heroCollageImages.length; offset += 1) {
        const candidate = (imageCursor.current + offset) % heroCollageImages.length;
        if (!currentImages.includes(candidate)) {
          nextImageIndex = candidate;
          break;
        }
      }

      if (nextImageIndex !== -1) {
        const nextFrames = [...currentImages];
        nextFrames[frameIndex] = nextImageIndex;
        frameImagesRef.current = nextFrames;
        setFrameImages(nextFrames);
        frameCursor.current = (frameIndex + 1) % initialHeroFrameImages.length;
        imageCursor.current = nextImageIndex;
      }
    };

    const scheduleRotation = () => {
      window.clearTimeout(rotationTimer);
      if (document.hidden || reducedMotion.matches) return;

      rotationTimer = window.setTimeout(() => {
        rotateNextFrame();
        scheduleRotation();
      }, 4500);
    };

    const handleMotionPreferenceChange = () => scheduleRotation();
    document.addEventListener("visibilitychange", scheduleRotation);
    reducedMotion.addEventListener("change", handleMotionPreferenceChange);
    scheduleRotation();

    return () => {
      window.clearTimeout(rotationTimer);
      document.removeEventListener("visibilitychange", scheduleRotation);
      reducedMotion.removeEventListener("change", handleMotionPreferenceChange);
    };
  }, []);

  return (
    <>
      {frameImages.map((imageIndex, frameIndex) => (
        <div
          key={frameIndex}
          className={`home-hero__enter home-hero__frame ${heroFrameClasses[frameIndex]}`}
        >
          <HeroImageFrame className="h-full w-full" imageIndex={imageIndex} />
        </div>
      ))}
    </>
  );
};

const MobileHeroGallery = () => (
  <div className="home-hero__mobile-gallery" aria-hidden="true">
    {mobileHeroImages.map((image, index) => (
      <img
        key={image.src}
        src={image.src}
        alt=""
        loading="lazy"
        style={{ objectPosition: image.objectPosition }}
        className={`home-hero__mobile-image home-hero__mobile-image--${index + 1}`}
      />
    ))}
  </div>
);

const Index = () => {
  const { user } = useAuth();
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);

  const {
    data: testimonialsData,
    isLoading: isTestimonialsLoading,
    refetch: refetchTestimonials,
  } = useQuery({
    queryKey: ["testimonials"],
    queryFn: () => reviewService.getApprovedTestimonials(),
  });

  const testimonials = testimonialsData || [];

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

      {/* ========== HOMEPAGE HERO ========== */}
      <section className="home-hero relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt=""
            aria-hidden="true"
            fetchPriority="high"
            className="home-hero__background absolute inset-0 h-full w-full object-cover object-[50%_52%] md:object-[50%_50%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/35 max-md:bg-gradient-to-b max-md:from-black/80 max-md:via-black/60 max-md:to-black/55" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 via-emerald-500 to-green-400" />
        </div>

        <div className="container relative z-10 grid w-full grid-cols-1 items-center gap-10 py-12 sm:gap-12 sm:py-16 md:grid-cols-[1fr_0.9fr] md:gap-7 lg:min-h-[700px] lg:grid-cols-[1.1fr_0.9fr] lg:gap-10 lg:py-20">
          <div className="max-w-2xl">
            <span className="home-hero__enter home-hero__enter--label mb-5 inline-flex items-center rounded-full border border-white/20 bg-black/20 px-4 py-1.5 text-xs font-semibold tracking-[0.16em] text-white backdrop-blur-sm sm:mb-6 sm:text-sm">
              FRESH FROM LOCAL FARMS
            </span>

            <h1 className="home-hero__enter home-hero__enter--heading mb-5 max-w-2xl font-display text-4xl font-bold leading-tight text-white drop-shadow-lg sm:mb-6 sm:text-5xl lg:text-6xl">
              Fresh produce. Straight from the farm.
            </h1>

            <p className="home-hero__enter home-hero__enter--description mb-7 max-w-xl text-base leading-relaxed text-white/95 drop-shadow sm:mb-8 sm:text-lg">
              Browse fresh produce from local farmers and connect directly with sellers.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <div className="home-hero__enter home-hero__enter--primary-button w-full sm:w-auto">
                <Link to="/marketplace" className="block">
                  <Button
                    size="lg"
                    className="group h-12 w-full gap-2 bg-green-600 px-6 font-semibold text-white shadow-lg shadow-black/20 transition-colors hover:bg-green-700 sm:w-auto sm:px-7"
                  >
                    Explore Marketplace
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
              <div className="home-hero__enter home-hero__enter--secondary-button w-full sm:w-auto">
                <Link to="/register" className="block">
                  <Button
                    size="lg"
                    variant="outline"
                    className="group h-12 w-full gap-2 border-white/70 bg-white/10 px-6 font-semibold text-white shadow-lg shadow-black/20 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white sm:w-auto sm:px-7"
                  >
                    Start Selling your Products
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div
            role="img"
            aria-label="Photographs of farmers and agricultural products"
            className="home-hero__collage"
          >
            <div className="home-hero__desktop-gallery">
              <HeroCarousel />
            </div>
            <MobileHeroGallery />
          </div>
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

      {/* ========== CATEGORIES SECTION - Interactive Shop by Category ========== */}
      <ShopByCategorySection
        categories={categoriesList}
        categoryImages={categoryImages}
        fallbackCategoryImage={catVegetables}
        isCategoriesLoading={isCategoriesLoading}
      />

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

      {/* ========== TESTIMONIALS SECTION ========== */}
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
            {user?.user_type === "customer" && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsTestimonialModalOpen(true)}
                  className="gap-1.5 border-green-600 text-green-700 hover:bg-green-50"
                >
                  <MessageSquarePlus className="h-4 w-4" /> Share Your Experience
                </Button>
              </div>
            )}
          </motion.div>

          {isTestimonialsLoading ? (
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl bg-gray-50/80 p-6 space-y-3">
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((j) => (
                      <div key={j} className="h-4 w-4 rounded-full bg-gray-200" />
                    ))}
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-4/5" />
                  <div className="pt-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-1" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : testimonials.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-10 text-center max-w-xl mx-auto">
              <p className="text-base font-medium text-gray-700">No customer testimonials published yet.</p>
              <p className="mt-1 text-sm text-gray-500">
                Genuine reviews from our verified community will appear here once approved by our team.
              </p>
              {user?.user_type === "customer" && (
                <Button
                  onClick={() => setIsTestimonialModalOpen(true)}
                  className="mt-5 bg-green-600 hover:bg-green-700 text-white"
                  size="sm"
                >
                  Be the First to Share Feedback
                </Button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="group rounded-2xl bg-gray-50/80 p-6 transition-all duration-300 hover:bg-white hover:shadow-lg flex flex-col justify-between"
                >
                  <div>
                    <div className="flex gap-1 mb-3" aria-label={`${t.rating} out of 5 stars`}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= t.rating
                              ? "fill-yellow-400 text-yellow-400"
                              : "fill-transparent text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-gray-600 leading-relaxed italic">"{t.comment}"</p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-gray-100">
                    <p className="font-semibold text-gray-900">{t.display_name}</p>
                    <p className="text-sm text-gray-500">{t.role_or_title || "Community Member"}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ========== CTA SECTION - Enhanced ========== */}
      <section className="community-cta relative isolate min-h-[760px] overflow-hidden bg-emerald-950 py-16 sm:min-h-[680px] sm:py-20">
        <div className="absolute inset-0 z-[1] bg-gradient-to-r from-emerald-950/95 via-emerald-950/75 to-emerald-950/25" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-emerald-950/45 via-transparent to-emerald-950/10" />

        <img
          src={smilingFarmerImage}
          alt="Smiling farmer pointing toward the invitation to start selling"
          className="community-cta__farmer absolute inset-0 z-0 h-full w-full object-cover object-[68%_center]"
        />

        <div className="community-float community-float--tomatoes" aria-hidden="true">
          <img src="/tomatoes.jpg" alt="" />
        </div>
        <div className="community-float community-float--carrots" aria-hidden="true">
          <img src={carrotsImage} alt="" />
        </div>
        <div className="community-float community-float--grains" aria-hidden="true">
          <img src={catGrains} alt="" />
        </div>
        <div className="community-float community-float--spinach" aria-hidden="true">
          <img src={spinachImage} alt="" />
        </div>
        <div className="community-float community-float--vegetables" aria-hidden="true">
          <img src={catVegetables} alt="" />
        </div>

        <div className="container relative z-10 flex min-h-[600px] items-start pb-[360px] sm:min-h-[600px] sm:pb-[390px] md:items-center md:pb-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-xl text-left"
          >
            <span className="mb-6 inline-block rounded-full border border-white/15 bg-emerald-950/35 px-4 py-1.5 text-sm font-medium text-white/90 backdrop-blur-sm">
              🌾 Join Our Community
            </span>
            <h2 className="mb-4 font-display text-3xl font-bold text-white drop-shadow-lg md:text-4xl">
              Are You a Farmer or Producer?
            </h2>
            <p className="mb-8 max-w-lg leading-relaxed text-white/90 drop-shadow-md">
              Join thousands of farmers who are already selling their produce directly to customers.
              No middlemen, fair prices, and a growing community of food lovers.
            </p>
            <Link to="/register">
              <Button
                size="lg"
                className="bg-white px-8 font-semibold text-green-700 shadow-lg shadow-black/20 transition-all duration-300 hover:bg-gray-100 hover:shadow-black/30"
              >
                Start Selling Today
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />

      <TestimonialSubmissionModal
        open={isTestimonialModalOpen}
        onOpenChange={setIsTestimonialModalOpen}
        onSuccess={() => refetchTestimonials()}
      />
    </div>
  );
};

export default Index;