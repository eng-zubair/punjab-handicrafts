import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getCart, updateCartItemQuantity, removeFromCart, clearCart } from "@/lib/cart";
import { useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { ShoppingBag, ArrowLeft, Plus, Minus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { CartItem } from "@/lib/cart";
import { normalizeImagePath } from "@/lib/utils/image";
import { formatPrice } from "@/lib/utils/price";
import { useAuth } from "@/hooks/use-auth";
import { AuthDialog } from "@/components/AuthDialog";

export default function Cart() {
  const [, setLocation] = useLocation();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogTab, setAuthDialogTab] = useState<"login" | "register">("login");

  useEffect(() => {
    setCartItems(getCart());

    const handleCartUpdate = () => {
      setCartItems(getCart());
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    return () => window.removeEventListener('cart-updated', handleCartUpdate);
  }, []);

  const total = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * item.quantity);
    }, 0);
  }, [cartItems]);

  const handleIncreaseQuantity = (item: CartItem) => {
    if (item.quantity >= item.stock) {
      toast({
        variant: "destructive",
        title: "Stock limit reached",
        description: `Only ${item.stock} units available for ${item.title}.`,
      });
      return;
    }
    updateCartItemQuantity(item.productId, item.quantity + 1);
  };

  const handleDecreaseQuantity = (item: CartItem) => {
    if (item.quantity > 1) {
      updateCartItemQuantity(item.productId, item.quantity - 1);
    } else {
      handleRemoveItem(item);
    }
  };

  const handleRemoveItem = (item: CartItem) => {
    removeFromCart(item.productId);
    toast({
      title: "Item removed",
      description: `${item.title} has been removed from your cart.`,
    });
  };

  const handleClearCart = () => {
    setShowClearDialog(false);
    clearCart();
    toast({
      title: "Cart cleared",
      description: "All items have been removed from your cart.",
    });
  };

  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => setLocation('/products')}
          className="mb-6"
          data-testid="button-back-to-products"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Continue Shopping
        </Button>

        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-2xl font-semibold mb-2" data-testid="text-empty-cart">
              Your cart is empty
            </h2>
            <p className="text-muted-foreground mb-6">
              Add some beautiful handicrafts to your cart to get started!
            </p>
            <Button onClick={() => setLocation('/products')} data-testid="button-shop-now">
              Shop Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        onClick={() => setLocation('/products')}
        className="mb-6"
        data-testid="button-back-to-products"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Continue Shopping
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold" data-testid="text-cart-heading">
              Shopping Cart ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
            </h1>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowClearDialog(true)}
              data-testid="button-clear-cart"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Cart
            </Button>
          </div>

          {cartItems.map((item) => (
            <Card key={item.productId} data-testid={`cart-item-${item.productId}`}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {item.image ? (
                      <img
                        src={normalizeImagePath(item.image)}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        data-testid={`img-cart-item-${item.productId}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg" data-testid={`text-cart-item-title-${item.productId}`}>
                          {item.title}
                        </h3>
                        <p className="text-sm text-muted-foreground" data-testid={`text-cart-item-store-${item.productId}`}>
                          by {item.storeName}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveItem(item)}
                        data-testid={`button-remove-item-${item.productId}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Quantity:</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDecreaseQuantity(item)}
                          data-testid={`button-decrease-qty-${item.productId}`}
                          className="h-10 w-10"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span 
                          className="w-12 text-center font-semibold" 
                          data-testid={`text-cart-item-quantity-${item.productId}`}
                        >
                          {item.quantity}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleIncreaseQuantity(item)}
                          data-testid={`button-increase-qty-${item.productId}`}
                          className="h-10 w-10"
                          disabled={item.quantity >= item.stock}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        ({item.stock} in stock)
                      </span>
                    </div>
                    
                    <p className="text-lg font-bold text-primary" data-testid={`text-cart-item-price-${item.productId}`}>
                      PKR {(parseFloat(item.price) * item.quantity).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold" data-testid="text-subtotal">
                  PKR {total.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-sm text-muted-foreground">Calculated at checkout</span>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span data-testid="text-total">PKR {total.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                size="lg"
                data-testid="button-checkout"
                onClick={() => {
                  if (!isAuthenticated) {
                    setAuthDialogTab("login");
                    setAuthDialogOpen(true);
                    toast({ title: "Login required", description: "Please login to proceed to checkout." });
                    return;
                  }
                  setLocation('/checkout');
                }}
              >
                Proceed to Checkout
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear your cart?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} from your cart. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowClearDialog(false)} data-testid="button-cancel-clear">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleClearCart} data-testid="button-confirm-clear">
              Clear Cart
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AuthDialog 
        open={authDialogOpen} 
        onOpenChange={setAuthDialogOpen}
        defaultTab={authDialogTab}
      />
    </div>
  );
}
