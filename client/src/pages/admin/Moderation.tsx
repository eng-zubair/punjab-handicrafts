import { AdminDashboard } from "./AdminDashboard";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Store, Package } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PendingStore {
  id: string;
  name: string;
  description: string;
  district: string;
  giBrands: string[];
  status: string;
  createdAt: string;
  vendorId: string;
  vendorEmail?: string;
}

interface PendingProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  stock: number;
  images: string[];
  district: string;
  giBrand: string;
  status: string;
  createdAt: string;
  storeId: string;
  storeName?: string;
}

interface ProductsResponse {
  products: PendingProduct[];
  total: number;
}

export default function AdminModeration() {
  const { toast } = useToast();

  const { data: pendingStores, isLoading: isLoadingStores } = useQuery<PendingStore[]>({
    queryKey: ['/api/admin/stores?status=pending'],
  });

  const { data: productsData, isLoading: isLoadingProducts } = useQuery<ProductsResponse>({
    queryKey: ['/api/admin/products?status=pending'],
  });

  const updateStoreMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest('PUT', `/api/admin/stores/${id}/status`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stores?status=pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      toast({
        title: "Store updated",
        description: `Store ${variables.status === 'approved' ? 'approved' : 'rejected'} successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update store status.",
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return apiRequest('PUT', `/api/admin/products/${id}/status`, { status });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products?status=pending'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
      toast({
        title: "Product updated",
        description: `Product ${variables.status === 'approved' ? 'approved' : 'rejected'} successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update product status.",
        variant: "destructive",
      });
    },
  });

  const pendingStoresList = pendingStores || [];
  const pendingProductsList = productsData?.products || [];

  return (
    <AdminDashboard>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-moderation">Moderation Center</h1>
          <p className="text-muted-foreground">Review and approve vendor stores and products</p>
        </div>

        <Tabs defaultValue="stores" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="stores" data-testid="tab-pending-stores">
              Pending Stores ({pendingStoresList.length})
            </TabsTrigger>
            <TabsTrigger value="products" data-testid="tab-pending-products">
              Pending Products ({pendingProductsList.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stores" className="space-y-4">
            {isLoadingStores ? (
              <p className="text-muted-foreground">Loading stores...</p>
            ) : pendingStoresList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Store className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2" data-testid="text-no-pending-stores">
                    No pending stores
                  </h3>
                  <p className="text-muted-foreground">All stores have been reviewed</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingStoresList.map((store) => (
                  <Card key={store.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {store.name}
                            <Badge variant="secondary" data-testid={`badge-store-status-${store.id}`}>
                              Pending
                            </Badge>
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {store.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-2 text-sm">
                        <div className="flex gap-2">
                          <span className="text-muted-foreground min-w-24">District:</span>
                          <span className="font-medium" data-testid={`text-store-district-${store.id}`}>
                            {store.district}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground min-w-24">GI Brands:</span>
                          <div className="flex flex-wrap gap-1">
                            {store.giBrands.map((brand, index) => (
                              <Badge key={index} variant="outline" data-testid={`badge-gi-brand-${store.id}-${index}`}>
                                {brand}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground min-w-24">Submitted:</span>
                          <span>{new Date(store.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => updateStoreMutation.mutate({ id: store.id, status: 'approved' })}
                          disabled={updateStoreMutation.isPending}
                          data-testid={`button-approve-store-${store.id}`}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateStoreMutation.mutate({ id: store.id, status: 'rejected' })}
                          disabled={updateStoreMutation.isPending}
                          data-testid={`button-reject-store-${store.id}`}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            {isLoadingProducts ? (
              <p className="text-muted-foreground">Loading products...</p>
            ) : pendingProductsList.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2" data-testid="text-no-pending-products">
                    No pending products
                  </h3>
                  <p className="text-muted-foreground">All products have been reviewed</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingProductsList.map((product) => (
                  <Card key={product.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            {product.title}
                            <Badge variant="secondary" data-testid={`badge-product-status-${product.id}`}>
                              Pending
                            </Badge>
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {product.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {product.images && product.images.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto">
                          {product.images.slice(0, 3).map((image, index) => (
                            <img
                              key={index}
                              src={image}
                              alt={`${product.title} ${index + 1}`}
                              className="w-24 h-24 object-cover rounded-md border"
                              data-testid={`img-product-${product.id}-${index}`}
                            />
                          ))}
                        </div>
                      )}
                      <div className="grid gap-2 text-sm">
                        <div className="flex gap-2">
                          <span className="text-muted-foreground min-w-24">Price:</span>
                          <span className="font-medium" data-testid={`text-product-price-${product.id}`}>
                            PKR {parseFloat(product.price).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground min-w-24">Stock:</span>
                          <span data-testid={`text-product-stock-${product.id}`}>{product.stock} units</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground min-w-24">District:</span>
                          <span data-testid={`text-product-district-${product.id}`}>{product.district}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground min-w-24">GI Brand:</span>
                          <Badge variant="outline" data-testid={`badge-product-gi-${product.id}`}>
                            {product.giBrand}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-muted-foreground min-w-24">Submitted:</span>
                          <span>{new Date(product.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => updateProductMutation.mutate({ id: product.id, status: 'approved' })}
                          disabled={updateProductMutation.isPending}
                          data-testid={`button-approve-product-${product.id}`}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateProductMutation.mutate({ id: product.id, status: 'rejected' })}
                          disabled={updateProductMutation.isPending}
                          data-testid={`button-reject-product-${product.id}`}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminDashboard>
  );
}
