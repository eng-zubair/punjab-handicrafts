import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Store as StoreIcon, MapPin, Award, ArrowLeft } from "lucide-react";
import ProductCard from "@/components/ProductCard";

type Store = {
  id: string;
  vendorId: string;
  name: string;
  description: string | null;
  district: string;
  status: string;
  giBrands?: string[];
};

type Product = {
  id: string;
  title: string;
  description?: string | null;
  price: string | number;
  category?: string;
  images: string[];
  district: string;
  giBrand: string;
  storeId: string;
  stock?: number;
  ratingAverage?: number;
  ratingCount?: number;
};

export default function Store() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: store, isLoading: storeLoading } = useQuery<Store | null>({
    queryKey: ["/api/stores", id || ""],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/stores/${id}`, { credentials: "include" });
      return res.ok ? await res.json() : null;
    },
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/stores/products", id || ""],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/stores/${id}/products`, { credentials: "include" });
      return res.ok ? await res.json() : [];
    },
  });

  const { data: activeOffers = [] } = useQuery<any[]>({
    queryKey: ["/api/stores/offers/active", id || ""],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/stores/${id}/offers/active`, { credentials: "include" });
      return res.ok ? await res.json() : [];
    },
  });
 

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-6 space-y-6">
          <div className="flex items-center gap-2">
            <ButtonBack onClick={() => setLocation("/")} />
            <h1 className="text-3xl font-bold">Artisan Store</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <StoreIcon className="w-5 h-5" />
                Store Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              {storeLoading ? (
                <div className="space-y-2">
                  <div className="h-5 w-40 bg-muted/50 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-muted/50 rounded animate-pulse" />
                </div>
              ) : store ? (
                <div className="grid gap-3">
                  <p className="font-semibold" data-testid="text-store-name">
                    {store.name}
                  </p>
                  {store.description && (
                    <p className="text-sm text-muted-foreground" data-testid="text-store-description">
                      {store.description}
                    </p>
                  )}
                  <p className="text-sm flex items-center gap-1" data-testid="text-store-district">
                    <MapPin className="w-4 h-4" />
                    {store.district}
                  </p>
                  {store.giBrands && store.giBrands.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {store.giBrands.slice(0, 4).map((gi) => (
                        <Badge key={gi} variant="secondary" className="text-xs">
                          <span className="flex items-center gap-1"><Award className="w-3 h-3" />{gi}</span>
                        </Badge>
                      ))}
                      {store.giBrands.length > 4 && (
                        <Badge variant="secondary" className="text-xs">+{store.giBrands.length - 4}</Badge>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Store not found</p>
              )}
            </CardContent>
          </Card>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Products</h2>
              <Link href="/products" className="text-sm text-primary">Browse all</Link>
            </div>
            {productsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="h-80 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No products listed yet.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((p) => {
                  const base = Number(p.price);
                  const candidates = (activeOffers || []).filter((o: any) => {
                    const t = String(o.scopeType || 'products').toLowerCase();
                    if (t === 'all') return true;
                    if (t === 'products') return Array.isArray(o.scopeProducts) && o.scopeProducts.includes(p.id);
                    if (t === 'categories') return Array.isArray(o.scopeCategories) && o.scopeCategories.includes(String(p.category));
                    return false;
                  });
                  let priceNum = base;
                  let badgeText: string | undefined = undefined;
                  for (const o of candidates) {
                    const dv = Number(o.discountValue);
                    const dt = String(o.discountType || 'percentage').toLowerCase();
                    const cand = dt === 'fixed' ? Math.max(0, base - dv) : Math.max(0, base * (1 - dv / 100));
                    if (cand < priceNum) { priceNum = cand; badgeText = o.badgeText || 'Offer'; }
                  }
                  return (
                  <ProductCard
                    key={p.id}
                    id={p.id}
                    title={p.title}
                    description={p.description || undefined}
                    price={priceNum}
                    originalPrice={priceNum < base ? base : undefined}
                    badgeText={badgeText}
                    image={(p.images && p.images[0]) || "/attached_assets/generated_images/Handmade_khussa_footwear_product_06baa0d0.png"}
                    district={p.district}
                    giBrand={p.giBrand}
                    vendorName={store?.name || "Artisan Vendor"}
                    storeId={p.storeId}
                    stock={p.stock || 10}
                    ratingAverage={p.ratingAverage || 0}
                    ratingCount={p.ratingCount || 0}
                  />
                );
              })}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ButtonBack({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      aria-label="Back"
    >
      <ArrowLeft className="w-4 h-4" />
      Back
    </button>
  );
}
