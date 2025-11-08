import { VendorDashboard } from "./VendorDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function VendorProducts() {
  return (
    <VendorDashboard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="heading-products">Products</h1>
            <p className="text-muted-foreground">Manage your product catalog</p>
          </div>
          <Button data-testid="button-add-product">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>No Products Yet</CardTitle>
            <CardDescription>Start by adding your first product to your store</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Products will appear here once you add them. Make sure your store is approved before adding products.
            </p>
          </CardContent>
        </Card>
      </div>
    </VendorDashboard>
  );
}
