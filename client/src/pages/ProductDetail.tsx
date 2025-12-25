import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AlertCircle, ShoppingCart, Store, MapPin, Award, Minus, Plus, ArrowLeft, Star, RotateCcw, Link as LinkIcon, Truck, Wallet, ShieldCheck, ArrowLeftRight } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
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
import WishlistButton from "@/components/WishlistButton";
import ProductCard from "@/components/ProductCard";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { TransformWrapper, TransformComponent, ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { SiWhatsapp, SiFacebook, SiX } from "react-icons/si";
import RecentlyViewed from "@/components/RecentlyViewed";
import { addRecentlyViewed } from "@/lib/recentlyViewed";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCompare } from "@/components/CompareContext";

if (typeof window !== "undefined" && typeof (window as any).ResizeObserver !== "function") {
  (window as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

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
  const [sort, setSort] = useState<'newest' | 'highest' | 'helpful'>('helpful');
  const [newReviewId, setNewReviewId] = useState<string | null>(null);
  const [mediaFiles, setMediaFiles] = useState<FileList | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [parsedVariants, setParsedVariants] = useState<Variant[]>([]);
  const zoomRef = useRef<ReactZoomPanPinchRef | null>(null);
  const [accordionOpen, setAccordionOpen] = useState<string[]>([]);
  const [votes, setVotes] = useState<Record<string, 'up' | 'down'>>({});
  const rqClient = useQueryClient();
  const { isCompared, toggle, maxItems, count } = useCompare();

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
        }
      } catch (e) {
        console.error("Failed to parse variants", e);
      }
    }
  }, [product]);

  useEffect(() => {
    setSelectedImage(0);
  }, [selectedVariant]);

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

  useEffect(() => {
    try {
      const val = localStorage.getItem('review_sort');
      if (val === 'newest' || val === 'highest' || val === 'helpful') {
        setSort(val);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('review_sort', sort);
    } catch {}
  }, [sort]);

  const ratingDistribution = useMemo(() => {
    const total = Number(reviewData?.stats.count ?? 0);
    const buckets: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    (reviewData?.reviews ?? []).forEach((r) => {
      const n = Math.max(1, Math.min(5, Math.round(Number(r.rating))));
      buckets[n] = (buckets[n] || 0) + 1;
    });
    const items = [5, 4, 3, 2, 1].map((star) => {
      const count = buckets[star] || 0;
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      return { star, count, pct };
    });
    return { total, items };
  }, [reviewData]);

  // Compute variant SKUs from product variants for promo fetching
  const variantSkus = useMemo(() => {
    try {
      const vs = product?.variants
        ? (typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants)
        : [];
      return Array.isArray(vs) ? vs.map((v: any) => String(v?.sku || '')).filter(Boolean) : [];
    } catch {
      return [];
    }
  }, [product]);

  // Always call hooks at top-level; enable when SKUs available
  const { data: variantPromos = [] } = useQuery<Array<{ targetId: string; type: string; value: string; endAt: string | null }>>({
    queryKey: ["/api/promotions/active-by-variants", { skus: variantSkus.join(',') }],
    enabled: variantSkus.length > 0,
  });

  const { data: brandRelated } = useQuery<{ products: any[] }>({
    queryKey: ["/api/products", { giBrand: product?.giBrand, page: 1, pageSize: 24 }],
    enabled: !!product?.giBrand,
  });
  const { data: categoryRelated } = useQuery<{ products: any[] }>({
    queryKey: ["/api/products", { category: product?.category, page: 1, pageSize: 24 }],
    enabled: !!product?.category,
  });
  const { data: districtRelated } = useQuery<{ products: any[] }>({
    queryKey: ["/api/products", { district: product?.district, page: 1, pageSize: 24 }],
    enabled: !!product?.district,
  });
  const needMoreFallback =
    ((categoryRelated?.products?.length ?? 0) +
      (brandRelated?.products?.length ?? 0) +
      (districtRelated?.products?.length ?? 0)) < 4;
  const { data: moreApproved } = useQuery<{ products: any[] }>({
    queryKey: ["/api/products", { page: 1, pageSize: 24 }],
    enabled: needMoreFallback,
  });

  const compared = product ? isCompared(product.id) : false;

  useEffect(() => {
    if (product) {
      try {
        const imagesLocal = normalizeImagePaths(
          selectedVariant?.images && selectedVariant.images.length > 0
            ? selectedVariant.images
            : product.images
        );
        const priceNumLocal = selectedVariant ? Number(selectedVariant.price) : Number(product.price);
        const promoLocal = (activePromotions || []).find(p => p.productId === product.id);
        let discountedLocal: number | undefined = undefined;
        if (selectedVariant) {
          const vp = variantPromos.find((p: any) => p.targetId === selectedVariant.sku);
          if (vp) {
            if (vp.type === 'percentage') {
              const pct = parseFloat(vp.value);
              discountedLocal = Math.max(0, priceNumLocal * (100 - pct) / 100);
            } else if (vp.type === 'fixed') {
              const val = parseFloat(vp.value);
              discountedLocal = Math.max(0, priceNumLocal - val);
            } else if (vp.type === 'override' || vp.type === 'fixed_override') {
              const val = parseFloat(vp.value);
              discountedLocal = Math.max(0, val);
            }
          }
        } else if (promoLocal) {
          if (promoLocal.type === 'percentage') {
            const pct = parseFloat(promoLocal.value);
            discountedLocal = Math.max(0, priceNumLocal * (100 - pct) / 100);
          } else if (promoLocal.type === 'fixed') {
            const val = parseFloat(promoLocal.value);
            discountedLocal = Math.max(0, priceNumLocal - val);
          }
        }
        addRecentlyViewed({
          id: product.id,
          title: product.title,
          price: Number(product.price),
          discountedPrice: discountedLocal,
          image: imagesLocal[0] || "",
          district: product.district,
          giBrand: product.giBrand,
          vendorName: "",
          storeId: product.storeId,
          stock: Number(product.stock || 0)
        })
      } catch {}
    }
  }, [product, selectedVariant, activePromotions, variantPromos]);

  useEffect(() => {
    try {
      const key = product?.id ? `pdp-accordion:${product.id}` : null;
      if (!key) return;
      const saved = localStorage.getItem(key);
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr)) setAccordionOpen(arr);
      }
    } catch {}
  }, [product?.id]);

  useEffect(() => {
    try {
      const key = product?.id ? `pdp-accordion:${product.id}` : null;
      if (!key) return;
      localStorage.setItem(key, JSON.stringify(accordionOpen));
    } catch {}
  }, [accordionOpen, product?.id]);

  useEffect(() => {
    if (!product) return;
    if (typeof document === "undefined") return;
    const previousTitle = document.title;
    const head = document.head;
    const sanitize = (value: string) => value.replace(/\s+/g, " ").replace(/"/g, "'").trim();
    const titleParts: string[] = [];
    titleParts.push(sanitize(product.title));
    const attributeParts: string[] = [];
    if (product.category) attributeParts.push(product.category);
    if (product.giBrand) attributeParts.push(product.giBrand);
    if (product.district) attributeParts.push(product.district);
    if (attributeParts.length > 0) {
      titleParts.push(sanitize(attributeParts.slice(0, 2).join(" • ")));
    }
    titleParts.push("Punjab Handicrafts");
    const fullTitle = sanitize(titleParts.join(" | "));
    document.title = fullTitle;
    const stockSource = selectedVariant ? Number(selectedVariant.stock) : Number(product.stock || 0);
    const availabilityText = stockSource > 0 ? "Available now" : "Currently out of stock";
    const descriptionParts: string[] = [];
    if (product.description) {
      descriptionParts.push(product.description);
    }
    descriptionParts.push(`${availabilityText} from artisans in ${product.district}.`);
    descriptionParts.push("Shop authentic Punjabi handicrafts on Punjab Handicrafts.");
    const rawDescription = sanitize(descriptionParts.filter(Boolean).join(" "));
    const metaDescription = rawDescription.length > 160 ? `${rawDescription.slice(0, 157)}...` : rawDescription;
    const ogDescription = rawDescription.length > 300 ? `${rawDescription.slice(0, 297)}...` : rawDescription;
    const shareUrl = getShareUrl();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const resolvePrimaryImage = () => {
      const imgs = normalizeImagePaths(
        selectedVariant?.images && selectedVariant.images.length > 0
          ? selectedVariant.images
          : product.images
      );
      const img = imgs[0];
      if (!img) return null;
      if (img.startsWith("http://") || img.startsWith("https://")) return img;
      if (!origin) return img;
      if (img.startsWith("/")) return `${origin}${img}`;
      return `${origin}/${img}`;
    };
    const primaryImage = resolvePrimaryImage();
    const basePrice = selectedVariant ? Number(selectedVariant.price) : Number(product.price);
    const priceAmount = Number.isFinite(basePrice) ? basePrice.toFixed(0) : null;
    const availabilityValue = stockSource > 0 ? "instock" : "oos";
    const restoreCallbacks: Array<() => void> = [];
    const upsertMeta = (identifier: { name?: string; property?: string }, content: string | null) => {
      if (!content) return;
      const selector = identifier.name
        ? `meta[name="${identifier.name}"]`
        : identifier.property
        ? `meta[property="${identifier.property}"]`
        : "";
      if (!selector) return;
      let el = head.querySelector(selector) as HTMLMetaElement | null;
      let created = false;
      const previousContent = el ? el.getAttribute("content") : null;
      if (!el) {
        el = document.createElement("meta");
        if (identifier.name) el.setAttribute("name", identifier.name);
        if (identifier.property) el.setAttribute("property", identifier.property);
        head.appendChild(el);
        created = true;
      }
      el.setAttribute("content", content);
      restoreCallbacks.push(() => {
        if (!el) return;
        if (created) {
          if (head.contains(el)) head.removeChild(el);
        } else if (previousContent !== null) {
          el.setAttribute("content", previousContent);
        }
      });
    };
    const upsertCanonicalLink = (href: string | null) => {
      if (!href) return;
      const selector = 'link[rel="canonical"]';
      let el = head.querySelector(selector) as HTMLLinkElement | null;
      let created = false;
      const previousHref = el ? el.getAttribute("href") : null;
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", "canonical");
        head.appendChild(el);
        created = true;
      }
      el.setAttribute("href", href);
      restoreCallbacks.push(() => {
        if (!el) return;
        if (created) {
          if (head.contains(el)) head.removeChild(el);
        } else if (previousHref !== null) {
          el.setAttribute("href", previousHref);
        }
      });
    };
    upsertMeta({ name: "description" }, metaDescription || null);
    upsertMeta({ property: "og:title" }, fullTitle);
    upsertMeta({ property: "og:description" }, ogDescription || null);
    upsertMeta({ property: "og:type" }, "product");
    upsertMeta({ property: "og:url" }, shareUrl);
    if (primaryImage) {
      upsertMeta({ property: "og:image" }, primaryImage);
    }
    if (priceAmount) {
      upsertMeta({ property: "product:price:amount" }, priceAmount);
      upsertMeta({ property: "product:price:currency" }, "PKR");
    }
    upsertMeta({ property: "product:availability" }, availabilityValue);
    upsertCanonicalLink(shareUrl);
    return () => {
      document.title = previousTitle;
      restoreCallbacks.forEach((fn) => fn());
    };
  }, [product, selectedVariant, id]);

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

  const trackShareEvent = async (platform: string, success: boolean, error?: string) => {
    try {
      await apiRequest("POST", "/api/analytics/share", {
        platform,
        productId: product?.id,
        success,
        error: error || null,
      });
    } catch {}
  };

  const getShareUrl = () => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      return `${origin}/products/${product?.id ?? id}`;
    } catch {
      return `/products/${product?.id ?? id}`;
    }
  };

  const getShareText = () => {
    const title = product?.title || "Punjab Handicrafts";
    return `Check out "${title}" on Punjab Handicrafts`;
  };

  const openShareWindow = (url: string) => {
    try {
      const w = window.open(url, "_blank", "noopener,noreferrer");
      return !!w;
    } catch {
      return false;
    }
  };

  const handleShareWhatsApp = async () => {
    const url = getShareUrl();
    const text = `${getShareText()} ${url}`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    try {
      if ((navigator as any)?.share) {
        try {
          await (navigator as any).share({ text, url });
          await trackShareEvent("whatsapp", true);
          return;
        } catch (e: any) {
          await trackShareEvent("whatsapp", false, String(e?.message || e));
        }
      }
      const ok = openShareWindow(shareUrl);
      await trackShareEvent("whatsapp", ok);
      if (!ok) throw new Error("Popup blocked");
    } catch (e: any) {
      toast({ title: "Share failed", description: "Unable to share on WhatsApp", variant: "destructive" });
    }
  };

  const handleShareFacebook = async () => {
    const url = getShareUrl();
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    try {
      const ok = openShareWindow(shareUrl);
      await trackShareEvent("facebook", ok);
      if (!ok) throw new Error("Popup blocked");
    } catch (e: any) {
      toast({ title: "Share failed", description: "Unable to share on Facebook", variant: "destructive" });
    }
  };

  const handleShareTwitter = async () => {
    const url = getShareUrl();
    const text = getShareText();
    const hashtags = "Handicrafts,Punjab";
    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}&hashtags=${encodeURIComponent(hashtags)}`;
    try {
      const ok = openShareWindow(shareUrl);
      await trackShareEvent("twitter", ok);
      if (!ok) throw new Error("Popup blocked");
    } catch (e: any) {
      toast({ title: "Share failed", description: "Unable to share on X/Twitter", variant: "destructive" });
    }
  };

  const handleCopyLink = async () => {
    const url = getShareUrl();
    try {
      await navigator.clipboard.writeText(url);
      await trackShareEvent("copy_link", true);
      toast({ title: "Link copied", description: "Product link copied to clipboard" });
    } catch (e: any) {
      await trackShareEvent("copy_link", false, String(e?.message || e));
      toast({ title: "Copy failed", description: "Unable to copy product link", variant: "destructive" });
    }
  };

  if (productError) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
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
        </main>
        <Footer />
      </div>
    );
  }

  if (productLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
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
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
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
        </main>
        <Footer />
      </div>
    );
  }

  const isOutOfStock = selectedVariant ? selectedVariant.stock === 0 : product.stock === 0;
  const images = normalizeImagePaths(
    selectedVariant?.images && selectedVariant.images.length > 0
      ? selectedVariant.images
      : product.images
  );
  const priceNum = selectedVariant ? Number(selectedVariant.price) : Number(product.price);
  const promo = (activePromotions || []).find(p => p.productId === product.id);
  let discounted: number | undefined = undefined;
  let percent: number | undefined = undefined;
  let tone: "primary" | "destructive" | "success" | "secondary" | "warning" | undefined = undefined;
  let endsAt: string | null | undefined = promo?.endAt || undefined;

  if (selectedVariant) {
    const vp = variantPromos.find((p: any) => p.targetId === selectedVariant.sku);
    if (vp) {
      if (vp.type === 'percentage') {
        const pct = parseFloat(vp.value);
        discounted = Math.max(0, priceNum * (100 - pct) / 100);
        percent = pct;
        tone = "warning";
        endsAt = vp.endAt || undefined;
      } else if (vp.type === 'fixed') {
        const val = parseFloat(vp.value);
        discounted = Math.max(0, priceNum - val);
        percent = Math.max(0, Math.round((val / Math.max(priceNum, 1)) * 100));
        tone = "success";
        endsAt = vp.endAt || undefined;
      } else if (vp.type === 'override' || vp.type === 'fixed_override') {
        const val = parseFloat(vp.value);
        discounted = Math.max(0, val);
        percent = undefined;
        tone = "primary";
        endsAt = vp.endAt || undefined;
      } else if (vp.type === 'buy-one-get-one') {
        const qty = quantity;
        if (qty >= 2) {
          const pairs = Math.floor(qty / 2);
          const paidUnits = pairs + (qty % 2);
          const totalForLine = priceNum * paidUnits;
          const effectivePerUnit = totalForLine / qty;
          discounted = Math.max(0, effectivePerUnit);
          percent = Math.max(0, Math.round(((priceNum - discounted) / Math.max(priceNum, 1)) * 100));
          tone = "primary";
          endsAt = vp.endAt || undefined;
        } else {
          discounted = undefined;
          percent = undefined;
          tone = undefined;
        }
      }
    } else {
      discounted = undefined;
      percent = undefined;
    }
  } else if (promo) {
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
    } else if (promo.type === 'buy-one-get-one') {
      const qty = quantity;
      if (qty >= 2) {
        const pairs = Math.floor(qty / 2);
        const paidUnits = pairs + (qty % 2);
        const totalForLine = priceNum * paidUnits;
        const effectivePerUnit = totalForLine / qty;
        discounted = Math.max(0, effectivePerUnit);
        percent = Math.max(0, Math.round(((priceNum - discounted) / Math.max(priceNum, 1)) * 100));
        tone = "primary";
      } else {
        tone = "primary";
      }
    } else {
      tone = "primary";
    }
  }

  const relatedProducts = (() => {
    const byCategory = (categoryRelated?.products || []).filter(p => p.id !== product.id);
    const byBrand = (brandRelated?.products || []).filter(p => p.id !== product.id);
    const byDistrict = (districtRelated?.products || []).filter(p => p.id !== product.id);
    const byFallback = (moreApproved?.products || []).filter(p => p.id !== product.id);
    const map = new Map<string, any>();
    for (const p of [...byCategory, ...byBrand, ...byDistrict, ...byFallback]) {
      if (!map.has(p.id)) map.set(p.id, p);
    }
    const combined = Array.from(map.values());
    const min4 = combined.slice(0, Math.max(4, combined.length));
    return min4;
  })();

  

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <Breadcrumb role="navigation" aria-label="Breadcrumb" className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/" className="max-w-[10rem] truncate">
                    Home
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link href="/products" className="max-w-[10rem] truncate sm:max-w-[14rem]">
                    Products
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="max-w-[45vw] truncate sm:max-w-none">
                  {product.title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
                {images.length > 0 ? (
                  <TransformWrapper
                    ref={zoomRef}
                    key={images[selectedImage] || selectedImage}
                    initialScale={1}
                    minScale={1}
                    maxScale={4}
                    doubleClick={{ disabled: false, mode: "zoomIn" }}
                    wheel={{ disabled: false, step: 0.15 }}
                    pinch={{ disabled: false }}
                    panning={{ disabled: false, lockAxisX: false, lockAxisY: false }}
                    zoomAnimation={{ animationTime: 200, animationType: "easeOut" }}
                  >
                    {({ zoomIn, zoomOut, resetTransform, setTransform }) => (
                      <div className="w-full h-full">
                        <div
                          className="absolute top-2 right-2 z-10 flex gap-2"
                          role="toolbar"
                          aria-label="Image zoom controls"
                        >
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Zoom in"
                            data-testid="button-zoom-in"
                            onClick={() => zoomIn()}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Zoom out"
                            data-testid="button-zoom-out"
                            onClick={() => zoomOut()}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            aria-label="Reset zoom"
                            data-testid="button-zoom-reset"
                            onClick={() => resetTransform()}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        </div>
                        <div
                          tabIndex={0}
                          role="group"
                          aria-label="Product image viewer"
                          aria-describedby="product-image-instructions"
                          className="w-full h-full outline-none"
                          onKeyDown={(e) => {
                            const step = 20;
                            const s = zoomRef.current?.instance.transformState;
                            const scale = s?.scale ?? 1;
                            const positionX = s?.positionX ?? 0;
                            const positionY = s?.positionY ?? 0;
                            if (e.key === "ArrowRight") {
                              setTransform(positionX - step, positionY, scale);
                            } else if (e.key === "ArrowLeft") {
                              setTransform(positionX + step, positionY, scale);
                            } else if (e.key === "ArrowUp") {
                              setTransform(positionX, positionY + step, scale);
                            } else if (e.key === "ArrowDown") {
                              setTransform(positionX, positionY - step, scale);
                            } else if (e.key === "+") {
                              zoomIn();
                            } else if (e.key === "-") {
                              zoomOut();
                            } else if (e.key === "Escape" || e.key === "0") {
                              resetTransform();
                            }
                          }}
                          data-testid="container-image-zoom"
                        >
                          <TransformComponent wrapperStyle={{ width: "100%", height: "100%", willChange: "transform" }}>
                            <div className="w-full h-full">
                              <img
                                src={images[selectedImage]}
                                alt={product.title}
                                className="w-full h-full object-contain select-none"
                                data-testid="img-product-main"
                                draggable={false}
                              />
                            </div>
                          </TransformComponent>
                        </div>
                        <span id="product-image-instructions" className="sr-only">
                          Use mouse wheel or pinch to zoom. Drag to pan when zoomed. Use plus and minus buttons, or keyboard plus/minus. Arrow keys pan; Escape resets.
                        </span>
                      </div>
                    )}
                  </TransformWrapper>
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
                      className={`aspect-square rounded-md overflow-hidden border-2 ${selectedImage === index ? 'border-primary' : 'border-transparent'
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
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-3xl font-bold mb-2" data-testid="text-product-title">
                    {product.title}
                  </h1>
                  <WishlistButton productId={product.id} variant="outline" size="sm" stopPropagation={false} />
                </div>
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
                    <p className="text-3xl font-bold text-primary" data-testid="text-price" aria-live="polite">
                      {formatPrice(discounted)}
                    </p>
                    <p className="text-lg line-through text-muted-foreground" data-testid="text-original-price-detail">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                ) : (
                  <p className="text-3xl font-bold text-primary" data-testid="text-price" aria-live="polite">
                    {formatPrice(priceNum)}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1" data-testid="text-stock" aria-live="polite">
                  {isOutOfStock ? 'Currently unavailable' : `${selectedVariant ? selectedVariant.stock : product.stock} in stock`}
                </p>
                {parsedVariants.length > 0 && !selectedVariant && (
                  <p className="text-xs text-muted-foreground mt-1" data-testid="text-variant-hint">
                    No variant selected — showing base product details
                  </p>
                )}
                {selectedVariant && (
                  <div className="mt-2 text-sm text-muted-foreground" data-testid="text-selected-variant-info">
                    <span className="mr-3">Type: {selectedVariant.type}</span>
                    <span className="mr-3">Option: {selectedVariant.option}</span>
                    <span>Price: {formatPrice(Number(selectedVariant.price))}</span>
                  </div>
                )}
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
                <div role="radiogroup" aria-label="Variant selection">
                  <h3 className="font-semibold mb-2">Variants</h3>
                  <div className="flex flex-wrap gap-2">
                    {parsedVariants.map((v, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedVariant(selectedVariant?.sku === v.sku ? null : v)}
                        className={cn(
                          "px-3 py-1.5 rounded-md border text-sm transition-all",
                          selectedVariant?.sku === v.sku
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background hover:bg-accent hover:text-accent-foreground"
                        )}
                        role="radio"
                        aria-checked={selectedVariant?.sku === v.sku}
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

              {parsedVariants.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">All Variants</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {parsedVariants.map((v) => {
                      const vImages = normalizeImagePaths(v.images || []);
                      const thumb = vImages[0] || images[0] || '';
                      return (
                        <div key={v.sku} className="border rounded-lg p-3 flex gap-3 items-center">
                          <div className="w-20 h-20 rounded overflow-hidden bg-muted">
                            {thumb ? (
                              <img src={thumb} alt={v.name || `${v.type} ${v.option}`} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium" data-testid={`text-variant-name-${v.sku}`}>{v.name || `${v.type} ${v.option}`}</div>
                            <div className="text-sm text-muted-foreground">
                              <span className="mr-2">Type: {v.type}</span>
                              <span className="mr-2">Option: {v.option}</span>
                              <span>Stock: {v.stock}</span>
                            </div>
                            <div className="mt-1 text-sm" data-testid={`text-variant-price-${v.sku}`}>{formatPrice(Number(v.price))}</div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedVariant(selectedVariant?.sku === v.sku ? null : v); setSelectedImage(0); }}
                            data-testid={`btn-select-variant-${v.sku}`}
                          >{selectedVariant?.sku === v.sku ? 'Deselect' : 'Select'}</Button>
                        </div>
                      );
                    })}
                  </div>
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
                      disabled={quantity >= (selectedVariant ? selectedVariant.stock : product.stock)}
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
                <Button
                  type="button"
                  variant={compared ? "default" : "outline"}
                  className="flex-none min-w-32"
                  disabled={!product}
                  onClick={() => {
                    if (!product) return;
                    if (!compared && count >= maxItems) {
                      toast({
                        variant: "destructive",
                        title: "Comparison limit reached",
                        description: `You can compare up to ${maxItems} products.`,
                      });
                      return;
                    }
                    toggle(product.id);
                  }}
                  data-testid="button-toggle-compare"
                >
                  <ArrowLeftRight className="w-4 h-4 mr-2" />
                  {compared ? "In Comparison" : "Compare"}
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold">Share</h3>
                <div className="flex items-center gap-3 flex-wrap" role="group" aria-label="Share this product">
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    aria-label="Share on WhatsApp"
                    data-testid="button-share-whatsapp"
                    className="p-2 rounded-full transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{ backgroundColor: "#25D366" }}
                  >
                    <SiWhatsapp size={24} color="#ffffff" />
                  </button>
                  <button
                    type="button"
                    onClick={handleShareFacebook}
                    aria-label="Share on Facebook"
                    data-testid="button-share-facebook"
                    className="p-2 rounded-full transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2"
                    style={{ backgroundColor: "#1877F2" }}
                  >
                    <SiFacebook size={24} color="#ffffff" />
                  </button>
                  <button
                    type="button"
                    onClick={handleShareTwitter}
                    aria-label="Share on X"
                    data-testid="button-share-twitter"
                    className="p-2 rounded-full transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 bg-black"
                  >
                    <SiX size={24} color="#ffffff" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    aria-label="Copy product link"
                    data-testid="button-copy-link"
                    className="p-2 rounded-full transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 border border-input"
                  >
                    <LinkIcon className="w-6 h-6 text-foreground" />
                  </button>
                </div>
              </div>

              <Accordion
                type="multiple"
                value={accordionOpen}
                onValueChange={(v) => setAccordionOpen(Array.isArray(v) ? v : [])}
                className="rounded-lg border"
                data-testid="accordion-pdp"
              >
                <AccordionItem value="trust" data-testid="accordion-item-trust">
                  <AccordionTrigger aria-label="Toggle Delivery & Trust">
                    <span className="flex items-center gap-2">
                      <Truck className="w-5 h-5" />
                      Delivery & Trust
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="flex items-start gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      <div className="text-sm">
                        <div className="font-medium">Delivery Estimate</div>
                        <p className="text-muted-foreground" data-testid="text-delivery-estimate">
                          Standard: 2–5 business days • COD: 3–7 business days. Ships from {store?.district || product.district}.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <RotateCcw className="w-4 h-4 text-muted-foreground" />
                      <div className="text-sm">
                        <div className="font-medium">Returns</div>
                        <p className="text-muted-foreground" data-testid="text-returns-summary">30-day return window; items must be unused in original packaging.</p>
                        <Link href="/returns">
                          <Button variant="ghost" className="px-0 h-auto" data-testid="button-returns-policy">View policy</Button>
                        </Link>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Wallet className="w-4 h-4 text-muted-foreground" />
                      <div className="text-sm">
                        <div className="font-medium">COD Rules</div>
                        <p className="text-muted-foreground" data-testid="text-cod-rules">
                          Phone required; availability depends on item and order value; repeated cancellations may restrict COD.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-muted-foreground" />
                      <div className="text-sm">
                        <div className="font-medium">Artisan Authenticity</div>
                        <p className="text-muted-foreground" data-testid="text-authenticity">
                          GI brand: {product.giBrand}. Vendors undergo verification and documentation.
                        </p>
                        <Link href="/vendor/verification">
                          <Button variant="ghost" className="px-0 h-auto" data-testid="button-verification-info">Verification process</Button>
                        </Link>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="vendor" data-testid="accordion-item-vendor">
                  <AccordionTrigger aria-label="Toggle Meet Your Seller">
                    <span className="flex items-center gap-2">
                      <Store className="w-5 h-5" />
                      Meet Your Seller
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
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
                    ) : null}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <Separator />
          </div>
        </div>
        {(() => {
          const data = {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title,
            image: images[0] || undefined,
            description: product.description || undefined,
            sku: selectedVariant?.sku || undefined,
            brand: { "@type": "Brand", name: product.giBrand },
            url: getShareUrl(),
            aggregateRating: reviewData?.stats
              ? {
                  "@type": "AggregateRating",
                  ratingValue: Number(reviewData.stats.average ?? 0).toFixed(1),
                  reviewCount: reviewData.stats.count,
                }
              : undefined,
            offers: {
              "@type": "Offer",
              priceCurrency: "PKR",
              price: discounted != null ? discounted : priceNum,
              availability: isOutOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
              priceValidUntil: endsAt || undefined,
              url: getShareUrl(),
            },
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
            <div className="mt-4 flex items-center gap-2">
              <Badge variant="secondary" data-testid="badge-current-sort">
                {sort === 'helpful' ? 'Sorted by: Most Helpful' : sort === 'highest' ? 'Sorted by: Highest Rated' : 'Sorted by: Newest'}
              </Badge>
            </div>

            {!reviewsLoading && !reviewsError && (reviewData?.stats.count ?? 0) > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4" aria-label="Rating distribution" data-testid="container-rating-distribution">
                <div className="space-y-3">
                  {ratingDistribution.items.map((it) => (
                    <div key={it.star} className="flex items-center gap-3" data-testid={`row-star-${it.star}`}>
                      <div className="w-24 text-sm">{it.star} stars</div>
                      <div className="flex-1">
                        <Progress value={it.pct} aria-label={`${it.star} stars`} />
                      </div>
                      <div className="w-16 text-right text-sm" aria-live="polite">{it.pct}%</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-md border p-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                    <span className="text-sm">Average</span>
                    <span className="text-sm font-medium">{Number(reviewData?.stats.average ?? 0).toFixed(1)} / 5</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{reviewData?.stats.count ?? 0} total reviews</p>
                </div>
              </div>
            )}

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
                          rqClient.invalidateQueries({ queryKey: ['/api/products'] });
                        } catch { }
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
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <div className="h-5 bg-muted/50 rounded w-40 animate-pulse" />
                    <div className="mt-2 h-4 bg-muted/50 rounded w-full animate-pulse" />
                    <div className="mt-2 h-4 bg-muted/50 rounded w-3/4 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <TooltipProvider>
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
                        {r.verifiedPurchase && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="flex items-center gap-1" data-testid={`badge-verified-${r.id}`}>
                                <ShieldCheck className="w-3 h-3" />
                                Verified
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              Verified purchase based on order history
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {(() => {
                          const max = Math.max(...(reviewData?.reviews ?? []).map((x) => Number(x.helpfulUp || 0) - Number(x.helpfulDown || 0)));
                          const score = Number(r.helpfulUp || 0) - Number(r.helpfulDown || 0);
                          if ((reviewData?.reviews ?? []).length > 0 && score === max && max > 0) {
                            return <Badge variant="secondary" data-testid={`badge-most-helpful-${r.id}`}>Most Helpful</Badge>;
                          }
                          return null;
                        })()}
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
                        className={`text-sm ${votes[r.id] === 'up' ? 'text-primary font-medium' : 'text-primary'}`}
                        aria-label="Mark review helpful"
                        data-testid={`btn-helpful-${r.id}`}
                        onClick={async () => {
                          try {
                            const res = await apiRequest('POST', `/api/reviews/${r.id}/vote`, { value: 'up' });
                            const json = await res.json();
                            setVotes((v) => ({ ...v, [r.id]: 'up' }));
                            rqClient.setQueryData([`/api/products/${id}/reviews`, { sort }], (prev: any) => {
                              if (!prev) return prev;
                              const updated = (prev.reviews ?? []).map((x: any) => x.id === r.id ? { ...x, helpfulUp: Number(json?.helpfulUp ?? x.helpfulUp), helpfulDown: Number(json?.helpfulDown ?? x.helpfulDown) } : x);
                              return { ...prev, reviews: updated };
                            });
                          } catch { }
                        }}
                      >Helpful (<span aria-live="polite">{r.helpfulUp}</span>)</button>
                      <button
                        className={`text-sm ${votes[r.id] === 'down' ? 'text-muted-foreground font-medium' : 'text-muted-foreground'}`}
                        aria-label="Mark review unhelpful"
                        data-testid={`btn-unhelpful-${r.id}`}
                        onClick={async () => {
                          try {
                            const res = await apiRequest('POST', `/api/reviews/${r.id}/vote`, { value: 'down' });
                            const json = await res.json();
                            setVotes((v) => ({ ...v, [r.id]: 'down' }));
                            rqClient.setQueryData([`/api/products/${id}/reviews`, { sort }], (prev: any) => {
                              if (!prev) return prev;
                              const updated = (prev.reviews ?? []).map((x: any) => x.id === r.id ? { ...x, helpfulUp: Number(json?.helpfulUp ?? x.helpfulUp), helpfulDown: Number(json?.helpfulDown ?? x.helpfulDown) } : x);
                              return { ...prev, reviews: updated };
                            });
                          } catch { }
                        }}
                      >Not Helpful (<span aria-live="polite">{r.helpfulDown}</span>)</button>
                    </div>
                  </div>
                ))}
              </div>
              </TooltipProvider>
            )}
          </div>
        </div>
        {relatedProducts.length > 0 ? (
          <div className="mt-12">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between mb-4">
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold">Related Products</h2>
                  <p className="text-muted-foreground">
                    Mainly from {product.category}{product.giBrand ? ` • ${product.giBrand}` : ''}
                  </p>
                </div>
              </div>
              <Carousel opts={{ loop: true, align: 'start' }} className="relative">
                <CarouselContent>
                  {relatedProducts.map((p: any) => (
                    <CarouselItem key={p.id} className="basis-3/4 sm:basis-1/2 md:basis-1/3 lg:basis-1/4">
                      <ProductCard
                        id={p.id}
                        title={p.title}
                        description={p.description || ""}
                        price={Number(p.price)}
                        discountedPrice={p.discountedPrice != null ? Number(p.discountedPrice) : undefined}
                        image={(p.images || [])[0] || ""}
                        district={p.district}
                        giBrand={p.giBrand}
                        vendorName={p.vendorName || ""}
                        storeId={p.storeId}
                        stock={Number(p.stock || 0)}
                        ratingAverage={Number(p.ratingAverage || 0)}
                        ratingCount={Number(p.ratingCount || 0)}
                        promotionPercent={p.promotionPercent != null ? Number(p.promotionPercent) : undefined}
                        promotionTone={p.promotionTone}
                        promotionEndsAt={p.promotionEndsAt || undefined}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2 sm:-left-2 z-10" />
                <CarouselNext className="right-2 sm:-right-2 z-10" />
              </Carousel>
            </div>
          </div>
        ) : null}
        <RecentlyViewed />
      </main>
      <Footer />
    </div >
  );
}
