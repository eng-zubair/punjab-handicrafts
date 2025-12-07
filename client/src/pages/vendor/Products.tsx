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

type Promotion = {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  type: 'percentage' | 'fixed' | 'buy-one-get-one';
  value: string;
  minQuantity: number | null;
  appliesTo: 'all' | 'product' | 'group';
  targetId: string | null;
  startAt: string | null;
  endAt: string | null;
  status: 'active' | 'scheduled' | 'expired';
  createdAt: string;
};

type PromotionWithStats = Promotion & {
  productCount?: number;
  lastAddedAt?: string | null;
  lastRemovedAt?: string | null;
};

type PromotionProductWithPromotion = {
  id: string;
  promotionId: string;
  productId: string;
  overridePrice: string | null;
  quantityLimit: number;
  conditions?: any;
  createdAt: string;
  promotion: Promotion;
  isActive: boolean;
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

const promotionFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  type: z.enum(['percentage', 'fixed', 'buy-one-get-one']),
  value: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Value must be a positive number"),
  minQuantity: z.string().optional(),
  appliesTo: z.enum(['all', 'product', 'group']),
  targetId: z.string().optional(),
  startAt: z.date().optional(),
  endAt: z.date().optional(),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;
type PromotionFormValues = z.infer<typeof promotionFormSchema>;

export default function VendorProducts() {
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState("products");
  const [activeTab, setActiveTab] = useState("all");
  const [addProductDialogOpen, setAddProductDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false);
  const [deleteGroupDialogOpen, setDeleteGroupDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ProductGroup | null>(null);

  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [editPromotionDialogOpen, setEditPromotionDialogOpen] = useState(false);
  const [deletePromotionDialogOpen, setDeletePromotionDialogOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);

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

  const { data: promotions = [], isLoading: promotionsLoading } = useQuery<PromotionWithStats[]>({
    queryKey: ['/api/vendor/promotions'],
  });

  const { data: promotionProducts = [] } = useQuery<PromotionProductWithPromotion[]>({
    queryKey: ['/api/vendor/promotion-products'],
  });

  const { data: adminProductCategories = [] } = useQuery<ProductCategory[]>({
    queryKey: ['/api/product-categories'],
  });

  const store = stores[0];
  const [attachDialogOpen, setAttachDialogOpen] = useState(false);
  const [selectedAttachPromotion, setSelectedAttachPromotion] = useState<Promotion | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [filterApprovedOnly, setFilterApprovedOnly] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectionDetails, setSelectionDetails] = useState<Record<string, { quantityLimit: number; overridePrice?: string }>>({});

  const filteredAttachProducts = vendorProducts.filter(p => {
    const matchesSearch = productSearch.trim().length === 0 || p.title.toLowerCase().includes(productSearch.toLowerCase());
    const statusOk = !filterApprovedOnly || p.status === 'approved';
    return matchesSearch && statusOk && p.storeId === store?.id;
  });

  const toggleSelectedProduct = (id: string, checked: boolean) => {
    setSelectedProductIds(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
    setSelectionDetails(prev => {
      if (!checked) {
        const { [id]: _, ...rest } = prev as any;
        return rest;
      }
      const current = prev[id] || { quantityLimit: 0 };
      let overridePrice = current.overridePrice;
      const p = vendorProducts.find(x => x.id === id);
      if (p && selectedAttachPromotion && selectedAttachPromotion.type === 'percentage') {
        const priceNum = parseFloat(String(p.price));
        const pct = parseFloat(String(selectedAttachPromotion.value));
        const discounted = Math.max(0, priceNum * (100 - pct) / 100);
        overridePrice = discounted.toFixed(2);
      }
      return { ...prev, [id]: { quantityLimit: current.quantityLimit, overridePrice } };
    });
  };

  const updateSelectionDetail = (id: string, field: 'quantityLimit' | 'overridePrice', value: string) => {
    setSelectionDetails(prev => ({
      ...prev,
      [id]: {
        quantityLimit: field === 'quantityLimit' ? Math.max(0, parseInt(value || '0')) : (prev[id]?.quantityLimit || 0),
        overridePrice: field === 'overridePrice' ? (value || undefined) : prev[id]?.overridePrice,
      }
    }));
  };

  const addProductsToPromotionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAttachPromotion) throw new Error('No promotion selected');
      const items = selectedProductIds.map(pid => ({
        productId: pid,
        quantityLimit: selectionDetails[pid]?.quantityLimit || 0,
        overridePrice: selectionDetails[pid]?.overridePrice || undefined,
      }));
      return apiRequest('POST', `/api/vendor/promotions/${selectedAttachPromotion.id}/products/bulk`, { items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/promotions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/promotion-products'] });
      setAttachDialogOpen(false);
      setSelectedAttachPromotion(null);
      setSelectedProductIds([]);
      setSelectionDetails({});
      setProductSearch("");
      toast({ title: 'Products added', description: 'Selected products have been added to the promotion' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  });
  
  const filteredProducts = vendorProducts.filter(p => {
    if (activeTab === "all") return true;
    return p.status === activeTab;
  });

  const [promotionFilter, setPromotionFilter] = useState<'all' | 'in' | 'out'>('all');

  const activePromosByProduct = new Map<string, PromotionProductWithPromotion[]>();
  for (const pp of promotionProducts) {
    if (pp.isActive) {
      const arr = activePromosByProduct.get(pp.productId) || [];
      arr.push(pp);
      activePromosByProduct.set(pp.productId, arr);
    }
  }

  const filteredByPromotion = filteredProducts.filter(p => {
    if (promotionFilter === 'all') return true;
    const hasActive = (activePromosByProduct.get(p.id) || []).length > 0;
    return promotionFilter === 'in' ? hasActive : !hasActive;
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

  const promotionForm = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "percentage",
      value: "",
      appliesTo: "all",
    },
  });

  const editPromotionForm = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionFormSchema),
  });

  

  

  

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/vendor/products/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/products'] });
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

  const createPromotionMutation = useMutation({
    mutationFn: async (data: PromotionFormValues) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        type: data.type,
        value: data.value,
        minQuantity: data.minQuantity ? parseInt(data.minQuantity) : null,
        appliesTo: data.appliesTo,
        targetId: data.targetId || null,
        startAt: data.startAt ? data.startAt.toISOString() : null,
        endAt: data.endAt ? data.endAt.toISOString() : null,
      };
      return apiRequest('POST', '/api/vendor/promotions', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/promotions'] });
      setPromotionDialogOpen(false);
      promotionForm.reset();
      toast({
        title: "Promotion created",
        description: "Promotion has been created successfully",
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

  const updatePromotionMutation = useMutation({
    mutationFn: async (data: PromotionFormValues & { id: string }) => {
      const { id, ...updateData } = data;
      const payload = {
        name: updateData.name,
        description: updateData.description || null,
        type: updateData.type,
        value: updateData.value,
        minQuantity: updateData.minQuantity ? parseInt(updateData.minQuantity) : null,
        appliesTo: updateData.appliesTo,
        targetId: updateData.targetId || null,
        startAt: updateData.startAt ? updateData.startAt.toISOString() : null,
        endAt: updateData.endAt ? updateData.endAt.toISOString() : null,
      };
      return apiRequest('PATCH', `/api/vendor/promotions/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/promotions'] });
      setEditPromotionDialogOpen(false);
      setSelectedPromotion(null);
      toast({
        title: "Promotion updated",
        description: "Promotion has been updated successfully",
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

  const deletePromotionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest('DELETE', `/api/vendor/promotions/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/promotions'] });
      setDeletePromotionDialogOpen(false);
      setSelectedPromotion(null);
      toast({
        title: "Promotion deleted",
        description: "Promotion has been removed",
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
            <h1 className="text-3xl font-bold" data-testid="heading-products">Products & Promotions</h1>
            <p className="text-muted-foreground">Manage your catalog, groups, and promotions</p>
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
          {mainTab === "promotions" && (
            <Button onClick={() => setPromotionDialogOpen(true)} data-testid="button-add-promotion">
              <Plus className="w-4 h-4 mr-2" />
              Create Promotion
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
            ) : filteredByPromotion.length === 0 ? (
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
                <div className="flex items-center justify-end px-4 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Promotion</span>
                    <Select value={promotionFilter} onValueChange={(v) => setPromotionFilter(v as any)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="in">In Promotion</SelectItem>
                        <SelectItem value="out">Not In Promotion</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
                      <TableHead>Promotion</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredByPromotion.map((product) => (
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
                              } catch (e) {}
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
                          {(() => {
                            const aps = activePromosByProduct.get(product.id) || [];
                            if (aps.length === 0) {
                              return <Badge variant="secondary">None</Badge>;
                            }
                            const p = aps[0].promotion;
                            const label = p.type === 'percentage' ? `${p.value}% off` : p.type === 'fixed' ? `PKR ${p.value} off` : 'BOGO';
                            const ends = p.endAt ? new Date(p.endAt).getTime() : null;
                            let countdown = '';
                            if (ends) {
                              const diff = Math.max(0, ends - Date.now());
                              const d = Math.floor(diff / (1000 * 60 * 60 * 24));
                              const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                              countdown = d > 0 ? `${d}d ${h}h` : `${h}h`;
                            }
                            return (
                              <div className="flex items-center gap-2">
                                <Badge>{label}</Badge>
                                {countdown && <span className="text-xs text-muted-foreground">ends in {countdown}</span>}
                              </div>
                            );
                          })()}
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

          <TabsContent value="promotions" className="mt-6">
            {promotionsLoading ? (
              <p className="text-muted-foreground">Loading promotions...</p>
            ) : promotions.length === 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    No Promotions
                  </CardTitle>
                  <CardDescription>You haven't created any promotions yet</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Click "Create Promotion" to add discounts and deals to your products.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Applies To</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Products</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promotions.map((promo) => (
                      <TableRow key={promo.id} data-testid={`row-promotion-${promo.id}`}>
                        <TableCell className="font-medium" data-testid={`text-promotion-name-${promo.id}`}>
                          {promo.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {promo.type === 'percentage' ? 'Percentage' : promo.type === 'fixed' ? 'Fixed' : 'BOGO'}
                          </Badge>
                        </TableCell>
                        <TableCell>{promo.type === 'percentage' ? `${promo.value}%` : `PKR ${promo.value}`}</TableCell>
                        <TableCell className="capitalize">{promo.appliesTo}</TableCell>
                        <TableCell>
                          <Badge variant={promo.status === 'active' ? 'default' : 'secondary'}>
                            {promo.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{promo.productCount || 0}</span>
                            <span className="text-xs text-muted-foreground">
                              {promo.lastAddedAt ? new Date(promo.lastAddedAt).toLocaleDateString() : ''}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => { setSelectedAttachPromotion(promo); setAttachDialogOpen(true); }}
                              data-testid={`button-attach-products-${promo.id}`}
                            >
                              Add Products
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPromotion(promo);
                                editPromotionForm.reset({
                                  name: promo.name,
                                  description: promo.description || "",
                                  type: promo.type,
                                  value: promo.value,
                                  minQuantity: promo.minQuantity?.toString() || "",
                                  appliesTo: promo.appliesTo,
                                  targetId: promo.targetId || "",
                                  startAt: promo.startAt ? new Date(promo.startAt) : undefined,
                                  endAt: promo.endAt ? new Date(promo.endAt) : undefined,
                                });
                                setEditPromotionDialogOpen(true);
                              }}
                              data-testid={`button-edit-promotion-${promo.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedPromotion(promo);
                                setDeletePromotionDialogOpen(true);
                              }}
                              data-testid={`button-delete-promotion-${promo.id}`}
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

        {/* Create Promotion Dialog */}
        <Dialog open={promotionDialogOpen} onOpenChange={setPromotionDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Promotion</DialogTitle>
              <DialogDescription>Create a discount or deal for your products</DialogDescription>
            </DialogHeader>
            <Form {...promotionForm}>
              <form onSubmit={promotionForm.handleSubmit((data) => createPromotionMutation.mutate(data))} className="space-y-4">
                <FormField
                  control={promotionForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Promotion Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Summer Sale" {...field} data-testid="input-promotion-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={promotionForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe this promotion..." {...field} data-testid="input-promotion-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={promotionForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-promotion-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage Off</SelectItem>
                            <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                            <SelectItem value="buy-one-get-one">Buy One Get One</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={promotionForm.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Value</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="20" {...field} data-testid="input-promotion-value" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={promotionForm.control}
                  name="appliesTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Applies To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-promotion-applies-to">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Products</SelectItem>
                          <SelectItem value="product">Specific Product</SelectItem>
                          <SelectItem value="group">Product Group</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setPromotionDialogOpen(false)} data-testid="button-cancel-promotion">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPromotionMutation.isPending} data-testid="button-submit-promotion">
                    {createPromotionMutation.isPending ? "Creating..." : "Create Promotion"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Promotion Dialog */}
        <Dialog open={editPromotionDialogOpen} onOpenChange={setEditPromotionDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Promotion</DialogTitle>
              <DialogDescription>Update promotion details</DialogDescription>
            </DialogHeader>
            <Form {...editPromotionForm}>
              <form onSubmit={editPromotionForm.handleSubmit((data) => selectedPromotion && updatePromotionMutation.mutate({ ...data, id: selectedPromotion.id }))} className="space-y-4">
                <FormField
                  control={editPromotionForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Promotion Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-edit-promotion-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editPromotionForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} data-testid="input-edit-promotion-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editPromotionForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-promotion-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percentage">Percentage Off</SelectItem>
                            <SelectItem value="fixed">Fixed Amount Off</SelectItem>
                            <SelectItem value="buy-one-get-one">Buy One Get One</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editPromotionForm.control}
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Value</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} data-testid="input-edit-promotion-value" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={editPromotionForm.control}
                  name="appliesTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Applies To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-edit-promotion-applies-to">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">All Products</SelectItem>
                          <SelectItem value="product">Specific Product</SelectItem>
                          <SelectItem value="group">Product Group</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setEditPromotionDialogOpen(false)} data-testid="button-cancel-edit-promotion">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updatePromotionMutation.isPending} data-testid="button-submit-edit-promotion">
                    {updatePromotionMutation.isPending ? "Updating..." : "Update Promotion"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Promotion Confirmation */}
        <AlertDialog open={deletePromotionDialogOpen} onOpenChange={setDeletePromotionDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Promotion</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedPromotion?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete-promotion">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => selectedPromotion && deletePromotionMutation.mutate(selectedPromotion.id)}
                className="bg-destructive text-destructive-foreground hover-elevate active-elevate-2"
                data-testid="button-confirm-delete-promotion"
              >
                {deletePromotionMutation.isPending ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Attach Products to Promotion Dialog */}
        <Dialog open={attachDialogOpen} onOpenChange={setAttachDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Products to Promotion</DialogTitle>
              <DialogDescription>Select products and configure per-product options</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Input placeholder="Search products" value={productSearch} onChange={(e) => setProductSearch(e.target.value)} data-testid="input-search-products" />
                  <div className="flex items-center gap-2">
                    <Checkbox id="approved-only" checked={filterApprovedOnly} onCheckedChange={(v) => setFilterApprovedOnly(Boolean(v))} />
                    <label htmlFor="approved-only" className="text-sm">Approved only</label>
                  </div>
                </div>
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[64px]" />
                        <TableHead className="w-10" />
                        <TableHead>Product</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAttachProducts.map(p => {
                        const invalid = p.stock <= 0 || p.status !== 'approved';
                        const checked = selectedProductIds.includes(p.id);
                        return (
                          <TableRow key={p.id} className={cn({ 'opacity-60': invalid })}>
                            <TableCell>
                              <img
                                src={normalizeImagePath(p.images?.[0] || '')}
                                alt={p.title}
                                className="h-12 w-12 object-cover rounded bg-muted"
                              />
                            </TableCell>
                            <TableCell>
                              <Checkbox
                                checked={checked}
                                disabled={invalid}
                                onCheckedChange={(v) => toggleSelectedProduct(p.id, Boolean(v))}
                                data-testid={`checkbox-select-product-${p.id}`}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="font-medium">{p.title}</p>
                                <Badge variant="outline" className="text-xs">{p.giBrand}</Badge>
                              </div>
                            </TableCell>
                            <TableCell>{p.stock}</TableCell>
                            <TableCell>
                              <Badge variant={p.status === 'approved' ? 'default' : 'secondary'}>{p.status}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Selected Products</CardTitle>
                    <CardDescription>Configure per-product options</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedProductIds.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No products selected</p>
                    ) : (
                      <div className="space-y-4">
                        {selectedProductIds.map(pid => {
                          const p = vendorProducts.find(x => x.id === pid)!;
                          const s = selectionDetails[pid] || { quantityLimit: 0 };
                          return (
                            <div key={pid} className="border rounded p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{p.title}</p>
                                  <p className="text-xs text-muted-foreground">Stock: {p.stock}</p>
                                </div>
                                <Button size="sm" variant="destructive" onClick={() => toggleSelectedProduct(pid, false)} data-testid={`button-remove-selected-${pid}`}>Remove</Button>
                              </div>
                              <div className="grid grid-cols-2 gap-3 mt-3">
                                <div>
                                  <label className="text-sm">Quantity Limit</label>
                                  <Input type="number" min={0} value={s.quantityLimit} onChange={(e) => updateSelectionDetail(pid, 'quantityLimit', e.target.value)} data-testid={`input-quantity-limit-${pid}`} />
                                </div>
                                <div>
                                  <label className="text-sm">Override Price (PKR)</label>
                                  <Input type="number" min={0} value={s.overridePrice || ''} onChange={(e) => updateSelectionDetail(pid, 'overridePrice', e.target.value)} data-testid={`input-override-price-${pid}`} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAttachDialogOpen(false)} data-testid="button-cancel-attach">Cancel</Button>
              <Button onClick={() => addProductsToPromotionMutation.mutate()} disabled={addProductsToPromotionMutation.isPending || selectedProductIds.length === 0} data-testid="button-submit-attach">
                {addProductsToPromotionMutation.isPending ? 'Adding...' : 'Add to Promotion'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
      </div>
    </VendorDashboard>
  );
}
