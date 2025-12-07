import { AdminDashboard } from "./AdminDashboard";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Package, Store } from "lucide-react";

interface AnalyticsData {
  totalUsers: number;
  totalStores: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingStores: number;
  pendingProducts: number;
  storesByDistrict?: { [district: string]: number };
  topGIBrands?: { brand: string; count: number }[];
  reviewsTotal?: number;
  reviewsAverage?: number;
  codOrders?: number;
  codDelivered?: number;
}

export default function AdminAnalytics() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/admin/analytics'],
  });

  return (
    <AdminDashboard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-analytics">Analytics & Reports</h1>
          <p className="text-muted-foreground">Platform insights and performance metrics</p>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading analytics...</p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Revenue Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold" data-testid="metric-analytics-revenue">
                      PKR {analytics?.totalRevenue?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Order Value</p>
                    <p className="text-lg font-semibold" data-testid="metric-avg-order-value">
                      PKR{' '}
                      {analytics?.totalOrders && analytics?.totalRevenue
                        ? Math.round(analytics.totalRevenue / analytics.totalOrders).toLocaleString()
                        : 0}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    COD Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">COD Orders</p>
                    <p className="text-2xl font-bold" data-testid="metric-analytics-cod-orders">
                      {analytics?.codOrders || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">COD Fulfillment Rate</p>
                    <p className="text-lg font-semibold" data-testid="metric-analytics-cod-fulfillment">
                      {analytics?.codOrders
                        ? `${Math.round(((analytics.codDelivered || 0) / (analytics.codOrders || 1)) * 100)}%`
                        : '0%'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Store className="w-4 h-4 text-primary" />
                    Store Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Stores</p>
                    <p className="text-2xl font-bold" data-testid="metric-analytics-stores">
                      {analytics?.totalStores || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Approval</p>
                    <p className="text-lg font-semibold" data-testid="metric-analytics-pending-stores">
                      {analytics?.pendingStores || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="w-4 h-4 text-primary" />
                    Product Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Products</p>
                    <p className="text-2xl font-bold" data-testid="metric-analytics-products">
                      {analytics?.totalProducts || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Approval</p>
                    <p className="text-lg font-semibold" data-testid="metric-analytics-pending-products">
                      {analytics?.pendingProducts || 0}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    Reviews
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Reviews</p>
                    <p className="text-2xl font-bold" data-testid="metric-analytics-reviews">
                      {analytics?.reviewsTotal || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Average Rating</p>
                    <p className="text-lg font-semibold" data-testid="metric-analytics-avg-rating">
                      {Number(analytics?.reviewsAverage || 0).toFixed(1)} / 5
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Stores by District
                  </CardTitle>
                  <CardDescription>Distribution across Punjab regions</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics?.storesByDistrict && Object.keys(analytics.storesByDistrict).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(analytics.storesByDistrict)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 8)
                        .map(([district, count]) => (
                          <div key={district} className="flex items-center justify-between gap-4">
                            <span className="text-sm font-medium" data-testid={`text-district-${district}`}>
                              {district}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="h-2 bg-primary rounded-full" style={{ width: `${Math.max(40, count * 20)}px` }} />
                              <Badge variant="secondary" data-testid={`badge-count-${district}`}>
                                {count}
                              </Badge>
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No district data available</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Top GI Brands
                  </CardTitle>
                  <CardDescription>Most popular geographical indications</CardDescription>
                </CardHeader>
                <CardContent>
                  {analytics?.topGIBrands && analytics.topGIBrands.length > 0 ? (
                    <div className="space-y-3">
                      {analytics.topGIBrands.slice(0, 8).map((item, index) => (
                        <div key={index} className="flex items-center justify-between gap-4">
                          <span className="text-sm font-medium" data-testid={`text-gi-brand-${index}`}>
                            {item.brand}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="h-2 bg-primary rounded-full" style={{ width: `${Math.max(40, item.count * 20)}px` }} />
                            <Badge variant="secondary" data-testid={`badge-gi-count-${index}`}>
                              {item.count}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No GI brand data available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Platform Summary</CardTitle>
                <CardDescription>Key performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    <p className="text-xl font-bold" data-testid="metric-conversion-rate">
                      {analytics?.totalUsers && analytics?.totalOrders
                        ? ((analytics.totalOrders / analytics.totalUsers) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Products per Store</p>
                    <p className="text-xl font-bold" data-testid="metric-products-per-store">
                      {analytics?.totalStores && analytics?.totalProducts
                        ? Math.round(analytics.totalProducts / analytics.totalStores)
                        : 0}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Vendor Participation</p>
                    <p className="text-xl font-bold" data-testid="metric-vendor-rate">
                      {analytics?.totalUsers && analytics?.totalStores
                        ? ((analytics.totalStores / analytics.totalUsers) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Platform Health</p>
                    <Badge variant="default" className="text-base" data-testid="badge-platform-health">
                      {(analytics?.pendingStores || 0) + (analytics?.pendingProducts || 0) === 0
                        ? 'Excellent'
                        : (analytics?.pendingStores || 0) + (analytics?.pendingProducts || 0) < 10
                          ? 'Good'
                          : 'Needs Attention'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminDashboard>
  );
}
