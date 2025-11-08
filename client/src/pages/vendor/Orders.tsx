import { VendorDashboard } from "./VendorDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function VendorOrders() {
  return (
    <VendorDashboard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-orders">Orders</h1>
          <p className="text-muted-foreground">View and manage your orders</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>No Orders Yet</CardTitle>
            <CardDescription>Orders will appear here when customers purchase your products</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You'll be able to view order details, update order status, and manage fulfillment from this page.
            </p>
          </CardContent>
        </Card>
      </div>
    </VendorDashboard>
  );
}
