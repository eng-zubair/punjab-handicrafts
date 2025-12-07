import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, ShoppingCart, Store, MapPin, Award, Minus, Plus, ArrowLeft, Star } from "lucide-react";
import { useState, useEffect } from "react";
import type { Product, Variant } from "@shared/schema";
import { addToCart } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, toSafeNumber } from "@/lib/utils/price";
import { normalizeImagePaths } from "@/lib/utils/image";
import DiscountBadge from "@/components/DiscountBadge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

type Store = {
  id: string;
  vendorId: string;
  name: string;
  description: string | null;
  district: string;
  status: string;
};

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sort, setSort] = useState<'newest'|'highest'|'helpful'>('newest');
  const [newReviewId, setNewReviewId] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<FileList | null>(null);
  const [mediaType, setMediaType] = useState<'image'|'video'>('image');
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [parsedVariants, setParsedVariants] = useState<Variant[]>([]);

  const { data: product, isLoading: productLoading, isError: productError, error: productErrorData } = useQuery<Product>({
    queryKey: [`/api/products/${id}`],
    enabled: !!id,
  });

  useEffect(() => {
    if (product?.variants) {
      try {
        const variants = typeof product.variants === 'string' 
          ? JSON.parse(product.variants) 
          : product.variants;
        if (Array.isArray(variants) && variants.length > 0) {
          setParsedVariants(variants);
          setSelectedVariant(variants[0]);
        }
      } catch (e) {
        console.error("Failed to parse variants", e);
      }
    }
  }, [product]);

  const { data: activePromotions = [] } = useQuery<Array<{ productId: string; promotionId: string; type: string; value: string; endAt: string | null }>>({
    queryKey: [`/api/promotions/active-by-products`, { ids: id }],
    enabled: !!id,
  });

  const { data: store, isLoading: storeLoading, isError: storeError } = useQuery<Store>({
    queryKey: [`/api/stores/${product?.storeId}`],
    enabled: !!product?.storeId,
  });

  const { data: reviewData, isLoading: reviewsLoading, isError: reviewsError, error: reviewsErrorData, refetch: refetchReviews } = useQuery<{ reviews: any[]; stats: { count: number; average: number } }>({
    queryKey: [`/api/products/${id}/reviews`, { sort }],
    enabled: !!id,
  });

  const handleQuantityChange = (delta: number) => {
    const maxStock = selectedVariant ? selectedVariant.stock : (product?.stock || 0);
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= maxStock) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    if (!product || !store) {
      toast({
        title: "Cannot add to cart",
        description: "Please wait for product information to load.",
        variant: "destructive",
      });
      return;
    }
    
    const priceToUse = selectedVariant ? selectedVariant.price : (discounted != null ? discounted : product.price);
    const titleToUse = selectedVariant ? `${product.title} (${selectedVariant.type}: ${selectedVariant.option})` : product.title;
    const stockToUse = selectedVariant ? selectedVariant.stock : product.stock;
    const skuToUse = selectedVariant ? selectedVariant.sku : undefined;

    addToCart({
      productId: product.id,
      title: titleToUse,
      price: priceToUse.toString(),
      image: images[0] || '',
      district: product.district,
      giBrand: product.giBrand,
      storeId: product.storeId,
      storeName: store.name,
      stock: stockToUse,
      variant: selectedVariant ? {
        type: selectedVariant.type,
        option: selectedVariant.option,
        sku: selectedVariant.sku
      } : undefined
    }, quantity);

    toast({
      title: "Added to cart",
      description: `${quantity} × ${titleToUse} added to your cart.`,
    });
  };

  const handleBuyNow = () => {
    if (!product || !store) {
      toast({
        title: "Cannot proceed",
        description: "Please wait for product information to load.",
        variant: "destructive",
      });
      return;
    }
    
    const priceToUse = selectedVariant ? selectedVariant.price : (discounted != null ? discounted : product.price);
    const titleToUse = selectedVariant ? `${product.title} (${selectedVariant.type}: ${selectedVariant.option})` : product.title;
    const stockToUse = selectedVariant ? selectedVariant.stock : product.stock;

    addToCart({
      productId: product.id,
      title: titleToUse,
      price: priceToUse.toString(),
      image: images[0] || '',
      district: product.district,
      giBrand: product.giBrand,
      storeId: product.storeId,
      storeName: store.name,
      stock: stockToUse,
      variant: selectedVariant ? {
        type: selectedVariant.type,
        option: selectedVariant.option,
        sku: selectedVariant.sku
      } : undefined
    }, quantity);

    setLocation('/cart');
  };

  if (productError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive" data-testid="alert-error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Product</AlertTitle>
          <AlertDescription>
            {productErrorData instanceof Error ? productErrorData.message : "Failed to load product details."}
          </AlertDescription>
          <Button 
            variant="outline" 
            onClick={() => setLocation('/products')}
            className="mt-4"
            data-testid="button-back-to-products"
          >
            Back to Products
          </Button>
        </Alert>
      </div>
    );
  }

  if (productLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="aspect-square bg-muted/50 rounded-lg animate-pulse" />
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square bg-muted/50 rounded-md animate-pulse" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="h-8 bg-muted/50 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-muted/50 rounded animate-pulse w-1/2" />
            <div className="h-20 bg-muted/50 rounded animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground" data-testid="text-not-found">
              Product not found
            </p>
            <Button 
              variant="outline" 
              onClick={() => setLocation('/products')}
              className="mt-4"
              data-testid="button-back-to-products"
            >
              Back to Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOutOfStock = selectedVariant ? selectedVariant.stock === 0 : product.stock === 0;
  const images = normalizeImagePaths(product.images);
  const priceNum = selectedVariant ? Number(selectedVariant.price) : Number(product.price);
  const promo = (activePromotions || []).find(p => p.productId === product.id);
  let discounted: number | undefined = undefined;
  let percent: number | undefined = undefined;
  let tone: "primary" | "destructive" | "success" | "secondary" | "warning" | undefined = undefined;
  let endsAt: string | null | undefined = promo?.endAt || undefined;
  
  if (promo && !selectedVariant) { // Only apply main product promo if no variant selected (or should variants also get promo? assume no for now or complicate things)
    // For now, let's assume promos apply to base price, but if variant overrides price, promo logic might need adjustment.
    // If variant is selected, let's disable promo calculation unless we know promo applies to variants too.
    // Simpler: If variant is selected, use variant price. If not, use promo price.
    if (promo.type === 'percentage') {
      const pct = parseFloat(promo.value);
      discounted = Math.max(0, priceNum * (100 - pct) / 100);
      percent = pct;
      tone = "warning";
    } else if (promo.type === 'fixed') {
      const val = parseFloat(promo.value);
      discounted = Math.max(0, priceNum - val);
      percent = Math.max(0, Math.round((val / Math.max(priceNum, 1)) * 100));
      tone = "success";
    } else {
      tone = "primary";
    }
  } else if (selectedVariant) {
    // If variant selected, reset discount (unless we want to apply generic discount to variants too)
    discounted = undefined;
    percent = undefined;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => setLocation('/products')}
        className="mb-6"
        data-testid="button-back"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Products
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="aspect-square bg-muted rounded-lg overflow-hidden">
            {images.length > 0 ? (
              <img
                src={images[selectedImage]}
                alt={product.title}
                className="w-full h-full object-cover"
                data-testid="img-product-main"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">No image available</p>
              </div>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square rounded-md overflow-hidden border-2 ${
                    selectedImage === index ? 'border-primary' : 'border-transparent'
                  }`}
                  data-testid={`button-thumbnail-${index}`}
                >
                  <img
                    src={image}
                    alt={`${product.title} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2" data-testid="text-product-title">
              {product.title}
            </h1>
            {percent != null && (
              <div className="flex items-center gap-2">
                <DiscountBadge percent={percent} tone={tone || "destructive"} size="md" />
                {endsAt && (
                  <span className="text-xs px-2 py-0.5 rounded bg-black/50 text-white" data-testid="text-detail-countdown">
                    {(() => {
                      const ends = new Date(endsAt as any).getTime();
                      const diff = Math.max(0, ends - Date.now());
                      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                      return d > 0 ? `${d}d ${h}h remaining` : `${h}h remaining`;
                    })()}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" data-testid="badge-district">
                <MapPin className="w-3 h-3 mr-1" />
                {product.district}
              </Badge>
              <Badge variant="outline" data-testid="badge-gi-brand">
                <Award className="w-3 h-3 mr-1" />
                {product.giBrand}
              </Badge>
              {product.category && (
                <Badge variant="outline" className="bg-primary/5">
                  {product.category}
                </Badge>
              )}
              {isOutOfStock && (
                <Badge variant="destructive" data-testid="badge-out-of-stock">
                  Out of Stock
                </Badge>
              )}
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                {Number(reviewData?.stats.average ?? 0).toFixed(1)}
              </span>
              <span className="text-muted-foreground">({reviewData?.stats.count ?? 0})</span>
            </div>
          </div>

          <div>
            {discounted != null ? (
              <div className="flex items-baseline gap-2">
                <Badge className="bg-red-600 text-white">SALE</Badge>
                <p className="text-3xl font-bold text-primary" data-testid="text-price">
                  {formatPrice(discounted)}
                </p>
                <p className="text-lg line-through text-muted-foreground" data-testid="text-original-price-detail">
                  {formatPrice(product.price)}
                </p>
              </div>
            ) : (
              <p className="text-3xl font-bold text-primary" data-testid="text-price">
                {formatPrice(priceNum)}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-stock">
              {isOutOfStock ? 'Currently unavailable' : `${selectedVariant ? selectedVariant.stock : product.stock} in stock`}
            </p>
          </div>

          {product.description && (
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-muted-foreground" data-testid="text-description">
                {product.description}
              </p>
            </div>
          )}

          {parsedVariants.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Variants</h3>
              <div className="flex flex-wrap gap-2">
                {parsedVariants.map((v, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedVariant(v)}
                    className={cn(
                      "px-3 py-1.5 rounded-md border text-sm transition-all",
                      selectedVariant?.sku === v.sku
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-accent hover:text-accent-foreground"
                    )}
                    data-testid={`btn-variant-${v.sku}`}
                  >
                    {v.type}: {v.option}
                  </button>
                ))}
              </div>
              {selectedVariant && (
                 <p className="text-xs text-muted-foreground mt-1">
                   SKU: {selectedVariant.sku} | Stock: {selectedVariant.stock}
                 </p>
              )}
            </div>
          )}

          <Separator />

          {!isOutOfStock && (
            <div>
              <h3 className="font-semibold mb-3">Quantity</h3>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  data-testid="button-decrease-quantity"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-lg font-semibold min-w-12 text-center" data-testid="text-quantity">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= product.stock}
                  data-testid="button-increase-quantity"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex gap-3 flex-wrap">
            <Button
              onClick={handleAddToCart}
              variant="outline"
              className="flex-1 min-w-40"
              disabled={isOutOfStock || storeLoading || !store}
              data-testid="button-add-to-cart"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              {storeLoading ? 'Loading...' : 'Add to Cart'}
            </Button>
            <Button
              onClick={handleBuyNow}
              className="flex-1 min-w-40"
              disabled={isOutOfStock || storeLoading || !store}
              data-testid="button-buy-now"
            >
              {storeLoading ? 'Loading...' : 'Buy Now'}
            </Button>
          </div>

          <Separator />

          {storeError ? (
            <Alert variant="destructive" data-testid="alert-store-error">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Vendor Information Unavailable</AlertTitle>
              <AlertDescription>
                Unable to load vendor information. You can still view the product, but purchasing is temporarily unavailable.
              </AlertDescription>
            </Alert>
          ) : storeLoading ? (
            <Card>
              <CardHeader>
                <div className="h-6 bg-muted/50 rounded animate-pulse w-32" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-muted/50 rounded animate-pulse" />
                  <div className="h-4 bg-muted/50 rounded animate-pulse w-3/4" />
                </div>
              </CardContent>
            </Card>
          ) : store ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Vendor Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="font-semibold" data-testid="text-store-name">
                    {store.name}
                  </p>
                  {store.description && (
                    <p className="text-sm text-muted-foreground" data-testid="text-store-description">
                      {store.description}
                    </p>
                  )}
                  <p className="text-sm flex items-center gap-1" data-testid="text-store-district">
                    <MapPin className="w-4 h-4" />
                    {store.district}
                  </p>
                  <Link href={`/stores/${store.id}`}>
                    <Button variant="ghost" className="px-0 h-auto" data-testid="button-view-store">
                      View Store
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
      {(() => {
        const data = {
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.title,
          image: images[0] || undefined,
          description: product.description || undefined,
          brand: { "@type": "Brand", name: product.giBrand },
          offers: {
            "@type": "Offer",
            priceCurrency: "PKR",
            price: discounted != null ? discounted : priceNum,
            availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            priceValidUntil: endsAt || undefined,
          }
        };
        return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
      })()}
      <div className="mt-10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold">Ratings & Reviews</h2>
            <p className="text-muted-foreground">
              {reviewData?.stats.count ?? 0} reviews • Avg {Number(reviewData?.stats.average ?? 0).toFixed(1)} / 5
            </p>
          </div>
          <select aria-label="Sort reviews" value={sort} onChange={(e) => setSort(e.target.value as any)} className="h-9 rounded-md border bg-background px-2">
            <option value="newest">Newest</option>
            <option value="highest">Highest Rated</option>
            <option value="helpful">Most Helpful</option>
          </select>
        </div>

        {reviewsError && (
          <Alert variant="destructive" data-testid="alert-reviews-error">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Unable to load reviews</AlertTitle>
            <AlertDescription>
              {reviewsErrorData instanceof Error ? reviewsErrorData.message : "Failed to load reviews."}
            </AlertDescription>
            <Button variant="outline" onClick={() => refetchReviews()} className="mt-4" data-testid="button-reviews-retry">Retry</Button>
          </Alert>
        )}

        {isAuthenticated && (
          <div className="grid grid-cols-1 gap-4 border rounded-lg p-4">
            <div className="flex items-center gap-2" aria-label="Rate this product">
              {Array.from({ length: 10 }).map((_, i) => {
                const val = (i + 1) / 2;
                const active = (hoverRating ?? rating) >= val;
                return (
                  <button
                    key={val}
                    type="button"
                    aria-label={`${val} stars`}
                    className={`w-6 h-6 ${active ? 'text-yellow-500' : 'text-muted-foreground'}`}
                    onMouseEnter={() => setHoverRating(val)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRating(val)}
                  >★</button>
                );
              })}
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience (20-500 characters)"
              aria-label="Write your review"
            />
            <div className="flex gap-2">
                <Button
                  onClick={async () => {
                    try {
                      const body = { rating, comment };
                      const res = await apiRequest('POST', `/api/products/${id}/reviews`, body);
                      const created = await res.json();
                      setNewReviewId(created.id);
                      toast({ title: 'Submitted', description: 'Review submitted. You can add media.' });
                      setRating(0); setComment("");
                      refetchReviews();
                      try {
                        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
                      } catch {}
                    } catch {
                      toast({ title: 'Error', description: 'Failed to submit review', variant: 'destructive' });
                    }
                  }}
                  disabled={rating < 0.5 || comment.length < 20 || comment.length > 500}
                >Submit Review</Button>
              {newReviewId && (
                <div className="flex items-center gap-2">
                  <select aria-label="Media type" value={mediaType} onChange={(e) => setMediaType(e.target.value as any)} className="h-9 rounded-md border bg-background px-2">
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                  </select>
                  <input type="file" multiple aria-label="Upload review media" onChange={(e) => setMediaFiles(e.target.files)} />
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      if (!mediaFiles || mediaFiles.length === 0) return;
                      const file = mediaFiles[0];
                      const buf = await file.arrayBuffer();
                      const res = await fetch(`/api/reviews/${newReviewId}/media/upload?type=${mediaType}`, { method: 'POST', body: buf, credentials: 'include' });
                      if (res.ok) {
                        toast({ title: 'Uploaded', description: 'Media added to review' });
                        setMediaFiles(null);
                        setNewReviewId(null);
                        refetchReviews();
                      } else {
                        toast({ title: 'Error', description: 'Failed to upload media', variant: 'destructive' });
                      }
                    }}
                  >Upload</Button>
                </div>
              )}
            </div>
          </div>
        )}

        {reviewsLoading ? (
          <div className="grid gap-4">
            {[1,2,3].map((i) => (
              <div key={i} className="border rounded-lg p-4">
                <div className="h-5 bg-muted/50 rounded w-40 animate-pulse" />
                <div className="mt-2 h-4 bg-muted/50 rounded w-full animate-pulse" />
                <div className="mt-2 h-4 bg-muted/50 rounded w-3/4 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-4">
          {(reviewData?.reviews ?? []).map((r) => (
            <div key={r.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {Array.from({ length: 10 }).map((_, i) => {
                      const val = (i + 1) / 2;
                      return <span key={val} className={`w-5 h-5 ${Number(r.rating) >= val ? 'text-yellow-500' : 'text-muted-foreground'}`}>★</span>;
                    })}
                  </div>
                  {r.verifiedPurchase && <Badge>Verified Purchase</Badge>}
                </div>
                <div className="text-sm text-muted-foreground">{r.reviewerName ? r.reviewerName : ''} • {new Date(r.createdAt).toLocaleDateString()}</div>
              </div>
              <p className="mt-2 text-sm">{r.comment}</p>
              {r.media && r.media.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {r.media.map((m: any, idx: number) => (
                    m.type === 'video' ? (
                      <video key={idx} controls className="w-full rounded">
                        <source src={m.url} type="video/mp4" />
                      </video>
                    ) : (
                      <img key={idx} src={m.url} alt="Review media" className="w-full h-32 object-cover rounded" />
                    )
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center gap-4">
                <button
                  className="text-sm text-primary"
                  aria-label="Mark review helpful"
                  onClick={async () => {
                    try {
                      await apiRequest('POST', `/api/reviews/${r.id}/vote`, { value: 'up' });
                      refetchReviews();
                    } catch {}
                  }}
                >Helpful ({r.helpfulUp})</button>
                <button
                  className="text-sm text-muted-foreground"
                  aria-label="Mark review unhelpful"
                  onClick={async () => {
                    try {
                      await apiRequest('POST', `/api/reviews/${r.id}/vote`, { value: 'down' });
                      refetchReviews();
                    } catch {}
                  }}
                >Not Helpful ({r.helpfulDown})</button>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>
    </div>
  );
}
