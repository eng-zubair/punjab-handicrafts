import { VendorDashboard } from "./VendorDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Package as PackageIcon } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Store = {
  id: string;
  name: string;
  status: string;
  district: string;
  giBrands: string[];
};

type Product = {
  id: string;
  title: string;
  description: string | null;
  price: string;
  stock: number;
  images: string[];
  district: string;
  giBrand: string;
  status: string;
  storeId: string;
  createdAt: string;
};

type Category = {
  id: string;
  district: string;
  giBrand: string;
  crafts: string[];
};

const productFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  price: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Price must be a positive number"),
  stock: z.string().refine((val) => !isNaN(Number(val)) && Number(val) >= 0, "Stock must be a non-negative number"),
  district: z.string().min(1, "Please select a district"),
  giBrand: z.string().min(1, "Please select a GI brand"),
  images: z.string().optional(), // Will store uploaded image paths as JSON string
});

type ProductFormValues = z.infer<typeof productFormSchema>;

export default function VendorProducts() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ['/api/vendor/stores'],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: productsData, isLoading } = useQuery<{ products: Product[]; pagination: { total: number } }>({
    queryKey: ['/api/products'],
  });

  const allProducts = productsData?.products || [];
  const store = stores[0];
  const vendorProducts = allProducts.filter(p => p.storeId === store?.id);
  
  const filteredProducts = vendorProducts.filter(p => {
    if (activeTab === "all") return true;
    return p.status === activeTab;
  });

  const addForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      title: "",
      description: "",
      price: "",
      stock: "",
      district: store?.district || "",
      giBrand: store?.giBrands?.[0] || "",
      images: "",
    },
  });

  const editForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
  });

  const addProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      if (!store) throw new Error("No store found");
      if (uploadedImages.length === 0) {
        throw new Error("Please upload at least one image");
      }
      return apiRequest('POST', '/api/products', {
        ...data,
        storeId: store.id,
        price: parseFloat(data.price),
        stock: parseInt(data.stock),
        images: uploadedImages,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/analytics'] });
      setAddDialogOpen(false);
      addForm.reset();
      setUploadedImages([]);
      toast({
        title: "Product added",
        description: "Your product has been submitted for approval",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues & { id: string }) => {
      const { id, ...updateData } = data;
      // Use uploaded images if available, otherwise keep existing images
      const images = uploadedImages.length > 0 ? uploadedImages : selectedProduct?.images || [];
      return apiRequest('PUT', `/api/products/${id}`, {
        ...updateData,
        price: parseFloat(updateData.price),
        stock: parseInt(updateData.stock),
        images,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setEditDialogOpen(false);
      setSelectedProduct(null);
      setUploadedImages([]);
      toast({
        title: "Product updated",
        description: "Your product has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/products/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/analytics'] });
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
      toast({
        title: "Product deleted",
        description: "Your product has been removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    editForm.reset({
      title: product.title,
      description: product.description || "",
      price: product.price,
      stock: product.stock.toString(),
      district: product.district,
      giBrand: product.giBrand,
      images: "",
    });
    // Show existing product images in preview
    setUploadedImages(product.images || []);
    setEditDialogOpen(true);
  };

  const handleDialogClose = (dialogType: 'add' | 'edit') => {
    if (dialogType === 'add') {
      setAddDialogOpen(false);
      addForm.reset();
    } else {
      setEditDialogOpen(false);
      setSelectedProduct(null);
    }
    setUploadedImages([]);
  };

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !store) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('images', file);
      });

      const response = await fetch(`/api/upload/product-images?storeId=${store.id}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload images');
      }

      const data = await response.json();
      setUploadedImages(data.images);
      toast({
        title: "Images uploaded",
        description: `Successfully uploaded ${data.images.length} image(s)`,
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">Approved</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-yellow-500/50 text-yellow-700 dark:text-yellow-400">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const ProductFormFields = ({ form }: { form: ReturnType<typeof useForm<ProductFormValues>> }) => (
    <>
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product Title</FormLabel>
            <FormControl>
              <Input placeholder="Handwoven Basket" {...field} data-testid="input-product-title" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea 
                placeholder="Describe your product..."
                className="min-h-24"
                {...field}
                data-testid="input-product-description"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Price (PKR)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="1500" {...field} data-testid="input-product-price" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="stock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stock</FormLabel>
              <FormControl>
                <Input type="number" placeholder="10" {...field} data-testid="input-product-stock" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="district"
        render={({ field }) => (
          <FormItem>
            <FormLabel>District</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid="select-product-district">
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.district} value={cat.district}>
                    {cat.district}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="giBrand"
        render={({ field }) => (
          <FormItem>
            <FormLabel>GI Brand</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger data-testid="select-product-gi-brand">
                  <SelectValue placeholder="Select GI brand" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.giBrand} value={cat.giBrand}>
                    {cat.giBrand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormDescription>
              Geographical Indication certified brand
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="images"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Product Images</FormLabel>
            <FormControl>
              <div className="space-y-4">
                <Input 
                  type="file" 
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  multiple
                  max={5}
                  onChange={(e) => handleImageUpload(e.target.files)}
                  disabled={isUploading}
                  data-testid="input-product-images"
                />
                {isUploading && (
                  <p className="text-sm text-muted-foreground">Uploading images...</p>
                )}
                {uploadedImages.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {uploadedImages.map((img, index) => (
                      <div key={index} className="relative w-20 h-20 rounded border">
                        <img 
                          src={img} 
                          alt={`Product ${index + 1}`}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FormControl>
            <FormDescription>
              Upload up to 5 images (JPEG, PNG, WebP). Max 5MB per image.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );

  if (!store) {
    return (
      <VendorDashboard>
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>No Store Found</CardTitle>
              <CardDescription>Create a store first before adding products</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </VendorDashboard>
    );
  }

  if (store.status !== 'approved') {
    return (
      <VendorDashboard>
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-3xl font-bold" data-testid="heading-products">Products</h1>
            <p className="text-muted-foreground">Manage your product catalog</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Store Not Approved</CardTitle>
              <CardDescription>Your store must be approved before you can add products</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Your store is currently {store.status}. Please wait for admin approval before adding products.
              </p>
            </CardContent>
          </Card>
        </div>
      </VendorDashboard>
    );
  }

  return (
    <VendorDashboard>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" data-testid="heading-products">Products</h1>
            <p className="text-muted-foreground">Manage your product catalog</p>
          </div>
          <Dialog open={addDialogOpen} onOpenChange={(open) => {
            setAddDialogOpen(open);
            if (!open) handleDialogClose('add');
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-product">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>
                  Add a new product to your store catalog
                </DialogDescription>
              </DialogHeader>
              <Form {...addForm}>
                <form onSubmit={addForm.handleSubmit((data) => addProductMutation.mutate(data))} className="space-y-4">
                  <ProductFormFields form={addForm} />
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAddDialogOpen(false)}
                      data-testid="button-cancel-add"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={addProductMutation.isPending} data-testid="button-submit-add">
                      {addProductMutation.isPending ? "Adding..." : "Add Product"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all-products">
              All ({vendorProducts.length})
            </TabsTrigger>
            <TabsTrigger value="approved" data-testid="tab-approved-products">
              Approved ({vendorProducts.filter(p => p.status === 'approved').length})
            </TabsTrigger>
            <TabsTrigger value="pending" data-testid="tab-pending-products">
              Pending ({vendorProducts.filter(p => p.status === 'pending').length})
            </TabsTrigger>
            <TabsTrigger value="rejected" data-testid="tab-rejected-products">
              Rejected ({vendorProducts.filter(p => p.status === 'rejected').length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <p className="text-muted-foreground">Loading products...</p>
            ) : filteredProducts.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PackageIcon className="w-5 h-5" />
                    No Products
                  </CardTitle>
                  <CardDescription>
                    {activeTab === "all" 
                      ? "You haven't added any products yet"
                      : `No ${activeTab} products found`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Click "Add Product" to start building your catalog.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden">
                    <div className="aspect-square relative bg-muted">
                      {product.images[0] && (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="w-full h-full object-cover"
                          data-testid={`img-product-${product.id}`}
                        />
                      )}
                    </div>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-1" data-testid={`text-product-title-${product.id}`}>
                          {product.title}
                        </CardTitle>
                        {getStatusBadge(product.status)}
                      </div>
                      <CardDescription className="line-clamp-2">
                        {product.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-semibold" data-testid={`text-product-price-${product.id}`}>
                          PKR {parseFloat(product.price).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Stock:</span>
                        <span data-testid={`text-product-stock-${product.id}`}>{product.stock} units</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">GI Brand:</span>
                        <Badge variant="outline" className="text-xs" data-testid={`badge-product-gi-${product.id}`}>
                          {product.giBrand}
                        </Badge>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleEditProduct(product)}
                          data-testid={`button-edit-product-${product.id}`}
                        >
                          <Pencil className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleDeleteProduct(product)}
                          data-testid={`button-delete-product-${product.id}`}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) handleDialogClose('edit');
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
              <DialogDescription>
                Update your product details
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit((data) =>
                  selectedProduct && updateProductMutation.mutate({ ...data, id: selectedProduct.id })
                )}
                className="space-y-4"
              >
                <ProductFormFields form={editForm} />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditDialogOpen(false)}
                    data-testid="button-cancel-edit"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateProductMutation.isPending} data-testid="button-submit-edit">
                    {updateProductMutation.isPending ? "Updating..." : "Update Product"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedProduct?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedProduct && deleteProductMutation.mutate(selectedProduct.id)}
                className="bg-destructive text-destructive-foreground hover-elevate active-elevate-2"
                data-testid="button-confirm-delete"
              >
                {deleteProductMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </VendorDashboard>
  );
}
