import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatPrice } from "@/lib/utils/price";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Truck, ShoppingCart } from "lucide-react";

type Order = {
  id: string;
  buyerId: string;
  total: string;
  status: string;
  paymentMethod: string | null;
  shippingAddress: string | null;
  shippingMethod?: string | null;
  shippingProvince?: string | null;
  createdAt: string;
};

export default function Orders() {
  const queryClient = useQueryClient();
  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/buyer/orders'],
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      return apiRequest('POST', `/api/orders/${orderId}/cancel`, { reason });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/buyer/orders'] });
    },
  });

  const canCancel = (order: Order) => {
    const created = new Date(order.createdAt).getTime();
    // 7 days cancellation window
    return Date.now() - created < 7 * 24 * 60 * 60 * 1000 && order.status === 'pending';
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      processing: 'secondary',
      shipped: 'secondary',
      delivered: 'default',
      cancelled: 'destructive',
    };
    return map[status] || 'outline';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold" data-testid="heading-buyer-orders">My Orders</h1>
            <p className="text-muted-foreground">Track delivery and manage COD orders</p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  No Orders Yet
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Your orders will appear here once you place one.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg" data-testid={`text-order-id-${order.id}`}>
                            Order #{order.id.slice(0, 8)}
                          </CardTitle>
                          <Badge variant={getStatusBadge(order.status)} data-testid={`badge-order-status-${order.id}`}>
                            {order.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        {order.paymentMethod?.toLowerCase() === 'cod' && (
                          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground" data-testid={`notice-cod-${order.id}`}>
                            <Truck className="w-4 h-4" />
                            <span>Cash on Delivery: Payment will be collected upon delivery.</span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground mb-1">Total</div>
                        <div className="text-2xl font-bold" data-testid={`text-order-total-${order.id}`}>
                          {formatPrice(order.total)}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm">
                      <div>Payment Method: <span className="font-medium capitalize" data-testid={`text-order-payment-${order.id}`}>{order.paymentMethod || 'n/a'}</span></div>
                      {order.shippingAddress && (
                        <div className="mt-1">Shipping: <span className="font-medium" data-testid={`text-order-address-${order.id}`}>{order.shippingAddress}</span></div>
                      )}
                      {(order.shippingMethod || order.shippingProvince) && (
                        <div className="mt-1 text-xs text-muted-foreground">{order.shippingMethod || 'n/a'} {order.shippingProvince ? `— ${order.shippingProvince}` : ''}</div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {canCancel(order) && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            const reason = prompt("Please enter a reason for cancellation:");
                            if (reason) {
                              cancelMutation.mutate({ orderId: order.id, reason });
                            }
                          }} 
                          disabled={cancelMutation.isPending} 
                          data-testid={`button-cancel-${order.id}`}
                        >
                          Cancel Order
                        </Button>
                      )}
                      {order.status === 'delivered' && (
                        <Badge variant="secondary" className="flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Delivered</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
