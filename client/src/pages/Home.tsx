import { useMemo } from "react";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import GIBrandCard from "@/components/GIBrandCard";
import ProductCard from "@/components/ProductCard";
import VendorCard from "@/components/VendorCard";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Category, Product, Store } from "@shared/schema";

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

  // Create unique GI brands from categories
  const giBrands = categoriesData?.slice(0, 3).map(cat => ({
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Hero />
      
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2" data-testid="text-gi-brands-heading">
                Shop by GI Brand
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {giBrands.map((brand) => (
                <GIBrandCard key={brand.giBrand} {...brand} />
              ))}
            </div>
          )}
        </section>

        <section className="bg-muted/30 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2" data-testid="text-featured-heading">
                  Featured Handicrafts
                </h2>
                <p className="text-muted-foreground">
                  Handpicked authentic crafts from master artisans
                </p>
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
