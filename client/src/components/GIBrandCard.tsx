import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, Award } from "lucide-react";
import { useLocation } from "wouter";

interface GIBrandCardProps {
  giBrand: string;
  district: string;
  image: string;
  craftCount: number;
}

export default function GIBrandCard({ giBrand, district, image, craftCount }: GIBrandCardProps) {
  const [, setLocation] = useLocation();

  const handleExplore = () => {
    setLocation(`/products?giBrand=${encodeURIComponent(giBrand)}`);
  };

  return (
    <Card 
      className="overflow-hidden hover-elevate active-elevate-2 transition-all"
      data-testid={`card-gi-brand-${giBrand.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={giBrand}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="text-2xl font-bold" data-testid={`text-gi-brand-${giBrand.toLowerCase().replace(/\s+/g, '-')}`}>
              {giBrand}
            </h3>
          </div>
          <p className="text-sm text-white/90" data-testid={`text-district-${giBrand.toLowerCase().replace(/\s+/g, '-')}`}>
            From {district}
          </p>
        </div>
      </div>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground mb-4" data-testid={`text-craft-count-${giBrand.toLowerCase().replace(/\s+/g, '-')}`}>
          {craftCount} authentic crafts
        </p>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleExplore}
          data-testid={`button-explore-${giBrand.toLowerCase().replace(/\s+/g, '-')}`}
        >
          Explore Crafts
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
