import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import heroBanner from '@assets/generated_images/punjab-handicrafts.jpg';

export default function Hero() {
  const [, setLocation] = useLocation();

  const handleExplore = () => {
    setLocation('/products');
  };

  const handleBecomeVendor = () => {
    setLocation('/vendor/register');
  };

  return (
    <div className="relative h-96 lg:h-[32rem] overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBanner})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
      
      <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
        <div className="max-w-2xl space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white" data-testid="text-hero-title">
            Discover Punjab's
            <br />
            Authentic Handicrafts
          </h1>
          <p className="text-lg md:text-xl text-white/90" data-testid="text-hero-subtitle">
            Shop district-wise GI branded crafts directly from local artisans.
            Support traditional craftsmanship and cultural heritage.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Button 
              size="lg" 
              className="bg-primary hover:bg-primary text-primary-foreground backdrop-blur-sm"
              onClick={handleExplore}
              data-testid="button-explore-crafts"
            >
              Explore GI Crafts
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="backdrop-blur-sm bg-white/10 border-white/30 text-white hover:bg-white/20"
              onClick={handleBecomeVendor}
              data-testid="button-become-vendor"
            >
              Become a Vendor
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
