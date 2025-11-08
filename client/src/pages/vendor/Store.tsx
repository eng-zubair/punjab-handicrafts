import { VendorDashboard } from "./VendorDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function VendorStore() {
  return (
    <VendorDashboard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-store-settings">Store Settings</h1>
          <p className="text-muted-foreground">Manage your store information and preferences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Store Information</CardTitle>
            <CardDescription>Update your store details, logo, and description</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Store settings management coming soon.
            </p>
          </CardContent>
        </Card>
      </div>
    </VendorDashboard>
  );
}
