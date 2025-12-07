import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { getCart, clearCart, type CartItem } from "@/lib/cart";
import { formatPrice } from "@/lib/utils/price";
import { normalizeImagePath } from "@/lib/utils/image";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Truck, Wallet, CreditCard, Phone, ShoppingCart } from "lucide-react";
import OrderReceipt from "@/components/OrderReceipt";

type Step = "method" | "review" | "complete";

export default function Checkout() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("method");
  const [paymentMethod, setPaymentMethod] = useState<string>("cod");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [shippingStreet, setShippingStreet] = useState("");
  const [shippingApartment, setShippingApartment] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingProvince, setShippingProvince] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");
  const [shippingCountry, setShippingCountry] = useState("Pakistan");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingMethod, setShippingMethod] = useState<string>("standard");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [billingSame, setBillingSame] = useState(true);
  const [billingStreet, setBillingStreet] = useState("");
  const [billingApartment, setBillingApartment] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingProvince, setBillingProvince] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");
  const [billingCountry, setBillingCountry] = useState("Pakistan");
  const [saveInfo, setSaveInfo] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orderId, setOrderId] = useState<string>("");
  const [orderRef, setOrderRef] = useState<string>("");
  const [estimatedDelivery, setEstimatedDelivery] = useState<string>("");
  const [placedOrder, setPlacedOrder] = useState<any | null>(null);
  const [orderDetails, setOrderDetails] = useState<any | null>(null);
  const [subtotalCalc, setSubtotalCalc] = useState<number>(0);
  const [taxesCalc, setTaxesCalc] = useState<number>(0);
  const [shippingCalc, setShippingCalc] = useState<number>(0);
  const [totalCalc, setTotalCalc] = useState<number>(0);
  const [calcLoading, setCalcLoading] = useState<boolean>(false);
  const [placedOrderVendors, setPlacedOrderVendors] = useState<Array<{ storeId: string; storeName?: string; vendorId: string }>>([]);
  const [receiptData, setReceiptData] = useState<any | null>(null);

  useEffect(() => {
    setCartItems(getCart());
    const handleCartUpdate = () => setCartItems(getCart());
    window.addEventListener("cart-updated", handleCartUpdate);
    
    // Auto-fill shipping details from last order or user profile
    fetch('/api/buyer/last-shipping-details-v2', { credentials: 'include' })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch');
      })
      .then(data => {
        if (data) {
          if (data.recipientName) setRecipientName(data.recipientName);
          if (data.recipientEmail) setRecipientEmail(data.recipientEmail);
          if (data.shippingPhone) setPhoneNumber(data.shippingPhone);
          if (data.shippingStreet) setShippingStreet(data.shippingStreet);
          if (data.shippingApartment) setShippingApartment(data.shippingApartment);
          if (data.shippingCity) setShippingCity(data.shippingCity);
          if (data.shippingProvince) setShippingProvince(data.shippingProvince);
          if (data.shippingPostalCode) setShippingPostalCode(data.shippingPostalCode);
          if (data.shippingCountry) setShippingCountry(data.shippingCountry);
          if (data.shippingAddress) setShippingAddress(data.shippingAddress);
        }
      })
      .catch(() => {
        // Ignore errors, just don't autofill
      });

    return () => window.removeEventListener("cart-updated", handleCartUpdate);
  }, []);

  const total = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  }, [cartItems]);

  useEffect(() => {
    const items = cartItems.map((i) => ({
      productId: i.productId,
      storeId: i.storeId,
      quantity: i.quantity,
      price: i.price,
      variantSku: i.variant?.sku,
      variantAttributes: i.variant ? { type: i.variant.type, option: i.variant.option } : undefined,
    }));
    const localSubtotal = items.reduce((s, it) => s + parseFloat(String(it.price)) * it.quantity, 0);
    setSubtotalCalc(localSubtotal);
    setTaxesCalc(0);
    setShippingCalc(0);
    setTotalCalc(localSubtotal);
    if (items.length === 0) return;
    setCalcLoading(true);
    apiRequest("POST", "/api/checkout/calculate", {
      items,
      shippingAddress,
      shippingStreet,
      shippingCity,
      shippingProvince,
      shippingPostalCode,
      shippingCountry,
      shippingMethod,
    })
      .then(async (res) => {
        const data = await res.json();
        const sub = parseFloat(String(data.subtotal ?? localSubtotal));
        const tx = parseFloat(String(data.taxes ?? 0));
        const sh = parseFloat(String(data.shipping ?? 0));
        const tot = parseFloat(String(data.total ?? sub + tx + sh));
        setSubtotalCalc(Number.isFinite(sub) ? sub : localSubtotal);
        setTaxesCalc(Number.isFinite(tx) ? tx : 0);
        setShippingCalc(Number.isFinite(sh) ? sh : 0);
        setTotalCalc(Number.isFinite(tot) ? tot : (sub + tx + sh));
      })
      .catch(() => {
        setSubtotalCalc(localSubtotal);
        setTaxesCalc(0);
        setShippingCalc(0);
        setTotalCalc(localSubtotal);
      })
      .finally(() => setCalcLoading(false));
  }, [cartItems, shippingAddress, shippingStreet, shippingCity, shippingProvince, shippingPostalCode, shippingCountry, shippingMethod]);

  const handleProceedToReview = () => {
    const errs: Record<string, string> = {};
    if (!recipientName.trim()) errs.recipientName = "Recipient name is required";
    if (!shippingStreet.trim()) errs.shippingStreet = "Street address is required";
    if (!shippingCity.trim()) errs.shippingCity = "City is required";
    if (!shippingProvince.trim()) errs.shippingProvince = "Province is required";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    if (paymentMethod === "cod") {
      setStep("review");
    } else {
      setStep("review");
    }
  };

  const handlePlaceOrder = async () => {
    const errs: Record<string, string> = {};
    if (!recipientName.trim()) errs.recipientName = "Recipient name is required";
    if (!shippingStreet.trim()) errs.shippingStreet = "Street address is required";
    if (!shippingCity.trim()) errs.shippingCity = "City is required";
    if (!shippingProvince.trim()) errs.shippingProvince = "Province is required";
    if (!billingSame) {
      if (!billingStreet.trim()) errs.billingStreet = "Billing street is required";
      if (!billingCity.trim()) errs.billingCity = "Billing city is required";
      if (!billingProvince.trim()) errs.billingProvince = "Billing province is required";
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast({ title: "Please complete required fields", variant: "destructive" });
      return;
    }
    if (cartItems.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    setPlacing(true);
    try {
      const items = cartItems.map((i) => ({
        productId: i.productId,
        storeId: i.storeId,
        quantity: i.quantity,
        price: i.price,
        variantSku: i.variant?.sku,
        variantAttributes: i.variant ? { type: i.variant.type, option: i.variant.option } : undefined,
      }));
      console.info('Checkout placing order', {
        paymentMethod,
        shippingAddress,
        phoneNumber,
        items,
        clientTotal: total.toFixed(2),
      });
      const res = await apiRequest("POST", "/api/orders", {
        total: total.toFixed(2),
        status: "pending",
        paymentMethod,
        shippingAddress,
        phoneNumber,
        preferredCommunication: 'in_app',
        recipientName,
        recipientEmail,
        shippingStreet,
        shippingApartment,
        shippingCity,
        shippingProvince,
        shippingPostalCode,
        shippingCountry,
        shippingMethod,
        specialInstructions,
        billingSameAsShipping: billingSame,
        billingStreet,
        billingApartment,
        billingCity,
        billingProvince,
        billingPostalCode,
        billingCountry,
        saveInfo,
        items,
      });
      const data = await res.json();
      console.info('Order created', { orderId: data.id, reference: data.reference, estimatedDelivery: data.estimatedDelivery, serverTotal: data.total });
      setPlacedOrder(data);
      setOrderId(data.id);
      setOrderRef(data.reference || data.id);
      setEstimatedDelivery(data.estimatedDelivery || "3-7 business days");
      try {
        const det = await fetch(`/api/buyer/orders/${data.id}/details`, { credentials: 'include' });
        if (det.ok) {
          const j = await det.json();
          setOrderDetails(j);
        }
      } catch {}
      try {
        const vRes = await fetch(`/api/orders/${data.id}/vendors`, { credentials: 'include' });
        if (vRes.ok) {
          const vData = await vRes.json();
          setPlacedOrderVendors(vData);
        }
      } catch {}
      clearCart();
      setStep("complete");
      try {
        const rRes = await fetch(`/api/orders/${data.id}/receipt`, { credentials: 'include' });
        if (rRes.ok) {
          const rData = await rRes.json();
          setReceiptData(rData);
        }
      } catch {}
    } catch (err: any) {
      toast({ title: "Order failed", description: err.message, variant: "destructive" });
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Checkout</h1>
                <p className="text-muted-foreground">Securely confirm your order</p>
              </div>
              <Button
                variant="ghost"
                onClick={() => setLocation('/cart')}
                aria-label="Back to cart"
                data-testid="link-back-to-cart"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Back to Cart
              </Button>
            </div>
          </div>

          {step === "method" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <Button
                        variant={paymentMethod === "cod" ? "default" : "outline"}
                        onClick={() => setPaymentMethod("cod")}
                        className="h-16 justify-start gap-3"
                        data-testid="button-method-cod"
                      >
                        <Wallet className="w-5 h-5" />
                        <div className="text-left">
                          <div className="font-semibold">Cash on Delivery</div>
                          <div className="text-xs text-muted-foreground">Pay when you receive your order</div>
                        </div>
                      </Button>
                      
                    </div>
                    {paymentMethod === "cod" && (
                      <div className="mt-2">
                        <Badge variant="secondary">COD Selected</Badge>
                        <p className="text-sm text-muted-foreground mt-2">Payment will be collected upon delivery. Please ensure accurate address and availability.</p>
                      </div>
                    )}
                    
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Shipping Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Input placeholder="Recipient full name" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} autoComplete="name" />
                        {errors.recipientName && <div className="text-red-600 text-xs mt-1">{errors.recipientName}</div>}
                      </div>
                      <div>
                        <Input placeholder="Contact number" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} data-testid="input-phone" autoComplete="tel" />
                      </div>
                      <div>
                        <Input placeholder="Email address" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} autoComplete="email" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Input placeholder="Street address" value={shippingStreet} onChange={(e) => setShippingStreet(e.target.value)} autoComplete="address-line1" />
                        {errors.shippingStreet && <div className="text-red-600 text-xs mt-1">{errors.shippingStreet}</div>}
                      </div>
                      <div>
                        <Input placeholder="Apartment/suite (optional)" value={shippingApartment} onChange={(e) => setShippingApartment(e.target.value)} autoComplete="address-line2" />
                      </div>
                      <div>
                        <Input placeholder="City" value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} autoComplete="address-level2" />
                        {errors.shippingCity && <div className="text-red-600 text-xs mt-1">{errors.shippingCity}</div>}
                      </div>
                      <div>
                        <select className="border rounded h-10 px-3" value={shippingProvince} onChange={(e) => setShippingProvince(e.target.value)} aria-label="State/Province">
                          <option value="">Select Province</option>
                          <option value="Punjab">Punjab</option>
                          <option value="Sindh">Sindh</option>
                          <option value="Balochistan">Balochistan</option>
                          <option value="Khyber Pakhtunkhwa">KPK Khaiber Pakhtoon Khah</option>
                          <option value="Islamabad">Islamabad Capital Territory</option>
                        </select>
                        {errors.shippingProvince && <div className="text-red-600 text-xs mt-1">{errors.shippingProvince}</div>}
                      </div>
                      <div>
                        <Input placeholder="Postal/ZIP code" value={shippingPostalCode} onChange={(e) => setShippingPostalCode(e.target.value)} autoComplete="postal-code" />
                      </div>
                      <div>
                        <Input placeholder="Country" value={shippingCountry} onChange={(e) => setShippingCountry(e.target.value)} autoComplete="country-name" />
                      </div>
                    </div>
                    <Textarea
                      placeholder="Full shipping address"
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="min-h-24"
                      data-testid="input-address"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <select className="border rounded h-10 px-3" value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)} aria-label="Delivery method">
                          <option value="standard">Standard</option>
                          <option value="express">Express</option>
                        </select>
                      </div>
                      <div>
                        <Input placeholder="Special instructions (optional)" value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} /> Same as shipping</label>
                      {!billingSame && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <Input placeholder="Billing street" value={billingStreet} onChange={(e) => setBillingStreet(e.target.value)} />
                            {errors.billingStreet && <div className="text-red-600 text-xs mt-1">{errors.billingStreet}</div>}
                          </div>
                          <div>
                            <Input placeholder="Apartment/suite (optional)" value={billingApartment} onChange={(e) => setBillingApartment(e.target.value)} />
                          </div>
                          <div>
                            <Input placeholder="City" value={billingCity} onChange={(e) => setBillingCity(e.target.value)} />
                            {errors.billingCity && <div className="text-red-600 text-xs mt-1">{errors.billingCity}</div>}
                          </div>
                          <div>
                            <Input placeholder="Province" value={billingProvince} onChange={(e) => setBillingProvince(e.target.value)} />
                            {errors.billingProvince && <div className="text-red-600 text-xs mt-1">{errors.billingProvince}</div>}
                          </div>
                          <div>
                            <Input placeholder="Postal code" value={billingPostalCode} onChange={(e) => setBillingPostalCode(e.target.value)} />
                          </div>
                          <div>
                            <Input placeholder="Country" value={billingCountry} onChange={(e) => setBillingCountry(e.target.value)} />
                          </div>
                        </div>
                      )}
                      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={saveInfo} onChange={(e) => setSaveInfo(e.target.checked)} /> Save information for next checkout</label>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Order Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      {cartItems.map((item) => (
                        <div key={item.productId} className="flex items-center gap-3">
                          <img
                            src={normalizeImagePath(item.image)}
                            alt={item.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{item.title}</div>
                            <div className="text-sm text-muted-foreground">Qty {item.quantity}</div>
                          </div>
                          <div className="font-semibold">{formatPrice(parseFloat(item.price) * item.quantity)}</div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="font-medium" data-testid="text-subtotal">{formatPrice(subtotalCalc)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxes</span>
                        <span className="font-medium" data-testid="text-taxes">{formatPrice(taxesCalc)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping</span>
                        <span className="font-medium" data-testid="text-shipping">{formatPrice(shippingCalc)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total</span>
                        <span className="font-bold" data-testid="text-total">{formatPrice(totalCalc)}</span>
                      </div>
                    </div>
                    <Button className="w-full" onClick={handleProceedToReview} data-testid="button-review">
                      Review Order
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Confirm Your Order</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5" />
                      <span className="font-medium capitalize">Payment Method: {paymentMethod}</span>
                    </div>
                    {paymentMethod === "cod" && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Truck className="w-4 h-4" />
                        <span>Payment will be collected upon delivery</span>
                      </div>
                    )}
                    <div className="space-y-3">
                      {cartItems.map((item) => (
                        <div key={item.productId} className="flex items-center gap-3">
                          <img src={normalizeImagePath(item.image)} alt={item.title} className="w-10 h-10 rounded object-cover" />
                          <div className="flex-1">
                            <div className="font-medium">{item.title}</div>
                            <div className="text-sm text-muted-foreground">Qty {item.quantity}</div>
                          </div>
                          <div className="font-semibold">{formatPrice(parseFloat(item.price) * item.quantity)}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Ship to</div>
                      <div className="font-medium whitespace-pre-line">{shippingAddress || "No address provided"}</div>
                      {phoneNumber && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4" />
                          <span>{phoneNumber}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Total</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span className="font-medium">{formatPrice(subtotalCalc)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Taxes</span>
                        <span className="font-medium" data-testid="text-taxes">{formatPrice(taxesCalc)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping</span>
                        <span className="font-medium" data-testid="text-shipping">{formatPrice(shippingCalc)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount</span>
                        <span className="font-bold">{formatPrice(totalCalc)}</span>
                      </div>
                    </div>
                    <Button className="w-full" onClick={handlePlaceOrder} disabled={placing} data-testid="button-place-order">
                      {placing ? "Placing..." : "Place Order"}
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => setStep("method")} data-testid="button-back-method">
                      Back
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {step === "complete" && (
            <div className="max-w-3xl">
              {receiptData ? (
                <OrderReceipt
                  receipt={receiptData}
                  onDownloadPdf={() => {
                    const w = window.open(`/api/orders/${orderId}/receipt.html`, 'receipt');
                    if (!w) return;
                    w.focus();
                    w.onload = () => w.print();
                  }}
                />
              ) : (
                <OrderReceipt
                  receipt={{
                    orderId: orderId,
                    receiptNumber: orderRef || null,
                    createdAt: new Date().toISOString(),
                    paymentMethod: placedOrder?.paymentMethod ?? paymentMethod ?? null,
                    shippingMethod: placedOrder?.shippingMethod ?? orderDetails?.shippingMethod ?? shippingMethod ?? null,
                    estimatedDelivery: estimatedDelivery || null,
                    buyer: { email: recipientEmail || undefined, firstName: recipientName ? recipientName.split(' ')[0] : undefined, lastName: recipientName ? recipientName.split(' ').slice(1).join(' ') || undefined : undefined, phone: phoneNumber || undefined } as any,
                    shippingAddress: placedOrder?.shippingAddress ?? orderDetails?.shippingAddress ?? shippingAddress ?? null,
                    items: (orderDetails?.items && Array.isArray(orderDetails.items) && orderDetails.items.length > 0)
                      ? orderDetails.items.map((it: any) => {
                          const vMap = new Map(placedOrderVendors.map(v => [v.storeId, v.storeName || v.storeId]));
                          return { productTitle: it.product?.title || 'Product', productImage: it.product?.images?.[0] || null, storeName: vMap.get(it.storeId) || it.storeId, quantity: it.quantity, unitPrice: String(it.price), lineTotal: (parseFloat(String(it.price)) * it.quantity).toFixed(2) };
                        })
                      : cartItems.map((ci: any) => {
                          const vMap = new Map(placedOrderVendors.map(v => [v.storeId, v.storeName || v.storeId]));
                          return { productTitle: ci.title, productImage: ci.image || null, storeName: vMap.get(ci.storeId) || ci.storeId, quantity: ci.quantity, unitPrice: String(ci.price), lineTotal: (parseFloat(String(ci.price)) * ci.quantity).toFixed(2) };
                        }),
                    subtotal: (orderDetails?.items && Array.isArray(orderDetails.items) && orderDetails.items.length > 0)
                      ? orderDetails.items.reduce((s: number, it: any) => s + parseFloat(String(it.price)) * it.quantity, 0).toFixed(2)
                      : cartItems.reduce((s: number, ci: any) => s + parseFloat(String(ci.price)) * ci.quantity, 0).toFixed(2),
                    shippingCost: String(placedOrder?.shippingCost ?? orderDetails?.shippingCost ?? shippingCalc),
                    taxAmount: String(placedOrder?.taxAmount ?? orderDetails?.taxAmount ?? taxesCalc),
                    total: String(placedOrder?.total ?? orderDetails?.total ?? totalCalc.toFixed(2)),
                  } as any}
                  onDownloadPdf={() => {
                    const w = window.open(`/api/orders/${orderId}/receipt.html`, 'receipt');
                    if (!w) return;
                    w.focus();
                    w.onload = () => w.print();
                  }}
                />
              )}
              <div className="flex gap-2 mt-4">
                <Button onClick={() => setLocation("/products")} data-testid="button-continue-shopping">Continue Shopping</Button>
                <Button variant="outline" onClick={() => setLocation("/cart")} data-testid="button-view-cart">View Cart</Button>
                <Button variant="secondary" onClick={() => setLocation("/orders")} data-testid="button-track-order">Track Order</Button>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
