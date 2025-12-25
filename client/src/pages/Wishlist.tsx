import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useWishlist } from "@/components/WishlistContext";
import ProductCard from "@/components/ProductCard";
import { apiRequest } from "@/lib/queryClient";
import type { Product } from "@shared/schema";

export default function Wishlist() {
  const { isAuthenticated } = useAuth();
  const { items } = useWishlist();

  const { data: serverData, isLoading: serverLoading, isError: serverError, error: serverErr } = useQuery<{ products: Array<Product & { ratingAverage?: number; ratingCount?: number }> }>({
    queryKey: ["/api/wishlist/products"],
    enabled: isAuthenticated,
  });

  const { data: localData, isLoading: localLoading, isError: localError, error: localErr } = useQuery<{ products: Product[] }>({
    queryKey: ["wishlist-local-products", { ids: items }],
    enabled: !isAuthenticated && items.length > 0,
    queryFn: async () => {
      const products: Product[] = [];
      for (const id of items) {
        try {
          const res = await apiRequest("GET", `/api/products/${id}`);
          const p = await res.json();
          products.push(p);
        } catch {}
      }
      return { products };
    },
  });

  const isLoading = isAuthenticated ? serverLoading : localLoading;
  const isError = isAuthenticated ? serverError : localError;
  const error = (serverErr || localErr) as any;
  const products = isAuthenticated ? (serverData?.products || []) : (localData?.products || []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-2" data-testid="text-wishlist-heading">
              <Heart className="w-8 h-8 text-red-500" />
              Wishlist
            </h1>
            <p className="text-muted-foreground">
              Saved products you love
            </p>
          </div>

          {isError ? (
            <Alert variant="destructive" data-testid="alert-wishlist-error">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : "Failed to load wishlist. Please try again."}
              </AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted animate-pulse" />
                  <CardContent className="p-4 space-y-2">
                    <div className="h-4 bg-muted/50 rounded animate-pulse" />
                    <div className="h-4 bg-muted/50 rounded animate-pulse w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">No saved products yet</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Browse products and tap the heart icon to add them to your wishlist.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p: any) => (
                <ProductCard
                  key={p.id}
                  id={p.id}
                  title={p.title}
                  description={p.description || ""}
                  price={Number(p.price)}
                  image={(p.images || [])[0] || ""}
                  district={p.district}
                  giBrand={p.giBrand}
                  vendorName={p.vendorName || ""}
                  storeId={p.storeId}
                  stock={Number(p.stock || 0)}
                  ratingAverage={Number(p.ratingAverage || 0)}
                  ratingCount={Number(p.ratingCount || 0)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
