'use client';
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { normalizeImagePaths } from "@/lib/utils/image"
import { formatPrice } from "@/lib/utils/price"
import { addToCart } from "@/lib/cart"
import { useToast } from "@/hooks/use-toast"

type QuickViewDialogProps = {
  productId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

type ProductSummary = {
  id: string
  title: string
  description?: string | null
  price: string
  images: string[]
  district: string
  giBrand: string
  storeId: string
  stock: number
}

export default function QuickViewDialog({ productId, open, onOpenChange }: QuickViewDialogProps) {
  const { toast } = useToast()
  const { data: product, isLoading, isError } = useQuery<ProductSummary>({
    queryKey: [`/api/products/${productId}`],
    enabled: open && !!productId,
  })

  const images = useMemo(() => normalizeImagePaths(product?.images || []), [product])
  const priceNum = useMemo(() => Number(product?.price ?? 0), [product])

  const handleAddToCart = () => {
    if (!product) return
    addToCart({
      productId: product.id,
      title: product.title,
      price: product.price,
      image: images[0] || "",
      district: product.district,
      giBrand: product.giBrand,
      storeId: product.storeId,
      storeName: "",
      stock: Number(product.stock || 0),
    }, 1)
    toast({ title: "Added to cart", description: `${product.title} added to your cart.` })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-labelledby="quick-view-title" aria-describedby="quick-view-description">
        <DialogHeader>
          <DialogTitle id="quick-view-title">{product?.title || "Quick View"}</DialogTitle>
          {product?.description && (
            <DialogDescription id="quick-view-description" className="line-clamp-3">
              {product.description}
            </DialogDescription>
          )}
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="aspect-square rounded-md overflow-hidden bg-muted">
            {images[0] ? (
              <img
                src={images[0]}
                alt={product?.title || "Product image"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full" />
            )}
          </div>
          <div className="space-y-3">
            {isError ? (
              <p className="text-sm text-destructive">Failed to load product</p>
            ) : isLoading ? (
              <div className="space-y-2">
                <div className="h-6 w-1/2 bg-muted/50 rounded animate-pulse" />
                <div className="h-4 w-2/3 bg-muted/50 rounded animate-pulse" />
                <div className="h-10 w-full bg-muted/50 rounded animate-pulse" />
              </div>
            ) : product ? (
              <>
                <div className="text-2xl font-semibold text-primary" aria-live="polite">
                  {formatPrice(priceNum)}
                </div>
                <div className="text-sm text-muted-foreground">
                  {product.district} • {product.giBrand}
                </div>
                <Button
                  className="w-full"
                  onClick={handleAddToCart}
                  disabled={Number(product.stock || 0) <= 0}
                  aria-label="Add to cart"
                  data-testid={`button-quick-view-add-${productId}`}
                >
                  Add to Cart
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
