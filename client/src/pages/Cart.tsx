import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getCart } from "@/lib/cart";
import { useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import type { CartItem } from "@/lib/cart";

export default function Cart() {
  const [, setLocation] = useLocation();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

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
          <h1 className="text-3xl font-bold mb-6" data-testid="text-cart-heading">
            Shopping Cart ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
          </h1>

          {cartItems.map((item) => (
            <Card key={item.productId} data-testid={`cart-item-${item.productId}`}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <div className="w-24 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
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
                    <h3 className="font-semibold text-lg" data-testid={`text-cart-item-title-${item.productId}`}>
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground" data-testid={`text-cart-item-store-${item.productId}`}>
                      by {item.storeName}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        Quantity: <span data-testid={`text-cart-item-quantity-${item.productId}`}>{item.quantity}</span>
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
              <Button className="w-full" size="lg" data-testid="button-checkout">
                Proceed to Checkout
              </Button>
            </CardFooter>
          </Card>

          <p className="text-sm text-muted-foreground text-center mt-4">
            Full cart management coming in next update
          </p>
        </div>
      </div>
    </div>
  );
}
