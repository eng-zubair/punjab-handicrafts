import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VendorDashboard } from "./VendorDashboard";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, Circle, Store as StoreIcon, Package, ShoppingCart, DollarSign, AlertCircle, Clock, XCircle, Tag } from "lucide-react";
import { Link } from "wouter";
import { formatPrice } from "@/lib/utils/price";
import { apiRequest } from "@/lib/queryClient";
import type { Offer } from "@shared/schema";

type Store = {
  id: string;
  name: string;
  description: string | null;
  district: string;
  giBrands: string[];
  status: string;
  vendorId: string;
  createdAt: string;
};

type Analytics = {
  totalRevenue: string; // Decimal field serialized as string for precision
  totalEarnings: string; // Decimal field serialized as string for precision
  totalOrders: number;
  totalProducts: number;
  totalStores: number;
  promotionProductCount?: number;
  promotionActiveProductCount?: number;
  promotionTypeBreakdown?: { percentage: number; fixed: number; 'buy-one-get-one': number };
};

type Order = {
  id: string;
  status: string;
  items: Array<{
    price: string;
    quantity: number;
  }>;
  paymentMethod?: string | null;
  codPaymentStatus?: string | null;
  paymentVerificationStatus?: string | null;
};

export default function VendorOverview() {
  const { data: stores, isLoading: loadingStores } = useQuery<Store[]>({
    queryKey: ['/api/vendor/stores'],
  });

  const { data: analytics, isLoading: loadingAnalytics } = useQuery<Analytics>({
    queryKey: ['/api/vendor/analytics'],
  });

  const { data: orders = [] } = useQuery<Order[]>({
    queryKey: ['/api/vendor/orders'],
  });

  const store = stores?.[0];
  const isDeactivated = store?.status === 'deactivated';
  const { data: statusReason } = useQuery<{ status: string; reason: string | null}>({
    queryKey: ['/api/vendor/stores/deactivation', store?.id || ''],
    enabled: !!store?.id && isDeactivated,
    queryFn: async () => {
      const res = await fetch(`/api/vendor/stores/${store!.id}/deactivation-reason`, { credentials: 'include' });
      return res.json();
    }
  });
  const { data: vendorOffersData, isLoading: offersLoading } = useQuery<{ offers: Offer[]; total: number }>({
    queryKey: ['/api/vendor/offers', store?.id || ''],
    enabled: !!store?.id,
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/vendor/offers?storeId=${store!.id}`);
      return res.json();
    },
  });
  const vendorOffers = vendorOffersData?.offers || [];
  const now = new Date();
  const activeOffers = vendorOffers.filter(o => !!o.isActive && new Date(String(o.startAt)) <= now && now <= new Date(String(o.endAt))).length;
  const upcomingOffers = vendorOffers.filter(o => !!o.isActive && now < new Date(String(o.startAt))).length;
  const expiredOffers = vendorOffers.filter(o => now > new Date(String(o.endAt))).length;
  const typeCounts = vendorOffers.reduce((acc: Record<string, number>, o) => {
    const t = String(o.discountType || '').toLowerCase();
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const percentageCount = typeCounts['percentage'] || 0;
  const fixedCount = typeCounts['fixed'] || 0;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const canceledOrders = orders.filter(o => o.status === 'cancelled').length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;
  const totalOrders = orders.length;

  // Calculate total earnings from delivered orders
  const totalEarnings = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, order) => {
      const orderTotal = order.items?.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0) || 0;
      return sum + orderTotal;
    }, 0);

  const verifiedPaymentsTotal = orders
    .filter(o => o.status !== 'cancelled' && o.paymentVerificationStatus === 'cleared')
    .reduce((sum, order) => {
      const orderTotal = order.items?.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0) || 0;
      return sum + orderTotal;
    }, 0);

  const unverifiedPaymentsTotal = orders
    .filter(o => o.status !== 'cancelled')
    .filter(o => {
      const pm = (o.paymentMethod || '').toLowerCase();
      return (o.paymentVerificationStatus !== 'cleared') && (o.codPaymentStatus === 'collected' || pm === 'jazzcash' || pm === 'easypaisa');
    })
    .reduce((sum, order) => {
      const orderTotal = order.items?.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0) || 0;
      return sum + orderTotal;
    }, 0);

  const isStoreApproved = store?.status === 'approved';
  const hasProducts = (analytics?.totalProducts || 0) > 0;
  const hasOrders = totalOrders > 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" data-testid="badge-store-approved">Approved</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500/50 text-yellow-700 dark:text-yellow-400" data-testid="badge-store-pending">Pending Approval</Badge>;
      case 'rejected':
        return <Badge variant="destructive" data-testid="badge-store-rejected">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loadingStores || loadingAnalytics) {
    return (
      <VendorDashboard>
        <div className="p-6">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </VendorDashboard>
    );
  }

  return (
    <VendorDashboard>
      <div className="p-6 space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold" data-testid="heading-overview">
              {store ? store.name : 'Vendor Overview'}
            </h1>
            {store && getStatusBadge(store.status)}
          </div>
          <p className="text-muted-foreground">
            {store ? `${store.district} • ${store.giBrands.join(', ')}` : 'Welcome to your vendor dashboard'}
          </p>
        </div>

        {!store && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription data-testid="alert-no-store">
              You haven't created a store yet. <Link href="/vendor/store" className="text-primary underline hover:no-underline">Create your store</Link> to start selling.
            </AlertDescription>
          </Alert>
        )}

        {store && store.status === 'pending' && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription data-testid="alert-pending-approval">
              Your store is pending approval. Once approved by an admin, you'll be able to add products and start selling.
            </AlertDescription>
          </Alert>
        )}

        {store && store.status === 'rejected' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription data-testid="alert-store-rejected">
              Your store application was rejected. Please contact support for more information.
            </AlertDescription>
          </Alert>
        )}

        {store && isDeactivated && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription data-testid="alert-store-deactivated">
              Your store is deactivated. {statusReason?.reason ? `Reason: ${statusReason.reason}` : 'Contact admin for activation.'}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-total-products">
                {analytics?.totalProducts || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {!analytics?.totalProducts ? 'No products yet' : 'Products listed'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-total-orders">
                {totalOrders}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalOrders === 0 ? 'No orders yet' : 'Total orders'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-pending-orders">
                {pendingOrders}
              </div>
              <p className="text-xs text-muted-foreground">
                {pendingOrders === 0 ? 'All caught up' : 'Need attention'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered Orders</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-delivered-orders">
                {deliveredOrders}
              </div>
              <p className="text-xs text-muted-foreground">
                Successfully delivered
              </p>
            </CardContent>
          </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceled Orders</CardTitle>
            <XCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-canceled-orders">
              {canceledOrders}
            </div>
            <p className="text-xs text-muted-foreground">
              Cancelled orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verified Payments</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-verified-payments">
              {formatPrice(verifiedPaymentsTotal)}
            </div>
            <p className="text-xs text-muted-foreground">Cleared payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unverified Payments</CardTitle>
            <AlertCircle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="metric-unverified-payments">
              {formatPrice(unverifiedPaymentsTotal)}
            </div>
            <p className="text-xs text-muted-foreground">
              {unverifiedPaymentsTotal === 0 ? 'No pending verifications' : 'Awaiting verification'}
            </p>
          </CardContent>
        </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-total-revenue">
                {formatPrice(totalEarnings)}
              </div>
              <p className="text-xs text-muted-foreground">
                {totalEarnings === 0 ? 'No sales yet' : 'Your earnings'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promotions</CardTitle>
              <Tag className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span>Active</span>
                  <span className="font-semibold" data-testid="metric-promotions-active">{activeOffers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Upcoming</span>
                  <span className="font-semibold" data-testid="metric-promotions-upcoming">{upcomingOffers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Expired</span>
                  <span className="font-semibold" data-testid="metric-promotions-expired">{expiredOffers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Percentage</span>
                  <span className="font-semibold" data-testid="metric-promotions-percentage">{percentageCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Fixed</span>
                  <span className="font-semibold" data-testid="metric-promotions-fixed">{fixedCount}</span>
                </div>
              </div>
              {offersLoading ? <p className="text-xs text-muted-foreground mt-2">Loading promotions...</p> : null}
            </CardContent>
          </Card>

        </div>

        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Complete these steps to start selling on Sanatzar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              {store ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={store ? "font-medium" : "text-muted-foreground"} data-testid="checklist-create-store">
                  Create your store
                </p>
                {!store && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <Link href="/vendor/store" className="text-primary underline hover:no-underline">Set up your store</Link> with your district and GI brands
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              {isStoreApproved ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={isStoreApproved ? "font-medium" : "text-muted-foreground"} data-testid="checklist-store-approval">
                  Wait for store approval
                </p>
                {store && !isStoreApproved && (
                  <p className="text-sm text-muted-foreground mt-1">
                    An admin will review your store application
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              {hasProducts ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={hasProducts ? "font-medium" : "text-muted-foreground"} data-testid="checklist-add-products">
                  Add your first product
                </p>
                {!hasProducts && isStoreApproved && (
                  <p className="text-sm text-muted-foreground mt-1">
                    <Link href="/vendor/products" className="text-primary underline hover:no-underline">Add products</Link> to your store catalog
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              {hasOrders ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={hasOrders ? "font-medium" : "text-muted-foreground"} data-testid="checklist-first-order">
                  Receive your first order
                </p>
                {!hasOrders && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Start earning when customers purchase your products
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </VendorDashboard>
  );
}
