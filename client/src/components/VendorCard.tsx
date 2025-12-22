import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, Star } from "lucide-react";
import DistrictBadge from "./DistrictBadge";
import { Link } from "wouter";
import { useState } from "react";

interface VendorCardProps {
  id: string;
  name: string;
  district: string;
  giBrands: string[];
  rating: number;
  totalProducts: number;
  avatar?: string;
}

export default function VendorCard({
  id,
  name,
  district,
  giBrands,
  rating,
  totalProducts,
  avatar,
}: VendorCardProps) {
  const initials = name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  return (
    <Card className="hover-elevate active-elevate-2" data-testid={`card-vendor-${id}`}>
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16">
            <AvatarImage
              src={avatar}
              alt={name}
              loading="lazy"
              decoding="async"
              width={64}
              height={64}
              onLoad={() => setAvatarLoaded(true)}
              onError={() => setAvatarLoaded(true)}
              className={avatarLoaded ? undefined : "opacity-0"}
            />
            {!avatarLoaded && (
              <div className="absolute inset-0 rounded-full bg-muted/50 animate-pulse" aria-hidden="true" />
            )}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1" data-testid={`text-vendor-name-${id}`}>
              {name}
            </h3>
            <DistrictBadge district={district} className="mb-2" />
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-primary text-primary" />
                <span data-testid={`text-rating-${id}`}>{rating.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Store className="w-4 h-4" />
                <span data-testid={`text-products-${id}`}>{totalProducts} products</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-4">
              {giBrands.slice(0, 2).map((gi) => (
                <Badge key={gi} variant="secondary" className="text-xs">
                  {gi}
                </Badge>
              ))}
              {giBrands.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{giBrands.length - 2}
                </Badge>
              )}
            </div>
            <Link href={`/stores/${id}`}>
              <Button 
                className="w-full"
                data-testid={`button-visit-store-${id}`}
              >
                Visit Store
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
