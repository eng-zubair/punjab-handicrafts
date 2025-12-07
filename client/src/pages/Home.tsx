import { useMemo, useEffect, useState, useRef, useCallback } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import GIBrandCard from "@/components/GIBrandCard";
import ProductCard from "@/components/ProductCard";
import VendorCard from "@/components/VendorCard";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Category, Product, Store, ProductCategory } from "@shared/schema";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  // Infinite products query (newest first)
  type ProductsPage = { products: Product[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } };
  const infiniteParams = useMemo(() => {
    const params: Record<string, string | number> = { status: 'approved', pageSize: 20 };
    if (giFilter !== 'all') params.giBrand = giFilter;
    if (catFilter !== 'all') params.category = catFilter;
    return params;
  }, [giFilter, catFilter]);
  const {
    data: pagedProducts,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: productsInfiniteLoading,
    isError: productsInfiniteError,
    error: productsInfiniteErrorObj,
    refetch: refetchInfinite,
  } = useInfiniteQuery<ProductsPage, Error>(
    {
      queryKey: ['/api/products', infiniteParams],
      queryFn: async ({ pageParam = 1, queryKey }) => {
        const [, params] = queryKey as [string, Record<string, any>];
        const search = new URLSearchParams({ ...params, page: String(pageParam) });
        const res = await fetch(`/api/products?${search.toString()}`, { credentials: 'include' });
        if (!res.ok) throw new Error(await res.text());
        return (await res.json()) as ProductsPage;
      },
      getNextPageParam: (last) => {
        const next = (last?.pagination?.page || 1) + 1;
        return next <= (last?.pagination?.totalPages || 0) ? next : undefined;
      },
      initialPageParam: 1,
      staleTime: Infinity,
      retry: false,
    }
  );

  // Intersection Observer for infinite scrolling
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const lastFetchAtRef = useRef<number>(0);
  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry.isIntersecting) return;
        const now = Date.now();
        if (isFetchingNextPage) return;
        if (hasNextPage && now - lastFetchAtRef.current > 500) {
          lastFetchAtRef.current = now;
          fetchNextPage();
        }
      },
      { root: null, rootMargin: '300px', threshold: 0 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Create GI brands from all categories
  const giBrands = categoriesData?.map(cat => ({
    giBrand: cat.giBrand,
    district: cat.district,
    image: districtImages[cat.district] || multanImage,
    craftCount: productsResponse?.products.filter(p => p.giBrand === cat.giBrand).length || 0,
  })) || [];

  const featuredProducts = productsResponse?.products.slice(0, 4).map(product => ({
    id: product.id,
    title: product.title,
    description: product.description || undefined,
    price: Number(product.price),
    image: imagePathMap[product.images[0]] || product.images[0] || multanImage,
    district: product.district,
    giBrand: product.giBrand,
    vendorName: storesData?.find(s => s.id === product.storeId)?.name || "Artisan Vendor",
    storeId: product.storeId,
    stock: product.stock,
    ratingAverage: (product as any).ratingAverage || 0,
    ratingCount: (product as any).ratingCount || 0,
  })) || [];

  const topVendors = storesData?.slice(0, 2).map(store => ({
    id: store.id,
    name: store.name,
    district: store.district,
    giBrands: store.giBrands,
    rating: 4.8,
    totalProducts: productsResponse?.products.filter(p => p.storeId === store.id).length || 0,
    avatar: vendorAvatar,
  })) || [];

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
                  <CarouselItem key={brand.giBrand} className="basis-1/4">
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

        <section className="bg-muted/30 py-16">
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

          {productsInfiniteError ? (
            <div className="rounded-lg border bg-card p-6">
              <p className="text-sm text-destructive">Failed to load products</p>
              <Button size="sm" className="mt-3" onClick={() => refetchInfinite()}>Retry</Button>
            </div>
          ) : (
            <div className="space-y-6">
              {(pagedProducts?.pages || []).map((page, idx) => (
                <div key={`page-${idx}`}>
                  <div className="flex items-center gap-3 my-2">
                    <div className="h-px bg-muted flex-1" />
                    <Badge variant="outline">Batch {idx + 1}</Badge>
                    <div className="h-px bg-muted flex-1" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                    {page.products.map((product) => (
                      <ProductCard
                        key={product.id}
                        id={product.id}
                        title={product.title}
                        description={product.description || undefined}
                        price={Number(product.price)}
                        image={imagePathMap[product.images[0]] || product.images[0] || multanImage}
                        district={product.district}
                        giBrand={product.giBrand}
                        vendorName={storesData?.find(s => s.id === product.storeId)?.name || "Artisan Vendor"}
                        storeId={product.storeId}
                        stock={product.stock}
                        ratingAverage={(product as any).ratingAverage || 0}
                        ratingCount={(product as any).ratingCount || 0}
                      />
                    ))}
                  </div>
                </div>
              ))}

              {productsInfiniteLoading && !pagedProducts ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {[1,2,3,4,5,6,7,8,9,10].map(i => (
                    <div key={i} className="h-80 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : null}

              <div ref={loadMoreRef} />
              {isFetchingNextPage && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading more...</span>
                </div>
              )}
              {!hasNextPage && pagedProducts && (
                <p className="text-center text-sm text-muted-foreground">End of list</p>
              )}
            </div>
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
            <Button variant="ghost" data-testid="button-view-all-vendors">
              View All
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
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
              <Button 
                size="lg" 
                variant="secondary"
                data-testid="button-get-started"
              >
                Get Started
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                data-testid="button-learn-more"
              >
                Learn More
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
