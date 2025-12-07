import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminDashboard } from "./AdminDashboard";
import { useQuery } from "@tanstack/react-query";
import { Users, Store, Package, ShoppingCart, TrendingUp, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AnalyticsData {
  totalUsers: number;
  totalStores: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  receivedOrdersValue: number;
  pendingStores: number;
  pendingProducts: number;
}

export default function AdminOverview() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/admin/analytics'],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return (
      <AdminDashboard>
        <div className="p-6">
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </AdminDashboard>
    );
  }

  return (
    <AdminDashboard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-admin-overview">Admin Overview</h1>
          <p className="text-muted-foreground">Platform management and monitoring</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-total-users">
                {analytics?.totalUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground">Platform users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
              <Store className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-total-stores">
                {analytics?.totalStores || 0}
              </div>
              <p className="text-xs text-muted-foreground">Registered vendors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-total-products">
                {analytics?.totalProducts || 0}
              </div>
              <p className="text-xs text-muted-foreground">Listed items</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-total-orders">
                {analytics?.totalOrders || 0}
              </div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-total-revenue">
                PKR {analytics?.totalRevenue?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">Delivered orders revenue</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <AlertCircle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div>
                  <div className="text-2xl font-bold" data-testid="metric-pending-stores">
                    {analytics?.pendingStores || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Stores</p>
                </div>
                <div>
                  <div className="text-2xl font-bold" data-testid="metric-pending-products">
                    {analytics?.pendingProducts || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Received Orders Value</CardTitle>
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-received-orders-value">
                PKR {analytics?.receivedOrdersValue?.toLocaleString() || 0}
              </div>
              <p className="text-xs text-muted-foreground">Pending, Processing and Shipped</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Platform Status</CardTitle>
            <CardDescription>System health and moderation queue</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>All systems operational</span>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
            {(analytics?.pendingStores || 0) > 0 && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>{analytics?.pendingStores} store(s) awaiting approval</span>
                </div>
                <Badge variant="secondary">Action Needed</Badge>
              </div>
            )}
            {(analytics?.pendingProducts || 0) > 0 && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <span>{analytics?.pendingProducts} product(s) awaiting review</span>
                </div>
                <Badge variant="secondary">Action Needed</Badge>
              </div>
            )}
            {(analytics?.pendingStores === 0 && analytics?.pendingProducts === 0) && (
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-muted" />
                <span className="text-muted-foreground">No pending approvals</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminDashboard>
  );
}
