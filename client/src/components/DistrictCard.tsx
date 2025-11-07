import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface DistrictCardProps {
  district: string;
  giBrand: string;
  image: string;
  craftCount: number;
}

export default function DistrictCard({ district, giBrand, image, craftCount }: DistrictCardProps) {
  const handleExplore = () => {
    console.log(`Explore ${district} crafts`);
  };

  return (
    <Card 
      className="overflow-hidden hover-elevate active-elevate-2 transition-all"
      data-testid={`card-district-${district.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={district}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <h3 className="text-2xl font-bold mb-1" data-testid={`text-district-${district.toLowerCase()}`}>
            {district}
          </h3>
          <p className="text-sm text-white/90 mb-2" data-testid={`text-gi-brand-${district.toLowerCase()}`}>
            {giBrand}
          </p>
        </div>
      </div>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground mb-4" data-testid={`text-craft-count-${district.toLowerCase()}`}>
          {craftCount} unique crafts
        </p>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={handleExplore}
          data-testid={`button-explore-${district.toLowerCase()}`}
        >
          Explore Crafts
          <ArrowRight className="ml-2 w-4 h-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
