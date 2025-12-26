import { VendorDashboard } from "./VendorDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Package as PackageIcon, Power, Layers, Tag, Calendar, Wand2, X } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
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
import { useState, useRef, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { normalizeImagePath } from "@/lib/utils/image";
import ProductForm from "@/components/vendor/ProductForm";
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
import { cn } from "@/lib/utils";
import type { Offer } from "@shared/schema";


// Legacy StableFocusInput/StableFocusTextarea removed; new form lives in '@/components/vendor/ProductForm'

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
  isActive: boolean;
  createdAt: string;
  category: string;
  variants: string | null;
};

type ProductGroup = {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  createdAt: string;
};

 

type Category = {
  id: string;
  district: string;
  giBrand: string;
  crafts: string[];
};

type ProductCategory = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  createdAt?: string;
};

// Product form schema removed; see '@/components/vendor/ProductForm'

const groupFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

export default function VendorProducts() {
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState("products");
  const [activeTab, setActiveTab] = useState("all");
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [addOfferDialogOpen, setAddOfferDialogOpen] = useState(false);



  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false);
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ProductGroup | null>(null);



  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ['/api/vendor/stores'],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  const { data: vendorProducts = [], isLoading } = useQuery<Product[]>({
    queryKey: ['/api/vendor/products'],
  });

  const { data: productGroups = [], isLoading: groupsLoading } = useQuery<ProductGroup[]>({
    queryKey: ['/api/vendor/groups'],
  });



  const { data: adminProductCategories = [] } = useQuery<ProductCategory[]>({
    queryKey: ['/api/product-categories'],
  });

  const store = stores[0];

  const filteredProducts = vendorProducts.filter(p => {
    if (activeTab === "all") return true;
    return p.status === activeTab;
  });

  const { data: offersData } = useQuery<{ offers: Offer[]; total: number }>({
    queryKey: ['/api/vendor/offers', { storeId: store?.id, page: 1, pageSize: 100 }],
    enabled: !!store?.id,
  });
  const offers = offersData?.offers || [];

  const offerFormSchema = z.object({
    name: z.string().min(3),
    description: z.string().optional(),
    discountType: z.enum(['percentage', 'fixed']),
    discountValue: z.string().min(1),
    startAt: z.string().min(1),
    endAt: z.string().min(1),
    scopeType: z.enum(['all', 'products', 'categories']),
    scopeProducts: z.array(z.string()).optional(),
    scopeCategories: z.array(z.string()).optional(),
    isActive: z.boolean().default(true),
    badgeText: z.string().optional(),
  });
  type OfferFormValues = z.infer<typeof offerFormSchema>;
  const [offerScopeProducts, setOfferScopeProducts] = useState<string[]>([]);
  const [offerScopeCategories, setOfferScopeCategories] = useState<string[]>([]);
  const [offerDiscountType, setOfferDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [offerScopeType, setOfferScopeType] = useState<'all' | 'products' | 'categories'>('products');
  const [offerActive, setOfferActive] = useState<boolean>(true);
  const [offerName, setOfferName] = useState<string>("");
  const [offerDescription, setOfferDescription] = useState<string>("");
  const [offerValue, setOfferValue] = useState<string>("");
  const [offerBadgeText, setOfferBadgeText] = useState<string>("");
  const [offerStartAt, setOfferStartAt] = useState<string>("");
  const [offerEndAt, setOfferEndAt] = useState<string>("");

  const createOfferMutation = useMutation({
    mutationFn: async (payload: OfferFormValues) => {
      const data = {
        ...payload,
        storeId: store?.id,
        discountValue: String(payload.discountValue),
        scopeProducts: payload.scopeType === 'products' ? offerScopeProducts : undefined,
        scopeCategories: payload.scopeType === 'categories' ? offerScopeCategories : undefined,
      };
      return apiRequest('POST', '/api/vendor/offers', data);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/offers'] });
      setAddOfferDialogOpen(false);
      setOfferScopeProducts([]);
      setOfferScopeCategories([]);
      setOfferDiscountType('percentage');
      setOfferScopeType('products');
      setOfferActive(true);
      setOfferName("");
      setOfferDescription("");
      setOfferValue("");
      setOfferBadgeText("");
      setOfferStartAt("");
      setOfferEndAt("");
      toast({ title: 'Offer created', description: 'Promotion has been created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const deleteOfferMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/vendor/offers/${id}`, {});
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/offers'] });
      toast({ title: 'Offer deleted', description: 'Promotion has been removed' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  const toggleOfferActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest('PATCH', `/api/vendor/offers/${id}`, { isActive });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/offers'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

 







  const groupForm = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

  const editGroupForm = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
  });









  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest('DELETE', `/api/vendor/products/${id}`, {});
      return res;
    },
    onSuccess: async (res: Response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/analytics'] });
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
      if (res.status === 204) {
        toast({ title: 'Product deleted', description: 'Your product has been permanently removed' });
      } else if (res.status === 200) {
        try {
          const updated = await res.json();
          if (updated && updated.isActive === false) {
            toast({ title: 'Product archived', description: 'Product is linked to orders and was archived instead' });
          } else {
            toast({ title: 'Product updated', description: 'Product state changed' });
          }
        } catch {
          toast({ title: 'Product updated', description: 'Product state changed' });
        }
      } else {
        toast({ title: 'Product updated', description: 'Operation completed' });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiRequest('PATCH', `/api/vendor/products/${id}/toggle-active`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/products'] });
      toast({
        title: "Product updated",
        description: "Product visibility has been toggled",
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

  const createGroupMutation = useMutation({
    mutationFn: async (data: GroupFormValues) => {
      return apiRequest('POST', '/api/vendor/groups', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/groups'] });
      setGroupDialogOpen(false);
      groupForm.reset();
      toast({
        title: "Group created",
        description: "Product group has been created successfully",
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

  const updateGroupMutation = useMutation({
    mutationFn: async (data: GroupFormValues & { id: string }) => {
      const { id, ...updateData } = data;
      return apiRequest('PATCH', `/api/vendor/groups/${id}`, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/groups'] });
      setEditGroupDialogOpen(false);
      setSelectedGroup(null);
      toast({
        title: "Group updated",
        description: "Product group has been updated successfully",
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

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/vendor/groups/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/groups'] });
      setDeleteGroupDialogOpen(false);
      setSelectedGroup(null);
      toast({
        title: "Group deleted",
        description: "Product group has been removed",
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
    setEditDialogOpen(true);
  };

  const handleDialogClose = (dialogType: 'add' | 'edit') => {
    if (dialogType === 'add') {
      setAddProductDialogOpen(false);
    } else {
      setEditDialogOpen(false);
      setSelectedProduct(null);
    }
  };



  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };

  // Image upload handled inside ProductForm component

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

  // Legacy ProductFormFields removed; new implementation in '@/components/vendor/ProductForm'

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
            <h1 className="text-3xl font-bold" data-testid="heading-products">Products & Groups</h1>
            <p className="text-muted-foreground">Manage your catalog and groups</p>
          </div>
          {mainTab === "products" && (
            <div className="flex space-x-2">
              <Dialog open={addProductDialogOpen} onOpenChange={(open) => {
                setAddProductDialogOpen(open);
                if (!open) handleDialogClose('add');
              }}>
                <DialogTrigger asChild>
                  <Button variant="default" data-testid="button-add-product">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogDescription>
                      Create a new product for your store catalog
                    </DialogDescription>
                  </DialogHeader>
                  <ProductForm
                    mode="create"
                    store={store}
                    categories={categories}
                    productCategories={adminProductCategories}
                    submitText="Create Product"
                    onCancel={() => setAddProductDialogOpen(false)}
                    onSuccess={() => setAddProductDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}
          {mainTab === "groups" && (
            <Button onClick={() => setGroupDialogOpen(true)} data-testid="button-add-group">
              <Plus className="w-4 h-4 mr-2" />
              Create Group
            </Button>
          )}

        </div>

        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList>
            <TabsTrigger value="products" data-testid="tab-main-products">
              <PackageIcon className="w-4 h-4 mr-2" />
              Products
            </TabsTrigger>
            <TabsTrigger value="groups" data-testid="tab-main-groups">
              <Layers className="w-4 h-4 mr-2" />
              Groups
            </TabsTrigger>
            <TabsTrigger value="promotions" data-testid="tab-main-promotions">
              <Tag className="w-4 h-4 mr-2" />
              Promotions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-6">
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
                  <Card>
                    <div className="overflow-x-auto">
                      <Table className="min-w-[900px]">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-20">Image</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Active</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProducts.map((product) => (
                            <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                              <TableCell>
                                <div className="w-16 h-16 rounded bg-muted overflow-hidden">
                                  {product.images[0] && (
                                    <img
                                      src={normalizeImagePath(product.images[0])}
                                      alt={product.title}
                                      className="w-full h-full object-cover"
                                      data-testid={`img-product-${product.id}`}
                                    />
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <p className="font-medium" data-testid={`text-product-title-${product.id}`}>
                                    {product.title}
                                  </p>
                                  <p className="text-sm text-muted-foreground line-clamp-1">
                                    {product.description}
                                  </p>
                                  <Badge variant="outline" className="text-xs" data-testid={`badge-product-gi-${product.id}`}>
                                    {product.giBrand}
                                  </Badge>
                                  {(() => {
                                    try {
                                      const variants = product.variants ? (typeof product.variants === 'string' ? JSON.parse(product.variants) : product.variants) : [];
                                      if (variants.length > 0) {
                                        return (
                                          <Badge variant="secondary" className="text-xs ml-2">
                                            {variants.length} Variants
                                          </Badge>
                                        );
                                      }
                                    } catch (e) { }
                                    return null;
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell>
                                {product.category || "Other"}
                              </TableCell>
                              <TableCell>
                                <span className="font-semibold" data-testid={`text-product-price-${product.id}`}>
                                  PKR {parseFloat(product.price).toLocaleString()}
                                </span>
                              </TableCell>
                              <TableCell data-testid={`text-product-stock-${product.id}`}>
                                {product.stock} units
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(product.status)}
                              </TableCell>
                              <TableCell>
                                <Switch
                                  checked={product.isActive}
                                  onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: product.id, isActive: checked })}
                                  disabled={toggleActiveMutation.isPending}
                                  data-testid={`switch-active-${product.id}`}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditProduct(product)}
                                    data-testid={`button-edit-product-${product.id}`}
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDeleteProduct(product)}
                                    data-testid={`button-delete-product-${product.id}`}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                )}
          </TabsContent>
          <TabsContent value="promotions" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Discounts & Promotions</h2>
                <p className="text-muted-foreground">Create and manage your store offers</p>
              </div>
              <Dialog open={addOfferDialogOpen} onOpenChange={setAddOfferDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" data-testid="button-add-offer">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Offer
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Offer</DialogTitle>
                    <DialogDescription>Configure discount details and scope</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <FormLabel>Name</FormLabel>
                        <Input value={offerName} onChange={(e) => setOfferName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <FormLabel>Badge Text</FormLabel>
                        <Input value={offerBadgeText} onChange={(e) => setOfferBadgeText(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <FormLabel>Description</FormLabel>
                      <Textarea value={offerDescription} onChange={(e) => setOfferDescription(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <FormLabel>Type</FormLabel>
                        <Select value={offerDiscountType} onValueChange={(v: any) => setOfferDiscountType(v)}>
                          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage</SelectItem>
                            <SelectItem value="fixed">Fixed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <FormLabel>Value</FormLabel>
                        <Input value={offerValue} onChange={(e) => setOfferValue(e.target.value)} placeholder={offerDiscountType === 'percentage' ? 'e.g., 10' : 'e.g., 500'} />
                      </div>
                      <div className="space-y-2">
                        <FormLabel>Active</FormLabel>
                        <Switch checked={offerActive} onCheckedChange={setOfferActive} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <FormLabel>Start</FormLabel>
                        <Input type="datetime-local" value={offerStartAt} onChange={(e) => setOfferStartAt(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <FormLabel>End</FormLabel>
                        <Input type="datetime-local" value={offerEndAt} onChange={(e) => setOfferEndAt(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <FormLabel>Scope</FormLabel>
                        <Select value={offerScopeType} onValueChange={(v: any) => setOfferScopeType(v)}>
                          <SelectTrigger><SelectValue placeholder="Select scope" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="products">Products</SelectItem>
                            <SelectItem value="categories">Categories</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {offerScopeType === 'products' && (
                        <div className="md:col-span-2 space-y-2">
                          <FormLabel>Products</FormLabel>
                          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                            {vendorProducts.map((p) => (
                              <label key={p.id} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={offerScopeProducts.includes(p.id)}
                                  onCheckedChange={(checked) => {
                                    setOfferScopeProducts((prev) => {
                                      const set = new Set(prev);
                                      if (checked) set.add(p.id); else set.delete(p.id);
                                      return Array.from(set);
                                    });
                                  }}
                                />
                                <span className="line-clamp-1">{p.title}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                      {offerScopeType === 'categories' && (
                        <div className="md:col-span-2 space-y-2">
                          <FormLabel>Categories</FormLabel>
                          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto border rounded p-2">
                            {adminProductCategories.map((c) => (
                              <label key={c.id} className="flex items-center gap-2 text-sm">
                                <Checkbox
                                  checked={offerScopeCategories.includes(c.name)}
                                  onCheckedChange={(checked) => {
                                    setOfferScopeCategories((prev) => {
                                      const set = new Set(prev);
                                      if (checked) set.add(c.name); else set.delete(c.name);
                                      return Array.from(set);
                                    });
                                  }}
                                />
                                <span className="line-clamp-1">{c.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => {
                        const payload: OfferFormValues = {
                          name: offerName,
                          description: offerDescription || undefined,
                          discountType: offerDiscountType,
                          discountValue: offerValue,
                          startAt: offerStartAt,
                          endAt: offerEndAt,
                          scopeType: offerScopeType,
                          scopeProducts: offerScopeType === 'products' ? offerScopeProducts : undefined,
                          scopeCategories: offerScopeType === 'categories' ? offerScopeCategories : undefined,
                          isActive: offerActive,
                          badgeText: offerBadgeText || undefined,
                        };
                        createOfferMutation.mutate(payload);
                      }}
                      disabled={!offerName || !offerValue || !offerStartAt || !offerEndAt}
                      data-testid="button-submit-offer"
                    >
                      Create Offer
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <Card>
              <div className="overflow-x-auto">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Window</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <p className="text-sm text-muted-foreground">No offers yet</p>
                        </TableCell>
                      </TableRow>
                    ) : offers.map((o) => {
                      const t = String(o.discountType || '').toLowerCase();
                      const val = t === 'fixed' ? `PKR ${Number(o.discountValue).toLocaleString()}` : `${Number(o.discountValue)}%`;
                      const s = String(o.scopeType || '').toLowerCase();
                      const scopeLabel =
                        s === 'all'
                          ? 'All'
                          : s === 'products'
                            ? `Products (${Array.isArray(o.scopeProducts) ? o.scopeProducts.length : 0})`
                            : s === 'categories'
                              ? `Categories (${Array.isArray(o.scopeCategories) ? o.scopeCategories.length : 0})`
                              : s;
                      const start = o.startAt ? new Date(o.startAt) : null;
                      const end = o.endAt ? new Date(o.endAt) : null;
                      const windowLabel = start && end ? `${start.toLocaleDateString()} – ${end.toLocaleDateString()}` : '';
                      return (
                        <TableRow key={o.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-medium">{o.name}</p>
                              {o.badgeText ? <Badge variant="secondary" className="text-xs">{o.badgeText}</Badge> : null}
                            </div>
                          </TableCell>
                          <TableCell>{t}</TableCell>
                          <TableCell>{val}</TableCell>
                          <TableCell>{scopeLabel}</TableCell>
                          <TableCell>{windowLabel}</TableCell>
                          <TableCell>
                            <Switch
                              checked={!!o.isActive}
                              onCheckedChange={(checked) => toggleOfferActiveMutation.mutate({ id: o.id, isActive: checked })}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteOfferMutation.mutate(o.id)}
                                data-testid={`button-delete-offer-${o.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
          </TabsContent>

          <TabsContent value="groups" className="mt-6">
            {groupsLoading ? (
              <p className="text-muted-foreground">Loading groups...</p>
            ) : productGroups.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    No Product Groups
                  </CardTitle>
                  <CardDescription>You haven't created any product groups yet</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Click "Create Group" to organize your products into collections.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table className="min-w-[700px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productGroups.map((group) => (
                        <TableRow key={group.id} data-testid={`row-group-${group.id}`}>
                          <TableCell className="font-medium" data-testid={`text-group-name-${group.id}`}>
                            {group.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {group.description}
                          </TableCell>
                          <TableCell>{new Date(group.createdAt).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedGroup(group);
                                  editGroupForm.reset({ name: group.name, description: group.description || "" });
                                  setEditGroupDialogOpen(true);
                                }}
                                data-testid={`button-edit-group-${group.id}`}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  setSelectedGroup(group);
                                  setDeleteGroupDialogOpen(true);
                                }}
                                data-testid={`button-delete-group-${group.id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
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
            {selectedProduct && (
              <ProductForm
                mode="edit"
                store={store}
                categories={categories}
                product={selectedProduct}
                onCancel={() => setEditDialogOpen(false)}
                onSuccess={() => handleDialogClose('edit')}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Product Confirmation Dialog */}
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

        {/* Create Group Dialog */}
        <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Product Group</DialogTitle>
              <DialogDescription>Create a collection of related products</DialogDescription>
            </DialogHeader>
            <Form {...groupForm}>
              <form onSubmit={groupForm.handleSubmit((data) => createGroupMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={groupForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Summer Collection" {...field} data-testid="input-group-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={groupForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe this product group..." {...field} data-testid="input-group-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setGroupDialogOpen(false)} data-testid="button-cancel-group">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createGroupMutation.isPending} data-testid="button-submit-group">
                    {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Group Dialog */}
        <Dialog open={editGroupDialogOpen} onOpenChange={setEditGroupDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Product Group</DialogTitle>
              <DialogDescription>Update group details</DialogDescription>
            </DialogHeader>
            <Form {...editGroupForm}>
              <form onSubmit={editGroupForm.handleSubmit((data) => selectedGroup && updateGroupMutation.mutate({ ...data, id: selectedGroup.id }))} className="space-y-4">
                <FormField
                  control={editGroupForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-group-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editGroupForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-edit-group-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditGroupDialogOpen(false)} data-testid="button-cancel-edit-group">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateGroupMutation.isPending} data-testid="button-submit-edit-group">
                    {updateGroupMutation.isPending ? "Updating..." : "Update Group"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Group Confirmation */}
        <AlertDialog open={deleteGroupDialogOpen} onOpenChange={setDeleteGroupDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Group</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedGroup?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-group">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedGroup && deleteGroupMutation.mutate(selectedGroup.id)}
                className="bg-destructive text-destructive-foreground hover-elevate active-elevate-2"
                data-testid="button-confirm-delete-group"
              >
                {deleteGroupMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>



      </div>
    </VendorDashboard>
  );
}
