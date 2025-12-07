import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import DiscountBadge from "@/components/DiscountBadge";
import { Button } from "@/components/ui/button";
import DistrictBadge from "./DistrictBadge";
import GITag from "./GITag";
import { ShoppingCart, Star } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { addToCart } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import { formatPrice } from "@/lib/utils/price";
import { normalizeImagePath } from "@/lib/utils/image";

interface ProductCardProps {
  id: string;
  title: string;
  description?: string;
  price: number | string;
  discountedPrice?: number;
  image: string;
  district: string;
  giBrand: string;
  vendorName: string;
  storeId?: string;
  stock?: number;
  ratingAverage?: number;
  ratingCount?: number;
  promotionPercent?: number;
  promotionTone?: "primary" | "destructive" | "success" | "secondary" | "warning";
  promotionEndsAt?: string;
}

export default function ProductCard({
  id,
  title,
  description,
  price,
  discountedPrice,
  image,
  district,
  giBrand,
  vendorName,
  storeId = '',
  stock = 10,
  ratingAverage = 0,
  ratingCount = 0,
  promotionPercent,
  promotionTone,
  promotionEndsAt,
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const handleCardClick = () => {
    setLocation(`/products/${id}`);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const basePriceStr = typeof price === 'number' ? price.toString() : price;
    const priceStr = discountedPrice != null ? discountedPrice.toString() : basePriceStr;
    
    addToCart({
      productId: id,
      title,
      price: priceStr,
      image: normalizeImagePath(image),
      district,
      giBrand,
      storeId,
      storeName: vendorName,
      stock,
    }, 1);

    toast({
      title: "Added to cart",
      description: `${title} added to your cart.`,
    });
  };

  return (
    <Card
      className="overflow-hidden transition-all hover-elevate active-elevate-2 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      data-testid={`card-product-${id}`}
    >
      <CardHeader className="p-0">
        <div className={"relative aspect-[4/3] overflow-hidden bg-muted " + (promotionPercent != null ? (isHovered ? "ring-2 ring-primary/60" : "") : "")}>
          <img
            src={normalizeImagePath(image)}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-300"
            style={{ transform: isHovered ? 'scale(1.05)' : 'scale(1)' }}
          />
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            <DistrictBadge district={district} />
          </div>
          {promotionPercent != null && (
            <div className="absolute top-2 left-2 flex items-center gap-2">
              <DiscountBadge percent={promotionPercent} tone={promotionTone || "destructive"} size="md" />
              {promotionEndsAt && (
                <span className="text-xs px-2 py-0.5 rounded bg-black/50 text-white" data-testid={`text-countdown-${id}`}>
                  {(() => {
                    const ends = new Date(promotionEndsAt).getTime();
                    const diff = Math.max(0, ends - Date.now());
                    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    return d > 0 ? `${d}d ${h}h` : `${h}h`;
                  })()}
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-2">
        <GITag giBrand={giBrand} />
        <h3 className="font-semibold text-lg line-clamp-2" data-testid={`text-product-title-${id}`}>
          {title}
        </h3>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
            <span>{Number(ratingAverage).toFixed(1)}</span>
          </div>
          <span className="text-muted-foreground">({ratingCount})</span>
        </div>
        {discountedPrice != null ? (
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-primary" data-testid={`text-price-${id}`}>
              {formatPrice(discountedPrice)}
            </p>
            <p className="text-sm line-through text-muted-foreground" data-testid={`text-original-price-${id}`}>
              {formatPrice(price)}
            </p>
          </div>
        ) : (
          <p className="text-2xl font-bold text-primary" data-testid={`text-price-${id}`}>
            {formatPrice(price)}
          </p>
        )}
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
