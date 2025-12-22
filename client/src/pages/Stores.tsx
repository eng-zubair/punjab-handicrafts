import { useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Store, Product } from "@shared/schema";
import VendorCard from "@/components/VendorCard";
import { Link } from "wouter";
import vendorAvatar from "@assets/generated_images/Artisan_vendor_profile_portrait_cf010960.png";
import multanImage from "@assets/generated_images/Multan_blue_pottery_workshop_21555b73.png";
import bahawalpurImage from "@assets/generated_images/Bahawalpur_Ralli_quilts_display_07a38e65.png";
import lahoreImage from "@assets/generated_images/Lahore_jewelry_and_embroidery_39a642f1.png";

const districtImages: Record<string, string> = {
  Multan: multanImage,
  Bahawalpur: bahawalpurImage,
  Lahore: lahoreImage,
};

export default function Stores() {
  const { data: stores = [], isLoading: storesLoading } = useQuery<Store[]>({
    queryKey: ["/api/stores?status=approved"],
  });

  const { data: productsResp } = useQuery<{ products: Product[]; pagination: { total: number } }>({
    queryKey: ["/api/products", { status: "approved" }],
  });

  const products = productsResp?.products || [];

  const items = useMemo(() => {
    return stores.map((s) => ({
      id: s.id,
      name: s.name,
      district: s.district,
      giBrands: Array.isArray(s.giBrands) ? s.giBrands : [],
      rating: 4.8,
      totalProducts: products.filter((p) => p.storeId === s.id).length,
      avatar: districtImages[s.district] || vendorAvatar,
    }));
  }, [stores, products]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">All Artisan Vendors</h1>
              <p className="text-muted-foreground">Browse approved vendor stores across districts and GI brands</p>
            </div>
            <Link href="/vendor/guide">
              <Button variant="ghost" data-testid="button-vendor-guide">
                Seller Guide
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
          {storesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((v) => (
                <VendorCard key={v.id} {...v} />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
