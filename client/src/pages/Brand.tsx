import { useParams, Link } from "wouter";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProductCard from "@/components/ProductCard";
import type { Product } from "@shared/schema";
import { Award } from "lucide-react";

type BrandResponse = {
  name: string;
  slug: string;
  districts: string[];
  crafts: string[];
  products: Product[];
  seo: { title: string; description: string };
};

export default function Brand() {
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, isError } = useQuery<BrandResponse>({
    queryKey: ["/api/brands", slug],
    enabled: !!slug,
  });

  useEffect(() => {
    if (data) {
      document.title = data.seo.title;
      const meta = document.querySelector('meta[name="description"]');
      if (meta) {
        meta.setAttribute('content', data.seo.description);
      }
    }
  }, [data]);

  const featured = (data?.products || []).map(p => ({
    id: p.id,
    title: p.title,
    description: p.description || undefined,
    price: String(p.price),
    image: p.images[0] || '',
    district: p.district,
    giBrand: p.giBrand,
    vendorName: "Artisan Vendor",
    storeId: p.storeId,
    stock: p.stock,
  }));

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {isError ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Brand not found</p>
                <Link href="/products">
                  <span className="text-primary">Browse Products</span>
                </Link>
              </CardContent>
            </Card>
          ) : isLoading || !data ? (
            <div className="space-y-4">
              <div className="h-10 bg-muted/50 rounded animate-pulse w-1/2" />
              <div className="h-4 bg-muted/50 rounded animate-pulse w-1/3" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className="h-80 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold flex items-center gap-2" data-testid="text-brand-heading">
                  <Award className="w-6 h-6" />
                  {data.name}
                </h1>
                <p className="text-muted-foreground">
                  {data.districts.join(', ')}
                </p>
                {data.crafts.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {data.crafts.map(c => (
                      <Badge key={c} variant="secondary">{c}</Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Featured Products</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {featured.map(fp => (
                    <ProductCard key={fp.id} {...fp} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}