import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DistrictBadge from "./DistrictBadge";
import GITag from "./GITag";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";

interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  image: string;
  district: string;
  giBrand: string;
  vendorName: string;
}

export default function ProductCard({
  id,
  title,
  price,
  image,
  district,
  giBrand,
  vendorName,
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleAddToCart = () => {
    console.log(`Added ${title} to cart`);
  };

  return (
    <Card
      className="overflow-hidden transition-all hover-elevate active-elevate-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      data-testid={`card-product-${id}`}
    >
      <CardHeader className="p-0">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300"
            style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
          />
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            <DistrictBadge district={district} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        <GITag giBrand={giBrand} />
        <h3 className="font-semibold text-lg line-clamp-2" data-testid={`text-product-title-${id}`}>
          {title}
        </h3>
        <p className="text-sm text-muted-foreground" data-testid={`text-vendor-${id}`}>
          by {vendorName}
        </p>
        <p className="text-2xl font-bold text-primary" data-testid={`text-price-${id}`}>
          Rs. {price.toLocaleString()}
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button 
          className="w-full" 
          onClick={handleAddToCart}
          data-testid={`button-add-to-cart-${id}`}
        >
          <ShoppingCart className="w-4 h-4 mr-2" />
          Add to Cart
        </Button>
      </CardFooter>
    </Card>
  );
}
