import { VendorDashboard } from "./VendorDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Package, User } from "lucide-react";
import { useState } from "react";
import { formatPrice, toSafeNumber } from "@/lib/utils/price";

type OrderItem = {
  id: string;
  orderId: string;
  productId: string;
  storeId: string;
  quantity: number;
  price: string;
  product: {
    id: string;
    title: string;
    images: string[];
    giBrand: string;
  } | null;
};

type Order = {
  id: string;
  buyerId: string;
  total: string;
  status: string;
  paymentMethod: string | null;
  shippingAddress: string | null;
  createdAt: string;
  items: OrderItem[];
};

export default function VendorOrders() {
  const [activeTab, setActiveTab] = useState("all");

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/vendor/orders'],
  });

  const filteredOrders = orders.filter(order => {
    if (activeTab === "all") return true;
    return order.status === activeTab;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', className?: string }> = {
      pending: { variant: 'outline', className: 'border-yellow-500/50 text-yellow-700 dark:text-yellow-400' },
      processing: { variant: 'outline', className: 'border-blue-500/50 text-blue-700 dark:text-blue-400' },
      shipped: { variant: 'outline', className: 'border-purple-500/50 text-purple-700 dark:text-purple-400' },
      delivered: { variant: 'outline', className: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20' },
      cancelled: { variant: 'destructive' },
    };

    const config = statusConfig[status] || { variant: 'secondary' };
    
    return (
      <Badge variant={config.variant} className={config.className} data-testid={`badge-order-status-${status}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <VendorDashboard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-orders">Orders</h1>
          <p className="text-muted-foreground">View and manage your orders</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all-orders">
              All ({orders.length})
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending-orders">
              Pending ({orders.filter(o => o.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="processing" data-testid="tab-processing-orders">
              Processing ({orders.filter(o => o.status === 'processing').length})
            </TabsTrigger>
            <TabsTrigger value="shipped" data-testid="tab-shipped-orders">
              Shipped ({orders.filter(o => o.status === 'shipped').length})
            </TabsTrigger>
            <TabsTrigger value="delivered" data-testid="tab-delivered-orders">
              Delivered ({orders.filter(o => o.status === 'delivered').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <p className="text-muted-foreground">Loading orders...</p>
            ) : filteredOrders.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    No Orders
                  </CardTitle>
                  <CardDescription>
                    {activeTab === "all"
                      ? "Orders will appear here when customers purchase your products"
                      : `No ${activeTab} orders found`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {activeTab === "all"
                      ? "You'll be able to view order details and manage fulfillment from this page."
                      : "Check other tabs to view orders with different statuses."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredOrders.map((order) => (
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-lg" data-testid={`text-order-id-${order.id}`}>
                              Order #{order.id.slice(0, 8)}
                            </CardTitle>
                            {getStatusBadge(order.status)}
                          </div>
                          <CardDescription>
                            Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground mb-1">Total</div>
                          <div className="text-2xl font-bold" data-testid={`text-order-total-${order.id}`}>
                            {formatPrice(order.total)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Order Items */}
                      {order.items && order.items.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-medium text-sm">Order Items:</h4>
                          <div className="space-y-2">
                            {order.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
                                data-testid={`order-item-${item.id}`}
                              >
                                {item.product?.images?.[0] && (
                                  <img
                                    src={item.product.images[0]}
                                    alt={item.product.title}
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate" data-testid={`text-item-product-${item.id}`}>
                                    {item.product?.title || 'Unknown Product'}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Qty: {item.quantity} × PKR {parseFloat(item.price).toLocaleString()}
                                  </p>
                                  {item.product?.giBrand && (
                                    <Badge variant="outline" className="text-xs mt-1">
                                      {item.product.giBrand}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="font-semibold" data-testid={`text-item-total-${item.id}`}>
                                    {formatPrice(toSafeNumber(item.price) * item.quantity)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Order Metadata */}
                      <div className="grid gap-3 text-sm border-t pt-4">
                        {order.buyerId && (
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Customer:</span>
                            <span className="font-medium" data-testid={`text-order-buyer-${order.id}`}>
                              {order.buyerId.slice(0, 8)}...
                            </span>
                          </div>
                        )}
                        {order.paymentMethod && (
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Payment:</span>
                            <span className="font-medium capitalize" data-testid={`text-order-payment-${order.id}`}>
                              {order.paymentMethod}
                            </span>
                          </div>
                        )}
                        {order.shippingAddress && (
                          <div className="flex items-start gap-2">
                            <Package className="w-4 h-4 text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <span className="text-muted-foreground">Shipping Address:</span>
                              <p className="font-medium mt-1" data-testid={`text-order-address-${order.id}`}>
                                {order.shippingAddress}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </VendorDashboard>
  );
}
