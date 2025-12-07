import { VendorDashboard } from "./VendorDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShoppingCart, Package, User, MessageCircle, Phone, Mail, Clock, Truck, CheckCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatPrice, toSafeNumber } from "@/lib/utils/price";
import { normalizeImagePath } from "@/lib/utils/image";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OrderReceipt from "@/components/OrderReceipt";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
  shippingPhone?: string | null;
  preferredCommunication?: string | null;
  processingEstimate?: string | null;
  trackingNumber?: string | null;
  courierService?: string | null;
  codPaymentStatus?: string | null;
  codReceiptId?: string | null;
  paymentVerificationStatus?: string | null;
  paymentVerifiedAt?: string | null;
  paymentReference?: string | null;
  createdAt: string;
  items: OrderItem[];
  buyer?: { id: string; firstName?: string | null; lastName?: string | null; email?: string | null } | null;
};

export default function VendorOrders() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ['/api/vendor/orders'],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (payload: { id: string; status: string; processingEstimate?: string; trackingNumber?: string; deliveryConfirmed?: boolean; courierService?: string }) => {
      return apiRequest('PUT', `/api/orders/${payload.id}/status`, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/vendor/orders'] });
      toast({ title: 'Order updated' });
    },
    onError: (err: any) => toast({ title: 'Update failed', description: err.message, variant: 'destructive' }),
  });

  const cancelMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      return apiRequest('POST', `/api/orders/${id}/cancel`, { reason });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/vendor/orders'] });
      toast({ title: 'Order cancelled' });
    },
  });

  const codCollectMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('POST', `/api/orders/${id}/cod/collect`, {}),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['/api/vendor/orders'] });
      toast({ title: 'Payment recorded' });
    },
  });

  const [shipOrderId, setShipOrderId] = useState<string | null>(null);
  const [shipCourier, setShipCourier] = useState<string>("");
  const [shipTracking, setShipTracking] = useState<string>("");
  const shipOpen = !!shipOrderId;
  const closeShip = () => {
    setShipOrderId(null);
    setShipCourier("");
    setShipTracking("");
  };
  const submitShip = () => {
    if (!shipOrderId) return;
    updateStatusMutation.mutate({ id: shipOrderId, status: 'shipped', trackingNumber: shipTracking || undefined, courierService: shipCourier || undefined });
    closeShip();
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const tabOk = (() => {
        if (activeTab === 'all') return (order.status !== 'delivered' && order.status !== 'cancelled');
        if (activeTab === 'payments-status') return true;
        return order.status === activeTab;
      })();
      const s = search.trim().toLowerCase();
      const buyerName = `${order.buyer?.firstName || ''} ${order.buyer?.lastName || ''}`.trim().toLowerCase();
      const buyerEmail = (order.buyer?.email || '').toLowerCase();
      const idOk = order.id.toLowerCase().includes(s);
      const nameOk = buyerName.includes(s);
      const emailOk = buyerEmail.includes(s);
      const addressOk = (order.shippingAddress || '').toLowerCase().includes(s);
      return tabOk && (s ? (idOk || nameOk || emailOk || addressOk) : true);
    });
  }, [orders, activeTab, search]);

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
          <div className="flex items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="all" data-testid="tab-all-orders">
                All ({orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length})
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
              <TabsTrigger value="cancelled" data-testid="tab-cancelled-orders">
                Cancelled ({orders.filter(o => o.status === 'cancelled').length})
              </TabsTrigger>
              <TabsTrigger value="payments-status" data-testid="tab-payments-status">
                Payment Status
              </TabsTrigger>
            </TabsList>
            <Input placeholder="Search orders, buyers, address" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-md" data-testid="input-search-orders" />
          </div>

          <TabsContent value={activeTab} className="mt-6">
            {activeTab === 'payments-status' ? null : (isLoading ? (
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
                                    src={normalizeImagePath(item.product.images[0])}
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

                      {/* Buyer & Order Metadata */}
                      <div className="grid gap-4 text-sm border-t pt-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Customer:</span>
                            <span className="font-medium" data-testid={`text-order-buyer-${order.id}`}>
                              {`${order.buyer?.firstName || ''} ${order.buyer?.lastName || ''}`.trim() || order.buyerId.slice(0, 8)}
                            </span>
                          </div>
                          {order.buyer?.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Email:</span>
                              <span className="font-medium" data-testid={`text-order-email-${order.id}`}>
                                {order.buyer.email}
                              </span>
                            </div>
                          )}
                          {order.shippingPhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Phone:</span>
                              <span className="font-medium" data-testid={`text-order-phone-${order.id}`}>
                                {order.shippingPhone}
                              </span>
                            </div>
                          )}
                          {order.preferredCommunication && (
                            <div className="flex items-center gap-2">
                              <MessageCircle className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Preferred:</span>
                              <span className="font-medium capitalize" data-testid={`text-order-preferred-${order.id}`}>{order.preferredCommunication}</span>
                            </div>
                          )}
                          {order.shippingAddress && (
                            <div className="flex items-start gap-2">
                              <Package className="w-4 h-4 text-muted-foreground mt-0.5" />
                              <div className="flex-1">
                                <span className="text-muted-foreground">Shipping Address:</span>
                                <p className="font-medium mt-1" data-testid={`text-order-address-${order.id}`}>{order.shippingAddress}</p>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          {order.paymentMethod && (
                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Payment:</span>
                              <span className="font-medium capitalize" data-testid={`text-order-payment-${order.id}`}>{order.paymentMethod}</span>
                              {order.paymentMethod?.toLowerCase() === 'cod' && (
                                <Badge variant="outline" className="ml-2" data-testid={`badge-cod-${order.id}`}>{order.codPaymentStatus === 'collected' ? 'Collected' : 'Pending'}</Badge>
                              )}
                            </div>
                          )}
                          {order.codPaymentStatus === 'collected' && order.paymentVerificationStatus !== 'cleared' && (
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="border-amber-500/50 text-amber-700 dark:text-amber-400" data-testid={`badge-verify-reminder-${order.id}`}>Payment collected — verify now</Badge>
                            </div>
                          )}
                          {order.paymentVerificationStatus === 'cleared' && (
                            <div className="flex items-center gap-2 mt-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-muted-foreground">Payment verified:</span>
                              <span className="font-medium capitalize" data-testid={`text-payment-verified-method-${order.id}`}>{(order.paymentMethod || '').toLowerCase() || '—'}</span>
                              {order.paymentReference && (
                                <span className="text-xs text-muted-foreground" data-testid={`text-payment-reference-${order.id}`}>Ref: {order.paymentReference}</span>
                              )}
                              {order.paymentVerifiedAt && (
                                <span className="text-xs text-muted-foreground" data-testid={`text-payment-verified-at-${order.id}`}>{new Date(order.paymentVerifiedAt).toLocaleString()}</span>
                              )}
                            </div>
                          )}
                          {order.processingEstimate && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Estimate:</span>
                              <span className="font-medium" data-testid={`text-order-estimate-${order.id}`}>{order.processingEstimate}</span>
                            </div>
                          )}
                          {order.trackingNumber && (
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Tracking:</span>
                              <span className="font-medium" data-testid={`text-order-tracking-${order.id}`}>{order.trackingNumber}</span>
                            </div>
                          )}
                          {order.courierService && (
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Courier:</span>
                              <span className="font-medium" data-testid={`text-order-courier-${order.id}`}>{order.courierService}</span>
                            </div>
                          )}
                          {order.codReceiptId && (
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-muted-foreground">Receipt:</span>
                              <span className="font-medium" data-testid={`text-order-receipt-${order.id}`}>{order.codReceiptId}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="grid gap-3 border-t pt-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Update Status</h4>
                          <div className="flex flex-wrap gap-2">
                            {(() => {
                              const isAllTab = activeTab === 'all';
                              const isProcessingTab = activeTab === 'processing';
                              const isShippedTab = activeTab === 'shipped';
                              const isPendingTab = activeTab === 'pending';
                              const isCancelled = order.status === 'cancelled';
                              const isPaymentCleared = (order.paymentMethod || '').toLowerCase() === 'cod' || (order.paymentMethod || '').toLowerCase() === 'cash'
                                ? order.codPaymentStatus === 'collected'
                                : (order.paymentVerificationStatus === 'cleared');
                              const hasTracking = !!order.trackingNumber && !!order.courierService;
                              const canProcessing = !isCancelled && ((isAllTab && order.status === 'pending') || (isPendingTab && order.status === 'pending'));
                              const canShipped = !isCancelled && isProcessingTab && order.status === 'processing';
                              const canDelivered = !isCancelled && isShippedTab && order.status === 'shipped' && hasTracking && isPaymentCleared;
                              return (
                                <>
                                  <Button variant="outline" size="sm" disabled={!canProcessing} className={!canProcessing ? 'opacity-50 cursor-not-allowed' : ''} onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'processing', processingEstimate: '1-2 days' })} data-testid={`btn-status-processing-${order.id}`}>Processing</Button>
                                  <Button variant="outline" size="sm" disabled={!canShipped} className={!canShipped ? 'opacity-50 cursor-not-allowed' : ''} onClick={() => setShipOrderId(order.id)} data-testid={`btn-status-shipped-${order.id}`}>Shipped</Button>
                                  <Button variant="outline" size="sm" disabled={!canDelivered} className={!canDelivered ? 'opacity-50 cursor-not-allowed' : ''} onClick={() => updateStatusMutation.mutate({ id: order.id, status: 'delivered', deliveryConfirmed: true })} data-testid={`btn-status-delivered-${order.id}`}>Delivered</Button>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Communication</h4>
                          <MessagePanel buyerId={order.buyerId} orderId={order.id} />
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Order Controls</h4>
                          <div className="flex flex-wrap gap-2">
                            <Button variant="destructive" size="sm" disabled={order.status === 'cancelled'} className={order.status === 'cancelled' ? 'opacity-50 cursor-not-allowed' : ''} onClick={() => {
                              const reason = prompt('Enter cancellation reason (optional)') || undefined;
                              cancelMutation.mutate({ id: order.id, reason });
                            }} data-testid={`btn-cancel-${order.id}`}>Cancel Order</Button>
                            {order.paymentMethod?.toLowerCase() === 'cod' && order.codPaymentStatus !== 'collected' && (
                              <Button variant="secondary" size="sm" disabled={order.status === 'cancelled'} className={order.status === 'cancelled' ? 'opacity-50 cursor-not-allowed' : ''} onClick={() => codCollectMutation.mutate(order.id)} data-testid={`btn-cod-collect-${order.id}`}>Mark Payment Collected</Button>
                            )}
                            {order.status === 'cancelled' && (
                              <Button variant="outline" size="sm" onClick={() => apiRequest('POST', `/api/orders/${order.id}/reactivate`, { reason: 'Vendor reactivation' }).then(() => queryClient.invalidateQueries({ queryKey: ['/api/vendor/orders'] }))} data-testid={`btn-reactivate-${order.id}`}>Re-activate Order</Button>
                            )}
                            <VerifyPaymentPanel order={order} disabled={order.status === 'cancelled' || order.paymentVerificationStatus === 'cleared'} onVerified={() => queryClient.invalidateQueries({ queryKey: ['/api/vendor/orders'] })} />
                            <Button variant="outline" size="sm" onClick={() => {
                              const w = window.open(`/api/orders/${order.id}/receipt.html`, 'receipt');
                              if (!w) return;
                              w.focus();
                              w.onload = () => w.print();
                            }} data-testid={`btn-download-receipt-${order.id}`}>Download Receipt PDF</Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))}
          </TabsContent>
          <TabsContent value="payments-status" className="mt-6">
            {isLoading ? (
              <p className="text-muted-foreground">Loading orders...</p>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Payment Status</CardTitle>
                  <CardDescription>Track payment collection and verification</CardDescription>
                </CardHeader>
                <CardContent>
                  {orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No orders found</p>
                  ) : (
                    <div className="border rounded-md overflow-x-auto">
                      <Table className="min-w-[800px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Order Number</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead>Verified</TableHead>
                            <TableHead>Payment Type</TableHead>
                            <TableHead>Verification Number</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders
                            .filter(order => (order.status || '').toLowerCase() !== 'cancelled')
                            .filter(order => {
                              const s = search.trim().toLowerCase();
                              if (!s) return true;
                              const buyerName = `${order.buyer?.firstName || ''} ${order.buyer?.lastName || ''}`.trim().toLowerCase();
                              const buyerEmail = (order.buyer?.email || '').toLowerCase();
                              const idOk = order.id.toLowerCase().includes(s);
                              const nameOk = buyerName.includes(s);
                              const emailOk = buyerEmail.includes(s);
                              const addressOk = (order.shippingAddress || '').toLowerCase().includes(s);
                              return idOk || nameOk || emailOk || addressOk;
                            })
                            .map(order => {
                              const pm = (order.paymentMethod || '').toLowerCase();
                              const isCodOrCash = pm === 'cod' || pm === 'cash';
                              const paymentLabel = isCodOrCash ? (order.codPaymentStatus === 'collected' ? 'Collected' : 'Pending') : '-';
                              const verified = order.paymentVerificationStatus === 'cleared';
                              const verificationNumber = (pm === 'jazzcash' || pm === 'easypaisa') ? (order.paymentReference || '-') : '-';
                              return (
                                <TableRow key={order.id}>
                                  <TableCell className="font-mono text-sm" data-testid={`ps-order-${order.id}`}>Order #{order.id.slice(0, 8)}</TableCell>
                                  <TableCell>{paymentLabel}</TableCell>
                                  <TableCell>{verified ? 'Verified' : 'Not Verified'}</TableCell>
                                  <TableCell className="capitalize">{order.paymentMethod || 'n/a'}</TableCell>
                                  <TableCell>{verificationNumber}</TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={shipOpen} onOpenChange={(open) => !open && closeShip()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mark as Shipped</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Courier service (e.g., TCS, Leopards, Pakistan Post)" value={shipCourier} onChange={(e) => setShipCourier(e.target.value)} data-testid="input-courier-service" />
              <Input placeholder="Tracking number" value={shipTracking} onChange={(e) => setShipTracking(e.target.value)} data-testid="input-tracking-number" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeShip} data-testid="button-ship-cancel">Cancel</Button>
                <Button onClick={submitShip} data-testid="button-ship-submit">Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </VendorDashboard>
  );
}

function MessagePanel({ buyerId, orderId }: { buyerId: string; orderId: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: messages = [] } = useQuery<{ id: string; senderId: string; receiverId: string; orderId?: string; message: string; createdAt: string }[]>({
    queryKey: ['/api/messages/conversation', buyerId],
    queryFn: async () => {
      const res = await fetch(`/api/messages/conversation/${buyerId}`, { credentials: 'include' });
      const json = await res.json();
      return json;
    },
    refetchInterval: 10000,
  });
  const [text, setText] = useState("");
  const sendMutation = useMutation({
    mutationFn: async () => apiRequest('POST', '/api/messages', { receiverId: buyerId, orderId, message: text }),
    onSuccess: async () => {
      setText("");
      await queryClient.invalidateQueries({ queryKey: ['/api/messages/conversation', buyerId] });
    },
    onError: (err: any) => toast({ title: 'Message failed', description: err.message, variant: 'destructive' })
  });
  return (
    <div className="space-y-2">
      <div className="max-h-40 overflow-auto rounded border p-2 bg-muted/30">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages</p>
        ) : messages.filter(m => m.orderId === orderId).map((m) => (
          <div key={m.id} className="text-xs">
            <span className="font-mono text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</span>
            <p>{m.message}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input placeholder="Type a message" value={text} onChange={(e) => setText(e.target.value)} />
        <Button size="sm" onClick={() => sendMutation.mutate()} disabled={!text.trim()} data-testid={`btn-send-message-${orderId}`}>Send</Button>
      </div>
    </div>
  );
}

function VerifyPaymentPanel({ order, disabled, onVerified }: { order: Order; disabled?: boolean; onVerified: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<'cash' | 'jazzcash' | 'easypaisa'>('cash');
  const [reference, setReference] = useState('');
  const verifyMutation = useMutation({
    mutationFn: async () => apiRequest('POST', `/api/orders/${order.id}/payment/verify`, { method, reference }),
    onSuccess: async () => {
      setOpen(false);
      setReference('');
      await queryClient.invalidateQueries({ queryKey: ['/api/vendor/orders'] });
      onVerified();
      toast({ title: 'Payment verified' });
    },
    onError: (err: any) => toast({ title: 'Verification failed', description: err.message, variant: 'destructive' }),
  });
  return (
    <>
      <Button variant="outline" size="sm" disabled={!!disabled} className={disabled ? 'opacity-50 cursor-not-allowed' : ''} onClick={() => setOpen(true)} data-testid={`btn-verify-payment-${order.id}`}>Verify Payment</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant={method === 'cash' ? 'default' : 'outline'} onClick={() => setMethod('cash')}>Cash</Button>
              <Button variant={method === 'jazzcash' ? 'default' : 'outline'} onClick={() => setMethod('jazzcash')}>JazzCash</Button>
              <Button variant={method === 'easypaisa' ? 'default' : 'outline'} onClick={() => setMethod('easypaisa')}>EasyPaisa</Button>
            </div>
            <Input placeholder="Transaction reference (optional)" value={reference} onChange={(e) => setReference(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => verifyMutation.mutate()}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
