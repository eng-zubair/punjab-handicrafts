import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import GIBrandCard from "@/components/GIBrandCard";
import ProductCard from "@/components/ProductCard";
import VendorCard from "@/components/VendorCard";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Star } from "lucide-react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Category, Product, Store, ProductCategory } from "@shared/schema";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext, PaginationLink, PaginationEllipsis } from "@/components/ui/pagination";

import multanImage from '@assets/generated_images/Multan_blue_pottery_workshop_21555b73.png';
import bahawalpurImage from '@assets/generated_images/Bahawalpur_Ralli_quilts_display_07a38e65.png';
import lahoreImage from '@assets/generated_images/Lahore_jewelry_and_embroidery_39a642f1.png';
import khussaImage from '@assets/generated_images/Handmade_khussa_footwear_product_06baa0d0.png';
import vendorAvatar from '@assets/generated_images/Artisan_vendor_profile_portrait_cf010960.png';

const districtImages: Record<string, string> = {
  "Multan": multanImage,
  "Bahawalpur": bahawalpurImage,
  "Lahore": lahoreImage,
};

const imagePathMap: Record<string, string> = {
  "/attached_assets/generated_images/Lahore_jewelry_and_embroidery_39a642f1.png": lahoreImage,
  "/attached_assets/generated_images/Multan_blue_pottery_workshop_21555b73.png": multanImage,
  "/attached_assets/generated_images/Bahawalpur_Ralli_quilts_display_07a38e65.png": bahawalpurImage,
  "/attached_assets/generated_images/Handmade_khussa_footwear_product_06baa0d0.png": khussaImage,
};

export default function Home() {
  const [emblaApi, setEmblaApi] = useState<CarouselApi | null>(null);
  const autoplayRef = useRef<number | null>(null);
  const [isHoveringCarousel, setIsHoveringCarousel] = useState(false);
  const { data: categoriesData, isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const productsQueryParams = useMemo(() => ({ status: 'approved', pageSize: 8 }), []);

  const { data: productsResponse, isLoading: productsLoading } = useQuery<{
    products: Product[];
    pagination: { total: number };
  }>({
    queryKey: ['/api/products', productsQueryParams],
  });

  const { data: storesData, isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ['/api/stores?status=approved'],
  });

  const { data: productCategoriesData } = useQuery<ProductCategory[]>({
    queryKey: ['/api/product-categories'],
  });

  const giBrandOptions = (categoriesData?.map(c => c.giBrand) || []).filter((v, i, a) => a.indexOf(v) === i);
  const [giFilter, setGiFilter] = useState<string>('all');
  const [catFilter, setCatFilter] = useState<string>('all');

  // Paged products query (newest first) - 20 per page
  type ProductsPage = { products: Product[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;
  const pagedParams = useMemo(() => {
    const params: Record<string, string | number> = { status: 'approved', page: page, pageSize };
    if (giFilter !== 'all') params.giBrand = giFilter;
    if (catFilter !== 'all') params.category = catFilter;
    return params;
  }, [giFilter, catFilter, page]);
  const {
    data: productsPage,
    isLoading: productsPageLoading,
    isError: productsPageError,
    refetch: refetchProductsPage,
  } = useQuery<ProductsPage>({
    queryKey: ['/api/products', pagedParams],
  });
  useEffect(() => {
    setPage(1);
  }, [giFilter, catFilter]);
  const productsTopRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = productsTopRef.current;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [page]);

  // Remove infinite scroll; pagination controls are provided below

  // Ensure the homepage loads at the top and not at an anchored section
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.location.hash) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);

  // Create GI brands from all categories
  const giBrands = categoriesData?.map(cat => ({
    giBrand: cat.giBrand,
    district: cat.district,
    image: districtImages[cat.district] || multanImage,
    craftCount: productsResponse?.products.filter(p => p.giBrand === cat.giBrand).length || 0,
  })) || [];

  const storeIds = useMemo(() => {
    const set = new Set<string>();
    (productsResponse?.products || []).slice(0, 4).forEach(p => { if (p?.storeId) set.add(p.storeId); });
    (productsPage?.products || []).forEach(p => { if (p?.storeId) set.add(p.storeId); });
    return Array.from(set);
  }, [productsResponse, productsPage]);

  const offersQueries = useQueries({
    queries: storeIds.map((sid) => ({
      queryKey: [`/api/stores/${sid}/offers/active`],
      enabled: !!sid,
    })),
  });

  const offersByStoreId: Record<string, any[] | undefined> = useMemo(() => {
    const map: Record<string, any[] | undefined> = {};
    storeIds.forEach((sid, idx) => {
      map[sid] = (offersQueries[idx]?.data as any[] | undefined) || undefined;
    });
    return map;
  }, [storeIds, offersQueries]);

  const featuredProducts = productsResponse?.products.slice(0, 4).map(product => {
    const base = Number(product.price);
    const list = offersByStoreId[product.storeId] || [];
    let priceNum = base;
    let badgeText: string | undefined = undefined;
    if (list && list.length > 0) {
      const candidates = list.filter((o: any) => {
        const t = String(o.scopeType || 'products').toLowerCase();
        if (t === 'all') return true;
        if (t === 'products') return Array.isArray(o.scopeProducts) && o.scopeProducts.includes(product.id);
        if (t === 'categories') return Array.isArray(o.scopeCategories) && o.scopeCategories.includes(String((product as any).category));
        return false;
      });
      for (const o of candidates) {
        const dv = Number(o.discountValue);
        const dt = String(o.discountType || 'percentage').toLowerCase();
        const cand = dt === 'fixed' ? Math.max(0, base - dv) : Math.max(0, base * (1 - dv / 100));
        if (cand < priceNum) {
          priceNum = cand;
          badgeText = o.badgeText || (dt === 'percentage' ? `${dv}% off` : `PKR ${dv} off`);
        }
      }
    }
    return {
      id: product.id,
      title: product.title,
      description: product.description || undefined,
      price: priceNum,
      originalPrice: priceNum < base ? base : undefined,
      badgeText,
      image: imagePathMap[product.images[0]] || product.images[0] || multanImage,
      district: product.district,
      giBrand: product.giBrand,
      vendorName: storesData?.find(s => s.id === product.storeId)?.name || "Artisan Vendor",
      storeId: product.storeId,
      stock: product.stock,
      ratingAverage: (product as any).ratingAverage || 0,
      ratingCount: (product as any).ratingCount || 0,
    };
  }) || [];

  const topVendors = storesData?.slice(0, 2).map(store => ({
    id: store.id,
    name: store.name,
    district: store.district,
    giBrands: store.giBrands,
    rating: 4.8,
    totalProducts: productsResponse?.products.filter(p => p.storeId === store.id).length || 0,
    avatar: vendorAvatar,
  })) || [];

  type Testimonial = {
    id: string;
    name: string;
    title?: string;
    company?: string;
    quote: string;
    imageUrl?: string;
    rating?: number;
  };

  const testimonials: Testimonial[] = [
    {
      id: "t1",
      name: "Ayesha Khan",
      title: "Designer",
      company: "Lahore Craft Co.",
      quote: "The craftsmanship is outstanding. These pieces bring authentic Punjab artistry into my work.",
      imageUrl: vendorAvatar,
      rating: 5,
    },
    {
      id: "t2",
      name: "Bilal Ahmed",
      title: "Buyer",
      company: "Multan",
      quote: "Beautiful, well-made, and delivered quickly. I’ll definitely shop here again.",
      imageUrl: vendorAvatar,
      rating: 4,
    },
    {
      id: "t3",
      name: "Zainab Fatima",
      title: "Interior Stylist",
      company: "Bahawalpur",
      quote: "Authentic GI brands with incredible detail. My clients love these unique accents.",
      imageUrl: vendorAvatar,
      rating: 5,
    },
  ];

  function TestimonialCard({ name, title, company, quote, imageUrl, rating }: Testimonial) {
    const initials = name
      .split(" ")
      .map(w => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
    const stars = Array.from({ length: 5 }).map((_, i) => (
      <Star key={i} className={`w-4 h-4 ${i < (Math.floor(rating || 0)) ? "fill-primary text-primary" : ""}`} aria-hidden="true" />
    ));
    return (
      <Card className="hover-elevate active-elevate-2 h-full" role="article" aria-label={`Testimonial from ${name}`}>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="w-14 h-14">
            <AvatarImage src={imageUrl} alt={name} />
            <AvatarFallback aria-hidden="true">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <CardTitle className="text-lg truncate">{name}</CardTitle>
            <p className="text-sm text-muted-foreground truncate">
              {title ? title : ""}{title && company ? " • " : ""}{company ? company : ""}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {rating ? (
            <div className="flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
              {stars}
              <span className="text-sm text-muted-foreground">{Number(rating).toFixed(1)}</span>
            </div>
          ) : null}
          <blockquote className="text-base leading-relaxed">
            <span aria-hidden="true">“</span>
            {quote}
            <span aria-hidden="true">”</span>
          </blockquote>
        </CardContent>
      </Card>
    );
  }

  const isLoading = categoriesLoading || productsLoading || storesLoading;

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) {
      clearInterval(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  const startAutoplay = useCallback(() => {
    if (!emblaApi || autoplayRef.current) return;
    autoplayRef.current = window.setInterval(() => {
      try {
        emblaApi.scrollNext();
      } catch {}
    }, 3000);
  }, [emblaApi]);

  useEffect(() => {
    if (emblaApi && !isHoveringCarousel) {
      startAutoplay();
    } else {
      stopAutoplay();
    }
    return () => stopAutoplay();
  }, [emblaApi, isHoveringCarousel, startAutoplay, stopAutoplay]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Hero />
      
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2" data-testid="text-gi-brands-heading">
                Shop by Geographical Indication Brands
              </h2>
              <p className="text-muted-foreground">
                Explore authentic Geographical Indication certified handicrafts from Punjab's master artisans
              </p>
            </div>
            <Link href="/products">
              <Button variant="ghost" data-testid="button-view-all-gi-brands">
                View All
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          {isLoading ? (
            <div className="flex gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 w-[260px] bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <Carousel 
              opts={{ loop: true, align: 'start' }} 
              setApi={setEmblaApi} 
              className="relative"
              onMouseEnter={() => setIsHoveringCarousel(true)}
              onMouseLeave={() => setIsHoveringCarousel(false)}
            >
              <CarouselContent>
                {giBrands.map((brand) => (
                  <CarouselItem key={brand.giBrand} className="basis-1/2 sm:basis-1/3 lg:basis-1/4">
                    <GIBrandCard {...brand} />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-6" />
              <CarouselNext className="-right-6" />
            </Carousel>
          )}
        </section>

        <section className="bg-muted/30 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-muted">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2" data-testid="text-featured-heading">Featured Handicrafts</h2>
                <p className="text-muted-foreground">Handpicked authentic crafts from master artisans</p>
              </div>
              <Link href="/products">
                <Button variant="ghost" data-testid="button-view-all-products">
                  View All
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
            </div>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-80 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.id} {...product} />
                ))}
              </div>
            )}
          </div>
        </section>

        <section id="products-section" className="bg-muted/30 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-6 gap-4">
              <div>
                <h2 className="text-3xl font-bold mb-1">Products</h2>
                <p className="text-muted-foreground">Newest arrivals</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap justify-end">
                <Select value={giFilter} onValueChange={(v) => setGiFilter(v)}>
                  <SelectTrigger aria-label="Select GI brand" className="w-40 sm:w-48">
                    <SelectValue placeholder="GI Brand: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Brands</SelectItem>
                    {giBrandOptions.map((brand) => (
                      <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={catFilter} onValueChange={(v) => setCatFilter(v)}>
                  <SelectTrigger aria-label="Select category" className="w-40 sm:w-48">
                    <SelectValue placeholder="Category: All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {(productCategoriesData || []).map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Link href="/products">
                  <Button variant="ghost">
                    View All
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>

          <div ref={productsTopRef} />

          {productsPageError ? (
            <div className="rounded-lg border bg-card p-6">
              <p className="text-sm text-destructive">Failed to load products</p>
              <Button size="sm" className="mt-3" onClick={() => refetchProductsPage()}>Retry</Button>
            </div>
          ) : (
            <>
              {productsPageLoading && !productsPage ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="h-80 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-6">
                  {(productsPage?.products || []).map((product) => {
                    const base = Number(product.price);
                    const list = offersByStoreId[product.storeId] || [];
                    let priceNum = base;
                    let badgeText: string | undefined = undefined;
                    if (list && list.length > 0) {
                      const candidates = list.filter((o: any) => {
                        const t = String(o.scopeType || 'products').toLowerCase();
                        if (t === 'all') return true;
                        if (t === 'products') return Array.isArray(o.scopeProducts) && o.scopeProducts.includes(product.id);
                        if (t === 'categories') return Array.isArray(o.scopeCategories) && o.scopeCategories.includes(String((product as any).category));
                        return false;
                      });
                      for (const o of candidates) {
                        const dv = Number(o.discountValue);
                        const dt = String(o.discountType || 'percentage').toLowerCase();
                        const cand = dt === 'fixed' ? Math.max(0, base - dv) : Math.max(0, base * (1 - dv / 100));
                        if (cand < priceNum) {
                          priceNum = cand;
                          badgeText = o.badgeText || (dt === 'percentage' ? `${dv}% off` : `PKR ${dv} off`);
                        }
                      }
                    }
                    return (
                      <ProductCard
                        key={product.id}
                        id={product.id}
                        title={product.title}
                        description={product.description || undefined}
                        price={priceNum}
                        originalPrice={priceNum < base ? base : undefined}
                        badgeText={badgeText}
                        image={imagePathMap[product.images[0]] || product.images[0] || multanImage}
                        district={product.district}
                        giBrand={product.giBrand}
                        vendorName={storesData?.find(s => s.id === product.storeId)?.name || "Artisan Vendor"}
                        storeId={product.storeId}
                        stock={product.stock}
                        ratingAverage={(product as any).ratingAverage || 0}
                        ratingCount={(product as any).ratingCount || 0}
                      />
                    );
                  })}
                </div>
              )}
              <div className="mt-6">
                {(() => {
                  const totalPages = productsPage?.pagination?.totalPages || 1;
                  const buildRange = (current: number, total: number) => {
                    const s = new Set<number>();
                    s.add(1);
                    s.add(total);
                    s.add(current);
                    if (current - 1 >= 1) s.add(current - 1);
                    if (current + 1 <= total) s.add(current + 1);
                    const arr = Array.from(s).sort((a, b) => a - b);
                    const tokens: Array<number | "dots"> = [];
                    for (let i = 0; i < arr.length; i++) {
                      const p = arr[i];
                      if (i === 0) {
                        tokens.push(p);
                        continue;
                      }
                      const prev = arr[i - 1];
                      if (p - prev === 2) tokens.push(prev + 1);
                      else if (p - prev > 2) tokens.push("dots");
                      tokens.push(p);
                    }
                    return tokens;
                  };
                  const tokens = buildRange(page, totalPages);
                  return (
                    <Pagination className="w-full">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.preventDefault();
                              if (page > 1) setPage(page - 1);
                            }}
                          />
                        </PaginationItem>
                        {tokens.map((t, i) => (
                          <PaginationItem key={`token-${i}`}>
                            {t === "dots" ? (
                              <PaginationEllipsis />
                            ) : (
                              <PaginationLink
                                role="button"
                                tabIndex={0}
                                isActive={t === page}
                                onClick={(e) => {
                                  e.preventDefault();
                                  setPage(t);
                                }}
                              >
                                {t}
                              </PaginationLink>
                            )}
                          </PaginationItem>
                        ))}
                        <PaginationItem>
                          <PaginationNext
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.preventDefault();
                              const total = totalPages;
                              if (page < total) setPage(page + 1);
                            }}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  );
                })()}
              </div>
            </>
          )}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2" data-testid="text-vendors-heading">
                Top Artisan Vendors
              </h2>
              <p className="text-muted-foreground">
                Connect with skilled craftspeople preserving traditional arts
              </p>
            </div>
            <Link href="/stores">
              <Button variant="ghost" data-testid="button-view-all-vendors">
                View All
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-48 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {topVendors.map((vendor) => (
                <VendorCard key={vendor.id} {...vendor} />
              ))}
            </div>
          )}
        </section>

        <section aria-labelledby="testimonials-heading" className="bg-muted/30 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 id="testimonials-heading" className="text-3xl font-bold mb-2">
                  What Customers Say
                </h2>
                <p className="text-muted-foreground">Real feedback from our buyers and partners</p>
              </div>
            </div>
            <Carousel opts={{ align: "start" }}>
              <CarouselContent>
                {testimonials.map(t => (
                  <CarouselItem key={t.id} className="basis-full sm:basis-1/2 lg:basis-1/3">
                    <div className="p-2 h-full">
                      <TestimonialCard {...t} />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-6" />
              <CarouselNext className="-right-6" />
            </Carousel>
          </div>
        </section>

        <section className="bg-primary text-primary-foreground py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold mb-4" data-testid="text-cta-heading">
              Start Selling Your Crafts Today
            </h2>
            <p className="text-lg mb-8 text-primary-foreground/90">
              Join hundreds of artisans showcasing their authentic handicrafts to customers worldwide.
              Create your store in minutes and start earning.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/vendor/register">
                <Button 
                  size="lg" 
                  variant="secondary"
                  data-testid="button-get-started"
                  aria-label="Get started selling"
                >
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/vendor/guide">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  data-testid="button-learn-more"
                  aria-label="Learn more about selling"
                >
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
