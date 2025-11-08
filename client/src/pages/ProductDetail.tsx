import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, ShoppingCart, Store, MapPin, Award, Minus, Plus, ArrowLeft } from "lucide-react";
import { useState } from "react";
import type { Product } from "@shared/schema";
import { addToCart } from "@/lib/cart";
import { useToast } from "@/hooks/use-toast";
import { formatPrice, toSafeNumber } from "@/lib/utils/price";

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

  const { data: product, isLoading: productLoading, isError: productError, error: productErrorData } = useQuery<Product>({
    queryKey: [`/api/products/${id}`],
    enabled: !!id,
  });

  const { data: store, isLoading: storeLoading, isError: storeError } = useQuery<Store>({
    queryKey: [`/api/stores/${product?.storeId}`],
    enabled: !!product?.storeId,
  });

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= (product?.stock || 0)) {
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
    
    addToCart({
      productId: product.id,
      title: product.title,
      price: product.price,
      image: product.images[0] || '',
      district: product.district,
      giBrand: product.giBrand,
      storeId: product.storeId,
      storeName: store.name,
      stock: product.stock,
    }, quantity);

    toast({
      title: "Added to cart",
      description: `${quantity} × ${product.title} added to your cart.`,
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
    
    addToCart({
      productId: product.id,
      title: product.title,
      price: product.price,
      image: product.images[0] || '',
      district: product.district,
      giBrand: product.giBrand,
      storeId: product.storeId,
      storeName: store.name,
      stock: product.stock,
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
            <div className="grid grid-cols-4 gap-2">
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

  const isOutOfStock = product.stock === 0;
  const images = product.images || [];

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
            <div className="grid grid-cols-4 gap-2">
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
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" data-testid="badge-district">
                <MapPin className="w-3 h-3 mr-1" />
                {product.district}
              </Badge>
              <Badge variant="outline" data-testid="badge-gi-brand">
                <Award className="w-3 h-3 mr-1" />
                {product.giBrand}
              </Badge>
              {isOutOfStock && (
                <Badge variant="destructive" data-testid="badge-out-of-stock">
                  Out of Stock
                </Badge>
              )}
            </div>
          </div>

          <div>
            <p className="text-3xl font-bold text-primary" data-testid="text-price">
              {formatPrice(product.price)}
            </p>
            <p className="text-sm text-muted-foreground mt-1" data-testid="text-stock">
              {isOutOfStock ? 'Currently unavailable' : `${product.stock} in stock`}
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

          {product.variants && (
            <div>
              <h3 className="font-semibold mb-2">Variants</h3>
              <p className="text-sm text-muted-foreground" data-testid="text-variants">
                {product.variants}
              </p>
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
    </div>
  );
}
