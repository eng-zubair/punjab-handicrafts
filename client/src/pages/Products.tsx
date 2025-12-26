import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import type { Category, Product, Store } from "@shared/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose } from "@/components/ui/sheet";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { SlidersHorizontal, X, Search, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { badgeVariants } from "@/components/ui/badge";
import bahawalpurImage from '@assets/generated_images/Bahawalpur_Ralli_quilts_display_07a38e65.png';
import lahoreImage from '@assets/generated_images/Lahore_jewelry_and_embroidery_39a642f1.png';
import khussaImage from '@assets/generated_images/Handmade_khussa_footwear_product_06baa0d0.png';
import multanImage from '@assets/generated_images/Multan_blue_pottery_workshop_21555b73.png';
import { useLocation } from "wouter";

const imagePathMap: Record<string, string> = {
  "/attached_assets/generated_images/Lahore_jewelry_and_embroidery_39a642f1.png": lahoreImage,
  "/attached_assets/generated_images/Multan_blue_pottery_workshop_21555b73.png": multanImage,
  "/attached_assets/generated_images/Bahawalpur_Ralli_quilts_display_07a38e65.png": bahawalpurImage,
  "/attached_assets/generated_images/Handmade_khussa_footwear_product_06baa0d0.png": khussaImage,
};

export default function Products() {
  const [location] = useLocation();
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState<string>("all");
  const [giBrand, setGiBrand] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<string>("newest");
  const pageSize = 12;

  const { data: categoriesData } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: storesData } = useQuery<Store[]>({
    queryKey: ['/api/stores?status=approved'],
  });

  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = {
      status: 'approved',
      page,
      pageSize,
    };
    
    if (search) params.search = search;
    if (district !== 'all') params.district = district;
    if (giBrand !== 'all') params.giBrand = giBrand;
    if (priceRange[0] > 0) params.minPrice = priceRange[0];
    if (priceRange[1] < 10000) params.maxPrice = priceRange[1];
    
    return params;
  }, [search, district, giBrand, priceRange, page, pageSize]);

  const { data: productsData, isLoading, isError, error, refetch } = useQuery<{
    products: Product[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }>({
    queryKey: ['/api/products', queryParams],
  });

  const storeIds = useMemo(() => {
    const ids = Array.from(new Set((productsData?.products || []).map(p => p.storeId).filter(Boolean)));
    return ids;
  }, [productsData]);

  const offersQueries = useQueries({
    queries: storeIds.map((sid) => ({
      queryKey: [`/api/stores/${sid}/offers/active`],
      enabled: !!sid,
    })),
  });

  const offersByStoreId: Record<string, any[] | undefined> = useMemo(() => {
    const map: Record<string, any[] | undefined> = {};
    storeIds.forEach((sid, idx) => {
      const q = offersQueries[idx];
      map[sid] = (q?.data as any[] | undefined) || undefined;
    });
    return map;
  }, [storeIds, offersQueries]);
 

  const handleResetFilters = () => {
    setSearch("");
    setDistrict("all");
    setGiBrand("all");
    setPriceRange([0, 10000]);
    setPage(1);
  };

  const hasActiveFilters = search || district !== 'all' || giBrand !== 'all' || priceRange[0] > 0 || priceRange[1] < 10000;

  type ActiveFilter =
    | { key: "search"; label: string; value: string }
    | { key: "district"; label: string; value: string }
    | { key: "giBrand"; label: string; value: string }
    | { key: "priceRange"; label: string; value: [number, number] };

  const activeFilters: ActiveFilter[] = useMemo(() => {
    const chips: ActiveFilter[] = [];
    if (search.trim()) chips.push({ key: "search", label: "Search", value: search.trim() });
    if (district !== "all") chips.push({ key: "district", label: "District", value: district });
    if (giBrand !== "all") chips.push({ key: "giBrand", label: "GI Brand", value: giBrand });
    if (priceRange[0] > 0 || priceRange[1] < 10000) chips.push({ key: "priceRange", label: "Price", value: priceRange });
    return chips;
  }, [search, district, giBrand, priceRange]);

  const removeFilter = (key: ActiveFilter["key"]) => {
    if (key === "search") setSearch("");
    else if (key === "district") setDistrict("all");
    else if (key === "giBrand") setGiBrand("all");
    else if (key === "priceRange") setPriceRange([0, 10000]);
    setPage(1);
  };

  const ActiveFilterChips = () => (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Active filters"
      data-testid="chips-active-filters"
    >
      <AnimatePresence initial={false}>
        {activeFilters.map((f) => {
          const labelText =
            f.key === "priceRange"
              ? `${f.label}: PKR ${(f.value as [number, number])[0]} - ${(f.value as [number, number])[1]}`
              : `${f.label}: ${String(f.value)}`;
          return (
            <motion.button
              key={`${f.key}-${labelText}`}
              type="button"
              onClick={() => removeFilter(f.key)}
              aria-label={`Remove filter ${labelText}`}
              className={`${badgeVariants({ variant: "outline" })} inline-flex items-center gap-1.5 px-2.5 py-1 text-xs leading-none transition-all duration-200 ease-out hover:bg-muted hover:border-muted-foreground/30`}
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              layout
              data-testid={`chip-${f.key}`}
            >
              <span>{labelText}</span>
              <span
                aria-hidden="true"
                className="ml-1 inline-flex items-center justify-center rounded-sm"
              >
                <X className="w-3 h-3" />
              </span>
            </motion.button>
          );
        })}
      </AnimatePresence>
      {activeFilters.length > 0 && (
        <button
          type="button"
          onClick={handleResetFilters}
          className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline ml-1"
          aria-label="Clear all filters"
          data-testid="button-clear-all-filters"
        >
          Clear all
        </button>
      )}
    </div>
  );

  const featuredProducts = productsData?.products.map(product => {
    const normalizedImage = product.images[0] ? (product.images[0].startsWith('/') ? product.images[0] : `/${product.images[0]}`) : '';
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
      image: imagePathMap[normalizedImage] || normalizedImage || multanImage,
      district: product.district,
      giBrand: product.giBrand,
      vendorName: storesData?.find(s => s.id === product.storeId)?.name || "Artisan Vendor",
      storeId: product.storeId,
      stock: product.stock,
      ratingAverage: (product as any).ratingAverage || 0,
      ratingCount: (product as any).ratingCount || 0,
    };
  }) || [];

  const giBrands = categoriesData?.map(cat => cat.giBrand) || [];

  const sortedProducts = useMemo(() => {
    const arr = [...featuredProducts];
    if (sort === "price_asc") {
      return arr.sort((a, b) => {
        const ap = a.price as number;
        const bp = b.price as number;
        return ap - bp;
      });
    }
    if (sort === "price_desc") {
      return arr.sort((a, b) => {
        const ap = a.price as number;
        const bp = b.price as number;
        return bp - ap;
      });
    }
    if (sort === "rating") {
      return arr.sort((a, b) => {
        if (b.ratingAverage !== a.ratingAverage) return b.ratingAverage - a.ratingAverage;
        return b.ratingCount - a.ratingCount;
      });
    }
    if (sort === "best_selling") {
      return arr.sort((a, b) => {
        if (b.ratingCount !== a.ratingCount) return b.ratingCount - a.ratingCount;
        return b.ratingAverage - a.ratingAverage;
      });
    }
    return arr;
  }, [featuredProducts, sort]);

  useEffect(() => {
    const qs = location.includes("?") ? location.split("?")[1] : "";
    const params = new URLSearchParams(qs);
    const s = params.get("search") || "";
    const d = params.get("district") || "all";
    const g = params.get("giBrand") || "all";
    const min = params.get("minPrice");
    const max = params.get("maxPrice");
    setSearch(s);
    setDistrict(d);
    setGiBrand(g);
    setPriceRange([
      min ? Math.max(0, Math.min(10000, parseInt(min))) : 0,
      max ? Math.max(0, Math.min(10000, parseInt(max))) : 10000,
    ]);
    setPage(1);
  }, [location]);

  const FiltersForm = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-medium">Search</label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
            data-testid="input-search"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">District</label>
        <Select 
          value={district} 
          onValueChange={(value) => {
            setDistrict(value);
            setPage(1);
          }}
        >
          <SelectTrigger data-testid="select-district">
            <SelectValue placeholder="All Districts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Districts</SelectItem>
            {categoriesData?.map((cat) => (
              <SelectItem key={cat.district} value={cat.district}>
                {cat.district}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">GI Brand</label>
        <Select 
          value={giBrand} 
          onValueChange={(value) => {
            setGiBrand(value);
            setPage(1);
          }}
        >
          <SelectTrigger data-testid="select-gi-brand">
            <SelectValue placeholder="All Brands" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Brands</SelectItem>
            {giBrands.map((brand) => (
              <SelectItem key={brand} value={brand}>
                {brand}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">
          Price Range: PKR {priceRange[0]} - {priceRange[1]}
        </label>
        <Slider
          min={0}
          max={10000}
          step={100}
          value={priceRange}
          onValueChange={(value) => {
            setPriceRange(value as [number, number]);
            setPage(1);
          }}
          data-testid="slider-price-range"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2" data-testid="text-products-heading">
              Browse Handicrafts
            </h1>
            <p className="text-muted-foreground">
              Discover authentic products from Punjab's master artisans
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <aside className="hidden lg:block lg:col-span-1">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5" />
                    Filters
                  </CardTitle>
                  {hasActiveFilters && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleResetFilters}
                      data-testid="button-reset-filters"
                    >
                      <X className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <FiltersForm />
                </CardContent>
              </Card>
            </aside>

            <div className="lg:col-span-3 space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground" data-testid="text-results-count">
                  {productsData?.pagination.total || 0} products found
                </p>
                <div className="flex items-center gap-3">
                  <Select value={sort} onValueChange={(v) => setSort(v)}>
                    <SelectTrigger aria-label="Sort by" className="w-40 sm:w-48" data-testid="select-sort">
                      <SelectValue placeholder="Sort: Newest" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest</SelectItem>
                      <SelectItem value="price_asc">Price: Low to High</SelectItem>
                      <SelectItem value="price_desc">Price: High to Low</SelectItem>
                      <SelectItem value="rating">Rating</SelectItem>
                      <SelectItem value="best_selling">Best Selling</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="lg:hidden">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm" data-testid="button-open-filters">
                          <SlidersHorizontal className="w-4 h-4 mr-2" />
                          Filters
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="bottom">
                        <SheetHeader>
                          <SheetTitle>Filters</SheetTitle>
                        </SheetHeader>
                        <div className="p-4 space-y-4">
                          <FiltersForm />
                          <div className="flex items-center justify-end gap-2">
                          {hasActiveFilters && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={handleResetFilters}
                              data-testid="button-reset-filters-mobile"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reset
                            </Button>
                          )}
                          <SheetClose asChild>
                            <Button size="sm" data-testid="button-apply-filters">Apply</Button>
                          </SheetClose>
                          </div>
                        </div>
                        <SheetFooter />
                      </SheetContent>
                    </Sheet>
                  </div>
              </div>
            </div>

            {activeFilters.length > 0 && (
              <ActiveFilterChips />
            )}

            {isError ? (
              <Alert variant="destructive" data-testid="alert-error">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error Loading Products</AlertTitle>
                <AlertDescription>
                    {error instanceof Error ? error.message : "Failed to load products. Please try again."}
                  </AlertDescription>
                  <Button 
                    variant="outline" 
                    onClick={() => refetch()}
                    className="mt-4"
                    data-testid="button-retry"
                  >
                    Retry
                  </Button>
                </Alert>
              ) : isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-80 bg-muted/50 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : featuredProducts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground" data-testid="text-no-results">
                      No products found matching your filters.
                    </p>
                    {hasActiveFilters && (
                      <Button 
                        variant="outline" 
                        onClick={handleResetFilters}
                        className="mt-4"
                        data-testid="button-reset-filters-empty"
                      >
                        Reset Filters
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sortedProducts.map((product) => (
                      <ProductCard key={product.id} {...product} />
                    ))}
                  </div>

                  {productsData && productsData.pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        data-testid="button-prev-page"
                      >
                        Previous
                      </Button>
                      <span className="text-sm" data-testid="text-page-info">
                        Page {page} of {productsData.pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        onClick={() => setPage(p => Math.min(productsData.pagination.totalPages, p + 1))}
                        disabled={page === productsData.pagination.totalPages}
                        data-testid="button-next-page"
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
