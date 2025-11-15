import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Category, Product, Store } from "@shared/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { SlidersHorizontal, X, Search, AlertCircle } from "lucide-react";
import bahawalpurImage from '@assets/generated_images/Bahawalpur_Ralli_quilts_display_07a38e65.png';
import lahoreImage from '@assets/generated_images/Lahore_jewelry_and_embroidery_39a642f1.png';
import khussaImage from '@assets/generated_images/Handmade_khussa_footwear_product_06baa0d0.png';
import multanImage from '@assets/generated_images/Multan_blue_pottery_workshop_21555b73.png';

const imagePathMap: Record<string, string> = {
  "/attached_assets/generated_images/Lahore_jewelry_and_embroidery_39a642f1.png": lahoreImage,
  "/attached_assets/generated_images/Multan_blue_pottery_workshop_21555b73.png": multanImage,
  "/attached_assets/generated_images/Bahawalpur_Ralli_quilts_display_07a38e65.png": bahawalpurImage,
  "/attached_assets/generated_images/Handmade_khussa_footwear_product_06baa0d0.png": khussaImage,
};

export default function Products() {
  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState<string>("all");
  const [giBrand, setGiBrand] = useState<string>("all");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [page, setPage] = useState(1);
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

  const handleResetFilters = () => {
    setSearch("");
    setDistrict("all");
    setGiBrand("all");
    setPriceRange([0, 10000]);
    setPage(1);
  };

  const hasActiveFilters = search || district !== 'all' || giBrand !== 'all' || priceRange[0] > 0 || priceRange[1] < 10000;

  const featuredProducts = productsData?.products.map(product => {
    const normalizedImage = product.images[0] ? (product.images[0].startsWith('/') ? product.images[0] : `/${product.images[0]}`) : '';
    return {
      id: product.id,
      title: product.title,
      price: Number(product.price),
      image: imagePathMap[normalizedImage] || normalizedImage || multanImage,
      district: product.district,
      giBrand: product.giBrand,
      vendorName: storesData?.find(s => s.id === product.storeId)?.name || "Artisan Vendor",
      storeId: product.storeId,
      stock: product.stock,
    };
  }) || [];

  const giBrands = categoriesData?.map(cat => cat.giBrand) || [];

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
            <aside className="lg:col-span-1">
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
                </CardContent>
              </Card>
            </aside>

            <div className="lg:col-span-3 space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground" data-testid="text-results-count">
                  {productsData?.pagination.total || 0} products found
                </p>
              </div>

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
                    {featuredProducts.map((product) => (
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
