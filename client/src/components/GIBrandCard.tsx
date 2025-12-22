import { Card, CardContent } from "@/components/ui/card";
import { Award } from "lucide-react";
import { useLocation } from "wouter";
import { toSlug } from "@/lib/utils";
import { useState } from "react";

interface GIBrandCardProps {
  giBrand: string;
  district: string;
  image: string;
  craftCount: number;
}

export default function GIBrandCard({ giBrand, district, image, craftCount }: GIBrandCardProps) {
  const [, setLocation] = useLocation();
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleExplore = () => {
    setLocation(`/brands/${toSlug(giBrand)}`);
  };

  return (
    <Card
      className="overflow-hidden hover-elevate active-elevate-2 transition-all cursor-pointer"
      onClick={handleExplore}
      data-testid={`card-gi-brand-${giBrand.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={image}
          alt={giBrand}
          loading="lazy"
          decoding="async"
          width={400}
          height={300}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
          className={"w-full h-full object-cover " + (imageLoaded ? "opacity-100" : "opacity-0")}
        />
        {!imageLoaded && (
          <div className="absolute inset-0 bg-muted/50 animate-pulse" aria-hidden="true" />
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          <h3 className="font-semibold" data-testid={`text-gi-brand-${giBrand.toLowerCase().replace(/\s+/g, '-')}`}>
            {giBrand}
          </h3>
        </div>
      </CardContent>
    </Card>
  );
}
