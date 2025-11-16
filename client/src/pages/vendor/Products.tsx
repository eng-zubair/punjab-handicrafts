import { VendorDashboard } from "./VendorDashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Package as PackageIcon, Power, Layers, Tag, Calendar, Wand2 } from "lucide-react";
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

const StableFocusInput = ({ 
  field, 
  type = 'text', 
  placeholder, 
  className,
  onFocus,
  onBlur,
  ...props 
}: any) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [hasFocus, setHasFocus] = useState(false);

  useEffect(() => {
    if (hasFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [hasFocus]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setHasFocus(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setHasFocus(false);
    if (onBlur) onBlur(e);
    if (field?.onBlur) field.onBlur(e);
  };

  const setRef = (el: HTMLInputElement | null) => {
    inputRef.current = el;
    if (typeof field?.ref === 'function') {
      field.ref(el);
    }
  };

  return (
    <Input
      ref={setRef}
      type={type}
      placeholder={placeholder}
      className={cn('transition-all duration-200', className, {
        'ring-2 ring-primary ring-offset-2': hasFocus,
      })}
      name={field?.name}
      value={field?.value}
      onChange={field?.onChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    />
  );
};

const StableFocusTextarea = ({ 
  field, 
  placeholder, 
  className,
  onFocus,
  onBlur,
  ...props 
}: any) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [hasFocus, setHasFocus] = useState(false);

  useEffect(() => {
    if (hasFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [hasFocus]);

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setHasFocus(true);
    if (onFocus) onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setHasFocus(false);
    if (onBlur) onBlur(e);
    if (field?.onBlur) field.onBlur(e);
  };

  const setRef = (el: HTMLTextAreaElement | null) => {
    textareaRef.current = el;
    if (typeof field?.ref === 'function') {
      field.ref(el);
    }
  };

  return (
    <Textarea
      ref={setRef}
      placeholder={placeholder}
      className={cn('transition-all duration-200', className, {
        'ring-2 ring-primary ring-offset-2': hasFocus,
      })}
      name={field?.name}
      value={field?.value}
      onChange={field?.onChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    />
  );
};

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

type ProductFormValues = z.infer<typeof productFormSchema>;
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
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  

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

  const { data: promotions = [], isLoading: promotionsLoading } = useQuery<Promotion[]>({
    queryKey: ['/api/vendor/promotions'],
  });

  const store = stores[0];
  
  const filteredProducts = vendorProducts.filter(p => {
    if (activeTab === "all") return true;
    return p.status === activeTab;
  });

  

  const editForm = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
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

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormValues) => {
      if (!store) throw new Error("No store found");
      if (uploadedImages.length === 0) {
        throw new Error("Please upload at least one image");
      }
      return apiRequest('POST', '/api/products', {
        ...data,
        storeId: store.id,
        price: data.price,
        stock: parseInt(data.stock),
        images: uploadedImages,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/analytics'] });
      setAddProductDialogOpen(false);
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
      return apiRequest('PATCH', `/api/vendor/products/${id}`, {
        ...updateData,
        price: updateData.price,
        stock: parseInt(updateData.stock),
        images,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vendor/products'] });
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
    mutationFn: async (id: string) => {
      return apiRequest('PATCH', `/api/vendor/products/${id}/toggle-active`, {});
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
      setAddProductDialogOpen(false);
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
              <StableFocusInput
                field={field}
                placeholder="Handwoven Basket"
                data-testid="input-product-title"
              />
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
              <StableFocusTextarea 
                field={field}
                placeholder="Describe your product..."
                className="min-h-24"
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
                <StableFocusInput 
                  field={field}
                  type="number" 
                  placeholder="1500" 
                  data-testid="input-product-price" 
                />
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
                <StableFocusInput 
                  field={field}
                  type="number" 
                  placeholder="10" 
                  data-testid="input-product-stock" 
                />
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
                          src={normalizeImagePath(img)} 
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
                  <Button variant="outline" data-testid="button-add-product">
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
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formEl = e.currentTarget as HTMLFormElement & any;
                      const formData: ProductFormValues = {
                        title: formEl.title.value,
                        description: formEl.description.value,
                        price: formEl.price.value,
                        stock: formEl.stock.value,
                        district: formEl.district.value,
                        giBrand: formEl.giBrand.value,
                        images: "",
                      };
                      createProductMutation.mutate(formData);
                    }}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <label htmlFor="title" className="text-sm font-medium">Product Title</label>
                      <Input id="title" name="title" placeholder="Handwoven Basket" data-testid="input-product-title" />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="description" className="text-sm font-medium">Description</label>
                      <Textarea id="description" name="description" placeholder="Describe your product..." className="min-h-24" data-testid="input-product-description" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="price" className="text-sm font-medium">Price (PKR)</label>
                        <Input id="price" name="price" type="number" placeholder="1500" data-testid="input-product-price" />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="stock" className="text-sm font-medium">Stock</label>
                        <Input id="stock" name="stock" type="number" placeholder="10" data-testid="input-product-stock" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">District</label>
                      <Select defaultValue={store?.district || ""} onValueChange={(val) => {
                        const el = document.getElementById('district') as HTMLInputElement | null;
                        if (el) el.value = val;
                      }}>
                        <SelectTrigger data-testid="select-product-district">
                          <SelectValue placeholder="Select district" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.district} value={cat.district}>
                              {cat.district}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input id="district" name="district" type="hidden" defaultValue={store?.district || ""} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">GI Brand</label>
                      <Select defaultValue={store?.giBrands?.[0] || ""} onValueChange={(val) => {
                        const el = document.getElementById('giBrand') as HTMLInputElement | null;
                        if (el) el.value = val;
                      }}>
                        <SelectTrigger data-testid="select-product-gi-brand">
                          <SelectValue placeholder="Select GI brand" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.giBrand} value={cat.giBrand}>
                              {cat.giBrand}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input id="giBrand" name="giBrand" type="hidden" defaultValue={store?.giBrands?.[0] || ""} />
                      <p className="text-sm text-muted-foreground">Geographical Indication certified brand</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Product Images</label>
                      <div className="space-y-4">
                        <Input 
                          type="file" 
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          multiple
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
                                  src={normalizeImagePath(img)} 
                                  alt={`Product ${index + 1}`}
                                  className="w-full h-full object-cover rounded"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">Upload up to 5 images (JPEG, PNG, WebP). Max 5MB per image.</p>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAddProductDialogOpen(false)}
                        data-testid="button-cancel-add"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={createProductMutation.isPending} data-testid="button-submit-add">
                        {createProductMutation.isPending ? "Adding..." : "Add Product"}
                      </Button>
                    </DialogFooter>
                  </form>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Image</TableHead>
                      <TableHead>Product</TableHead>
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
                          </div>
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
                            onCheckedChange={() => toggleActiveMutation.mutate(product.id)}
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
                <Table>
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
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Applies To</TableHead>
                      <TableHead>Status</TableHead>
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
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
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

        
      </div>
    </VendorDashboard>
  );
}
