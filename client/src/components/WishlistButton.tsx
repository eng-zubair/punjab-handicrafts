import { Button } from "@/components/ui/button";
import { useWishlist } from "@/components/WishlistContext";
import { Heart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface WishlistButtonProps {
  productId: string;
  size?: "icon" | "default" | "sm" | "lg";
  variant?: "ghost" | "outline" | "default" | "secondary" | "destructive";
  stopPropagation?: boolean;
  className?: string;
}

export default function WishlistButton({
  productId,
  size = "icon",
  variant = "ghost",
  stopPropagation = true,
  className,
}: WishlistButtonProps) {
  const { isSaved, toggle } = useWishlist();
  const { isAuthenticated } = useAuth();
  const saved = isSaved(productId);
  return (
    <Button
      variant={variant}
      size={size}
      aria-pressed={saved}
      onClick={(e) => {
        if (stopPropagation) e.stopPropagation();
        toggle(productId);
        if (isAuthenticated) {
          if (saved) {
            apiRequest("DELETE", `/api/wishlist/${productId}`)
              .then(() => {
                queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
                queryClient.invalidateQueries({ queryKey: ["/api/wishlist/products"] });
              })
              .catch(() => {});
          } else {
            apiRequest("POST", "/api/wishlist", { productId })
              .then(() => {
                queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
                queryClient.invalidateQueries({ queryKey: ["/api/wishlist/products"] });
              })
              .catch(() => {});
          }
        }
      }}
      data-testid={`button-wishlist-${productId}`}
      aria-label={saved ? "Unsave product" : "Save product"}
      className={(size === "icon" ? "rounded-full " : "") + (className || "")}
    >
      <Heart className={"w-4 h-4 " + (saved ? "text-primary fill-current" : "text-primary")} />
      {size !== "icon" ? <span className="ml-2">{saved ? "Saved" : "Save"}</span> : null}
    </Button>
  );
}
