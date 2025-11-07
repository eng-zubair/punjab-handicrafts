import Header from "@/components/Header";
import Hero from "@/components/Hero";
import DistrictCard from "@/components/DistrictCard";
import ProductCard from "@/components/ProductCard";
import VendorCard from "@/components/VendorCard";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

import multanImage from '@assets/generated_images/Multan_blue_pottery_workshop_21555b73.png';
import bahawalpurImage from '@assets/generated_images/Bahawalpur_Ralli_quilts_display_07a38e65.png';
import lahoreImage from '@assets/generated_images/Lahore_jewelry_and_embroidery_39a642f1.png';
import khussaImage from '@assets/generated_images/Handmade_khussa_footwear_product_06baa0d0.png';
import vendorAvatar from '@assets/generated_images/Artisan_vendor_profile_portrait_cf010960.png';

export default function Home() {
  const districts = [
    {
      district: "Multan",
      giBrand: "Multani Crafts",
      image: multanImage,
      craftCount: 8,
    },
    {
      district: "Bahawalpur",
      giBrand: "Cholistani Heritage",
      image: bahawalpurImage,
      craftCount: 6,
    },
    {
      district: "Lahore",
      giBrand: "Lahore Heritage Crafts",
      image: lahoreImage,
      craftCount: 5,
    },
  ];

  const featuredProducts = [
    {
      id: "1",
      title: "Handcrafted Multani Blue Pottery Vase",
      price: 3500,
      image: multanImage,
      district: "Multan",
      giBrand: "Multani Crafts",
      vendorName: "Ahmad Pottery Works",
    },
    {
      id: "2",
      title: "Traditional Bahawalpur Ralli Quilt",
      price: 8500,
      image: bahawalpurImage,
      district: "Bahawalpur",
      giBrand: "Cholistani Heritage",
      vendorName: "Fatima Textile Studio",
    },
    {
      id: "3",
      title: "Handmade Lahore Adda Work Jewelry Set",
      price: 4200,
      image: lahoreImage,
      district: "Lahore",
      giBrand: "Lahore Heritage Crafts",
      vendorName: "Heritage Jewelers",
    },
    {
      id: "4",
      title: "Embroidered Multani Khussa Pair",
      price: 2800,
      image: khussaImage,
      district: "Multan",
      giBrand: "Multani Crafts",
      vendorName: "Royal Footwear",
    },
  ];

  const topVendors = [
    {
      id: "1",
      name: "Ahmad Pottery Works",
      district: "Multan",
      giBrands: ["Multani Crafts"],
      rating: 4.8,
      totalProducts: 42,
      avatar: vendorAvatar,
    },
    {
      id: "2",
      name: "Fatima Textile Studio",
      district: "Bahawalpur",
      giBrands: ["Cholistani Heritage"],
      rating: 4.9,
      totalProducts: 38,
      avatar: vendorAvatar,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Hero />
      
      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold mb-2" data-testid="text-districts-heading">
                Shop by District
              </h2>
              <p className="text-muted-foreground">
                Explore authentic handicrafts from Punjab's renowned regions
              </p>
            </div>
            <Button variant="ghost" data-testid="button-view-all-districts">
              View All
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {districts.map((district) => (
              <DistrictCard key={district.district} {...district} />
            ))}
          </div>
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
              <Button variant="ghost" data-testid="button-view-all-products">
                View All
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {topVendors.map((vendor) => (
              <VendorCard key={vendor.id} {...vendor} />
            ))}
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
