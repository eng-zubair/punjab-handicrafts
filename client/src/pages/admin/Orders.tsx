import { AdminDashboard } from "./AdminDashboard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import OrderReceipt from "@/components/OrderReceipt";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
 

interface Order {
  id: string;
  buyerId: string;
  buyerEmail?: string;
  total: string;
  status: string;
  createdAt: string;
  itemCount?: number;
  paymentMethod?: string | null;
}

export default function AdminOrders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('all');
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);
  const { data: orders, isLoading } = useQuery<Order[]>({
    queryKey: ['/api/admin/orders'],
  });

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <AdminDashboard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-orders">Orders Overview</h1>
          <p className="text-muted-foreground">Monitor all platform orders</p>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-admin-orders-all">All ({orders?.length || 0})</TabsTrigger>
            <TabsTrigger value="cod" data-testid="tab-admin-orders-cod">COD ({orders?.filter(o => (o.paymentMethod || '').toLowerCase() === 'cod').length || 0})</TabsTrigger>
          </TabsList>
          <TabsContent value={tab}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  {tab === 'cod' ? 'COD Orders' : 'All Orders'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">Loading orders...</p>
                ) : orders && orders.length > 0 ? (
                  <div className="border rounded-md overflow-x-auto">
                    <Table className="min-w-[800px]">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Shipping</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(tab === 'cod' ? orders.filter(o => (o.paymentMethod || '').toLowerCase() === 'cod') : orders).map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm" data-testid={`text-order-id-${order.id}`}>
                              {order.id.substring(0, 8)}...
                            </TableCell>
                            <TableCell data-testid={`text-order-buyer-${order.id}`}>
                              {order.buyerEmail || order.buyerId.substring(0, 8)}
                            </TableCell>
                            <TableCell className="font-medium" data-testid={`text-order-total-${order.id}`}>
                              PKR {parseFloat(order.total).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={getStatusBadgeVariant(order.status)}
                                data-testid={`badge-order-status-${order.id}`}
                              >
                                {order.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="capitalize" data-testid={`text-order-payment-${order.id}`}>
                              {order.paymentMethod || 'n/a'}
                            </TableCell>
                            <TableCell data-testid={`text-order-date-${order.id}`}>
                              {new Date(order.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-muted-foreground">{(order as any).shippingMethod || 'n/a'} — {(order as any).shippingProvince || ''}</div>
                            </TableCell>
                            <TableCell>
                              <Button variant="default" size="sm" onClick={() => setViewOrderId(order.id)} data-testid={`btn-view-order-${order.id}`}>View</Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No orders found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        <AdminOrderDialog viewOrderId={viewOrderId} setViewOrderId={setViewOrderId} />
      </div>
    </AdminDashboard>
  );
}

type OrderDetails = {
  id: string;
  total: string;
  status: string;
  paymentMethod: string | null;
  shippingAddress: string | null;
  trackingNumber?: string | null;
  courierService?: string | null;
};

type ReceiptItem = {
  productTitle: string;
  productImage: string | null;
  storeName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

type Receipt = {
  orderId: string;
  receiptNumber: string | null;
  createdAt: string;
  paymentMethod: string | null;
  shippingMethod: string | null;
  estimatedDelivery: string | null;
  buyer: { firstName?: string | null; lastName?: string | null; email?: string | null; phone?: string | null } | null;
  shippingAddress: string | null;
  items: ReceiptItem[];
  subtotal: string;
  shippingCost: string;
  taxAmount: string;
  total: string;
};

function AdminOrderDialog({ viewOrderId, setViewOrderId }: { viewOrderId: string | null; setViewOrderId: (id: string | null) => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: viewOrder } = useQuery<OrderDetails>({
    queryKey: ['/api/orders', viewOrderId],
    enabled: !!viewOrderId,
    queryFn: async () => {
      const res = await fetch(`/api/orders/${viewOrderId}`, { credentials: 'include' });
      return res.json();
    }
  });
  const { data: viewReceipt } = useQuery<Receipt>({
    queryKey: ['/api/orders/receipt', viewOrderId],
    enabled: !!viewOrderId,
    queryFn: async () => {
      const res = await fetch(`/api/orders/${viewOrderId}/receipt`, { credentials: 'include' });
      return res.json();
    }
  });
  const [vendors, setVendors] = useState<Array<{ storeId: string; storeName?: string; vendorId: string }>>([]);
  useEffect(() => {
    (async () => {
      if (!viewOrderId) return;
      const res = await fetch(`/api/orders/${viewOrderId}/vendors`, { credentials: 'include' });
      if (res.ok) setVendors(await res.json()); else setVendors([]);
    })();
  }, [viewOrderId]);
  const [messageText, setMessageText] = useState("");
  const [receiverId, setReceiverId] = useState<string>("");
  const sendMessageMutation = useMutation({
    mutationFn: async () => apiRequest('POST', '/api/messages', { receiverId, orderId: viewOrderId, message: messageText }),
    onSuccess: async () => {
      setMessageText("");
      toast({ title: 'Message sent' });
    },
    onError: (err: any) => toast({ title: 'Message failed', description: err.message, variant: 'destructive' }),
  });
  return (
    <Dialog open={!!viewOrderId} onOpenChange={(open) => !open && setViewOrderId(null)}>
      <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
        </DialogHeader>
        {!viewOrder ? (
          <p className="text-muted-foreground">Loading details...</p>
        ) : (
          <div className="space-y-4">
            {viewReceipt && (
              <OrderReceipt
                receipt={viewReceipt as any}
                onDownloadPdf={() => {
                  const w = window.open(`/api/orders/${viewOrderId}/receipt.html`, 'receipt');
                  if (!w) return;
                  w.focus();
                  w.onload = () => w.print();
                }}
              />
            )}
            <div className="flex flex-wrap gap-2">
              {(viewOrder.status === 'pending' || viewOrder.status === 'processing') && (
                <Button variant="destructive" aria-label="Cancel order" onClick={async () => {
                  try {
                    const reason = prompt('Enter cancellation reason') || '';
                    const r = await apiRequest('POST', `/api/orders/${viewOrder.id}/cancel`, { reason });
                    if (!r.ok) {
                      const j = await r.json();
                      toast({ title: 'Cancel failed', description: j.message || String(r.status), variant: 'destructive' });
                    } else {
                      toast({ title: 'Order cancelled' });
                      setViewOrderId(null);
                      await queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
                    }
                  } catch (e: any) {
                    toast({ title: 'Cancel failed', description: e.message, variant: 'destructive' });
                  }
                }}>Cancel Order</Button>
              )}
              {viewOrder.status === 'delivered' && (
                <Button variant="secondary" aria-label="Request return" onClick={async () => {
                  try {
                    const msg = `Return requested for order #${viewOrder.id.slice(0,8)}.`;
                    const vendorsRes = await fetch(`/api/orders/${viewOrder.id}/vendors`, { credentials: 'include' });
                    const vendorsArr = vendorsRes.ok ? await vendorsRes.json() : [];
                    if (vendorsArr.length === 0) {
                      toast({ title: 'No vendor found', variant: 'destructive' });
                      return;
                    }
                    const targetVendorId = vendorsArr[0].vendorId;
                    await apiRequest('POST', '/api/messages', { receiverId: targetVendorId, orderId: viewOrder.id, message: msg });
                    toast({ title: 'Return request sent' });
                  } catch (e: any) {
                    toast({ title: 'Request failed', description: e.message, variant: 'destructive' });
                  }
                }}>Request Return</Button>
              )}
              
              <Button variant="outline" onClick={() => setViewOrderId(null)} aria-label="Close">Close</Button>
            </div>
            <div className="space-y-2 border-t pt-3">
              <div className="text-sm font-medium">Message Vendor</div>
              {vendors.length > 1 && (
                <select className="border rounded px-2 py-1 text-sm" value={receiverId} onChange={(e) => setReceiverId(e.target.value)} aria-label="Choose vendor">
                  <option value="">Choose vendor</option>
                  {vendors.map(v => (
                    <option key={v.vendorId} value={v.vendorId}>{v.storeName || v.storeId}</option>
                  ))}
                </select>
              )}
              {vendors.length === 1 && (
                <div className="text-xs text-muted-foreground">Sending to: {vendors[0].storeName || vendors[0].storeId}</div>
              )}
              <div className="flex gap-2">
                <Input placeholder="Type your message" value={messageText} onChange={(e) => setMessageText(e.target.value)} />
                <Button size="sm" onClick={() => sendMessageMutation.mutate()} disabled={!messageText.trim() || sendMessageMutation.isPending || (!receiverId && vendors.length !== 1)}>Send</Button>
              </div>
              <p className="text-xs text-muted-foreground">Ask about delivery, returns, or product issues.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
