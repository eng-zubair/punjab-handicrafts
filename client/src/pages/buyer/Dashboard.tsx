import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ShippingForm, { ShippingValues } from "@/components/ShippingForm";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { normalizeImagePath } from "@/lib/utils/image";
import { formatPrice } from "@/lib/utils/price";
import { addToCart } from "@/lib/cart";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import OrderReceipt from "@/components/OrderReceipt";

type BuyerProfile = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  profileImageUrl?: string | null;
  defaultShippingAddress?: string | null;
  notificationPrefs?: { email?: boolean; in_app?: boolean } | null;
  shippingPrefs?: {
    recipientName?: string | null;
    recipientEmail?: string | null;
    shippingStreet?: string | null;
    shippingApartment?: string | null;
    shippingCity?: string | null;
    shippingProvince?: string | null;
    shippingPostalCode?: string | null;
    shippingCountry?: string | null;
  } | null;
};

type OrderSummary = {
  id: string;
  buyerId: string;
  total: string;
  status: string;
  paymentMethod: string | null;
  shippingAddress: string | null;
  createdAt: string;
};

type OrderItemWithProduct = {
  id: string;
  orderId: string;
  productId: string;
  storeId: string;
  quantity: number;
  price: string;
  product: { id: string; title: string; images: string[]; district: string; giBrand: string; stock?: number } | null;
};

export default function BuyerDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");

  const { data: profile, isLoading: profileLoading } = useQuery<BuyerProfile>({
    queryKey: ["/api/buyer/profile"],
    queryFn: async () => {
      const res = await fetch("/api/buyer/profile", { credentials: "include" });
      return res.json();
    },
  });
  const { data: messages = [] } = useQuery<Array<{ id: string; senderId: string; receiverId: string; orderId?: string; message: string; read: boolean; createdAt: string }>>({
    queryKey: ["/api/messages"],
    queryFn: async () => {
      const res = await fetch("/api/messages", { credentials: "include" });
      return res.json();
    },
    refetchInterval: 10000,
  });
  const unreadReplies = useMemo(() => messages.filter(m => !m.read && m.receiverId === profile?.id).length, [messages, profile?.id]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [prefEmail, setPrefEmail] = useState(true);
  const [prefInApp, setPrefInApp] = useState(true);
  const [shippingValues, setShippingValues] = useState<ShippingValues>({
    recipientName: "",
    recipientEmail: "",
    phoneNumber: "",
    shippingStreet: "",
    shippingApartment: "",
    shippingCity: "",
    shippingProvince: "",
    shippingPostalCode: "",
    shippingCountry: "Pakistan",
    shippingAddress: "",
    shippingMethod: "standard",
    specialInstructions: "",
    billingSame: true,
    saveInfo: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || "");
      setLastName(profile.lastName || "");
      setPhone(profile.phone || "");
      setPrefEmail(Boolean(profile.notificationPrefs?.email ?? true));
      setPrefInApp(Boolean(profile.notificationPrefs?.in_app ?? true));
      const prefs = profile.shippingPrefs || {};
      setShippingValues(prev => ({
        ...prev,
        recipientName: (prefs.recipientName as any) || prev.recipientName,
        recipientEmail: (prefs.recipientEmail as any) || prev.recipientEmail,
        shippingStreet: (prefs.shippingStreet as any) || prev.shippingStreet,
        shippingApartment: (prefs.shippingApartment as any) || prev.shippingApartment,
        shippingCity: (prefs.shippingCity as any) || prev.shippingCity,
        shippingProvince: (prefs.shippingProvince as any) || prev.shippingProvince,
        shippingPostalCode: (prefs.shippingPostalCode as any) || prev.shippingPostalCode,
        shippingCountry: (prefs.shippingCountry as any) || prev.shippingCountry,
        shippingAddress: profile.defaultShippingAddress || prev.shippingAddress,
      }));
    }
  }, [profile]);

  const handleShippingChange = (patch: Partial<ShippingValues>) => {
    setShippingValues(prev => ({ ...prev, ...patch }));
    if (
      patch.shippingStreet ||
      patch.shippingApartment ||
      patch.shippingCity ||
      patch.shippingProvince ||
      patch.shippingPostalCode ||
      patch.shippingCountry
    ) {
      const composed = [
        patch.shippingStreet ?? shippingValues.shippingStreet,
        patch.shippingApartment ?? shippingValues.shippingApartment,
        patch.shippingCity ?? shippingValues.shippingCity,
        patch.shippingProvince ?? shippingValues.shippingProvince,
        patch.shippingPostalCode ?? shippingValues.shippingPostalCode,
        patch.shippingCountry ?? shippingValues.shippingCountry,
      ]
        .filter(Boolean)
        .join(", ");
      setShippingValues(prev => ({ ...prev, shippingAddress: composed }));
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/buyer/profile", {
        firstName,
        lastName,
        phone,
        notificationPrefs: { email: prefEmail, in_app: prefInApp },
      });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/buyer/profile"] });
      toast({ title: "Profile updated" });
    },
    onError: (err: any) => toast({ title: "Update failed", description: err.message, variant: "destructive" }),
  });

  const saveShippingPrefsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/buyer/profile", {
        shippingPrefs: {
          recipientName: shippingValues.recipientName,
          recipientEmail: shippingValues.recipientEmail,
          shippingStreet: shippingValues.shippingStreet,
          shippingApartment: shippingValues.shippingApartment,
          shippingCity: shippingValues.shippingCity,
          shippingProvince: shippingValues.shippingProvince,
          shippingPostalCode: shippingValues.shippingPostalCode,
          shippingCountry: shippingValues.shippingCountry,
        },
        defaultShippingAddress: shippingValues.shippingAddress,
      });
      return res.json();
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/buyer/profile"] });
      toast({ title: "Shipping preferences saved" });
    },
    onError: (err: any) => toast({ title: "Save failed", description: err.message, variant: "destructive" }),
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const changePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error("Passwords do not match");
      const res = await apiRequest("POST", "/api/buyer/password", { currentPassword, newPassword });
      return res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Password changed" });
    },
    onError: (err: any) => toast({ title: "Change failed", description: err.message, variant: "destructive" }),
  });

  const uploadImage = async (file: File) => {
    if (!file) return;
    if (!/^image\/.+/.test(file.type)) {
      toast({ title: "Invalid file type", variant: "destructive" });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Image too large (max 2MB)", variant: "destructive" });
      return;
    }
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch("/api/buyer/profile/upload-image", { method: "POST", body: fd, credentials: "include" });
    if (!res.ok) {
      const j = await res.json();
      toast({ title: "Upload failed", description: j.message || String(res.status), variant: "destructive" });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["/api/buyer/profile"] });
    toast({ title: "Profile image updated" });
  };

  const { data: orders = [], isLoading: ordersLoading } = useQuery<OrderSummary[]>({
    queryKey: ["/api/buyer/orders"],
    queryFn: async () => {
      const res = await fetch("/api/buyer/orders", { credentials: "include" });
      return res.json();
    },
    refetchInterval: 10000,
  });

  const [orderFilter, setOrderFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"date" | "status" | "total">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const filteredOrders = useMemo(() => {
    const list = orders.filter(o => orderFilter === "all" ? true : o.status === orderFilter);
    const sorted = [...list].sort((a, b) => {
      switch (sortField) {
        case "date": return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * (sortDir === "asc" ? 1 : -1);
        case "status": return a.status.localeCompare(b.status) * (sortDir === "asc" ? 1 : -1);
        case "total": return (parseFloat(a.total) - parseFloat(b.total)) * (sortDir === "asc" ? 1 : -1);
      }
    });
    return sorted;
  }, [orders, orderFilter, sortField, sortDir]);

  const [viewOrderId, setViewOrderId] = useState<string | null>(null);
  const { data: viewOrder } = useQuery<{ id: string; total: string; status: string; paymentMethod: string | null; shippingAddress: string | null; trackingNumber?: string | null; courierService?: string | null; items: OrderItemWithProduct[] }>({
    queryKey: ["/api/buyer/orders/details", viewOrderId],
    enabled: !!viewOrderId,
    queryFn: async () => {
      const res = await fetch(`/api/buyer/orders/${viewOrderId}/details`, { credentials: "include" });
      return res.json();
    }
  });
  const { data: viewReceipt } = useQuery<{ orderId: string; receiptNumber: string | null; createdAt: string; paymentMethod: string | null; shippingMethod: string | null; estimatedDelivery: string | null; buyer: { firstName?: string | null; lastName?: string | null; email?: string | null; phone?: string | null } | null; shippingAddress: string | null; items: Array<{ productTitle: string; productImage: string | null; storeName: string; quantity: number; unitPrice: string; lineTotal: string }>; subtotal: string; shippingCost: string; taxAmount: string; total: string }>({
    queryKey: ["/api/orders/receipt", viewOrderId],
    enabled: !!viewOrderId,
    queryFn: async () => {
      const res = await fetch(`/api/orders/${viewOrderId}/receipt`, { credentials: "include" });
      return res.json();
    }
  });

  const [vendors, setVendors] = useState<Array<{ storeId: string; storeName?: string; vendorId: string }>>([]);
  useEffect(() => {
    (async () => {
      if (!viewOrderId) return;
      const res = await fetch(`/api/orders/${viewOrderId}/vendors`, { credentials: "include" });
      if (res.ok) setVendors(await res.json()); else setVendors([]);
    })();
  }, [viewOrderId]);


  const [messageText, setMessageText] = useState("");
  const [receiverId, setReceiverId] = useState<string>("");
  const activeVendorId = vendors.length === 1 ? vendors[0].vendorId : (receiverId || "");
  const { data: conversation = [] } = useQuery<Array<{ id: string; senderId: string; receiverId: string; orderId?: string; message: string; read: boolean; createdAt: string }>>({
    queryKey: ["/api/messages/conversation", { otherUserId: activeVendorId, orderId: viewOrderId }],
    enabled: !!viewOrderId && !!activeVendorId,
    queryFn: async () => {
      const res = await fetch(`/api/messages/conversation/${activeVendorId}`, { credentials: "include" });
      const all = await res.json();
      return (all || []).filter((m: any) => (m.orderId || "") === viewOrderId);
    },
    refetchInterval: 5000,
  });
  useEffect(() => {
    (async () => {
      if (!viewOrderId || !activeVendorId) return;
      await apiRequest('PUT', '/api/messages/read', { otherUserId: activeVendorId, orderId: viewOrderId });
      await queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
    })();
  }, [viewOrderId, activeVendorId]);
  const sendMessageMutation = useMutation({
    mutationFn: async () => apiRequest("POST", "/api/messages", { receiverId: activeVendorId, orderId: viewOrderId, message: messageText }),
    onSuccess: async () => {
      setMessageText("");
      toast({ title: "Message sent" });
      if (activeVendorId) {
        await queryClient.invalidateQueries({ queryKey: ["/api/messages/conversation", { otherUserId: activeVendorId, orderId: viewOrderId }] });
      }
    },
    onError: (err: any) => toast({ title: "Message failed", description: err.message, variant: "destructive" }),
  });

  const reorder = () => {
    if (!viewOrder) return;
    for (const it of viewOrder.items) {
      if (!it.product) continue;
      addToCart({
        productId: it.product.id,
        title: it.product.title,
        price: it.price,
        image: it.product.images?.[0] ? normalizeImagePath(it.product.images[0]) : "",
        district: it.product.district,
        giBrand: it.product.giBrand,
        storeId: it.storeId,
        storeName: "",
        stock: typeof it.product.stock === "number" ? it.product.stock : 9999,
      }, it.quantity);
    }
    toast({ title: "Items added to cart" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-3xl font-bold">Buyer Dashboard</h1>
              <p className="text-muted-foreground">Manage profile and track orders</p>
            </div>
            <Button asChild variant="default" data-testid="link-continue-shopping" aria-label="Continue shopping">
              <a href="/products">Continue Shopping</a>
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="profile" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Profile</TabsTrigger>
              <TabsTrigger value="orders" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Orders</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="mt-6">
              {profileLoading || !profile ? (
                <p className="text-muted-foreground">Loading profile...</p>
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Personal Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-4">
                        <img src={normalizeImagePath(profile.profileImageUrl || "/assets/avatar-placeholder.png")} alt="Profile" className="w-16 h-16 rounded object-cover" />
                        <div>
                          <Input type="file" accept="image/*" aria-label="Upload profile picture" onChange={(e) => e.target.files && e.target.files[0] && uploadImage(e.target.files[0])} />
                          <p className="text-xs text-muted-foreground">Max 2MB. JPG/PNG/WebP.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                        <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
                      </div>
                      <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={prefEmail} onChange={(e) => setPrefEmail(e.target.checked)} /> Email notifications</label>
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={prefInApp} onChange={(e) => setPrefInApp(e.target.checked)} /> In-app notifications</label>
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={() => updateProfileMutation.mutate()} disabled={updateProfileMutation.isPending}>Save Changes</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Shipping Preferences</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ShippingForm
                        values={shippingValues}
                        errors={errors}
                        onChange={handleShippingChange}
                        showBilling={false}
                        showSaveInfo={false}
                        showMethod={false}
                      />
                      <div className="flex justify-end mt-4">
                        <Button onClick={() => saveShippingPrefsMutation.mutate()} disabled={saveShippingPrefsMutation.isPending}>Save Shipping</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Change Password</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Input type="password" placeholder="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                      <Input type="password" placeholder="New password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                      <Input type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                      <div className="flex justify-end">
                        <Button onClick={() => changePasswordMutation.mutate()} disabled={changePasswordMutation.isPending}>Update Password</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="orders" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>My Orders {unreadReplies > 0 ? <span className="ml-2 text-xs font-normal text-muted-foreground">Replies: {unreadReplies}</span> : null}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <select className="border rounded px-2 py-1 text-sm" value={orderFilter} onChange={(e) => setOrderFilter(e.target.value)} aria-label="Filter by status">
                      <option value="all">All</option>
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                    <select className="border rounded px-2 py-1 text-sm" value={sortField} onChange={(e) => setSortField(e.target.value as any)} aria-label="Sort field">
                      <option value="date">Date</option>
                      <option value="status">Status</option>
                      <option value="total">Total</option>
                    </select>
                    <select className="border rounded px-2 py-1 text-sm" value={sortDir} onChange={(e) => setSortDir(e.target.value as any)} aria-label="Sort direction">
                      <option value="asc">Asc</option>
                      <option value="desc">Desc</option>
                    </select>
                  </div>
                  {ordersLoading ? (
                    <p className="text-muted-foreground">Loading orders...</p>
                  ) : filteredOrders.length === 0 ? (
                    <p className="text-muted-foreground">No orders found</p>
                  ) : (
                    <div className="overflow-auto">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="text-left">
                            <th className="px-2 py-2">Order</th>
                            <th className="px-2 py-2">Date</th>
                            <th className="px-2 py-2">Status</th>
                            <th className="px-2 py-2">Payment</th>
                            <th className="px-2 py-2">Total</th>
                            <th className="px-2 py-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredOrders.map(o => (
                            <tr key={o.id} className="border-t">
                              <td className="px-2 py-2 font-mono">{o.id.slice(0,8)}</td>
                              <td className="px-2 py-2">{new Date(o.createdAt).toLocaleString()}</td>
                              <td className="px-2 py-2"><Badge variant={o.status === 'delivered' ? 'default' : (o.status === 'cancelled' ? 'destructive' : 'secondary')}>{o.status}</Badge></td>
                              <td className="px-2 py-2 capitalize">{o.paymentMethod || 'n/a'}</td>
                              <td className="px-2 py-2 font-semibold">{formatPrice(o.total)}</td>
                              <td className="px-2 py-2"><Button size="sm" variant="default" onClick={() => setViewOrderId(o.id)}>View</Button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Dialog open={!!viewOrderId} onOpenChange={(open) => !open && setViewOrderId(null)}>
            <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Order Details</DialogTitle>
                <DialogDescription>View order information and communicate with the vendor about delivery or issues.</DialogDescription>
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
                    <Button onClick={reorder} aria-label="Reorder items">Reorder Items</Button>
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
                            await queryClient.invalidateQueries({ queryKey: ['/api/buyer/orders'] });
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
                          const vendors = vendorsRes.ok ? await vendorsRes.json() : [];
                          if (vendors.length === 0) {
                            toast({ title: 'No vendor found', variant: 'destructive' });
                            return;
                          }
                          const targetVendorId = vendors[0].vendorId;
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
                    {activeVendorId ? (
                      <div className="max-h-[240px] overflow-y-auto border rounded p-2 space-y-2 bg-muted/20" data-testid="buyer-conversation-box">
                        {conversation.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No messages yet.</p>
                        ) : (
                          conversation.map((m) => (
                            <div key={m.id} className={`flex ${m.senderId === profile?.id ? 'justify-end' : 'justify-start'}`}>
                              <div className={`inline-block px-3 py-2 rounded text-sm ${m.senderId === profile?.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}>
                                <div>{m.message}</div>
                                <div className="mt-1 text-[10px] opacity-80">{new Date(m.createdAt).toLocaleString()}</div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    ) : null}
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
                      <Button size="sm" onClick={() => sendMessageMutation.mutate()} disabled={!messageText.trim() || sendMessageMutation.isPending || !activeVendorId}>Send</Button>
                    </div>
                    <p className="text-xs text-muted-foreground">You can ask about delivery, returns, or product issues.</p>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </main>
      <Footer />
    </div>
  );
}
