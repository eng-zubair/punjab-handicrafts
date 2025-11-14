import { AdminDashboard } from "./AdminDashboard";
import { useQuery } from "@tanstack/react-query";
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

interface Order {
  id: string;
  buyerId: string;
  buyerEmail?: string;
  total: string;
  status: string;
  createdAt: string;
  itemCount?: number;
}

export default function AdminOrders() {
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              All Orders ({orders?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading orders...</p>
            ) : orders && orders.length > 0 ? (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
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
                        <TableCell data-testid={`text-order-date-${order.id}`}>
                          {new Date(order.createdAt).toLocaleDateString()}
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
      </div>
    </AdminDashboard>
  );
}
